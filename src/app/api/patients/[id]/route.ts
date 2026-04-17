import { query, queryOne, uuid } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const patient = await queryOne(
      `SELECT * FROM "Patient" WHERE id = $1`,
      [id]
    )

    if (!patient) {
      return NextResponse.json({ error: 'الحالة غير موجودة' }, { status: 404 })
    }

    // Fetch visits with sessionType via LEFT JOIN
    const visitsResult = await query(
      `SELECT
        v.id, v."patientId", v."sessionTypeId", v.date, v.price, v.paid, v.remaining, v.notes, v.status, v."createdAt", v."updatedAt",
        st.id as "st_id", st.name as "st_name", st.price as "st_price", st.description as "st_description", st."isActive" as "st_isActive", st."createdAt" as "st_createdAt", st."updatedAt" as "st_updatedAt"
      FROM "Visit" v
      LEFT JOIN "SessionType" st ON v."sessionTypeId" = st.id
      WHERE v."patientId" = $1
      ORDER BY v.date DESC`,
      [id]
    )

    // Get all visit IDs for laserTreatments lookup
    const visitIds = visitsResult.rows.map((v) => v.id)

    let laserTreatmentsMap: Record<string, unknown[]> = {}
    if (visitIds.length > 0) {
      const ltResult = await query(
        `SELECT * FROM "LaserTreatment" WHERE "visitId" = ANY($1)`,
        [visitIds]
      )
      for (const lt of ltResult.rows) {
        const visitId = lt.visitId
        if (!laserTreatmentsMap[visitId]) laserTreatmentsMap[visitId] = []
        laserTreatmentsMap[visitId].push(lt)
      }
    }

    // Fetch photos
    const photosResult = await query(
      `SELECT * FROM "PatientPhoto" WHERE "patientId" = $1 ORDER BY "createdAt" DESC`,
      [id]
    )

    // Fetch alerts
    const alertsResult = await query(
      `SELECT * FROM "Alert" WHERE "patientId" = $1 ORDER BY "createdAt" DESC`,
      [id]
    )

    // Build visits with nested sessionType and laserTreatments
    const visits = visitsResult.rows.map((v) => {
      const visit = {
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
        sessionType: v.st_id ? {
          id: v.st_id,
          name: v.st_name,
          price: v.st_price,
          description: v.st_description,
          isActive: v.st_isActive,
          createdAt: v.st_createdAt,
          updatedAt: v.st_updatedAt,
        } : null,
        laserTreatments: laserTreatmentsMap[v.id] || [],
      }
      return visit
    })

    // Calculate totals
    const totalPaid = visits.reduce((sum, v) => sum + (v.paid as number), 0)
    const totalRemaining = visits.reduce((sum, v) => sum + (v.remaining as number), 0)
    const totalVisits = visits.length

    const result = {
      id: patient.id,
      name: patient.name,
      phone: patient.phone,
      age: patient.age,
      gender: patient.gender,
      notes: patient.notes,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
      visits,
      photos: photosResult.rows,
      alerts: alertsResult.rows,
      totalPaid,
      totalRemaining,
      totalVisits,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('GET /api/patients/[id] error:', error)
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
    const { name, phone, age, gender, notes } = body

    const result = await query(
      `UPDATE "Patient"
       SET name = $1, phone = $2, age = $3, gender = $4, notes = $5, "updatedAt" = $6
       WHERE id = $7
       RETURNING *`,
      [
        name?.trim() || undefined,
        phone?.trim() || null,
        age ? parseInt(age) : null,
        gender || undefined,
        notes?.trim() || null,
        new Date(),
        id,
      ]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'الحالة غير موجودة' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('PUT /api/patients/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في تعديل الحالة' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const result = await query(
      `DELETE FROM "Patient" WHERE id = $1 RETURNING id`,
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'الحالة غير موجودة' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/patients/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في حذف الحالة' }, { status: 500 })
  }
}
