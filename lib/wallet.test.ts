// Wallet flow tests (P3-2): connect, disconnect, and session persistence.
// @stacks/connect is mocked so we drive a fake UserSession + showConnect.
import { describe, it, expect, vi, beforeEach } from "vitest"

// Shared, hoisted session state the fake UserSession reads/writes.
const h = vi.hoisted(() => ({
  state: {
    signedIn: false,
    userData: null as unknown,
    signOutRedirect: undefined as string | undefined,
  },
}))

vi.mock("@stacks/connect", () => ({
  AppConfig: class {},
  UserSession: class {
    isUserSignedIn() {
      return h.state.signedIn
    }
    loadUserData() {
      return h.state.userData
    }
    signUserOut(redirectTo?: string) {
      h.state.signedIn = false
      h.state.userData = null
      h.state.signOutRedirect = redirectTo
    }
  },
  showConnect: vi.fn(),
}))

import { showConnect } from "@stacks/connect"
import { isSignedIn, loadUser, connectWallet, disconnectWallet } from "./wallet"

const mockedShowConnect = vi.mocked(showConnect)
const lastConnectOptions = () =>
  mockedShowConnect.mock.calls.at(-1)?.[0] as unknown as {
    appDetails: { name: string; icon: string }
    redirectTo: string
    userSession: unknown
    onFinish: () => void
    onCancel: () => void
  }

beforeEach(() => {
  mockedShowConnect.mockReset()
  h.state.signedIn = false
  h.state.userData = null
  h.state.signOutRedirect = undefined
})

describe("session persistence", () => {
  it("loadUser returns null and isSignedIn is false when signed out", () => {
    expect(isSignedIn()).toBe(false)
    expect(loadUser()).toBeNull()
  })

  it("loadUser returns the persisted session user when already signed in", () => {
    const user = { profile: { stxAddress: { testnet: "ST123" } } }
    h.state.signedIn = true
    h.state.userData = user

    expect(isSignedIn()).toBe(true)
    expect(loadUser()).toBe(user)
  })
})

describe("connectWallet", () => {
  it("opens showConnect with app details, redirect, and a session", () => {
    connectWallet({ appName: "CrowdStacks", redirectTo: "/admin", onConnect: vi.fn() })

    const opts = lastConnectOptions()
    expect(opts.appDetails.name).toBe("CrowdStacks")
    expect(opts.appDetails.icon).toContain("/favicon.ico")
    expect(opts.redirectTo).toBe("/admin")
    expect(opts.userSession).toBeDefined()
  })

  it("resolves with the loaded user via onConnect when the flow finishes", () => {
    const user = { profile: { stxAddress: { testnet: "ST999" } } }
    const onConnect = vi.fn()
    const onError = vi.fn()

    connectWallet({ appName: "CrowdStacks", redirectTo: "/", onConnect, onError })

    // Wallet finishes connecting: the session is now signed in.
    h.state.signedIn = true
    h.state.userData = user
    lastConnectOptions().onFinish()

    expect(onConnect).toHaveBeenCalledWith(user)
    expect(onError).not.toHaveBeenCalled()
  })

  it("routes failures to onError instead of throwing", () => {
    mockedShowConnect.mockImplementationOnce(() => {
      throw new Error("wallet unavailable")
    })
    const onConnect = vi.fn()
    const onError = vi.fn()

    connectWallet({ appName: "CrowdStacks", redirectTo: "/", onConnect, onError })

    expect(onError).toHaveBeenCalledTimes(1)
    expect(onConnect).not.toHaveBeenCalled()
  })
})

describe("disconnectWallet", () => {
  it("signs out, clears the session, and forwards the redirect", () => {
    h.state.signedIn = true
    h.state.userData = { profile: {} }

    disconnectWallet("/goodbye")

    expect(h.state.signOutRedirect).toBe("/goodbye")
    expect(isSignedIn()).toBe(false)
    expect(loadUser()).toBeNull()
  })
})
