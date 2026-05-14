/**
 * Unit tests for the carousel viewport editor appender.
 *
 * @package
 */

import '@testing-library/jest-dom';
import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { createBlock } from '@wordpress/blocks';
import { useDispatch } from '@wordpress/data';
import Edit from '../viewport/edit';
import { EditorCarouselContext } from '../editor-context';

const mockInsertBlock = jest.fn();

jest.mock( '@wordpress/block-editor', () => ( {
	useBlockProps: jest.fn( ( props = {} ) => props ),
	useInnerBlocksProps: jest.fn( ( props = {}, options = {} ) => ( {
		...props,
		children: options.renderAppender ? options.renderAppender() : null,
	} ) ),
	InspectorControls: jest.fn( ( { children }: { children: ReactNode } ) => children ),
	BlockControls: jest.fn( ( { children }: { children: ReactNode } ) => children ),
} ) );

jest.mock( '@wordpress/components', () => {
	const Button = ( {
		children,
		className,
		onClick,
	}: {
		children?: ReactNode;
		className?: string;
		onClick?: () => void;
	} ) => (
		<button type="button" className={ className } onClick={ onClick }>
			{ children }
		</button>
	);

	return {
		Button,
		PanelBody: ( { children }: { children: ReactNode } ) => children,
		ToolbarButton: Button,
	};
} );

jest.mock( '@wordpress/compose', () => ( {
	useMergeRefs: jest.fn(
		( refs: Array< ( ( node: HTMLDivElement | null ) => void ) | { current: HTMLDivElement | null } | undefined > ) =>
			( node: HTMLDivElement | null ) => {
				refs.forEach( ( ref ) => {
					if ( typeof ref === 'function' ) {
						ref( node );
					} else if ( ref ) {
						ref.current = node;
					}
				} );
			},
	),
} ) );

jest.mock( '@wordpress/data', () => ( {
	useDispatch: jest.fn( () => ( { insertBlock: mockInsertBlock } ) ),
	useSelect: jest.fn( ( selector ) =>
		selector( () => ( {
			getBlocks: () => [],
			getSelectedBlockClientId: () => null,
			getBlockParents: () => [],
		} ) ),
	),
} ) );

jest.mock( '@wordpress/blocks', () => ( {
	createBlock: jest.fn( ( name: string, attributes = {}, innerBlocks = [] ) => ( {
		name,
		attributes,
		innerBlocks,
	} ) ),
} ) );

jest.mock( '@wordpress/icons', () => ( {
	plus: 'plus',
} ) );

jest.mock( '../hooks/useCarouselObservers', () => ( {
	useCarouselObservers: jest.fn(),
} ) );

const renderViewportEdit = () =>
	render(
		<EditorCarouselContext.Provider
			value={ {
				setEmblaApi: jest.fn(),
				emblaApi: undefined,
				canScrollPrev: false,
				canScrollNext: false,
				setCanScrollPrev: jest.fn(),
				setCanScrollNext: jest.fn(),
				scrollProgress: 0,
				setScrollProgress: jest.fn(),
				selectedIndex: 0,
				slideCount: 0,
				carouselOptions: {
					loop: false,
					dragFree: false,
					containScroll: 'trimSnaps',
					axis: 'x',
					align: 'start',
					direction: 'ltr',
					slidesToScroll: 1,
				},
			} }
		>
			<Edit clientId="viewport-client-id" attributes={ {} } />
		</EditorCarouselContext.Provider>,
	);

describe( 'Carousel Viewport Edit', () => {
	beforeEach( () => {
		mockInsertBlock.mockClear();
		( createBlock as jest.Mock ).mockClear();
		( useDispatch as jest.Mock ).mockReturnValue( {
			insertBlock: mockInsertBlock,
		} );
	} );

	it( 'offers manual and dynamic content insertion actions when empty', () => {
		renderViewportEdit();

		expect( screen.getAllByRole( 'button', { name: 'Add Slide' } ).length ).toBeGreaterThan(
			0,
		);
		expect(
			screen.getByRole( 'button', { name: 'Add Query Loop' } ),
		).toBeInTheDocument();
		expect(
			screen.getByRole( 'button', { name: 'Add Terms Query' } ),
		).toBeInTheDocument();
	} );

	it( 'keeps empty appender actions focusable without moving focus on render', () => {
		const { container } = renderViewportEdit();
		const appenderActions = container.querySelectorAll<HTMLButtonElement>(
			'.rt-carousel-viewport-empty__actions button',
		);
		const appender = container.querySelector<HTMLDivElement>(
			'[data-rt-carousel-empty-appender="true"]',
		);

		expect( appender ).not.toBeNull();
		expect( appender?.tabIndex ).toBe( -1 );
		expect( appenderActions ).toHaveLength( 3 );
		appenderActions.forEach( ( action ) => {
			expect( action.tabIndex ).not.toBeLessThan( 0 );
			expect( action ).not.toHaveFocus();
		} );
	} );

	it( 'inserts a Query Loop directly inside the viewport', () => {
		renderViewportEdit();

		fireEvent.click( screen.getByRole( 'button', { name: 'Add Query Loop' } ) );

		expect( createBlock ).toHaveBeenCalledWith( 'core/query' );
		expect( mockInsertBlock ).toHaveBeenCalledWith(
			expect.objectContaining( { name: 'core/query' } ),
			undefined,
			'viewport-client-id',
		);
	} );

	it( 'inserts a Terms Query directly inside the viewport', () => {
		renderViewportEdit();

		fireEvent.click( screen.getByRole( 'button', { name: 'Add Terms Query' } ) );

		expect( createBlock ).toHaveBeenCalledWith( 'core/terms-query', {
			termQuery: {
				perPage: 10,
				taxonomy: 'category',
				order: 'asc',
				orderBy: 'name',
				include: [],
				hideEmpty: false,
				showNested: false,
				inherit: false,
			},
		} );
		expect( mockInsertBlock ).toHaveBeenCalledWith(
			expect.objectContaining( { name: 'core/terms-query' } ),
			undefined,
			'viewport-client-id',
		);
	} );
} );
