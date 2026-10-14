/**
 * Unit tests for the "Slides per view" helper.
 *
 * @package
 */

import { getSlidesPerView, MAX_SLIDES_PER_VIEW } from '../embla-options';

describe( 'getSlidesPerView', () => {
	const base = { transition: 'slide' as const, useTabs: false, slidesPerView: 1 };

	it( 'returns undefined for the default of one slide', () => {
		expect( getSlidesPerView( base ) ).toBeUndefined();
	} );

	it( 'returns the count when more than one slide is requested', () => {
		expect( getSlidesPerView( { ...base, slidesPerView: 3 } ) ).toBe( '3' );
	} );

	it( 'clamps the count to the maximum', () => {
		expect( getSlidesPerView( { ...base, slidesPerView: 99 } ) ).toBe( String( MAX_SLIDES_PER_VIEW ) );
	} );

	it( 'floors fractional values and ignores values below one', () => {
		expect( getSlidesPerView( { ...base, slidesPerView: 2.7 } ) ).toBe( '2' );
		expect( getSlidesPerView( { ...base, slidesPerView: -2 } ) ).toBeUndefined();
	} );

	it( 'is inactive for fade transitions', () => {
		expect( getSlidesPerView( { ...base, transition: 'fade', slidesPerView: 3 } ) ).toBeUndefined();
	} );

	it( 'is inactive in tabs mode', () => {
		expect( getSlidesPerView( { ...base, useTabs: true, slidesPerView: 3 } ) ).toBeUndefined();
	} );
} );
