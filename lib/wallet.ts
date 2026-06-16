// Shared wallet helpers — single place for connect/disconnect/session reads so
// pages don't each reimplement the @stacks/connect dance. Connecting resolves
// via a state callback (no full-page reload) and surfaces errors to the caller.
import { showConnect } from "@stacks/connect"
import { userSession } from "@/lib/stacks"

export type WalletUser = ReturnType<typeof userSession.loadUserData>

const APP_ICON_PATH = "/favicon.ico"

export interface ConnectOptions {
  appName: string
  redirectTo: string
  // Called with the freshly loaded session once the wallet finishes connecting.
  onConnect: (user: WalletUser) => void
  // Called if connecting or loading the session fails.
  onError?: (error: unknown) => void
}

/** Whether a wallet session is currently signed in. */
export function isSignedIn(): boolean {
  return userSession.isUserSignedIn()
}

/** Returns the active session user, or null when signed out. */
export function loadUser(): WalletUser | null {
  return userSession.isUserSignedIn() ? userSession.loadUserData() : null
}

/**
 * Open the wallet connect flow. On success, `onConnect` receives the loaded
 * session so the caller can update React state instead of reloading the page.
 */
export function connectWallet({ appName, redirectTo, onConnect, onError }: ConnectOptions): void {
  try {
    showConnect({
      appDetails: {
        name: appName,
        icon: (typeof window !== "undefined" ? window.location.origin : "") + APP_ICON_PATH,
      },
      redirectTo,
      userSession,
      onFinish: () => {
        try {
          onConnect(userSession.loadUserData())
        } catch (error) {
          onError?.(error)
        }
      },
      onCancel: () => {
        // User dismissed the wallet popup — not an error, nothing to do.
      },
    })
  } catch (error) {
    onError?.(error)
  }
}

/** Sign the session out and optionally redirect. */
export function disconnectWallet(redirectTo = "/"): void {
  userSession.signUserOut(redirectTo)
}
