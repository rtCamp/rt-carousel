# Data API & Development

This block uses the **WordPress Interactivity API** to manage state and logic. You can consume this state in your own custom blocks to build advanced features like progress bars, slide counters, or synchronized sliders.

## Store Namespace
`rt-carousel/carousel`

## Context (`CarouselContext`)

The following properties are exposed in the Interactivity API context:

| Property           | Type       | Description                                                                                          |
| :----------------- | :--------- | :--------------------------------------------------------------------------------------------------- |
| `transition`       | `'slide'` or `'fade'` | The active transition style; determines whether the Fade plugin is loaded.               |
| `isPlaying`        | `boolean`  | `true` if Autoplay or Auto Scroll is currently running.                                              |
| `timerIterationId` | `number`   | Increments every time the Autoplay timer resets (slide change). Bind to `key` to restart animations. |
| `autoplay`         | `boolean` or `{ delay, ... }` | Autoplay config or `false` if disabled. |
| `canScrollPrev`    | `boolean`  | `true` if there are previous slides (or looping).                                                    |
| `canScrollNext`    | `boolean`  | `true` if there are next slides (or looping).                                                        |
| `selectedIndex`    | `number`   | The zero-based index of the current slide.                                                           |
| `scrollSnaps`      | `{ index: number }[]` | List of snap points (used by Dots block).                                                       |

---

## Examples

### 1. Custom Progress Bar Block

Create a progress bar that animates while the carousel is auto-playing.

**save.tsx**
```jsx
<div
    data-wp-interactive="rt-carousel/carousel"
    data-wp-bind--key="context.timerIterationId"
    data-wp-bind--style="state.barDuration"
    data-wp-class--is-playing="context.isPlaying"
    className="core-progress-bar"
/>
```

**view.ts**
```js
store('rt-carousel/carousel', {
    state: {
        get barDuration() {
            const { autoplay } = getContext();
            return `--duration: ${autoplay?.delay || 4000}ms;`;
        }
    }
});
```

**CSS**
```css
.core-progress-bar.is-playing {
    animation: grow var(--duration) linear forwards;
}
@keyframes grow { from { width: 0%; } to { width: 100%; } }
```

### 2. Styling Active Slide Content

Highlight slide content when active using the `callbacks.isSlideActive` helper.

```jsx
<div
    data-wp-interactive="rt-carousel/carousel"
    data-wp-class--is-active="callbacks.isSlideActive"
    className="my-card"
>
    <h2 data-wp-class--highlight="callbacks.isSlideActive">Card Title</h2>
</div>
```

---

## Handpicked Posts

A Query Loop inside a carousel can show a fixed, ordered list of posts instead of the latest ones. The selection is stored on the `core/query` block; no new block type is introduced and saved markup does not change.

### Stored shape

```json
{
  "metadata": {
    "rtCarousel": { "mode": "handpicked", "ids": [29, 27, 25], "postType": "post" }
  }
}
```

| Key | Description |
| --- | --- |
| `mode` | `"latest"` or `"handpicked"`. Missing `metadata.rtCarousel` means Latest. |
| `ids` | Ordered post IDs. Only the first 20 unique positive integers are used; others are ignored. |
| `postType` | Post type the IDs were picked for. Changing the Query's `query.postType` clears `ids`. |

The Query's own `query` attribute is never modified, and other `metadata` keys are preserved on update. Stale IDs (deleted, unpublished, wrong type) are kept in `ids` until an editor removes them.

### Server rendering (`inc/Plugin.php`)

| Hook | Callback | Purpose |
| --- | --- | --- |
| `render_block_data` | `filter_handpicked_block_data` | On each `core/query`, records its normalized picks (or `null`) on an internal stack. The parsed block is returned unchanged. |
| `render_block_core/query` (priority 0) | `pop_handpicked_query` | Pops the stack when that Query finishes rendering. |
| `render_block_context` | `filter_handpicked_block_context` | For blocks inside a handpicked Query that receive `query` context, forces `inherit` to `false` and attaches the picks under the render-time key `rtCarouselHandpickedIds`. |
| `query_loop_block_query_vars` (3 args) | `filter_handpicked_query_vars` | When that key is present, returns a fresh query: `post_type`, `post__in` (picks in order, or `[0]` when empty so WordPress never matches all posts), `orderby => post__in`, `posts_per_page => max(1, count)`, `post_status => publish`, `ignore_sticky_posts`, `no_found_rows`, `offset => 0`. Taxonomy, search, author, exclude, pagination and sticky settings are not carried over. |

The context is adjusted in `render_block_context` rather than `render_block_data` because `WP_Block` computes the context a Query provides when it is constructed, before `render_block_data` runs for nested blocks.

### Editor (`src/blocks/carousel/handpicked-posts.tsx`)

One `editor.BlockEdit` filter, registered as `rt-carousel/handpicked-posts`:

- **`core/query` inside `rt-carousel/carousel`:** adds the **Carousel posts** inspector panel (mode, selected list with reorder/remove, search, suggestions). Suggestions request `status: 'publish'`, `per_page: 5`, `order: 'desc'`, `orderby: 'date'` (plus `search` when typing, and `exclude` of the current picks so five stay available). Selected titles are resolved with a separate published-only `include` request.
- **`core/post-template`:** in Handpicked mode the core component receives a transient `context.query` (`include`, `orderBy: 'include'`, `perPage`, `inherit: false`, `offset: 0`, `status: 'publish'`) so the preview matches the front end. This works regardless of carousel ancestry. With no picks, or when none are published, an editor-only prompt replaces the preview. Latest mode passes props through untouched.

---

## Technical Notes

### Editor Interactivity: "Find & Bind"
Gutenberg's `InnerBlocks` can isolate React Contexts, causing state sync issues between parent and deeply nested children in the editor. To guarantee reliable interactivity:
1. **Attach**: The Viewport component attaches the vanilla Embla instance directly to its DOM node using a Symbol key: `element[Symbol.for("rt-carousel.carousel")] = embla`.
2. **Find**: Child components (Controls/Dots) attempt to find the API via Context first. If missing, they traverse the DOM up to the common wrapper (`.rt-carousel`) and then search for the sibling `.embla` viewport.
3. **Bind**: A retry mechanism (`setTimeout` + `useEffect`) ensures the Viewport has finished initializing before binding listeners.

### Dots Implementation
The Carousel Dots block demonstrates a pattern for iterating over data with the Interactivity API:
1. **Data Source**: `context.scrollSnaps` is populated in `view.ts` by mapping Embla's snap list to objects: `[{ index: 0 }, { index: 1 }, ...]`.
2. **The Loop**:
    ```html
    <template data-wp-each--snap="context.scrollSnaps">
      <button data-wp-class--is-active="callbacks.isDotActive" ... />
    </template>
    ```
    The `--snap` suffix names the iterator variable.
3. **Why Objects?** The Interactivity API's loop directive does not expose a separate `index` variable. To check if a dot is active (`selectedIndex === currentDotIndex`), we include the index explicitly inside the data object (`context.snap.index`).
