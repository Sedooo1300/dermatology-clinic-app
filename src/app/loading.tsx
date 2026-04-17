export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-primary mx-auto mb-4 animate-pulse" />
        <p className="text-muted-foreground text-sm">جاري التحميل...</p>
      </div>
    </div>
  )
}
