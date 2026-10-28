/**
 * Unit tests for the carousel controls edit component.
 */

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import Edit from '../edit';
import { EditorCarouselContext } from '../../editor-context';

jest.mock( '@wordpress/block-editor', () => ( {
	useBlockProps: jest.fn( ( props = {} ) => ( {
		...props,
		ref: jest.fn(),
	} ) ),
} ) );

jest.mock( '@wordpress/compose', () => ( {
	useMergeRefs: jest.fn( () => jest.fn() ),
} ) );

describe( 'Carousel Controls Edit', () => {
	it( 'disables buttons when autoScroll is false and canScrollPrev/canScrollNext are false', () => {
		render(
			<EditorCarouselContext.Provider
				value={ {
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
					carouselOptions: {
						autoScroll: false,
					},
				} }
			>
				<Edit />
			</EditorCarouselContext.Provider>,
		);

		const prevBtn = screen.getByRole( 'button', { name: 'Previous Slide' } );
		const nextBtn = screen.getByRole( 'button', { name: 'Next Slide' } );

		expect( prevBtn ).toBeDisabled();
		expect( nextBtn ).toBeDisabled();
	} );

	it( 'keeps prev/next buttons enabled when autoScroll is true even if canScrollPrev/canScrollNext are false', () => {
		render(
			<EditorCarouselContext.Provider
				value={ {
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
					carouselOptions: {
						autoScroll: true,
					},
				} }
			>
				<Edit />
			</EditorCarouselContext.Provider>,
		);

		const prevBtn = screen.getByRole( 'button', { name: 'Previous Slide' } );
		const nextBtn = screen.getByRole( 'button', { name: 'Next Slide' } );

		expect( prevBtn ).not.toBeDisabled();
		expect( nextBtn ).not.toBeDisabled();
	} );
} );
