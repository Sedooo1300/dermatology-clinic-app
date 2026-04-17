import { query } from '@/lib/db'
import { NextResponse } from 'next/server'
import { startOfMonth, endOfMonth, subMonths, format, startOfDay, endOfDay, subDays } from 'date-fns'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month'
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    const now = new Date()

    // Determine date range
    let startDate: Date
    let endDate: Date = endOfDay(now)

    if (startDateParam && endDateParam) {
      startDate = startOfDay(new Date(startDateParam))
      endDate = endOfDay(new Date(endDateParam))
    } else {
      switch (period) {
        case 'quarter':
          startDate = startOfMonth(subMonths(now, 2))
          break
        case '6months':
          startDate = startOfMonth(subMonths(now, 5))
          break
        case 'year':
          startDate = startOfMonth(subMonths(now, 11))
          break
        case 'month':
        default:
          startDate = startOfMonth(now)
          break
      }
    }

    // 1. Summary KPIs
    const [
      totalRevenueRes,
      totalExpensesRes,
      totalVisitsRes,
      uniquePatientsRes,
      pendingPaymentsRes,
    ] = await Promise.all([
      query<{ total: number }>(
        `SELECT COALESCE(SUM("paid"), 0)::float as total FROM "Visit" WHERE "date" >= $1 AND "date" <= $2 AND "status" = 'completed'`,
        [startDate, endDate]
      ),
      query<{ total: number }>(
        `SELECT COALESCE(SUM("amount"), 0)::float as total FROM "Expense" WHERE "date" >= $1 AND "date" <= $2`,
        [startDate, endDate]
      ),
      query<{ count: number }>(
        `SELECT COUNT(*)::int as count FROM "Visit" WHERE "date" >= $1 AND "date" <= $2`,
        [startDate, endDate]
      ),
      query<{ count: number }>(
        `SELECT COUNT(DISTINCT "patientId")::int as count FROM "Visit" WHERE "date" >= $1 AND "date" <= $2`,
        [startDate, endDate]
      ),
      query<{ total: number; count: number }>(
        `SELECT COALESCE(SUM("remaining"), 0)::float as total, COUNT(*)::int as count FROM "Visit" WHERE "remaining" > 0`,
      ),
    ])

    const totalRevenue = totalRevenueRes.rows[0]?.total ?? 0
    const totalExpenses = totalExpensesRes.rows[0]?.total ?? 0
    const netProfit = totalRevenue - totalExpenses
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
    const totalVisits = totalVisitsRes.rows[0]?.count ?? 0
    const uniquePatients = uniquePatientsRes.rows[0]?.count ?? 0
    const avgRevenuePerVisit = totalVisits > 0 ? totalRevenue / totalVisits : 0
    const avgRevenuePerPatient = uniquePatients > 0 ? totalRevenue / uniquePatients : 0
    const pendingPayments = pendingPaymentsRes.rows[0]?.total ?? 0
    const pendingCount = pendingPaymentsRes.rows[0]?.count ?? 0

    // 2. Revenue by session type
    const revenueByTypeRes = await query<{
      sessionTypeId: string
      sessionTypeName: string
      totalRevenue: number
      totalVisits: number
    }>(
      `SELECT st.id as "sessionTypeId", st.name as "sessionTypeName",
        COALESCE(SUM(v."paid"), 0)::float as "totalRevenue",
        COUNT(v.id)::int as "totalVisits"
      FROM "SessionType" st
      LEFT JOIN "Visit" v ON v."sessionTypeId" = st.id AND v."date" >= $1 AND v."date" <= $2 AND v."status" = 'completed'
      GROUP BY st.id, st.name
      HAVING COALESCE(SUM(v."paid"), 0) > 0
      ORDER BY "totalRevenue" DESC`,
      [startDate, endDate]
    )

    const revenueByType = revenueByTypeRes.rows.map(row => ({
      ...row,
      avgPerVisit: row.totalVisits > 0 ? row.totalRevenue / row.totalVisits : 0,
      percentage: totalRevenue > 0 ? (row.totalRevenue / totalRevenue) * 100 : 0,
    }))

    // 3. Monthly trend (last 6 months)
    const monthlyTrend: Array<{
      month: string
      monthIndex: number
      revenue: number
      expenses: number
      profit: number
      visits: number
      patients: number
    }> = []

    for (let i = 5; i >= 0; i--) {
      const mStart = startOfMonth(subMonths(now, i))
      const mEnd = endOfMonth(subMonths(now, i))
      const monthName = format(mStart, 'MMM yyyy')

      const [mRevenueRes, mExpenseRes, mVisitsRes, mPatientsRes] = await Promise.all([
        query<{ total: number }>(
          `SELECT COALESCE(SUM("paid"), 0)::float as total FROM "Visit" WHERE "date" >= $1 AND "date" <= $2 AND "status" = 'completed'`,
          [mStart, mEnd]
        ),
        query<{ total: number }>(
          `SELECT COALESCE(SUM("amount"), 0)::float as total FROM "Expense" WHERE "date" >= $1 AND "date" <= $2`,
          [mStart, mEnd]
        ),
        query<{ count: number }>(
          `SELECT COUNT(*)::int as count FROM "Visit" WHERE "date" >= $1 AND "date" <= $2`,
          [mStart, mEnd]
        ),
        query<{ count: number }>(
          `SELECT COUNT(DISTINCT "patientId")::int as count FROM "Visit" WHERE "date" >= $1 AND "date" <= $2`,
          [mStart, mEnd]
        ),
      ])

      const mRev = mRevenueRes.rows[0]?.total ?? 0
      const mExp = mExpenseRes.rows[0]?.total ?? 0
      const mVis = mVisitsRes.rows[0]?.count ?? 0
      const mPat = mPatientsRes.rows[0]?.count ?? 0

      monthlyTrend.push({
        month: monthName,
        monthIndex: 5 - i,
        revenue: mRev,
        expenses: mExp,
        profit: mRev - mExp,
        visits: mVis,
        patients: mPat,
      })
    }

    // 4. Top patients by spending (top 10)
    const topPatientsRes = await query<{
      patientId: string
      patientName: string
      totalSpent: number
      visitCount: number
      lastVisit: string
    }>(
      `SELECT p.id as "patientId", p.name as "patientName",
        COALESCE(SUM(v."paid"), 0)::float as "totalSpent",
        COUNT(v.id)::int as "visitCount",
        MAX(v."date")::text as "lastVisit"
      FROM "Patient" p
      INNER JOIN "Visit" v ON v."patientId" = p.id AND v."date" >= $1 AND v."date" <= $2
      GROUP BY p.id, p.name
      ORDER BY "totalSpent" DESC
      LIMIT 10`,
      [startDate, endDate]
    )

    const topPatients = topPatientsRes.rows.map(row => ({
      ...row,
      avgPerVisit: row.visitCount > 0 ? row.totalSpent / row.visitCount : 0,
    }))

    // 5. Expense breakdown by category
    const expenseByCategoryRes = await query<{
      category: string
      total: number
      count: number
    }>(
      `SELECT category, COALESCE(SUM("amount"), 0)::float as total, COUNT(*)::int as count
      FROM "Expense"
      WHERE "date" >= $1 AND "date" <= $2
      GROUP BY category
      ORDER BY total DESC`,
      [startDate, endDate]
    )

    const totalExpensesForCat = totalExpenses > 0 ? totalExpenses : 1
    const expenseByCategory = expenseByCategoryRes.rows.map(row => ({
      ...row,
      percentage: (row.total / totalExpensesForCat) * 100,
    }))

    // 6. Daily revenue (last 30 days)
    const dailyRevenueRes = await query<{
      date: string
      revenue: number
      visits: number
    }>(
      `SELECT DATE("date") as date,
        COALESCE(SUM("paid"), 0)::float as revenue,
        COUNT(*)::int as visits
      FROM "Visit"
      WHERE "date" >= $1 AND "date" <= $2 AND "status" = 'completed'
      GROUP BY DATE("date")
      ORDER BY date ASC`,
      [startOfDay(subDays(now, 29)), endOfDay(now)]
    )

    const dailyRevenue = dailyRevenueRes.rows.map(row => ({
      date: row.date,
      revenue: row.revenue,
      visits: row.visits,
    }))

    // 7. Session type popularity
    const sessionPopularityRes = await query<{
      name: string
      count: number
      revenue: number
    }>(
      `SELECT st.name, COUNT(v.id)::int as count, COALESCE(SUM(v."paid"), 0)::float as revenue
      FROM "SessionType" st
      LEFT JOIN "Visit" v ON v."sessionTypeId" = st.id AND v."date" >= $1 AND v."date" <= $2
      GROUP BY st.name
      HAVING COUNT(v.id) > 0
      ORDER BY count DESC`,
      [startDate, endDate]
    )
    const sessionPopularity = sessionPopularityRes.rows

    // 8. Revenue by day of week (average)
    const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

    const revenueByDayOfWeekRes = await query<{
      dayIndex: number
      avgRevenue: number
      avgVisits: number
      totalRevenue: number
    }>(
      `SELECT
        EXTRACT(DOW FROM "date")::int as "dayIndex",
        COALESCE(AVG(daily_rev), 0)::float as "avgRevenue",
        COALESCE(AVG(daily_visits), 0)::float as "avgVisits",
        COALESCE(SUM(daily_rev), 0)::float as "totalRevenue"
      FROM (
        SELECT
          DATE("date") as d,
          SUM("paid")::float as daily_rev,
          COUNT(*)::float as daily_visits
        FROM "Visit"
        WHERE "date" >= $1 AND "date" <= $2 AND "status" = 'completed'
        GROUP BY DATE("date")
      ) sub
      GROUP BY EXTRACT(DOW FROM d)
      ORDER BY "dayIndex" ASC`,
      [startDate, endDate]
    )

    const revenueByDayOfWeek = dayNames.map((day, index) => {
      const found = revenueByDayOfWeekRes.rows.find(r => r.dayIndex === index)
      return {
        day,
        dayIndex: index,
        avgRevenue: found?.avgRevenue ?? 0,
        avgVisits: found?.avgVisits ?? 0,
        totalRevenue: found?.totalRevenue ?? 0,
      }
    })

    return NextResponse.json({
      summary: {
        totalRevenue,
        totalExpenses,
        netProfit,
        profitMargin: Math.round(profitMargin * 100) / 100,
        totalVisits,
        uniquePatients,
        avgRevenuePerVisit: Math.round(avgRevenuePerVisit * 100) / 100,
        avgRevenuePerPatient: Math.round(avgRevenuePerPatient * 100) / 100,
        pendingPayments,
        pendingCount,
      },
      revenueByType,
      monthlyTrend,
      topPatients,
      expenseByCategory,
      dailyRevenue,
      sessionPopularity,
      revenueByDayOfWeek,
    })
  } catch (error) {
    console.error('GET /api/reports/financial error:', error)
    return NextResponse.json({ error: 'خطأ في جلب بيانات التقارير المالية' }, { status: 500 })
  }
}
