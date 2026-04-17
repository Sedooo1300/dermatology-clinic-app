import { query, getDbUrl, setupDatabase } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const dbUrl = getDbUrl()
    if (!dbUrl) {
      // List available env vars for debugging
      const available = Object.keys(process.env).filter(k =>
        k.includes('URL') || k.includes('DB') || k.includes('DATABASE') || k.includes('POSTGRES') || k.includes('STORAGE')
      )
      return NextResponse.json({
        status: 'no_database',
        message: 'DATABASE_URL is not configured',
        availableEnvVars: available,
      }, { status: 503 })
    }

    const result = await query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
    )

    const tablesExist = result.rows.length > 0

    if (tablesExist) {
      return NextResponse.json({
        status: 'ready',
        message: 'Database tables exist',
        tableCount: result.rows.length,
      })
    }

    return NextResponse.json({
      status: 'needs_setup',
      message: 'Tables need to be created. POST to /api/setup',
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({
      status: 'error',
      message,
    }, { status: 500 })
  }
}

export async function POST() {
  try {
    if (!getDbUrl()) {
      return NextResponse.json({
        status: 'error',
        message: 'DATABASE_URL is not set',
      }, { status: 503 })
    }

    const { created, totalTables } = await setupDatabase()

    return NextResponse.json({
      status: 'success',
      message: 'Database initialized!',
      tablesCreated: created.length,
      totalTables,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({
      status: 'error',
      message,
    }, { status: 500 })
  }
}
