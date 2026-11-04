# Handpicked posts for Query Loop carousels

## Summary

Editors can switch a carousel's Query Loop from **Latest posts** (default, unchanged) to **Handpicked posts**: search published posts or pages of the Query's post type, add up to 20, and reorder or remove them with keyboard-operable buttons. The carousel shows exactly those items in that order, in the editor and on the front end, using the existing Post Template card design.

## Implementation

- **Storage:** `core/query` block `metadata.rtCarousel = { mode, ids, postType }`. The Query's own `query` attribute and the saved markup are not touched; missing metadata means Latest and nothing is written on load. Other `metadata` keys are preserved.
- **Editor** (`src/blocks/carousel/handpicked-posts.tsx`): one `editor.BlockEdit` filter.
  - On `core/query` inside a carousel: a "Carousel posts" inspector panel (core components only). Changing `query.postType` clears the picks (both modes).
  - On `core/post-template`: in Handpicked mode the unmodified core component receives a transient `context.query` (`include`, `orderBy: include`, `perPage`, `status: publish`, `inherit: false`). Nothing picked shows "Choose posts to show in this carousel"; all picks unavailable shows "No selected published posts are available". Works after the Query is moved out of a carousel.
- **Server** (`inc/Plugin.php`): while a handpicked Query renders, `render_block_context` swaps the `query` context of its descendants (forces `inherit: false`, attaches normalized picks, max 20) and `query_loop_block_query_vars` returns a fresh, published-only `post__in` query (`orderby: post__in`, no taxonomy/search/author/exclude/offset/sticky carry-over; `[0]` when empty so WordPress never falls back to all posts).
- **Stale IDs:** kept in saved metadata. Deleted, trashed, draft, private or wrong-type IDs simply produce no slide (no gaps); the picker lists them as "Unavailable post (ID n)" with a Remove button, and they count toward the 20 limit.

### Deviation from the plan

The plan set `inherit`/picks from a `render_block_data` filter on `core/query`. That does not work: `WP_Block` computes the context a Query provides in its constructor, before `render_block_data` runs for nested blocks, so the Post Template still saw the original query (confirmed in Playground: latest posts rendered). `render_block_data` + `render_block_core/query` now only track which Query is rendering (a small stack), and `render_block_context` applies the override. The editor uses `getBlockParentsByBlockName` + `getBlockAttributes` rather than `getBlockParents` + `getBlock` (same result, cheaper subscription).

## Automated checks

| Command | Result |
| --- | --- |
| `npm run test:js -- --runInBand` | 414 pass (baseline 387; +27 new in `handpicked-posts.test.tsx`) |
| `composer run test:unit` | 49 tests; 2 failures, both pre-existing (`PluginTest` counts 7 blocks, plugin registers 8). 19 new tests in `HandpickedPostsTest` pass |
| `npm run lint:js` | 50 errors, identical to baseline (all in the untracked `rt-carousel/` checkout; none in `src/`) |
| `npm run lint:css`, `npm run lint:js:types`, `composer run lint`, `composer run phpstan`, `npm run build` | clean |

## Browser E2E (local Playground)

Server: `npm run build && npx @wp-playground/cli@latest server --auto-mount --login --php=8.2` at `http://127.0.0.1:9400` (WordPress 7.1.4, PHP 8.2, Node 25.8.2; plugin active). A second server with `--wp=6.6 --port=9401` (WordPress 6.6.11, the plugin's floor) was used for a smoke check: a handpicked Query with original `inherit: true` and draft/missing IDs rendered the surviving picks in order on the front end and in the editor preview, with stale rows listed as unavailable. Fixtures: 24 posts, 3 pages, a sticky post, a draft, a private post. Anonymous checks used an isolated browser context.

All rows below were run by the **agent** only. **Human re-run: pending** — do not treat this PR as review-ready until a human repeats them.

| # | Item | Editor | Front end | Run by |
| --- | --- | --- | --- | --- |
| 1 | Search/add/remove/reorder, no duplicates, exactly 20, 21st disabled with message | Verified (add by click, Move up, Remove, 20-pick limit message and `aria-describedby`) | 20 slides in saved order | agent |
| 1 | Keyboard operation | Native buttons with accessible names; a real Enter key press on a focused `Move down` reordered the picks and kept focus. Full Tab-through pass not done | n/a | agent (partial) |
| 2 | Exact picks despite perPage 2, `sticky: only`, search filter | Preview matched | 20 slides, sticky first because picked | agent |
| 3 | Live preview matches front end | Order and count matched after add/reorder/save | | agent |
| 4 | Empty selection | Prompt shown | n/a (no slides) | agent |
| 5 | Published only, no gaps, all-stale, admin and anonymous | Trashed/draft/deleted show as Unavailable; survivors render; all-stale prompt | Admin and anonymous: survivors only (also draft/private post IDs) | agent |
| 6 | Default Latest, mode switch, post-type clearing | Page switch cleared picks, prompt shown; Latest write-free on absent metadata (Jest). Template-created Query Loop (core default `inherit: true`) switched to Handpicked | Template-created carousel rendered exactly the picks; Latest unchanged | agent |
| 7 | Editable Post Template card | Card still core Post Template; not edited in this run | | agent (partial) |
| 8 | Navigation, dots, counter, loop, autoplay, fade | Editor counter/dots follow live add/remove | Dots/counter matched survivors for 3, 1 and 1 (stale) slides; autoplay advanced and looped (2/3, 3/3, 1/3); fade + loop Next wrapped correctly; zero survivors: no slides; no console errors | agent |
| 9 | Latest after switching | | Latest query renders as before | agent |
| 10 | Existing content, moved-out Handpicked Query | Preview override works outside a carousel, no picker | Renders picks outside a carousel | agent |
| 11 | Accessible names | See item 1 | | agent (partial) |

Not covered: the viewport "Add Query Loop" entry point (creates the same plain `core/query`), editing Post Template card content, screen reader testing, a full Tab-through keyboard pass, and Embla `slideNodes()`/`scrollSnapList()` inspected directly (dot/counter counts used as a proxy).

## Observed, not fixed

- Editor with all picks stale hides the Post Template card (prompt only), so card design cannot be edited until a valid post is picked.
- In the editor, core's Post Template renders the active post twice (one hidden), so the editor carousel counter shows N+1; this is identical for Latest queries and pre-existing.
- Search is not debounced: one REST request per keystroke (cached by core-data).
- `PluginTest` expects 7 registered blocks (pre-existing, unrelated).
