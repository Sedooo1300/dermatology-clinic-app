import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS "Patient" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "age" INTEGER,
  "gender" TEXT NOT NULL DEFAULT 'male',
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS "SessionType" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "price" REAL NOT NULL DEFAULT 0,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS "Visit" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "patientId" TEXT NOT NULL,
  "sessionTypeId" TEXT,
  "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "price" REAL NOT NULL DEFAULT 0,
  "paid" REAL NOT NULL DEFAULT 0,
  "remaining" REAL NOT NULL DEFAULT 0,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'completed',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Visit_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Visit_sessionTypeId_fkey" FOREIGN KEY ("sessionTypeId") REFERENCES "SessionType" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "Expense" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "category" TEXT NOT NULL,
  "amount" REAL NOT NULL,
  "description" TEXT,
  "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS "Revenue" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "category" TEXT NOT NULL DEFAULT 'sessions',
  "amount" REAL NOT NULL,
  "description" TEXT,
  "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "visitId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS "PatientPhoto" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "patientId" TEXT NOT NULL,
  "visitId" TEXT,
  "type" TEXT NOT NULL DEFAULT 'before',
  "photoUrl" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientPhoto_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "Alert" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "patientId" TEXT,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'reminder',
  "priority" TEXT NOT NULL DEFAULT 'normal',
  "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "snoozedUntil" DATETIME,
  "actionUrl" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Alert_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "LaserMachine" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "wavelength" TEXT,
  "maxFluence" REAL,
  "spotSizes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS "LaserArea" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "malePulses" INTEGER NOT NULL DEFAULT 200,
  "femalePulses" INTEGER NOT NULL DEFAULT 150,
  "pulsePrice" REAL NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS "LaserProfile" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "patientId" TEXT NOT NULL,
  "skinType" TEXT NOT NULL,
  "hairColor" TEXT,
  "hairThickness" TEXT,
  "skinSensitivity" TEXT,
  "hormonalConditions" TEXT,
  "contraindications" TEXT,
  "previousTreatments" TEXT,
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "LaserProfile_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "LaserSession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "profileId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "machineId" TEXT NOT NULL,
  "areaId" TEXT NOT NULL,
  "packageId" TEXT,
  "sessionNumber" INTEGER NOT NULL DEFAULT 1,
  "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fluence" REAL NOT NULL,
  "pulseWidth" REAL NOT NULL,
  "spotSize" REAL NOT NULL,
  "cooling" TEXT,
  "pulsesUsed" INTEGER NOT NULL DEFAULT 0,
  "pulsesPerSecond" INTEGER,
  "paymentMode" TEXT NOT NULL DEFAULT 'pulse',
  "pulsePrice" REAL NOT NULL DEFAULT 0,
  "totalAmount" REAL NOT NULL DEFAULT 0,
  "paid" REAL NOT NULL DEFAULT 0,
  "remaining" REAL NOT NULL DEFAULT 0,
  "painLevel" INTEGER,
  "hairReduction" REAL,
  "sideEffects" TEXT,
  "skinReaction" TEXT,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'completed',
  "nextSessionDate" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "LaserSession_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "LaserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LaserSession_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "LaserMachine" ("id") ON UPDATE CASCADE,
  CONSTRAINT "LaserSession_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "LaserArea" ("id") ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "LaserPackage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "profileId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "areaId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "totalSessions" INTEGER NOT NULL,
  "totalPulses" INTEGER NOT NULL DEFAULT 0,
  "usedSessions" INTEGER NOT NULL DEFAULT 0,
  "usedPulses" INTEGER NOT NULL DEFAULT 0,
  "remainingSessions" INTEGER NOT NULL,
  "remainingPulses" INTEGER NOT NULL DEFAULT 0,
  "totalPrice" REAL NOT NULL,
  "paid" REAL NOT NULL DEFAULT 0,
  "remaining" REAL NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'active',
  "purchaseDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiryDate" DATETIME,
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "LaserPackage_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "LaserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LaserPackage_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "LaserArea" ("id") ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "LaserRevenue" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "patientId" TEXT,
  "sessionId" TEXT,
  "packageId" TEXT,
  "type" TEXT NOT NULL DEFAULT 'session',
  "amount" REAL NOT NULL,
  "description" TEXT,
  "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "LaserTreatment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "visitId" TEXT NOT NULL,
  "area" TEXT NOT NULL,
  "skinType" TEXT,
  "hairColor" TEXT,
  "skinSensitivity" TEXT,
  "fluence" TEXT,
  "pulseWidth" TEXT,
  "spotSize" TEXT,
  "coolingType" TEXT,
  "painLevel" INTEGER,
  "progress" TEXT,
  "sessionsDone" INTEGER NOT NULL DEFAULT 0,
  "sessionsTotal" INTEGER NOT NULL DEFAULT 0,
  "nextSessionDate" DATETIME,
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "LaserTreatment_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "Prescription" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "patientId" TEXT NOT NULL,
  "visitId" TEXT,
  "diagnosis" TEXT,
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Prescription_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Prescription_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "PrescriptionItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "prescriptionId" TEXT NOT NULL,
  "medicineName" TEXT NOT NULL,
  "dosage" TEXT,
  "frequency" TEXT,
  "duration" TEXT,
  "instructions" TEXT,
  "quantity" INTEGER,
  CONSTRAINT "PrescriptionItem_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "Diagnosis" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "patientId" TEXT NOT NULL,
  "visitId" TEXT,
  "condition" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'mild',
  "bodyArea" TEXT,
  "icdCode" TEXT,
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Diagnosis_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Diagnosis_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "QueueEntry" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "patientId" TEXT NOT NULL,
  "patientName" TEXT NOT NULL,
  "visitType" TEXT,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'waiting',
  "priority" TEXT NOT NULL DEFAULT 'normal',
  "arrivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" DATETIME,
  "completedAt" DATETIME,
  "order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "QueueEntry_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "Backup" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "data" TEXT NOT NULL,
  "size" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`

export function getDbUrl(): string {
  return process.env.DATABASE_URL
    || process.env.STORAGE_URL
    || process.env.POSTGRES_URL
    || ''
}

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

    const result = await db.$queryRawUnsafe(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
    )

    const tablesExist = Array.isArray(result) && result.length > 0

    if (tablesExist) {
      return NextResponse.json({
        status: 'ready',
        message: 'Database tables exist',
        tableCount: result.length,
      })
    }

    return NextResponse.json({
      status: 'needs_setup',
      message: 'Tables need to be created. POST to /api/setup',
    })
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: error.message,
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

    const statements = CREATE_TABLES_SQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    const created: string[] = []

    for (const sql of statements) {
      try {
        await db.$executeRawUnsafe(sql)
        const tableName = sql.match(/CREATE TABLE IF NOT EXISTS "(\w+)"/)?.[1]
        if (tableName) created.push(tableName)
      } catch (err: any) {
        if (!err.message?.includes('already exists')) {
          console.error(`Error creating table: ${err.message}`)
        }
      }
    }

    const tables = await db.$queryRawUnsafe(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
    )

    return NextResponse.json({
      status: 'success',
      message: 'Database initialized!',
      tablesCreated: created.length,
      totalTables: Array.isArray(tables) ? tables.length : 0,
    })
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: error.message,
    }, { status: 500 })
  }
}
