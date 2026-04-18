import { query, queryOne, uuid } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const visit = await queryOne(
      `SELECT
        v.*,
        p.id as "patient_id", p.name as "patient_name", p.phone as "patient_phone", p.age as "patient_age", p.gender as "patient_gender", p.notes as "patient_notes", p."createdAt" as "patient_createdAt", p."updatedAt" as "patient_updatedAt",
        st.id as "st_id", st.name as "st_name", st.price as "st_price", st.description as "st_description", st."isActive" as "st_isActive", st."createdAt" as "st_createdAt", st."updatedAt" as "st_updatedAt"
      FROM "Visit" v
      LEFT JOIN "Patient" p ON v."patientId" = p.id
      LEFT JOIN "SessionType" st ON v."sessionTypeId" = st.id
      WHERE v.id = $1`,
      [id]
    )

    if (!visit) {
      return NextResponse.json({ error: 'الزيارة غير موجودة' }, { status: 404 })
    }

    // Fetch laserTreatments for this visit
    const laserTreatmentsResult = await query(
      `SELECT * FROM "LaserTreatment" WHERE "visitId" = $1`,
      [id]
    )

    const result = {
      id: visit.id,
      patientId: visit.patientId,
      sessionTypeId: visit.sessionTypeId,
      date: visit.date,
      price: visit.price,
      paid: visit.paid,
      remaining: visit.remaining,
      notes: visit.notes,
      status: visit.status,
      createdAt: visit.createdAt,
      updatedAt: visit.updatedAt,
      patient: visit.patient_id ? {
        id: visit.patient_id,
        name: visit.patient_name,
        phone: visit.patient_phone,
        age: visit.patient_age,
        gender: visit.patient_gender,
        notes: visit.patient_notes,
        createdAt: visit.patient_createdAt,
        updatedAt: visit.patient_updatedAt,
      } : null,
      sessionType: visit.st_id ? {
        id: visit.st_id,
        name: visit.st_name,
        price: visit.st_price,
        description: visit.st_description,
        isActive: visit.st_isActive,
        createdAt: visit.st_createdAt,
        updatedAt: visit.st_updatedAt,
      } : null,
      laserTreatments: laserTreatmentsResult.rows,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('GET /api/visits/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في جلب البيانات' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { patientId, sessionTypeId, date, price, paid, notes, status } = body

    const priceVal = price !== undefined ? parseFloat(price) : undefined
    const paidVal = paid !== undefined ? parseFloat(paid) : undefined
    const remaining = (priceVal !== undefined && paidVal !== undefined) ? priceVal - paidVal : undefined

    const result = await query(
      `UPDATE "Visit"
       SET "patientId" = $1, "sessionTypeId" = $2, date = $3, price = $4, paid = $5, remaining = $6, notes = $7, status = $8, "updatedAt" = $9
       WHERE id = $10
       RETURNING *`,
      [
        patientId || null,
        sessionTypeId || null,
        date ? new Date(date) : undefined,
        priceVal,
        paidVal,
        remaining,
        notes?.trim() || null,
        status || undefined,
        new Date(),
        id,
      ]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'الزيارة غير موجودة' }, { status: 404 })
    }

    const visit = result.rows[0]

    // Fetch patient info for response
    const patientResult = await queryOne(
      `SELECT id, name FROM "Patient" WHERE id = $1`,
      [visit.patientId]
    )

    // Fetch sessionType if exists
    let sessionType = null
    if (visit.sessionTypeId) {
      sessionType = await queryOne(
        `SELECT * FROM "SessionType" WHERE id = $1`,
        [visit.sessionTypeId]
      )
    }

    return NextResponse.json({
      ...visit,
      patient: patientResult ? { id: patientResult.id, name: patientResult.name } : null,
      sessionType,
    })
  } catch (error) {
    console.error('PUT /api/visits/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في تعديل الزيارة' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const result = await query(
      `DELETE FROM "Visit" WHERE id = $1 RETURNING id`,
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'الزيارة غير موجودة' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/visits/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في حذف الزيارة' }, { status: 500 })
  }
}
