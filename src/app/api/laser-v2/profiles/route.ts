import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const profiles = await db.laserProfile.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        patient: { select: { id: true, name: true, phone: true, gender: true, age: true } },
        _count: { select: { sessions: true, packages: true } },
      },
    })
    return NextResponse.json(profiles)
  } catch (error) {
    console.error('GET /api/laser-v2/profiles error:', error)
    return NextResponse.json({ error: 'خطأ في جلب البيانات' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { patientId, skinType, hairColor, hairThickness, skinSensitivity, hormonalConditions, contraindications, previousTreatments, notes } = body

    if (!patientId || !skinType) {
      return NextResponse.json({ error: 'المريض ونوع البشرة مطلوبان' }, { status: 400 })
    }

    // Check if profile already exists
    const existing = await db.laserProfile.findUnique({ where: { patientId } })
    if (existing) {
      return NextResponse.json({ error: 'يوجد بروفايل ليزر لهذا المريض بالفعل' }, { status: 400 })
    }

    const profile = await db.laserProfile.create({
      data: {
        patientId,
        skinType: skinType.toString(),
        hairColor: hairColor?.trim() || null,
        hairThickness: hairThickness?.trim() || null,
        skinSensitivity: skinSensitivity?.trim() || null,
        hormonalConditions: hormonalConditions?.trim() || null,
        contraindications: contraindications?.trim() || null,
        previousTreatments: previousTreatments?.trim() || null,
        notes: notes?.trim() || null,
      },
      include: {
        patient: { select: { id: true, name: true, phone: true, gender: true, age: true } },
      },
    })

    return NextResponse.json(profile, { status: 201 })
  } catch (error) {
    console.error('POST /api/laser-v2/profiles error:', error)
    return NextResponse.json({ error: 'خطأ في إنشاء البروفايل' }, { status: 500 })
  }
}
