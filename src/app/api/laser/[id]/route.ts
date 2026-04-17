import { query, queryOne } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const {
      area, skinType, hairColor, skinSensitivity,
      fluence, pulseWidth, spotSize, coolingType, painLevel,
      progress, sessionsDone, sessionsTotal, nextSessionDate, notes,
    } = body

    const setClauses: string[] = [`"updatedAt" = CURRENT_TIMESTAMP`]
    const params: unknown[] = []

    if (area !== undefined) {
      setClauses.push(`"area" = $${params.length + 1}`)
      params.push(area)
    }
    if (skinType !== undefined) {
      setClauses.push(`"skinType" = $${params.length + 1}`)
      params.push(skinType || null)
    }
    if (hairColor !== undefined) {
      setClauses.push(`"hairColor" = $${params.length + 1}`)
      params.push(hairColor || null)
    }
    if (skinSensitivity !== undefined) {
      setClauses.push(`"skinSensitivity" = $${params.length + 1}`)
      params.push(skinSensitivity || null)
    }
    if (fluence !== undefined) {
      setClauses.push(`"fluence" = $${params.length + 1}`)
      params.push(fluence ? String(fluence) : null)
    }
    if (pulseWidth !== undefined) {
      setClauses.push(`"pulseWidth" = $${params.length + 1}`)
      params.push(pulseWidth ? String(pulseWidth) : null)
    }
    if (spotSize !== undefined) {
      setClauses.push(`"spotSize" = $${params.length + 1}`)
      params.push(spotSize ? String(spotSize) : null)
    }
    if (coolingType !== undefined) {
      setClauses.push(`"coolingType" = $${params.length + 1}`)
      params.push(coolingType || null)
    }
    if (painLevel !== undefined) {
      setClauses.push(`"painLevel" = $${params.length + 1}`)
      params.push(painLevel ? parseInt(painLevel) : null)
    }
    if (progress !== undefined) {
      setClauses.push(`"progress" = $${params.length + 1}`)
      params.push(progress || null)
    }
    if (sessionsDone !== undefined) {
      setClauses.push(`"sessionsDone" = $${params.length + 1}`)
      params.push(sessionsDone !== undefined ? parseInt(sessionsDone) : 0)
    }
    if (sessionsTotal !== undefined) {
      setClauses.push(`"sessionsTotal" = $${params.length + 1}`)
      params.push(sessionsTotal !== undefined ? parseInt(sessionsTotal) : 0)
    }
    if (nextSessionDate !== undefined) {
      setClauses.push(`"nextSessionDate" = $${params.length + 1}`)
      params.push(nextSessionDate ? new Date(nextSessionDate) : null)
    }
    if (notes !== undefined) {
      setClauses.push(`"notes" = $${params.length + 1}`)
      params.push(notes?.trim() || null)
    }

    params.push(id)
    const sql = `UPDATE "LaserTreatment" SET ${setClauses.join(', ')} WHERE "id" = $${params.length} RETURNING *`
    const { rows } = await query(sql, params)

    if (!rows[0]) {
      return NextResponse.json({ error: 'جلسة الليزر غير موجودة' }, { status: 404 })
    }

    return NextResponse.json(rows[0])
  } catch (error) {
    console.error('PUT /api/laser/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في تعديل جلسة الليزر' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await query(`DELETE FROM "LaserTreatment" WHERE "id" = $1`, [id])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/laser/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في حذف جلسة الليزر' }, { status: 500 })
  }
}
