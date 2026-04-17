import { NextResponse } from 'next/server'

export async function GET() {
  const relevant = Object.entries(process.env)
    .filter(([key]) =>
      key.includes('URL') || key.includes('DB') || key.includes('DATABASE') ||
      key.includes('POSTGRES') || key.includes('STORAGE') || key.includes('NEON')
    )
    .map(([key, val]) => ({
      key,
      value: val ? `${val.substring(0, 25)}...${val.substring(val.length - 8)}` : '(empty)',
    }))

  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV,
    relevantEnvVars: relevant,
    hasDatabaseUrl: !!(process.env.DATABASE_URL || process.env.STORAGE_URL || process.env.POSTGRES_URL),
  })
}
