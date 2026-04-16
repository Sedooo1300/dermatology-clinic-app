import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const areas = await db.laserArea.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { sessions: true, packages: true } } },
    })
    return NextResponse.json(areas)
  } catch (error) {
    console.error('GET /api/laser-v2/areas error:', error)
    return NextResponse.json({ error: 'خطأ في جلب البيانات' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, malePulses, femalePulses, pulsePrice, isActive } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'اسم المنطقة مطلوب' }, { status: 400 })
    }

    const area = await db.laserArea.create({
      data: {
        name: name.trim(),
        malePulses: malePulses ? parseInt(malePulses) : 200,
        femalePulses: femalePulses ? parseInt(femalePulses) : 150,
        pulsePrice: pulsePrice !== undefined ? parseFloat(pulsePrice) : 0,
        isActive: isActive !== false,
      },
    })

    return NextResponse.json(area, { status: 201 })
  } catch (error) {
    console.error('POST /api/laser-v2/areas error:', error)
    return NextResponse.json({ error: 'خطأ في إضافة المنطقة' }, { status: 500 })
  }
}
