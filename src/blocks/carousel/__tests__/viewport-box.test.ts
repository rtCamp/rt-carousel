import { observeViewportBox } from '../viewport-box';

describe( 'observeViewportBox', () => {
	let observed: Element[];
	let disconnect: jest.Mock;
	let callback: ResizeObserverCallback;

	beforeEach( () => {
		observed = [];
		disconnect = jest.fn();
		( global as unknown as { ResizeObserver: unknown } ).ResizeObserver = jest.fn(
			( cb: ResizeObserverCallback ) => {
				callback = cb;
				return {
					observe: ( el: Element ) => observed.push( el ),
					disconnect,
				};
			},
		);
	} );

	afterEach( () => {
		delete ( global as unknown as { ResizeObserver?: unknown } ).ResizeObserver;
	} );

	const setup = () => {
		document.body.innerHTML =
			'<div class="rt-carousel"><div class="embla"></div><div class="nav"></div></div>';
		const root = document.querySelector<HTMLElement>( '.rt-carousel' )!;
		const viewport = document.querySelector<HTMLElement>( '.embla' )!;
		const rect = ( top: number ) => ( { top } ) as DOMRect;
		jest.spyOn( root, 'getBoundingClientRect' ).mockReturnValue( rect( 100 ) );
		jest.spyOn( viewport, 'getBoundingClientRect' ).mockReturnValue( rect( 124 ) );
		Object.defineProperty( viewport, 'offsetHeight', { configurable: true, value: 300 } );
		return { root, viewport };
	};

	it( 'sets the viewport offset and height on the carousel root', () => {
		const { root, viewport } = setup();

		observeViewportBox( viewport );

		expect( root.style.getPropertyValue( '--rt-carousel-viewport-offset' ) ).toBe( '24px' );
		expect( root.style.getPropertyValue( '--rt-carousel-viewport-block-size' ) ).toBe( '300px' );
		expect( observed ).toEqual( [ viewport, root ] );
	} );

	it( 'stops the height at the lowest slide content', () => {
		const { root, viewport } = setup();
		viewport.innerHTML =
			'<div class="embla__slide"><figure></figure></div><div class="embla__slide"><p></p></div>';
		const figure = viewport.querySelector( 'figure' )!;
		const paragraph = viewport.querySelector( 'p' )!;
		jest.spyOn( figure, 'getBoundingClientRect' ).mockReturnValue( { top: 124, bottom: 124 + 77, height: 77 } as DOMRect );
		jest.spyOn( paragraph, 'getBoundingClientRect' ).mockReturnValue( { top: 124, bottom: 124 + 40, height: 40 } as DOMRect );

		observeViewportBox( viewport );

		expect( root.style.getPropertyValue( '--rt-carousel-viewport-block-size' ) ).toBe( '77px' );
		expect( observed ).toEqual( [ viewport, root, figure, paragraph, figure, paragraph ] );
	} );

	it( 'starts the box at the highest slide content', () => {
		const { root, viewport } = setup();
		viewport.innerHTML = '<div class="embla__slide"><h2></h2><p></p></div>';
		const heading = viewport.querySelector( 'h2' )!;
		const paragraph = viewport.querySelector( 'p' )!;
		jest.spyOn( heading, 'getBoundingClientRect' ).mockReturnValue( { top: 124 + 80, bottom: 124 + 100, height: 20 } as DOMRect );
		jest.spyOn( paragraph, 'getBoundingClientRect' ).mockReturnValue( { top: 124 + 100, bottom: 124 + 120, height: 20 } as DOMRect );

		observeViewportBox( viewport );

		expect( root.style.getPropertyValue( '--rt-carousel-viewport-offset' ) ).toBe( '104px' );
		expect( root.style.getPropertyValue( '--rt-carousel-viewport-block-size' ) ).toBe( '40px' );
	} );

	it( 'ignores hidden slides', () => {
		const { root, viewport } = setup();
		viewport.innerHTML =
			'<div class="embla__slide"><p class="shown"></p></div><div class="embla__slide"><p class="hidden"></p></div>';
		const shown = viewport.querySelector( '.shown' )!;
		const hidden = viewport.querySelector( '.hidden' )!;
		jest.spyOn( shown, 'getBoundingClientRect' ).mockReturnValue( { top: 124 + 80, bottom: 124 + 120, height: 40 } as DOMRect );
		jest.spyOn( hidden, 'getBoundingClientRect' ).mockReturnValue( { top: 0, bottom: 0, height: 0, width: 0 } as DOMRect );

		observeViewportBox( viewport );

		expect( root.style.getPropertyValue( '--rt-carousel-viewport-offset' ) ).toBe( '104px' );
		expect( root.style.getPropertyValue( '--rt-carousel-viewport-block-size' ) ).toBe( '40px' );
	} );

	it( 'resyncs after child-list changes in the carousel', async () => {
		const { root, viewport } = setup();
		observeViewportBox( viewport );

		Object.defineProperty( viewport, 'offsetHeight', { configurable: true, value: 150 } );
		root.appendChild( document.createElement( 'div' ) );
		await new Promise( ( resolve ) => setTimeout( resolve, 50 ) );

		expect( root.style.getPropertyValue( '--rt-carousel-viewport-block-size' ) ).toBe( '150px' );
	} );

	it( 'updates when the observer fires', () => {
		const { root, viewport } = setup();
		observeViewportBox( viewport );

		Object.defineProperty( viewport, 'offsetHeight', { configurable: true, value: 180 } );
		callback( [], {} as ResizeObserver );

		expect( root.style.getPropertyValue( '--rt-carousel-viewport-block-size' ) ).toBe( '180px' );
	} );

	it( 'disconnects on cleanup', () => {
		const { viewport } = setup();

		const stopMutations = jest.spyOn( MutationObserver.prototype, 'disconnect' );

		observeViewportBox( viewport )();

		expect( disconnect ).toHaveBeenCalled();
		expect( stopMutations ).toHaveBeenCalled();
		stopMutations.mockRestore();
	} );

	it( 'does nothing outside a carousel', () => {
		document.body.innerHTML = '<div class="embla"></div>';
		const viewport = document.querySelector<HTMLElement>( '.embla' )!;

		expect( () => observeViewportBox( viewport )() ).not.toThrow();
		expect( global.ResizeObserver ).not.toHaveBeenCalled();
	} );
} );
