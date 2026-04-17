import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // أنواع الجلسات الشائعة
  const sessionTypes = [
    { name: 'كشف جلدي', price: 300, description: 'فحص جلدي شامل', isActive: true },
    { name: 'ليزر إزالة الشعر - وجه', price: 800, description: 'جلسة ليزر لمنطقة الوجه', isActive: true },
    { name: 'ليزر إزالة الشعر - جسم كامل', price: 2000, description: 'جلسة ليزر لمناطق الجسم الكاملة', isActive: true },
    { name: 'ليزر إزالة الشعر - إبطين', price: 500, description: 'جلسة ليزر لمنطقة الإبطين', isActive: true },
    { name: 'ليزر إزالة الشعر - بيكيني', price: 600, description: 'جلسة ليزر لمنطقة البيكيني', isActive: true },
    { name: 'ليزر إزالة الشعر - ساقين', price: 1200, description: 'جلسة ليزر لمنطقة الساقين', isActive: true },
    { name: 'ليزر إزالة الشعر - ذراعين', price: 800, description: 'جلسة ليزر لمنطقة الذراعين', isActive: true },
    { name: 'ليزر إزالة الشعر - شارب وذقن', price: 400, description: 'جلسة ليزر لمنطقة الشارب والذقن', isActive: true },
    { name: 'مكافحة تجاعيد البوتكس', price: 1500, description: 'حقن البوتكس لمكافحة التجاعيد', isActive: true },
    { name: 'فيلر (حشو) الشفاه', price: 2000, description: 'حقن الفيلر لتكبير الشفاه', isActive: true },
    { name: 'فيلر (حشو) الوجه', price: 2500, description: 'حقن الفيلر للوجه', isActive: true },
    { name: 'ميزوثيرابي للشعر', price: 1200, description: 'جلسة ميزوثيرابي لعلاج تساقط الشعر', isActive: true },
    { name: 'ميزوثيرابي للوجه', price: 1000, description: 'جلسة ميزوثيرابي لتجديد البشرة', isActive: true },
    { name: 'بيلينغ كيميائي', price: 800, description: 'تقشير كيميائي للبشرة', isActive: true },
    { name: 'ميكرونيدلينج', price: 900, description: 'علاج بالميكرونيدلينج', isActive: true },
    { name: 'علاج حب الشباب', price: 500, description: 'جلسة علاج حب الشباب', isActive: true },
    { name: 'إزالة النمش والتصبغات', price: 700, description: 'علاج التصبغات الجلدية', isActive: true },
    { name: 'علاج الثعلبة', price: 600, description: 'جلسة علاج الثعلبة', isActive: true },
    { name: 'كشط جلدي', price: 450, description: 'كشط جلدي خفيف', isActive: true },
    { name: 'استشارة عن بعد', price: 200, description: 'استشارة طبية عبر الإنترنت', isActive: true },
  ]

  for (const st of sessionTypes) {
    await prisma.sessionType.upsert({
      where: { id: `seed-${st.name.replace(/\s+/g, '-')}` },
      update: {},
      create: { id: `seed-${st.name.replace(/\s+/g, '-')}`, ...st },
    })
  }

  console.log('✅ Seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
