/**
 * Unit tests for the carousel editor setup flow.
 *
 * @package
 */

import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Edit from '../edit';
import type { CarouselAttributes } from '../types';
import type { ReactNode as MockReactNode } from 'react';
import { SelectControl, ToggleControl, RangeControl } from '@wordpress/components';

let mockBlockCount = 0;

jest.mock( '@wordpress/block-editor', () => ( {
	useBlockProps: jest.fn( ( props = {} ) => props ),
	useInnerBlocksProps: jest.fn( ( props = {} ) => props ),
	InspectorControls: jest.fn( ( { children } ) => children ),
	InspectorAdvancedControls: jest.fn( ( { children } ) => children ),
	BlockControls: jest.fn( ( { children } ) => children ),
} ) );

jest.mock( '@wordpress/components', () => {
	const Button = ( {
		children,
		onClick,
		className,
		...rest
	}: {
		children?: MockReactNode;
		className?: string;
		onClick?: () => void;
	} ) => (
		<button type="button" className={ className } onClick={ onClick } { ...rest }>
			{ children }
		</button>
	);

	const Passthrough = ( {
		children,
	}: {
		children?: MockReactNode;
	} ) => <>{ children }</>;

	return {
		PanelBody: Passthrough,
		ToggleControl: jest.fn( ( { onChange, checked, label } ) => (
			<input
				type="checkbox"
				aria-label={ label }
				checked={ checked }
				onChange={ ( e ) => onChange?.( e.target.checked ) }
				readOnly={ ! onChange }
			/>
		) ),
		SelectControl: jest.fn( () => null ),
		FormTokenField: jest.fn( () => null ),
		BaseControl: Passthrough,
		TextControl: jest.fn( () => null ),
		RangeControl: jest.fn( () => null ),
		Placeholder: ( {
			children,
			instructions,
			className,
		}: {
			children?: MockReactNode;
			className?: string;
			instructions?: MockReactNode;
		} ) => (
			<div className={ className }>
				<p>{ instructions }</p>
				{ children }
			</div>
		),
		Button,
		ToolbarButton: Button,
	};
} );

const mockInsertBlock = jest.fn();
const mockRemoveBlocks = jest.fn();
let mockBlocks: unknown[] = [];

type BlockEditorMockSelectors = {
	getBlockCount: () => number;
	getBlocks: () => unknown[];
};

type BlocksMockSelectors = {
	getBlockTypes: () => unknown[];
};

type MockSelect = {
	( storeName: 'core/block-editor' ): BlockEditorMockSelectors;
	( storeName: 'core/blocks' ): BlocksMockSelectors;
	( storeName: string ): Record<string, never>;
};

type MockUseSelectCallback = ( select: MockSelect ) => unknown;

const mockSelect = ( ( storeName: string ) => {
	if ( storeName === 'core/block-editor' ) {
		return {
			getBlockCount: () => mockBlockCount,
			getBlocks: () => mockBlocks,
		};
	}

	if ( storeName === 'core/blocks' ) {
		return {
			getBlockTypes: () => [],
		};
	}

	return {};
} ) as MockSelect;

jest.mock( '@wordpress/data', () => ( {
	useDispatch: jest.fn( () => ( {
		replaceInnerBlocks: jest.fn(),
		insertBlock: mockInsertBlock,
		removeBlocks: mockRemoveBlocks,
	} ) ),
	select: jest.fn( ( storeName: string ) => mockSelect( storeName ) ),
	useRegistry: jest.fn( () => ( { select: mockSelect } ) ),
	useSelect: jest.fn( ( selector: MockUseSelectCallback ) => {
		return selector( mockSelect );
	} ),
} ) );

jest.mock( '@wordpress/icons', () => ( {
	plus: 'plus',
	columns: { name: 'columns' },
	image: { name: 'image' },
	layout: { name: 'layout' },
	gallery: { name: 'gallery' },
	post: { name: 'post' },
} ) );

jest.mock( '@wordpress/blocks', () => ( {
	createBlock: jest.fn( ( name: string, attributes = {}, innerBlocks = [] ) => ( {
		name,
		attributes,
		innerBlocks,
	} ) ),
} ) );

jest.mock( '../components/TemplatePicker', () => ( {
	__esModule: true,
	default: ( { onBack }: { onBack: () => void } ) => (
		<div>
			<button type="button" onClick={ onBack }>
				Back
			</button>
		</div>
	),
} ) );

const createAttributes = (): CarouselAttributes => ( {
	transition: 'slide',
	loop: false,
	dragFree: false,
	carouselAlign: 'start',
	containScroll: 'trimSnaps',
	direction: 'ltr',
	axis: 'x',
	height: '',
	allowedSlideBlocks: [],
	autoplay: false,
	autoplayDelay: 1000,
	autoplayStopOnInteraction: true,
	autoplayStopOnMouseEnter: false,
	ariaLabel: 'Carousel',
	slidesToScroll: '1',
	slideGap: 0,
	useTabs: false,
	lazyLoadImages: true,
	autoScroll: false,
	autoScrollSpeed: 2,
	autoScrollDirection: 'forward' as const,
	autoScrollStartDelay: 1000,
	autoScrollStopOnInteraction: true,
	autoScrollStopOnMouseEnter: false,
} );

describe( 'Carousel Edit setup flow', () => {
	beforeEach( () => {
		mockBlockCount = 0;
	} );

	it( 'restores focus to first slide-count button when going back from templates', async () => {
		render(
			<Edit
				attributes={ createAttributes() }
				setAttributes={ jest.fn() }
				clientId="client-1"
			/>,
		);

		fireEvent.click( screen.getByRole( 'button', { name: '2 Slides' } ) );
		const backButton = screen.getByRole( 'button', { name: 'Back' } );
		backButton.focus();
		fireEvent.click( backButton );

		await waitFor( () => {
			expect( screen.getByRole( 'button', { name: '1 Slide' } ) ).toHaveFocus();
		} );
	} );

	it( 'does not throw when completing setup in an environment without document', () => {
		const originalDocumentDescriptor = Object.getOwnPropertyDescriptor( globalThis, 'document' );

		const { rerender } = render(
			<Edit
				attributes={ createAttributes() }
				setAttributes={ jest.fn() }
				clientId="client-2"
			/>,
		);

		mockBlockCount = 1;

		if ( originalDocumentDescriptor?.configurable ) {
			Object.defineProperty( globalThis, 'document', {
				value: undefined,
				configurable: true,
			} );
		}

		expect( () => {
			rerender(
				<Edit
					attributes={ createAttributes() }
					setAttributes={ jest.fn() }
					clientId="client-2"
				/>,
			);
		} ).not.toThrow();

		if ( originalDocumentDescriptor?.configurable ) {
			Object.defineProperty( globalThis, 'document', originalDocumentDescriptor );
		}
	} );

	it( 'should have correct default autoScroll attributes', () => {
		const attributes = createAttributes();
		expect( attributes.autoScroll ).toBe( false );
		expect( attributes.autoScrollSpeed ).toBe( 2 );
		expect( attributes.autoScrollDirection ).toBe( 'forward' );
		expect( attributes.autoScrollStartDelay ).toBe( 1000 );
		expect( attributes.autoScrollStopOnInteraction ).toBe( true );
		expect( attributes.autoScrollStopOnMouseEnter ).toBe( false );
	} );

	it( 'renders a Transition select and hides slide-only controls when fade is active', () => {
		render(
			<Edit
				attributes={ { ...createAttributes(), transition: 'fade' } }
				setAttributes={ jest.fn() }
				clientId="client-fade"
			/>,
		);

		const selectLabels = ( SelectControl as unknown as jest.Mock ).mock.calls.map(
			( [ props ] ) => props.label,
		);
		const toggleLabels = ( ToggleControl as unknown as jest.Mock ).mock.calls.map(
			( [ props ] ) => props.label,
		);

		expect( selectLabels ).toContain( 'Transition' );
		expect( selectLabels ).not.toContain( 'Alignment' );
		expect( selectLabels ).not.toContain( 'Contain Scroll' );
		expect( toggleLabels ).not.toContain( 'Free Drag' );
		expect( toggleLabels ).not.toContain( 'Scroll Auto' );
		expect( toggleLabels ).toContain( 'Enable Auto Scroll' );
		expect( ( RangeControl as unknown as jest.Mock ).mock.calls.some(
			( [ props ] ) => props.label === 'Slides to Scroll',
		) ).toBe( false );
	} );

	it( 'keeps slide-only controls visible when slide transition is active', () => {
		render(
			<Edit
				attributes={ createAttributes() }
				setAttributes={ jest.fn() }
				clientId="client-slide"
			/>,
		);

		const selectLabels = ( SelectControl as unknown as jest.Mock ).mock.calls.map(
			( [ props ] ) => props.label,
		);
		const toggleLabels = ( ToggleControl as unknown as jest.Mock ).mock.calls.map(
			( [ props ] ) => props.label,
		);

		expect( selectLabels ).toContain( 'Alignment' );
		expect( selectLabels ).toContain( 'Contain Scroll' );
		expect( toggleLabels ).toContain( 'Free Drag' );
		expect( toggleLabels ).toContain( 'Scroll Auto' );
		expect( toggleLabels ).toContain( 'Enable Auto Scroll' );
	} );

	it( 'calls setAttributes with the selected transition', () => {
		const setAttributes = jest.fn();
		render(
			<Edit
				attributes={ createAttributes() }
				setAttributes={ setAttributes }
				clientId="client-transition-change"
			/>,
		);

		const transitionCall = ( SelectControl as unknown as jest.Mock ).mock.calls.find(
			( [ props ] ) => props.label === 'Transition',
		);

		transitionCall[ 0 ].onChange( 'fade' );

		expect( setAttributes ).toHaveBeenCalledWith( { transition: 'fade' } );
	} );

	it( 'disables the transition dropdown with notice when autoScroll is enabled', () => {
		render(
			<Edit
				attributes={ { ...createAttributes(), autoScroll: true } }
				setAttributes={ jest.fn() }
				clientId="client-transition-disabled"
			/>,
		);

		const transitionCall = ( SelectControl as unknown as jest.Mock ).mock.calls.find(
			( [ props ] ) => props.label === 'Transition',
		);

		expect( transitionCall[ 0 ].disabled ).toBe( true );
		expect( transitionCall[ 0 ].help ).toBe( 'Auto Scroll does not support transitions.' );
	} );

	it( 'switches transition to slide when autoScroll is enabled', () => {
		const setAttributes = jest.fn();
		render(
			<Edit
				attributes={ { ...createAttributes(), transition: 'fade' } }
				setAttributes={ setAttributes }
				clientId="client-autoscroll-toggle"
			/>,
		);

		const autoScrollToggle = ( ToggleControl as unknown as jest.Mock ).mock.calls.find(
			( [ props ] ) => props.label === 'Enable Auto Scroll',
		);

		autoScrollToggle[ 0 ].onChange( true );

		expect( setAttributes ).toHaveBeenCalledWith( expect.objectContaining( {
			autoScroll: true,
			transition: 'slide',
		} ) );
	} );
} );

describe( 'useTabs toggle', () => {
	beforeEach( () => {
		mockBlockCount = 2;
		mockBlocks = [];
		mockInsertBlock.mockClear();
		mockRemoveBlocks.mockClear();
	} );

	it( 'renders Use as Tabs toggle when inner blocks exist', () => {
		render(
			<Edit
				attributes={ createAttributes() }
				setAttributes={ jest.fn() }
				clientId="test-client-id"
			/>,
		);

		const toggleCall = ( ToggleControl as unknown as jest.Mock ).mock.calls.find(
			( [ props ] ) => props.label === 'Use as Tabs',
		);

		expect( toggleCall ).toBeDefined();
		expect( toggleCall[ 0 ].checked ).toBe( false );
	} );

	it( 'inserts a tab list block when toggling Use as Tabs ON if no tab list exists', () => {
		mockBlocks = [
			{ name: 'rt-carousel/carousel-viewport', clientId: 'viewport-1', innerBlocks: [] },
		];
		const setAttributes = jest.fn();

		render(
			<Edit
				attributes={ createAttributes() }
				setAttributes={ setAttributes }
				clientId="test-client-id"
			/>,
		);

		const toggleCall = ( ToggleControl as unknown as jest.Mock ).mock.calls.find(
			( [ props ] ) => props.label === 'Use as Tabs',
		);

		toggleCall[ 0 ].onChange( true );

		expect( setAttributes ).toHaveBeenCalledWith(
			expect.objectContaining( { useTabs: true, transition: 'slide', autoScroll: false } ),
		);
		expect( mockInsertBlock ).toHaveBeenCalledWith(
			expect.objectContaining( { name: 'rt-carousel/carousel-tab-list' } ),
			0,
			'test-client-id',
		);
	} );

	it( 'does not insert a second tab list block when toggling Use as Tabs ON if one already exists', () => {
		mockBlocks = [
			{ name: 'rt-carousel/carousel-tab-list', clientId: 'existing-tab-list', innerBlocks: [] },
			{ name: 'rt-carousel/carousel-viewport', clientId: 'viewport-1', innerBlocks: [] },
		];
		const setAttributes = jest.fn();

		render(
			<Edit
				attributes={ createAttributes() }
				setAttributes={ setAttributes }
				clientId="test-client-id"
			/>,
		);

		const toggleCall = ( ToggleControl as unknown as jest.Mock ).mock.calls.find(
			( [ props ] ) => props.label === 'Use as Tabs',
		);

		toggleCall[ 0 ].onChange( true );

		expect( setAttributes ).toHaveBeenCalledWith(
			expect.objectContaining( { useTabs: true, transition: 'slide', autoScroll: false } ),
		);
		expect( mockInsertBlock ).not.toHaveBeenCalled();
	} );

	it( 'removes tab list blocks and re-inserts full nav group container when toggling Use as Tabs OFF and no nav blocks exist', () => {
		mockBlocks = [
			{ name: 'rt-carousel/carousel-tab-list', clientId: 'top-tab-list', innerBlocks: [] },
			{ name: 'rt-carousel/carousel-viewport', clientId: 'viewport-1', innerBlocks: [] },
		];
		const setAttributes = jest.fn();

		render(
			<Edit
				attributes={ { ...createAttributes(), useTabs: true } }
				setAttributes={ setAttributes }
				clientId="test-client-id"
			/>,
		);

		const toggleCall = ( ToggleControl as unknown as jest.Mock ).mock.calls.find(
			( [ props ] ) => props.label === 'Use as Tabs',
		);

		toggleCall[ 0 ].onChange( false );

		expect( setAttributes ).toHaveBeenCalledWith( { useTabs: false } );
		expect( mockRemoveBlocks ).toHaveBeenCalledWith( [ 'top-tab-list' ] );
		expect( mockInsertBlock ).toHaveBeenCalledWith(
			expect.objectContaining( { name: 'core/group' } ),
			undefined,
			'test-client-id',
		);
	} );

	it( 'removes navigation group row containers and navigation blocks when toggling Use as Tabs ON', () => {
		mockBlocks = [
			{ name: 'rt-carousel/carousel-viewport', clientId: 'viewport-1', innerBlocks: [] },
			{
				name: 'core/group',
				clientId: 'group-1',
				innerBlocks: [
					{ name: 'rt-carousel/carousel-controls', clientId: 'nested-controls', innerBlocks: [] },
					{ name: 'rt-carousel/carousel-counter', clientId: 'nested-counter', innerBlocks: [] },
					{ name: 'rt-carousel/carousel-dots', clientId: 'nested-dots', innerBlocks: [] },
				],
			},
		];
		const setAttributes = jest.fn();

		render(
			<Edit
				attributes={ createAttributes() }
				setAttributes={ setAttributes }
				clientId="test-client-id"
			/>,
		);

		const toggleCall = ( ToggleControl as unknown as jest.Mock ).mock.calls.find(
			( [ props ] ) => props.label === 'Use as Tabs',
		);

		toggleCall[ 0 ].onChange( true );

		expect( setAttributes ).toHaveBeenCalledWith( expect.objectContaining( { useTabs: true } ) );
		const removedIds = mockRemoveBlocks.mock.calls[ 0 ][ 0 ];
		expect( removedIds ).toHaveLength( 4 );
		expect( removedIds ).toEqual(
			expect.arrayContaining( [
				'group-1',
				'nested-controls',
				'nested-counter',
				'nested-dots',
			] ),
		);
	} );

	it( 'restores missing nav blocks into the core/group that actually contains nav elements, ignoring unrelated groups', () => {
		mockBlocks = [
			{ name: 'core/group', clientId: 'unrelated-group', innerBlocks: [] },
			{
				name: 'core/group',
				clientId: 'nav-group-1',
				innerBlocks: [
					{ name: 'rt-carousel/carousel-dots', clientId: 'existing-dots', innerBlocks: [] },
				],
			},
		];
		const setAttributes = jest.fn();

		render(
			<Edit
				attributes={ { ...createAttributes(), useTabs: true } }
				setAttributes={ setAttributes }
				clientId="test-client-id"
			/>,
		);

		const toggleCall = ( ToggleControl as unknown as jest.Mock ).mock.calls.find(
			( [ props ] ) => props.label === 'Use as Tabs',
		);

		toggleCall[ 0 ].onChange( false );

		expect( mockInsertBlock ).toHaveBeenCalledWith(
			expect.objectContaining( { name: 'rt-carousel/carousel-controls' } ),
			undefined,
			'nav-group-1',
		);
		expect( mockInsertBlock ).toHaveBeenCalledWith(
			expect.objectContaining( { name: 'rt-carousel/carousel-counter' } ),
			undefined,
			'nav-group-1',
		);
	} );

	it( 're-inserts only missing nav blocks (counter and dots) when controls already exist in a nav group', () => {
		mockBlocks = [
			{
				name: 'core/group',
				clientId: 'nav-group-1',
				innerBlocks: [
					{ name: 'rt-carousel/carousel-controls', clientId: 'existing-controls', innerBlocks: [] },
				],
			},
		];
		const setAttributes = jest.fn();

		render(
			<Edit
				attributes={ { ...createAttributes(), useTabs: true } }
				setAttributes={ setAttributes }
				clientId="test-client-id"
			/>,
		);

		const toggleCall = ( ToggleControl as unknown as jest.Mock ).mock.calls.find(
			( [ props ] ) => props.label === 'Use as Tabs',
		);

		toggleCall[ 0 ].onChange( false );

		// Controls already exist — should NOT be inserted again
		expect( mockInsertBlock ).not.toHaveBeenCalledWith(
			expect.objectContaining( { name: 'rt-carousel/carousel-controls' } ),
			expect.anything(),
			expect.anything(),
		);

		// Missing counter and dots SHOULD be inserted into nav-group-1
		expect( mockInsertBlock ).toHaveBeenCalledWith(
			expect.objectContaining( { name: 'rt-carousel/carousel-counter' } ),
			undefined,
			'nav-group-1',
		);
		expect( mockInsertBlock ).toHaveBeenCalledWith(
			expect.objectContaining( { name: 'rt-carousel/carousel-dots' } ),
			undefined,
			'nav-group-1',
		);
	} );
} );
