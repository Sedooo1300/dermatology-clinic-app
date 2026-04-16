import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, format } from 'date-fns'

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
        const visits = await db.visit.findMany({
          where: { date: { gte: dateFrom, lte: dateTo } },
          include: { patient: { select: { name: true } }, sessionType: { select: { name: true } } },
          orderBy: { date: 'desc' },
        })
        const completed = visits.filter((v) => v.status === 'completed')
        const cancelled = visits.filter((v) => v.status === 'cancelled')
        const scheduled = visits.filter((v) => v.status === 'scheduled')
        const totalRevenue = completed.reduce((s, v) => s + v.paid, 0)
        data = { visits, completed, cancelled, scheduled, totalRevenue, period, dateFrom, dateTo }
        break
      }
      case 'finance': {
        const expenses = await db.expense.findMany({
          where: { date: { gte: dateFrom, lte: dateTo } },
        })
        const revenues = await db.revenue.findMany({
          where: { date: { gte: dateFrom, lte: dateTo } },
        })
        const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
        const totalRevenues = revenues.reduce((s, r) => s + r.amount, 0)
        data = { expenses, revenues, totalExpenses, totalRevenues, netProfit: totalRevenues - totalExpenses, period, dateFrom, dateTo }
        break
      }
      case 'laser': {
        const laserTreatments = await db.laserTreatment.findMany({
          where: { createdAt: { gte: dateFrom, lte: dateTo } },
          include: { visit: { include: { patient: { select: { name: true } } } } },
          orderBy: { createdAt: 'desc' },
        })
        const areas = laserTreatments.reduce((acc, t) => {
          acc[t.area] = (acc[t.area] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        data = { treatments: laserTreatments, areas, total: laserTreatments.length, period, dateFrom, dateTo }
        break
      }
      case 'patients': {
        const patients = await db.patient.findMany({
          include: { _count: { select: { visits: true } } },
          orderBy: { createdAt: 'desc' },
        })
        const newPatients = patients.filter((p) => p.createdAt >= dateFrom && p.createdAt <= dateTo)
        data = { patients, newPatients, total: patients.length, newThisPeriod: newPatients.length, period, dateFrom, dateTo }
        break
      }
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('GET /api/reports error:', error)
    return NextResponse.json({ error: 'خطأ في جلب التقرير' }, { status: 500 })
  }
}
