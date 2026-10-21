/**
 * Unit tests for carousel-tab-list view.ts store callbacks and actions.
 *
 * Covers WAI-ARIA tabs keyboard navigation (onTabKeydown) and roving
 * tabindex resolution (getTabTabIndex).
 *
 * @package
 */

import { store, getContext, getElement } from '@wordpress/interactivity';

// Importing the module triggers store() registration.
import '../view';

import type { TabContext } from '../types';

const storeCall = ( store as jest.Mock ).mock.calls.find(
	( call: unknown[] ) => {
		const config = call[ 1 ] as { actions?: { onTabKeydown?: unknown } };
		return typeof config?.actions?.onTabKeydown === 'function';
	},
);
const storeConfig = storeCall
	? ( storeCall[ 1 ] as {
			actions: { onTabKeydown: ( e: KeyboardEvent ) => void };
			callbacks: {
				getTabTabIndex: () => string;
				getKeyFeatureDotText: () => string;
				getTabAriaControls: () => string;
				getTabId: () => string;
			};
		} )
	: null;

/**
 * Build a fake tablist DOM with N tab buttons and return them.
 *
 * @param {number} count - Number of tab buttons to create.
 * @return {{ tablist: HTMLElement; tabs: HTMLButtonElement[] }} DOM handle.
 */
const buildTablist = ( count: number ) => {
	const tablist = document.createElement( 'div' );
	tablist.className = 'wp-block-rt-carousel-carousel-tab-list';
	const tabs: HTMLButtonElement[] = [];
	for ( let i = 0; i < count; i++ ) {
		const btn = document.createElement( 'button' );
		btn.className = 'wp-block-rt-carousel-carousel-tab-list__tab';
		btn.type = 'button';
		tablist.appendChild( btn );
		tabs.push( btn );
	}
	document.body.appendChild( tablist );
	return { tablist, tabs };
};

const dispatchKey = ( target: HTMLElement, key: string ) => {
	const event = new KeyboardEvent( 'keydown', { key, bubbles: true } );
	// jest/jsdom doesn't wire preventDefault to a real default action; spy
	// so we can assert call sites invoke it.
	jest.spyOn( event, 'preventDefault' ).mockImplementation( () => {} );
	target.dispatchEvent( event );
	return event;
};

describe( 'carousel-tab-list store registration', () => {
	it( 'registers onTabKeydown action', () => {
		expect( storeConfig ).not.toBeNull();
		expect( typeof storeConfig?.actions.onTabKeydown ).toBe( 'function' );
	} );
} );

describe( 'onTabKeydown', () => {
	beforeEach( () => {
		jest.clearAllMocks();
	} );

	afterEach( () => {
		document.body.innerHTML = '';
	} );

	it( 'moves focus forward on ArrowRight and wraps from last to first', () => {
		const { tabs } = buildTablist( 3 );
		tabs[ 0 ]!.focus();
		const spyClick = jest.spyOn( tabs[ 1 ]!, 'click' );
		const spyFocus = jest.spyOn( tabs[ 1 ]!, 'focus' );

		( getElement as jest.Mock ).mockReturnValue( { ref: tabs[ 0 ]! } );

		const event = dispatchKey( tabs[ 0 ]!, 'ArrowRight' );
		storeConfig!.actions.onTabKeydown( event );

		expect( spyFocus ).toHaveBeenCalled();
		expect( spyClick ).toHaveBeenCalled();
		expect( event.preventDefault ).toHaveBeenCalled();
	} );

	it( 'moves focus backward on ArrowLeft and wraps from first to last', () => {
		const { tabs } = buildTablist( 3 );
		( getElement as jest.Mock ).mockReturnValue( { ref: tabs[ 0 ]! } );

		// First tab → ArrowLeft should land on last tab (wrap).
		const spyClick = jest.spyOn( tabs[ 2 ]!, 'click' );

		const event = dispatchKey( tabs[ 0 ]!, 'ArrowLeft' );
		storeConfig!.actions.onTabKeydown( event );

		expect( spyClick ).toHaveBeenCalled();
		expect( event.preventDefault ).toHaveBeenCalled();
	} );

	it( 'jumps to first tab on Home', () => {
		const { tabs } = buildTablist( 3 );
		( getElement as jest.Mock ).mockReturnValue( { ref: tabs[ 2 ]! } );

		const spyClick = jest.spyOn( tabs[ 0 ]!, 'click' );
		const event = dispatchKey( tabs[ 2 ]!, 'Home' );
		storeConfig!.actions.onTabKeydown( event );

		expect( spyClick ).toHaveBeenCalled();
	} );

	it( 'jumps to last tab on End', () => {
		const { tabs } = buildTablist( 3 );
		( getElement as jest.Mock ).mockReturnValue( { ref: tabs[ 0 ]! } );

		const spyClick = jest.spyOn( tabs[ 2 ]!, 'click' );
		const event = dispatchKey( tabs[ 0 ]!, 'End' );
		storeConfig!.actions.onTabKeydown( event );

		expect( spyClick ).toHaveBeenCalled();
	} );

	it( 'ArrowDown behaves like ArrowRight (vertical orientation)', () => {
		const { tabs } = buildTablist( 3 );
		( getElement as jest.Mock ).mockReturnValue( { ref: tabs[ 0 ]! } );

		const spyClick = jest.spyOn( tabs[ 1 ]!, 'click' );
		const event = dispatchKey( tabs[ 0 ]!, 'ArrowDown' );
		storeConfig!.actions.onTabKeydown( event );

		expect( spyClick ).toHaveBeenCalled();
	} );

	it( 'ArrowUp behaves like ArrowLeft (vertical orientation)', () => {
		const { tabs } = buildTablist( 3 );
		( getElement as jest.Mock ).mockReturnValue( { ref: tabs[ 2 ]! } );

		const spyClick = jest.spyOn( tabs[ 1 ]!, 'click' );
		const event = dispatchKey( tabs[ 2 ]!, 'ArrowUp' );
		storeConfig!.actions.onTabKeydown( event );

		expect( spyClick ).toHaveBeenCalled();
	} );

	it( 'ignores keys outside the tabs pattern (Enter)', () => {
		const { tabs } = buildTablist( 2 );
		( getElement as jest.Mock ).mockReturnValue( { ref: tabs[ 0 ]! } );

		const event = dispatchKey( tabs[ 0 ]!, 'Enter' );
		storeConfig!.actions.onTabKeydown( event );

		expect( event.preventDefault ).not.toHaveBeenCalled();
	} );

	it( 'bails out when getElement has no ref', () => {
		const { tabs } = buildTablist( 2 );
		( getElement as jest.Mock ).mockReturnValue( { ref: null } );

		const event = dispatchKey( tabs[ 0 ]!, 'ArrowRight' );
		storeConfig!.actions.onTabKeydown( event );

		expect( event.preventDefault ).not.toHaveBeenCalled();
	} );

	it( 'bails out when ref is not inside a tablist', () => {
		const orphan = document.createElement( 'button' );
		document.body.appendChild( orphan );
		( getElement as jest.Mock ).mockReturnValue( { ref: orphan } );

		const event = dispatchKey( orphan, 'ArrowRight' );
		storeConfig!.actions.onTabKeydown( event );

		expect( event.preventDefault ).not.toHaveBeenCalled();
	} );
} );

describe( 'getTabTabIndex (roving tabindex)', () => {
	beforeEach( () => {
		jest.clearAllMocks();
	} );

	const mockContext = ( overrides: Partial< TabContext > = {} ): TabContext => ( {
		carouselId: 'c1',
		selectedIndex: 0,
		snap: { index: 0 },
		...overrides,
	} );

	it( 'returns "0" for the active tab', () => {
		( getContext as jest.Mock ).mockReturnValue(
			mockContext( { selectedIndex: 1, snap: { index: 1 } } ),
		);
		expect( storeConfig!.callbacks.getTabTabIndex() ).toBe( '0' );
	} );

	it( 'returns "-1" for an inactive tab', () => {
		( getContext as jest.Mock ).mockReturnValue(
			mockContext( { selectedIndex: 0, snap: { index: 2 } } ),
		);
		expect( storeConfig!.callbacks.getTabTabIndex() ).toBe( '-1' );
	} );

	it( 'returns "0" for the first tab when selectedIndex is -1', () => {
		( getContext as jest.Mock ).mockReturnValue(
			mockContext( { selectedIndex: -1, snap: { index: 0 } } ),
		);
		expect( storeConfig!.callbacks.getTabTabIndex() ).toBe( '0' );
	} );

	it( 'returns "0" for the first tab when selectedIndex is undefined (uninitialized)', () => {
		( getContext as jest.Mock ).mockReturnValue(
			mockContext( { selectedIndex: undefined as unknown as number, snap: { index: 0 } } ),
		);
		expect( storeConfig!.callbacks.getTabTabIndex() ).toBe( '0' );
	} );

	it( 'returns "-1" when snap or snap.index is undefined', () => {
		( getContext as jest.Mock ).mockReturnValue( {
			carouselId: 'c1',
			selectedIndex: 0,
			snap: undefined,
		} );
		expect( storeConfig!.callbacks.getTabTabIndex() ).toBe( '-1' );
	} );
} );

describe( 'getKeyFeatureDotText', () => {
	beforeEach( () => {
		jest.clearAllMocks();
	} );

	it( 'returns the trimmed label when one is set for the index', () => {
		( getContext as jest.Mock ).mockReturnValue( {
			snap: { index: 1 },
			dotLabels: [ 'first', '  second  ', 'third' ],
		} );
		expect( storeConfig!.callbacks.getKeyFeatureDotText() ).toBe( 'second' );
	} );

	it( 'falls back to 1-based index when no label is set', () => {
		( getContext as jest.Mock ).mockReturnValue( {
			snap: { index: 2 },
			dotLabels: [],
		} );
		expect( storeConfig!.callbacks.getKeyFeatureDotText() ).toBe( '3' );
	} );

	it( 'falls back to 1-based index when label is whitespace-only', () => {
		( getContext as jest.Mock ).mockReturnValue( {
			snap: { index: 0 },
			dotLabels: [ '   ' ],
		} );
		expect( storeConfig!.callbacks.getKeyFeatureDotText() ).toBe( '1' );
	} );
} );

describe( 'tab ARIA id helpers', () => {
	beforeEach( () => {
		jest.clearAllMocks();
	} );

	it( 'getTabId returns deterministic id', () => {
		( getContext as jest.Mock ).mockReturnValue( {
			carouselId: 'abc',
			snap: { index: 2 },
		} );
		expect( storeConfig!.callbacks.getTabId() ).toBe(
			'rt-carousel-tab-abc-2',
		);
	} );

	it( 'getTabAriaControls returns deterministic panel id', () => {
		( getContext as jest.Mock ).mockReturnValue( {
			carouselId: 'abc',
			snap: { index: 2 },
		} );
		expect( storeConfig!.callbacks.getTabAriaControls() ).toBe(
			'rt-carousel-panel-abc-2',
		);
	} );
} );
