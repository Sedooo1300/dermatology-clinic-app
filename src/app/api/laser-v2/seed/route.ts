import { query, uuid } from '@/lib/db'
import { NextResponse } from 'next/server'

const MACHINES = [
  { name: 'Candela GentleLase Pro', type: 'Alexandrite', wavelength: '755nm', maxFluence: 100, spotSizes: '10,12,15,18 mm', notes: 'جهاز الإلكسندرايت الأكثر استخداماً - مناسب للبشرة الفاتحة' },
  { name: 'Soprano Titanium', type: 'Diode', wavelength: '810nm', maxFluence: 120, spotSizes: '10,12,15 mm', notes: 'تقنية SFR الثلاثية - مناسب لجميع أنواع البشرة' },
  { name: 'Cynosure Apogee', type: 'Alexandrite', wavelength: '755nm', maxFluence: 80, spotSizes: '10,12,15 mm', notes: 'جهاز إلكسندرايت احترافي' },
  { name: 'Lumenis LightSheer', type: 'Diode', wavelength: '810nm', maxFluence: 100, spotSizes: '9x9, 12x12 mm', notes: 'تقنية ChillTip للتبريد' },
  { name: 'Cutera Excel', type: 'Nd:YAG', wavelength: '1064nm', maxFluence: 350, spotSizes: '7,10 mm', notes: 'مناسب للبشرة الداكنة جداً' },
  { name: 'Venus Velocity', type: 'IPL', wavelength: '640-1200nm', maxFluence: 25, spotSizes: '10x50 mm', notes: 'جهاز IPL متعدد الاستخدامات' },
]

const AREAS = [
  { name: 'الوجه الكامل', malePulses: 500, femalePulses: 300, pulsePrice: 2 },
  { name: 'الشارب', malePulses: 100, femalePulses: 80, pulsePrice: 2 },
  { name: 'الذقن', malePulses: 80, femalePulses: 60, pulsePrice: 2 },
  { name: 'الرقبة', malePulses: 100, femalePulses: 80, pulsePrice: 2 },
  { name: 'الصدر', malePulses: 400, femalePulses: 200, pulsePrice: 1.5 },
  { name: 'البطن', malePulses: 300, femalePulses: 200, pulsePrice: 1.5 },
  { name: 'الظهر', malePulses: 400, femalePulses: 250, pulsePrice: 1.5 },
  { name: 'الإبطين', malePulses: 150, femalePulses: 120, pulsePrice: 2 },
  { name: 'الذراعين', malePulses: 300, femalePulses: 200, pulsePrice: 1.5 },
  { name: 'الساعدين', malePulses: 200, femalePulses: 150, pulsePrice: 1.5 },
  { name: 'اليدين', malePulses: 100, femalePulses: 80, pulsePrice: 1.5 },
  { name: 'الفخذين', malePulses: 600, femalePulses: 500, pulsePrice: 1.5 },
  { name: 'الساقين', malePulses: 800, femalePulses: 600, pulsePrice: 1.5 },
  { name: 'القدمين', malePulses: 200, femalePulses: 150, pulsePrice: 1.5 },
  { name: 'خط البكيني', malePulses: 200, femalePulses: 150, pulsePrice: 2 },
  { name: 'الجسم الكامل', malePulses: 3000, femalePulses: 2500, pulsePrice: 1 },
]

export async function POST() {
  try {
    const results = { machines: 0, areas: 0 }

    // Seed machines
    for (const m of MACHINES) {
      const { rows } = await query(
        `SELECT "id" FROM "LaserMachine" WHERE "name" = $1 LIMIT 1`,
        [m.name]
      )
      if (rows.length === 0) {
        await query(
          `INSERT INTO "LaserMachine" ("id", "name", "type", "wavelength", "maxFluence", "spotSizes", "isActive", "notes")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [uuid(), m.name, m.type, m.wavelength, m.maxFluence, m.spotSizes, true, m.notes || null]
        )
        results.machines++
      }
    }

    // Seed areas
    for (const a of AREAS) {
      const { rows } = await query(
        `SELECT "id" FROM "LaserArea" WHERE "name" = $1 LIMIT 1`,
        [a.name]
      )
      if (rows.length === 0) {
        await query(
          `INSERT INTO "LaserArea" ("id", "name", "malePulses", "femalePulses", "pulsePrice", "isActive")
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [uuid(), a.name, a.malePulses, a.femalePulses, a.pulsePrice, true]
        )
        results.areas++
      }
    }

    return NextResponse.json({
      success: true,
      message: `تم إضافة ${results.machines} جهاز و ${results.areas} منطقة`,
      results,
    })
  } catch (error) {
    console.error('POST /api/laser-v2/seed error:', error)
    return NextResponse.json({ error: 'خطأ في إضافة البيانات الأولية' }, { status: 500 })
  }
}
