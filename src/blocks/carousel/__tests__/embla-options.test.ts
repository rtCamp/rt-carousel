import type { EmblaOptionsType } from 'embla-carousel';
import { REDUCED_MOTION_QUERY, withReducedMotion } from '../embla-options';

describe( 'withReducedMotion', () => {
	it( 'adds the overrides under the reduced-motion breakpoint', () => {
		const options: EmblaOptionsType = { loop: true };
		const result = withReducedMotion( options, { duration: 0 } );

		expect( result ).toEqual( {
			loop: true,
			breakpoints: { [ REDUCED_MOTION_QUERY ]: { duration: 0 } },
		} );
	} );

	it( 'keeps other breakpoints', () => {
		const result = withReducedMotion(
			{ breakpoints: { '(min-width: 768px)': { loop: true } } },
			{ duration: 0 },
		);

		expect( result.breakpoints ).toEqual( {
			'(min-width: 768px)': { loop: true },
			[ REDUCED_MOTION_QUERY ]: { duration: 0 },
		} );
	} );

	it( 'merges into an existing reduced-motion entry', () => {
		const result = withReducedMotion(
			{ breakpoints: { [ REDUCED_MOTION_QUERY ]: { loop: false } } },
			{ duration: 0 },
		);

		expect( result.breakpoints?.[ REDUCED_MOTION_QUERY ] ).toEqual( {
			loop: false,
			duration: 0,
		} );
	} );

	it( 'does not mutate its input', () => {
		const input = { breakpoints: { '(min-width: 768px)': { loop: true } } };

		withReducedMotion( input, { duration: 0 } );

		expect( input ).toEqual( {
			breakpoints: { '(min-width: 768px)': { loop: true } },
		} );
	} );
} );
