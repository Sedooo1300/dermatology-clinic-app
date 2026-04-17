import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, totalSessions, totalPulses, paid, status, expiryDate, notes } = body

    const pkg = await db.laserPackage.findUnique({ where: { id } })
    if (!pkg) {
      return NextResponse.json({ error: 'الباقة غير موجودة' }, { status: 404 })
    }

    const calcPaid = paid !== undefined ? parseFloat(paid) : pkg.paid
    const calcTotalSessions = totalSessions !== undefined ? parseInt(totalSessions) : pkg.totalSessions
    const calcTotalPulses = totalPulses !== undefined ? parseInt(totalPulses) : pkg.totalPulses
    const calcRemaining = (totalPrice !== undefined ? parseFloat(totalPrice) : pkg.totalPrice) - calcPaid

    const updated = await db.laserPackage.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(totalSessions !== undefined && { totalSessions: calcTotalSessions, remainingSessions: Math.max(0, calcTotalSessions - pkg.usedSessions) }),
        ...(totalPulses !== undefined && { totalPulses: calcTotalPulses, remainingPulses: Math.max(0, calcTotalPulses - pkg.usedPulses) }),
        ...(paid !== undefined && { paid: calcPaid, remaining: calcRemaining }),
        ...(status !== undefined && { status }),
        ...(expiryDate !== undefined && { expiryDate: expiryDate ? new Date(expiryDate) : null }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
      },
      include: {
        patient: { select: { id: true, name: true } },
        area: { select: { id: true, name: true } },
        sessions: { select: { id: true, date: true, status: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PUT /api/laser-v2/packages/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في تعديل الباقة' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.laserPackage.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/laser-v2/packages/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في حذف الباقة' }, { status: 500 })
  }
}
