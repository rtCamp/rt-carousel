import { render } from '@testing-library/react';
import Save from '../save';
import type { CarouselSlideAttributes } from '../../types';

jest.mock( '@wordpress/block-editor', () => ( {
	useBlockProps: {
		save: ( props: Record<string, unknown> = {} ) => ( { ...props } ),
	},
	useInnerBlocksProps: {
		save: ( props: Record<string, unknown> = {} ) => ( {
			...props,
			children: <div data-testid="inner-blocks">Inner Blocks</div>,
		} ),
	},
} ) );

/*
 * Slides have no deprecations, so any change to this markup strands every slide ever
 * saved. Tabs mode is applied at render time by Plugin::mark_tab_panels(), not here —
 * save() cannot see the parent's `useTabs`.
 */
const SHIPPED_MARKUP =
	'<div class="embla__slide" role="group" aria-roledescription="slide" data-wp-interactive="rt-carousel/carousel" data-wp-class--is-active="callbacks.isSlideActive" data-wp-bind--aria-current="callbacks.isSlideActive"><div data-testid="inner-blocks">Inner Blocks</div></div>';

const renderSave = ( attributes: CarouselSlideAttributes ) =>
	render( <Save attributes={ attributes } /> ).container.innerHTML;

describe( 'Carousel Slide save', () => {
	it( 'still writes the markup every saved slide was written with', () => {
		expect( renderSave( {} ) ).toBe( SHIPPED_MARKUP );
	} );

	it( 'adds the alignment class without otherwise changing the markup', () => {
		expect( renderSave( { verticalAlignment: 'center' } ) ).toBe(
			SHIPPED_MARKUP.replace(
				'class="embla__slide"',
				'class="embla__slide is-vertically-aligned-center"',
			),
		);
	} );
} );
