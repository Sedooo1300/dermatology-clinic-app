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

function formatPhoneForWa(phone: string): string {
  let cleaned = phone.replace(/[\s\-\+]/g, '')
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1)
  }
  // If starts with 20, use as-is; otherwise prefix with 20
  if (!cleaned.startsWith('20')) {
    cleaned = '20' + cleaned
  }
  return cleaned
}

export async function POST(req: NextRequest) {
  try {
    await ensureMessageTable()

    const body = await req.json()
    const { patientId, templateId, phone: bodyPhone, customContent, scheduledAt } = body

    let patientName = ''
    let phone = bodyPhone || ''

    // Fetch patient info if patientId provided
    if (patientId) {
      const patient = await queryOne<{ id: string; name: string; phone: string }>(
        `SELECT id, name, phone FROM "Patient" WHERE id = $1`,
        [patientId]
      )
      if (patient) {
        patientName = patient.name || ''
        if (!phone && patient.phone) {
          phone = patient.phone
        }
      }
    }

    // Load template content if templateId provided
    const templates: Record<string, string> = {
      appointment_reminder: 'مرحباً {patientName} 👋\n\nتذكير بموعدك في عيادة المغازى غداً الساعة {time} ⏰\n\nيرجى الحضور قبل الموعد بـ 15 دقيقة\nعنوان العيادة: {address}\n\nللتأجيل أو الإلغاء اتصل بنا',
      followup_reminder: 'مرحباً {patientName} 💊\n\nحان وقت متابعة علاجك في عيادة المغازى\n\nآخر زيارة كانت: {lastVisitDate}\nالجلسة القادمة: {nextSession}\n\nيرجى الاتصال لحجز موعد',
      session_confirmation: 'تم تأكيد حجزك بنجاح ✅\n\nالاسم: {patientName}\nالجلسة: {sessionType}\nالتاريخ: {date}\nالساعة: {time}\nالسعر: {price} ج.م\n\nنتطلع لرؤيتك في عيادة المغازى 🏥',
      prescription_sent: 'مرحباً {patientName} 📋\n\nوصفتك الطبية من عيادة المغازى:\n\n{prescription}\n\nالجرعة: {dosage}\n\nملاحظات: {instructions}',
      payment_reminder: 'مرحباً {patientName} 💰\n\nتذكير بوجود رصيد متبقي في عيادة المغازى:\n\nالمبلغ المتبقي: {remainingAmount} ج.م\n\nيرجى السداد في أقرب فرصة\nللاستفسار اتصل بنا',
      after_care: 'مرحباً {patientName} 🌟\n\nنأمل أن تكونوا بخير بعد الجلسة الأخيرة\n\nبعض النصائح:\n- {tip1}\n- {tip2}\n- {tip3}\n\nالموعد القادم: {nextDate}\n\nعيادة المغازى 🏥',
      lab_results: 'مرحباً {patientName} 🔬\n\nنتائج التحاليل جاهزة في عيادة المغازى\n\nيرجى الاتصال أو الحضور للاطلاع على النتائج\n\nتحليل: {testName}\nالتاريخ: {date}',
      welcome: 'أهلاً وسهلاً بك في عيادة المغازى 👋✨\n\n{patientName} - تم تسجيلك في نظامنا\n\nنتمنى لك الشفاء العاجل\n\nلحجز موعد:\n📞 اتصل بنا\n📍 العنوان',
      promo_offer: 'عرض خاص من عيادة المغازى 🎁\n\n{offerDetails}\n\nالمدة: {offerDuration}\nللاستفادة اتصل بنا أو احجز مباشرة\n\nعيادة المغازى 🏥',
      review_request: 'مرحباً {patientName} ⭐\n\nنتمنى أن تكون تجربتك في عيادة المغازى مميزة\n\nنرجو منك تقييم زيارتك\nملاحظاتكم تهمنا ❤️\n\nشكراً لثقتكم بنا',
    }

    let content = customContent || ''
    if (templateId && templates[templateId]) {
      content = templates[templateId]
    }

    // Replace {patientName} placeholder
    content = content.replace(/\{patientName\}/g, patientName || 'المريض')

    if (!phone) {
      return NextResponse.json({ error: 'رقم التليفون مطلوب' }, { status: 400 })
    }

    if (!content.trim()) {
      return NextResponse.json({ error: 'محتوى الرسالة مطلوب' }, { status: 400 })
    }

    const formattedPhone = formatPhoneForWa(phone)
    const encodedContent = encodeURIComponent(content)
    const waLink = `https://wa.me/${formattedPhone}?text=${encodedContent}`

    const id = uuid()
    const now = new Date()
    const isScheduled = scheduledAt ? new Date(scheduledAt) : null
    const status = isScheduled && isScheduled > now ? 'scheduled' : 'sent'

    await query(
      `INSERT INTO "Message" (id, "patientId", "senderId", content, type, status, "scheduledAt", "sentAt", "waLink", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        id,
        patientId || null,
        null,
        content,
        'whatsapp',
        status,
        isScheduled,
        status === 'sent' ? now : null,
        waLink,
        now,
        now,
      ]
    )

    return NextResponse.json({
      waLink,
      messageId: id,
      status,
      content,
      phone: formattedPhone,
    }, { status: 201 })
  } catch (error) {
    console.error('POST /api/communications/send error:', error)
    return NextResponse.json({ error: 'خطأ في إرسال الرسالة' }, { status: 500 })
  }
}
