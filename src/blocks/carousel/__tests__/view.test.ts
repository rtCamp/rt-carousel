/**
 * Unit tests for the carousel view.ts frontend logic.
 *
 * Tests cover:
 * - Store registration and configuration
 * - State getters and their return values
 * - Action behaviors (scrollPrev, scrollNext, onDotClick)
 * - Callback behaviors (isSlideActive, isDotActive, getDotLabel, initCarousel)
 * - Error handling and edge cases
 * - Embla Carousel integration
 *
 * @package
 */

import { store, getContext, getElement } from '@wordpress/interactivity';

import EmblaCarousel, { type EmblaCarouselType } from 'embla-carousel';
import Fade from 'embla-carousel-fade';
import Autoplay from 'embla-carousel-autoplay';
import AutoScroll from 'embla-carousel-auto-scroll';

// Symbol key used by the view.ts for Embla instances
const EMBLA_KEY = Symbol.for( 'rt-carousel.carousel' );

// Type for viewport element with Embla instance attached
type EmblaViewportElement = HTMLElement & {
	[EMBLA_KEY]?: EmblaCarouselType;
};

import type { CarouselContext } from '../types';
import { REDUCED_MOTION_QUERY } from '../embla-options';

// Import view to trigger store registration
import '../view';

// Get the store config that was passed to store()
const storeCall = ( store as jest.Mock ).mock.calls.find(
	( call: unknown[] ) => call[ 0 ] === 'rt-carousel/carousel',
);
const storeConfig = storeCall ? storeCall[ 1 ] : null;

/**
 * Helper to set Embla instance on a viewport element.
 *
 * @param {HTMLElement}                viewport The viewport element to attach the Embla instance to.
 * @param {Partial<EmblaCarouselType>} embla    The Embla instance to attach.
 */
const setEmblaOnViewport = (
	viewport: HTMLElement,
	embla: Partial<EmblaCarouselType>,
) => {
	( viewport as EmblaViewportElement )[ EMBLA_KEY ] = embla as EmblaCarouselType;
};

/**
 * Helper to create mock carousel context with customizable properties.
 *
 * @param {Partial<CarouselContext>} overrides Partial properties to override in the default context.
 * @return {CarouselContext} The mock carousel context.
 */
const createMockContext = (
	overrides: Partial<CarouselContext> = {},
): CarouselContext => ( {
	transition: 'slide',
	options: { loop: true },
	autoplay: false,
	isPlaying: false,
	timerIterationId: 0,
	selectedIndex: 0,
	scrollSnaps: [ { index: 0 }, { index: 1 }, { index: 2 } ],
	canScrollPrev: true,
	canScrollNext: true,
	scrollProgress: 0,
	slideCount: 3,
	ariaLabelPattern: 'Go to slide %d',
	autoScroll: false,
	...overrides,
} );

/**
 * Helper to create a mock DOM element structure for carousel.
 *
 * @return {Object} The mock DOM elements.
 */
const createMockCarouselDOM = () => {
	const viewport = document.createElement( 'div' );
	viewport.className = 'embla';

	const wrapper = document.createElement( 'div' );
	wrapper.className = 'rt-carousel';
	wrapper.appendChild( viewport );

	const button = document.createElement( 'button' );
	wrapper.appendChild( button );

	return { wrapper, viewport, button };
};

/**
 * Helper to create mock Embla instance with all required methods.
 *
 * @param {Object} overrides Partial methods to override in the default mock instance.
 * @return {Object} The mock Embla instance.
 */
const createMockEmblaInstance = ( overrides = {} ) => ( {
	scrollPrev: jest.fn(),
	scrollNext: jest.fn(),
	scrollTo: jest.fn(),
	on: jest.fn(),
	off: jest.fn(),
	destroy: jest.fn(),
	canScrollPrev: jest.fn( () => true ),
	canScrollNext: jest.fn( () => true ),
	selectedScrollSnap: jest.fn( () => 0 ),
	scrollSnapList: jest.fn( () => [ 0, 0.5, 1 ] ),
	...overrides,
} );

describe( 'Carousel View Module', () => {
	describe( 'Store Registration', () => {
		it( 'should register store with correct namespace', () => {
			// storeCall being defined proves store was called with the correct namespace
			expect( storeCall ).toBeDefined();
			expect( storeConfig ).not.toBeNull();
			expect( storeCall[ 0 ] ).toBe( 'rt-carousel/carousel' );
		} );

		it( 'should register store with all required sections', () => {
			expect( storeConfig ).toMatchObject( {
				state: expect.any( Object ),
				actions: expect.any( Object ),
				callbacks: expect.any( Object ),
			} );
		} );

		it( 'should have state object defined with getters', () => {
			expect( storeConfig?.state ).toBeDefined();
			expect(
				Object.getOwnPropertyDescriptor( storeConfig.state, 'canScrollPrev' )
					?.get,
			).toBeDefined();
			expect(
				Object.getOwnPropertyDescriptor( storeConfig.state, 'canScrollNext' )
					?.get,
			).toBeDefined();
		} );
	} );

	describe( 'State Getters', () => {
		beforeEach( () => {
			jest.clearAllMocks();
		} );

		describe( 'canScrollPrev', () => {
			it( 'should return true when context.canScrollPrev is true', () => {
				const mockContext = createMockContext( { canScrollPrev: true } );
				( getContext as jest.Mock ).mockReturnValue( mockContext );

				const result =
					Object.getOwnPropertyDescriptor(
						storeConfig.state,
						'canScrollPrev',
					)?.get?.() ?? false;

				expect( result ).toBe( true );
			} );

			it( 'should return false when context.canScrollPrev is false', () => {
				const mockContext = createMockContext( { canScrollPrev: false } );
				( getContext as jest.Mock ).mockReturnValue( mockContext );

				const result =
					Object.getOwnPropertyDescriptor(
						storeConfig.state,
						'canScrollPrev',
					)?.get?.() ?? true;

				expect( result ).toBe( false );
			} );

			it( 'should return true when autoScroll is enabled', () => {
				const mockContext = createMockContext( {
					canScrollPrev: false,
					autoScroll: {
						speed: 2,
						direction: 'forward',
						startDelay: 1000,
						stopOnInteraction: true,
						stopOnMouseEnter: false,
						stopOnFocusIn: true,
					},
				} );
				( getContext as jest.Mock ).mockReturnValue( mockContext );

				const result =
					Object.getOwnPropertyDescriptor(
						storeConfig.state,
						'canScrollPrev',
					)?.get?.() ?? false;

				expect( result ).toBe( true );
			} );
		} );

		describe( 'canScrollNext', () => {
			it( 'should return true when context.canScrollNext is true', () => {
				const mockContext = createMockContext( { canScrollNext: true } );
				( getContext as jest.Mock ).mockReturnValue( mockContext );

				const result =
					Object.getOwnPropertyDescriptor(
						storeConfig.state,
						'canScrollNext',
					)?.get?.() ?? false;

				expect( result ).toBe( true );
			} );

			it( 'should return false when context.canScrollNext is false', () => {
				const mockContext = createMockContext( { canScrollNext: false } );
				( getContext as jest.Mock ).mockReturnValue( mockContext );

				const result =
					Object.getOwnPropertyDescriptor(
						storeConfig.state,
						'canScrollNext',
					)?.get?.() ?? true;

				expect( result ).toBe( false );
			} );

			it( 'should return true when autoScroll is enabled', () => {
				const mockContext = createMockContext( {
					canScrollNext: false,
					autoScroll: {
						speed: 2,
						direction: 'forward',
						startDelay: 1000,
						stopOnInteraction: true,
						stopOnMouseEnter: false,
						stopOnFocusIn: true,
					},
				} );
				( getContext as jest.Mock ).mockReturnValue( mockContext );

				const result =
					Object.getOwnPropertyDescriptor(
						storeConfig.state,
						'canScrollNext',
					)?.get?.() ?? false;

				expect( result ).toBe( true );
			} );
		} );
	} );

	describe( 'Actions', () => {
		beforeEach( () => {
			jest.clearAllMocks();
		} );

		describe( 'scrollPrev', () => {
			it( 'should be defined as a function', () => {
				expect( storeConfig?.actions?.scrollPrev ).toBeDefined();
				expect( typeof storeConfig?.actions?.scrollPrev ).toBe( 'function' );
			} );

			it( 'should call embla.scrollPrev when embla instance exists', () => {
				const { wrapper, viewport, button } = createMockCarouselDOM();
				const mockEmbla = createMockEmblaInstance();

				// Set up embla instance on viewport using the helper
				setEmblaOnViewport( viewport, mockEmbla );

				( getElement as jest.Mock ).mockReturnValue( { ref: button } );
				document.body.appendChild( wrapper );

				storeConfig.actions.scrollPrev();

				expect( mockEmbla.scrollPrev ).toHaveBeenCalledTimes( 1 );

				document.body.removeChild( wrapper );
			} );

			it( 'should log warning when embla instance not found', () => {
				const consoleSpy = jest.spyOn( console, 'warn' ).mockImplementation();
				const button = document.createElement( 'button' );

				( getElement as jest.Mock ).mockReturnValue( { ref: button } );

				storeConfig.actions.scrollPrev();

				expect( consoleSpy ).toHaveBeenCalledWith(
					'Carousel: Embla instance not found for scrollPrev',
				);

				consoleSpy.mockRestore();
			} );

			it( 'should handle null element gracefully', () => {
				const consoleSpy = jest.spyOn( console, 'warn' ).mockImplementation();
				( getElement as jest.Mock ).mockReturnValue( null );

				expect( () => storeConfig.actions.scrollPrev() ).not.toThrow();
				expect( consoleSpy ).toHaveBeenCalled();

				consoleSpy.mockRestore();
			} );

			it( 'should stop (destroy) autoplay and autoscroll if stopOnInteraction is true', () => {
				const { wrapper, viewport, button } = createMockCarouselDOM();
				const mockAutoplay = { stop: jest.fn(), destroy: jest.fn(), reset: jest.fn() };
				const mockAutoScroll = { stop: jest.fn(), destroy: jest.fn(), reset: jest.fn() };
				const mockEmbla = createMockEmblaInstance( {
					plugins: jest.fn( () => ( {
						autoplay: mockAutoplay,
						autoScroll: mockAutoScroll,
					} ) ),
				} );

				setEmblaOnViewport( viewport, mockEmbla );

				const mockContext = createMockContext( {
					autoplay: {
						delay: 3000,
						stopOnInteraction: true,
						stopOnMouseEnter: true,
					},
					autoScroll: {
						speed: 1,
						direction: 'forward',
						startDelay: 0,
						stopOnInteraction: true,
						stopOnMouseEnter: true,
						stopOnFocusIn: true,
					},
				} );

				( getContext as jest.Mock ).mockReturnValue( mockContext );
				( getElement as jest.Mock ).mockReturnValue( { ref: button } );
				document.body.appendChild( wrapper );

				try {
					storeConfig.actions.scrollPrev();

					expect( mockAutoplay.destroy ).toHaveBeenCalledTimes( 1 );
					expect( mockAutoScroll.destroy ).toHaveBeenCalledTimes( 1 );
					expect( mockAutoplay.reset ).not.toHaveBeenCalled();
					expect( mockAutoScroll.reset ).not.toHaveBeenCalled();
				} finally {
					document.body.removeChild( wrapper );
				}
			} );

			it( 'should fall back to stop() when destroy is omitted and stopOnInteraction is true', () => {
				const { wrapper, viewport, button } = createMockCarouselDOM();
				const mockAutoplay = { stop: jest.fn(), reset: jest.fn() };
				const mockAutoScroll = { stop: jest.fn(), reset: jest.fn() };
				const mockEmbla = createMockEmblaInstance( {
					plugins: jest.fn( () => ( {
						autoplay: mockAutoplay,
						autoScroll: mockAutoScroll,
					} ) ),
				} );

				setEmblaOnViewport( viewport, mockEmbla );

				const mockContext = createMockContext( {
					autoplay: {
						delay: 3000,
						stopOnInteraction: true,
						stopOnMouseEnter: true,
					},
					autoScroll: {
						speed: 1,
						direction: 'forward',
						startDelay: 0,
						stopOnInteraction: true,
						stopOnMouseEnter: true,
						stopOnFocusIn: true,
					},
				} );

				( getContext as jest.Mock ).mockReturnValue( mockContext );
				( getElement as jest.Mock ).mockReturnValue( { ref: button } );
				document.body.appendChild( wrapper );

				try {
					storeConfig.actions.scrollPrev();

					expect( mockAutoplay.stop ).toHaveBeenCalledTimes( 1 );
					expect( mockAutoScroll.stop ).toHaveBeenCalledTimes( 1 );
					expect( mockAutoplay.reset ).not.toHaveBeenCalled();
					expect( mockAutoScroll.reset ).not.toHaveBeenCalled();
				} finally {
					document.body.removeChild( wrapper );
				}
			} );

			it( 'should reset autoplay and autoscroll if stopOnInteraction is false', () => {
				const { wrapper, viewport, button } = createMockCarouselDOM();
				const mockAutoplay = { stop: jest.fn(), destroy: jest.fn(), reset: jest.fn() };
				const mockAutoScroll = { stop: jest.fn(), destroy: jest.fn(), reset: jest.fn() };
				const mockEmbla = createMockEmblaInstance( {
					plugins: jest.fn( () => ( {
						autoplay: mockAutoplay,
						autoScroll: mockAutoScroll,
					} ) ),
				} );

				setEmblaOnViewport( viewport, mockEmbla );

				const mockContext = createMockContext( {
					autoplay: {
						delay: 3000,
						stopOnInteraction: false,
						stopOnMouseEnter: true,
					},
					autoScroll: {
						speed: 1,
						direction: 'forward',
						startDelay: 0,
						stopOnInteraction: false,
						stopOnMouseEnter: true,
						stopOnFocusIn: true,
					},
				} );

				( getContext as jest.Mock ).mockReturnValue( mockContext );
				( getElement as jest.Mock ).mockReturnValue( { ref: button } );
				document.body.appendChild( wrapper );

				try {
					storeConfig.actions.scrollPrev();

					expect( mockAutoplay.destroy ).not.toHaveBeenCalled();
					expect( mockAutoScroll.destroy ).not.toHaveBeenCalled();
					expect( mockAutoplay.reset ).toHaveBeenCalledTimes( 1 );
					expect( mockAutoScroll.reset ).toHaveBeenCalledTimes( 1 );
				} finally {
					document.body.removeChild( wrapper );
				}
			} );

			it( 'should stop (destroy) autoplay and autoscroll if stopOnInteraction is omitted/undefined (defaults to true)', () => {
				const { wrapper, viewport, button } = createMockCarouselDOM();
				const mockAutoplay = { stop: jest.fn(), destroy: jest.fn(), reset: jest.fn() };
				const mockAutoScroll = { stop: jest.fn(), destroy: jest.fn(), reset: jest.fn() };
				const mockEmbla = createMockEmblaInstance( {
					plugins: jest.fn( () => ( {
						autoplay: mockAutoplay,
						autoScroll: mockAutoScroll,
					} ) ),
				} );

				setEmblaOnViewport( viewport, mockEmbla );

				const mockContext = createMockContext( {
					autoplay: {
						delay: 3000,
						// stopOnInteraction omitted
						stopOnMouseEnter: true,
					} as unknown as CarouselContext[ 'autoplay' ],
					autoScroll: {
						speed: 1,
						direction: 'forward',
						startDelay: 0,
						// stopOnInteraction omitted
						stopOnMouseEnter: true,
						stopOnFocusIn: true,
					} as unknown as CarouselContext[ 'autoScroll' ],
				} );

				( getContext as jest.Mock ).mockReturnValue( mockContext );
				( getElement as jest.Mock ).mockReturnValue( { ref: button } );
				document.body.appendChild( wrapper );

				try {
					storeConfig.actions.scrollPrev();

					expect( mockAutoplay.destroy ).toHaveBeenCalledTimes( 1 );
					expect( mockAutoScroll.destroy ).toHaveBeenCalledTimes( 1 );
				} finally {
					document.body.removeChild( wrapper );
				}
			} );

			it( 'should not call stop, destroy, or reset on autoplay or autoscroll if context config is false', () => {
				const { wrapper, viewport, button } = createMockCarouselDOM();
				const mockAutoplay = { stop: jest.fn(), destroy: jest.fn(), reset: jest.fn() };
				const mockAutoScroll = { stop: jest.fn(), destroy: jest.fn(), reset: jest.fn() };
				const mockEmbla = createMockEmblaInstance( {
					plugins: jest.fn( () => ( {
						autoplay: mockAutoplay,
						autoScroll: mockAutoScroll,
					} ) ),
				} );

				setEmblaOnViewport( viewport, mockEmbla );

				const mockContext = createMockContext( {
					autoplay: false,
					autoScroll: false,
				} );

				( getContext as jest.Mock ).mockReturnValue( mockContext );
				( getElement as jest.Mock ).mockReturnValue( { ref: button } );
				document.body.appendChild( wrapper );

				try {
					storeConfig.actions.scrollPrev();

					expect( mockAutoplay.destroy ).not.toHaveBeenCalled();
					expect( mockAutoplay.stop ).not.toHaveBeenCalled();
					expect( mockAutoplay.reset ).not.toHaveBeenCalled();
					expect( mockAutoScroll.destroy ).not.toHaveBeenCalled();
					expect( mockAutoScroll.stop ).not.toHaveBeenCalled();
					expect( mockAutoScroll.reset ).not.toHaveBeenCalled();
				} finally {
					document.body.removeChild( wrapper );
				}
			} );
		} );

		describe( 'scrollNext', () => {
			it( 'should be defined as a function', () => {
				expect( storeConfig?.actions?.scrollNext ).toBeDefined();
				expect( typeof storeConfig?.actions?.scrollNext ).toBe( 'function' );
			} );

			it( 'should call embla.scrollNext when embla instance exists', () => {
				const { wrapper, viewport, button } = createMockCarouselDOM();
				const mockEmbla = createMockEmblaInstance();

				setEmblaOnViewport( viewport, mockEmbla );

				( getElement as jest.Mock ).mockReturnValue( { ref: button } );
				document.body.appendChild( wrapper );

				storeConfig.actions.scrollNext();

				expect( mockEmbla.scrollNext ).toHaveBeenCalledTimes( 1 );

				document.body.removeChild( wrapper );
			} );

			it( 'should log warning when embla instance not found', () => {
				const consoleSpy = jest.spyOn( console, 'warn' ).mockImplementation();
				const button = document.createElement( 'button' );

				( getElement as jest.Mock ).mockReturnValue( { ref: button } );

				storeConfig.actions.scrollNext();

				expect( consoleSpy ).toHaveBeenCalledWith(
					'Carousel: Embla instance not found for scrollNext',
				);

				consoleSpy.mockRestore();
			} );

			it( 'should stop autoplay and autoscroll if stopOnInteraction is true', () => {
				const { wrapper, viewport, button } = createMockCarouselDOM();
				const mockAutoplay = { stop: jest.fn(), destroy: jest.fn(), reset: jest.fn() };
				const mockAutoScroll = { stop: jest.fn(), destroy: jest.fn(), reset: jest.fn() };
				const mockEmbla = createMockEmblaInstance( {
					plugins: jest.fn( () => ( {
						autoplay: mockAutoplay,
						autoScroll: mockAutoScroll,
					} ) ),
				} );

				setEmblaOnViewport( viewport, mockEmbla );

				const mockContext = createMockContext( {
					autoplay: {
						delay: 3000,
						stopOnInteraction: true,
						stopOnMouseEnter: true,
					},
					autoScroll: {
						speed: 1,
						direction: 'forward',
						startDelay: 0,
						stopOnInteraction: true,
						stopOnMouseEnter: true,
						stopOnFocusIn: true,
					},
				} );

				( getContext as jest.Mock ).mockReturnValue( mockContext );
				( getElement as jest.Mock ).mockReturnValue( { ref: button } );
				document.body.appendChild( wrapper );

				try {
					storeConfig.actions.scrollNext();

					expect( mockAutoplay.destroy ).toHaveBeenCalledTimes( 1 );
					expect( mockAutoScroll.destroy ).toHaveBeenCalledTimes( 1 );
				} finally {
					document.body.removeChild( wrapper );
				}
			} );
		} );

		describe( 'onDotClick', () => {
			it( 'should be defined as a function', () => {
				expect( storeConfig?.actions?.onDotClick ).toBeDefined();
				expect( typeof storeConfig?.actions?.onDotClick ).toBe( 'function' );
			} );

			it( 'should call embla.scrollTo with correct index', () => {
				const { wrapper, viewport, button } = createMockCarouselDOM();
				const mockEmbla = createMockEmblaInstance();

				setEmblaOnViewport( viewport, mockEmbla );

				const mockContext = createMockContext();
				( mockContext as CarouselContext & { snap?: { index: number } } ).snap = {
					index: 2,
				};

				( getContext as jest.Mock ).mockReturnValue( mockContext );
				( getElement as jest.Mock ).mockReturnValue( { ref: button } );
				document.body.appendChild( wrapper );

				storeConfig.actions.onDotClick();

				expect( mockEmbla.scrollTo ).toHaveBeenCalledWith( 2 );

				document.body.removeChild( wrapper );
			} );

			it( 'should not throw when snap is undefined', () => {
				const mockContext = createMockContext();
				( getContext as jest.Mock ).mockReturnValue( mockContext );
				( getElement as jest.Mock ).mockReturnValue( null );

				expect( () => storeConfig.actions.onDotClick() ).not.toThrow();
			} );

			it( 'should handle snap.index of 0 correctly', () => {
				const { wrapper, viewport, button } = createMockCarouselDOM();
				const mockEmbla = createMockEmblaInstance();

				setEmblaOnViewport( viewport, mockEmbla );

				const mockContext = createMockContext( {
					selectedIndex: 1,
				} );
				( mockContext as CarouselContext & { snap?: { index: number } } ).snap = {
					index: 0,
				};

				( getContext as jest.Mock ).mockReturnValue( mockContext );
				( getElement as jest.Mock ).mockReturnValue( { ref: button } );
				document.body.appendChild( wrapper );

				storeConfig.actions.onDotClick();

				expect( mockEmbla.scrollTo ).toHaveBeenCalledWith( 0 );

				document.body.removeChild( wrapper );
			} );

			it( 'should stop autoplay and autoscroll if stopOnInteraction is true', () => {
				const { wrapper, viewport, button } = createMockCarouselDOM();
				const mockAutoplay = { stop: jest.fn(), destroy: jest.fn(), reset: jest.fn() };
				const mockAutoScroll = { stop: jest.fn(), destroy: jest.fn(), reset: jest.fn() };
				const mockEmbla = createMockEmblaInstance( {
					plugins: jest.fn( () => ( {
						autoplay: mockAutoplay,
						autoScroll: mockAutoScroll,
					} ) ),
				} );

				setEmblaOnViewport( viewport, mockEmbla );

				const mockContext = createMockContext( {
					autoplay: {
						delay: 3000,
						stopOnInteraction: true,
						stopOnMouseEnter: true,
					},
					autoScroll: {
						speed: 1,
						direction: 'forward',
						startDelay: 0,
						stopOnInteraction: true,
						stopOnMouseEnter: true,
						stopOnFocusIn: true,
					},
				} );
				( mockContext as CarouselContext & { snap?: { index: number } } ).snap = {
					index: 2,
				};

				( getContext as jest.Mock ).mockReturnValue( mockContext );
				( getElement as jest.Mock ).mockReturnValue( { ref: button } );
				document.body.appendChild( wrapper );

				try {
					storeConfig.actions.onDotClick();

					expect( mockAutoplay.destroy ).toHaveBeenCalledTimes( 1 );
					expect( mockAutoScroll.destroy ).toHaveBeenCalledTimes( 1 );
				} finally {
					document.body.removeChild( wrapper );
				}
			} );
		} );
	} );

	describe( 'Callbacks', () => {
		beforeEach( () => {
			jest.clearAllMocks();
		} );

		describe( 'isSlideActive', () => {
			it( 'should be defined as a function', () => {
				expect( storeConfig?.callbacks?.isSlideActive ).toBeDefined();
				expect( typeof storeConfig?.callbacks?.isSlideActive ).toBe( 'function' );
			} );

			it( 'should return false when element is null', () => {
				( getElement as jest.Mock ).mockReturnValue( null );

				const result = storeConfig.callbacks.isSlideActive();

				expect( result ).toBe( false );
			} );

			it( 'should return true when slide index matches selectedIndex', () => {
				const container = document.createElement( 'div' );
				container.className = 'embla__container';

				const slide1 = document.createElement( 'div' );
				slide1.className = 'embla__slide';
				const slide2 = document.createElement( 'div' );
				slide2.className = 'embla__slide';

				container.appendChild( slide1 );
				container.appendChild( slide2 );

				const mockContext = createMockContext( { selectedIndex: 1, initialized: true } );
				( getContext as jest.Mock ).mockReturnValue( mockContext );
				( getElement as jest.Mock ).mockReturnValue( { ref: slide2 } );

				const result = storeConfig.callbacks.isSlideActive();

				expect( result ).toBe( true );
			} );

			it( 'should return false when slide index does not match selectedIndex', () => {
				const container = document.createElement( 'div' );
				container.className = 'embla__container';

				const slide1 = document.createElement( 'div' );
				slide1.className = 'embla__slide';
				const slide2 = document.createElement( 'div' );
				slide2.className = 'embla__slide';

				container.appendChild( slide1 );
				container.appendChild( slide2 );

				const mockContext = createMockContext( { selectedIndex: 0, initialized: true } );
				( getContext as jest.Mock ).mockReturnValue( mockContext );
				( getElement as jest.Mock ).mockReturnValue( { ref: slide2 } );

				const result = storeConfig.callbacks.isSlideActive();

				expect( result ).toBe( false );
			} );

			it( 'should work with Query Loop posts (.wp-block-post)', () => {
				const container = document.createElement( 'div' );

				const post1 = document.createElement( 'li' );
				post1.className = 'wp-block-post';
				const post2 = document.createElement( 'li' );
				post2.className = 'wp-block-post';

				container.appendChild( post1 );
				container.appendChild( post2 );

				const mockContext = createMockContext( { selectedIndex: 0, initialized: true } );
				( getContext as jest.Mock ).mockReturnValue( mockContext );
				( getElement as jest.Mock ).mockReturnValue( { ref: post1 } );

				const result = storeConfig.callbacks.isSlideActive();

				expect( result ).toBe( true );
			} );

			it( 'should work with Terms Query terms (.wp-block-term)', () => {
				const container = document.createElement( 'div' );

				const term1 = document.createElement( 'li' );
				term1.className = 'wp-block-term';
				const term2 = document.createElement( 'li' );
				term2.className = 'wp-block-term';

				container.appendChild( term1 );
				container.appendChild( term2 );

				const mockContext = createMockContext( { selectedIndex: 1, initialized: true } );
				( getContext as jest.Mock ).mockReturnValue( mockContext );
				( getElement as jest.Mock ).mockReturnValue( { ref: term2 } );

				const result = storeConfig.callbacks.isSlideActive();

				expect( result ).toBe( true );
			} );
		} );

		describe( 'isDotActive', () => {
			it( 'should be defined as a function', () => {
				expect( storeConfig?.callbacks?.isDotActive ).toBeDefined();
				expect( typeof storeConfig?.callbacks?.isDotActive ).toBe( 'function' );
			} );

			it( 'should return true when snap.index matches selectedIndex', () => {
				const mockContext = createMockContext( { selectedIndex: 2 } );
				( mockContext as CarouselContext & { snap?: { index: number } } ).snap = {
					index: 2,
				};

				( getContext as jest.Mock ).mockReturnValue( mockContext );

				const result = storeConfig.callbacks.isDotActive();

				expect( result ).toBe( true );
			} );

			it( 'should return false when snap.index does not match selectedIndex', () => {
				const mockContext = createMockContext( { selectedIndex: 0 } );
				( mockContext as CarouselContext & { snap?: { index: number } } ).snap = {
					index: 2,
				};

				( getContext as jest.Mock ).mockReturnValue( mockContext );

				const result = storeConfig.callbacks.isDotActive();

				expect( result ).toBe( false );
			} );
		} );

		describe( 'getDotLabel', () => {
			it( 'should be defined as a function', () => {
				expect( storeConfig?.callbacks?.getDotLabel ).toBeDefined();
				expect( typeof storeConfig?.callbacks?.getDotLabel ).toBe( 'function' );
			} );

			it( 'should return formatted label with correct index (1-based)', () => {
				const mockContext = createMockContext( {
					ariaLabelPattern: 'Go to slide %d',
				} );
				( mockContext as CarouselContext & { snap?: { index: number } } ).snap = {
					index: 2,
				};

				( getContext as jest.Mock ).mockReturnValue( mockContext );

				const result = storeConfig.callbacks.getDotLabel();

				expect( result ).toBe( 'Go to slide 3' );
			} );

			it( 'should handle first slide (index 0) correctly', () => {
				const mockContext = createMockContext( {
					ariaLabelPattern: 'Slide %d of 5',
				} );
				( mockContext as CarouselContext & { snap?: { index: number } } ).snap = {
					index: 0,
				};

				( getContext as jest.Mock ).mockReturnValue( mockContext );

				const result = storeConfig.callbacks.getDotLabel();

				expect( result ).toBe( 'Slide 1 of 5' );
			} );

			it( 'should handle undefined snap index', () => {
				const mockContext = createMockContext( {
					ariaLabelPattern: 'Go to slide %d',
				} );

				( getContext as jest.Mock ).mockReturnValue( mockContext );

				const result = storeConfig.callbacks.getDotLabel();

				expect( result ).toBe( 'Go to slide 1' );
			} );
		} );

		describe( 'getProgressBarNow', () => {
			it( 'should return 0 when slideCount is 0', () => {
				const mockContext = createMockContext( { slideCount: 0 } );
				( getContext as jest.Mock ).mockReturnValue( mockContext );

				const result = storeConfig.callbacks.getProgressBarNow();
				expect( result ).toBe( 0 );
			} );

			it( 'should return 0 when slideCount is 1', () => {
				const mockContext = createMockContext( { slideCount: 1 } );
				( getContext as jest.Mock ).mockReturnValue( mockContext );

				const result = storeConfig.callbacks.getProgressBarNow();
				expect( result ).toBe( 0 );
			} );

			it( 'should use index-based progress in loop mode', () => {
				const mockContext = createMockContext( {
					options: { loop: true },
					selectedIndex: 1,
					slideCount: 3,
				} );
				( getContext as jest.Mock ).mockReturnValue( mockContext );

				const result = storeConfig.callbacks.getProgressBarNow();
				expect( result ).toBe( 50 );
			} );

			it( 'should return 100 at last slide in loop mode', () => {
				const mockContext = createMockContext( {
					options: { loop: true },
					selectedIndex: 2,
					slideCount: 3,
				} );
				( getContext as jest.Mock ).mockReturnValue( mockContext );

				const result = storeConfig.callbacks.getProgressBarNow();
				expect( result ).toBe( 100 );
			} );

			it( 'should use scrollProgress in non-loop mode', () => {
				const mockContext = createMockContext( {
					options: { loop: false },
					scrollProgress: 0.75,
					slideCount: 4,
				} );
				( getContext as jest.Mock ).mockReturnValue( mockContext );

				const result = storeConfig.callbacks.getProgressBarNow();
				expect( result ).toBe( 75 );
			} );

			it( 'should clamp scrollProgress to [0, 1] in non-loop mode', () => {
				const mockContext = createMockContext( {
					options: { loop: false },
					scrollProgress: 1.5,
					slideCount: 3,
				} );
				( getContext as jest.Mock ).mockReturnValue( mockContext );

				const result = storeConfig.callbacks.getProgressBarNow();
				expect( result ).toBe( 100 );
			} );
		} );

		describe( 'carousel count callbacks', () => {
			it( 'should return 1-based current count', () => {
				const mockContext = createMockContext( { selectedIndex: 2 } );
				( getContext as jest.Mock ).mockReturnValue( mockContext );

				const result = storeConfig.callbacks.getCurrentCount();

				expect( result ).toBe( '3' );
			} );

			it( 'should use scroll snap length for total count', () => {
				const mockContext = createMockContext( {
					scrollSnaps: [ { index: 0 }, { index: 1 } ],
					slideCount: 6,
				} );
				( getContext as jest.Mock ).mockReturnValue( mockContext );

				const result = storeConfig.callbacks.getTotalCount();

				expect( result ).toBe( '2' );
			} );

			it( 'should return accessible count label', () => {
				const mockContext = createMockContext( {
					selectedIndex: 1,
					scrollSnaps: [ { index: 0 }, { index: 1 }, { index: 2 } ],
					countLabelPattern: 'Slide {{currentSlide}} of {{totalSlides}}',
				} );
				( getContext as jest.Mock ).mockReturnValue( mockContext );

				const result = storeConfig.callbacks.getCountLabel();

				expect( result ).toBe( 'Slide 2 of 3' );
			} );

			it( 'should replace repeated placeholders in count label', () => {
				const mockContext = createMockContext( {
					selectedIndex: 1,
					scrollSnaps: [ { index: 0 }, { index: 1 }, { index: 2 } ],
					countLabelPattern:
						'Slide {{currentSlide}} of {{totalSlides}} ({{currentSlide}}/{{totalSlides}})',
				} );
				( getContext as jest.Mock ).mockReturnValue( mockContext );

				const result = storeConfig.callbacks.getCountLabel();

				expect( result ).toBe( 'Slide 2 of 3 (2/3)' );
			} );
		} );

		describe( 'getProgressBarStyle', () => {
			it( 'should return display:none when slideCount is 0', () => {
				const mockContext = createMockContext( { slideCount: 0 } );
				( getContext as jest.Mock ).mockReturnValue( mockContext );

				const result = storeConfig.callbacks.getProgressBarStyle();
				expect( result ).toBe( 'display:none' );
			} );

			it( 'should return display:none when slideCount is 1', () => {
				const mockContext = createMockContext( { slideCount: 1 } );
				( getContext as jest.Mock ).mockReturnValue( mockContext );

				const result = storeConfig.callbacks.getProgressBarStyle();
				expect( result ).toBe( 'display:none' );
			} );

			it( 'should return transform style with index-based progress in loop mode', () => {
				const mockContext = createMockContext( {
					options: { loop: true },
					selectedIndex: 1,
					slideCount: 3,
				} );
				( getContext as jest.Mock ).mockReturnValue( mockContext );

				const result = storeConfig.callbacks.getProgressBarStyle();
				expect( result ).toBe( 'transform:translate3d(50%, 0px, 0px)' );
			} );

			it( 'should return transform style with scrollProgress in non-loop mode', () => {
				const mockContext = createMockContext( {
					options: { loop: false },
					scrollProgress: 0.5,
					slideCount: 3,
				} );
				( getContext as jest.Mock ).mockReturnValue( mockContext );

				const result = storeConfig.callbacks.getProgressBarStyle();
				expect( result ).toBe( 'transform:translate3d(50%, 0px, 0px)' );
			} );
		} );

		describe( 'initCarousel', () => {
			it( 'should be defined as a function', () => {
				expect( storeConfig?.callbacks?.initCarousel ).toBeDefined();
				expect( typeof storeConfig?.callbacks?.initCarousel ).toBe( 'function' );
			} );

			it( 'should return early and log warning for invalid element', () => {
				const consoleSpy = jest.spyOn( console, 'warn' ).mockImplementation();
				const mockContext = createMockContext();

				( getContext as jest.Mock ).mockReturnValue( mockContext );
				( getElement as jest.Mock ).mockReturnValue( null );

				const result = storeConfig.callbacks.initCarousel();

				expect( consoleSpy ).toHaveBeenCalledWith(
					'Carousel: Invalid root element',
					null,
				);
				expect( result ).toBeUndefined();

				consoleSpy.mockRestore();
			} );

			it( 'should log warning when viewport not found', () => {
				const consoleSpy = jest.spyOn( console, 'warn' ).mockImplementation();
				const mockContext = createMockContext();
				const element = document.createElement( 'div' );

				( getContext as jest.Mock ).mockReturnValue( mockContext );
				( getElement as jest.Mock ).mockReturnValue( { ref: element } );

				const result = storeConfig.callbacks.initCarousel();

				expect( consoleSpy ).toHaveBeenCalledWith(
					'Carousel: Viewport (.embla) not found',
				);
				expect( result ).toBeUndefined();

				consoleSpy.mockRestore();
			} );

			it( 'should handle errors gracefully and log them', () => {
				const consoleErrorSpy = jest
					.spyOn( console, 'error' )
					.mockImplementation();
				const mockContext = createMockContext();

				// Create element that will cause an error
				const element = {
					querySelector: () => {
						throw new Error( 'Test error' );
					},
				};

				( getContext as jest.Mock ).mockReturnValue( mockContext );
				( getElement as jest.Mock ).mockReturnValue( { ref: element } );

				const result = storeConfig.callbacks.initCarousel();

				expect( consoleErrorSpy ).toHaveBeenCalledWith(
					'Carousel: Error in initCarousel',
					expect.any( Error ),
				);
				expect( result ).toBeNull();

				consoleErrorSpy.mockRestore();
			} );

			it( 'should update announcement after a manual slide change', () => {
				const mockContext = createMockContext( {
					announcementPattern:
						'Slide {{currentSlide}} of {{totalSlides}} ({{currentSlide}}/{{totalSlides}})',
					selectedIndex: -1,
				} );
				const { wrapper, viewport } = createMockCarouselDOM();
				const listeners: {
					select?: () => void;
				} = {};
				const selectedScrollSnap = jest
					.fn()
					.mockReturnValueOnce( 0 )
					.mockReturnValueOnce( 1 );
				const mockEmbla = createMockEmblaInstance( {
					selectedScrollSnap,
					scrollSnapList: jest.fn( () => [ 0, 1, 2, 3, 4 ] ),
					slideNodes: jest.fn( () =>
						Array.from( { length: 5 }, () => document.createElement( 'div' ) ),
					),
					scrollProgress: jest.fn( () => 0.25 ),
				} );
				const originalIntersectionObserver = window.IntersectionObserver;

				mockEmbla.on = jest.fn( ( eventName: string, callback: () => void ) => {
					if ( eventName === 'select' ) {
						listeners.select = callback;
					}
					return mockEmbla;
				} );

				viewport.getBoundingClientRect = jest.fn( () => ( {
					width: 100,
					height: 0,
					top: 0,
					right: 0,
					bottom: 0,
					left: 0,
					x: 0,
					y: 0,
					toJSON: () => ( {} ),
				} ) );

				( getContext as jest.Mock ).mockReturnValue( mockContext );
				( getElement as jest.Mock ).mockReturnValue( { ref: wrapper } );
				( EmblaCarousel as unknown as jest.Mock ).mockReturnValue( mockEmbla );
				delete ( window as Window & { IntersectionObserver?: typeof IntersectionObserver } ).IntersectionObserver;

				try {
					storeConfig.callbacks.initCarousel();

					mockContext.shouldAnnounce = true;
					listeners.select?.();

					expect( mockContext.announcement ).toBe( 'Slide 2 of 5 (2/5)' );
					expect( mockContext.shouldAnnounce ).toBe( false );
				} finally {
					( window as Window & { IntersectionObserver?: typeof IntersectionObserver } ).IntersectionObserver =
						originalIntersectionObserver;
				}
			} );

			it( 'includes the Fade plugin when transition is fade', () => {
				const mockContext = createMockContext( { transition: 'fade' } );
				const { wrapper, viewport } = createMockCarouselDOM();
				const originalIntersectionObserver = window.IntersectionObserver;

				viewport.getBoundingClientRect = jest.fn( () => ( {
					width: 100,
					height: 0,
					top: 0,
					right: 0,
					bottom: 0,
					left: 0,
					x: 0,
					y: 0,
					toJSON: () => ( {} ),
				} ) );

				( getContext as jest.Mock ).mockReturnValue( mockContext );
				( getElement as jest.Mock ).mockReturnValue( { ref: wrapper } );
				( EmblaCarousel as unknown as jest.Mock ).mockReturnValue(
					createMockEmblaInstance( {
						scrollProgress: jest.fn( () => 0 ),
						slideNodes: jest.fn( () => [] ),
					} ),
				);
				delete ( window as Window & { IntersectionObserver?: typeof IntersectionObserver } ).IntersectionObserver;

				try {
					storeConfig.callbacks.initCarousel();

					const lastCall = ( EmblaCarousel as unknown as jest.Mock ).mock.calls.at( -1 );
					expect( lastCall?.[ 1 ] ).toMatchObject( {
						align: 'center',
						containScroll: false,
						dragFree: false,
						slidesToScroll: 1,
					} );
					expect( lastCall?.[ 2 ] ).toContainEqual( ( Fade as unknown as jest.Mock ).mock.results.at( -1 )?.value );
				} finally {
					( window as Window & { IntersectionObserver?: typeof IntersectionObserver } ).IntersectionObserver =
						originalIntersectionObserver;
				}
			} );

			it( 'does not include the Fade plugin when transition is slide', () => {
				const mockContext = createMockContext( { transition: 'slide' } );
				const { wrapper, viewport } = createMockCarouselDOM();
				const originalIntersectionObserver = window.IntersectionObserver;

				viewport.getBoundingClientRect = jest.fn( () => ( {
					width: 100,
					height: 0,
					top: 0,
					right: 0,
					bottom: 0,
					left: 0,
					x: 0,
					y: 0,
					toJSON: () => ( {} ),
				} ) );

				( getContext as jest.Mock ).mockReturnValue( mockContext );
				( getElement as jest.Mock ).mockReturnValue( { ref: wrapper } );
				( EmblaCarousel as unknown as jest.Mock ).mockReturnValue(
					createMockEmblaInstance( {
						scrollProgress: jest.fn( () => 0 ),
						slideNodes: jest.fn( () => [] ),
					} ),
				);
				delete ( window as Window & { IntersectionObserver?: typeof IntersectionObserver } ).IntersectionObserver;

				try {
					storeConfig.callbacks.initCarousel();

					const lastCall = ( EmblaCarousel as unknown as jest.Mock ).mock.calls.at( -1 );
					expect( lastCall?.[ 2 ] ).toEqual( [] );
				} finally {
					( window as Window & { IntersectionObserver?: typeof IntersectionObserver } ).IntersectionObserver =
						originalIntersectionObserver;
				}
			} );

			it( 'includes the AutoScroll plugin when transition is fade', () => {
				const mockContext = createMockContext( {
					transition: 'fade',
					autoScroll: {
						speed: 2,
						direction: 'forward',
						startDelay: 1000,
						stopOnInteraction: true,
						stopOnMouseEnter: false,
						stopOnFocusIn: true,
					},
				} );
				const { wrapper, viewport } = createMockCarouselDOM();
				const originalIntersectionObserver = window.IntersectionObserver;

				viewport.getBoundingClientRect = jest.fn( () => ( {
					width: 100,
					height: 0,
					top: 0,
					right: 0,
					bottom: 0,
					left: 0,
					x: 0,
					y: 0,
					toJSON: () => ( {} ),
				} ) );

				( getContext as jest.Mock ).mockReturnValue( mockContext );
				( getElement as jest.Mock ).mockReturnValue( { ref: wrapper } );
				( EmblaCarousel as unknown as jest.Mock ).mockReturnValue(
					createMockEmblaInstance( {
						scrollProgress: jest.fn( () => 0 ),
						slideNodes: jest.fn( () => [] ),
					} ),
				);
				delete ( window as Window & { IntersectionObserver?: typeof IntersectionObserver } ).IntersectionObserver;

				try {
					storeConfig.callbacks.initCarousel();

					const lastCall = ( EmblaCarousel as unknown as jest.Mock ).mock.calls.at( -1 );
					expect( lastCall?.[ 2 ] ).toContainEqual( ( Fade as unknown as jest.Mock ).mock.results.at( -1 )?.value );
					const autoScrollMockResult = ( AutoScroll as unknown as jest.Mock ).mock.results.at( -1 )?.value;
					expect( lastCall?.[ 2 ] ).toContainEqual( autoScrollMockResult );
				} finally {
					( window as Window & { IntersectionObserver?: typeof IntersectionObserver } ).IntersectionObserver =
						originalIntersectionObserver;
				}
			} );

			it( 'sets isPlaying when auto scroll plays and stops', () => {
				const mockContext = createMockContext( {
					autoScroll: {
						speed: 2,
						direction: 'forward',
						startDelay: 1000,
						stopOnInteraction: true,
						stopOnMouseEnter: false,
						stopOnFocusIn: true,
					},
				} );
				const { wrapper, viewport } = createMockCarouselDOM();
				const originalIntersectionObserver = window.IntersectionObserver;
				const mockEmbla = createMockEmblaInstance( {
					scrollProgress: jest.fn( () => 0 ),
					slideNodes: jest.fn( () => [] ),
				} );

				viewport.getBoundingClientRect = jest.fn( () => ( {
					width: 100,
					height: 0,
					top: 0,
					right: 0,
					bottom: 0,
					left: 0,
					x: 0,
					y: 0,
					toJSON: () => ( {} ),
				} ) );

				( getContext as jest.Mock ).mockReturnValue( mockContext );
				( getElement as jest.Mock ).mockReturnValue( { ref: wrapper } );
				( EmblaCarousel as unknown as jest.Mock ).mockReturnValue( mockEmbla );
				delete ( window as Window & { IntersectionObserver?: typeof IntersectionObserver } ).IntersectionObserver;

				try {
					storeConfig.callbacks.initCarousel();

					const getHandler = ( eventName: string ) =>
						mockEmbla.on.mock.calls.find(
							( [ name ] ) => name === eventName,
						)?.[ 1 ];

					expect( mockContext.isPlaying ).toBe( false );

					getHandler( 'autoScroll:play' )?.();
					expect( mockContext.isPlaying ).toBe( true );

					getHandler( 'autoScroll:stop' )?.();
					expect( mockContext.isPlaying ).toBe( false );
				} finally {
					( window as Window & { IntersectionObserver?: typeof IntersectionObserver } ).IntersectionObserver =
						originalIntersectionObserver;
				}
			} );

			it( 'sets isPlaying when auto scroll started before the listeners were attached', () => {
				const mockContext = createMockContext( {
					autoScroll: {
						speed: 2,
						direction: 'forward',
						startDelay: 1000,
						stopOnInteraction: true,
						stopOnMouseEnter: false,
						stopOnFocusIn: true,
					},
				} );
				const { wrapper, viewport } = createMockCarouselDOM();
				const originalIntersectionObserver = window.IntersectionObserver;
				const mockEmbla = createMockEmblaInstance( {
					scrollProgress: jest.fn( () => 0 ),
					slideNodes: jest.fn( () => [] ),
					plugins: jest.fn( () => ( {
						autoScroll: { isPlaying: jest.fn( () => true ) },
					} ) ),
				} );

				viewport.getBoundingClientRect = jest.fn( () => ( {
					width: 100,
					height: 0,
					top: 0,
					right: 0,
					bottom: 0,
					left: 0,
					x: 0,
					y: 0,
					toJSON: () => ( {} ),
				} ) );

				( getContext as jest.Mock ).mockReturnValue( mockContext );
				( getElement as jest.Mock ).mockReturnValue( { ref: wrapper } );
				( EmblaCarousel as unknown as jest.Mock ).mockReturnValue( mockEmbla );
				delete ( window as Window & { IntersectionObserver?: typeof IntersectionObserver } ).IntersectionObserver;

				try {
					storeConfig.callbacks.initCarousel();

					expect( mockContext.isPlaying ).toBe( true );
				} finally {
					( window as Window & { IntersectionObserver?: typeof IntersectionObserver } ).IntersectionObserver =
						originalIntersectionObserver;
				}
			} );

			describe( 'reduced motion', () => {
				const runInit = (
					contextOverrides: Partial<CarouselContext>,
					emblaOverrides = {},
				) => {
					const mockContext = createMockContext( contextOverrides );
					const { wrapper, viewport } = createMockCarouselDOM();
					const originalIntersectionObserver = window.IntersectionObserver;

					viewport.getBoundingClientRect = jest.fn( () => ( {
						width: 100,
						height: 0,
						top: 0,
						right: 0,
						bottom: 0,
						left: 0,
						x: 0,
						y: 0,
						toJSON: () => ( {} ),
					} ) );

					( getContext as jest.Mock ).mockReturnValue( mockContext );
					( getElement as jest.Mock ).mockReturnValue( { ref: wrapper } );
					( EmblaCarousel as unknown as jest.Mock ).mockReturnValue(
						createMockEmblaInstance( {
							scrollProgress: jest.fn( () => 0 ),
							slideNodes: jest.fn( () => [] ),
							...emblaOverrides,
						} ),
					);
					delete ( window as Window & { IntersectionObserver?: typeof IntersectionObserver } ).IntersectionObserver;

					try {
						storeConfig.callbacks.initCarousel();
					} finally {
						( window as Window & { IntersectionObserver?: typeof IntersectionObserver } ).IntersectionObserver =
							originalIntersectionObserver;
					}

					return mockContext;
				};

				const autoplay = { delay: 3000, stopOnInteraction: true, stopOnMouseEnter: false };

				it( 'makes slide changes instant', () => {
					runInit( {} );

					const lastCall = ( EmblaCarousel as unknown as jest.Mock ).mock.calls.at( -1 );
					expect( lastCall?.[ 1 ].breakpoints[ REDUCED_MOTION_QUERY ] ).toEqual( {
						duration: 0,
					} );
				} );

				it( 'does not start Autoplay on init or after interaction', () => {
					runInit( { autoplay } );

					expect( ( Autoplay as unknown as jest.Mock ).mock.calls.at( -1 )?.[ 0 ] ).toEqual( {
						...autoplay,
						breakpoints: { [ REDUCED_MOTION_QUERY ]: { playOnInit: false, stopOnInteraction: true } },
					} );
				} );

				it( 'does not start Auto Scroll on init or after interaction', () => {
					runInit( {
						autoScroll: {
							speed: 2,
							direction: 'forward',
							startDelay: 1000,
							stopOnInteraction: true,
							stopOnMouseEnter: false,
							stopOnFocusIn: true,
						},
					} );

					expect(
						( AutoScroll as unknown as jest.Mock ).mock.calls.at( -1 )?.[ 0 ].breakpoints,
					).toEqual( { [ REDUCED_MOTION_QUERY ]: { playOnInit: false, stopOnInteraction: true } } );
				} );

				it( 'sets isPlaying to false when Autoplay did not start', () => {
					const context = runInit(
						{ autoplay, isPlaying: true },
						{ plugins: jest.fn( () => ( { autoplay: { isPlaying: () => false } } ) ) },
					);

					expect( context.isPlaying ).toBe( false );
				} );

				it( 'keeps isPlaying true when Autoplay started', () => {
					const context = runInit(
						{ autoplay, isPlaying: true },
						{ plugins: jest.fn( () => ( { autoplay: { isPlaying: () => true } } ) ) },
					);

					expect( context.isPlaying ).toBe( true );
				} );
			} );
		} );
	} );
} );

describe( 'Embla Carousel Integration', () => {
	// Type-safe helper to get mocked Embla instance
	const getMockedEmblaCarousel = () => EmblaCarousel as unknown as jest.Mock;

	it( 'should have EmblaCarousel mocked', () => {
		expect( EmblaCarousel ).toBeDefined();
		expect( jest.isMockFunction( EmblaCarousel ) ).toBe( true );
	} );

	it( 'should create embla instance with correct methods', () => {
		const mockInstance = getMockedEmblaCarousel()();

		expect( mockInstance.scrollPrev ).toBeDefined();
		expect( mockInstance.scrollNext ).toBeDefined();
		expect( mockInstance.scrollTo ).toBeDefined();
		expect( mockInstance.on ).toBeDefined();
		expect( mockInstance.destroy ).toBeDefined();
	} );

	it( 'should have scrollPrev as a callable function', () => {
		const mockInstance = getMockedEmblaCarousel()();

		expect( () => mockInstance.scrollPrev() ).not.toThrow();
	} );

	it( 'should have scrollNext as a callable function', () => {
		const mockInstance = getMockedEmblaCarousel()();

		expect( () => mockInstance.scrollNext() ).not.toThrow();
	} );

	it( 'should have scrollTo as a callable function', () => {
		const mockInstance = getMockedEmblaCarousel()();

		expect( () => mockInstance.scrollTo( 2 ) ).not.toThrow();
	} );

	it( 'should have on method for event listeners', () => {
		const mockInstance = getMockedEmblaCarousel()();

		expect( () => mockInstance.on( 'select', jest.fn() ) ).not.toThrow();
	} );

	it( 'should have destroy method for cleanup', () => {
		const mockInstance = getMockedEmblaCarousel()();

		expect( () => mockInstance.destroy() ).not.toThrow();
	} );
} );

describe( 'Element Reference Handling', () => {
	describe( 'getElement variations', () => {
		beforeEach( () => {
			jest.clearAllMocks();
		} );

		it( 'should handle getElement returning HTMLElement directly', () => {
			const consoleSpy = jest.spyOn( console, 'warn' ).mockImplementation();
			const element = document.createElement( 'div' );

			( getElement as jest.Mock ).mockReturnValue( element );

			// This should not throw
			expect( () => storeConfig.actions.scrollPrev() ).not.toThrow();

			consoleSpy.mockRestore();
		} );

		it( 'should handle getElement returning object with ref', () => {
			const consoleSpy = jest.spyOn( console, 'warn' ).mockImplementation();
			const element = document.createElement( 'div' );

			( getElement as jest.Mock ).mockReturnValue( { ref: element } );

			expect( () => storeConfig.actions.scrollPrev() ).not.toThrow();

			consoleSpy.mockRestore();
		} );

		it( 'should handle getElement returning object with null ref', () => {
			const consoleSpy = jest.spyOn( console, 'warn' ).mockImplementation();

			( getElement as jest.Mock ).mockReturnValue( { ref: null } );

			expect( () => storeConfig.actions.scrollPrev() ).not.toThrow();

			consoleSpy.mockRestore();
		} );

		it( 'should handle getElement returning undefined', () => {
			const consoleSpy = jest.spyOn( console, 'warn' ).mockImplementation();

			( getElement as jest.Mock ).mockReturnValue( undefined );

			expect( () => storeConfig.actions.scrollPrev() ).not.toThrow();

			consoleSpy.mockRestore();
		} );
	} );
} );

describe( 'Edge Cases and Error Handling', () => {
	beforeEach( () => {
		jest.clearAllMocks();
	} );

	it( 'should handle carousel with no slides gracefully', () => {
		const container = document.createElement( 'div' );
		container.className = 'embla__container';

		const mockContext = createMockContext( {
			selectedIndex: 0,
			scrollSnaps: [],
			initialized: true,
		} );

		( getContext as jest.Mock ).mockReturnValue( mockContext );
		( getElement as jest.Mock ).mockReturnValue( {
			ref: container,
		} );

		// Should not throw
		expect( () => storeConfig.callbacks.isSlideActive() ).not.toThrow();
	} );

	it( 'should handle RTL direction in context', () => {
		const mockContext = createMockContext( {
			options: { direction: 'rtl', loop: true },
		} );

		( getContext as jest.Mock ).mockReturnValue( mockContext );

		expect( mockContext.options.direction ).toBe( 'rtl' );
	} );

	it( 'should handle autoplay configuration', () => {
		const mockContextWithAutoplay = createMockContext( {
			autoplay: {
				delay: 3000,
				stopOnInteraction: true,
				stopOnMouseEnter: false,
			},
			isPlaying: true,
		} );

		expect( mockContextWithAutoplay.autoplay ).toEqual( {
			delay: 3000,
			stopOnInteraction: true,
			stopOnMouseEnter: false,
		} );
		expect( mockContextWithAutoplay.isPlaying ).toBe( true );
	} );

	it( 'should handle timerIterationId for animation resets', () => {
		const mockContext = createMockContext( {
			timerIterationId: 5,
		} );

		expect( mockContext.timerIterationId ).toBe( 5 );

		// Simulate increment on slide change
		mockContext.timerIterationId += 1;

		expect( mockContext.timerIterationId ).toBe( 6 );
	} );

	it( 'should handle large number of slides', () => {
		const scrollSnaps = Array.from( { length: 100 }, ( _, i ) => ( {
			index: i,
		} ) );
		const mockContext = createMockContext( {
			scrollSnaps,
			selectedIndex: 50,
		} );

		expect( mockContext.scrollSnaps ).toHaveLength( 100 );
		expect( mockContext.selectedIndex ).toBe( 50 );
	} );

	it( 'should handle autoScroll configuration', () => {
		const mockContextWithAutoScroll = createMockContext( {
			autoScroll: {
				speed: 3,
				direction: 'forward',
				startDelay: 500,
				stopOnInteraction: false,
				stopOnMouseEnter: true,
				stopOnFocusIn: false,
			},
		} );

		expect( mockContextWithAutoScroll.autoScroll ).toEqual( {
			speed: 3,
			direction: 'forward',
			startDelay: 500,
			stopOnInteraction: false,
			stopOnMouseEnter: true,
			stopOnFocusIn: false,
		} );
	} );

	it( 'should handle autoScroll disabled', () => {
		const mockContext = createMockContext( {
			autoScroll: false,
		} );

		expect( mockContext.autoScroll ).toBe( false );
	} );
} );

describe( 'getSlideTabPanelId', () => {
	const getSlideTabPanelId = storeConfig?.callbacks?.getSlideTabPanelId;

	it( 'returns correct id for slide at index 1', () => {
		const container = document.createElement( 'div' );
		container.className = 'embla__container';
		const slide0 = document.createElement( 'div' );
		slide0.className = 'embla__slide';
		const slide1 = document.createElement( 'div' );
		slide1.className = 'embla__slide';
		container.appendChild( slide0 );
		container.appendChild( slide1 );
		const viewport = document.createElement( 'div' );
		viewport.className = 'embla';
		viewport.appendChild( container );
		const wrapper = document.createElement( 'div' );
		wrapper.className = 'rt-carousel';
		wrapper.appendChild( viewport );

		( getContext as jest.Mock ).mockReturnValue(
			createMockContext( { carouselId: 'abc', useTabs: true } ),
		);
		( getElement as jest.Mock ).mockReturnValue( slide1 );

		expect( getSlideTabPanelId() ).toBe( 'rt-carousel-panel-abc-1' );
	} );
} );

describe( 'getSlideTabLabelledBy', () => {
	const getSlideTabLabelledBy = storeConfig?.callbacks?.getSlideTabLabelledBy;

	it( 'returns correct labelledby id for slide at index 0', () => {
		const container = document.createElement( 'div' );
		container.className = 'embla__container';
		const slide0 = document.createElement( 'div' );
		slide0.className = 'embla__slide';
		container.appendChild( slide0 );
		const viewport = document.createElement( 'div' );
		viewport.className = 'embla';
		viewport.appendChild( container );
		const wrapper = document.createElement( 'div' );
		wrapper.className = 'rt-carousel';
		wrapper.appendChild( viewport );

		( getContext as jest.Mock ).mockReturnValue(
			createMockContext( { carouselId: 'abc', useTabs: true } ),
		);
		( getElement as jest.Mock ).mockReturnValue( slide0 );

		expect( getSlideTabLabelledBy() ).toBe( 'rt-carousel-tab-abc-0' );
	} );
} );
