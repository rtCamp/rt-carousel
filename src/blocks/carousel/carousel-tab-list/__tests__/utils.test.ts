/**
 * Unit tests for resolveWpValue helper.
 *
 * @package
 */

import { resolveWpValue } from '../utils';

describe( 'resolveWpValue', () => {
	it( 'converts spacing preset to CSS variable', () => {
		expect( resolveWpValue( 'var:preset|spacing|40' ) ).toBe(
			'var(--wp--preset--spacing--40)',
		);
	} );

	it( 'converts color preset to CSS variable', () => {
		expect( resolveWpValue( 'var:preset|color|vivid-red' ) ).toBe(
			'var(--wp--preset--color--vivid-red)',
		);
	} );

	it( 'passes through arbitrary non-preset values', () => {
		expect( resolveWpValue( '1.5rem' ) ).toBe( '1.5rem' );
		expect( resolveWpValue( '#fff' ) ).toBe( '#fff' );
	} );

	it( 'returns undefined for undefined input', () => {
		expect( resolveWpValue( undefined ) ).toBeUndefined();
	} );

	it( 'returns undefined for empty string', () => {
		expect( resolveWpValue( '' ) ).toBeUndefined();
	} );

	it( 'does not rewrite partial matches', () => {
		// Must match the full `var:preset|...|...` pattern.
		expect( resolveWpValue( 'var:preset|spacing' ) ).toBe(
			'var:preset|spacing',
		);
	} );
} );
