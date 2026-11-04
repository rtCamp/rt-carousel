# Code Review — Handpicked Posts for Query Loop Carousels

**Branch:** `feature/handpicked-posts`
**Base:** `d487394` (Import rt-carousel develop at 576e177)
**Plan:** `2026-11-04-handpicked-posts.md`

Reviewed: 11 commits, +1521 / -2 lines across 11 files.

- `inc/Plugin.php` (+152)
- `src/blocks/carousel/handpicked-posts.tsx` (new, 452)
- `src/blocks/carousel/__tests__/handpicked-posts.test.tsx` (new, 463, 29 `it` cases)
- `tests/php/Unit/HandpickedPostsTest.php` (new, 363, 15 tests)
- `src/blocks/carousel/index.ts`, `editor.scss`, `tests/php/stubs.php`, `README.md`, `readme.txt`, `docs/API.md`, `docs/USAGE.md` (small, consistent with plan)

Overall the implementation lands close to the plan, with one deliberate architectural change documented in the PR. Build, test and lint output in the PR description shows no new failures relative to baseline. The remaining findings are mostly low-severity.

---

## Plan vs. implementation deviations

### 1. Server flow uses a render-time stack plus `render_block_context`, not `render_block_data` alone — **neutral, documented**

Plan: "Use `metadata.rtCarousel` during the first hook to set `query.inherit = false` and attach the pick data in an internal query-context key".

Implementation (`inc/Plugin.php:56-128`) registers four hooks:

- `render_block_data` → push the Query's normalized picks (or `null`) onto `$handpicked_stack`, return the parsed block unchanged.
- `render_block_core/query` priority 0 → pop the stack.
- `render_block_context` → if stack top has picks and the incoming context carries `query`, force `inherit = false`, set `postType`, attach picks under `rtCarouselHandpickedIds`.
- `query_loop_block_query_vars` → when the marker is on `$block->context['query']`, return the published-only `post__in` query.

The PR description justifies this by stating the plan's single-filter approach "does not work" because `WP_Block` builds its provided context in the constructor. That specific claim is slightly overstated — mutating `attrs.query.inherit` and attaching a marker key in `render_block_data` would also reach `core/post-template` through `provides_context`. The stack approach is still a valid choice and arguably cleaner because it never mutates parsed attributes. Worth softening the wording in the PR, not a blocker.

### 2. Editor uses `getBlockParentsByBlockName` + `getBlockAttributes` — **neutral, documented**

Plan says `getBlockParents(clientId)` + `getBlock(id)`. Implementation (`src/blocks/carousel/handpicked-posts.tsx:342-347, 392-396`) uses the by-name variant. Same semantics for finding the nearest `core/query` ancestor, cheaper subscription. Called out in the PR.

---

## Findings

### Medium

#### M1. `filter_handpicked_block_context` mutates the `query` context of every nested block, not only `core/post-template`

`inc/Plugin.php:116-128` modifies `$context['query']` whenever the stack top carries picks and the incoming context has a `query` key. `render_block_context` fires for every descendant block — including `core/post-title`, `core/post-featured-image`, nested `core/query`, and any third-party block that declares `query` as used context. Only `core/post-template` actually looks at `rtCarouselHandpickedIds`, so most of these writes are no-ops in practice.

Scenario where this matters: a third-party block inside the Query reads `context.query.inherit` or `context.query.postType` and branches on it (for example, a filter plugin that shows a notice when `inherit: true`). It will now always see `inherit: false` and the forced `postType`, even if nothing in that block was ever meant to participate in the handpicked flow.

Mitigation would be scoping the filter to `core/post-template` only, using the third `$parent_block` argument of `render_block_context` and checking the block name before mutating. Low-impact today; worth a follow-up if the codebase picks up more Query-aware blocks.

#### M2. Server reads `postType` from `attrs.query.postType`, not `metadata.rtCarousel.postType`

`inc/Plugin.php:161-166` and the server-side filter take the Query block's current `query.postType`, ignoring `metadata.rtCarousel.postType`. The editor keeps them in sync via the `useEffect` in `src/blocks/carousel/handpicked-posts.tsx:352-362`, so in normal use they agree.

Scenario where they drift: a Query is saved with `metadata.rtCarousel = { postType: 'post', ids: [10, 11] }` and `query.postType = 'page'` (for example, programmatically imported content or an older plugin version). The front end will issue `post__in = [10, 11]` with `post_type = 'page'`, almost certainly returning zero posts. No gap detection or warning. Behavior matches the plan text ("keep selected type from Query's `query.postType`") so this is spec-faithful, but worth noting that the two sources of truth are not reconciled server-side. Consider preferring `metadata.rtCarousel.postType` when both exist, or at minimum logging a divergence in a debug path.

#### M3. `handpicked_stack` has no cleanup if `render_block_core/query` never fires

`inc/Plugin.php:83-104`. The pop runs on the `render_block_core/query` filter. If a `core/query` is pushed in `render_block_data` but its render is abandoned (an uncaught exception during inner rendering, a `pre_render_block` short-circuit introduced by another plugin on a nested block, etc.), the push is not balanced.

Within a single request this is mostly harmless because `Plugin` is a singleton per request and the stack never leaks across requests. The visible effect is that a subsequent independent Query on the same page would see the stale stack top and get its context modified. Catching exceptions around rendering is out of scope, but an idempotent safeguard — for example, matching the parsed block identity before popping, or clearing the stack in a late hook such as `wp_footer` or `shutdown` — would make the invariant more robust. Low severity; no known trigger today.

### Low

#### L1. `postType` override in `filter_handpicked_block_context` is a no-op

`inc/Plugin.php:124`: `$context['query']['postType'] = $picks['postType'];`. Since `$picks['postType']` is read from `$parsed_block['attrs']['query']['postType']` and the incoming `$context['query']` is what the Query provides from the same attribute, this line always assigns the same value. Not harmful; remove it for clarity.

#### L2. `useSelect` dependency array has a redundant entry

`src/blocks/carousel/handpicked-posts.tsx:128`: `[ postType, idsKey, ids.length ]`. `idsKey` already encodes both content and length (`'1,2,3'` vs `'1,2'`), so `ids.length` adds nothing to invalidation. Remove it. Same concern does not apply to the suggestion selector on lines 207-220 where `idsKey` is used for `exclude`.

#### L3. `postTitle` builds a detached `<textarea>` per call

`src/blocks/carousel/handpicked-posts.tsx:132-138`. The function decodes entities with `document.createElement( 'textarea' )` and is invoked both inside `PickedRow` (list render) and in the suggestion list render. Fine for up to 25 titles on screen; if the list ever grows, consider caching by rendered HTML.

#### L4. `mode` fallback when switching with `! meta` relies on `getPostType` only

`src/blocks/carousel/handpicked-posts.tsx:230-236` returns early on `latest` + no metadata. Fine. On the first `handpicked` click, `update()` composes `{ mode: 'latest', ids: [], postType: current, mode: 'handpicked' }` (last key wins in object literal spread). Works, but the readability would improve by writing `update( { mode: 'handpicked' } )` only when meta is null and the default-merge object is explicit.

#### L5. Missing explicit test for logged-in viewer

Plan calls out "Published content only, including for logged-in administrators" and the brief lists this as a must-have. The server filter always writes `post_status => 'publish'` unconditionally (`inc/Plugin.php:195`), so the behavior is enforced by construction. There is no PHPUnit assertion that pins this against regressions. A one-liner test exercising the filter under a simulated `current_user_can( 'edit_posts' )` true branch (a mock in Brain Monkey) would lock the invariant.

#### L6. Editor `Prompt` replaces Post Template markup entirely

`src/blocks/carousel/handpicked-posts.tsx:376-383` returns `<div {...useBlockProps()}><Placeholder>…</Placeholder></div>` for the empty and all-stale states. This swaps out the Post Template's own rendering (including its inner blocks, which hold the card design). The PR calls this out under "Observed, not fixed" — the card design cannot be edited while every pick is stale. Flagging again as a known UX gap: an editor who has not realized a post was unpublished will see the prompt instead of their card and may assume data loss.

Consider at least rendering the card design in a disabled/dimmed state or showing the prompt as an overlay rather than a replacement. Not required by the plan.

#### L7. `withHandpickedPosts` filter attaches to `core/query` outside carousels too

The HOC in `src/blocks/carousel/handpicked-posts.tsx:438-450` matches on `props.name === 'core/query'` with no ancestry check, then `QueryEdit` renders `HandpickedControls` only when `inCarousel`. The effect is that `QueryEdit`'s `useEffect` (lines 352-362) runs for every `core/query` in the document — in or out of a carousel — and will clear `rtCarousel.ids` on `postType` change. For a Query that was handpicked and later moved out of a carousel (the plan's "moved-out" case), this is intended; the picker is unreachable, so clearing is a one-way door. Users who move the Query back in will find an empty selection. Low risk; the behavior mirrors the plan's requirement that picks are per-post-type.

#### L8. Test subtleties worth tightening

- `handpicked-posts.test.tsx:382-386` ("passes through when there is no Query ancestor") — the mock `getBlockParentsByBlockName` returns `[ 'query-1' ]` for any name other than the carousel, so `parents.length > 0` is always true in the test suite. The real guard (`parents.length ? … : null`) is never exercised. The assertion still passes because `queryAttributes` is `null` → `meta` is `null` → pass-through. Consider adjusting the mock to return `[]` when the requested block name is not matched by configured state, so the no-ancestor branch is truly covered.
- `HandpickedPostsTest.php` does not include a case where the Query's own `metadata.rtCarousel.postType` differs from `attrs.query.postType` (see M2). Adding that case would document and lock the resolution rule.

### Informational

#### I1. `MAX_HANDPICKED` / `HANDPICKED_LIMIT` duplicated across files

`src/blocks/carousel/handpicked-posts.tsx:25` and `inc/Plugin.php:30` both hardcode 20. Not a problem; worth a single comment in one file linking to the other so future bumps don't drift.

#### I2. The `context: 'view'` key nested inside `query` is intentional but confusing

`src/blocks/carousel/handpicked-posts.tsx:431`. `context` on the outer object is the block context; `query.context: 'view'` is the REST API parameter forwarded by core Post Template when it builds its entity query. A one-line comment would save a future reader 10 minutes.

#### I3. Search is not debounced

The PR description already lists this under "Observed, not fixed". One REST request per keystroke; core-data caches, so the hit is small, but under slow networks the suggestion list will flicker. Acceptable for a first landing.

---

## Verification signals

- PHPUnit: 15 server-side tests covering normalization, scoping, truncation, empty/stale/malformed IDs, nested Queries, and hook registration. Coverage is good.
- Jest: 29 editor-side tests covering mode switching, post-type clearing, picker, suggestions capped at five, selection cap at 20, boundary disables, unavailable rows, loading/empty states, and the `core/post-template` context override. Coverage is good.
- Browser E2E matrix in `handpicked-posts-pr.md` is thorough but **entirely agent-run**; the human re-run gate is explicitly pending. Per the brief's item 16 this must happen before merge.
- Baseline `composer run test:unit` failures (two `PluginTest` block-count assertions) are correctly documented as pre-existing and unrelated. No scope creep into those.

---

## Suggested follow-ups (non-blocking)

1. Scope `filter_handpicked_block_context` to `core/post-template` using the third filter argument. Removes M1 entirely.
2. Add a PHPUnit case exercising divergent `metadata.rtCarousel.postType` vs `attrs.query.postType` (M2).
3. Remove the redundant `postType` write in `filter_handpicked_block_context` (L1).
4. Soften the "does not work" claim in the PR description — the chosen approach is valid on its own merits.
5. Human browser re-run per brief item 16 before marking the PR review-ready.
