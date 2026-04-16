import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const visit = await db.visit.findUnique({
      where: { id },
      include: {
        patient: true,
        sessionType: true,
        laserTreatments: true,
      },
    })

    if (!visit) {
      return NextResponse.json({ error: 'الزيارة غير موجودة' }, { status: 404 })
    }

    return NextResponse.json(visit)
  } catch (error) {
    console.error('GET /api/visits/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في جلب البيانات' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { patientId, sessionTypeId, date, price, paid, remaining, notes, status } = body

    const visit = await db.visit.update({
      where: { id },
      data: {
        patientId: patientId || undefined,
        sessionTypeId: sessionTypeId || null,
        date: date ? new Date(date) : undefined,
        price: price !== undefined ? parseFloat(price) : undefined,
        paid: paid !== undefined ? parseFloat(paid) : undefined,
        remaining: remaining !== undefined ? parseFloat(remaining) : undefined,
        notes: notes?.trim() || null,
        status: status || undefined,
      },
      include: {
        patient: { select: { id: true, name: true } },
        sessionType: true,
      },
    })

    return NextResponse.json(visit)
  } catch (error) {
    console.error('PUT /api/visits/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في تعديل الزيارة' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.visit.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/visits/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في حذف الزيارة' }, { status: 500 })
  }
}
