import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { startOfMonth, endOfMonth } from 'date-fns'

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

    const where: Record<string, unknown> = {}

    if (search) {
      where.patient = {
        OR: [
          { name: { contains: search } },
          { phone: { contains: search } },
        ],
      }
    }
    if (patientId) where.patientId = patientId
    if (sessionTypeId) where.sessionTypeId = sessionTypeId
    if (status) where.status = status
    if (dateFrom || dateTo) {
      where.date = {}
      if (dateFrom) (where.date as Record<string, unknown>).gte = new Date(dateFrom)
      if (dateTo) (where.date as Record<string, unknown>).lte = new Date(dateTo)
    }

    const [visits, total] = await Promise.all([
      db.visit.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          patient: { select: { id: true, name: true, phone: true } },
          sessionType: { select: { id: true, name: true, price: true } },
          laserTreatments: true,
        },
      }),
      db.visit.count({ where }),
    ])

    return NextResponse.json({ visits, total, page, limit })
  } catch (error) {
    console.error('GET /api/visits error:', error)
    return NextResponse.json({ error: 'خطأ في جلب البيانات' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { patientId, sessionTypeId, date, price, paid, remaining, notes, status } = body

    if (!patientId) {
      return NextResponse.json({ error: 'يرجى اختيار المريض' }, { status: 400 })
    }

    const visit = await db.visit.create({
      data: {
        patientId,
        sessionTypeId: sessionTypeId || null,
        date: date ? new Date(date) : new Date(),
        price: parseFloat(price) || 0,
        paid: parseFloat(paid) || 0,
        remaining: parseFloat(remaining) || 0,
        notes: notes?.trim() || null,
        status: status || 'completed',
      },
      include: {
        patient: { select: { id: true, name: true } },
        sessionType: true,
      },
    })

    return NextResponse.json(visit, { status: 201 })
  } catch (error) {
    console.error('POST /api/visits error:', error)
    return NextResponse.json({ error: 'خطأ في تسجيل الزيارة' }, { status: 500 })
  }
}
