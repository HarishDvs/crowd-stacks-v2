"use client"

// Fixed banner shown whenever the browser reports it is offline.
import { WifiOff } from "lucide-react"
import { useOnlineStatus } from "@/lib/use-online-status"

export function OfflineBanner() {
  const online = useOnlineStatus()
  if (online) return null

  return (
    <div
      role="alert"
      className="fixed top-0 inset-x-0 z-[110] bg-red-600 text-white text-sm text-center py-2 px-4 flex items-center justify-center gap-2"
    >
      <WifiOff size={16} />
      <span>You&apos;re offline — actions are disabled until your connection returns.</span>
    </div>
  )
}
