import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    const where = status ? { status } : {}

    const entries = await db.queueEntry.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, phone: true } },
      },
      orderBy: [
        { priority: 'desc' },
        { order: 'asc' },
        { arrivedAt: 'asc' },
      ],
    })

    return NextResponse.json(entries)
  } catch (error) {
    console.error('Failed to fetch queue:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { patientId, patientName, visitType, notes, priority } = body

    if (!patientId || !patientName) {
      return NextResponse.json({ error: 'patientId and patientName required' }, { status: 400 })
    }

    // Get max order for waiting entries
    const maxOrder = await db.queueEntry.findFirst({
      where: { status: 'waiting' },
      orderBy: { order: 'desc' },
      select: { order: true },
    })

    const entry = await db.queueEntry.create({
      data: {
        patientId,
        patientName,
        visitType: visitType || null,
        notes: notes || null,
        priority: priority || 'normal',
        order: (maxOrder?.order || 0) + 1,
      },
      include: { patient: { select: { name: true, phone: true } } },
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    console.error('Failed to add to queue:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
