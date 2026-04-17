'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        textAlign: 'center',
        padding: '2rem',
        maxWidth: '360px',
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      }}>
        <div style={{ fontSize: '40px', marginBottom: '1rem' }}>⚠️</div>
        <h2 style={{ color: '#111827', marginBottom: '0.5rem', fontSize: '1.1rem' }}>
          حدث خطأ
        </h2>
        <p style={{ color: '#6b7280', marginBottom: '1rem', fontSize: '0.85rem' }}>
          {error?.message?.includes('database') || error?.message?.includes('DATABASE')
            ? 'قاعدة البيانات غير متصلة. يرجى ضبطها من إعدادات Vercel.'
            : 'حاول مرة أخرى'}
        </p>
        <button
          onClick={reset}
          style={{
            padding: '0.5rem 1.5rem',
            backgroundColor: '#0d9488',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          إعادة المحاولة
        </button>
      </div>
    </div>
  )
}
