import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Support multiple env var names (Vercel Storage uses different names)
function getDatabaseUrl(): string {
  return process.env.DATABASE_URL
    || process.env.STORAGE_URL
    || process.env.POSTGRES_URL
    || ''
}

function getDirectUrl(): string {
  return process.env.DIRECT_URL
    || process.env.STORAGE_URL_DIRECT
    || process.env.STORAGE_URL_NON_POOLING
    || process.env.POSTGRES_URL_NON_POOLING
    || ''
}

function createPrismaClient() {
  const databaseUrl = getDatabaseUrl()
  const directUrl = getDirectUrl()

  if (!databaseUrl) {
    console.warn('[DB] No DATABASE_URL found. Available env vars with "URL" or "DB":')
    Object.keys(process.env).forEach(key => {
      if (key.includes('URL') || key.includes('DB') || key.includes('DATABASE') || key.includes('POSTGRES')) {
        console.warn(`  ${key}=${process.env[key]?.substring(0, 30)}...`)
      }
    })
  }

  return new PrismaClient({
    log: process.env.NODE_ENV !== 'production' ? ['query'] : [],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

export { getDatabaseUrl, getDirectUrl }
