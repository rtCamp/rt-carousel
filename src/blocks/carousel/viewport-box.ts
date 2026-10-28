import { CAROUSEL_SLIDE_SELECTOR } from './dynamic-list-selectors';

/**
 * Publishes the slides' content box on the `.rt-carousel` root for Overlay / Outside
 * Controls (#143); it spans the slide content only, so trailing margins, vertical
 * alignment and the editor's slide min-height do not shift the arrows.
 *
 * @param {HTMLElement} viewport The `.embla` viewport.
 * @return {() => void} Stops observing.
 */
export const observeViewportBox = ( viewport: HTMLElement ): ( () => void ) => {
	const root = viewport.closest<HTMLElement>( '.rt-carousel' );

	if ( ! root || typeof ResizeObserver === 'undefined' ) {
		return () => {};
	}

	const slideBlocks = ( edge: 'firstElementChild' | 'lastElementChild' ) =>
		Array.from( viewport.querySelectorAll<HTMLElement>( CAROUSEL_SLIDE_SELECTOR ) )
			.map( ( slide ) => slide[ edge ] )
			.filter( ( el ): el is Element => !! el );

	const observer = new ResizeObserver( () => sync() );

	let frame = 0;
	const mutations = new MutationObserver( () => {
		if ( ! frame ) {
			frame = requestAnimationFrame( () => {
				frame = 0;
				sync();
			} );
		}
	} );

	const sync = () => {
		const top = viewport.getBoundingClientRect().top;
		const firsts = slideBlocks( 'firstElementChild' );
		const lasts = slideBlocks( 'lastElementChild' );
		// Hidden slides (the editor's non-active tabs) report an all-zero rect.
		const visibleRects = ( els: Element[] ) =>
			els.map( ( el ) => el.getBoundingClientRect() ).filter( ( rect ) => rect.width || rect.height );
		const contentBottom = Math.max(
			0,
			...visibleRects( lasts ).map( ( rect ) => rect.bottom - top ),
		);
		const contentTop =
			contentBottom > 0
				? Math.min( ...visibleRects( firsts ).map( ( rect ) => rect.top - top ) )
				: 0;
		const size = contentBottom > 0 ? contentBottom - contentTop : viewport.offsetHeight;
		const offset = top - root.getBoundingClientRect().top - root.clientTop + contentTop;

		root.style.setProperty( '--rt-carousel-viewport-offset', `${ offset }px` );
		root.style.setProperty( '--rt-carousel-viewport-block-size', `${ size }px` );
		[ ...firsts, ...lasts ].forEach( ( el ) => observer.observe( el ) );
	};

	observer.observe( viewport );
	observer.observe( root );
	mutations.observe( root, { childList: true, subtree: true } );
	sync();

	return () => {
		observer.disconnect();
		mutations.disconnect();
		cancelAnimationFrame( frame );
	};
};
