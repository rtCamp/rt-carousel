# Data API & Development

This block uses the **WordPress Interactivity API** to manage state and logic. You can consume this state in your own custom blocks to build advanced features like progress bars, slide counters, or synchronized sliders.

## Store Namespace
`rt-carousel/carousel`

## Embla Initialization Filters

rtCarousel exposes JavaScript filters immediately before calling `EmblaCarousel( viewport, options, plugins )`, allowing runtime customization without changing saved block markup.

```js
import { addFilter } from '@wordpress/hooks';
import AutoHeight from 'embla-carousel-auto-height';

addFilter(
    'rtcamp.rtCarousel.emblaOptions',
    'my-plugin/custom-options',
    ( options ) => ( { ...options, duration: 40 } )
);

addFilter(
    'rtcamp.rtCarousel.emblaPlugins',
    'my-plugin/auto-height',
    ( plugins ) => [ ...plugins, AutoHeight() ]
);
```

Both filter callbacks receive the filtered value as their first argument and the filter context object as their second argument. `rtcamp.rtCarousel.emblaPlugins` also receives the filtered options on the `options` property of this object.

rtCarousel also exposes an action after Embla has initialized so integrations can call Embla methods or subscribe to Embla events:

```js
import { addAction } from '@wordpress/hooks';

addAction(
    'rtcamp.rtCarousel.emblaInit',
    'my-plugin/custom-events',
    ( embla, { root } ) => {
        embla.on( 'select', () => {
            root.dataset.selectedSlide = embla.selectedScrollSnap().toString();
        } );
    }
);
```

| Property | Type | Description |
| :--- | :--- | :--- |
| `context` | `CarouselContext` | Interactivity API context for the carousel. |
| `root` | `HTMLElement` | Root `.rt-carousel` element. |
| `viewport` | `HTMLElement` | Embla viewport element. |
| `dynamicListContainer` | `HTMLElement \| null` | Query Loop or Terms Query template container when present. |
| `options` | `EmblaOptionsType` | Passed to `rtcamp.rtCarousel.emblaPlugins` and `rtcamp.rtCarousel.emblaInit`; contains filtered options. |
| `plugins` | `EmblaPluginType[]` | Only passed to `rtcamp.rtCarousel.emblaInit`; contains filtered plugins. |

## Context (`CarouselContext`)

The following properties are exposed in the Interactivity API context:

| Property           | Type       | Description                                                                                          |
| :----------------- | :--------- | :--------------------------------------------------------------------------------------------------- |
| `isPlaying`        | `boolean`  | `true` if Autoplay is currently running.                                                             |
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
