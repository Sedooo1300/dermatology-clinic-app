import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const profile = await db.laserProfile.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, name: true, phone: true, gender: true, age: true } },
        sessions: {
          orderBy: { date: 'desc' },
          include: {
            machine: { select: { id: true, name: true, type: true } },
            area: { select: { id: true, name: true } },
            package: { select: { id: true, name: true } },
          },
        },
        packages: {
          orderBy: { createdAt: 'desc' },
          include: {
            area: { select: { id: true, name: true } },
            sessions: { select: { id: true, date: true, status: true } },
          },
        },
      },
    })

    if (!profile) {
      return NextResponse.json({ error: 'البروفايل غير موجود' }, { status: 404 })
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error('GET /api/laser-v2/profiles/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في جلب البيانات' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { skinType, hairColor, hairThickness, skinSensitivity, hormonalConditions, contraindications, previousTreatments, notes } = body

    const profile = await db.laserProfile.update({
      where: { id },
      data: {
        ...(skinType !== undefined && { skinType: skinType.toString() }),
        ...(hairColor !== undefined && { hairColor: hairColor?.trim() || null }),
        ...(hairThickness !== undefined && { hairThickness: hairThickness?.trim() || null }),
        ...(skinSensitivity !== undefined && { skinSensitivity: skinSensitivity?.trim() || null }),
        ...(hormonalConditions !== undefined && { hormonalConditions: hormonalConditions?.trim() || null }),
        ...(contraindications !== undefined && { contraindications: contraindications?.trim() || null }),
        ...(previousTreatments !== undefined && { previousTreatments: previousTreatments?.trim() || null }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
      },
      include: {
        patient: { select: { id: true, name: true, phone: true, gender: true, age: true } },
      },
    })

    return NextResponse.json(profile)
  } catch (error) {
    console.error('PUT /api/laser-v2/profiles/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في تعديل البروفايل' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.laserProfile.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/laser-v2/profiles/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في حذف البروفايل' }, { status: 500 })
  }
}
