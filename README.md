# جلسات عيادة المغازى - تطبيق إدارة العيادة الجلدية

تطبيق PWA متكامل لإدارة عيادة الأمراض الجلدية، يشمل إدارة المرضى والزيارات والجلسات ونظام الليزر والمالية والوصفات الطبية والمزيد.

## ✨ المميزات

- **إدارة المرضى** - سجل كامل للمرضى مع البيانات الشخصية
- **إدارة الزيارات** - تسجيل الجلسات والأسعار والمدفوعات
- **نظام الليزر** - جلسات ليزر إزالة الشعر بمقياس Fitzpatrick
- **الوصفات الطبية** - وصفات ذكية مع 20+ دواء جلدى
- **قائمة الانتظار** - إدارة انتظار المرضى بـ 3 مستويات أولوية
- **التقويم الشهرى** - عرض الزيارات والجلسات على التقويم
- **نظام المالية** - إيرادات ومصروفات وتقارير
- **التنبيهات** - تنبيهات ذكية للمتابعة والمواعيد
- **التقارير** - تقارير شاملة للعيادة
- **الوضع الليلي** - دعم السمة الداكنة
- **6 ثيمات** - تخصيص مظهر التطبيق
- **النسخ الاحتياطي** - نسخ واستعادة البيانات
- **PWA** - يعمل كتطبيق على الموبايل

## 🛠 التقنيات

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS 4
- shadcn/ui
- Prisma ORM + PostgreSQL (Neon)
- Recharts
- next-themes

## 🚀 التشغيل المحلى

```bash
# تثبيت الحزم
npm install

# إعداد قاعدة البيانات
cp .env.example .env
# عدّل .env بـ رابط قاعدة البيانات

# إنشاء الجداول
npx prisma db push

# تشغيل التطبيق
npm run dev
```

افتح [http://localhost:3000](http://localhost:3000)

## ☁️ النشر على Vercel

### 1. إنشاء قاعدة بيانات Neon (مجاناً)
1. اذهب إلى [neon.tech](https://neon.tech) وسجل حساب
2. أنشئ مشروع جديد
3. انسخ رابط الاتصال (Connection string)

### 2. رفع الكود على GitHub
1. أنشئ repo جديد على GitHub
2. ارفع الكود:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/clinic-app.git
git branch -M main
git push -u origin main
```

### 3. النشر على Vercel
1. اذهب إلى [vercel.com](https://vercel.com) وسجل حساب
2. اضغط "New Project" واختر الـ repo
3. أضف متغيرات البيئة:
   - `DATABASE_URL` = رابط Neon (مع `?sslmode=require&pgbouncer=true`)
   - `DIRECT_URL` = رابط Neon المباشر (مع `?sslmode=require`)
4. اضغط "Deploy"

## 📁 هيكل المشروع

```
├── prisma/
│   └── schema.prisma        # نموذج قاعدة البيانات
├── src/
│   ├── app/
│   │   ├── api/             # API Routes
│   │   ├── layout.tsx       # التخطيط الرئيسى
│   │   ├── page.tsx         # الصفحة الرئيسية
│   │   └── globals.css      # الأنماط العامة
│   ├── components/          # المكونات
│   ├── hooks/               # Custom Hooks
│   └── lib/
│       └── db.ts            # Prisma Client
├── public/
│   ├── manifest.json        # PWA Manifest
│   ├── sw.js                # Service Worker
│   └── icons/               # أيقونات التطبيق
└── package.json
```

## 📄 الترخيص

MIT
