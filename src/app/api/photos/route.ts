import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const patientId = searchParams.get('patientId') || ''
    const type = searchParams.get('type') || ''

    const where: Record<string, unknown> = {}
    if (patientId) where.patientId = patientId
    if (type) where.type = type

    const photos = await db.patientPhoto.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(photos)
  } catch (error) {
    console.error('GET /api/photos error:', error)
    return NextResponse.json({ error: 'خطأ في جلب الصور' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { patientId, visitId, type, photoUrl, notes } = body

    if (!patientId || !photoUrl) {
      return NextResponse.json({ error: 'البيانات المطلوبة غير مكتملة' }, { status: 400 })
    }

    const photo = await db.patientPhoto.create({
      data: {
        patientId,
        visitId: visitId || null,
        type: type || 'before',
        photoUrl,
        notes: notes?.trim() || null,
      },
    })

    return NextResponse.json(photo, { status: 201 })
  } catch (error) {
    console.error('POST /api/photos error:', error)
    return NextResponse.json({ error: 'خطأ في رفع الصورة' }, { status: 500 })
  }
}
