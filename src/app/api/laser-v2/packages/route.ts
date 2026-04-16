import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const patientId = searchParams.get('patientId') || ''
    const status = searchParams.get('status') || ''

    const where: Record<string, unknown> = {}
    if (patientId) where.patientId = patientId
    if (status) where.status = status

    const packages = await db.laserPackage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        profile: { select: { id: true, skinType: true } },
        patient: { select: { id: true, name: true, phone: true, gender: true } },
        area: { select: { id: true, name: true } },
        sessions: { select: { id: true, date: true, status: true } },
      },
    })

    return NextResponse.json(packages)
  } catch (error) {
    console.error('GET /api/laser-v2/packages error:', error)
    return NextResponse.json({ error: 'خطأ في جلب البيانات' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { profileId, patientId, areaId, name, totalSessions, totalPulses, totalPrice, paid, expiryDate, notes } = body

    if (!profileId || !patientId || !areaId || !name) {
      return NextResponse.json({ error: 'البروفايل والمريض والمنطقة والاسم مطلوبون' }, { status: 400 })
    }

    const calcTotalSessions = totalSessions ? parseInt(totalSessions) : 0
    const calcTotalPulses = totalPulses ? parseInt(totalPulses) : 0
    const calcTotalPrice = totalPrice ? parseFloat(totalPrice) : 0
    const calcPaid = paid ? parseFloat(paid) : 0

    const pkg = await db.laserPackage.create({
      data: {
        profileId,
        patientId,
        areaId,
        name: name.trim(),
        totalSessions: calcTotalSessions,
        totalPulses: calcTotalPulses,
        usedSessions: 0,
        usedPulses: 0,
        remainingSessions: calcTotalSessions,
        remainingPulses: calcTotalPulses,
        totalPrice: calcTotalPrice,
        paid: calcPaid,
        remaining: calcTotalPrice - calcPaid,
        status: 'active',
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        notes: notes?.trim() || null,
      },
      include: {
        profile: { select: { id: true, skinType: true } },
        patient: { select: { id: true, name: true } },
        area: { select: { id: true, name: true } },
      },
    })

    // Create revenue record
    if (calcPaid > 0) {
      await db.laserRevenue.create({
        data: {
          patientId,
          packageId: pkg.id,
          type: 'package',
          amount: calcPaid,
          description: `باقة ليزر: ${name}`,
          date: pkg.purchaseDate,
        },
      })
    }

    return NextResponse.json(pkg, { status: 201 })
  } catch (error) {
    console.error('POST /api/laser-v2/packages error:', error)
    return NextResponse.json({ error: 'خطأ في إنشاء الباقة' }, { status: 500 })
  }
}
