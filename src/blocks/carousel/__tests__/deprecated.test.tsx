import { render } from '@testing-library/react';
import deprecated from '../deprecated';
import blockJson from '../block.json';
import type { CarouselAttributes } from '../types';

jest.mock( '@wordpress/block-editor', () => ( {
	useBlockProps: {
		save: ( props: Record<string, unknown> = {} ) => ( {
			className: 'wp-block-rt-carousel-carousel',
			...props,
		} ),
	},
	useInnerBlocksProps: {
		save: ( props: Record<string, unknown> = {} ) => ( {
			...props,
			children: <div data-testid="inner-blocks">Inner Blocks</div>,
		} ),
	},
} ) );

jest.mock( '@wordpress/i18n', () => ( {
	__: ( str: string ) => str,
} ) );

const mockAttributes: CarouselAttributes = {
	transition: 'slide',
	loop: false,
	dragFree: false,
	carouselAlign: 'start',
	containScroll: 'trimSnaps',
	direction: 'ltr',
	axis: 'x',
	height: '300px',
	allowedSlideBlocks: [],
	autoplay: false,
	autoplayDelay: 4000,
	autoplayStopOnInteraction: true,
	autoplayStopOnMouseEnter: false,
	ariaLabel: 'Test Carousel',
	slideGap: 0,
	slidesToScroll: '1',
	lazyLoadImages: true,
	autoScroll: false,
	autoScrollSpeed: 2,
	autoScrollDirection: 'forward',
	autoScrollStartDelay: 1000,
	autoScrollStopOnInteraction: true,
	autoScrollStopOnMouseEnter: false,
	useTabs: false,
};

const SHIPPED_MARKUP: Record< string, string > = {
	'v2.0.0':
		'<div class="rt-carousel" role="region" aria-roledescription="carousel" aria-label="Test Carousel" dir="ltr" data-axis="x" data-wp-interactive="rt-carousel/carousel" data-wp-context="{&quot;options&quot;:{&quot;loop&quot;:false,&quot;dragFree&quot;:false,&quot;align&quot;:&quot;start&quot;,&quot;containScroll&quot;:&quot;trimSnaps&quot;,&quot;direction&quot;:&quot;ltr&quot;,&quot;axis&quot;:&quot;x&quot;,&quot;slidesToScroll&quot;:1},&quot;autoplay&quot;:false,&quot;isPlaying&quot;:false,&quot;timerIterationId&quot;:0,&quot;selectedIndex&quot;:-1,&quot;scrollSnaps&quot;:[],&quot;canScrollPrev&quot;:false,&quot;canScrollNext&quot;:false,&quot;scrollProgress&quot;:0,&quot;slideCount&quot;:0,&quot;ariaLabelPattern&quot;:&quot;Go to slide %d&quot;}" data-wp-init="callbacks.initCarousel" style="--rt-carousel-gap: 0px;"><div data-testid="inner-blocks">Inner Blocks</div></div>',
	'v2.0.1':
		'<div class="rt-carousel" role="region" aria-roledescription="carousel" aria-label="Test Carousel" dir="ltr" data-axis="x" data-wp-interactive="rt-carousel/carousel" data-wp-context="{&quot;options&quot;:{&quot;loop&quot;:false,&quot;dragFree&quot;:false,&quot;align&quot;:&quot;start&quot;,&quot;containScroll&quot;:&quot;trimSnaps&quot;,&quot;direction&quot;:&quot;ltr&quot;,&quot;axis&quot;:&quot;x&quot;,&quot;slidesToScroll&quot;:1},&quot;autoplay&quot;:false,&quot;isPlaying&quot;:false,&quot;timerIterationId&quot;:0,&quot;selectedIndex&quot;:-1,&quot;scrollSnaps&quot;:[],&quot;canScrollPrev&quot;:false,&quot;canScrollNext&quot;:false,&quot;scrollProgress&quot;:0,&quot;slideCount&quot;:0,&quot;ariaLabelPattern&quot;:&quot;Go to slide %d&quot;,&quot;announcement&quot;:&quot;&quot;,&quot;shouldAnnounce&quot;:false,&quot;announcementPattern&quot;:&quot;Slide {{currentSlide}} of {{totalSlides}}&quot;}" data-wp-init="callbacks.initCarousel" style="--rt-carousel-gap: 0px;"><div data-testid="inner-blocks">Inner Blocks</div><span class="screen-reader-text" role="status" aria-live="polite" aria-atomic="true" data-wp-text="context.announcement"></span></div>',
	'v2.0.3':
		'<div class="rt-carousel" role="region" aria-roledescription="carousel" aria-label="Test Carousel" dir="ltr" data-axis="x" data-wp-interactive="rt-carousel/carousel" data-wp-context="{&quot;options&quot;:{&quot;loop&quot;:false,&quot;dragFree&quot;:false,&quot;align&quot;:&quot;start&quot;,&quot;containScroll&quot;:&quot;trimSnaps&quot;,&quot;direction&quot;:&quot;ltr&quot;,&quot;axis&quot;:&quot;x&quot;,&quot;slidesToScroll&quot;:1},&quot;autoplay&quot;:false,&quot;isPlaying&quot;:false,&quot;timerIterationId&quot;:0,&quot;selectedIndex&quot;:-1,&quot;scrollSnaps&quot;:[],&quot;canScrollPrev&quot;:false,&quot;canScrollNext&quot;:false,&quot;scrollProgress&quot;:0,&quot;slideCount&quot;:0,&quot;ariaLabelPattern&quot;:&quot;Go to slide %d&quot;,&quot;countLabelPattern&quot;:&quot;Slide {{currentSlide}} of {{totalSlides}}&quot;,&quot;announcement&quot;:&quot;&quot;,&quot;shouldAnnounce&quot;:false,&quot;announcementPattern&quot;:&quot;Slide {{currentSlide}} of {{totalSlides}}&quot;}" data-wp-init="callbacks.initCarousel" style="--rt-carousel-gap: 0px;"><div data-testid="inner-blocks">Inner Blocks</div><span class="screen-reader-text" role="status" aria-live="polite" aria-atomic="true" data-wp-text="context.announcement"></span></div>',
};

const renderSave = ( Component: ( typeof deprecated )[ number ][ 'save' ] ) =>
	render( <Component attributes={ mockAttributes } /> ).container.innerHTML;

describe( 'Carousel Deprecations', () => {
	const rendered = deprecated.map( ( entry, index ) => ( {
		index,
		markup: renderSave( entry.save ),
	} ) );

	it.each( Object.entries( SHIPPED_MARKUP ) )(
		'%s markup is reproduced by a deprecation',
		( _version, markup ) => {
			expect( rendered.map( ( r ) => r.markup ) ).toContain( markup );
		},
	);

	it( 'has no deprecation that reproduces no shipped markup', () => {
		const shipped = Object.values( SHIPPED_MARKUP );
		const orphans = rendered
			.filter( ( r ) => ! shipped.includes( r.markup ) )
			.map( ( r ) => r.index );

		expect( orphans ).toEqual( [] );
	} );

	it( 'declares the current attribute schema on every entry', () => {
		deprecated.forEach( ( entry ) => {
			expect( entry.attributes ).toEqual( blockJson.attributes );
		} );
	} );
} );
