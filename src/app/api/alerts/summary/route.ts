import { query } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const fortyFiveDaysAgo = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000)
    const endOfToday = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

    // Unread alerts
    const totalUnreadRes = await query<{ count: number }>(
      `SELECT COUNT(*)::int as count FROM "Alert" WHERE "isRead" = false`
    )
    const totalUnread = totalUnreadRes.rows[0]?.count ?? 0

    // High priority unread
    const highPriorityRes = await query<{ count: number }>(
      `SELECT COUNT(*)::int as count FROM "Alert" WHERE "isRead" = false AND priority IN ('urgent', 'high')`
    )
    const highPriority = highPriorityRes.rows[0]?.count ?? 0

    // Upcoming visits (today + next 3 days, scheduled)
    const upcomingVisitsRes = await query<{ count: number }>(
      `SELECT COUNT(*)::int as count FROM "Visit" WHERE "date" >= $1 AND "date" <= $2 AND status = 'scheduled'`,
      [startOfDay, in3Days]
    )
    const upcomingVisits = upcomingVisitsRes.rows[0]?.count ?? 0

    // Overdue payments (visits with remaining > 0)
    const overduePaymentsRes = await query<{ count: number }>(
      `SELECT COUNT(*)::int as count FROM "Visit" WHERE "remaining" > 0`
    )
    const overduePayments = overduePaymentsRes.rows[0]?.count ?? 0

    // Laser packages near expiry or completion
    let expiringPackages = 0
    try {
      const expiringPackagesRes = await query<{ count: number }>(
        `SELECT COUNT(*)::int as count FROM "LaserPackage" 
        WHERE status = 'active' 
        AND ("remainingSessions" <= 2 OR ("expiryDate" >= $1 AND "expiryDate" <= $2))`,
        [startOfDay, in7Days]
      )
      expiringPackages = expiringPackagesRes.rows[0]?.count ?? 0
    } catch {
      // laser tables might not exist yet
    }

    // Follow-up needed (recent completed visits)
    const followUpNeededRes = await query<{ count: number }>(
      `SELECT COUNT(*)::int as count FROM "Visit" WHERE status = 'completed' AND "date" >= $1`,
      [fortyFiveDaysAgo]
    )
    const followUpNeeded = followUpNeededRes.rows[0]?.count ?? 0

    // Today sessions
    const todaySessionsRes = await query<{ count: number }>(
      `SELECT COUNT(*)::int as count FROM "Visit" WHERE "date" >= $1 AND "date" <= $2`,
      [startOfDay, endOfToday]
    )
    const todaySessions = todaySessionsRes.rows[0]?.count ?? 0

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
