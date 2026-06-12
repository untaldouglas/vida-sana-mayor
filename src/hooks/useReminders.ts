import { useEffect } from 'react'
import { getMedicalRecord } from '../storage'
import type { AppState, Profile } from '../types'

export function useReminders(profile: Profile | null, appState: AppState) {
  useEffect(() => {
    if (!profile || !appState.remindersEnabled) return
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') return

    const timers: ReturnType<typeof setTimeout>[] = []
    let cancelled = false

    async function schedule() {
      const rec = await getMedicalRecord(profile!.id)
      if (cancelled) return

      const today = new Date().toISOString().split('T')[0]
      const now = Date.now()
      const advanceMs = (appState.reminderAdvanceMinutes ?? 0) * 60_000
      const activeMeds = rec.medications.filter(m => !m.endDate || m.endDate >= today)

      for (const med of activeMeds) {
        for (const timeStr of med.times) {
          const [hh, mm] = timeStr.split(':').map(Number)
          const fireAt = new Date().setHours(hh, mm, 0, 0) - advanceMs
          const delay = fireAt - now
          if (delay < 0) continue

          const alreadyTaken = med.takenHistory.some(
            r => r.date === today && r.time === timeStr && r.taken
          )
          if (alreadyTaken) continue

          const advance = appState.reminderAdvanceMinutes
          const body = advance
            ? `En ${advance} min · ${med.name} – ${med.dose}`
            : `${med.name} – ${med.dose} · ${timeStr}`

          timers.push(setTimeout(() => {
            new Notification('💊 Hora de tu medicamento', {
              body,
              icon: `${import.meta.env.BASE_URL}icons/icon-192.png`,
              tag: `med-${med.id}-${timeStr}`,
            })
          }, delay))
        }
      }
    }

    schedule()

    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
    }
  }, [profile?.id, appState.remindersEnabled, appState.reminderAdvanceMinutes])
}
