import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const patientId = searchParams.get('patientId')

    const where = patientId ? { patientId } : {}

    const prescriptions = await db.prescription.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(prescriptions)
  } catch (error) {
    console.error('Failed to fetch prescriptions:', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { patientId, visitId, diagnosis, notes, items } = body

    if (!patientId || !items || items.length === 0) {
      return NextResponse.json({ error: 'patientId and items are required' }, { status: 400 })
    }

    const prescription = await db.prescription.create({
      data: {
        patientId,
        visitId: visitId || null,
        diagnosis: diagnosis || null,
        notes: notes || null,
        items: {
          create: items.map((item: {
            medicineName: string
            dosage?: string
            frequency?: string
            duration?: string
            instructions?: string
            quantity?: number
          }) => ({
            medicineName: item.medicineName,
            dosage: item.dosage || null,
            frequency: item.frequency || null,
            duration: item.duration || null,
            instructions: item.instructions || null,
            quantity: item.quantity || null,
          })),
        },
      },
      include: { items: true, patient: { select: { name: true } } },
    })

    return NextResponse.json(prescription, { status: 201 })
  } catch (error) {
    console.error('Failed to create prescription:', error)
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}
