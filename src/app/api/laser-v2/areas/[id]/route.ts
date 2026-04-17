import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, malePulses, femalePulses, pulsePrice, isActive } = body

    const area = await db.laserArea.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(malePulses !== undefined && { malePulses: parseInt(malePulses) }),
        ...(femalePulses !== undefined && { femalePulses: parseInt(femalePulses) }),
        ...(pulsePrice !== undefined && { pulsePrice: parseFloat(pulsePrice) }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return NextResponse.json(area)
  } catch (error) {
    console.error('PUT /api/laser-v2/areas/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في تعديل المنطقة' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.laserArea.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/laser-v2/areas/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في حذف المنطقة' }, { status: 500 })
  }
}
