// Integration tests for contract calls (P3-3): create-campaign, contribute,
// and close-campaign write paths plus the read path used by both pages.
// The Stacks network layer is mocked; Clarity value construction and parsing are real.
import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  uintCV,
  stringAsciiCV,
  principalCV,
  trueCV,
  falseCV,
  someCV,
  noneCV,
  tupleCV,
  cvToJSON,
  callReadOnlyFunction,
  AnchorMode,
} from "@stacks/transactions"
import { openContractCall } from "@stacks/connect"
import { CONTRACT_ADDRESS, CONTRACT_NAME, callContract, callContractReadOnly, contractHelpers } from "./stacks"
import { fetchCampaignData } from "./use-campaign-data"

vi.mock("@stacks/connect", () => ({
  AppConfig: class {},
  UserSession: class {},
  showConnect: vi.fn(),
  openContractCall: vi.fn(async () => undefined),
}))

vi.mock("@stacks/transactions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@stacks/transactions")>()
  return { ...actual, callReadOnlyFunction: vi.fn() }
})

const mockedOpenContractCall = vi.mocked(openContractCall)
const mockedReadOnly = vi.mocked(callReadOnlyFunction)

const lastContractCall = () => mockedOpenContractCall.mock.calls.at(-1)?.[0] as unknown as Record<string, unknown>

beforeEach(() => {
  mockedOpenContractCall.mockClear()
  mockedReadOnly.mockReset()
})

describe("create-campaign call", () => {
  it("sends title/description as string-ascii and goal/deadline as uint to the deployed contract", async () => {
    const args = [stringAsciiCV("Indie Game"), stringAsciiCV("A platformer"), uintCV(5_000_000), uintCV(185_000)]
    await callContract("create-campaign", args)

    const call = lastContractCall()
    expect(call.contractAddress).toBe(CONTRACT_ADDRESS)
    expect(call.contractName).toBe(CONTRACT_NAME)
    expect(call.functionName).toBe("create-campaign")
    expect(call.functionArgs).toEqual(args)
    expect(call.anchorMode).toBe(AnchorMode.Any)
  })
})

describe("contribute call", () => {
  it("converts STX to microSTX and passes a uint", async () => {
    await contractHelpers.contribute(2.5)

    const call = lastContractCall()
    expect(call.functionName).toBe("contribute")
    expect(call.functionArgs).toEqual([uintCV(2_500_000)])
  })

  it("floors fractional microSTX amounts", async () => {
    await contractHelpers.contribute(0.0000019)
    expect(lastContractCall().functionArgs).toEqual([uintCV(1)])
  })
})

describe("close-campaign calls", () => {
  it("withdraw-funds targets the campaign id when the goal was reached", async () => {
    await callContract("withdraw-funds", [uintCV(7)])

    const call = lastContractCall()
    expect(call.functionName).toBe("withdraw-funds")
    expect(call.functionArgs).toEqual([uintCV(7)])
  })

  it("finalize-failure targets the campaign id when the goal was missed", async () => {
    await callContract("finalize-failure", [uintCV(7)])
    expect(lastContractCall().functionName).toBe("finalize-failure")
  })
})

describe("read-only calls", () => {
  it("callContractReadOnly uses the contract address as sender and returns parsed JSON", async () => {
    mockedReadOnly.mockResolvedValueOnce(uintCV(42))

    const result = await callContractReadOnly("get-campaign-count")

    expect(mockedReadOnly).toHaveBeenCalledWith(
      expect.objectContaining({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: "get-campaign-count",
        senderAddress: CONTRACT_ADDRESS,
      }),
    )
    expect(Number(result.value)).toBe(42)
  })
})

describe("fetchCampaignData (shared hook fetcher)", () => {
  const campaignTuple = (title: string, goalMicro: number, totalMicro: number) =>
    someCV(
      tupleCV({
        title: stringAsciiCV(title),
        description: stringAsciiCV(`${title} description`),
        goal: uintCV(goalMicro),
        total: uintCV(totalMicro),
        deadline: uintCV(185_000),
        owner: principalCV(CONTRACT_ADDRESS),
        active: trueCV(),
        successful: falseCV(),
        withdrawn: falseCV(),
        finalized: falseCV(),
      }),
    )

  it("assembles global stats, parses campaigns, and enriches blocks-remaining", async () => {
    mockedReadOnly.mockImplementation(async (options) => {
      const { functionName, functionArgs } = options as { functionName: string; functionArgs: unknown[] }
      switch (functionName) {
        case "get-total-stx":
          return uintCV(7_500_000)
        case "get-total-contributors":
          return uintCV(3)
        case "get-active-campaigns":
          return uintCV(2)
        case "get-campaign-count":
          return uintCV(2)
        case "get-campaign": {
          const id = Number(cvToJSON(functionArgs[0] as Parameters<typeof cvToJSON>[0]).value)
          return campaignTuple(`Campaign ${id} title`, 10_000_000, id * 1_000_000)
        }
        case "get-campaign-status":
          return someCV(tupleCV({ "blocks-remaining": uintCV(120) }))
        default:
          throw new Error(`Unexpected read-only call: ${functionName}`)
      }
    })

    const { campaigns, globalStats } = await fetchCampaignData()

    expect(globalStats).toEqual({
      totalRaised: 7.5,
      totalContributors: 3,
      activeCampaigns: 2,
      totalCampaigns: 2,
    })

    expect(campaigns).toHaveLength(2)
    expect(campaigns[0].title).toBe("Campaign 0 title")
    expect(campaigns[1].total).toBe(1) // microSTX converted to STX
    expect(campaigns[0].goal).toBe(10)
    expect(campaigns.every((c) => c.blocksRemaining === 120)).toBe(true)
  })

  it("falls back to interpolated defaults when a campaign read returns none", async () => {
    mockedReadOnly.mockImplementation(async (options) => {
      const { functionName } = options as { functionName: string }
      switch (functionName) {
        case "get-total-stx":
        case "get-total-contributors":
        case "get-active-campaigns":
          return uintCV(0)
        case "get-campaign-count":
          return uintCV(1)
        case "get-campaign":
          return noneCV()
        case "get-campaign-status":
          return noneCV()
        default:
          throw new Error(`Unexpected read-only call: ${functionName}`)
      }
    })

    const { campaigns } = await fetchCampaignData()

    expect(campaigns).toHaveLength(1)
    expect(campaigns[0].title).toBe("Campaign 0")
    expect(campaigns[0].active).toBe(false)
    expect(campaigns[0].blocksRemaining).toBe(0)
  })
})
