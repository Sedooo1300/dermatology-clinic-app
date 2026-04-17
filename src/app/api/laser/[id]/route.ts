import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const {
      area, skinType, hairColor, skinSensitivity,
      fluence, pulseWidth, spotSize, coolingType, painLevel,
      progress, sessionsDone, sessionsTotal, nextSessionDate, notes,
    } = body

    const treatment = await db.laserTreatment.update({
      where: { id },
      data: {
        area: area || undefined,
        skinType: skinType || null,
        hairColor: hairColor || null,
        skinSensitivity: skinSensitivity || null,
        fluence: fluence || null,
        pulseWidth: pulseWidth || null,
        spotSize: spotSize || null,
        coolingType: coolingType || null,
        painLevel: painLevel ? parseInt(painLevel) : null,
        progress: progress || null,
        sessionsDone: sessionsDone !== undefined ? parseInt(sessionsDone) : undefined,
        sessionsTotal: sessionsTotal !== undefined ? parseInt(sessionsTotal) : undefined,
        nextSessionDate: nextSessionDate ? new Date(nextSessionDate) : null,
        notes: notes?.trim() || null,
      },
    })

    return NextResponse.json(treatment)
  } catch (error) {
    console.error('PUT /api/laser/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في تعديل جلسة الليزر' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.laserTreatment.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/laser/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في حذف جلسة الليزر' }, { status: 500 })
  }
}
