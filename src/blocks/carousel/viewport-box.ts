import { CAROUSEL_SLIDE_SELECTOR } from './dynamic-list-selectors';

/**
 * Publishes the slides' content box on the `.rt-carousel` root for Overlay / Outside
 * Controls (#143); it stops at the lowest slide content, so trailing margins and the
 * editor's slide min-height are left out.
 *
 * @param {HTMLElement} viewport The `.embla` viewport.
 * @return {() => void} Stops observing.
 */
export const observeViewportBox = ( viewport: HTMLElement ): ( () => void ) => {
	const root = viewport.closest<HTMLElement>( '.rt-carousel' );

	if ( ! root || typeof ResizeObserver === 'undefined' ) {
		return () => {};
	}

	const lastBlocks = () =>
		Array.from( viewport.querySelectorAll<HTMLElement>( CAROUSEL_SLIDE_SELECTOR ) )
			.map( ( slide ) => slide.lastElementChild )
			.filter( ( el ): el is Element => !! el );

	const observer = new ResizeObserver( () => sync() );

	const sync = () => {
		const top = viewport.getBoundingClientRect().top;
		const blocks = lastBlocks();
		const contentBottom = Math.max(
			0,
			...blocks.map( ( el ) => el.getBoundingClientRect().bottom - top ),
		);
		const size = contentBottom > 0 ? contentBottom : viewport.offsetHeight;
		const offset = top - root.getBoundingClientRect().top - root.clientTop;

		root.style.setProperty( '--rt-carousel-viewport-offset', `${ offset }px` );
		root.style.setProperty( '--rt-carousel-viewport-block-size', `${ size }px` );
		blocks.forEach( ( el ) => observer.observe( el ) );
	};

	observer.observe( viewport );
	observer.observe( root );
	sync();

	return () => observer.disconnect();
};
