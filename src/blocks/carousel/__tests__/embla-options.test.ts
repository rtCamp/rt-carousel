import { applyTabsOverrides } from '../embla-options';

describe( 'applyTabsOverrides', () => {
	it( 'returns options unchanged when not in tabs mode', () => {
		const options = { containScroll: 'trimSnaps' as const, slidesToScroll: 2, dragFree: true };
		expect( applyTabsOverrides( options, false ) ).toBe( options );
	} );

	it( 'disables snap trimming and grouping in tabs mode', () => {
		const result = applyTabsOverrides(
			{ containScroll: 'trimSnaps', slidesToScroll: 'auto', dragFree: true, align: 'start', loop: false },
			true,
		);
		expect( result ).toEqual( {
			containScroll: false,
			slidesToScroll: 1,
			dragFree: false,
			align: 'start',
			loop: false,
		} );
	} );
} );
