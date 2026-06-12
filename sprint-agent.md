# CrowdStacks Sprint Agent

> Adapted from the MyGateMate sprint workflow. Claude Code handles planning,
> implementation, and review in one loop (no Codex delegation).

## Shared repo layout

```
sprints/TODO.md        — prioritized backlog (P0 → P3), unchecked = open
sprints/COMPLETED.md   — append-only log of finished items
planning-docs/         — codebase reference docs (fetch on-demand only)
```

---

## Startup (every session)

```bash
gh api repos/Tejash0/crowd-stacks-v2/contents/sprints/TODO.md \
  --jq '.content' | base64 -d > /tmp/TODO.md

gh api repos/Tejash0/crowd-stacks-v2/contents/sprints/COMPLETED.md \
  --jq '.content' | base64 -d > /tmp/COMPLETED.md
```

Parse `/tmp/TODO.md` for all unchecked `- [ ]` items.
Cross-reference `/tmp/COMPLETED.md` — skip anything already done.
Print the queue ordered P0 → P1 → P2 → P3, confirm before starting.

> If `gh` isn't authed: `gh auth login` (needs `repo` scope).
> Until contributor access lands, work on a fork branch and update
> `sprints/` via PR instead of direct content PUTs.

---

## Reference Docs (fetch on-demand only — never preload)

Only pull these when the current task actually needs them:

```bash
gh api repos/Tejash0/crowd-stacks-v2/contents/planning-docs/<FILE>.md \
  --jq '.content' | base64 -d
```

| File | When to fetch |
|------|---------------|
| `CONCERNS.md` | Security or debt task |
| `CONVENTIONS.md` | Creating a new file or function |
| `ARCHITECTURE.md` | Cross-module decision |
| `INTEGRATIONS.md` | Hiro API / wallet / contract-call task |
| `STRUCTURE.md` | Finding where to place a file |
| `TESTING.md` | Writing or fixing specs |
| `STACK.md` | Dependency or config question |

---

## Per-Task Loop

```
1. PLAN
   Fetch only the reference doc(s) this task needs.
   Identify exact file + line. Write down the precise change before editing.

2. IMPLEMENT
   Make the edit directly (Claude Code — no external delegation).

3. REVIEW
   Check the diff against the checklist below.
   Run: npx tsc --noEmit
   Run tests if specs were touched.
   Issues → back to step 2. Clean → proceed.

4. COMMIT
   git commit -m "<task-id>: <one-line summary>"
   git push

5. UPDATE /tmp/TODO.md
   - [ ] → - [x] for the completed item.
   Append one line to /tmp/COMPLETED.md with commit hash + date.
```

---

## Review Checklist

- [ ] No new `as any` casts
- [ ] No `console.log` of wallet addresses, session data, or keys
- [ ] Contract config imported from `lib/stacks.ts` — never redeclared in pages
- [ ] Single shared `userSession` from `lib/stacks.ts` — no new `UserSession` instances
- [ ] Clarity parsing goes through `lib/clarity-parsers.ts` (once P1-1 lands)
- [ ] Form limits match contract `string-ascii` sizes (title 80, description 256)
- [ ] New env vars added to `.env.example`
- [ ] `npx tsc --noEmit` passes

---

## Hard Rules

- Never skip a P0 for a P1/P2/P3
- One commit per TODO item — no batching
- No secrets or private keys in code — env vars only
- Deadlines are Stacks block heights, never Unix timestamps
- Network selection comes from `NEXT_PUBLIC_STACKS_NETWORK` (once P1-4 lands) — no hardcoded `StacksTestnet()` in pages
- Don't modify `contracts/crowdfunding.clar` without a design note (see P3-6)

---

## Session End

```bash
# 1. Verify clean
npx tsc --noEmit

# 2. Push TODO + COMPLETED back to GitHub (requires write access;
#    otherwise commit sprints/ changes on your branch and include in the PR)
TODO_SHA=$(gh api repos/Tejash0/crowd-stacks-v2/contents/sprints/TODO.md --jq '.sha')
COMPLETED_SHA=$(gh api repos/Tejash0/crowd-stacks-v2/contents/sprints/COMPLETED.md --jq '.sha')

gh api repos/Tejash0/crowd-stacks-v2/contents/sprints/TODO.md \
  --method PUT \
  --field message="agent: update TODO $(date +%Y-%m-%d)" \
  --field content="$(base64 < /tmp/TODO.md)" \
  --field sha="$TODO_SHA"

gh api repos/Tejash0/crowd-stacks-v2/contents/sprints/COMPLETED.md \
  --method PUT \
  --field message="agent: update COMPLETED $(date +%Y-%m-%d)" \
  --field content="$(base64 < /tmp/COMPLETED.md)" \
  --field sha="$COMPLETED_SHA"

# 3. Confirm — print remaining unchecked count
gh api repos/Tejash0/crowd-stacks-v2/contents/sprints/TODO.md \
  --jq '.content' | base64 -d | grep -c '\- \[ \]'
```
