import { query } from '@/lib/db'
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
      await query(`DELETE FROM "Patient"`)
      for (const p of data.patients) {
        await query(
          `INSERT INTO "Patient" ("id", "name", "phone", "age", "gender", "notes", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [p.id, p.name, p.phone || null, p.age || null, p.gender || 'male', p.notes || null, new Date(p.createdAt)]
        )
      }
      results.patients = data.patients.length
    }

    // Restore session types
    if (data.sessionTypes && Array.isArray(data.sessionTypes)) {
      await query(`DELETE FROM "SessionType"`)
      for (const st of data.sessionTypes) {
        await query(
          `INSERT INTO "SessionType" ("id", "name", "price", "description", "isActive", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [st.id, st.name, st.price || 0, st.description || null, st.isActive !== false, new Date(st.createdAt)]
        )
      }
      results.sessionTypes = data.sessionTypes.length
    }

    // Restore visits
    if (data.visits && Array.isArray(data.visits)) {
      await query(`DELETE FROM "Visit"`)
      for (const v of data.visits) {
        await query(
          `INSERT INTO "Visit" ("id", "patientId", "sessionTypeId", "date", "price", "paid", "remaining", "notes", "status", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
          [
            v.id,
            v.patientId,
            v.sessionTypeId || null,
            new Date(v.date),
            v.price || 0,
            v.paid || 0,
            v.remaining || 0,
            v.notes || null,
            v.status || 'completed',
            new Date(v.createdAt),
          ]
        )
      }
      results.visits = data.visits.length
    }

    // Restore expenses
    if (data.expenses && Array.isArray(data.expenses)) {
      await query(`DELETE FROM "Expense"`)
      for (const e of data.expenses) {
        await query(
          `INSERT INTO "Expense" ("id", "category", "amount", "description", "date", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [e.id, e.category, e.amount, e.description || null, new Date(e.date), new Date(e.createdAt)]
        )
      }
      results.expenses = data.expenses.length
    }

    // Restore revenues
    if (data.revenues && Array.isArray(data.revenues)) {
      await query(`DELETE FROM "Revenue"`)
      for (const r of data.revenues) {
        await query(
          `INSERT INTO "Revenue" ("id", "category", "amount", "description", "date", "visitId", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [r.id, r.category || 'sessions', r.amount, r.description || null, new Date(r.date), r.visitId || null, new Date(r.createdAt)]
        )
      }
      results.revenues = data.revenues.length
    }

    return NextResponse.json({ success: true, restored: results })
  } catch (error) {
    console.error('Failed to restore backup:', error)
    return NextResponse.json({ error: 'Failed to restore' }, { status: 500 })
  }
}
