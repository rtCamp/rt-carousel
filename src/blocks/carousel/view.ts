import { store, getContext, getElement } from '@wordpress/interactivity';
import EmblaCarousel, {
	type EmblaOptionsType,
	type EmblaCarouselType,
} from 'embla-carousel';
import Autoplay, { type AutoplayOptionsType } from 'embla-carousel-autoplay';
import type { CarouselContext } from './types';

type ElementWithRef = {
	ref?: HTMLElement | null;
};

const EMBLA_KEY = Symbol.for( 'rt-carousel.carousel' );

type EmblaViewportElement = HTMLElement & {
	[EMBLA_KEY]?: EmblaCarouselType;
};

export const emblaInstances = new WeakMap<HTMLElement, EmblaCarouselType>();

const CAROUSEL_READY_EVENT = 'rt-carousel:init';

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

const getCarouselRoot = ( element: HTMLElement | null ): HTMLElement | null => {
	return element?.closest( '.rt-carousel' ) ?? null;
};

const getMainViewport = (
	wrapper: HTMLElement | null,
): EmblaViewportElement | null => {
	return wrapper?.querySelector( '.embla' ) as EmblaViewportElement | null;
};

const getMainEmblaFromRoot = (
	wrapper: HTMLElement | null,
): EmblaCarouselType | null => {
	const viewport = getMainViewport( wrapper );
	if ( ! viewport ) {
		return null;
	}
	return emblaInstances.get( viewport ) || viewport[ EMBLA_KEY ] || null;
};

const dispatchCarouselReady = (
	wrapper: HTMLElement,
	embla: EmblaCarouselType,
): void => {
	wrapper.dispatchEvent(
		new CustomEvent( CAROUSEL_READY_EVENT, {
			bubbles: true,
			detail: { embla },
		} ),
	);
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

const getSlideAnnouncement = (
	context: CarouselContext,
	selectedIndex: number,
	slideCount: number,
): string => {
	if ( ! slideCount || slideCount <= 1 || ! context.announcementPattern ) {
		return '';
	}
	return context.announcementPattern
		.replace( '{{currentSlide}}', ( selectedIndex + 1 ).toString() )
		.replace( '{{totalSlides}}', slideCount.toString() );
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

const safelyMarkForAnnouncement = (): void => {
	try {
		markForAnnouncement();
	} catch {
		// Native event listeners do not always run inside an Interactivity API
		// scope. Navigation should still happen if announcement state is unavailable.
	}
};

const stripInteractiveAttributes = ( element: Element ): void => {
	Array.from( element.attributes ).forEach( ( attribute ) => {
		if (
			attribute.name === 'id' ||
			attribute.name === 'aria-current' ||
			attribute.name.startsWith( 'data-wp-' ) ||
			attribute.name.startsWith( 'on' )
		) {
			element.removeAttribute( attribute.name );
		}
	} );

	if ( element instanceof HTMLElement ) {
		element.removeAttribute( 'tabindex' );
		element.removeAttribute( 'contenteditable' );
		element.setAttribute( 'aria-hidden', 'true' );
	}

	if (
		element instanceof HTMLButtonElement ||
		element instanceof HTMLInputElement ||
		element instanceof HTMLSelectElement ||
		element instanceof HTMLTextAreaElement
	) {
		element.disabled = true;
	}
};

const createThumbnailPreview = ( slide: HTMLElement ): HTMLElement => {
	const preview = document.createElement( 'span' );
	preview.className = 'rt-carousel-thumbnail__preview';
	preview.setAttribute( 'aria-hidden', 'true' );

	const sourceImage = slide.querySelector<HTMLImageElement>( 'img' );
	if ( sourceImage ) {
		const image = document.createElement( 'img' );
		image.className = 'rt-carousel-thumbnail__image';
		image.src = sourceImage.currentSrc || sourceImage.src;
		image.alt = '';
		image.decoding = 'async';
		image.loading = 'lazy';

		const srcset = sourceImage.getAttribute( 'srcset' );
		const sizes = sourceImage.getAttribute( 'sizes' );
		if ( srcset ) {
			image.setAttribute( 'srcset', srcset );
		}
		if ( sizes ) {
			image.setAttribute( 'sizes', sizes );
		}

		preview.appendChild( image );
		return preview;
	}

	const clone = slide.cloneNode( true ) as HTMLElement;
	[ clone, ...Array.from( clone.querySelectorAll( '*' ) ) ].forEach(
		stripInteractiveAttributes,
	);
	clone.classList.remove( 'is-active' );
	preview.appendChild( clone );

	return preview;
};

const getSlideForSnap = (
	slides: HTMLElement[],
	snapIndex: number,
	snapCount: number,
): HTMLElement | undefined => {
	if ( slides.length === 0 || snapCount <= 0 ) {
		return undefined;
	}

	const estimatedGroupSize = Math.max( 1, Math.ceil( slides.length / snapCount ) );
	const slideIndex = Math.min(
		snapIndex * estimatedGroupSize,
		slides.length - 1,
	);
	return slides[ slideIndex ];
};

const buildThumbnailButtons = (
	mainEmbla: EmblaCarouselType,
	container: HTMLElement,
	selectedIndex: number,
	ariaLabelPattern: string,
	onClick: ( index: number ) => void,
): HTMLButtonElement[] => {
	const slides = mainEmbla.slideNodes();
	const snaps = mainEmbla.scrollSnapList();

	container.replaceChildren();

	return snaps.map( ( _snap, index ) => {
		const slide = getSlideForSnap( slides, index, snaps.length );
		const button = document.createElement( 'button' );
		button.className = 'rt-carousel-thumbnail';
		button.type = 'button';
		button.setAttribute(
			'aria-label',
			ariaLabelPattern.replace( '%d', ( index + 1 ).toString() ),
		);
		button.addEventListener( 'click', () => onClick( index ) );

		if ( slide ) {
			button.appendChild( createThumbnailPreview( slide ) );
		} else {
			const fallback = document.createElement( 'span' );
			fallback.className = 'rt-carousel-thumbnail__fallback';
			fallback.setAttribute( 'aria-hidden', 'true' );
			fallback.textContent = ( index + 1 ).toString();
			button.appendChild( fallback );
		}

		if ( index === selectedIndex ) {
			button.classList.add( 'is-active' );
			button.setAttribute( 'aria-current', 'true' );
		}

		container.appendChild( button );
		return button;
	} );
};

const updateThumbnailButtons = (
	buttons: HTMLButtonElement[],
	selectedIndex: number,
): void => {
	buttons.forEach( ( button, index ) => {
		const isActive = index === selectedIndex;
		button.classList.toggle( 'is-active', isActive );
		if ( isActive ) {
			button.setAttribute( 'aria-current', 'true' );
		} else {
			button.removeAttribute( 'aria-current' );
		}
	} );
};

store( 'rt-carousel/carousel', {
	state: {
		get canScrollPrev() {
			const context = getContext<CarouselContext>();
			return context.canScrollPrev;
		},
		get canScrollNext() {
			const context = getContext<CarouselContext>();
			return context.canScrollNext;
		},
	},
	actions: {
		scrollPrev: () => {
			const element = getElementRef( getElement() );
			const embla = getEmblaFromElement( element );
			if ( embla ) {
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

			// Check for either standard slide or Query Loop post
			const slide = getElementRef( getElement() )?.closest?.(
				'.embla__slide, .wp-block-post',
			);

			if ( ! slide || ! slide.parentElement ) {
				return false;
			}

			const slides = Array.from( slide.parentElement.children ).filter(
				( child: Element ) =>
					child.classList?.contains( 'embla__slide' ) ||
					child.classList?.contains( 'wp-block-post' ),
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
			return context.selectedIndex === snap?.index;
		},
		getDotLabel: () => {
			const context = getContext<CarouselContext>();
			const { snap } = context as CarouselContext & {
				snap?: { index?: number };
			};
			const index = ( snap?.index || 0 ) + 1;
			return context.ariaLabelPattern.replace( '%d', index.toString() );
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
		initThumbnails: () => {
			try {
				const context = getContext<CarouselContext>();
				const element = getElementRef( getElement() );

				if ( ! element || typeof element.querySelector !== 'function' ) {
					// eslint-disable-next-line no-console
					console.warn( 'Carousel: Invalid thumbnails element', element );
					return;
				}

				const wrapper = getCarouselRoot( element );
				const viewport = element.querySelector<HTMLElement>(
					'.rt-carousel-thumbnails__viewport',
				);
				const container = element.querySelector<HTMLElement>(
					'.rt-carousel-thumbnails__container',
				);

				if ( ! wrapper || ! viewport || ! container ) {
					// eslint-disable-next-line no-console
					console.warn( 'Carousel: Thumbnail elements not found' );
					return;
				}

				let cleanupThumbnails: ( () => void ) | undefined;

				const setup = ( mainEmbla: EmblaCarouselType ) => {
					cleanupThumbnails?.();

					let thumbnailButtons: HTMLButtonElement[] = [];
					const thumbEmbla = EmblaCarousel( viewport, {
						align: 'start',
						containScroll: 'keepSnaps',
						dragFree: true,
						axis: 'x',
					} );

					const scrollTo = ( index: number ) => {
						if ( index !== mainEmbla.selectedScrollSnap() ) {
							safelyMarkForAnnouncement();
						}
						mainEmbla.scrollTo( index );
					};

					const syncSelected = () => {
						const selectedIndex = mainEmbla.selectedScrollSnap();
						updateThumbnailButtons( thumbnailButtons, selectedIndex );
						thumbEmbla.scrollTo( selectedIndex );
					};

					const rebuild = () => {
						thumbnailButtons = buildThumbnailButtons(
							mainEmbla,
							container,
							mainEmbla.selectedScrollSnap(),
							context.ariaLabelPattern,
							scrollTo,
						);
						thumbEmbla.reInit();
						syncSelected();
					};

					mainEmbla.on( 'select', syncSelected );
					mainEmbla.on( 'reInit', rebuild );

					rebuild();

					cleanupThumbnails = () => {
						mainEmbla.off( 'select', syncSelected );
						mainEmbla.off( 'reInit', rebuild );
						thumbEmbla.destroy();
						container.replaceChildren();
					};

					return cleanupThumbnails;
				};

				const existingEmbla = getMainEmblaFromRoot( wrapper );
				if ( existingEmbla ) {
					setup( existingEmbla );
				}

				const onCarouselReady = ( event: Event ) => {
					const customEvent = event as CustomEvent<{ embla?: EmblaCarouselType }>;
					const mainEmbla = customEvent.detail?.embla || getMainEmblaFromRoot( wrapper );
					if ( mainEmbla ) {
						setup( mainEmbla );
					}
				};

				wrapper.addEventListener( CAROUSEL_READY_EVENT, onCarouselReady );

				return () => {
					wrapper.removeEventListener( CAROUSEL_READY_EVENT, onCarouselReady );
					cleanupThumbnails?.();
				};
			} catch ( e ) {
				// eslint-disable-next-line no-console
				console.error( 'Carousel: Error in initThumbnails', e );

				return null;
			}
		},
		initCarousel: () => {
			try {
				const context = getContext<CarouselContext>();
				const element = getElementRef( getElement() );

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

				const queryLoopContainer = viewport.querySelector<HTMLElement>(
					'.wp-block-post-template',
				);

				const startEmbla = () => {
					const rawOptions: EmblaOptionsType = context.options || {};

					const align = [ 'start', 'center', 'end' ].includes(
						rawOptions.align as string,
					)
						? ( rawOptions.align as 'start' | 'center' | 'end' )
						: 'start';

					const rawContainScroll = rawOptions.containScroll as
						| string
						| boolean
						| undefined;
					let containScroll: EmblaOptionsType['containScroll'] = 'trimSnaps';
					if (
						rawContainScroll === 'trimSnaps' ||
						rawContainScroll === 'keepSnaps'
					) {
						containScroll = rawContainScroll;
					} else if ( rawContainScroll === '' ) {
						containScroll = false;
					}

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

					const options: EmblaOptionsType = {
						...rawOptions,
						align,
						containScroll,
						direction,
						slidesToScroll,
						container: queryLoopContainer || null,
					};

					const plugins = [];

					if ( context.autoplay ) {
						plugins.push( Autoplay( context.autoplay as AutoplayOptionsType ) );
					}

					const embla = EmblaCarousel(
						viewport as HTMLElement,
						options,
						plugins,
					);

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

					updateState();
					dispatchCarouselReady( element, embla );

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
