---
Task ID: 1
Agent: Main Agent
Task: إضافة إضافات احترافية لتطبيق عيادة المغازى الجلدية

Work Log:
- تحليل شامل للتطبيق الحالى وتحديد الإضافات المطلوبة
- تحديث قاعدة البيانات (Prisma schema) بإضافة 4 جداول جديدة: Prescription, PrescriptionItem, Diagnosis, QueueEntry
- إنشاء 10 API routes جديدة: prescriptions, prescriptions/[id], diagnoses, diagnoses/[id], queue, queue/[id], queue/reorder, backups/restore
- بناء مكون عرض التقويم الشهرى (calendar-view.tsx) مع عرض الزيارات وجلسات الليزر
- بناء نظام الوصفات الطبية (prescriptions-view.tsx) مع قائمة أدوية ذكية وطباعة
- بناء نظام قائمة الانتظار (queue-view.tsx) مع إدارة أولويات وأوقات الانتظار
- إضافة الوضع الليلي (dark mode) عبر next-themes مع زر تبديل في الهيدر والإعدادات
- تحديث الداشبورد بـ 6 أزرار إجراءات سريعة تشمل كل الأقسام
- إضافة زر استعادة النسخ الاحتياطية في الإعدادات
- تحديث شريط التنقل (المزيد) بإضافة 3 أقسام جديدة

Stage Summary:
- التطبيق يعمل بنجاح على port 3000
- Build ناجح بدون أخطاء
- 4 ميزات جديدة كاملة: التقويم، الوصفات الطبية، قائمة الانتظار، الوضع الليلي
- كل الـ API routes تعمل بشكل صحيح
