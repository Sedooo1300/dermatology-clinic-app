import { query, pool } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// Ensure Message table exists
async function ensureMessageTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "Message" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "patientId" TEXT,
      "senderId" TEXT,
      "content" TEXT NOT NULL,
      "type" TEXT NOT NULL DEFAULT 'whatsapp',
      "status" TEXT NOT NULL DEFAULT 'sent',
      "scheduledAt" TIMESTAMP,
      "sentAt" TIMESTAMP,
      "waLink" TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).catch(() => {})
}

export async function GET(req: NextRequest) {
  try {
    await ensureMessageTable()

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || ''
    const status = searchParams.get('status') || ''
    const patientId = searchParams.get('patientId') || ''

    const conditions: string[] = []
    const params: unknown[] = []
    let paramIndex = 1

    if (type) {
      conditions.push(`m.type = $${paramIndex}`)
      params.push(type)
      paramIndex++
    }
    if (status) {
      conditions.push(`m.status = $${paramIndex}`)
      params.push(status)
      paramIndex++
    }
    if (patientId) {
      conditions.push(`m."patientId" = $${paramIndex}`)
      params.push(patientId)
      paramIndex++
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const messagesResult = await query(
      `SELECT
        m.id, m."patientId", m."senderId", m.content, m.type, m.status,
        m."scheduledAt", m."sentAt", m."waLink", m."createdAt", m."updatedAt",
        p.id as "patient_id", p.name as "patient_name", p.phone as "patient_phone"
      FROM "Message" m
      LEFT JOIN "Patient" p ON m."patientId" = p.id
      ${whereClause}
      ORDER BY m."createdAt" DESC
      LIMIT 50`,
      params
    )

    const messages = messagesResult.rows.map((m: Record<string, unknown>) => ({
      id: m.id,
      patientId: m.patientId,
      senderId: m.senderId,
      content: m.content,
      type: m.type,
      status: m.status,
      scheduledAt: m.scheduledAt,
      sentAt: m.sentAt,
      waLink: m.waLink,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      patient: m.patient_id ? {
        id: m.patient_id,
        name: m.patient_name,
        phone: m.patient_phone,
      } : null,
    }))

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('GET /api/communications/messages error:', error)
    return NextResponse.json({ error: 'خطأ في جلب الرسائل' }, { status: 500 })
  }
}
