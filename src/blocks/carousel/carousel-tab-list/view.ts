import { getContext, getElement, store } from '@wordpress/interactivity';
import type { TabContext } from './types';

type CarouselStore = {
	actions: {
		onDotClick?: () => void;
	};
	callbacks: {
		isDotActive?: () => boolean;
	};
};

type TabKeys = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown' | 'Home' | 'End';

/**
 * Extends rt-carousel/carousel store — reuses onDotClick/isDotActive/scrollSnaps as-is.
 *
 * Store merge safety: @wordpress/interactivity's `store()` merges namespaces
 * idempotently. If this file evaluates before the parent carousel's view.ts,
 * the parent's later call extends the same store (and vice versa). Order does
 * not matter.
 */
store( 'rt-carousel/carousel', {
	actions: {
		/**
		 * WAI-ARIA Tabs Pattern keyboard navigation.
		 * Ref: https://www.w3.org/WAI/ARIA/apg/patterns/tabpanel/#keyboardinteraction
		 * @param {KeyboardEvent} event - Keyboard event from the focused tab button.
		 */
		onTabKeydown: ( event: KeyboardEvent ) => {
			const key = event.key as TabKeys;
			const horiz = new Set<TabKeys>( [ 'ArrowLeft', 'ArrowRight', 'Home', 'End' ] );
			const vert = new Set<TabKeys>( [ 'ArrowUp', 'ArrowDown', 'Home', 'End' ] );
			if ( ! horiz.has( key ) && ! vert.has( key ) ) {
				return;
			}

			const el = getElement();
			const ref = el?.ref ?? null;
			if ( ! ref ) {
				return;
			}
			const tablist = ref.closest< HTMLElement >(
				'.wp-block-rt-carousel-carousel-tab-list',
			);
			if ( ! tablist ) {
				return;
			}
			const tabs = Array.from(
				tablist.querySelectorAll< HTMLButtonElement >(
					'.wp-block-rt-carousel-carousel-tab-list__tab',
				),
			);
			const currentIndex = tabs.indexOf( ref as HTMLButtonElement );
			if ( currentIndex === -1 ) {
				return;
			}

			event.preventDefault();
			let nextIndex = currentIndex;
			if ( key === 'ArrowRight' || key === 'ArrowDown' ) {
				nextIndex = ( currentIndex + 1 ) % tabs.length;
			} else if ( key === 'ArrowLeft' || key === 'ArrowUp' ) {
				nextIndex = ( currentIndex - 1 + tabs.length ) % tabs.length;
			} else if ( key === 'Home' ) {
				nextIndex = 0;
			} else if ( key === 'End' ) {
				nextIndex = tabs.length - 1;
			}

			tabs[ nextIndex ]?.focus();
			tabs[ nextIndex ]?.click();
		},
	},
	callbacks: {
		getKeyFeatureDotText: (): string => {
			const context = getContext< TabContext >();
			const index = context.snap?.index ?? 0;
			const label = context.dotLabels?.[ index ];
			const trimmed = label?.trim();
			return trimmed ? trimmed : String( index + 1 );
		},
		getTabAriaControls: (): string => {
			const context = getContext< TabContext >();
			const index = context.snap?.index ?? 0;
			return `rt-carousel-panel-${ context.carouselId }-${ index }`;
		},
		getTabId: (): string => {
			const context = getContext< TabContext >();
			const index = context.snap?.index ?? 0;
			return `rt-carousel-tab-${ context.carouselId }-${ index }`;
		},
		/* Roving tabindex: only the active tab is in the tab order (tabindex=0),
		 * inactive tabs are focusable only via arrow keys (tabindex=-1). */
		getTabTabIndex: (): string => {
			const context = getContext< TabContext >();
			const snapIndex = context.snap?.index;
			if ( typeof snapIndex !== 'number' ) {
				return '-1';
			}
			const selectedIndex =
				typeof context.selectedIndex === 'number' && context.selectedIndex >= 0
					? context.selectedIndex
					: 0;
			const isActive = selectedIndex === snapIndex;
			return isActive ? '0' : '-1';
		},
	},
} as CarouselStore );

