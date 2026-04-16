import { db } from '@/lib/db'
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
    const totalPatients = await db.patient.count()

    // Today's visits
    const todayVisits = await db.visit.count({
      where: { date: { gte: todayStart, lte: todayEnd } },
    })

    // Month revenue (from visits paid)
    const monthVisits = await db.visit.findMany({
      where: { date: { gte: monthStart, lte: monthEnd }, status: 'completed' },
    })
    const monthRevenue = monthVisits.reduce((s, v) => s + v.paid, 0)

    // Month expenses
    const monthExpenses = await db.expense.findMany({
      where: { date: { gte: monthStart, lte: monthEnd } },
    })
    const monthExpenseTotal = monthExpenses.reduce((s, e) => s + e.amount, 0)

    // Recent visits
    const recentVisits = await db.visit.findMany({
      take: 10,
      orderBy: { date: 'desc' },
      include: {
        patient: { select: { id: true, name: true } },
        sessionType: { select: { name: true } },
      },
    })

    // Unread alerts
    const alerts = await db.alert.findMany({
      where: { isRead: false },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        patient: { select: { name: true } },
      },
    })

    // Revenue chart data (last 6 months)
    const revenueChartData: { month: string; revenue: number; expenses: number; profit: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const mStart = startOfMonth(subMonths(now, i))
      const mEnd = endOfMonth(subMonths(now, i))
      const monthName = format(mStart, 'MMM yyyy', { locale: undefined })

      const mVisits = await db.visit.findMany({
        where: { date: { gte: mStart, lte: mEnd }, status: 'completed' },
      })
      const mRevenues = mVisits.reduce((s, v) => s + v.paid, 0)

      const mExpenses = await db.expense.findMany({
        where: { date: { gte: mStart, lte: mEnd } },
      })
      const mExpenseTotal = mExpenses.reduce((s, e) => s + e.amount, 0)

      revenueChartData.push({
        month: monthName,
        revenue: mRevenues,
        expenses: mExpenseTotal,
        profit: mRevenues - mExpenseTotal,
      })
    }

    // Upcoming sessions (scheduled)
    const upcomingSessions = await db.visit.findMany({
      where: { status: 'scheduled', date: { gte: todayStart } },
      take: 5,
      orderBy: { date: 'asc' },
      include: {
        patient: { select: { name: true, phone: true } },
        sessionType: { select: { name: true } },
      },
    })

    // Session type stats
    const sessionTypeStats = await db.sessionType.findMany({
      include: { _count: { select: { visits: true } } },
      orderBy: { name: 'asc' },
    })

    // Pending payments
    const pendingPayments = await db.visit.aggregate({
      where: { remaining: { gt: 0 } },
      _sum: { remaining: true },
      _count: true,
    })

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
      pendingPayments: pendingPayments._sum.remaining || 0,
      pendingCount: pendingPayments._count,
    })
  } catch (error) {
    console.error('GET /api/dashboard error:', error)
    return NextResponse.json({ error: 'خطأ في جلب بيانات لوحة التحكم' }, { status: 500 })
  }
}
