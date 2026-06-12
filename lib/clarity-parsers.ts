// Shared Clarity JSON parsing helpers — single source of truth for all pages.
// Parse results from cvToJSON() on contract read-only calls.

export interface Campaign {
  id: number
  title: string
  description: string
  goal: number
  total: number
  deadline: number
  owner: string
  active: boolean
  successful?: boolean
  withdrawn?: boolean
  finalized?: boolean
  blocksRemaining?: number
}

export const jNum = (cv: any) => Number(cv?.value ?? 0)
export const jStr = (cv: any) => String(cv?.value ?? "")
export const jBool = (cv: any) => Boolean(cv?.value ?? false)

export const parseCampaign = (json: any, id: number): Campaign => {
  const d = json?.value?.value ?? {}
  return {
    id,
    title: jStr(d.title) || `Campaign ${id}`,
    description: jStr(d.description) || `Campaign ${id}`,
    goal: jNum(d.goal) / 1_000_000,
    total: jNum(d.total) / 1_000_000,
    deadline: jNum(d.deadline),
    owner: d.owner?.value || "",
    active: jBool(d.active),
    successful: jBool(d.successful),
    withdrawn: jBool(d.withdrawn),
    finalized: jBool(d.finalized),
  }
}
