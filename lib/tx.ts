// Transaction-status helpers shared across pages. Polls the Hiro API until a
// broadcast transaction is confirmed (success/failed) or times out, so the UI
// can track a contribute/withdraw/finalize call instead of guessing with a
// fixed delay.
import { NETWORK_NAME } from "@/lib/stacks"

export type TxStatus = "success" | "failed"

/** Hiro API base URL for the configured network. */
export function hiroApiBase(): string {
  switch (NETWORK_NAME) {
    case "mainnet":
      return "https://api.hiro.so"
    case "devnet":
      return "http://localhost:3999"
    case "testnet":
    default:
      return "https://api.testnet.hiro.so"
  }
}

export interface WaitOptions {
  maxRetries?: number
  intervalMs?: number
}

/**
 * Resolve once the transaction lands (success or failed); reject on timeout or
 * a network error. Mirrors the previous inline admin implementation but is
 * network-aware and reusable.
 */
export function waitForTransaction(txId: string, opts: WaitOptions = {}): Promise<TxStatus> {
  const maxRetries = opts.maxRetries ?? 15
  const intervalMs = opts.intervalMs ?? 5000
  const base = hiroApiBase()

  return new Promise<TxStatus>((resolve, reject) => {
    let retries = 0
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${base}/extended/v1/tx/${txId}`)
        const data = await response.json()

        if (data.tx_status === "success" || data.tx_status === "failed") {
          clearInterval(interval)
          resolve(data.tx_status)
        } else if (retries >= maxRetries) {
          clearInterval(interval)
          reject(new Error("Transaction timed out"))
        }
        retries++
      } catch (error) {
        clearInterval(interval)
        reject(error)
      }
    }, intervalMs)
  })
}
