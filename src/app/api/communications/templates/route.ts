import { NextResponse } from 'next/server'

const templates = [
  {
    id: 'appointment_reminder',
    label: 'تذكير بموعد',
    icon: 'Bell',
    content: 'مرحباً {patientName} 👋\n\nتذكير بموعدك في عيادة المغازى غداً الساعة {time} ⏰\n\nيرجى الحضور قبل الموعد بـ 15 دقيقة\nعنوان العيادة: {address}\n\nللتأجيل أو الإلغاء اتصل بنا',
  },
  {
    id: 'followup_reminder',
    label: 'متابعة علاج',
    icon: 'CalendarCheck',
    content: 'مرحباً {patientName} 💊\n\nحان وقت متابعة علاجك في عيادة المغازى\n\nآخر زيارة كانت: {lastVisitDate}\nالجلسة القادمة: {nextSession}\n\nيرجى الاتصال لحجز موعد',
  },
  {
    id: 'session_confirmation',
    label: 'تأكيد حجز',
    icon: 'CheckCircle',
    content: 'تم تأكيد حجزك بنجاح ✅\n\nالاسم: {patientName}\nالجلسة: {sessionType}\nالتاريخ: {date}\nالساعة: {time}\nالسعر: {price} ج.م\n\nنتطلع لرؤيتك في عيادة المغازى 🏥',
  },
  {
    id: 'prescription_sent',
    label: 'إرسال وصفة',
    icon: 'FileText',
    content: 'مرحباً {patientName} 📋\n\nوصفتك الطبية من عيادة المغازى:\n\n{prescription}\n\nالجرعة: {dosage}\n\nملاحظات: {instructions}',
  },
  {
    id: 'payment_reminder',
    label: 'تذكير بمدفوعة',
    icon: 'Wallet',
    content: 'مرحباً {patientName} 💰\n\nتذكير بوجود رصيد متبقي في عيادة المغازى:\n\nالمبلغ المتبقي: {remainingAmount} ج.م\n\nيرجى السداد في أقرب فرصة\nللاستفسار اتصل بنا',
  },
  {
    id: 'after_care',
    label: 'متابعة بعد العلاج',
    icon: 'Heart',
    content: 'مرحباً {patientName} 🌟\n\nنأمل أن تكونوا بخير بعد الجلسة الأخيرة\n\nبعض النصائح:\n- {tip1}\n- {tip2}\n- {tip3}\n\nالموعد القادم: {nextDate}\n\nعيادة المغازى 🏥',
  },
  {
    id: 'lab_results',
    label: 'نتائج تحاليل',
    icon: 'TestTubes',
    content: 'مرحباً {patientName} 🔬\n\nنتائج التحاليل جاهزة في عيادة المغازى\n\nيرجى الاتصال أو الحضور للاطلاع على النتائج\n\nتحليل: {testName}\nالتاريخ: {date}',
  },
  {
    id: 'welcome',
    label: 'ترحيب مريض جديد',
    icon: 'Sparkles',
    content: 'أهلاً وسهلاً بك في عيادة المغازى 👋✨\n\n{patientName} - تم تسجيلك في نظامنا\n\nنتمنى لك الشفاء العاجل\n\nلحجز موعد:\n📞 اتصل بنا\n📍 العنوان',
  },
  {
    id: 'promo_offer',
    label: 'عرض خاص',
    icon: 'Gift',
    content: 'عرض خاص من عيادة المغازى 🎁\n\n{offerDetails}\n\nالمدة: {offerDuration}\nللاستفادة اتصل بنا أو احجز مباشرة\n\nعيادة المغازى 🏥',
  },
  {
    id: 'review_request',
    label: 'طلب تقييم',
    icon: 'Star',
    content: 'مرحباً {patientName} ⭐\n\nنتمنى أن تكون تجربتك في عيادة المغازى مميزة\n\nنرجو منك تقييم زيارتك\nملاحظاتكم تهمنا ❤️\n\nشكراً لثقتكم بنا',
  },
]

export async function GET() {
  try {
    return NextResponse.json({ templates })
  } catch (error) {
    console.error('GET /api/communications/templates error:', error)
    return NextResponse.json({ error: 'خطأ في جلب القوالب' }, { status: 500 })
  }
}
