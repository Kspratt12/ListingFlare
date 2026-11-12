# Packaging decision: flyer, lead cap, AI descriptions (NOT decided or changed in PR #50)

One decision for the owner. For each: what public copy says now, what the product does now, and a proposal.

| | Current public copy | Current behavior (verified in code) | Intent evidence | Proposal (pick one per row) |
|---|---|---|---|---|
| **Open house flyer** | Pricing lists "Open house flyer generator" among plan features; no trial exclusion is stated. The earlier FAQ claim that flyers are paid-only was removed. | `subscription.ts` says `canGenerateOpenHouseFlyer: false` for trials, but nothing in the UI or server checks it: any signed-in agent, trial included, can create flyers. | Conflicting: a flag says paid, behavior and copy say open. | **A (recommended): keep flyers in the trial** and set the flag to `true`, so code matches behavior and copy. B: gate it (UI + server) and add "flyers are a paid feature" to the trial FAQ. |
| **5-lead cap** | Not claimed anywhere (removed in #42). | `maxLeads: 5` exists in `subscription.ts` but is read nowhere: unlimited leads are captured, stored and shown in a trial. | One source only (the unused flag). | **A (recommended): delete the unused limit.** Enforcing it would hide or drop real buyer inquiries for a trial agent, which defeats the core value being trialled. B: enforce, and decide what happens to lead #6 (stored but locked until upgrade, never silently dropped). |
| **1 AI description** | Not claimed. | `maxAiDescriptions: 1` exists but no usage is counted anywhere. The AI routes accept trial users up to a per-user rate limit (cost exposure to us, not a customer-facing promise). | One source only. | **A (recommended): keep the rate limit, delete the unused allowance** until real cost data justifies a cap. B: add a usage counter (new column/table = database change, needs its own approval) and enforce 1. |

Notes
- None of the three is a customer-facing promise today, so leaving behavior unchanged breaks nothing.
- Each choice is a one-line code change (A options) or a database change (B for AI), and none touches paid accounts.
- Nothing here changes entitlements for existing paid customers.
