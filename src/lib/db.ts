import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  try {
    return new PrismaClient({
      log: process.env.NODE_ENV !== 'production' ? ['query'] : [],
    })
  } catch (error) {
    console.error('Failed to create Prisma client:', error)
    // Return a proxy that gives meaningful errors
    return new Proxy({} as PrismaClient, {
      get(_target, prop) {
        if (prop === '$connect' || prop === '$disconnect' || prop === '$transaction') {
          return async () => {
            throw new Error('DATABASE_URL is not configured. Please set DATABASE_URL and DIRECT_URL environment variables in Vercel Dashboard → Settings → Environment Variables')
          }
        }
        // For any model access (db.patient, db.visit, etc.)
        return new Proxy({}, {
          get() {
            return async (..._args: any[]) => {
              throw new Error('DATABASE_URL is not configured. Please set DATABASE_URL and DIRECT_URL environment variables in Vercel Dashboard → Settings → Environment Variables')
            }
          }
        })
      }
    })
  }
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
