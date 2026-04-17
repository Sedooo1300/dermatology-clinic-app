import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const backups = await db.backup.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(backups)
  } catch (error) {
    console.error('GET /api/backups error:', error)
    return NextResponse.json({ error: 'خطأ في جلب النسخ الاحتياطية' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, data } = body

    if (!name || !data) {
      return NextResponse.json({ error: 'اسم النسخة والبيانات مطلوبان' }, { status: 400 })
    }

    const jsonString = typeof data === 'string' ? data : JSON.stringify(data)
    const size = new TextEncoder().encode(jsonString).length

    const backup = await db.backup.create({
      data: {
        name: name.trim(),
        data: jsonString,
        size,
      },
    })

    return NextResponse.json(backup, { status: 201 })
  } catch (error) {
    console.error('POST /api/backups error:', error)
    return NextResponse.json({ error: 'خطأ في حفظ النسخة الاحتياطية' }, { status: 500 })
  }
}
