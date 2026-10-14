import type { EmblaOptionsType } from 'embla-carousel';
import type { CarouselAttributes } from './types';

export const MIN_SLIDES_PER_VIEW = 1;
export const MAX_SLIDES_PER_VIEW = 6;

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
 * Effective "Slides per view" count as a CSS-ready string, or undefined when the
 * carousel should keep its default width rules (block styles / template columns).
 * Fade and tabs stack every slide in the same place, so they always show one.
 *
 * @param {CarouselAttributes} attributes Carousel block attributes.
 */
export const getSlidesPerView = (
	attributes: Pick<CarouselAttributes, 'slidesPerView' | 'transition' | 'useTabs'>,
): string | undefined => {
	const { slidesPerView, transition, useTabs } = attributes;

	if ( useTabs || transition === 'fade' || slidesPerView <= MIN_SLIDES_PER_VIEW ) {
		return undefined;
	}

	return String( Math.min( Math.floor( slidesPerView ), MAX_SLIDES_PER_VIEW ) );
};
