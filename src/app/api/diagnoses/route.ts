import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const patientId = searchParams.get('patientId')

    const where = patientId ? { patientId } : {}

    const diagnoses = await db.diagnosis.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(diagnoses)
  } catch (error) {
    console.error('Failed to fetch diagnoses:', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { patientId, visitId, condition, severity, bodyArea, icdCode, notes } = body

    if (!patientId || !condition) {
      return NextResponse.json({ error: 'patientId and condition are required' }, { status: 400 })
    }

    const diagnosis = await db.diagnosis.create({
      data: {
        patientId,
        visitId: visitId || null,
        condition,
        severity: severity || 'mild',
        bodyArea: bodyArea || null,
        icdCode: icdCode || null,
        notes: notes || null,
      },
      include: { patient: { select: { name: true } } },
    })

    return NextResponse.json(diagnosis, { status: 201 })
  } catch (error) {
    console.error('Failed to create diagnosis:', error)
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}
