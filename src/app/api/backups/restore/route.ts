import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { data } = await req.json()

    if (!data) {
      return NextResponse.json({ error: 'Backup data required' }, { status: 400 })
    }

    const results: Record<string, number> = {}

    // Restore patients
    if (data.patients && Array.isArray(data.patients)) {
      await db.patient.deleteMany({})
      for (const p of data.patients) {
        await db.patient.create({
          data: {
            id: p.id,
            name: p.name,
            phone: p.phone || null,
            age: p.age || null,
            gender: p.gender || 'male',
            notes: p.notes || null,
            createdAt: new Date(p.createdAt),
          },
        })
      }
      results.patients = data.patients.length
    }

    // Restore session types
    if (data.sessionTypes && Array.isArray(data.sessionTypes)) {
      await db.sessionType.deleteMany({})
      for (const st of data.sessionTypes) {
        await db.sessionType.create({
          data: {
            id: st.id,
            name: st.name,
            price: st.price || 0,
            description: st.description || null,
            isActive: st.isActive !== false,
            createdAt: new Date(st.createdAt),
          },
        })
      }
      results.sessionTypes = data.sessionTypes.length
    }

    // Restore visits
    if (data.visits && Array.isArray(data.visits)) {
      await db.visit.deleteMany({})
      for (const v of data.visits) {
        await db.visit.create({
          data: {
            id: v.id,
            patientId: v.patientId,
            sessionTypeId: v.sessionTypeId || null,
            date: new Date(v.date),
            price: v.price || 0,
            paid: v.paid || 0,
            remaining: v.remaining || 0,
            notes: v.notes || null,
            status: v.status || 'completed',
            createdAt: new Date(v.createdAt),
          },
        })
      }
      results.visits = data.visits.length
    }

    // Restore expenses
    if (data.expenses && Array.isArray(data.expenses)) {
      await db.expense.deleteMany({})
      for (const e of data.expenses) {
        await db.expense.create({
          data: {
            id: e.id,
            category: e.category,
            amount: e.amount,
            description: e.description || null,
            date: new Date(e.date),
            createdAt: new Date(e.createdAt),
          },
        })
      }
      results.expenses = data.expenses.length
    }

    // Restore revenues
    if (data.revenues && Array.isArray(data.revenues)) {
      await db.revenue.deleteMany({})
      for (const r of data.revenues) {
        await db.revenue.create({
          data: {
            id: r.id,
            category: r.category || 'sessions',
            amount: r.amount,
            description: r.description || null,
            date: new Date(r.date),
            visitId: r.visitId || null,
            createdAt: new Date(r.createdAt),
          },
        })
      }
      results.revenues = data.revenues.length
    }

    return NextResponse.json({ success: true, restored: results })
  } catch (error) {
    console.error('Failed to restore backup:', error)
    return NextResponse.json({ error: 'Failed to restore' }, { status: 500 })
  }
}
