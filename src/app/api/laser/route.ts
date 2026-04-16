import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const patientId = searchParams.get('patientId') || ''
    const visitId = searchParams.get('visitId') || ''

    const where: Record<string, unknown> = {}
    if (patientId) {
      where.visit = { patientId }
    }
    if (visitId) where.visitId = visitId

    const treatments = await db.laserTreatment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        visit: {
          include: {
            patient: { select: { id: true, name: true } },
          },
        },
      },
    })

    return NextResponse.json(treatments)
  } catch (error) {
    console.error('GET /api/laser error:', error)
    return NextResponse.json({ error: 'خطأ في جلب البيانات' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      visitId, area, skinType, hairColor, skinSensitivity,
      fluence, pulseWidth, spotSize, coolingType, painLevel,
      progress, sessionsDone, sessionsTotal, nextSessionDate, notes,
    } = body

    if (!visitId || !area) {
      return NextResponse.json({ error: 'يرجى ملء البيانات المطلوبة' }, { status: 400 })
    }

    const treatment = await db.laserTreatment.create({
      data: {
        visitId,
        area,
        skinType: skinType || null,
        hairColor: hairColor || null,
        skinSensitivity: skinSensitivity || null,
        fluence: fluence || null,
        pulseWidth: pulseWidth || null,
        spotSize: spotSize || null,
        coolingType: coolingType || null,
        painLevel: painLevel ? parseInt(painLevel) : null,
        progress: progress || null,
        sessionsDone: sessionsDone ? parseInt(sessionsDone) : 0,
        sessionsTotal: sessionsTotal ? parseInt(sessionsTotal) : 0,
        nextSessionDate: nextSessionDate ? new Date(nextSessionDate) : null,
        notes: notes?.trim() || null,
      },
      include: {
        visit: {
          include: {
            patient: { select: { id: true, name: true } },
          },
        },
      },
    })

    return NextResponse.json(treatment, { status: 201 })
  } catch (error) {
    console.error('POST /api/laser error:', error)
    return NextResponse.json({ error: 'خطأ في إضافة جلسة الليزر' }, { status: 500 })
  }
}
