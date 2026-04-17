import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const prescription = await db.prescription.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, name: true, phone: true, age: true, gender: true } },
        items: { orderBy: { id: 'asc' } },
      },
    })

    if (!prescription) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(prescription)
  } catch (error) {
    console.error('Failed to fetch prescription:', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { diagnosis, notes, items } = body

    // Update prescription fields
    await db.prescription.update({
      where: { id },
      data: {
        diagnosis: diagnosis !== undefined ? diagnosis : undefined,
        notes: notes !== undefined ? notes : undefined,
      },
    })

    // If items provided, replace all items
    if (items && Array.isArray(items)) {
      await db.prescriptionItem.deleteMany({ where: { prescriptionId: id } })
      if (items.length > 0) {
        await db.prescriptionItem.createMany({
          data: items.map((item: {
            medicineName: string
            dosage?: string
            frequency?: string
            duration?: string
            instructions?: string
            quantity?: number
          }) => ({
            prescriptionId: id,
            medicineName: item.medicineName,
            dosage: item.dosage || null,
            frequency: item.frequency || null,
            duration: item.duration || null,
            instructions: item.instructions || null,
            quantity: item.quantity || null,
          })),
        })
      }
    }

    const updated = await db.prescription.findUnique({
      where: { id },
      include: { items: true, patient: { select: { name: true } } },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Failed to update prescription:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.prescriptionItem.deleteMany({ where: { prescriptionId: id } })
    await db.prescription.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete prescription:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
