import { query, uuid } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const result = await query(`SELECT * FROM "Backup" ORDER BY "createdAt" DESC`, [])
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('GET /api/backups error:', error)
    return NextResponse.json({ error: 'Failed to fetch backups' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, data } = body

    if (!name || !data) {
      return NextResponse.json({ error: 'Backup name and data are required' }, { status: 400 })
    }

    const jsonString = typeof data === 'string' ? data : JSON.stringify(data)
    const size = new TextEncoder().encode(jsonString).length

    const result = await query(
      `INSERT INTO "Backup" ("id", "name", "data", "size", "createdAt")
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [uuid(), name.trim(), jsonString, size]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error('POST /api/backups error:', error)
    return NextResponse.json({ error: 'Failed to create backup' }, { status: 500 })
  }
}
