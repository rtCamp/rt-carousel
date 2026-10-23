/**
 * Unit tests for the carousel controls edit component.
 */

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { SelectControl } from '@wordpress/components';
import Edit from '../edit';
import { EditorCarouselContext } from '../../editor-context';
import type { CarouselControlsAttributes } from '../../types';

jest.mock( '@wordpress/block-editor', () => ( {
	useBlockProps: jest.fn( ( props = {} ) => ( {
		...props,
		ref: jest.fn(),
	} ) ),
	InspectorControls: ( { children }: { children: ReactNode } ) => (
		<div data-testid="inspector-controls">{ children }</div>
	),
} ) );

jest.mock( '@wordpress/compose', () => ( {
	useMergeRefs: jest.fn( () => jest.fn() ),
} ) );

const baseContext = {
	emblaApi: undefined,
	setEmblaApi: jest.fn(),
	canScrollPrev: false,
	canScrollNext: false,
	setCanScrollPrev: jest.fn(),
	setCanScrollNext: jest.fn(),
	scrollProgress: 0,
	setScrollProgress: jest.fn(),
	selectedIndex: 0,
	setSelectedIndex: jest.fn(),
	scrollSnaps: [],
	slideCount: 2,
	carouselOptions: { autoScroll: false },
};

function renderEdit(
	attributes: CarouselControlsAttributes,
	setAttributes = jest.fn(),
	contextOverrides = {},
) {
	return render(
		<EditorCarouselContext.Provider
			value={ { ...baseContext, ...contextOverrides } }
		>
			<Edit attributes={ attributes } setAttributes={ setAttributes } />
		</EditorCarouselContext.Provider>,
	);
}

describe( 'Carousel Controls Edit', () => {
	beforeEach( () => {
		jest.clearAllMocks();
	} );

	it( 'disables buttons when autoScroll is false and canScrollPrev/canScrollNext are false', () => {
		renderEdit( { position: 'below' } );

		expect(
			screen.getByRole( 'button', { name: 'Previous Slide' } ),
		).toBeDisabled();
		expect(
			screen.getByRole( 'button', { name: 'Next Slide' } ),
		).toBeDisabled();
	} );

	it( 'keeps prev/next buttons enabled when autoScroll is true even if canScrollPrev/canScrollNext are false', () => {
		renderEdit( { position: 'below' }, jest.fn(), {
			carouselOptions: { autoScroll: true },
		} );

		expect(
			screen.getByRole( 'button', { name: 'Previous Slide' } ),
		).not.toBeDisabled();
		expect(
			screen.getByRole( 'button', { name: 'Next Slide' } ),
		).not.toBeDisabled();
	} );

	it( 'uses only the base class for the default "below" position (back-compat)', () => {
		const { container } = renderEdit( { position: 'below' } );
		const wrapper = container.querySelector( '.rt-carousel-controls' );

		expect( wrapper ).toBeInTheDocument();
		expect( wrapper ).not.toHaveClass( 'is-position-overlay' );
		expect( wrapper ).not.toHaveClass( 'is-position-outside' );
	} );

	it( 'applies the overlay modifier class when position is "overlay"', () => {
		const { container } = renderEdit( { position: 'overlay' } );

		expect( container.querySelector( '.rt-carousel-controls' ) ).toHaveClass(
			'is-position-overlay',
		);
	} );

	it( 'renders the Position select and updates the attribute on change', () => {
		const setAttributes = jest.fn();
		renderEdit( { position: 'below' }, setAttributes );

		const positionCall = (
			SelectControl as unknown as jest.Mock
		).mock.calls.find( ( call ) => call[ 0 ].label === 'Position' );

		expect( positionCall ).toBeTruthy();

		positionCall[ 0 ].onChange( 'outside' );

		expect( setAttributes ).toHaveBeenCalledWith( { position: 'outside' } );
	} );

	it( 'applies the outside modifier class when position is "outside"', () => {
		const { container } = renderEdit( { position: 'outside' } );

		expect( container.querySelector( '.rt-carousel-controls' ) ).toHaveClass(
			'is-position-outside',
		);
	} );

	it( 'shows the placement hint only for non-below positions', () => {
		renderEdit( { position: 'below' } );
		const belowCall = (
			SelectControl as unknown as jest.Mock
		).mock.calls.find( ( call ) => call[ 0 ].label === 'Position' );
		expect( belowCall[ 0 ].help ).toBeUndefined();

		jest.clearAllMocks();

		renderEdit( { position: 'overlay' } );
		const overlayCall = (
			SelectControl as unknown as jest.Mock
		).mock.calls.find( ( call ) => call[ 0 ].label === 'Position' );
		expect( overlayCall[ 0 ].help ).toBeTruthy();
	} );
} );
