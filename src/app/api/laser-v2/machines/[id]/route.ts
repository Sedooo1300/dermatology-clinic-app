import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, type, wavelength, maxFluence, spotSizes, isActive, notes } = body

    const machine = await db.laserMachine.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(type !== undefined && { type: type.trim() }),
        ...(wavelength !== undefined && { wavelength: wavelength?.trim() || null }),
        ...(maxFluence !== undefined && { maxFluence: maxFluence ? parseFloat(maxFluence) : null }),
        ...(spotSizes !== undefined && { spotSizes: spotSizes?.trim() || null }),
        ...(isActive !== undefined && { isActive }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
      },
    })

    return NextResponse.json(machine)
  } catch (error) {
    console.error('PUT /api/laser-v2/machines/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في تعديل الجهاز' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.laserMachine.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/laser-v2/machines/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في حذف الجهاز' }, { status: 500 })
  }
}
