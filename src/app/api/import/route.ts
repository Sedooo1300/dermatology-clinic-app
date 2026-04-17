import { query, uuid } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

type ImportEntity = 'patients' | 'visits' | 'sessionTypes' | 'expenses' | 'revenues'

interface ImportRequest {
  entityType: ImportEntity
  data: Record<string, unknown>[]
  mode: 'replace' | 'merge' | 'add'
  skipErrors?: boolean
}

// Column mapping: maps various column names (Arabic/English) to database columns
const PATIENT_FIELD_MAP: Record<string, string> = {
  'name': 'name', 'patient_name': 'name', 'patientname': 'name', 'full_name': 'name', 'fullname': 'name',
  'phone': 'phone', 'mobile': 'phone', 'telephone': 'phone', 'phone_number': 'phone', 'phonenumber': 'phone', 'tel': 'phone',
  'age': 'age', 'patient_age': 'age', 'patientage': 'age',
  'gender': 'gender', 'sex': 'gender',
  'notes': 'notes', 'note': 'notes', 'remark': 'notes',
  'الاسم': 'name', 'اسم المريض': 'name', 'اسم': 'name', 'الاسم بالكامل': 'name',
  'الموبايل': 'phone', 'رقم الموبايل': 'phone', 'التليفون': 'phone', 'الهاتف': 'phone', 'رقم الهاتف': 'phone', 'تليفون': 'phone',
  'العمر': 'age', 'سن': 'age', 'السن': 'age',
  'الجنس': 'gender', 'النوع': 'gender',
  'ملاحظات': 'notes', 'وصف': 'notes',
}

const VISIT_FIELD_MAP: Record<string, string> = {
  'patient_id': 'patientId', 'patientid': 'patientId', 'patient': 'patientId',
  'patient_name': 'patientName', 'patientname': 'patientName',
  'session_type_id': 'sessionTypeId', 'sessiontypeid': 'sessionTypeId', 'session_type': 'sessionTypeId', 'type': 'sessionTypeId',
  'session_name': 'sessionName', 'sessionname': 'sessionName',
  'date': 'date', 'visit_date': 'date', 'visitdate': 'date',
  'price': 'price', 'cost': 'price', 'amount': 'price', 'total': 'price',
  'paid': 'paid', 'payment': 'paid',
  'remaining': 'remaining', 'due': 'remaining', 'balance': 'remaining',
  'notes': 'notes', 'note': 'notes',
  'status': 'status', 'case_status': 'status',
  'التاريخ': 'date', 'تاريخ': 'date',
  'السعر': 'price', 'المبلغ': 'price', 'الإجمالي': 'price', 'التكلفة': 'price',
  'المدفوع': 'paid', 'المحصل': 'paid',
  'المتبقي': 'remaining', 'الباقي': 'remaining',
  'ملاحظات': 'notes', 'الحالة': 'status',
}

const SESSION_TYPE_FIELD_MAP: Record<string, string> = {
  'name': 'name', 'session_name': 'name', 'sessionname': 'name', 'type': 'name', 'type_name': 'name', 'typename': 'name',
  'price': 'price', 'cost': 'price', 'amount': 'price',
  'description': 'description', 'desc': 'description', 'details': 'description',
  'is_active': 'isActive', 'isactive': 'isActive', 'active': 'isActive', 'status': 'isActive',
  'السعر': 'price', 'المبلغ': 'price',
  'الوصف': 'description', 'تفاصيل': 'description', 'وصف': 'description',
  'مفعل': 'isActive', 'نشط': 'isActive',
}

const EXPENSE_FIELD_MAP: Record<string, string> = {
  'category': 'category', 'type': 'category',
  'amount': 'amount', 'price': 'amount', 'cost': 'amount', 'value': 'amount',
  'description': 'description', 'desc': 'description', 'details': 'description', 'notes': 'description',
  'date': 'date', 'expense_date': 'date',
  'التصنيف': 'category', 'النوع': 'category', 'الفئة': 'category',
  'المبلغ': 'amount', 'السعر': 'amount', 'القيمة': 'amount',
  'الوصف': 'description', 'ملاحظات': 'description', 'تفاصيل': 'description',
  'التاريخ': 'date', 'تاريخ': 'date',
}

const REVENUE_FIELD_MAP: Record<string, string> = {
  'category': 'category', 'type': 'category', 'source': 'category',
  'amount': 'amount', 'price': 'amount', 'value': 'amount', 'total': 'amount',
  'description': 'description', 'desc': 'description', 'details': 'description', 'notes': 'description',
  'date': 'date', 'revenue_date': 'date',
  'visit_id': 'visitId', 'visitid': 'visitId',
  'التصنيف': 'category', 'النوع': 'category', 'المصدر': 'category',
  'المبلغ': 'amount', 'السعر': 'amount', 'القيمة': 'amount', 'الإيراد': 'amount', 'الدخل': 'amount',
  'الوصف': 'description', 'ملاحظات': 'description',
  'التاريخ': 'date', 'تاريخ': 'date',
}

function mapRow(row: Record<string, unknown>, fieldMap: Record<string, string>): Record<string, unknown> {
  const mapped: Record<string, unknown> = {}
  const lowerRow: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(row)) {
    lowerRow[key.toLowerCase().trim()] = value
    lowerRow[key.trim()] = value
  }

  for (const [col, dbField] of Object.entries(fieldMap)) {
    if (dbField in mapped) continue
    if (col in row) mapped[dbField] = row[col]
    else if (col.toLowerCase() in lowerRow) mapped[dbField] = lowerRow[col.toLowerCase()]
    else if (col in lowerRow) mapped[dbField] = lowerRow[col]
  }

  for (const [key, value] of Object.entries(row)) {
    if (key in fieldMap || key.toLowerCase() in fieldMap) continue
    mapped[key] = value
  }

  return mapped
}

function normalizeGender(val: unknown): string {
  if (!val) return 'male'
  const s = String(val).toLowerCase().trim()
  if (['female', 'f', '\u0623\u0646\u062b\u0649', '\u0627\u0646\u062b\u0649', '\u0628\u0646\u062a', '\u0633\u064a\u062f\u0629'].includes(s)) return 'female'
  return 'male'
}

function normalizeBoolean(val: unknown): boolean {
  if (val === true || val === 1 || val === '1' || val === 'true' || val === 'yes') return true
  if (val === false || val === 0 || val === '0' || val === 'false' || val === 'no') return false
  return true
}

function normalizeDate(val: unknown): Date {
  if (!val) return new Date()
  if (val instanceof Date) return val
  const s = String(val).trim()
  const iso = Date.parse(s)
  if (!isNaN(iso)) return new Date(iso)
  const parts = s.split(/[\/\-\.]/)
  if (parts.length === 3) {
    const day = parseInt(parts[0])
    const month = parseInt(parts[1]) - 1
    const year = parseInt(parts[2])
    if (day > 12 && month >= 0 && month < 12 && year > 1900) {
      return new Date(year, month, day)
    }
    const d = new Date(year, parseInt(parts[0]) - 1, parseInt(parts[1]))
    if (!isNaN(d.getTime())) return d
  }
  return new Date()
}

function normalizeNumber(val: unknown, defaultVal: number | null = 0): number | null {
  if (!val && val !== 0) return defaultVal
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.\-]/g, ''))
  return isNaN(n) ? defaultVal : n
}

export async function POST(req: NextRequest) {
  try {
    const body: ImportRequest = await req.json()
    const { entityType, data, mode = 'add', skipErrors = false } = body

    if (!entityType || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: 'يرجى تحديد نوع البيانات وتقديم مصفوفة بيانات صالحة' },
        { status: 400 }
      )
    }

    if (data.length > 5000) {
      return NextResponse.json(
        { error: 'الحد الأقصى 5000 سجل في المرة الواحدة' },
        { status: 400 }
      )
    }

    const results = {
      total: data.length,
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [] as { row: number; message: string }[],
    }

    switch (entityType) {
      case 'patients':
        await importPatients(data, mode, results, skipErrors)
        break
      case 'visits':
        await importVisits(data, mode, results, skipErrors)
        break
      case 'sessionTypes':
        await importSessionTypes(data, mode, results, skipErrors)
        break
      case 'expenses':
        await importExpenses(data, mode, results, skipErrors)
        break
      case 'revenues':
        await importRevenues(data, mode, results, skipErrors)
        break
      default:
        return NextResponse.json(
          { error: `نوع البيانات غير مدعوم: ${entityType}` },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      message: `تم استيراد ${results.success} من ${results.total} سجل`,
      ...results,
    })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'فشل في استيراد البيانات', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

async function importPatients(
  rawData: Record<string, unknown>[],
  mode: string,
  results: { success: number; failed: number; skipped: number; errors: { row: number; message: string }[] },
  skipErrors: boolean
) {
  if (mode === 'replace') {
    await query(`DELETE FROM "PatientNote"`)
    await query(`DELETE FROM "PatientPhoto"`)
    await query(`DELETE FROM "Diagnosis"`)
    await query(`DELETE FROM "PrescriptionItem"`)
    await query(`DELETE FROM "Prescription"`)
    await query(`DELETE FROM "LaserRevenue"`)
    await query(`DELETE FROM "LaserSession"`)
    await query(`DELETE FROM "LaserPackage"`)
    await query(`DELETE FROM "LaserProfile"`)
    await query(`DELETE FROM "LaserTreatment"`)
    await query(`DELETE FROM "Visit"`)
    await query(`DELETE FROM "QueueEntry"`)
    await query(`DELETE FROM "Alert"`)
    await query(`DELETE FROM "Patient"`)
  }

  for (let i = 0; i < rawData.length; i++) {
    try {
      const mapped = mapRow(rawData[i], PATIENT_FIELD_MAP)
      const name = String(mapped.name || '').trim()
      if (!name) {
        if (skipErrors) { results.failed++; results.errors.push({ row: i + 1, message: 'اسم المريض مطلوب' }); continue }
        throw new Error(`سطر ${i + 1}: اسم المريض مطلوب`)
      }

      const phone = mapped.phone ? String(mapped.phone).trim() : null

      if (mode === 'merge') {
        const existing = await query(`SELECT "id" FROM "Patient" WHERE "name" ILIKE $1 AND "phone" = $2 LIMIT 1`, [name, phone])
        if (existing.rows.length > 0) { results.skipped++; continue }
      }

      const id = mapped.id ? String(mapped.id) : uuid()

      await query(
        `INSERT INTO "Patient" ("id", "name", "phone", "age", "gender", "notes", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT ("id") DO UPDATE SET
           "name" = EXCLUDED."name", "phone" = EXCLUDED."phone",
           "age" = EXCLUDED."age", "gender" = EXCLUDED."gender",
           "notes" = EXCLUDED."notes", "updatedAt" = EXCLUDED."updatedAt"`,
        [
          id, name, phone,
          normalizeNumber(mapped.age, null),
          normalizeGender(mapped.gender),
          mapped.notes ? String(mapped.notes) : null,
          mapped.createdAt ? normalizeDate(mapped.createdAt) : new Date(),
          new Date(),
        ]
      )
      results.success++
    } catch (err) {
      results.failed++
      results.errors.push({ row: i + 1, message: err instanceof Error ? err.message : 'خطأ غير معروف' })
      if (!skipErrors && results.failed > 10) break
    }
  }
}

async function importVisits(
  rawData: Record<string, unknown>[],
  mode: string,
  results: { success: number; failed: number; skipped: number; errors: { row: number; message: string }[] },
  skipErrors: boolean
) {
  if (mode === 'replace') {
    await query(`DELETE FROM "LaserTreatment"`)
    await query(`DELETE FROM "Visit"`)
  }

  const patientCache = new Map<string, string>()
  const allPatients = await query(`SELECT "id", "name", "phone" FROM "Patient"`)
  for (const p of allPatients.rows) {
    patientCache.set(String(p.name).trim(), String(p.id))
    if (p.phone) patientCache.set(String(p.phone).trim(), String(p.id))
  }

  const sessionTypeCache = new Map<string, string>()
  const allTypes = await query(`SELECT "id", "name" FROM "SessionType"`)
  for (const st of allTypes.rows) {
    sessionTypeCache.set(String(st.name).trim(), String(st.id))
  }

  for (let i = 0; i < rawData.length; i++) {
    try {
      const mapped = mapRow(rawData[i], VISIT_FIELD_MAP)

      let patientId = mapped.patientId ? String(mapped.patientId) : null
      if (!patientId && mapped.patientName) {
        patientId = patientCache.get(String(mapped.patientName).trim()) || null
      }
      if (!patientId && mapped.patientName) {
        const name = String(mapped.patientName).trim()
        const found = await query(`SELECT "id" FROM "Patient" WHERE "name" ILIKE $1 LIMIT 1`, [name])
        if (found.rows.length > 0) {
          patientId = String(found.rows[0].id)
          patientCache.set(name, patientId)
        }
      }
      if (!patientId) {
        results.failed++
        results.errors.push({ row: i + 1, message: 'لم يتم العثور على المريض - تأكد من وجوده أولاً' })
        continue
      }

      let sessionTypeId = mapped.sessionTypeId ? String(mapped.sessionTypeId) : null
      if (!sessionTypeId && mapped.sessionName) {
        sessionTypeId = sessionTypeCache.get(String(mapped.sessionName).trim()) || null
      }

      const price = normalizeNumber(mapped.price, 0) || 0
      const paid = normalizeNumber(mapped.paid, 0) || 0
      const remaining = normalizeNumber(mapped.remaining, price - paid) || 0
      const id = mapped.id ? String(mapped.id) : uuid()

      await query(
        `INSERT INTO "Visit" ("id", "patientId", "sessionTypeId", "date", "price", "paid", "remaining", "notes", "status", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT ("id") DO UPDATE SET
           "patientId" = EXCLUDED."patientId", "sessionTypeId" = EXCLUDED."sessionTypeId",
           "date" = EXCLUDED."date", "price" = EXCLUDED."price",
           "paid" = EXCLUDED."paid", "remaining" = EXCLUDED."remaining",
           "notes" = EXCLUDED."notes", "status" = EXCLUDED."status",
           "updatedAt" = EXCLUDED."updatedAt"`,
        [
          id, patientId, sessionTypeId,
          mapped.date ? normalizeDate(mapped.date) : new Date(),
          price, paid, remaining,
          mapped.notes ? String(mapped.notes) : null,
          mapped.status ? String(mapped.status) : 'completed',
          mapped.createdAt ? normalizeDate(mapped.createdAt) : new Date(),
          new Date(),
        ]
      )
      results.success++
    } catch (err) {
      results.failed++
      results.errors.push({ row: i + 1, message: err instanceof Error ? err.message : 'خطأ غير معروف' })
      if (!skipErrors && results.failed > 10) break
    }
  }
}

async function importSessionTypes(
  rawData: Record<string, unknown>[],
  mode: string,
  results: { success: number; failed: number; skipped: number; errors: { row: number; message: string }[] },
  skipErrors: boolean
) {
  if (mode === 'replace') {
    await query(`DELETE FROM "Visit"`)
    await query(`DELETE FROM "SessionType"`)
  }

  for (let i = 0; i < rawData.length; i++) {
    try {
      const mapped = mapRow(rawData[i], SESSION_TYPE_FIELD_MAP)
      const name = String(mapped.name || '').trim()
      if (!name) {
        results.failed++; results.errors.push({ row: i + 1, message: 'اسم الجلسة مطلوب' }); continue
      }

      if (mode === 'merge') {
        const existing = await query(`SELECT "id" FROM "SessionType" WHERE "name" ILIKE $1 LIMIT 1`, [name])
        if (existing.rows.length > 0) { results.skipped++; continue }
      }

      const id = mapped.id ? String(mapped.id) : uuid()

      await query(
        `INSERT INTO "SessionType" ("id", "name", "price", "description", "isActive", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT ("id") DO UPDATE SET
           "name" = EXCLUDED."name", "price" = EXCLUDED."price",
           "description" = EXCLUDED."description", "isActive" = EXCLUDED."isActive",
           "updatedAt" = EXCLUDED."updatedAt"`,
        [
          id, name, normalizeNumber(mapped.price, 0) || 0,
          mapped.description ? String(mapped.description) : null,
          normalizeBoolean(mapped.isActive),
          mapped.createdAt ? normalizeDate(mapped.createdAt) : new Date(),
          new Date(),
        ]
      )
      results.success++
    } catch (err) {
      results.failed++
      results.errors.push({ row: i + 1, message: err instanceof Error ? err.message : 'خطأ غير معروف' })
      if (!skipErrors && results.failed > 10) break
    }
  }
}

async function importExpenses(
  rawData: Record<string, unknown>[],
  mode: string,
  results: { success: number; failed: number; skipped: number; errors: { row: number; message: string }[] },
  skipErrors: boolean
) {
  if (mode === 'replace') await query(`DELETE FROM "Expense"`)

  for (let i = 0; i < rawData.length; i++) {
    try {
      const mapped = mapRow(rawData[i], EXPENSE_FIELD_MAP)
      const amount = normalizeNumber(mapped.amount, 0) || 0
      if (amount <= 0) {
        results.failed++; results.errors.push({ row: i + 1, message: 'المبلغ غير صالح' }); continue
      }
      const id = mapped.id ? String(mapped.id) : uuid()

      await query(
        `INSERT INTO "Expense" ("id", "category", "amount", "description", "date", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT ("id") DO UPDATE SET
           "category" = EXCLUDED."category", "amount" = EXCLUDED."amount",
           "description" = EXCLUDED."description", "date" = EXCLUDED."date",
           "updatedAt" = EXCLUDED."updatedAt"`,
        [
          id, String(mapped.category || 'عام').trim(), amount,
          mapped.description ? String(mapped.description) : null,
          mapped.date ? normalizeDate(mapped.date) : new Date(),
          mapped.createdAt ? normalizeDate(mapped.createdAt) : new Date(),
          new Date(),
        ]
      )
      results.success++
    } catch (err) {
      results.failed++
      results.errors.push({ row: i + 1, message: err instanceof Error ? err.message : 'خطأ غير معروف' })
      if (!skipErrors && results.failed > 10) break
    }
  }
}

async function importRevenues(
  rawData: Record<string, unknown>[],
  mode: string,
  results: { success: number; failed: number; skipped: number; errors: { row: number; message: string }[] },
  skipErrors: boolean
) {
  if (mode === 'replace') await query(`DELETE FROM "Revenue"`)

  for (let i = 0; i < rawData.length; i++) {
    try {
      const mapped = mapRow(rawData[i], REVENUE_FIELD_MAP)
      const amount = normalizeNumber(mapped.amount, 0) || 0
      if (amount <= 0) {
        results.failed++; results.errors.push({ row: i + 1, message: 'المبلغ غير صالح' }); continue
      }
      const id = mapped.id ? String(mapped.id) : uuid()

      await query(
        `INSERT INTO "Revenue" ("id", "category", "amount", "description", "date", "visitId", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT ("id") DO UPDATE SET
           "category" = EXCLUDED."category", "amount" = EXCLUDED."amount",
           "description" = EXCLUDED."description", "date" = EXCLUDED."date",
           "visitId" = EXCLUDED."visitId", "updatedAt" = EXCLUDED."updatedAt"`,
        [
          id, String(mapped.category || 'جلسات').trim(), amount,
          mapped.description ? String(mapped.description) : null,
          mapped.date ? normalizeDate(mapped.date) : new Date(),
          mapped.visitId ? String(mapped.visitId) : null,
          mapped.createdAt ? normalizeDate(mapped.createdAt) : new Date(),
          new Date(),
        ]
      )
      results.success++
    } catch (err) {
      results.failed++
      results.errors.push({ row: i + 1, message: err instanceof Error ? err.message : 'خطأ غير معروف' })
      if (!skipErrors && results.failed > 10) break
    }
  }
}
