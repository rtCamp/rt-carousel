import type { CarouselAttributes } from './types';

export const MIN_SLIDES_PER_VIEW = 1;
export const MAX_SLIDES_PER_VIEW = 6;

/**
 * Effective "Slides per view" count as a CSS-ready string, or undefined when the
 * setting is unset and the carousel should keep its default width rules
 * (block styles / template columns). An explicit 1 is returned so it can
 * override those rules. Fade and tabs stack every slide in the same place,
 * so they always show one.
 *
 * @param {CarouselAttributes} attributes Carousel block attributes.
 */
export const getSlidesPerView = (
	attributes: Pick<CarouselAttributes, 'slidesPerView' | 'transition' | 'useTabs'>,
): string | undefined => {
	const { slidesPerView, transition, useTabs } = attributes;

	if ( useTabs || transition === 'fade' || ! slidesPerView || slidesPerView < MIN_SLIDES_PER_VIEW ) {
		return undefined;
	}

	return String( Math.min( Math.floor( slidesPerView ), MAX_SLIDES_PER_VIEW ) );
};

/**
 * Inline CSS variables for the carousel wrapper, shared by edit and save so the
 * editor and the front end always render the same layout.
 *
 * @param {CarouselAttributes} attributes Carousel block attributes.
 */
export const getCarouselStyle = (
	attributes: Pick<
		CarouselAttributes,
		'slideGap' | 'axis' | 'height' | 'slidesPerView' | 'transition' | 'useTabs'
	>,
): React.CSSProperties =>
	( {
		'--rt-carousel-gap': `${ attributes.slideGap }px`,
		'--rt-carousel-height': attributes.axis === 'y' ? attributes.height : undefined,
		'--rt-carousel-slides-per-view': getSlidesPerView( attributes ),
	} ) as React.CSSProperties;
