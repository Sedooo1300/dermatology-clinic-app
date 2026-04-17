import { query } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, format } from 'date-fns'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'visits'
    const period = searchParams.get('period') || 'monthly'
    const date = searchParams.get('date') || new Date().toISOString()

    const refDate = new Date(date)
    let dateFrom: Date
    let dateTo: Date

    switch (period) {
      case 'daily':
        dateFrom = new Date(refDate.setHours(0, 0, 0, 0))
        dateTo = new Date(refDate.setHours(23, 59, 59, 999))
        break
      case 'weekly':
        dateFrom = startOfWeek(refDate)
        dateTo = endOfWeek(refDate)
        break
      case 'monthly':
      default:
        dateFrom = startOfMonth(refDate)
        dateTo = endOfMonth(refDate)
        break
    }

    let data: unknown = {}

    switch (type) {
      case 'visits': {
        const visitsResult = await query(
          `SELECT v.*,
            json_build_object('name', "patient"."name") AS "patient",
            json_build_object('name', "st"."name") AS "sessionType"
           FROM "Visit" v
           LEFT JOIN "Patient" "patient" ON "patient"."id" = v."patientId"
           LEFT JOIN "SessionType" "st" ON "st"."id" = v."sessionTypeId"
           WHERE v."date" >= $1 AND v."date" <= $2
           ORDER BY v."date" DESC`,
          [dateFrom, dateTo]
        )
        const visits = visitsResult.rows
        const completed = visits.filter((v) => v.status === 'completed')
        const cancelled = visits.filter((v) => v.status === 'cancelled')
        const scheduled = visits.filter((v) => v.status === 'scheduled')
        const totalRevenue = completed.reduce((s, v) => s + Number(v.paid), 0)
        data = { visits, completed, cancelled, scheduled, totalRevenue, period, dateFrom, dateTo }
        break
      }
      case 'finance': {
        const expensesResult = await query(
          `SELECT * FROM "Expense" WHERE "date" >= $1 AND "date" <= $2`,
          [dateFrom, dateTo]
        )
        const revenuesResult = await query(
          `SELECT * FROM "Revenue" WHERE "date" >= $1 AND "date" <= $2`,
          [dateFrom, dateTo]
        )
        const expenses = expensesResult.rows
        const revenues = revenuesResult.rows
        const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0)
        const totalRevenues = revenues.reduce((s, r) => s + Number(r.amount), 0)
        data = { expenses, revenues, totalExpenses, totalRevenues, netProfit: totalRevenues - totalExpenses, period, dateFrom, dateTo }
        break
      }
      case 'laser': {
        const treatmentsResult = await query(
          `SELECT lt.*,
            json_build_object(
              'patient', json_build_object('name', "patient"."name")
            ) AS "visit"
           FROM "LaserTreatment" lt
           LEFT JOIN "Visit" v ON v."id" = lt."visitId"
           LEFT JOIN "Patient" "patient" ON "patient"."id" = v."patientId"
           WHERE lt."createdAt" >= $1 AND lt."createdAt" <= $2
           ORDER BY lt."createdAt" DESC`,
          [dateFrom, dateTo]
        )
        const laserTreatments = treatmentsResult.rows
        const areas = laserTreatments.reduce((acc, t) => {
          acc[t.area] = (acc[t.area] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        data = { treatments: laserTreatments, areas, total: laserTreatments.length, period, dateFrom, dateTo }
        break
      }
      case 'patients': {
        const patientsResult = await query(
          `SELECT p.*, COUNT(v."id")::int AS "_count_visits"
           FROM "Patient" p
           LEFT JOIN "Visit" v ON v."patientId" = p."id"
           GROUP BY p."id"
           ORDER BY p."createdAt" DESC`,
          []
        )
        const patients = patientsResult.rows.map((p) => ({
          ...p,
          _count: { visits: p._count_visits },
        }))
        const newPatients = patients.filter((p) => new Date(p.createdAt) >= dateFrom && new Date(p.createdAt) <= dateTo)
        data = { patients, newPatients, total: patients.length, newThisPeriod: newPatients.length, period, dateFrom, dateTo }
        break
      }
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('GET /api/reports error:', error)
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 })
  }
}
