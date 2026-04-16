import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const {
      machineId, areaId, packageId, fluence, pulseWidth, spotSize, cooling,
      pulsesUsed, pulsesPerSecond, paymentMode, pulsePrice, totalAmount, paid,
      painLevel, hairReduction, sideEffects, skinReaction, notes, status, nextSessionDate, date,
    } = body

    const session = await db.laserSession.update({
      where: { id },
      data: {
        ...(machineId !== undefined && { machineId }),
        ...(areaId !== undefined && { areaId }),
        ...(packageId !== undefined && { packageId: packageId || null }),
        ...(fluence !== undefined && { fluence: parseFloat(fluence) }),
        ...(pulseWidth !== undefined && { pulseWidth: parseFloat(pulseWidth) }),
        ...(spotSize !== undefined && { spotSize: parseFloat(spotSize) }),
        ...(cooling !== undefined && { cooling: cooling?.trim() || null }),
        ...(pulsesUsed !== undefined && { pulsesUsed: parseInt(pulsesUsed) }),
        ...(pulsesPerSecond !== undefined && { pulsesPerSecond: pulsesPerSecond ? parseInt(pulsesPerSecond) : null }),
        ...(paymentMode !== undefined && { paymentMode }),
        ...(pulsePrice !== undefined && { pulsePrice: parseFloat(pulsePrice) }),
        ...(totalAmount !== undefined && { totalAmount: parseFloat(totalAmount) }),
        ...(paid !== undefined && { paid: parseFloat(paid) }),
        ...(paid !== undefined && { remaining: (totalAmount || 0) - parseFloat(paid) }),
        ...(painLevel !== undefined && { painLevel: painLevel ? parseInt(painLevel) : null }),
        ...(hairReduction !== undefined && { hairReduction: hairReduction !== null ? parseFloat(hairReduction) : null }),
        ...(sideEffects !== undefined && { sideEffects: sideEffects?.trim() || null }),
        ...(skinReaction !== undefined && { skinReaction: skinReaction?.trim() || null }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
        ...(status !== undefined && { status }),
        ...(nextSessionDate !== undefined && { nextSessionDate: nextSessionDate ? new Date(nextSessionDate) : null }),
        ...(date !== undefined && { date: date ? new Date(date) : undefined }),
      },
      include: {
        profile: { select: { id: true, skinType: true } },
        patient: { select: { id: true, name: true } },
        machine: { select: { id: true, name: true } },
        area: { select: { id: true, name: true } },
        package: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(session)
  } catch (error) {
    console.error('PUT /api/laser-v2/sessions/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في تعديل الجلسة' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Delete associated revenues
    await db.laserRevenue.deleteMany({ where: { sessionId: id } })

    await db.laserSession.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/laser-v2/sessions/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في حذف الجلسة' }, { status: 500 })
  }
}
