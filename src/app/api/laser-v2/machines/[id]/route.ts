import { query } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, type, wavelength, maxFluence, spotSizes, isActive, notes } = body

    const setClauses: string[] = [`"updatedAt" = CURRENT_TIMESTAMP`]
    const params: unknown[] = []

    if (name !== undefined) {
      setClauses.push(`"name" = $${params.length + 1}`)
      params.push(name.trim())
    }
    if (type !== undefined) {
      setClauses.push(`"type" = $${params.length + 1}`)
      params.push(type.trim())
    }
    if (wavelength !== undefined) {
      setClauses.push(`"wavelength" = $${params.length + 1}`)
      params.push(wavelength?.trim() || null)
    }
    if (maxFluence !== undefined) {
      setClauses.push(`"maxFluence" = $${params.length + 1}`)
      params.push(maxFluence ? parseFloat(maxFluence) : null)
    }
    if (spotSizes !== undefined) {
      setClauses.push(`"spotSizes" = $${params.length + 1}`)
      params.push(spotSizes?.trim() || null)
    }
    if (isActive !== undefined) {
      setClauses.push(`"isActive" = $${params.length + 1}`)
      params.push(isActive ? true : false)
    }
    if (notes !== undefined) {
      setClauses.push(`"notes" = $${params.length + 1}`)
      params.push(notes?.trim() || null)
    }

    params.push(id)
    const sql = `UPDATE "LaserMachine" SET ${setClauses.join(', ')} WHERE "id" = $${params.length} RETURNING *`
    const { rows } = await query(sql, params)

    if (!rows[0]) {
      return NextResponse.json({ error: 'الجهاز غير موجود' }, { status: 404 })
    }

    return NextResponse.json(rows[0])
  } catch (error) {
    console.error('PUT /api/laser-v2/machines/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في تعديل الجهاز' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await query(`DELETE FROM "LaserMachine" WHERE "id" = $1`, [id])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/laser-v2/machines/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في حذف الجهاز' }, { status: 500 })
  }
}
