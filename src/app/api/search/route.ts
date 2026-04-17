import { query } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!q.trim()) {
      return NextResponse.json({ results: [], total: 0 })
    }

    const searchPattern = `%${q.trim()}%`

    const [patientsResult, visitsResult, prescriptionsResult, laserResult] = await Promise.all([
      query(
        `SELECT id, name, phone, gender, age, "createdAt",
          'patient' as result_type, name as title, phone as subtitle
         FROM "Patient"
         WHERE name ILIKE $1 OR phone ILIKE $1 OR notes ILIKE $1
         ORDER BY name LIMIT $2`,
        [searchPattern, limit]
      ),
      query(
        `SELECT v.id, v.date, v.price, v.paid, v.status, v.notes,
                p.name as "patientName", p.phone as "patientPhone",
                st.name as "sessionTypeName",
                'visit' as result_type,
                p.name || ' - ' || COALESCE(st.name, 'جلسة') as title,
                TO_CHAR(v.date, 'DD/MM/YYYY HH24:MI') as subtitle
         FROM "Visit" v
         LEFT JOIN "Patient" p ON v."patientId" = p.id
         LEFT JOIN "SessionType" st ON v."sessionTypeId" = st.id
         WHERE p.name ILIKE $1 OR p.phone ILIKE $1 OR v.notes ILIKE $1
           OR st.name ILIKE $1 OR TO_CHAR(v.date, 'DD/MM/YYYY') ILIKE $1
         ORDER BY v.date DESC LIMIT $2`,
        [searchPattern, limit]
      ),
      query(
        `SELECT pr.id, pr."createdAt", pr.diagnosis, pr.notes,
                p.name as "patientName", p.phone as "patientPhone",
                'prescription' as result_type,
                'وصفة: ' || p.name || COALESCE(' - ' || pr.diagnosis, '') as title,
                TO_CHAR(pr."createdAt", 'DD/MM/YYYY') as subtitle
         FROM "Prescription" pr
         LEFT JOIN "Patient" p ON pr."patientId" = p.id
         WHERE p.name ILIKE $1 OR p.phone ILIKE $1
           OR pr.diagnosis ILIKE $1 OR pr.notes ILIKE $1
         ORDER BY pr."createdAt" DESC LIMIT $2`,
        [searchPattern, limit]
      ),
      query(
        `SELECT ls.id, ls.date, ls."totalAmount", ls."paid", ls.status,
                p.name as "patientName", p.phone as "patientPhone",
                la.name as "areaName",
                'laser' as result_type,
                p.name || ' - ' || la.name as title,
                TO_CHAR(ls.date, 'DD/MM/YYYY') as subtitle
         FROM "LaserSession" ls
         LEFT JOIN "Patient" p ON ls."patientId" = p.id
         LEFT JOIN "LaserArea" la ON ls."areaId" = la.id
         WHERE p.name ILIKE $1 OR p.phone ILIKE $1
           OR la.name ILIKE $1
         ORDER BY ls.date DESC LIMIT $2`,
        [searchPattern, limit]
      ),
    ])

    const results = [
      ...patientsResult.rows,
      ...visitsResult.rows,
      ...prescriptionsResult.rows,
      ...laserResult.rows,
    ]

    return NextResponse.json({
      results,
      total: results.length,
      counts: {
        patients: patientsResult.rows.length,
        visits: visitsResult.rows.length,
        prescriptions: prescriptionsResult.rows.length,
        laser: laserResult.rows.length,
      },
    })
  } catch (error) {
    console.error('GET /api/search error:', error)
    return NextResponse.json({ error: 'خطأ في البحث' }, { status: 500 })
  }
}
