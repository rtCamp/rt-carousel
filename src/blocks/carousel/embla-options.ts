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
 * Fade and tabs mode both stack every slide in one grid cell, so all slides
 * share the same offset. Embla's default trimSnaps would then merge them into
 * a single snap (e.g. on reInit after a window resize), collapsing the tab
 * list to one tab, and dragFree/multi-slide slidesToScroll are meaningless.
 * Fade additionally requires align: 'center'.
 * See https://www.embla-carousel.com/docs/plugins/fade
 *
 * @param {EmblaOptionsType} options         Base Embla options.
 * @param {Object}           mode            Carousel mode.
 * @param {'slide'|'fade'}   mode.transition Active transition style.
 * @param {boolean}          mode.useTabs    Whether the carousel is in tabs mode.
 */
export const applyStackedOverrides = (
	options: EmblaOptionsType,
	{ transition, useTabs }: { transition: 'slide' | 'fade'; useTabs: boolean },
): EmblaOptionsType => {
	const isFade = transition === 'fade';
	if ( ! isFade && ! useTabs ) {
		return options;
	}

	return {
		...options,
		...( isFade ? { align: 'center' as const } : {} ),
		containScroll: false,
		dragFree: false,
		slidesToScroll: 1,
	};
};
