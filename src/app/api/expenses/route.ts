import { query, uuid } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    const conditions: string[] = []
    const params: unknown[] = []
    let paramIndex = 1

    if (category) {
      conditions.push(`"category" = $${paramIndex}`)
      params.push(category)
      paramIndex++
    }
    if (dateFrom) {
      conditions.push(`date >= $${paramIndex}`)
      params.push(new Date(dateFrom))
      paramIndex++
    }
    if (dateTo) {
      conditions.push(`date <= $${paramIndex}`)
      params.push(new Date(dateTo))
      paramIndex++
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const [expensesResult, totalResult, sumResult] = await Promise.all([
      query(
        `SELECT * FROM "Expense" ${whereClause} ORDER BY date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      ),
      query(
        `SELECT COUNT(*)::int as count FROM "Expense" ${whereClause}`,
        params
      ),
      query(
        `SELECT COALESCE(SUM(amount), 0)::float as total FROM "Expense" ${whereClause}`,
        params
      ),
    ])

    return NextResponse.json({
      expenses: expensesResult.rows,
      total: totalResult.rows[0].count,
      page,
      limit,
      totalAmount: sumResult.rows[0].total,
    })
  } catch (error) {
    console.error('GET /api/expenses error:', error)
    return NextResponse.json({ error: 'خطأ في جلب البيانات' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { category, amount, description, date } = body

    if (!category || !amount) {
      return NextResponse.json({ error: 'الفئة والمبلغ مطلوبان' }, { status: 400 })
    }

    const id = uuid()
    const now = new Date()

    const result = await query(
      `INSERT INTO "Expense" ("id", "category", "amount", "description", "date", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        id,
        category.trim(),
        parseFloat(amount),
        description?.trim() || null,
        date ? new Date(date) : now,
        now,
        now,
      ]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error('POST /api/expenses error:', error)
    return NextResponse.json({ error: 'خطأ في إضافة المصروف' }, { status: 500 })
  }
}
