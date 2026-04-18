import { Pool, QueryResult, QueryResultRow } from 'pg'

const globalForPg = globalThis as unknown as {
  pool: Pool | undefined
}

const pool = globalForPg.pool ?? new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.STORAGE_URL || '',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

if (process.env.NODE_ENV !== 'production') globalForPg.pool = pool

export { pool }

export async function query<T extends QueryResultRow = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now()
  const result = await pool.query<T>(text, params)
  const duration = Date.now() - start
  if (duration > 500) {
    console.log(`Slow query (${duration}ms): ${text.substring(0, 100)}`)
  }
  return result
}

export async function queryOne<T extends QueryResultRow = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const result = await query<T>(text, params)
  return result.rows[0] || null
}

export function getDbUrl(): string {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.STORAGE_URL || ''
}

export function uuid(): string {
  return crypto.randomUUID()
}

// Auto-setup tables on first connection
let setupDone = false
export async function ensureSetup(): Promise<boolean> {
  if (setupDone) return true
  try {
    const url = getDbUrl()
    if (!url) return false
    const res = await query(`SELECT COUNT(*) as count FROM pg_tables WHERE schemaname = 'public'`)
    if (res.rows[0]?.count > 0) {
      setupDone = true
      return true
    }
  } catch {
    // Table doesn't exist yet, will be created
  }
  return false
}

// SQL to create all tables
export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS "Patient" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "age" INTEGER,
  "gender" TEXT NOT NULL DEFAULT 'male',
  "address" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "SessionType" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "price" REAL NOT NULL DEFAULT 0,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Visit" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "patientId" TEXT NOT NULL,
  "sessionTypeId" TEXT,
  "date" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "price" REAL NOT NULL DEFAULT 0,
  "paid" REAL NOT NULL DEFAULT 0,
  "remaining" REAL NOT NULL DEFAULT 0,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'completed',
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Visit_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Visit_sessionTypeId_fkey" FOREIGN KEY ("sessionTypeId") REFERENCES "SessionType" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Expense" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "category" TEXT NOT NULL,
  "amount" REAL NOT NULL,
  "description" TEXT,
  "date" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Revenue" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "category" TEXT NOT NULL DEFAULT 'sessions',
  "amount" REAL NOT NULL,
  "description" TEXT,
  "date" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "visitId" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "PatientPhoto" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "patientId" TEXT NOT NULL,
  "visitId" TEXT,
  "type" TEXT NOT NULL DEFAULT 'before',
  "photoUrl" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientPhoto_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Alert" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "patientId" TEXT,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'reminder',
  "priority" TEXT NOT NULL DEFAULT 'normal',
  "date" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "snoozedUntil" TIMESTAMP,
  "actionUrl" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "LaserArea" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "malePulses" INTEGER NOT NULL DEFAULT 200,
  "femalePulses" INTEGER NOT NULL DEFAULT 150,
  "pulsePrice" REAL NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
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
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LaserProfile_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LaserProfile_patientId_key" UNIQUE ("patientId")
);

CREATE TABLE IF NOT EXISTS "LaserSession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "profileId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "machineId" TEXT NOT NULL,
  "areaId" TEXT NOT NULL,
  "packageId" TEXT,
  "sessionNumber" INTEGER NOT NULL DEFAULT 1,
  "date" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fluence" REAL NOT NULL,
  "pulseWidth" REAL NOT NULL DEFAULT 0,
  "spotSize" REAL NOT NULL DEFAULT 0,
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
  "nextSessionDate" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
  "purchaseDate" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiryDate" TIMESTAMP,
  "notes" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
  "date" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
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
  "nextSessionDate" TIMESTAMP,
  "notes" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LaserTreatment_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Prescription" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "patientId" TEXT NOT NULL,
  "visitId" TEXT,
  "diagnosis" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
  "arrivedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP,
  "completedAt" TIMESTAMP,
  "order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "QueueEntry_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Backup" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "data" TEXT NOT NULL,
  "size" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "PatientNote" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "patientId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'general',
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientNote_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "AppUser" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'receptionist',
  "pin" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastLogin" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Message" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "patientId" TEXT,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'whatsapp',
  "template" TEXT,
  "content" TEXT NOT NULL,
  "phone" TEXT,
  "status" TEXT NOT NULL DEFAULT 'sent',
  "scheduledAt" TIMESTAMP,
  "sentAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser" ("id") ON UPDATE CASCADE,
  CONSTRAINT "Message_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
`

export async function setupDatabase(): Promise<{ created: string[]; totalTables: number }> {
  const statements = CREATE_TABLES_SQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && s.startsWith('CREATE'))

  const created: string[] = []

  for (const sql of statements) {
    try {
      await pool.query(sql)
      const tableName = sql.match(/CREATE TABLE IF NOT EXISTS "(\w+)"/)?.[1]
      if (tableName) created.push(tableName)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.includes('already exists')) {
        console.error(`Error creating table: ${msg}`)
      }
    }
  }

  // Run migrations: add address column to Patient if missing
  try {
    await pool.query(`ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "address" TEXT`)
  } catch {
    // ignore
  }

  const tables = await pool.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`)
  setupDone = true

  return {
    created,
    totalTables: tables.rows.length,
  }
}
