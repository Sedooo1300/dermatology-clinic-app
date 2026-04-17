import { query, uuid } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

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

export async function POST(req: NextRequest) {
  try {
    await ensureAppUserTable()

    const { pin } = await req.json()
    if (!pin || String(pin).length < 3) {
      return NextResponse.json({ error: 'PIN مطلوب (3 أرقام على الأقل)' }, { status: 400 })
    }
    const result = await query(
      `SELECT * FROM "AppUser" WHERE "pin" = $1 AND "isActive" = true LIMIT 1`,
      [String(pin)]
    )
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'PIN غير صحيح' }, { status: 401 })
    }
    const user = result.rows[0]
    await query(
      `UPDATE "AppUser" SET "lastLogin" = NOW(), "updatedAt" = NOW() WHERE "id" = $1`,
      [user.id]
    )
    return NextResponse.json({
      user: { id: user.id, name: user.name, role: user.role },
      token: Buffer.from(`${user.id}:${Date.now()}`).toString('base64'),
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'خطأ في تسجيل الدخول' }, { status: 500 })
  }
}
