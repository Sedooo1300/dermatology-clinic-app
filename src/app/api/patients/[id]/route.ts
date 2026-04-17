import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const patient = await db.patient.findUnique({
      where: { id },
      include: {
        visits: {
          orderBy: { date: 'desc' },
          include: {
            sessionType: true,
            laserTreatments: true,
          },
        },
        photos: {
          orderBy: { createdAt: 'desc' },
        },
        alerts: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!patient) {
      return NextResponse.json({ error: 'الحالة غير موجودة' }, { status: 404 })
    }

    // Calculate totals
    const totalPaid = patient.visits.reduce((sum, v) => sum + v.paid, 0)
    const totalRemaining = patient.visits.reduce((sum, v) => sum + v.remaining, 0)
    const totalVisits = patient.visits.length

    return NextResponse.json({ ...patient, totalPaid, totalRemaining, totalVisits })
  } catch (error) {
    console.error('GET /api/patients/[id] error:', error)
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
    const { name, phone, age, gender, notes } = body

    const patient = await db.patient.update({
      where: { id },
      data: {
        name: name?.trim() || undefined,
        phone: phone?.trim() || null,
        age: age ? parseInt(age) : null,
        gender: gender || undefined,
        notes: notes?.trim() || null,
      },
    })

    return NextResponse.json(patient)
  } catch (error) {
    console.error('PUT /api/patients/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في تعديل الحالة' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.patient.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/patients/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في حذف الحالة' }, { status: 500 })
  }
}
