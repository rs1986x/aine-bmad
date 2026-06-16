# Source ↔ Draft Reconciliation — Todo App PRD

**Input reconciled:** user source prose PRD (the verbatim high-level "Product Requirement Document for the Todo App" prose supplied by the user).
**Compared against:** `prd.md` (drafted PRD) + `addendum.md`.
**Date:** 2026-06-15

This reconciliation surfaces what the drafted PRD + addendum kept faithfully, what it dropped/weakened/distorted (with emphasis on qualitative intent that a functional-requirements structure tends to silently lose), and what it added beyond the source so the user can confirm intent.

---

## Faithfully captured

The draft is, mechanically, a faithful and often-strengthened refinement of the source. The following source intents are present and well-served:

- **Core capability set (mostly):** create, view, complete, delete Todos → FR-1, FR-2, FR-3, FR-5; the CRUD backend → FR-7. (Edit is added — see below.)
- **The atomic Todo and its fields:** short textual description, completion status, creation-time metadata → Glossary + Data model (`description`, `completed`, `created_at`).
- **Immediate use, no onboarding:** "see their list upon opening … without any onboarding" → FR-1 + Vision + NFR-3 + UJ-1.
- **Fast/responsive, instant updates:** → NFR-1, FR consequences ("without a manual refresh"), UJ-1 climax.
- **Completed visually distinguishable from active:** → FR-1, NFR-3, Glossary.
- **Cross-device + empty/loading/error states + polish:** → NFR-3, FR-1 consequences, Acceptance Criteria §9.4.
- **Small well-defined API; consistency & durability across sessions:** → §4.2, FR-7, FR-6, NFR-4 (draft even strengthens durability to survive *backend* restarts).
- **Auth/multi-user not required now but not precluded later:** → §5, §6.2, NFR-5, addendum "deferred-but-enabled-later".
- **NFR triad simplicity / performance / maintainability:** → NFR-1, NFR-5, plus the explicit Non-Goals and the SM-C1 "don't add features" counter-metric (a genuine strengthening of "avoiding unnecessary features").
- **Client + server graceful error handling:** → NFR-2, FR-7 consequences, §9.5.
- **Excluded v1 features (accounts, collaboration, prioritization, deadlines, notifications):** → §5 Non-Goals, §6.2.
- **Success = unaided completion + stability across refresh/session + clarity:** → SM-1, SM-2, SM-3.
- **"Feel like a complete, usable product despite minimal scope":** → Vision §1 (quoted almost verbatim) and §1 closing intent.

---

## Gaps / weakened / dropped

Ordered roughly by significance. The biggest losses are qualitative framing, not requirements.

1. **The product's *identity* was reframed from "a product" to "a training exercise" — this is the single largest distortion of intent.**
   The source reads as a straight, earnest product PRD for a Todo app. It never mentions BMAD, training, learning, exercises, or a "builder/learner." The draft makes the meta-exercise a *first-class, foundational concern*: the title is "Todo App (Training Exercise)," §0 Document Purpose frames it as a "BMAD training exercise," §2.1 elevates "the builder/learner (Riccardo, DevOps engineer)" to a co-equal target user, and §10 makes training artifacts required deliverables. This may well match the real situation — but it is *not in the source* and is not flagged anywhere as an addition. If the source author intended a pure product spec, the draft has silently changed what the document *is about*. **Confirm whether the training-exercise framing is intended.**

2. **Tone/voice shift: calm, understated prose → dense, ID-heavy specification.**
   The source's voice is deliberately quiet — "simple," "clean," "reliable," "intuitive," "polished." That restraint is itself a design signal. The draft is rigorous and thorough (FR/NFR/SM/AC/assumption indices), which is correct for downstream consumption, but the felt quality of "deliberate minimalism as a virtue" is now something the reader must *infer* from counter-metrics rather than *feel*. The intent survives; the voice does not. Worth a sentence in the Vision to re-assert the understated ethos.

3. **"Intuitive" / "clarity of the overall user experience" as a standalone qualitative goal is partially diluted.**
   The source names *clarity* and *intuitiveness* as ends in themselves and as a success measure. The draft operationalizes these mostly as "unaided task completion" (SM-1) and "no onboarding." That's a reasonable proxy, but "is it *clear and intuitive*?" is broader than "can a user complete the actions?" — a UI can be completable yet ugly/confusing. The qualitative clarity bar is weakened into a binary completability bar.

4. **"Basic metadata such as creation time" — open-ended phrasing narrowed to a closed minimal-fields decision.**
   The source's "such as" leaves room for other metadata. The draft locks the model to exactly `id/description/completed/created_at` and explicitly excludes `updated_at`. Defensible, and flagged as a decision, but it closes a door the source left ajar. (Tension noted in Open Question 3.)

5. **"Instantaneous" softened into specific numeric budgets.**
   Source: "feel instantaneous," "reflected instantly." Draft: ~200ms UI / ~500ms API (NFR-1). This is a helpful concretization (and flagged as an assumption), but it converts a *felt* quality into a measurable threshold — if the numbers are wrong, the *feeling* is what the source actually cared about. Keep the qualitative intent primary.

6. **Deletion semantics hardened beyond the source.**
   Source just says "deletion." Draft adds "immediate and permanent; no undo / no soft-delete" (FR-5, §5). Flagged as an assumption, so low-risk, but the source never asserted permanence — confirm there's no expectation of an undo/trash affordance for "polish."

---

## Additions beyond source

Things in the draft/addendum with **no traceable origin in the source prose**. Most are reasonable and many are explicitly flagged in the draft; listed so the user can confirm intent. (✓ = draft already flags it as an addition/assumption; ✗ = baked in without being flagged as beyond-source.)

- **✗ Training-exercise framing + builder/learner persona (Riccardo, DevOps).** §0, §1, §2.1, title. The most consequential unflagged addition (see Gap #1).
- **✗ Required engineering deliverables: Docker / Docker Compose one-command run, automated tests, documentation/README.** §6.1, §9.6–9.8, §10 (D-4/D-5/D-6), SM-4, NFR-6/NFR-7. The source says only "easy to … deploy"; it never asks for containers, a test suite, or docs. These flow from the training framing, not the product spec.
- **✓ Edit a Todo's Description (FR-4).** Source listed only create/view/complete/delete. Draft flags it as a Fast-path decision (§4.1 note, §13) — traceable to a *decision*, not to the *source*. Confirm.
- **✓ Tech stack (React + TS, Node/Express + TS, PostgreSQL) and container topology.** Addendum. Correctly kept out of the PRD; not in source. Note Postgres-over-SQLite is justified *by training value*, reinforcing the training framing.
- **✓ Durability across *backend* restart** (beyond the source's "across user sessions"). FR-6, NFR-4. Sensible strengthening.
- **✓ HTTP error-code specifics (404 unknown id, 400 invalid input).** FR-7, addendum, §13.
- **✓ Explicit empty-description validation/rejection** on create and edit. FR-2, FR-4 — reasonable inference from "basic error handling," but the source never specified it.
- **(partly ✓) Persona "Sam" + detailed UJ-1 narrative.** A useful illustrative scaffold not present in source; harmless but invented.
- **✓ Open questions: list ordering, description length cap, last-write-wins concurrency, `updated_at`.** §12 — net-new considerations, appropriately raised.
- **✓ Counter-metrics (SM-C1, SM-C2).** Good faithful *amplification* of the source's anti-bloat intent, but the specific framing is the draft's own.

---

## Bottom line

The draft is a high-fidelity, mostly-additive refinement: no core source requirement was lost, and several were sharpened. The reconciliation risk is almost entirely **qualitative and framing-level** — (a) the document quietly became a *training-exercise spec* rather than a *product spec*, dragging in Docker/tests/docs/stack as requirements the source never stated; (b) the source's understated "clear, intuitive, instantaneous, polished" voice is now something to be inferred rather than felt; and (c) editing was added to the core feature set. None of these are wrong, but all three should be **explicitly confirmed by the user** before finalize.
