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
		ToggleControl: jest.fn( () => null ),
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

jest.mock( '@wordpress/data', () => ( {
	useDispatch: jest.fn( () => ( {
		replaceInnerBlocks: jest.fn(),
		insertBlock: jest.fn(),
	} ) ),
	useSelect: jest.fn( ( selector: MockUseSelectCallback ) => {
		const select = ( ( storeName: string ) => {
			if ( storeName === 'core/block-editor' ) {
				return {
					getBlockCount: () => mockBlockCount,
					getBlocks: () => [],
				};
			}

			if ( storeName === 'core/blocks' ) {
				return {
					getBlockTypes: () => [],
				};
			}

			return {};
		} ) as MockSelect;

		return selector( select );
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


} );
