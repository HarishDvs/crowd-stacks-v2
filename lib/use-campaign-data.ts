"use client"

// Shared campaign-state hook: home and admin read from one SWR cache
// (key "campaign-data") instead of polling the chain independently.
import useSWR from "swr"
import { callReadOnlyFunction, cvToJSON, uintCV } from "@stacks/transactions"
import { type Campaign, parseCampaign } from "@/lib/clarity-parsers"
import { CONTRACT_ADDRESS, CONTRACT_NAME, network } from "@/lib/stacks"
import { mapInBatches } from "@/lib/fetch-utils"

export interface GlobalStats {
  totalRaised: number
  totalContributors: number
  activeCampaigns: number
  totalCampaigns: number
}

export interface CampaignData {
  campaigns: Campaign[]
  globalStats: GlobalStats
}

const readOnly = (functionName: string, functionArgs: unknown[] = []) =>
  callReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName,
    functionArgs: functionArgs as never[],
    network,
    senderAddress: CONTRACT_ADDRESS,
  })

export async function fetchCampaignData(): Promise<CampaignData> {
  const [totalSTX, totalContributors, activeCampaigns, campaignCount] = await Promise.all([
    readOnly("get-total-stx"),
    readOnly("get-total-contributors"),
    readOnly("get-active-campaigns"),
    readOnly("get-campaign-count"),
  ])

  const totalCampaigns = Number(cvToJSON(campaignCount).value)
  const globalStats: GlobalStats = {
    totalRaised: Number(cvToJSON(totalSTX).value) / 1_000_000,
    totalContributors: Number(cvToJSON(totalContributors).value),
    activeCampaigns: Number(cvToJSON(activeCampaigns).value),
    totalCampaigns,
  }

  // Campaign tuples, batched to respect Hiro API rate limits
  const campaignIds = Array.from({ length: totalCampaigns }, (_, i) => i)
  const campaignResults = await mapInBatches(campaignIds, 10, (i) => readOnly("get-campaign", [uintCV(i)]))
  const campaigns: Campaign[] = campaignResults
    .map((result, index) => {
      try {
        return parseCampaign(cvToJSON(result), index)
      } catch (error) {
        console.warn(`Failed to parse campaign ${index}:`, error)
        return null
      }
    })
    .filter((campaign): campaign is Campaign => campaign !== null)

  // Enrich with blocks-remaining for countdowns
  const statusResults = await mapInBatches(campaigns, 10, (c) => readOnly("get-campaign-status", [uintCV(c.id)]))
  const withStatus = campaigns.map((c, i) => {
    try {
      const json = cvToJSON(statusResults[i]) as { value?: { value?: Record<string, unknown> } }
      const tuple = json?.value?.value ?? json?.value ?? {}
      const node = (tuple as Record<string, { value?: unknown } | undefined>)["blocks-remaining"]
      const raw = node && typeof node.value !== "undefined" ? node.value : node
      const br = Number(raw)
      return { ...c, blocksRemaining: Number.isFinite(br) ? br : 0 }
    } catch {
      return { ...c }
    }
  })

  return { campaigns: withStatus, globalStats }
}

const EMPTY_STATS: GlobalStats = {
  totalRaised: 0,
  totalContributors: 0,
  activeCampaigns: 0,
  totalCampaigns: 0,
}

export function useCampaignData() {
  const { data, error, isLoading, mutate } = useSWR<CampaignData>("campaign-data", fetchCampaignData, {
    refreshInterval: 30_000,
  })

  return {
    campaigns: data?.campaigns ?? [],
    globalStats: data?.globalStats ?? EMPTY_STATS,
    loading: isLoading,
    error,
    refresh: () => mutate(),
  }
}
