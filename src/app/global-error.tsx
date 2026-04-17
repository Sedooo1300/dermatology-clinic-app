'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{
        margin: 0,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f0fdfa',
        fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          maxWidth: '400px',
        }}>
          <div style={{
            width: '64px', height: '64px',
            borderRadius: '16px',
            backgroundColor: '#fef3c7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
            fontSize: '28px',
          }}>
            ⚠️
          </div>
          <h2 style={{ color: '#111827', marginBottom: '0.5rem', fontSize: '1.2rem' }}>
            حدث خطأ
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '1rem', fontSize: '0.85rem', lineHeight: '1.6' }}>
            جاري إعداد قاعدة البيانات. يرجى الانتظار قليلاً ثم إعادة المحاولة.
            <br /><br />
            اذهب إلى Vercel Dashboard → Storage → Neon
            <br />
            وتأكد من إعداد قاعدة البيانات بشكل صحيح.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '0.6rem 1.5rem',
              backgroundColor: '#0d9488',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            إعادة المحاولة
          </button>
        </div>
      </body>
    </html>
  )
}
