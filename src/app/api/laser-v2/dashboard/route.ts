import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

    // Sessions today
    const sessionsToday = await db.laserSession.count({
      where: { date: { gte: today } },
    })

    // Sessions this month
    const sessionsMonth = await db.laserSession.count({
      where: { date: { gte: monthStart } },
    })

    // Revenue this month
    const revenueMonth = await db.laserRevenue.aggregate({
      where: { date: { gte: monthStart } },
      _sum: { amount: true },
    })

    // Revenue today
    const revenueToday = await db.laserRevenue.aggregate({
      where: { date: { gte: today } },
      _sum: { amount: true },
    })

    // Active profiles
    const activeProfiles = await db.laserProfile.count()

    // Active packages
    const activePackages = await db.laserPackage.count({
      where: { status: 'active' },
    })

    // Total machines
    const totalMachines = await db.laserMachine.count({
      where: { isActive: true },
    })

    // Most popular areas
    const popularAreasRaw = await db.laserSession.groupBy({
      by: ['areaId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    })

    // Fetch area names for popular areas
    const areaIds = popularAreasRaw.map((a: { areaId: string }) => a.areaId)
    const areasList = areaIds.length > 0 ? await db.laserArea.findMany({
      where: { id: { in: areaIds } },
    }) : []
    const areaMap: Record<string, string> = {}
    areasList.forEach((a: { id: string; name: string }) => { areaMap[a.id] = a.name })

    const popularAreasFormatted = popularAreasRaw.map((a: { areaId: string; _count: { id: number } }) => ({
      areaId: a.areaId,
      name: areaMap[a.areaId] || 'غير معروف',
      count: a._count.id,
    }))

    // Sessions today list
    const todaySessions = await db.laserSession.findMany({
      where: { date: { gte: today } },
      orderBy: { date: 'desc' },
      include: {
        patient: { select: { id: true, name: true } },
        area: { select: { id: true, name: true } },
        machine: { select: { id: true, name: true } },
      },
    })

    // Packages near completion (1-2 sessions remaining)
    const nearCompletionPackages = await db.laserPackage.findMany({
      where: {
        status: 'active',
        remainingSessions: { lte: 2, gt: 0 },
      },
      include: {
        patient: { select: { id: true, name: true } },
        area: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({
      sessionsToday,
      sessionsMonth,
      revenueMonth: revenueMonth._sum.amount || 0,
      revenueToday: revenueToday._sum.amount || 0,
      activeProfiles,
      activePackages,
      totalMachines,
      popularAreas: popularAreasFormatted,
      todaySessions,
      nearCompletionPackages,
    })
  } catch (error) {
    console.error('GET /api/laser-v2/dashboard error:', error)
    return NextResponse.json({ error: 'خطأ في جلب الإحصائيات' }, { status: 500 })
  }
}
