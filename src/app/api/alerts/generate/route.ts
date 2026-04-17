import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    let created = 0

    // 1. Upcoming appointments (scheduled visits in next 3 days)
    const upcomingVisits = await db.visit.findMany({
      where: {
        date: { gte: startOfDay, lte: in3Days },
        status: 'scheduled',
      },
      include: {
        patient: { select: { id: true, name: true } },
        sessionType: { select: { name: true } },
      },
    })

    for (const visit of upcomingVisits) {
      // Check if alert already exists for this visit
      const existing = await db.alert.findFirst({
        where: {
          type: 'appointment',
          patientId: visit.patientId,
          message: { contains: visit.id },
        },
      })
      if (!existing) {
        const daysUntil = Math.ceil((visit.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        const priority = daysUntil === 0 ? 'urgent' : daysUntil === 1 ? 'high' : 'normal'
        await db.alert.create({
          data: {
            patientId: visit.patientId,
            title: `موعد جلسة ${visit.sessionType?.name || ''}`,
            message: `لديك موعد جلسة ${visit.sessionType?.name || ''} للمريض ${visit.patient.name} ${daysUntil === 0 ? 'اليوم' : `بعد ${daysUntil} يوم`} - كود الجلسة: ${visit.id}`,
            type: 'appointment',
            priority,
            date: visit.date,
            isRead: false,
          },
        })
        created++
      }
    }

    // 2. Overdue payments
    const overdueVisits = await db.visit.findMany({
      where: { remaining: { gt: 0 } },
      include: { patient: { select: { id: true, name: true } } },
      take: 10,
    })

    for (const visit of overdueVisits) {
      const existing = await db.alert.findFirst({
        where: {
          type: 'payment',
          patientId: visit.patientId,
          message: { contains: visit.id },
          createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
        },
      })
      if (!existing) {
        await db.alert.create({
          data: {
            patientId: visit.patientId,
            title: `مستحقات مالية - ${visit.patient.name}`,
            message: `المريض ${visit.patient.name} عليه مستحقات مالية متأخرة بقيمة ${visit.remaining} ج.م - كود الزيارة: ${visit.id}`,
            type: 'payment',
            priority: visit.remaining > 500 ? 'high' : 'normal',
            date: now,
            isRead: false,
          },
        })
        created++
      }
    }

    // 3. Laser packages near completion
    try {
      const nearCompletionPkgs = await db.laserPackage.findMany({
        where: {
          status: 'active',
          remainingSessions: { lte: 2, gt: 0 },
        },
        include: {
          patient: { select: { id: true, name: true } },
          area: { select: { name: true } },
        },
      })

      for (const pkg of nearCompletionPkgs) {
        const existing = await db.alert.findFirst({
          where: {
            type: 'package',
            patientId: pkg.patientId,
            message: { contains: pkg.id },
            createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
          },
        })
        if (!existing) {
          await db.alert.create({
            data: {
              patientId: pkg.patientId,
              title: `باقة على وشك الانتهاء - ${pkg.patient.name}`,
              message: `باقة "${pkg.name}" للمريض ${pkg.patient.name} متبقي ${pkg.remainingSessions} جلسة فقط (${pkg.area?.name || ''}) - إجمالي المدفوع: ${pkg.paid}/${pkg.totalPrice} ج.م`,
              type: 'package',
              priority: pkg.remainingSessions === 1 ? 'high' : 'normal',
              date: now,
              isRead: false,
            },
          })
          created++
        }
      }

      // Expiring packages
      const expiringPkgs = await db.laserPackage.findMany({
        where: {
          status: 'active',
          expiryDate: { lte: in7Days, gte: startOfDay },
        },
        include: {
          patient: { select: { id: true, name: true } },
          area: { select: { name: true } },
        },
      })

      for (const pkg of expiringPkgs) {
        const existing = await db.alert.findFirst({
          where: {
            type: 'package',
            patientId: pkg.patientId,
            message: { contains: 'تنتهي صلاحية' },
            createdAt: { gte: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) },
          },
        })
        if (!existing) {
          await db.alert.create({
            data: {
              patientId: pkg.patientId,
              title: `باقة تنتهي قريباً - ${pkg.patient.name}`,
              message: `باقة "${pkg.name}" للمريض ${pkg.patient.name} ({pkg.area?.name || ''}) تنتهي صلاحيتها قريباً ومتبقي ${pkg.remainingSessions} جلسة - يرجى تنبيه المريض`,
              type: 'package',
              priority: 'high',
              date: now,
              isRead: false,
            },
          })
          created++
        }
      }
    } catch { /* laser tables might not exist */ }

    // 4. Follow-up needed (recent completed visits that may need follow-up)
    const followUpVisits = await db.visit.findMany({
      where: {
        status: 'completed',
        date: { gte: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000) },
      },
      include: { patient: { select: { id: true, name: true } } },
      take: 5,
      orderBy: { date: 'desc' },
    })

    for (const visit of followUpVisits) {
      const existing = await db.alert.findFirst({
        where: {
          type: 'followup',
          patientId: visit.patientId,
          message: { contains: visit.id },
          createdAt: { gte: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) },
        },
      })
      if (!existing) {
        await db.alert.create({
          data: {
            patientId: visit.patientId,
            title: `متابعة مطلوبة - ${visit.patient.name}`,
            message: `المريض ${visit.patient.name} لديه موعد متابعة قادم - يرجى التواصل لتأكيد الموعد`,
            type: 'followup',
            priority: 'normal',
            date: now,
            isRead: false,
          },
        })
        created++
      }
    }

    // 5. System alert if no alerts exist
    const totalAlerts = await db.alert.count()
    if (totalAlerts === 0 && created === 0) {
      await db.alert.create({
        data: {
          title: 'مرحباً بك في نظام التنبيهات',
          message: 'هذا هو أول تنبيه في النظام. يمكنك إنشاء تنبيهات ذكية من زر "تنبيهات ذكية" أو إنشاء تنبيه مخصص يدوياً. النظام سيقوم تلقائياً بإنشاء تنبيهات للمواعيد القادمة والمستحقات المالية وباقات الليزر.',
          type: 'system',
          priority: 'low',
          date: now,
          isRead: false,
        },
      })
      created = 1
    }

    return NextResponse.json({ success: true, created })
  } catch (error) {
    console.error('POST /api/alerts/generate error:', error)
    return NextResponse.json({ error: 'خطأ في إنشاء التنبيهات الذكية' }, { status: 500 })
  }
}
