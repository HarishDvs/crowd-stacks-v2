import { describe, expect, it } from "vitest"
import { jBool, jNum, jStr, parseCampaign } from "./clarity-parsers"

// Shape produced by cvToJSON() on (some (tuple ...)) from get-campaign
const campaignJson = (overrides: Record<string, unknown> = {}) => ({
  type: "(optional (tuple ...))",
  value: {
    type: "(tuple ...)",
    value: {
      title: { type: "(string-ascii 80)", value: "Indie Game" },
      description: { type: "(string-ascii 256)", value: "A game funded by players" },
      goal: { type: "uint", value: "5000000" },
      total: { type: "uint", value: "1500000" },
      deadline: { type: "uint", value: "123456" },
      owner: { type: "principal", value: "ST1RVN5QPTET1RV9BJQX35JQWJFYG8YNHQEY5QN24" },
      active: { type: "bool", value: true },
      successful: { type: "bool", value: false },
      withdrawn: { type: "bool", value: false },
      finalized: { type: "bool", value: false },
      ...overrides,
    },
  },
})

describe("jNum / jStr / jBool", () => {
  it("unwrap .value", () => {
    expect(jNum({ value: "42" })).toBe(42)
    expect(jStr({ value: "hello" })).toBe("hello")
    expect(jBool({ value: true })).toBe(true)
  })

  it("default safely on missing input", () => {
    expect(jNum(undefined)).toBe(0)
    expect(jNum({})).toBe(0)
    expect(jStr(undefined)).toBe("")
    expect(jBool(undefined)).toBe(false)
    expect(jBool({ value: undefined })).toBe(false)
  })
})

describe("parseCampaign", () => {
  it("parses a full campaign tuple", () => {
    const c = parseCampaign(campaignJson(), 3)
    expect(c).toEqual({
      id: 3,
      title: "Indie Game",
      description: "A game funded by players",
      goal: 5, // microSTX -> STX
      total: 1.5,
      deadline: 123456,
      owner: "ST1RVN5QPTET1RV9BJQX35JQWJFYG8YNHQEY5QN24",
      active: true,
      successful: false,
      withdrawn: false,
      finalized: false,
    })
  })

  it("converts goal and total from microSTX to STX", () => {
    const c = parseCampaign(campaignJson({ goal: { value: "1000000" }, total: { value: "250000" } }), 0)
    expect(c.goal).toBe(1)
    expect(c.total).toBe(0.25)
  })

  it("falls back to interpolated 'Campaign <id>' when title/description are missing", () => {
    const c = parseCampaign(campaignJson({ title: undefined, description: undefined }), 7)
    expect(c.title).toBe("Campaign 7")
    expect(c.description).toBe("Campaign 7")
  })

  it("returns safe defaults for a none/unparseable response", () => {
    const c = parseCampaign({ type: "(optional none)", value: null }, 2)
    expect(c).toEqual({
      id: 2,
      title: "Campaign 2",
      description: "Campaign 2",
      goal: 0,
      total: 0,
      deadline: 0,
      owner: "",
      active: false,
      successful: false,
      withdrawn: false,
      finalized: false,
    })
  })
})
