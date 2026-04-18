import { query, uuid } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const patientId = searchParams.get('patientId') || ''
    const sessionTypeId = searchParams.get('sessionTypeId') || ''
    const status = searchParams.get('status') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    const conditions: string[] = []
    const params: unknown[] = []
    let paramIndex = 1

    if (search) {
      conditions.push(`(p.name ILIKE '%' || $${paramIndex} || '%' OR p.phone ILIKE '%' || $${paramIndex} || '%')`)
      params.push(search)
      paramIndex++
    }
    if (patientId) {
      conditions.push(`v."patientId" = $${paramIndex}`)
      params.push(patientId)
      paramIndex++
    }
    if (sessionTypeId) {
      conditions.push(`v."sessionTypeId" = $${paramIndex}`)
      params.push(sessionTypeId)
      paramIndex++
    }
    if (status) {
      conditions.push(`v.status = $${paramIndex}`)
      params.push(status)
      paramIndex++
    }
    if (dateFrom) {
      conditions.push(`v.date >= $${paramIndex}`)
      params.push(new Date(dateFrom))
      paramIndex++
    }
    if (dateTo) {
      conditions.push(`v.date <= $${paramIndex}`)
      params.push(new Date(dateTo))
      paramIndex++
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const [visitsResult, totalResult] = await Promise.all([
      query(
        `SELECT
          v.id, v."patientId", v."sessionTypeId", v.date, v.price, v.paid, v.remaining, v.notes, v.status, v."createdAt", v."updatedAt",
          p.id as "patient_id", p.name as "patient_name", p.phone as "patient_phone",
          st.id as "st_id", st.name as "st_name", st.price as "st_price"
        FROM "Visit" v
        LEFT JOIN "Patient" p ON v."patientId" = p.id
        LEFT JOIN "SessionType" st ON v."sessionTypeId" = st.id
        ${whereClause}
        ORDER BY v.date DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      ),
      query(
        `SELECT COUNT(*)::int as count FROM "Visit" v
         LEFT JOIN "Patient" p ON v."patientId" = p.id
         ${whereClause}`,
        params
      ),
    ])

    // Get all visit IDs for laserTreatments lookup
    const visitIds = visitsResult.rows.map((v) => v.id)

    let laserTreatmentsMap: Record<string, unknown[]> = {}
    if (visitIds.length > 0) {
      const ltResult = await query(
        `SELECT * FROM "LaserTreatment" WHERE "visitId" = ANY($1)`,
        [visitIds]
      )
      for (const lt of ltResult.rows) {
        const vid = lt.visitId
        if (!laserTreatmentsMap[vid]) laserTreatmentsMap[vid] = []
        laserTreatmentsMap[vid].push(lt)
      }
    }

    const visits = visitsResult.rows.map((v) => ({
      id: v.id,
      patientId: v.patientId,
      sessionTypeId: v.sessionTypeId,
      date: v.date,
      price: v.price,
      paid: v.paid,
      remaining: v.remaining,
      notes: v.notes,
      status: v.status,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
      patient: {
        id: v.patient_id,
        name: v.patient_name,
        phone: v.patient_phone,
      },
      sessionType: v.st_id ? {
        id: v.st_id,
        name: v.st_name,
        price: v.st_price,
      } : null,
      laserTreatments: laserTreatmentsMap[v.id] || [],
    }))

    return NextResponse.json({ visits, total: totalResult.rows[0].count, page, limit })
  } catch (error) {
    console.error('GET /api/visits error:', error)
    return NextResponse.json({ error: 'خطأ في جلب البيانات' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { patientId, sessionTypeId, date, price, paid, notes, status } = body

    if (!patientId) {
      return NextResponse.json({ error: 'يرجى اختيار المريض' }, { status: 400 })
    }

    const priceVal = parseFloat(price) || 0
    const paidVal = parseFloat(paid) || 0
    const remaining = priceVal - paidVal

    const id = uuid()
    const now = new Date()

    const result = await query(
      `INSERT INTO "Visit" ("id", "patientId", "sessionTypeId", "date", "price", "paid", "remaining", "notes", "status", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        id,
        patientId,
        sessionTypeId || null,
        date ? new Date(date) : now,
        parseFloat(price) || 0,
        parseFloat(paid) || 0,
        remaining,
        notes?.trim() || null,
        status || 'completed',
        now,
        now,
      ]
    )

    const visit = result.rows[0]

    // Fetch patient info for response
    const patientResult = await queryOne(
      `SELECT id, name FROM "Patient" WHERE id = $1`,
      [patientId]
    )

    // Fetch sessionType if exists
    let sessionType = null
    if (sessionTypeId) {
      sessionType = await queryOne(
        `SELECT * FROM "SessionType" WHERE id = $1`,
        [sessionTypeId]
      )
    }

    return NextResponse.json({
      ...visit,
      patient: patientResult ? { id: patientResult.id, name: patientResult.name } : null,
      sessionType,
    }, { status: 201 })
  } catch (error) {
    console.error('POST /api/visits error:', error)
    return NextResponse.json({ error: 'خطأ في تسجيل الزيارة' }, { status: 500 })
  }
}
