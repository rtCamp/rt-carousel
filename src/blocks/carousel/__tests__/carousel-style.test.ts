/**
 *
 * @package
 */

import { getCarouselStyle, getSlidesPerView, MAX_SLIDES_PER_VIEW } from '../carousel-style';

describe( 'getSlidesPerView', () => {
	const base = { transition: 'slide' as const, useTabs: false, slidesPerView: 3 };

	it( 'returns undefined when the setting is unset', () => {
		expect( getSlidesPerView( { ...base, slidesPerView: undefined } ) ).toBeUndefined();
	} );

	it( 'returns an explicit one so it can override column styles', () => {
		expect( getSlidesPerView( { ...base, slidesPerView: 1 } ) ).toBe( '1' );
	} );

	it( 'returns the count when more than one slide is requested', () => {
		expect( getSlidesPerView( base ) ).toBe( '3' );
	} );

	it( 'clamps the count to the maximum', () => {
		expect( getSlidesPerView( { ...base, slidesPerView: 99 } ) ).toBe( String( MAX_SLIDES_PER_VIEW ) );
	} );

	it( 'floors fractional values and ignores values below one', () => {
		expect( getSlidesPerView( { ...base, slidesPerView: 2.7 } ) ).toBe( '2' );
		expect( getSlidesPerView( { ...base, slidesPerView: 0 } ) ).toBeUndefined();
		expect( getSlidesPerView( { ...base, slidesPerView: -2 } ) ).toBeUndefined();
	} );

	it( 'is inactive for fade transitions', () => {
		expect( getSlidesPerView( { ...base, transition: 'fade' } ) ).toBeUndefined();
	} );

	it( 'is inactive in tabs mode', () => {
		expect( getSlidesPerView( { ...base, useTabs: true } ) ).toBeUndefined();
	} );
} );

describe( 'getCarouselStyle', () => {
	const base = {
		slideGap: 16,
		axis: 'x' as const,
		height: '400px',
		transition: 'slide' as const,
		useTabs: false,
		slidesPerView: undefined,
	};

	it( 'sets the gap and leaves height and slides per view unset by default', () => {
		expect( getCarouselStyle( base ) ).toEqual( {
			'--rt-carousel-gap': '16px',
			'--rt-carousel-height': undefined,
			'--rt-carousel-slides-per-view': undefined,
		} );
	} );

	it( 'sets the height only on the vertical axis', () => {
		expect( getCarouselStyle( { ...base, axis: 'y' } ) ).toMatchObject( {
			'--rt-carousel-height': '400px',
		} );
	} );

	it( 'sets the slides per view count when configured', () => {
		expect( getCarouselStyle( { ...base, slidesPerView: 3 } ) ).toMatchObject( {
			'--rt-carousel-slides-per-view': '3',
		} );
	} );
} );
