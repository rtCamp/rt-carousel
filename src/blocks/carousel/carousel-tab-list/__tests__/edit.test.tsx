/**
 * Unit tests for the carousel tab list edit component.
 */

import type { ReactNode } from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import Edit from '../edit';
import { EditorCarouselContext } from '../../editor-context';
import type { TabListAttributes } from '../types';

jest.mock( '@wordpress/block-editor', () => ( {
	useBlockProps: jest.fn( ( props = {} ) => ( {
		...props,
		ref: jest.fn(),
	} ) ),
	InspectorControls: ( { children }: { children: ReactNode } ) => children,
	RichText: ( props: {
		value?: string;
		placeholder?: string;
		tagName?: keyof JSX.IntrinsicElements;
		role?: string;
		'aria-selected'?: boolean;
		tabIndex?: number;
		className?: string;
	} ) => {
		const Tag = props.tagName || 'span';
		return (
			<Tag
				role={ props.role }
				aria-selected={ props[ 'aria-selected' ] }
				tabIndex={ props.tabIndex }
				className={ props.className }
				data-testid="rich-text-tab"
			>
				{ props.value || props.placeholder }
			</Tag>
		);
	},
	ColorPalette: () => null,
} ) );

jest.mock( '@wordpress/components', () => {
	const Passthrough = ( { children }: { children?: ReactNode } ) => <>{ children }</>;
	return {
		PanelBody: Passthrough,
		BaseControl: Passthrough,
	};
} );

jest.mock( '@wordpress/data', () => ( {
	useSelect: jest.fn( () => 2 ),
} ) );

describe( 'Carousel Tab List Edit Component', () => {
	const defaultAttributes: TabListAttributes = {
		labels: [ 'Tab 1', 'Tab 2' ],
		activeTabBackgroundColor: '',
		activeTabTextColor: '',
		inactiveTabBackgroundColor: '',
		inactiveTabTextColor: '',
	};

	it( 'renders tabs as editable span elements with role="tab" instead of button elements', () => {
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
					carouselOptions: {},
				} }
			>
				<Edit
					attributes={ defaultAttributes }
					setAttributes={ jest.fn() }
					clientId="test-tab-list-1"
				/>
			</EditorCarouselContext.Provider>,
		);

		const tabs = screen.getAllByTestId( 'rich-text-tab' );
		expect( tabs.length ).toBe( 2 );
		tabs.forEach( ( tab ) => {
			expect( tab.tagName.toLowerCase() ).toBe( 'span' );
			expect( tab ).toHaveAttribute( 'role', 'tab' );
		} );

		expect( tabs[ 0 ] ).toHaveAttribute( 'aria-selected', 'true' );
		expect( tabs[ 0 ] ).toHaveAttribute( 'tabindex', '0' );
		expect( tabs[ 1 ] ).toHaveAttribute( 'aria-selected', 'false' );
		expect( tabs[ 1 ] ).toHaveAttribute( 'tabindex', '-1' );
	} );
} );
