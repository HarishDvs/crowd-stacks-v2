"use client"

// Tracks browser connectivity via the online/offline events. Defaults to
// online for SSR/first paint and corrects on mount, so the UI can disable
// chain actions when the network (and thus the Hiro API) is unavailable.
import { useEffect, useState } from "react"

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    update()
    window.addEventListener("online", update)
    window.addEventListener("offline", update)
    return () => {
      window.removeEventListener("online", update)
      window.removeEventListener("offline", update)
    }
  }, [])

  return online
}
