import { query, queryOne } from '@/lib/db'
import { NextResponse } from 'next/server'
import { startOfMonth, endOfMonth, subMonths, format, startOfDay, endOfDay } from 'date-fns'

export async function GET() {
  try {
    const now = new Date()
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)
    const todayStart = startOfDay(now)
    const todayEnd = endOfDay(now)

    // Total patients
    const totalPatientsRes = await query<{ count: number }>(
      `SELECT COUNT(*)::int as count FROM "Patient"`
    )
    const totalPatients = totalPatientsRes.rows[0]?.count ?? 0

    // Today's visits
    const todayVisitsRes = await query<{ count: number }>(
      `SELECT COUNT(*)::int as count FROM "Visit" WHERE "date" >= $1 AND "date" <= $2`,
      [todayStart, todayEnd]
    )
    const todayVisits = todayVisitsRes.rows[0]?.count ?? 0

    // Month revenue (from completed visits paid)
    const monthRevenueRes = await query<{ total: number }>(
      `SELECT COALESCE(SUM("paid"), 0)::float as total FROM "Visit" WHERE "date" >= $1 AND "date" <= $2 AND "status" = 'completed'`,
      [monthStart, monthEnd]
    )
    const monthRevenue = monthRevenueRes.rows[0]?.total ?? 0

    // Month expenses
    const monthExpenseRes = await query<{ total: number }>(
      `SELECT COALESCE(SUM("amount"), 0)::float as total FROM "Expense" WHERE "date" >= $1 AND "date" <= $2`,
      [monthStart, monthEnd]
    )
    const monthExpenseTotal = monthExpenseRes.rows[0]?.total ?? 0

    // Recent visits (last 10 with patient name and session type name)
    const recentVisitsRes = await query<{
      id: string
      patientId: string
      sessionTypeId: string | null
      date: string
      price: number
      paid: number
      remaining: number
      notes: string | null
      status: string
      createdAt: string
      updatedAt: string
      patient: { id: string; name: string } | null
      sessionType: { name: string } | null
    }>(
      `SELECT v.*, 
        row_to_json(p.*) as "patient",
        row_to_json(st.*) as "sessionType"
      FROM "Visit" v
      LEFT JOIN "Patient" p ON v."patientId" = p.id
      LEFT JOIN "SessionType" st ON v."sessionTypeId" = st.id
      ORDER BY v."date" DESC
      LIMIT 10`
    )
    const recentVisits = recentVisitsRes.rows

    // Unread alerts (last 10 with patient name)
    const alertsRes = await query<{
      id: string
      patientId: string | null
      title: string
      message: string
      type: string
      priority: string
      date: string
      isRead: boolean
      snoozedUntil: string | null
      actionUrl: string | null
      createdAt: string
      updatedAt: string
      patient: { name: string } | null
    }>(
      `SELECT a.*, row_to_json(p.*) as "patient"
      FROM "Alert" a
      LEFT JOIN "Patient" p ON a."patientId" = p.id
      WHERE a."isRead" = false
      ORDER BY a."createdAt" DESC
      LIMIT 10`
    )
    const alerts = alertsRes.rows

    // Revenue chart data (last 6 months)
    const revenueChartData: { month: string; revenue: number; expenses: number; profit: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const mStart = startOfMonth(subMonths(now, i))
      const mEnd = endOfMonth(subMonths(now, i))
      const monthName = format(mStart, 'MMM yyyy', { locale: undefined })

      const [mRevenueRes, mExpenseRes] = await Promise.all([
        query<{ total: number }>(
          `SELECT COALESCE(SUM("paid"), 0)::float as total FROM "Visit" WHERE "date" >= $1 AND "date" <= $2 AND "status" = 'completed'`,
          [mStart, mEnd]
        ),
        query<{ total: number }>(
          `SELECT COALESCE(SUM("amount"), 0)::float as total FROM "Expense" WHERE "date" >= $1 AND "date" <= $2`,
          [mStart, mEnd]
        ),
      ])

      const mRevenues = mRevenueRes.rows[0]?.total ?? 0
      const mExpenseTotal = mExpenseRes.rows[0]?.total ?? 0

      revenueChartData.push({
        month: monthName,
        revenue: mRevenues,
        expenses: mExpenseTotal,
        profit: mRevenues - mExpenseTotal,
      })
    }

    // Upcoming sessions (scheduled visits from today onward)
    const upcomingSessionsRes = await query<{
      id: string
      patientId: string
      sessionTypeId: string | null
      date: string
      status: string
      notes: string | null
      patient: { name: string; phone: string | null } | null
      sessionType: { name: string } | null
    }>(
      `SELECT v.id, v."patientId", v."sessionTypeId", v."date", v.status, v.notes,
        row_to_json(p.*) as "patient",
        row_to_json(st.*) as "sessionType"
      FROM "Visit" v
      LEFT JOIN "Patient" p ON v."patientId" = p.id
      LEFT JOIN "SessionType" st ON v."sessionTypeId" = st.id
      WHERE v.status = 'scheduled' AND v."date" >= $1
      ORDER BY v."date" ASC
      LIMIT 5`,
      [todayStart]
    )
    const upcomingSessions = upcomingSessionsRes.rows

    // Session type stats (all session types with visit count)
    const sessionTypeStatsRes = await query<{
      id: string
      name: string
      price: number
      description: string | null
      isActive: boolean
      visitCount: string
    }>(
      `SELECT st.*, COUNT(v.id)::text as "visitCount"
      FROM "SessionType" st
      LEFT JOIN "Visit" v ON v."sessionTypeId" = st.id
      GROUP BY st.id
      ORDER BY st.name ASC`
    )
    const sessionTypeStats = sessionTypeStatsRes.rows.map(row => ({
      ...row,
      _count: { visits: parseInt(row.visitCount, 10) || 0 },
    }))

    // Pending payments (sum of remaining where remaining > 0)
    const pendingPaymentsRes = await query<{ total: number; count: number }>(
      `SELECT COALESCE(SUM("remaining"), 0)::float as total, COUNT(*)::int as count FROM "Visit" WHERE "remaining" > 0`
    )
    const pendingPaymentsTotal = pendingPaymentsRes.rows[0]?.total ?? 0
    const pendingCount = pendingPaymentsRes.rows[0]?.count ?? 0

    return NextResponse.json({
      totalPatients,
      todayVisits,
      monthRevenue,
      monthExpenseTotal,
      monthProfit: monthRevenue - monthExpenseTotal,
      recentVisits,
      alerts,
      revenueChartData,
      upcomingSessions,
      sessionTypeStats,
      pendingPayments: pendingPaymentsTotal,
      pendingCount,
    })
  } catch (error) {
    console.error('GET /api/dashboard error:', error)
    return NextResponse.json({ error: 'خطأ في جلب بيانات لوحة التحكم' }, { status: 500 })
  }
}
