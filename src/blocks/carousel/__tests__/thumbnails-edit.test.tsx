/**
 * Unit tests for the carousel thumbnails editor block.
 *
 * @package
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { EmblaCarouselType } from 'embla-carousel';
import Edit from '../thumbnails/edit';
import { EditorCarouselContext } from '../editor-context';

jest.mock( '@wordpress/block-editor', () => ( {
	useBlockProps: jest.fn( ( props = {} ) => props ),
} ) );

jest.mock( '@wordpress/i18n', () => ( {
	__: jest.fn( ( text: string ) => text ),
	sprintf: jest.fn( ( format: string, value: number ) =>
		format.replace( '%d', value.toString() ),
	),
} ) );

const createMockEmbla = (): EmblaCarouselType =>
	( {
		scrollTo: jest.fn(),
		scrollSnapList: jest.fn( () => [] ),
		slideNodes: jest.fn( () => [] ),
		on: jest.fn(),
		off: jest.fn(),
	} as unknown as EmblaCarouselType );

const createMockEmblaWithImage = (): EmblaCarouselType => {
	const slide = document.createElement( 'div' );
	slide.innerHTML = '<figure><img src="https://example.com/editor-image.jpg" alt="Editor image" /></figure>';

	return {
		...createMockEmbla(),
		scrollSnapList: jest.fn( () => [ 0 ] ),
		slideNodes: jest.fn( () => [ slide ] ),
	} as unknown as EmblaCarouselType;
};

const renderWithContext = ( emblaApi: EmblaCarouselType | undefined ) =>
	render(
		<EditorCarouselContext.Provider
			value={ {
				emblaApi,
				setEmblaApi: jest.fn(),
				canScrollPrev: false,
				canScrollNext: false,
				setCanScrollPrev: jest.fn(),
				setCanScrollNext: jest.fn(),
				scrollProgress: 0,
				setScrollProgress: jest.fn(),
				selectedIndex: 1,
				slideCount: 0,
				carouselOptions: {},
			} }
		>
			<Edit />
		</EditorCarouselContext.Provider>,
	);

describe( 'Carousel Thumbnails Edit', () => {
	it( 'renders fallback thumbnails when no Embla slides are available', () => {
		renderWithContext( undefined );

		expect( screen.getAllByRole( 'button' ) ).toHaveLength( 3 );
		expect( screen.getByRole( 'button', { name: 'Go to slide 2' } ) ).toHaveClass(
			'is-active',
		);
	} );

	it( 'scrolls the editor carousel when a thumbnail is clicked', () => {
		const emblaApi = createMockEmbla();

		renderWithContext( emblaApi );
		fireEvent.click( screen.getByRole( 'button', { name: 'Go to slide 3' } ) );

		expect( emblaApi.scrollTo ).toHaveBeenCalledWith( 2 );
	} );

	it( 'renders slide images in editor thumbnails when available', () => {
		const { container } = renderWithContext( createMockEmblaWithImage() );
		const thumbnailImage = container.querySelector( '.rt-carousel-thumbnail__image' );

		expect( thumbnailImage ).toHaveAttribute(
			'src',
			'https://example.com/editor-image.jpg',
		);
	} );
} );
