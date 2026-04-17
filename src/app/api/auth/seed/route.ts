import { query, uuid } from '@/lib/db'
import { NextResponse } from 'next/server'

// Ensure AppUser table exists
async function ensureAppUserTable() {
  try {
    await query(`SELECT 1 FROM "AppUser" LIMIT 1`)
  } catch {
    await query(`
      CREATE TABLE IF NOT EXISTS "AppUser" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "role" TEXT NOT NULL DEFAULT 'receptionist',
        "pin" TEXT NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "lastLogin" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
  }
}

export async function POST() {
  try {
    await ensureAppUserTable()

    // Check if any users exist
    const existing = await query(`SELECT COUNT(*) as count FROM "AppUser"`)
    if (existing.rows[0]?.count > 0) {
      return NextResponse.json({ message: 'المستخدمون موجودون بالفعل', seeded: false, hasUsers: true })
    }

    const adminId = uuid()
    const receptionistId = uuid()

    await query(
      `INSERT INTO "AppUser" ("id", "name", "role", "pin", "isActive") VALUES ($1, $2, $3, $4, $5)`,
      [adminId, 'مدير النظام', 'admin', '1234', true]
    )

    await query(
      `INSERT INTO "AppUser" ("id", "name", "role", "pin", "isActive") VALUES ($1, $2, $3, $4, $5)`,
      [receptionistId, 'موظف الاستقبال', 'receptionist', '0000', true]
    )

    return NextResponse.json({
      message: 'تم إنشاء المستخدمين الافتراضيين بنجاح',
      seeded: true,
      hasUsers: true,
      users: [
        { name: 'مدير النظام', role: 'admin', pin: '1234' },
        { name: 'موظف الاستقبال', role: 'receptionist', pin: '0000' },
      ],
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'خطأ في تهيئة المستخدمين' }, { status: 500 })
  }
}

export async function GET() {
  try {
    await ensureAppUserTable()
    const existing = await query(`SELECT COUNT(*) as count FROM "AppUser"`)
    const hasUsers = Number(existing.rows[0]?.count) > 0
    return NextResponse.json({ hasUsers })
  } catch (error) {
    console.error('Seed check error:', error)
    return NextResponse.json({ hasUsers: false })
  }
}
