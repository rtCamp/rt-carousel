import type { EmblaOptionsType } from 'embla-carousel';

export const normalizeContainScroll = (
	value: unknown,
): NonNullable<EmblaOptionsType['containScroll']> => {
	if ( value === 'trimSnaps' || value === 'keepSnaps' ) {
		return value;
	}

	if ( value === '' ) {
		return false;
	}

	return 'trimSnaps';
};

/**
 * Fade requires align: 'center' and containScroll: false to render
 * correctly, and stacking makes dragFree/multi-slide slidesToScroll
 * meaningless. See https://www.embla-carousel.com/docs/plugins/fade
 *
 * @param {EmblaOptionsType} options    Base Embla options.
 * @param {'slide'|'fade'}   transition Active transition style.
 */
export const applyTransitionOverrides = (
	options: EmblaOptionsType,
	transition: 'slide' | 'fade',
): EmblaOptionsType => {
	if ( transition !== 'fade' ) {
		return options;
	}

	return {
		...options,
		align: 'center',
		containScroll: false,
		dragFree: false,
		slidesToScroll: 1,
	};
};

/**
 * Tabs mode stacks every panel in one grid cell, so all slides share the
 * same offset. Embla's default trimSnaps would then merge them into a
 * single snap on reInit (e.g. window resize), collapsing the tab list to
 * one tab and clamping tab clicks to index 0. Keep one snap per panel.
 *
 * @param {EmblaOptionsType} options Base Embla options.
 * @param {boolean}          useTabs Whether the carousel is in tabs mode.
 */
export const applyTabsOverrides = (
	options: EmblaOptionsType,
	useTabs: boolean,
): EmblaOptionsType => {
	if ( ! useTabs ) {
		return options;
	}

	return {
		...options,
		containScroll: false,
		dragFree: false,
		slidesToScroll: 1,
	};
};
