import { query, uuid } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const result = await query(
      `SELECT "id", "name", "role", "isActive", "lastLogin", "createdAt" FROM "AppUser" ORDER BY "createdAt" ASC`
    )
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json({ error: 'خطأ في جلب المستخدمين' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, role, pin, currentUserId, currentUserRole } = await req.json()

    if (!name || !pin || !role) {
      return NextResponse.json({ error: 'جميع الحقول مطلوبة' }, { status: 400 })
    }

    if (String(pin).length < 3) {
      return NextResponse.json({ error: 'PIN يجب أن يكون 3 أرقام على الأقل' }, { status: 400 })
    }

    const validRoles = ['admin', 'receptionist', 'doctor', 'nurse']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'دور غير صالح' }, { status: 400 })
    }

    // Only admin can create admin users
    if (role === 'admin' && currentUserRole !== 'admin') {
      return NextResponse.json({ error: 'فقط المدير يمكنه إنشاء مستخدمين بإدارة' }, { status: 403 })
    }

    // Check for duplicate PIN
    const existingPin = await query(`SELECT "id" FROM "AppUser" WHERE "pin" = $1 LIMIT 1`, [String(pin)])
    if (existingPin.rows.length > 0) {
      return NextResponse.json({ error: 'PIN مستخدم بالفعل' }, { status: 409 })
    }

    const id = uuid()
    await query(
      `INSERT INTO "AppUser" ("id", "name", "role", "pin", "isActive") VALUES ($1, $2, $3, $4, $5)`,
      [id, name, role, String(pin), true]
    )

    return NextResponse.json({
      message: 'تم إنشاء المستخدم بنجاح',
      user: { id, name, role, isActive: true },
    })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json({ error: 'خطأ في إنشاء المستخدم' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, name, role, pin, isActive, currentUserId, currentUserRole } = await req.json()

    if (!id) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 })
    }

    // Non-admin cannot modify admin users
    if (currentUserRole !== 'admin') {
      const targetUser = await query(`SELECT "role" FROM "AppUser" WHERE "id" = $1`, [id])
      if (targetUser.rows.length > 0 && targetUser.rows[0].role === 'admin') {
        return NextResponse.json({ error: 'غير مصرح بتعديل هذا المستخدم' }, { status: 403 })
      }
    }

    // Only admin can change role to admin
    if (role === 'admin' && currentUserRole !== 'admin') {
      return NextResponse.json({ error: 'فقط المدير يمكنه تعيين دور الإدارة' }, { status: 403 })
    }

    // If changing PIN, check for duplicates
    if (pin) {
      const existingPin = await query(`SELECT "id" FROM "AppUser" WHERE "pin" = $1 AND "id" != $2 LIMIT 1`, [String(pin), id])
      if (existingPin.rows.length > 0) {
        return NextResponse.json({ error: 'PIN مستخدم بالفعل' }, { status: 409 })
      }
    }

    const updates: string[] = []
    const params: unknown[] = []
    let paramIndex = 1

    if (name) {
      updates.push(`"name" = $${paramIndex++}`)
      params.push(name)
    }
    if (role) {
      updates.push(`"role" = $${paramIndex++}`)
      params.push(role)
    }
    if (pin) {
      updates.push(`"pin" = $${paramIndex++}`)
      params.push(String(pin))
    }
    if (typeof isActive === 'boolean') {
      updates.push(`"isActive" = $${paramIndex++}`)
      params.push(isActive)
    }

    updates.push(`"updatedAt" = NOW()`)
    params.push(id)

    await query(
      `UPDATE "AppUser" SET ${updates.join(', ')} WHERE "id" = $${paramIndex}`,
      params
    )

    return NextResponse.json({ message: 'تم تحديث المستخدم بنجاح' })
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json({ error: 'خطأ في تحديث المستخدم' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const currentUserId = req.headers.get('x-current-user-id')
    const currentUserRole = req.headers.get('x-current-user-role')

    if (!id) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 })
    }

    // Cannot delete yourself
    if (id === currentUserId) {
      return NextResponse.json({ error: 'لا يمكنك حذف حسابك' }, { status: 400 })
    }

    // Only admin can delete users
    if (currentUserRole !== 'admin') {
      return NextResponse.json({ error: 'غير مصرح بحذف المستخدمين' }, { status: 403 })
    }

    // Check if target is admin (only admin can delete admin)
    const targetUser = await query(`SELECT "role" FROM "AppUser" WHERE "id" = $1`, [id])
    if (targetUser.rows.length === 0) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 })
    }

    await query(`DELETE FROM "AppUser" WHERE "id" = $1`, [id])

    return NextResponse.json({ message: 'تم حذف المستخدم بنجاح' })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json({ error: 'خطأ في حذف المستخدم' }, { status: 500 })
  }
}
