import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const patientId = searchParams.get('patientId') || ''
    const areaId = searchParams.get('areaId') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''
    const status = searchParams.get('status') || ''

    const where: Record<string, unknown> = {}

    if (patientId) where.patientId = patientId
    if (areaId) where.areaId = areaId
    if (status) where.status = status

    if (dateFrom || dateTo) {
      where.date = {}
      if (dateFrom) (where.date as Record<string, unknown>).gte = new Date(dateFrom)
      if (dateTo) (where.date as Record<string, unknown>).lte = new Date(dateTo + 'T23:59:59')
    }

    const sessions = await db.laserSession.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        profile: { select: { id: true, skinType: true, hairColor: true } },
        patient: { select: { id: true, name: true, phone: true, gender: true } },
        machine: { select: { id: true, name: true, type: true } },
        area: { select: { id: true, name: true } },
        package: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(sessions)
  } catch (error) {
    console.error('GET /api/laser-v2/sessions error:', error)
    return NextResponse.json({ error: 'خطأ في جلب البيانات' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      profileId, patientId, machineId, areaId, packageId,
      fluence, pulseWidth, spotSize, cooling,
      pulsesUsed, pulsesPerSecond,
      paymentMode, pulsePrice, totalAmount, paid,
      painLevel, hairReduction, sideEffects, skinReaction,
      notes, status, nextSessionDate, date,
    } = body

    if (!profileId || !patientId || !machineId || !areaId) {
      return NextResponse.json({ error: 'البروفايل والمريض والجهاز والمنطقة مطلوبون' }, { status: 400 })
    }

    if (!fluence) {
      return NextResponse.json({ error: 'الطاقة (fluence) مطلوبة' }, { status: 400 })
    }

    // Calculate total amount for pulse payment mode
    let calcTotal = totalAmount || 0
    let calcPaid = paid || 0
    let calcRemaining = calcTotal - calcPaid

    if (paymentMode === 'pulse') {
      calcTotal = (pulsesUsed || 0) * (pulsePrice || 0)
      calcRemaining = calcTotal - calcPaid
    }

    // Get session number
    const existingSessions = await db.laserSession.count({
      where: { profileId, areaId },
    })
    const sessionNumber = existingSessions + 1

    // Create session
    const session = await db.laserSession.create({
      data: {
        profileId,
        patientId,
        machineId,
        areaId,
        packageId: packageId || null,
        sessionNumber,
        date: date ? new Date(date) : new Date(),
        fluence: parseFloat(fluence),
        pulseWidth: pulseWidth ? parseFloat(pulseWidth) : 0,
        spotSize: spotSize ? parseFloat(spotSize) : 0,
        cooling: cooling?.trim() || null,
        pulsesUsed: pulsesUsed ? parseInt(pulsesUsed) : 0,
        pulsesPerSecond: pulsesPerSecond ? parseInt(pulsesPerSecond) : null,
        paymentMode: paymentMode || 'pulse',
        pulsePrice: pulsePrice ? parseFloat(pulsePrice) : 0,
        totalAmount: calcTotal,
        paid: calcPaid,
        remaining: calcRemaining,
        painLevel: painLevel ? parseInt(painLevel) : null,
        hairReduction: hairReduction !== undefined ? parseFloat(hairReduction) : null,
        sideEffects: sideEffects?.trim() || null,
        skinReaction: skinReaction?.trim() || null,
        notes: notes?.trim() || null,
        status: status || 'completed',
        nextSessionDate: nextSessionDate ? new Date(nextSessionDate) : null,
      },
      include: {
        profile: { select: { id: true, skinType: true } },
        patient: { select: { id: true, name: true } },
        machine: { select: { id: true, name: true } },
        area: { select: { id: true, name: true } },
        package: { select: { id: true, name: true } },
      },
    })

    // If package mode, update package usage
    if (paymentMode === 'package' && packageId) {
      const pkg = await db.laserPackage.findUnique({ where: { id: packageId } })
      if (pkg) {
        const newUsedSessions = pkg.usedSessions + 1
        const newUsedPulses = pkg.usedPulses + (pulsesUsed || 0)
        const newRemainingSessions = pkg.totalSessions - newUsedSessions
        const newRemainingPulses = pkg.totalPulses - newUsedPulses
        const newStatus = newRemainingSessions <= 0 ? 'completed' : pkg.status

        await db.laserPackage.update({
          where: { id: packageId },
          data: {
            usedSessions: newUsedSessions,
            usedPulses: newUsedPulses,
            remainingSessions: Math.max(0, newRemainingSessions),
            remainingPulses: Math.max(0, newRemainingPulses),
            status: newStatus,
          },
        })
      }
    }

    // Create revenue record
    if (calcPaid > 0) {
      await db.laserRevenue.create({
        data: {
          patientId,
          sessionId: session.id,
          packageId: packageId || null,
          type: paymentMode === 'package' ? 'package' : 'session',
          amount: calcPaid,
          description: `جلسة ليزر - ${session.area.name} (${session.machine.name})`,
          date: session.date,
        },
      })
    }

    return NextResponse.json(session, { status: 201 })
  } catch (error) {
    console.error('POST /api/laser-v2/sessions error:', error)
    return NextResponse.json({ error: 'خطأ في إنشاء الجلسة' }, { status: 500 })
  }
}
