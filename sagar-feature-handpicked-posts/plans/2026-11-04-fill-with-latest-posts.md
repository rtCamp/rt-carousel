# Fill with Latest Posts Implementation Plan

> **For agentic workers:** Implement task by task; check boxes as work completes. This plan covers only [Post Assessment Addendum Task.md](Post%20Assessment%20Addendum%20Task.md) and depends on the existing handpicked implementation. Work in repository root, not untracked `rt-carousel/` checkout.

**Goal:** In Handpicked mode, optionally fill carousel to a chosen count with newest published posts of the same type, after available picks, identically in editor preview and front end.

**Architecture:** Extend existing `core/query` `metadata.rtCarousel` with `fillWithLatest` and `numberOfPosts`, leaving Query attributes and saved markup unchanged. When fill is off, keep current handpicked query/preview paths; when on, resolve published selected IDs, then query newest published same-type posts excluding picks for remaining slots. Pass resulting ordered IDs to existing core Post Template (REST `include`/`orderby: include` in editor; `post__in`/`orderby: post__in` on server). No new carousel renderer, block type, or carousel runtime changes.

**Tech Stack:** WordPress 6.6+, PHP 8.2+, existing TypeScript/React + Gutenberg packages, PHPUnit/Brain Monkey, Jest/Testing Library, Embla 8.6.0.

## Global Constraints

- Addendum items 18–25 apply alongside original items 1–17; items 2 and 4 describe fill-off behavior. Preserve all original behavior in Latest mode and Handpicked mode with fill off, including moved-out handpicked Query Loops.
- Fill defaults off. `numberOfPosts` defaults 6, clamps to integer 1–20; applies only when fill is on. Keep existing limit of at most 20 picks and five picker suggestions; these are separate limits.
- Only published posts/pages of Query Loop's selected post type count, even for logged-in administrators. Other Query settings, sticky priority, pagination and picks' original status never influence fill.
- Existing `metadata.rtCarousel` records `{ mode, ids, postType }` remain valid; preserve those fields and unrelated metadata. Never rewrite saved content just to materialize defaults.
- Use existing Gutenberg controls with accessible names and keyboard operation. Reuse existing Post Template and Embla behavior. Consult [Embla docs](https://www.embla-carousel.com/docs) and [v8 reference](https://www.embla-carousel.com/docs/v8) for dynamic slide changes; plugin pins v8.6.0, whereas unversioned docs describe v9 RC.
- Browser verification uses `npm run build` then `npx @wp-playground/cli@latest server --auto-mount --login --php=8.2` from repository root. Do not use `wp-env`.

## File map and data contract

| File | Responsibility |
| --- | --- |
| `src/blocks/carousel/handpicked-posts.tsx` | Extend `RtCarouselMeta`, inspector, and Post Template preview; reuse `usePublishedPicks`, existing Query/Post Template wrappers. |
| `inc/Plugin.php` | Carry optional fill config through existing render-time stack/context; construct same ordered published ID sequence for core Post Template query. |
| `src/blocks/carousel/__tests__/handpicked-posts.test.tsx` | Mode/setting controls, ID composition and live preview regression tests. |
| `tests/php/Unit/HandpickedPostsTest.php` | Brain Monkey tests for normalization, query arguments and selected/fill ordering. |
| `handpicked-posts-pr.md` | Update PR description with addendum implementation, checks, observed issues and human/agent attribution; do not mark unchecked items as run. |

**Storage:** `metadata.rtCarousel = { mode, ids, postType, fillWithLatest?: boolean, numberOfPosts?: number }`. Absence means `false` and `6` respectively; save changes to either setting without discarding picks or other metadata. Retain `numberOfPosts` when fill is off for future switching. Malformed stored values normalize to default 6; finite integers below 1 or above 20 clamp to 1 or 20. Write this rule into both PHP and TS implementations; do not change unrelated metadata.

**Ordered IDs with fill on:** Let `N = numberOfPosts`; take first `N` IDs from the *published, correctly typed* selected posts in saved order (deleted/draft/private/trashed picks consume no slots). If fewer than `N`, fetch `N - survivorCount` newest published posts of selected type excluding **all selected IDs**, descending by publish date; concatenate. If fewer posts exist than needed, use what exists. Build final Post Template query from that concatenated array; for no matches use `post__in: [0]` server-side and an editor empty prompt. Filter duplicate picks once using existing normalization; do not mutate saved IDs. A picked post never appears twice.

---

### Task 1: Baseline and integration check

**Files:** No source edits.

- [ ] Run targeted baseline `npm run test:js -- --runInBand src/blocks/carousel/__tests__/handpicked-posts.test.tsx` and `vendor/bin/phpunit tests/php/Unit/HandpickedPostsTest.php`; record existing failures. Review `Plugin::filter_handpicked_block_data`, `filter_handpicked_block_context`, `filter_handpicked_query_vars` and `PostTemplateEdit`/`usePublishedPicks` so additions follow their actual data flow. Check `tests/php/stubs.php` for `WP_Block` constructor/context shape.
- [ ] Check WordPress 6.6 `get_posts()` `fields => 'ids'`, `post__in`, `post__not_in`, `orderby => 'post__in'`, `post_status => 'publish'`, and `ignore_sticky_posts` behavior. Verify `core/post-template` REST preview forwards Query context `include`, `exclude`, `perPage`, `status`, `orderBy`; avoid relying on Query's saved taxonomy/search/offset/author settings. Inspect existing Embla v8 editor observer/reInit behavior for changed post counts.

### Task 2: Front-end ordered picks and fill

**Files:** Modify `inc/Plugin.php:27-199`; extend `tests/php/Unit/HandpickedPostsTest.php`.

**Consumes:** Existing handpicked stack and render-time context marker. **Produces:** `filter_handpicked_query_vars()` yielding `post__in` in final displayed order; no new public API or endpoint.

- [ ] Write failing PHPUnit/Brain Monkey cases: metadata absent and Latest mode preserve incoming query vars; Handpicked fill off preserves existing exact-picks behavior and never calls `get_posts`; fill on with default 6 and 2 picks yields pick IDs followed by 4 newest IDs; explicitly set 1 and 20 work; 0/21 clamp and invalid values default to 6; >N valid picks render first N only; missing/draft/private/trashed picks are replaced by fill; empty picks show latest; fewer available posts return only available IDs; page type works; sticky/latest Query filters cannot displace or inject results; no duplicate IDs; final `post_status` stays `publish` for admin too. Stub `get_posts` with Brain Monkey to assert both query phases and return deterministic ID lists; PHP unit tests cannot run `WP_Query`, so verify rendered output separately in Task 4.
- [ ] Run `vendor/bin/phpunit tests/php/Unit/HandpickedPostsTest.php`; verify new cases fail against current behavior.
- [ ] Extend `get_handpicked_picks()` or its returned stack record so `filter_handpicked_block_context()` can attach fill flag and normalized count along with IDs under the existing render-only query marker, without changing parsed/saved block attributes. Preserve nested Query stack isolation and unchanged Latest behavior. Update stack annotation to match new shape.
- [ ] For fill-on only, in `filter_handpicked_query_vars()` resolve published picks via `get_posts( [ 'post_type' => $post_type, 'post_status' => 'publish', 'post__in' => $ids ?: [0], 'orderby' => 'post__in', 'posts_per_page' => count($ids), 'fields' => 'ids', 'ignore_sticky_posts' => true, 'suppress_filters' => true ] )` when IDs exist. Slice survivors to N; if fewer, query `get_posts()` for remaining IDs with same type/status, `post__not_in => $ids`, `posts_per_page => N - count($survivors)`, `orderby => 'date'`, `order => 'DESC'`, `fields => 'ids'`, `ignore_sticky_posts => true`, `suppress_filters => true`. Avoid querying picked posts when there are none and avoid the fill request when already full. Normalize returned IDs, preserve order, and return a **fresh** query-var array with `post__in => $final_ids ?: [0]`, `orderby => 'post__in'`, `posts_per_page => max( 1, count($final_ids) )`, selected `post_type`, `post_status => 'publish'`, `ignore_sticky_posts => true`, `no_found_rows => true`, `offset => 0`. Keep fill-off branch byte-for-byte behavior where possible. If query posts change between resolution and core's render query, its final published-only query may return fewer posts, never extras.
- [ ] Run targeted PHPUnit, then `composer run test:unit`, `composer run lint` and `composer run phpstan`. Record any baseline failures separately; fix new failures. Commit only on explicit user request.

### Task 3: Accessible settings and editor preview parity

**Files:** Modify `src/blocks/carousel/handpicked-posts.tsx:30-439`; extend `src/blocks/carousel/__tests__/handpicked-posts.test.tsx`.

**Consumes:** `metadata.rtCarousel.fillWithLatest` / `numberOfPosts` and existing `usePublishedPicks()` result. **Produces:** live transient `context.query.include` ordered exactly like server `post__in`, while retaining core Post Template card editor.

- [ ] Write failing Jest/Testing Library tests: fill toggle off by default; changing it or count preserves IDs, mode, post type and unrelated metadata; count control appears only with fill on, is labelled “Number of posts”, shows default 6 and enforces 1–20 through keyboard; stored malformed/0/21 counts normalize; fill off still shows existing no-picks/unavailable prompt and original exact picks. Fill on with two survivors and N=6 requests four newest same-type published records, excluding all picks; result `[p2,p1,l4,l3,l2,l1]` passes to Post Template in exactly that order; >N picks truncates without fetching fill; one stale pick is replaced; zero picks shows newest N, or empty prompt if none published; fewer published posts show fewer slides; switches/reorders/removes/count changes immediately update query; Latest mode and Query outside carousel regressions remain covered.
- [ ] Run `npm run test:js -- --runInBand src/blocks/carousel/__tests__/handpicked-posts.test.tsx`; verify new assertions fail before edits.
- [ ] Extend `RtCarouselMeta` with optional fields and add a single shared TypeScript count normalizer used by controls and preview. Add Gutenberg `ToggleControl` labelled “Fill with latest posts” and `RangeControl` labelled “Number of posts” (`min={1}`, `max={20}`, `value={count}`, `onChange` writes clamped value). Show both only while Handpicked; show number only while fill is on. **Fix existing `HandpickedControls.update()`**: it currently rebuilds `{ mode, ids, postType, ...next }` and would discard the new fields on add/remove/reorder/mode switch. Instead merge `{ ...attributes.metadata?.rtCarousel, mode, ids, postType, ...next }` inside preserved `metadata`. Retain both settings when switching Latest and back; no changes to five-suggestion picker or 20-pick cap.
- [ ] In `PostTemplateEdit`, keep existing `usePublishedPicks()` for live published survivors; when fill on, fetch up to `N - min(N, survivors.length)` latest published same-type records with `getEntityRecords('postType', postType, { status: 'publish', per_page: remaining, order: 'desc', orderby: 'date', exclude: ids })`. Request only if remaining > 0; `null` means loading, `[]` means no more published posts. Compose `survivors.slice(0, N).map(p => p.id)` then latest IDs, and pass `context.query = { postType, include: composedIds, orderBy: 'include', perPage: composedIds.length, inherit: false, offset: 0, status: 'publish', context: 'view' }` to existing `<BlockEdit>`. Exclude all picked IDs even if unavailable; preserve existing no-picks prompt only for fill off. In fill-on mode with zero final IDs, show empty prompt, never issue `include: []` (core would select all posts). Keep hooks unconditionally invoked, and distinguish loading from empty so previous/latest results never flash in preview. Compare returned IDs/order against Task 2 in browser using fixtures with distinct publish timestamps; posts sharing a timestamp have no specified tie order.
- [ ] Run targeted Jest, full `npm run test:js -- --runInBand`, `npm run lint:js`, `npm run lint:js:types`, `npm run lint:css`, and `npm run build`; compare failures to baseline. Check no block validation errors and editor preview retains Post Template card design.

### Task 4: Playground acceptance and PR evidence

**Files:** Update `handpicked-posts-pr.md`; source/test fixes only for confirmed regressions.

- [ ] Build with `npm run build`; from repo root start `npx @wp-playground/cli@latest server --auto-mount --login --php=8.2` and verify WP ≥6.6/plugin active. Create >20 published posts, at least two pages, a sticky post, and picked draft/private/trashed/deleted cases. Playground is ephemeral; recreate fixtures after restart.
- [ ] In browser, inspect editor **and** front end for items 18–25: default off/count 6, keyboard-accessible toggle and 1–20 count; picks then newest nonpicked in date order; sticky/category/order/search/offset/per-page settings ignored in fill; >N picks truncated; unavailable picks replaced; insufficient posts; no picks; immediate update on pick, mode, fill toggle, count and post type changes. Compare anonymous and logged-in admin/editor output and published-only enforcement. Repeat fill-off items 2/4, existing carousel and moved-out Query regression checks (items 5–11). Verify saved/reloaded content, core Post Template customization, Embla v8 slide/dot/snap counts, navigation, loop and autoplay with zero/one/many slides; use [Embla v8 methods](https://www.embla-carousel.com/docs/v8/api/methods) before modifying carousel lifecycle.
- [ ] Re-run `npm run test:js -- --runInBand`, `composer run test:unit`, `npm run lint:js`, `npm run lint:css`, `npm run lint:js:types`, `composer run lint`, `composer run phpstan`, `npm run build`. Record baseline versus new failures, including unrelated existing findings.
- [ ] Extend `handpicked-posts-pr.md` with addendum rationale and item-by-item 18–25 editor/front-end browser matrix; item 13 automated cases 19–23; item 15 browser checks 18–25; item 16 per-check **human / agent / both** attribution. Do not claim human checks unless human actually repeated them, including browser use. Fix in-scope findings; list every other feature-related issue under **Observed, not fixed** with reproduction steps. Keep PR review-readiness pending until human verification gate completes.

## Acceptance coverage

| Addendum item | Planned proof |
| --- | --- |
| 18 Fill off, count default/range, accessibility | Task 3 Jest + Task 4 keyboard browser check |
| 19 Ordered picks then unique newest fill | Tasks 2/3 tests + Task 4 editor/front-end comparison |
| 20 Same type only; ignore other Query settings and sticky priority | Task 2 query assertions + Task 4 browser |
| 21 More picks than count | Tasks 2/3 tests + Task 4 browser |
| 22 Unavailable picks replaced | Tasks 2/3 tests + Task 4 browser per status |
| 23 Too few posts | Tasks 2/3 tests + Task 4 browser |
| 24 No picks yields newest posts | Task 3 Jest + Task 4 editor/front-end browser |
| 25 Exact live editor parity | Task 3 Jest + Task 4 change/reload browser check |
| Original 5–11, 13–17 | Task 4 regressions, automated suite, attributed browser matrix and issues list |
