import { query, uuid } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''
    const patientId = searchParams.get('patientId') || ''

    const conditions: string[] = []
    const params: unknown[] = []

    if (patientId) {
      conditions.push(`"patientId" = $${params.length + 1}`)
      params.push(patientId)
    }
    if (dateFrom) {
      conditions.push(`"date" >= $${params.length + 1}`)
      params.push(new Date(dateFrom))
    }
    if (dateTo) {
      conditions.push(`"date" <= $${params.length + 1}`)
      params.push(new Date(dateTo + 'T23:59:59'))
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const sql = `SELECT * FROM "LaserRevenue" ${where} ORDER BY "date" DESC`
    const { rows } = await query(sql, params)

    const totalAmount = rows.reduce((sum: number, r: Record<string, unknown>) => sum + Number(r.amount), 0)

    return NextResponse.json({ revenues: rows, totalAmount })
  } catch (error) {
    console.error('GET /api/laser-v2/revenue error:', error)
    return NextResponse.json({ error: 'خطأ في جلب البيانات' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { patientId, sessionId, packageId, type, amount, description, date } = body

    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: 'المبلغ مطلوب ويجب أن يكون أكبر من صفر' }, { status: 400 })
    }

    const id = uuid()
    const sql = `
      INSERT INTO "LaserRevenue" ("id", "patientId", "sessionId", "packageId", "type", "amount", "description", "date")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `
    const { rows } = await query(sql, [
      id,
      patientId || null,
      sessionId || null,
      packageId || null,
      type || 'extra',
      parseFloat(amount),
      description?.trim() || null,
      date ? new Date(date) : new Date(),
    ])

    return NextResponse.json(rows[0], { status: 201 })
  } catch (error) {
    console.error('POST /api/laser-v2/revenue error:', error)
    return NextResponse.json({ error: 'خطأ في إضافة الإيراد' }, { status: 500 })
  }
}
