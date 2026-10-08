import { store, getContext, getElement } from '@wordpress/interactivity';
import EmblaCarousel, {
	type EmblaOptionsType,
	type EmblaCarouselType,
} from 'embla-carousel';
import Autoplay, { type AutoplayOptionsType } from 'embla-carousel-autoplay';
import AutoScroll, { type AutoScrollOptionsType } from 'embla-carousel-auto-scroll';

import Fade from 'embla-carousel-fade';
import type { CarouselContext } from './types';
import {
	DYNAMIC_LIST_CONTAINER_SELECTOR,
	CAROUSEL_SLIDE_SELECTOR,
} from './dynamic-list-selectors';
import { normalizeContainScroll, applyTransitionOverrides } from './embla-options';

type ElementWithRef = {
	ref?: HTMLElement | null;
};

const EMBLA_KEY = Symbol.for( 'rt-carousel.carousel' );

type EmblaViewportElement = HTMLElement & {
	[EMBLA_KEY]?: EmblaCarouselType;
};

export const emblaInstances = new WeakMap<HTMLElement, EmblaCarouselType>();

const getElementRef = ( rawElement: unknown ): HTMLElement | null => {
	if ( rawElement instanceof HTMLElement ) {
		return rawElement;
	}
	if ( rawElement && typeof rawElement === 'object' && 'ref' in rawElement ) {
		const { ref } = rawElement as ElementWithRef;
		return ref ?? null;
	}
	return null;
};

const getEmblaFromElement = (
	element: HTMLElement | null,
): EmblaCarouselType | null => {
	if ( ! element ) {
		return null;
	}
	const wrapper = element.closest( '.rt-carousel' );
	const viewport = wrapper?.querySelector(
		'.embla',
	) as EmblaViewportElement | null;
	if ( ! viewport ) {
		return null;
	}
	return emblaInstances.get( viewport ) || viewport[ EMBLA_KEY ] || null;
};

const getProgress = (): number => {
	const { scrollProgress, slideCount, selectedIndex, options } = getContext<CarouselContext>();
	if ( ! slideCount || slideCount <= 1 ) {
		return 0;
	}
	if ( options?.loop ) {
		return selectedIndex / ( slideCount - 1 );
	}
	return Math.max( 0, Math.min( 1, scrollProgress || 0 ) );
};

const getSnapCount = ( context: CarouselContext ): number => {
	return Math.max( context.scrollSnaps?.length || context.slideCount || 0, 1 );
};

const getCurrentSnap = ( context: CarouselContext ): number => {
	return Math.min(
		Math.max( ( context.selectedIndex || 0 ) + 1, 1 ),
		getSnapCount( context ),
	);
};

const interpolateSlidePattern = (
	pattern: string,
	currentSlide: string,
	totalSlides: string,
): string => {
	return pattern
		.split( '{{currentSlide}}' )
		.join( currentSlide )
		.split( '{{totalSlides}}' )
		.join( totalSlides );
};

const getSlideAnnouncement = (
	context: CarouselContext,
	selectedIndex: number,
	slideCount: number,
): string => {
	if ( ! slideCount || slideCount <= 1 || ! context.announcementPattern ) {
		return '';
	}
	return interpolateSlidePattern(
		context.announcementPattern,
		( selectedIndex + 1 ).toString(),
		slideCount.toString(),
	);
};

const updateSlideAnnouncement = (
	context: CarouselContext,
	previousSelectedIndex: number,
): void => {
	if ( ! context.shouldAnnounce ) {
		return;
	}

	if ( context.selectedIndex !== previousSelectedIndex ) {
		context.announcement = getSlideAnnouncement(
			context,
			context.selectedIndex,
			context.slideCount,
		);
	}

	context.shouldAnnounce = false;
};

const markForAnnouncement = (): void => {
	getContext<CarouselContext>().shouldAnnounce = true;
};

type StoppablePlugin = {
	stop?: () => void;
	destroy?: () => void;
	reset?: () => void;
};

const stopPluginsOnInteraction = (
	embla: EmblaCarouselType,
	context: CarouselContext,
): void => {
	if ( typeof embla.plugins !== 'function' ) {
		return;
	}
	const plugins = embla.plugins() as {
		autoplay?: StoppablePlugin;
		autoScroll?: StoppablePlugin;
	};
	const autoplay = plugins.autoplay;
	const autoScroll = plugins.autoScroll;

	const isAutoplayEnabled =
		context.autoplay === true ||
		( typeof context.autoplay === 'object' && context.autoplay !== null );
	if ( autoplay && isAutoplayEnabled ) {
		const shouldStop =
			context.autoplay === true ||
			( typeof context.autoplay === 'object' &&
				context.autoplay.stopOnInteraction !== false );

		if ( shouldStop ) {
			if ( typeof autoplay.destroy === 'function' ) {
				autoplay.destroy();
			} else if ( typeof autoplay.stop === 'function' ) {
				autoplay.stop();
			}
		} else if ( typeof autoplay.reset === 'function' ) {
			autoplay.reset();
		}
	}

	const isAutoScrollEnabled =
		context.autoScroll === true ||
		( typeof context.autoScroll === 'object' && context.autoScroll !== null );
	if ( autoScroll && isAutoScrollEnabled ) {
		const shouldStop =
			context.autoScroll === true ||
			( typeof context.autoScroll === 'object' &&
				context.autoScroll.stopOnInteraction !== false );

		if ( shouldStop ) {
			if ( typeof autoScroll.destroy === 'function' ) {
				autoScroll.destroy();
			} else if ( typeof autoScroll.stop === 'function' ) {
				autoScroll.stop();
			}
		} else if ( typeof autoScroll.reset === 'function' ) {
			autoScroll.reset();
		}
	}
};
// Incrementing counter for unique carousel IDs on the same page
let carouselIdCounter = 0;

store( 'rt-carousel/carousel', {
	state: {
		get canScrollPrev() {
			const context = getContext<CarouselContext>();
			return context.autoScroll ? true : context.canScrollPrev;
		},
		get canScrollNext() {
			const context = getContext<CarouselContext>();
			return context.autoScroll ? true : context.canScrollNext;
		},
	},
	actions: {
		scrollPrev: () => {
			const element = getElementRef( getElement() );
			const embla = getEmblaFromElement( element );
			if ( embla ) {
				const context = getContext<CarouselContext>();
				stopPluginsOnInteraction( embla, context );

				if ( embla.canScrollPrev() ) {
					markForAnnouncement();
				}
				embla.scrollPrev();
			} else {
				// eslint-disable-next-line no-console
				console.warn( 'Carousel: Embla instance not found for scrollPrev' );
			}
		},
		scrollNext: () => {
			const element = getElementRef( getElement() );
			const embla = getEmblaFromElement( element );
			if ( embla ) {
				const context = getContext<CarouselContext>();
				stopPluginsOnInteraction( embla, context );

				if ( embla.canScrollNext() ) {
					markForAnnouncement();
				}
				embla.scrollNext();
			} else {
				// eslint-disable-next-line no-console
				console.warn( 'Carousel: Embla instance not found for scrollNext' );
			}
		},
		onDotClick: () => {
			const context = getContext<CarouselContext>();
			const { snap } = context as CarouselContext & {
				snap?: { index?: number };
			};

			if ( snap && typeof snap.index === 'number' ) {
				const element = getElementRef( getElement() );
				const embla = getEmblaFromElement( element );
				if ( embla ) {
					stopPluginsOnInteraction( embla, context );

					if ( snap.index !== context.selectedIndex ) {
						markForAnnouncement();
					}
					embla.scrollTo( snap.index );
				}
			}
		},
	},
	callbacks: {
		isSlideActive: () => {
			// Track initialization state to prevent errors when Embla isn't ready
			// See: https://github.com/rtCamp/rt-carousel/issues/78
			const context = getContext<CarouselContext>();
			if ( ! context.initialized ) {
				return false;
			}

			// Check for either standard slide or dynamic Query item.
			const slide = getElementRef( getElement() )?.closest?.(
				CAROUSEL_SLIDE_SELECTOR,
			);

			if ( ! slide || ! slide.parentElement ) {
				return false;
			}

			const slides = Array.from( slide.parentElement.children ).filter(
				( child: Element ) => child.matches( CAROUSEL_SLIDE_SELECTOR ),
			);

			const index = slides.indexOf( slide );
			if ( index === -1 ) {
				return false;
			}
			return context.selectedIndex === index;
		},
		isDotActive: () => {
			const context = getContext<CarouselContext>();
			const { snap } = context as CarouselContext & {
				snap?: { index?: number };
			};
			if ( typeof snap?.index !== 'number' ) {
				return false;
			}
			const selectedIndex =
				typeof context.selectedIndex === 'number' && context.selectedIndex >= 0
					? context.selectedIndex
					: 0;
			return selectedIndex === snap.index;
		},
		getDotLabel: () => {
			const context = getContext<CarouselContext>();
			const { snap } = context as CarouselContext & {
				snap?: { index?: number };
			};
			const index = ( snap?.index || 0 ) + 1;
			return context.ariaLabelPattern.replace( '%d', index.toString() );
		},
		getCurrentCount: () => {
			return getCurrentSnap( getContext<CarouselContext>() ).toString();
		},
		getTotalCount: () => {
			return getSnapCount( getContext<CarouselContext>() ).toString();
		},
		getCountLabel: () => {
			const context = getContext<CarouselContext>();
			const current = getCurrentSnap( context ).toString();
			const total = getSnapCount( context ).toString();
			return interpolateSlidePattern(
				context.countLabelPattern || 'Slide {{currentSlide}} of {{totalSlides}}',
				current,
				total,
			);
		},
		getProgressBarNow: () => {
			return Math.round( getProgress() * 100 );
		},
		getProgressBarStyle: () => {
			const { slideCount } = getContext<CarouselContext>();
			if ( ! slideCount || slideCount <= 1 ) {
				return 'display:none';
			}
			return `transform:translate3d(${ getProgress() * 100 }%, 0px, 0px)`;
		},
		getSlideTabPanelId: () => {
			const slide = getElementRef( getElement() )?.closest?.(
				CAROUSEL_SLIDE_SELECTOR,
			);

			if ( ! slide || ! slide.parentElement ) {
				return '';
			}

			const context = getContext<CarouselContext>();
			const slides = Array.from( slide.parentElement.children ).filter(
				( child: Element ) => child.matches( CAROUSEL_SLIDE_SELECTOR ),
			);

			const index = slides.indexOf( slide );
			return `rt-carousel-panel-${ context.carouselId }-${ index }`;
		},
		getSlideTabLabelledBy: () => {
			const slide = getElementRef( getElement() )?.closest?.(
				CAROUSEL_SLIDE_SELECTOR,
			);

			if ( ! slide || ! slide.parentElement ) {
				return '';
			}

			const context = getContext<CarouselContext>();
			const slides = Array.from( slide.parentElement.children ).filter(
				( child: Element ) => child.matches( CAROUSEL_SLIDE_SELECTOR ),
			);

			const index = slides.indexOf( slide );
			return `rt-carousel-tab-${ context.carouselId }-${ index }`;
		},
		initCarousel: () => {
			try {
				const context = getContext<CarouselContext>();
				const element = getElementRef( getElement() );

				// Assign a unique ID for tab panel/tab linkage
				if ( ! context.carouselId ) {
					context.carouselId = String( ++carouselIdCounter );
				}

				if ( ! element || typeof element.querySelector !== 'function' ) {
					// eslint-disable-next-line no-console
					console.warn( 'Carousel: Invalid root element', element );
					return;
				}

				const viewport = element.querySelector<EmblaViewportElement>( '.embla' );

				if ( ! viewport ) {
					// eslint-disable-next-line no-console
					console.warn( 'Carousel: Viewport (.embla) not found' );
					return;
				}

				const dynamicListContainer = viewport.querySelector<HTMLElement>(
					DYNAMIC_LIST_CONTAINER_SELECTOR,
				);

				const startEmbla = () => {
					const rawOptions: EmblaOptionsType = context.options || {};

					const align = [ 'start', 'center', 'end' ].includes(
						rawOptions.align as string,
					)
						? ( rawOptions.align as 'start' | 'center' | 'end' )
						: 'start';

					const direction = [ 'ltr', 'rtl' ].includes(
						rawOptions.direction as string,
					)
						? ( rawOptions.direction as 'ltr' | 'rtl' )
						: 'ltr';

					let slidesToScroll: EmblaOptionsType['slidesToScroll'] = 1;
					if ( rawOptions.slidesToScroll === 'auto' ) {
						slidesToScroll = 'auto';
					} else if (
						typeof rawOptions.slidesToScroll === 'number' &&
						rawOptions.slidesToScroll > 0
					) {
						slidesToScroll = rawOptions.slidesToScroll;
					}

					const options: EmblaOptionsType = applyTransitionOverrides(
						{
							...rawOptions,
							align,
							containScroll: normalizeContainScroll( rawOptions.containScroll ),
							direction,
							slidesToScroll,
							container: dynamicListContainer || null,
						},
						context.transition,
					);

					const plugins = [];

					if ( context.transition === 'fade' ) {
						plugins.push( Fade() );
					}

					if ( context.autoplay ) {
						plugins.push( Autoplay( context.autoplay as AutoplayOptionsType ) );
					}

					if ( context.autoScroll ) {
						plugins.push( AutoScroll( context.autoScroll as AutoScrollOptionsType ) );
					}

					const embla = EmblaCarousel( viewport, options, plugins );

					emblaInstances.set( viewport, embla );
					viewport[ EMBLA_KEY ] = embla;

					const updateState = () => {
						const previousSelectedIndex = context.selectedIndex;
						const scrollSnapList = embla.scrollSnapList();
						context.initialized = true;
						context.canScrollPrev = embla.canScrollPrev();
						context.canScrollNext = embla.canScrollNext();
						context.selectedIndex = embla.selectedScrollSnap();
						if ( context.scrollSnaps.length !== scrollSnapList.length ) {
							context.scrollSnaps = scrollSnapList.map( ( _, index ) => ( {
								index,
							} ) );
						}
						context.scrollProgress = embla.scrollProgress();
						context.slideCount = embla.slideNodes().length;
						updateSlideAnnouncement( context, previousSelectedIndex );
					};

					embla.on( 'select', updateState );
					embla.on( 'reInit', updateState );
					embla.on( 'scroll', () => {
						context.scrollProgress = embla.scrollProgress();
					} );

					embla.on( 'autoplay:timerset', () => {
						context.isPlaying = true;
						context.timerIterationId = ( context.timerIterationId || 0 ) + 1;
					} );

					embla.on( 'autoplay:timerstopped', () => {
						context.isPlaying = false;
					} );

					embla.on( 'autoScroll:play', () => {
						context.isPlaying = true;
					} );

					embla.on( 'autoScroll:stop', () => {
						context.isPlaying = false;
					} );

					// Auto Scroll emits its first `autoScroll:play` while Embla is
					// being created, before the listener above is attached.
					if ( embla.plugins?.()?.autoScroll?.isPlaying() ) {
						context.isPlaying = true;
					}

					updateState();

					return () => {
						embla.destroy();
						emblaInstances.delete( viewport );
						delete viewport[ EMBLA_KEY ];
					};
				};

				let cleanupEmbla: ( () => void ) | undefined;
				let resizeObserver: ResizeObserver | undefined;
				let intersectionObserver: IntersectionObserver | undefined;

				const init = () => {
					if ( viewport.getBoundingClientRect().width > 0 ) {
						cleanupEmbla = startEmbla();
					} else {
						resizeObserver = new ResizeObserver( ( entries ) => {
							for ( const entry of entries ) {
								if ( entry.contentRect.width > 0 ) {
									cleanupEmbla = startEmbla();
									resizeObserver?.disconnect();
									resizeObserver = undefined;
									break;
								}
							}
						} );
						resizeObserver.observe( viewport );
					}
				};

				if ( 'IntersectionObserver' in window ) {
					intersectionObserver = new IntersectionObserver(
						( entries ) => {
							if ( entries[ 0 ]?.isIntersecting ) {
								init();
								intersectionObserver?.disconnect();
								intersectionObserver = undefined;
							}
						},
						{ rootMargin: '200px' },
					);
					intersectionObserver.observe( viewport );
				} else {
					init();
				}

				return () => {
					resizeObserver?.disconnect();
					intersectionObserver?.disconnect();
					cleanupEmbla?.();
				};
			} catch ( e ) {
				// eslint-disable-next-line no-console
				console.error( 'Carousel: Error in initCarousel', e );

				return null;
			}
		},
	},
} );
