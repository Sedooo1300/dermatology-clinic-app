import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { entries } = await req.json()

    if (!entries || !Array.isArray(entries)) {
      return NextResponse.json({ error: 'entries array required' }, { status: 400 })
    }

    for (const entry of entries) {
      await db.queueEntry.update({
        where: { id: entry.id },
        data: { order: entry.order },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
