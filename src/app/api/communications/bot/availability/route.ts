import { query } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const dateParam = searchParams.get('date') || ''

    // Use provided date or default to today
    const targetDate = dateParam
      ? new Date(dateParam)
      : new Date()

    // Format date for comparison
    const dateStr = targetDate.toISOString().split('T')[0]
    const nextDate = new Date(targetDate)
    nextDate.setDate(nextDate.getDate() + 1)
    const nextDateStr = nextDate.toISOString().split('T')[0]

    // Generate 30-min slots from 9:00 to 21:00
    const slots: Array<{ time: string; isAvailable: boolean; bookedCount: number }> = []

    for (let hour = 9; hour < 21; hour++) {
      for (let min = 0; min < 60; min += 30) {
        const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`
        const slotStart = `${dateStr}T${timeStr}:00.000Z`
        const slotEndHour = min === 0 ? hour : hour + 1
        const slotEndMin = min === 0 ? 30 : 0
        const slotEnd = `${dateStr}T${String(slotEndHour).padStart(2, '0')}:${String(slotEndMin).padStart(2, '0')}:00.000Z`

        slots.push({
          time: timeStr,
          isAvailable: true,
          bookedCount: 0,
        })
      }
    }

    // Get existing visits for the target date with status 'scheduled'
    const visits = await query<{ date: string }>(
      `SELECT date FROM "Visit"
       WHERE date >= $1 AND date < $2 AND status = 'scheduled'`,
      [dateStr, nextDateStr]
    )

    // Count visits per 30-min slot
    const slotCounts: Record<string, number> = {}
    for (const slot of slots) {
      slotCounts[slot.time] = 0
    }

    for (const visit of visits.rows) {
      const visitDate = new Date(visit.date)
      const visitHour = visitDate.getUTCHours()
      const visitMin = visitDate.getUTCMinutes()
      // Round down to nearest 30-min slot
      const roundedMin = visitMin < 30 ? 0 : 30
      const slotKey = `${String(visitHour).padStart(2, '0')}:${String(roundedMin).padStart(2, '0')}`
      if (slotCounts[slotKey] !== undefined) {
        slotCounts[slotKey]++
      }
    }

    // Update slots with booked counts
    const result = slots.map(slot => ({
      time: slot.time,
      isAvailable: slotCounts[slot.time] < 2, // Max 2 per slot
      bookedCount: slotCounts[slot.time],
    }))

    return NextResponse.json({
      date: dateStr,
      slots: result,
      availableCount: result.filter(s => s.isAvailable).length,
    })
  } catch (error) {
    console.error('GET /api/communications/bot/availability error:', error)
    return NextResponse.json({ error: 'خطأ في جلب المواعيد المتاحة' }, { status: 500 })
  }
}
