import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const machines = await db.laserMachine.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { sessions: true } } },
    })
    return NextResponse.json(machines)
  } catch (error) {
    console.error('GET /api/laser-v2/machines error:', error)
    return NextResponse.json({ error: 'خطأ في جلب البيانات' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, type, wavelength, maxFluence, spotSizes, isActive, notes } = body

    if (!name?.trim() || !type?.trim()) {
      return NextResponse.json({ error: 'الاسم والنوع مطلوبان' }, { status: 400 })
    }

    const machine = await db.laserMachine.create({
      data: {
        name: name.trim(),
        type: type.trim(),
        wavelength: wavelength?.trim() || null,
        maxFluence: maxFluence ? parseFloat(maxFluence) : null,
        spotSizes: spotSizes?.trim() || null,
        isActive: isActive !== false,
        notes: notes?.trim() || null,
      },
    })

    return NextResponse.json(machine, { status: 201 })
  } catch (error) {
    console.error('POST /api/laser-v2/machines error:', error)
    return NextResponse.json({ error: 'خطأ في إضافة الجهاز' }, { status: 500 })
  }
}
