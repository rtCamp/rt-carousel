import { getPositionClassName } from '../get-position-class';

describe( 'getPositionClassName', () => {
	it( 'returns only the base class for the default "below" position', () => {
		expect( getPositionClassName( 'below' ) ).toBe( 'rt-carousel-controls' );
	} );

	it( 'returns the base class with no modifier when position is undefined (back-compat)', () => {
		expect( getPositionClassName( undefined ) ).toBe( 'rt-carousel-controls' );
	} );

	it( 'adds the overlay modifier for the "overlay" position', () => {
		expect( getPositionClassName( 'overlay' ) ).toBe(
			'rt-carousel-controls is-position-overlay',
		);
	} );

	it( 'adds the outside modifier for the "outside" position', () => {
		expect( getPositionClassName( 'outside' ) ).toBe(
			'rt-carousel-controls is-position-outside',
		);
	} );
} );
