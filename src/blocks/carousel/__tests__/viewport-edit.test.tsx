/**
 * Unit tests for the carousel viewport editor appender.
 *
 * @package
 */

import '@testing-library/jest-dom';
import type { ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { createBlock } from '@wordpress/blocks';
import { useDispatch } from '@wordpress/data';
import Edit from '../viewport/edit';
import { EditorCarouselContext } from '../editor-context';

const mockInsertBlock = jest.fn();
const mockBlockEditorState: {
	slideClientIds: string[];
	selectedBlockClientId: string | null;
} = {
	slideClientIds: [],
	selectedBlockClientId: null,
};
const mockScrollTo = jest.fn();
const mockSelectedScrollSnap = jest.fn( () => 0 );
const mockSlideRegistry: number[][] = [];

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
			getBlocks: () =>
				mockBlockEditorState.slideClientIds.map( ( clientId ) => ( { clientId } ) ),
			getSelectedBlockClientId: () => mockBlockEditorState.selectedBlockClientId,
			getBlockParents: () => [],
		} ) ),
	),
} ) );

jest.mock( 'embla-carousel', () => ( {
	__esModule: true,
	default: jest.fn( () => ( {
		canScrollPrev: jest.fn( () => false ),
		canScrollNext: jest.fn( () => false ),
		scrollTo: mockScrollTo,
		selectedScrollSnap: mockSelectedScrollSnap,
		internalEngine: () => ( { slideRegistry: mockSlideRegistry } ),
		on: jest.fn(),
		off: jest.fn(),
		destroy: jest.fn(),
		reInit: jest.fn(),
	} ) ),
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

const renderViewportEdit = ( {
	slideCount = 0,
	slidesToScroll = 1,
}: { slideCount?: number; slidesToScroll?: number } = {} ) =>
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
				setSelectedIndex: jest.fn(),
				scrollSnaps: [],
				slideCount,
				carouselOptions: {
					loop: false,
					dragFree: false,
					containScroll: 'trimSnaps',
					axis: 'x',
					align: 'start',
					direction: 'ltr',
					slidesToScroll,
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

describe( 'Carousel Viewport Edit - selection scroll mapping', () => {
	// `requestAnimationFrame` is faked manually (not via jest fake timers) so the
	// selection-scroll effect's callback runs on a deterministic, single flush.
	let rafCallbacks: FrameRequestCallback[];
	let rafSpy: jest.SpyInstance;
	let cafSpy: jest.SpyInstance;

	beforeEach( () => {
		mockBlockEditorState.slideClientIds = [];
		mockBlockEditorState.selectedBlockClientId = null;
		mockSlideRegistry.length = 0;
		mockScrollTo.mockClear();
		mockSelectedScrollSnap.mockReset();
		mockSelectedScrollSnap.mockReturnValue( 0 );

		rafCallbacks = [];
		rafSpy = jest
			.spyOn( window, 'requestAnimationFrame' )
			.mockImplementation( ( callback ) => {
				rafCallbacks.push( callback );
				return rafCallbacks.length;
			} );
		cafSpy = jest.spyOn( window, 'cancelAnimationFrame' ).mockImplementation( () => {} );
	} );

	afterEach( () => {
		rafSpy.mockRestore();
		cafSpy.mockRestore();
	} );

	const flushRaf = () => {
		const callbacks = rafCallbacks;
		rafCallbacks = [];
		act( () => {
			callbacks.forEach( ( callback ) => callback( 0 ) );
		} );
	};

	it( 'does not scroll away when the selected slide is already in the current snap', () => {
		// slidesToScroll: 2, slides 0/1 and 2/3 each share a snap.
		mockBlockEditorState.slideClientIds = [ 'slide-0', 'slide-1', 'slide-2', 'slide-3' ];
		mockBlockEditorState.selectedBlockClientId = 'slide-1';
		mockSlideRegistry.push( [ 0, 1 ], [ 2, 3 ] );
		mockSelectedScrollSnap.mockReturnValue( 0 ); // Already showing the [0, 1] snap.

		renderViewportEdit( { slideCount: 4, slidesToScroll: 2 } );
		flushRaf();

		expect( mockScrollTo ).not.toHaveBeenCalled();
	} );

	it( 'scrolls to the snap containing the selected slide, not the raw slide index', () => {
		mockBlockEditorState.slideClientIds = [ 'slide-0', 'slide-1', 'slide-2', 'slide-3' ];
		mockBlockEditorState.selectedBlockClientId = 'slide-3';
		mockSlideRegistry.push( [ 0, 1 ], [ 2, 3 ] );
		mockSelectedScrollSnap.mockReturnValue( 0 ); // Currently on the first snap.

		renderViewportEdit( { slideCount: 4, slidesToScroll: 2 } );
		flushRaf();

		// Slide index 3 must resolve to snap 1 ([2, 3]), never scroll to raw index 3.
		expect( mockScrollTo ).toHaveBeenCalledWith( 1 );
		expect( mockScrollTo ).not.toHaveBeenCalledWith( 3 );
	} );

	it( 'still scrolls by slide index when each snap holds a single slide (slidesToScroll: 1)', () => {
		mockBlockEditorState.slideClientIds = [ 'slide-0', 'slide-1', 'slide-2' ];
		mockBlockEditorState.selectedBlockClientId = 'slide-2';
		mockSlideRegistry.push( [ 0 ], [ 1 ], [ 2 ] );
		mockSelectedScrollSnap.mockReturnValue( 0 );

		renderViewportEdit( { slideCount: 3, slidesToScroll: 1 } );
		flushRaf();

		expect( mockScrollTo ).toHaveBeenCalledWith( 2 );
	} );
} );
