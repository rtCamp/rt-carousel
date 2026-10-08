import type { CarouselControlsPosition } from '../types';

const BASE_CLASS = 'rt-carousel-controls';

/**
 * Build the Controls wrapper class list for a given arrow position.
 *
 * The default `below` position returns ONLY the base class so that existing
 * saved blocks (which serialize no `position` attribute) keep byte-identical
 * markup and stay valid. Overlay/outside add a single modifier class that the
 * stylesheet keys off.
 *
 * @param {CarouselControlsPosition} [position] Selected arrow position; falsy/`below` yields the base class.
 * @return {string} Space-separated class string for the Controls wrapper.
 */
export function getPositionClassName(
	position?: CarouselControlsPosition,
): string {
	if ( position === 'overlay' || position === 'outside' ) {
		return `${ BASE_CLASS } is-position-${ position }`;
	}
	return BASE_CLASS;
}
