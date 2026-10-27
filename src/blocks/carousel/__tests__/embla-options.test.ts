import { applyStackedOverrides } from '../embla-options';

describe( 'applyStackedOverrides', () => {
	const base = { containScroll: 'trimSnaps' as const, slidesToScroll: 'auto' as const, dragFree: true, align: 'start' as const, loop: false };

	it( 'returns options unchanged for a sliding, non-tabs carousel', () => {
		expect( applyStackedOverrides( base, { transition: 'slide', useTabs: false } ) ).toBe( base );
	} );

	it( 'disables snap trimming and grouping in tabs mode, keeping alignment', () => {
		expect( applyStackedOverrides( base, { transition: 'slide', useTabs: true } ) ).toEqual( {
			containScroll: false,
			slidesToScroll: 1,
			dragFree: false,
			align: 'start',
			loop: false,
		} );
	} );

	it( 'also forces center alignment for fade, with or without tabs', () => {
		const expected = {
			containScroll: false,
			slidesToScroll: 1,
			dragFree: false,
			align: 'center',
			loop: false,
		};
		expect( applyStackedOverrides( base, { transition: 'fade', useTabs: false } ) ).toEqual( expected );
		expect( applyStackedOverrides( base, { transition: 'fade', useTabs: true } ) ).toEqual( expected );
	} );
} );
