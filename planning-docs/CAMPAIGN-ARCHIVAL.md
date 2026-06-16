# Campaign Archival & Cleanup — Design Note (P3-6)

**Status:** Design note only. No contract change is made by this item.
**Context:** `contracts/crowdfunding.clar` stores campaigns in unbounded maps with
no archival or pruning. This note records the problem, options, and a
recommendation so any future contract change starts from a shared decision.

---

## 1. Current state

Storage in `crowdfunding.clar`:

| Map / var | Key → value | Growth |
|-----------|-------------|--------|
| `campaigns` | `uint` → full campaign tuple (title 80, description 256, owner, flags, …) | +1 entry per `create-campaign`, **never removed** |
| `contributions` | `{ campaign-id, contributor }` → `{ amount }` | +1 per unique contributor per campaign, **never removed** (refund sets amount to `u0`, key stays) |
| `campaign-contributors` | `uint` → `{ count }` | +1 per campaign |
| `campaign-count` (data-var) | monotonically increasing `uint` | only ever incremented |

Lifecycle today: `withdraw-funds`, `finalize-failure`, and `close-campaign`
flip `active`/`finalized` flags and decrement `active-campaigns`, but the map
entries themselves persist forever. `campaign-count` is the iteration bound the
frontend uses (`fetchCampaigns` loops `0..campaign-count`).

### Why it matters

- **Read fan-out grows without bound.** The UI reads every campaign id `0..count`
  on each refresh (batched 10 at a time in `lib/use-campaign-data.ts`). Closed
  and finalized campaigns are fetched forever, so home/admin load time and Hiro
  API usage grow linearly with all campaigns ever created, not active ones.
- **No per-campaign contributor bound.** `contributions` can grow arbitrarily
  large for a popular campaign; nothing caps it.
- **No on-chain way to reclaim/prune.** There is no `map-delete` anywhere, so
  state can only grow.

This is a **reliability/scaling** concern, not a correctness bug — escrow
accounting is unaffected. It bites at scale (many campaigns) via slow loads.

---

## 2. Constraints

- Clarity maps have no enumeration; the frontend relies on the dense
  `0..campaign-count` id range. Any scheme that leaves "holes" must keep reads
  safe (a missing id already parses to a fallback via `parseCampaign`).
- `map-delete` reclaims state but **breaks history**: explorers and refund
  claimants may still need a finalized campaign's record. Deleting a campaign
  with un-refunded `contributions` would strand funds — refunds read the
  `contributions` map.
- Deployed contracts are immutable; "archival" can only apply to **new**
  deployments or be layered off-chain. This note assumes a future redeploy.

---

## 3. Options considered

### Option A — Off-chain archival only (no contract change) ✅ recommended first step
Keep the contract as-is. Solve the read-cost problem in the frontend:
- Track a `lastActiveId` / "archived-before" cursor (config or localStorage) so
  the UI stops re-fetching campaigns known to be finalized long ago.
- Or move historical reads behind an explicit "Show closed campaigns" toggle so
  the default refresh only fans out over likely-active ids.
- Cache finalized campaign tuples (they are immutable once finalized) and skip
  re-reading them on every poll.

Pros: zero contract risk, ships now, directly addresses the actual pain (load
time / API usage). Cons: on-chain state still grows; purely a read optimization.

### Option B — Status index for cheap active enumeration (contract change)
Add a maintained list/range of active campaign ids (e.g. a bounded
`(list 200 uint)` or an `active-from`/`active-to` window) updated on create and
on close/finalize. The UI iterates only active ids.

Pros: bounds the hot read path to active campaigns. Cons: Clarity list bounds
are fixed at deploy; needs careful invariant maintenance; doesn't reclaim state.

### Option C — Prune on finalize (contract change, destructive)
On `finalize-failure` / `withdraw-funds`, `map-delete` the campaign once all
contributions are settled (escrow `total` is `u0`). Add a guard so deletion is
only allowed when no claimable balance remains.

Pros: actually reclaims state. Cons: irreversible loss of history; must prove
"nothing claimable" first; refund flow reads `contributions`, so those keys
can't be deleted until every contributor has claimed — hard to guarantee.

### Option D — Epoch / generational maps
Namespace campaigns by epoch and retire whole epochs once fully settled.
Pros: clean bulk archival. Cons: largest redesign; overkill for current scale.

---

## 4. Recommendation

1. **Now (no contract change):** implement **Option A** — bound the frontend
   read fan-out so finalized campaigns aren't re-fetched every poll (cursor +
   "show closed" toggle + cache immutable finalized tuples). This resolves the
   reliability symptom that motivated P3-6 without touching the deployed
   contract. Track as a follow-up frontend task.
2. **On next contract redeploy:** adopt **Option B** (active-id index) for cheap
   active enumeration. Defer **Option C** (pruning) unless on-chain state size
   becomes a real cost, because of the history/refund-safety hazards.

Any move to B or C must ship with: an explicit refund-safety invariant
(never delete/lose a campaign with claimable `contributions`), a migration plan
for the dense-id assumption in `fetchCampaigns`, and contract tests covering the
new lifecycle transitions.

---

## 5. Out of scope

- No edit to `contracts/crowdfunding.clar` in this item (hard rule: contract
  changes require their own design + review).
- The Option A frontend work is recommended but tracked separately, not
  implemented here.
