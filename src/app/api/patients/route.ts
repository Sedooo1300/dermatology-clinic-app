import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const gender = searchParams.get('gender') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
      ]
    }
    if (gender) {
      where.gender = gender
    }

    const [patients, total] = await Promise.all([
      db.patient.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { visits: true, photos: true, alerts: true } },
        },
      }),
      db.patient.count({ where }),
    ])

    return NextResponse.json({ patients, total, page, limit })
  } catch (error) {
    console.error('GET /api/patients error:', error)
    return NextResponse.json({ error: 'خطأ في جلب البيانات' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, phone, age, gender, notes } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'الاسم مطلوب' }, { status: 400 })
    }

    const patient = await db.patient.create({
      data: {
        name: name.trim(),
        phone: phone?.trim() || null,
        age: age ? parseInt(age) : null,
        gender: gender || 'male',
        notes: notes?.trim() || null,
      },
    })

    return NextResponse.json(patient, { status: 201 })
  } catch (error) {
    console.error('POST /api/patients error:', error)
    return NextResponse.json({ error: 'خطأ في إضافة الحالة' }, { status: 500 })
  }
}
