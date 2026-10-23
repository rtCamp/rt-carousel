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
