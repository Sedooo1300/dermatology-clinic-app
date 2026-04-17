import { query, queryOne, uuid } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    let created = 0

    // 1. Upcoming appointments (scheduled visits in next 3 days)
    const upcomingVisits = await query<{
      id: string
      patientId: string
      date: string
      patientName: string | null
      sessionTypeName: string | null
    }>(
      `SELECT v.id, v."patientId", v."date", p.name as "patientName", st.name as "sessionTypeName"
      FROM "Visit" v
      LEFT JOIN "Patient" p ON v."patientId" = p.id
      LEFT JOIN "SessionType" st ON v."sessionTypeId" = st.id
      WHERE v."date" >= $1 AND v."date" <= $2 AND v.status = 'scheduled'`,
      [startOfDay, in3Days]
    )

    for (const visit of upcomingVisits.rows) {
      // Check if alert already exists for this visit
      const existing = await queryOne<{ id: string }>(
        `SELECT id FROM "Alert" WHERE type = 'appointment' AND "patientId" = $1 AND message LIKE $2`,
        [visit.patientId, `%${visit.id}%`]
      )
      if (!existing) {
        const daysUntil = Math.ceil((new Date(visit.date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        const priority = daysUntil === 0 ? 'urgent' : daysUntil === 1 ? 'high' : 'normal'
        await query(
          `INSERT INTO "Alert" (id, "patientId", title, message, type, priority, date, "isRead", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)`,
          [
            uuid(),
            visit.patientId,
            `موعد جلسة ${visit.sessionTypeName || ''}`,
            `لديك موعد جلسة ${visit.sessionTypeName || ''} للمريض ${visit.patientName || ''} ${daysUntil === 0 ? 'اليوم' : `بعد ${daysUntil} يوم`} - كود الجلسة: ${visit.id}`,
            'appointment',
            priority,
            new Date(visit.date),
            false,
            now,
          ]
        )
        created++
      }
    }

    // 2. Overdue payments
    const overdueVisits = await query<{
      id: string
      patientId: string
      remaining: number
      patientName: string | null
    }>(
      `SELECT v.id, v."patientId", v."remaining", p.name as "patientName"
      FROM "Visit" v
      LEFT JOIN "Patient" p ON v."patientId" = p.id
      WHERE v."remaining" > 0
      LIMIT 10`
    )

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    for (const visit of overdueVisits.rows) {
      const existing = await queryOne<{ id: string }>(
        `SELECT id FROM "Alert" WHERE type = 'payment' AND "patientId" = $1 AND message LIKE $2 AND "createdAt" >= $3`,
        [visit.patientId, `%${visit.id}%`, sevenDaysAgo]
      )
      if (!existing) {
        await query(
          `INSERT INTO "Alert" (id, "patientId", title, message, type, priority, date, "isRead", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)`,
          [
            uuid(),
            visit.patientId,
            `مستحقات مالية - ${visit.patientName || ''}`,
            `المريض ${visit.patientName || ''} عليه مستحقات مالية متأخرة بقيمة ${visit.remaining} ج.م - كود الزيارة: ${visit.id}`,
            'payment',
            visit.remaining > 500 ? 'high' : 'normal',
            now,
            false,
            now,
          ]
        )
        created++
      }
    }

    // 3. Laser packages near completion and expiring packages
    try {
      const nearCompletionPkgs = await query<{
        id: string
        patientId: string
        name: string
        remainingSessions: number
        paid: number
        totalPrice: number
        patientName: string | null
        areaName: string | null
      }>(
        `SELECT lp.id, lp."patientId", lp.name, lp."remainingSessions", lp."paid", lp."totalPrice",
          p.name as "patientName", la.name as "areaName"
        FROM "LaserPackage" lp
        LEFT JOIN "Patient" p ON lp."patientId" = p.id
        LEFT JOIN "LaserArea" la ON lp."areaId" = la.id
        WHERE lp.status = 'active' AND lp."remainingSessions" <= 2 AND lp."remainingSessions" > 0`
      )

      for (const pkg of nearCompletionPkgs.rows) {
        const existing = await queryOne<{ id: string }>(
          `SELECT id FROM "Alert" WHERE type = 'package' AND "patientId" = $1 AND message LIKE $2 AND "createdAt" >= $3`,
          [pkg.patientId, `%${pkg.id}%`, sevenDaysAgo]
        )
        if (!existing) {
          await query(
            `INSERT INTO "Alert" (id, "patientId", title, message, type, priority, date, "isRead", "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)`,
            [
              uuid(),
              pkg.patientId,
              `باقة على وشك الانتهاء - ${pkg.patientName || ''}`,
              `باقة "${pkg.name}" للمريض ${pkg.patientName || ''} متبقي ${pkg.remainingSessions} جلسة فقط (${pkg.areaName || ''}) - إجمالي المدفوع: ${pkg.paid}/${pkg.totalPrice} ج.م`,
              'package',
              pkg.remainingSessions === 1 ? 'high' : 'normal',
              now,
              false,
              now,
            ]
          )
          created++
        }
      }

      // Expiring packages
      const expiringPkgs = await query<{
        id: string
        patientId: string
        name: string
        remainingSessions: number
        patientName: string | null
        areaName: string | null
      }>(
        `SELECT lp.id, lp."patientId", lp.name, lp."remainingSessions",
          p.name as "patientName", la.name as "areaName"
        FROM "LaserPackage" lp
        LEFT JOIN "Patient" p ON lp."patientId" = p.id
        LEFT JOIN "LaserArea" la ON lp."areaId" = la.id
        WHERE lp.status = 'active' AND lp."expiryDate" >= $1 AND lp."expiryDate" <= $2`,
        [startOfDay, in7Days]
      )

      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)

      for (const pkg of expiringPkgs.rows) {
        const existing = await queryOne<{ id: string }>(
          `SELECT id FROM "Alert" WHERE type = 'package' AND "patientId" = $1 AND message LIKE '%تنتهي صلاحية%' AND "createdAt" >= $2`,
          [pkg.patientId, threeDaysAgo]
        )
        if (!existing) {
          await query(
            `INSERT INTO "Alert" (id, "patientId", title, message, type, priority, date, "isRead", "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)`,
            [
              uuid(),
              pkg.patientId,
              `باقة تنتهي قريباً - ${pkg.patientName || ''}`,
              `باقة "${pkg.name}" للمريض ${pkg.patientName || ''} (${pkg.areaName || ''}) تنتهي صلاحيتها قريباً ومتبقي ${pkg.remainingSessions} جلسة - يرجى تنبيه المريض`,
              'package',
              'high',
              now,
              false,
              now,
            ]
          )
          created++
        }
      }
    } catch {
      // laser tables might not exist
    }

    // 4. Follow-up needed (recent completed visits)
    const fortyFiveDaysAgo = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000)

    const followUpVisits = await query<{
      id: string
      patientId: string
      patientName: string | null
    }>(
      `SELECT v.id, v."patientId", p.name as "patientName"
      FROM "Visit" v
      LEFT JOIN "Patient" p ON v."patientId" = p.id
      WHERE v.status = 'completed' AND v."date" >= $1
      ORDER BY v."date" DESC
      LIMIT 5`,
      [fortyFiveDaysAgo]
    )

    for (const visit of followUpVisits.rows) {
      const existing = await queryOne<{ id: string }>(
        `SELECT id FROM "Alert" WHERE type = 'followup' AND "patientId" = $1 AND message LIKE $2 AND "createdAt" >= $3`,
        [visit.patientId, `%${visit.id}%`, threeDaysAgo]
      )
      if (!existing) {
        await query(
          `INSERT INTO "Alert" (id, "patientId", title, message, type, priority, date, "isRead", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)`,
          [
            uuid(),
            visit.patientId,
            `متابعة مطلوبة - ${visit.patientName || ''}`,
            `المريض ${visit.patientName || ''} لديه موعد متابعة قادم - يرجى التواصل لتأكيد الموعد`,
            'followup',
            'normal',
            now,
            false,
            now,
          ]
        )
        created++
      }
    }

    // 5. System alert if no alerts exist
    const totalAlertsRes = await query<{ count: number }>(
      `SELECT COUNT(*)::int as count FROM "Alert"`
    )
    const totalAlerts = totalAlertsRes.rows[0]?.count ?? 0
    if (totalAlerts === 0 && created === 0) {
      await query(
        `INSERT INTO "Alert" (id, title, message, type, priority, date, "isRead", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)`,
        [
          uuid(),
          'مرحباً بك في نظام التنبيهات',
          'هذا هو أول تنبيه في النظام. يمكنك إنشاء تنبيهات ذكية من زر "تنبيهات ذكية" أو إنشاء تنبيه مخصص يدوياً. النظام سيقوم تلقائياً بإنشاء تنبيهات للمواعيد القادمة والمستحقات المالية وباقات الليزر.',
          'system',
          'low',
          now,
          false,
          now,
        ]
      )
      created = 1
    }

    return NextResponse.json({ success: true, created })
  } catch (error) {
    console.error('POST /api/alerts/generate error:', error)
    return NextResponse.json({ error: 'خطأ في إنشاء التنبيهات الذكية' }, { status: 500 })
  }
}
