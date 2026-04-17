import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    // Unread alerts
    const totalUnread = await db.alert.count({ where: { isRead: false } })

    // High priority unread
    const highPriority = await db.alert.count({
      where: { isRead: false, priority: { in: ['urgent', 'high'] } },
    })

    // Upcoming visits (today + next 3 days)
    const upcomingVisits = await db.visit.count({
      where: {
        date: { gte: startOfDay, lte: in3Days },
        status: 'scheduled',
      },
    })

    // Overdue payments (visits with remaining > 0)
    const overduePayments = await db.visit.count({
      where: { remaining: { gt: 0 } },
    })

    // Laser packages near expiry or completion
    let expiringPackages = 0
    try {
      expiringPackages = await db.laserPackage.count({
        where: {
          status: 'active',
          OR: [
            { remainingSessions: { lte: 2 } },
            { expiryDate: { lte: in7Days, gte: startOfDay } },
          ],
        },
      })
    } catch { /* laser tables might not exist yet */ }

    // Follow-up needed (visits with scheduled status - simple count)
    const followUpNeeded = await db.visit.count({
      where: {
        status: 'completed',
        date: { gte: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000) },
      },
    })

    // Today sessions
    const todaySessions = await db.visit.count({
      where: {
        date: { gte: startOfDay, lte: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000) },
      },
    })

    return NextResponse.json({
      upcomingVisits,
      overduePayments,
      expiringPackages,
      followUpNeeded,
      todaySessions,
      totalUnread,
      highPriority,
    })
  } catch (error) {
    console.error('GET /api/alerts/summary error:', error)
    return NextResponse.json({ error: 'خطأ' }, { status: 500 })
  }
}
