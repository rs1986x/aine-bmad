# PRD Quality Review — Todo App (Training Exercise)

## Overall verdict

This is a genuinely strong PRD for its stakes: it knows exactly what it is (a deliberately minimal app whose real subject is the BMAD lifecycle), states that thesis openly, and backs nearly every FR with testable consequences plus an aggregated Acceptance section. It resists the usual failure modes — no persona theater, real counter-metrics, honest non-goals, an assumptions index that round-trips cleanly. The one thing holding it back from flawless is a systematic cross-reference defect: NFRs live in §8 but are cited as "§9" in three places (§9 is actually Acceptance Criteria), which will mildly mislead downstream source-extraction even though the NFR IDs themselves resolve unambiguously.

## Decision-readiness — strong

A reader can act on this. Real decisions are stated as decisions rather than buried: the minimal-fields choice ("no `updated_at`"), the deliberate scope expansion to editing ("editing was added during PRD discovery as an intentional expansion beyond the original source"), and the Postgres-over-SQLite call in the addendum ("chosen over embedded SQLite specifically for DevOps/Docker training value"). Trade-offs name what was given up, not just what was chosen — the Postgres rationale and the `updated_at` exclusion (Open Question 3) both surface the cost side.

The Open Questions are genuinely open and not rhetorical: each carries a flagged default plus a "confirm" — e.g. ordering, length cap, and "last-write-wins, no conflict handling" — so the PM knows what will happen by default *and* that it is still up for grabs. The single `[NOTE FOR PM]` sits at the real tension (auth/multi-user as the likely v2), not at a safe checkpoint.

## Substance over theater — strong

The content is earned. There is no persona theater — the PRD explicitly declines it ("no standalone persona section is warranted for a single-operator tool"), and the lone UJ-1 carries its protagonist inline. No differentiation/innovation section was invented to fill a template slot. NFRs carry product-specific numbers rather than boilerplate ("within roughly 200ms of the server response," "well under ~500ms"). The counter-metrics are the standout: SM-C1 ("do **not** add features to look more complete") and SM-C2 ("do **not** fake responsiveness with optimistic UI that diverges from persisted state") are real tensions, not decoration.

### Findings
- **low** Maintainability NFR leans on adjectives (§8 NFR-5) — "simple to understand, deploy, and extend" is the one NFR phrased as qualities rather than bounds. It is partially rescued by the concrete clause "must not preclude later addition of authentication and multi-user support." *Fix:* keep the extensibility bound as the testable core; treat "simple/clear/conventional" as intent, not acceptance.

## Strategic coherence — strong

The PRD has an explicit thesis and bets on it: "The point of the exercise is not feature richness; it is to produce something that *feels like a complete, usable product* while exercising the full BMAD lifecycle end to end." Feature selection follows from that thesis — a tight CRUD core plus the five training deliverables — rather than reading as a wishlist. Success Metrics validate the thesis (unaided completion, persistence reliability, one-command bring-up) instead of measuring vanity activity, and the counter-metrics actively guard the "stay minimal" bet. This is the opposite of a backlog with section headings.

## Done-ness clarity — strong

This is where the PRD is most impressive for its size. Every FR has a "Consequences (testable)" block with verifiable conditions (server-assigned `id`/`created_at`, "appears ... without requiring a manual page refresh," "still retrievable via the API" after a backend restart), and §9 aggregates them into eight concrete "Done" conditions including the harder cases (validation on both create and edit, persistence across a *container* restart, error behavior with the backend unreachable). An engineer would know what done means.

### Findings
- **low** "Discoverable" is the one soft acceptance target (§7 SM-1) — "100% of core actions discoverable and completable without guidance" mixes a testable half (completable) with a subjective half (discoverable) that has no defined method. Acceptable at training stakes. *Fix:* either drop "discoverable" or pin it to a lightweight check (e.g. a first-time user completes all five actions with no README).

## Scope honesty — strong

Omissions are explicit and done out loud, not inferred. There is a substantive Non-Goals §5 (auth, multi-user, organization features, undo/trash, analytics) reinforced by an `[NON-GOAL for MVP]` callout and a parallel Out-of-Scope §6.2 that distinguishes "deferred-but-enabled-later" from "rejected." Inferences carry `[ASSUMPTION]` tags and are collected in §13; deferred decisions carry `[NOTE FOR PM]`. Open-items density (5 Open Questions + a handful of assumptions) is well-calibrated to a low-stakes training exercise — not a blocker, exactly the kind of disclosure you want before a green light.

## Downstream usability — adequate

Mostly clean for source-extraction: a Glossary-first structure, contiguous and unique IDs (FR-1..FR-7, UJ-1, SM-1..SM-4 + SM-C1/C2, NFR-1..NFR-7, D-1..D-6), and SM→FR / FR→UJ cross-references that resolve. UJ-1 has a named protagonist (Sam) carrying context inline. What keeps this from "strong" is a systematic broken section reference for NFRs.

### Findings
- **medium** NFR cross-references point to the wrong section (§4.1 FR-6, §4.2 FR-7, §5) — NFRs live in §8, but they are cited three times as "§9 (NFR-1)" / "§9 NFR-5"; §9 is actually the Acceptance Criteria section. A downstream extractor following the § number lands on the wrong section. Impact is bounded because the NFR IDs are unique and still resolve by ID. *Fix:* replace "§9" with "§8" in all three NFR cross-references (FR-6 feature-NFR, FR-7 feature-NFR, and the §5 closing line).
- **low** Glossary term spelled differently from its field (§3) — the term is defined as "Created-at" but referenced everywhere as `created_at`. Trivial but worth normalizing so the domain noun is identical across uses. *Fix:* note `created_at` as the canonical field form in the Glossary entry.

## Shape fit — strong

The PRD is shaped to the product rather than forced into a template. It's a single-operator tool with consumer-grade UX expectations, so it correctly uses exactly one load-bearing UJ (not UJ density for a one-person tool) and a capability-spec shape for the backend (§4.2 "this PRD fixes only the *capabilities and behaviors* the API must guarantee"), while deferring transport/mechanism to the addendum. It is explicitly chain-top (feeds UX → architecture → stories → tests → QA), and the Glossary-first, stable-ID structure reflects that. Neither over-formalized nor under-formalized.

## Mechanical notes

- **Glossary drift:** minimal. One spelling inconsistency — Glossary "Created-at" vs `created_at` field usage (low, captured above). The "task"→"Todo" synonym is handled explicitly in the Glossary ("downstream artifacts must use **Todo**"). No other case/plural drift observed.
- **ID continuity:** clean. FR-1..FR-7 contiguous and unique; UJ-1 the sole journey, referenced consistently with no dangling UJ-2; SM-1..SM-4 plus SM-C1/SM-C2 continuous; NFR-1..NFR-7 and D-1..D-6 contiguous. No gaps or duplicates.
- **Broken cross-refs:** the "§9" NFR references (should be §8) noted above are the only broken pointers; all §10/§13/§5 references resolve correctly.
- **Assumptions Index roundtrip:** clean. Every inline `[ASSUMPTION]` (FR-2, FR-3, FR-5, FR-7, NFR-1, NFR-6, D-4, §11, and the three §12 defaults) appears in §13, and every §13 entry traces back to an inline tag. The two non-assumption "Decision/Scope-expansion" entries are explicitly labeled as such, so the index is not padded.
- **UJ protagonist naming:** UJ-1 names Sam with inline persona + context; no floating UJ. Minor: the human user appears under three labels across the doc (Sam in UJ-1, "the single end user" in §2.1 JTBD, and the builder "Riccardo"), but Sam-as-end-user vs Riccardo-as-builder is clear enough at these stakes.
- **Required sections:** all present for stakes/type — Vision, Target User/JTBD, Glossary, Features+FRs, Non-Goals, MVP Scope, Success Metrics + counter-metrics, NFRs, Acceptance, Deliverables, Constraints, Open Questions, Assumptions Index, plus the addendum carrying the tech-how.
