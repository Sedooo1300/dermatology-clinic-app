import { query, queryOne, uuid, pool } from '@/lib/db'
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

export async function POST(req: NextRequest) {
  try {
    await ensureMessageTable()

    const body = await req.json()
    const { patientPhone, patientName, sessionTypeId, date, time } = body

    if (!patientPhone || !patientName || !date || !time) {
      return NextResponse.json({ error: 'البيانات مطلوبة: الاسم، رقم التليفون، التاريخ، والوقت' }, { status: 400 })
    }

    // Find or create patient by phone
    let patient = await queryOne<{ id: string; name: string; phone: string }>(
      `SELECT id, name, phone FROM "Patient" WHERE phone = $1 LIMIT 1`,
      [patientPhone]
    )

    let patientId: string

    if (patient) {
      patientId = patient.id
      // Update name if different
      if (patient.name !== patientName) {
        await query(
          `UPDATE "Patient" SET name = $1, "updatedAt" = $2 WHERE id = $3`,
          [patientName, new Date(), patientId]
        )
      }
    } else {
      // Create new patient
      patientId = uuid()
      await query(
        `INSERT INTO "Patient" (id, name, phone, gender, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, 'male', $4, $4)`,
        [patientId, patientName, patientPhone, new Date()]
      )
    }

    // Get session type info if provided
    let sessionTypeName = ''
    let sessionPrice = 0
    if (sessionTypeId) {
      const sessionType = await queryOne<{ name: string; price: number }>(
        `SELECT name, price FROM "SessionType" WHERE id = $1`,
        [sessionTypeId]
      )
      if (sessionType) {
        sessionTypeName = sessionType.name
        sessionPrice = sessionType.price
      }
    }

    // Create the visit
    const visitId = uuid()
    const visitDate = new Date(`${date}T${time}:00`)
    const now = new Date()

    await query(
      `INSERT INTO "Visit" (id, "patientId", "sessionTypeId", date, price, paid, remaining, notes, status, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        visitId,
        patientId,
        sessionTypeId || null,
        visitDate,
        sessionPrice,
        0,
        sessionPrice,
        'حجز عبر روبوت واتساب',
        'scheduled',
        now,
        now,
      ]
    )

    // Send confirmation message record
    const confirmationContent = `تم تأكيد حجزك بنجاح ✅

الاسم: ${patientName}
الجلسة: ${sessionTypeName || 'كشف'}
التاريخ: ${date}
الساعة: ${time}
${sessionPrice > 0 ? `السعر: ${sessionPrice} ج.م` : ''}

نتطلع لرؤيتك في عيادة المغازى 🏥`

    // Format phone for wa.me
    let cleanedPhone = patientPhone.replace(/[\s\-\+]/g, '')
    if (cleanedPhone.startsWith('0')) {
      cleanedPhone = cleanedPhone.substring(1)
    }
    if (!cleanedPhone.startsWith('20')) {
      cleanedPhone = '20' + cleanedPhone
    }

    const waLink = `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(confirmationContent)}`

    await query(
      `INSERT INTO "Message" (id, "patientId", content, type, status, "waLink", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
      [uuid(), patientId, confirmationContent, 'whatsapp', 'sent', waLink, now]
    )

    return NextResponse.json({
      success: true,
      message: 'تم الحجز بنجاح ✅',
      booking: {
        visitId,
        patientId,
        patientName,
        sessionType: sessionTypeName || 'كشف',
        date,
        time,
        price: sessionPrice,
        status: 'scheduled',
      },
      waLink,
    }, { status: 201 })
  } catch (error) {
    console.error('POST /api/communications/bot/book error:', error)
    return NextResponse.json({ error: 'خطأ في حجز الموعد' }, { status: 500 })
  }
}
