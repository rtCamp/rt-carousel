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
		jest.spyOn( figure, 'getBoundingClientRect' ).mockReturnValue( { bottom: 124 + 77 } as DOMRect );
		jest.spyOn( paragraph, 'getBoundingClientRect' ).mockReturnValue( { bottom: 124 + 40 } as DOMRect );

		observeViewportBox( viewport );

		expect( root.style.getPropertyValue( '--rt-carousel-viewport-block-size' ) ).toBe( '77px' );
		expect( observed ).toEqual( [ viewport, root, figure, paragraph ] );
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

		observeViewportBox( viewport )();

		expect( disconnect ).toHaveBeenCalled();
	} );

	it( 'does nothing outside a carousel', () => {
		document.body.innerHTML = '<div class="embla"></div>';
		const viewport = document.querySelector<HTMLElement>( '.embla' )!;

		expect( () => observeViewportBox( viewport )() ).not.toThrow();
		expect( global.ResizeObserver ).not.toHaveBeenCalled();
	} );
} );
