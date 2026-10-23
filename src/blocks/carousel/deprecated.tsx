import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';
import type { CarouselAttributes } from './types';

/**
 * v2.0.0 save — before a11y announcement fields were added to context
 * and the live-region <span> was appended.
 *
 * @param {Object}             root0            Component props.
 * @param {CarouselAttributes} root0.attributes Block attributes.
 */
function SaveV200( {
	attributes,
}: {
	attributes: CarouselAttributes;
} ) {
	const {
		loop,
		dragFree,
		carouselAlign,
		containScroll,
		direction,
		autoplay,
		autoplayDelay,
		autoplayStopOnInteraction,
		autoplayStopOnMouseEnter,
		ariaLabel,
		slideGap,
		axis,
		height,
		slidesToScroll,
	} = attributes;

	const context = {
		options: {
			loop,
			dragFree,
			align: carouselAlign,
			containScroll,
			direction,
			axis,
			slidesToScroll: slidesToScroll === 'auto' ? 'auto' : parseInt( slidesToScroll, 10 ),
		},
		autoplay: autoplay
			? {
				delay: autoplayDelay,
				stopOnInteraction: autoplayStopOnInteraction,
				stopOnMouseEnter: autoplayStopOnMouseEnter,
			}
			: false,
		isPlaying: !! autoplay,
		timerIterationId: 0,
		selectedIndex: -1,
		scrollSnaps: [] as { index: number }[],
		canScrollPrev: false,
		canScrollNext: false,
		scrollProgress: 0,
		slideCount: 0,
		/* translators: %d: slide number */
		ariaLabelPattern: __( 'Go to slide %d', 'rt-carousel' ),
	};

	const blockProps = useBlockProps.save( {
		className: 'rt-carousel',
		role: 'region',
		'aria-roledescription': 'carousel',
		'aria-label': ariaLabel,
		dir: direction,
		'data-axis': axis,
		'data-loop': loop ? 'true' : undefined,
		'data-wp-interactive': 'rt-carousel/carousel',
		'data-wp-context': JSON.stringify( context ),
		'data-wp-init': 'callbacks.initCarousel',
		style: {
			'--rt-carousel-gap': `${ slideGap }px`,
			'--rt-carousel-height': axis === 'y' ? height : undefined,
		} as React.CSSProperties,
	} );

	const innerBlocksProps = useInnerBlocksProps.save( blockProps ) as ReturnType<
		typeof useInnerBlocksProps.save
	> & {
		children: React.ReactNode;
	};

	return <div { ...innerBlocksProps } />;
}

/**
 * v2.0.1 save — after the a11y announcement fields and live-region <span>
 * were added, but before `countLabelPattern` (v2.0.2).
 *
 * @param {Object}             root0            Component props.
 * @param {CarouselAttributes} root0.attributes Block attributes.
 */
function SaveV201( {
	attributes,
}: {
	attributes: CarouselAttributes;
} ) {
	const {
		loop,
		dragFree,
		carouselAlign,
		containScroll,
		direction,
		autoplay,
		autoplayDelay,
		autoplayStopOnInteraction,
		autoplayStopOnMouseEnter,
		ariaLabel,
		slideGap,
		axis,
		height,
		slidesToScroll,
	} = attributes;

	const context = {
		options: {
			loop,
			dragFree,
			align: carouselAlign,
			containScroll,
			direction,
			axis,
			slidesToScroll: slidesToScroll === 'auto' ? 'auto' : parseInt( slidesToScroll, 10 ),
		},
		autoplay: autoplay
			? {
				delay: autoplayDelay,
				stopOnInteraction: autoplayStopOnInteraction,
				stopOnMouseEnter: autoplayStopOnMouseEnter,
			}
			: false,
		isPlaying: !! autoplay,
		timerIterationId: 0,
		selectedIndex: -1,
		scrollSnaps: [] as { index: number }[],
		canScrollPrev: false,
		canScrollNext: false,
		scrollProgress: 0,
		slideCount: 0,
		/* translators: %d: slide number */
		ariaLabelPattern: __( 'Go to slide %d', 'rt-carousel' ),
		announcement: '',
		shouldAnnounce: false,
		/* translators: {{currentSlide}}: current slide number, {{totalSlides}}: total slide count. */
		announcementPattern: __(
			'Slide {{currentSlide}} of {{totalSlides}}',
			'rt-carousel',
		),
	};

	const blockProps = useBlockProps.save( {
		className: 'rt-carousel',
		role: 'region',
		'aria-roledescription': 'carousel',
		'aria-label': ariaLabel,
		dir: direction,
		'data-axis': axis,
		'data-loop': loop ? 'true' : undefined,
		'data-wp-interactive': 'rt-carousel/carousel',
		'data-wp-context': JSON.stringify( context ),
		'data-wp-init': 'callbacks.initCarousel',
		style: {
			'--rt-carousel-gap': `${ slideGap }px`,
			'--rt-carousel-height': axis === 'y' ? height : undefined,
		} as React.CSSProperties,
	} );

	const innerBlocksProps = useInnerBlocksProps.save( blockProps ) as ReturnType<
		typeof useInnerBlocksProps.save
	> & {
		children: React.ReactNode;
	};
	const { children, ...wrapperProps } = innerBlocksProps;
	const announcementLiveRegion = (
		<span
			className="screen-reader-text"
			role="status"
			aria-live="polite"
			aria-atomic="true"
			data-wp-text="context.announcement"
		/>
	);

	return (
		<div { ...wrapperProps }>
			{ children }
			{ announcementLiveRegion }
		</div>
	);
}

/**
 * v2.0.3 save — after `countLabelPattern` was added to context, but before the `transition` (slide/fade) attribute.
 *
 * @param {Object}             root0            Component props.
 * @param {CarouselAttributes} root0.attributes Block attributes.
 */
function SaveV203( {
	attributes,
}: {
	attributes: CarouselAttributes;
} ) {
	const {
		loop,
		dragFree,
		carouselAlign,
		containScroll,
		direction,
		autoplay,
		autoplayDelay,
		autoplayStopOnInteraction,
		autoplayStopOnMouseEnter,
		ariaLabel,
		slideGap,
		axis,
		height,
		slidesToScroll,
	} = attributes;

	const context = {
		options: {
			loop,
			dragFree,
			align: carouselAlign,
			containScroll,
			direction,
			axis,
			slidesToScroll: slidesToScroll === 'auto' ? 'auto' : parseInt( slidesToScroll, 10 ),
		},
		autoplay: autoplay
			? {
				delay: autoplayDelay,
				stopOnInteraction: autoplayStopOnInteraction,
				stopOnMouseEnter: autoplayStopOnMouseEnter,
			}
			: false,
		isPlaying: !! autoplay,
		timerIterationId: 0,
		selectedIndex: -1,
		scrollSnaps: [] as { index: number }[],
		canScrollPrev: false,
		canScrollNext: false,
		scrollProgress: 0,
		slideCount: 0,
		/* translators: %d: slide number */
		ariaLabelPattern: __( 'Go to slide %d', 'rt-carousel' ),
		/* translators: {{currentSlide}}: current slide number, {{totalSlides}}: total slide count. */
		countLabelPattern: __(
			'Slide {{currentSlide}} of {{totalSlides}}',
			'rt-carousel',
		),
		announcement: '',
		shouldAnnounce: false,
		/* translators: {{currentSlide}}: current slide number, {{totalSlides}}: total slide count. */
		announcementPattern: __(
			'Slide {{currentSlide}} of {{totalSlides}}',
			'rt-carousel',
		),
	};

	const blockProps = useBlockProps.save( {
		className: 'rt-carousel',
		role: 'region',
		'aria-roledescription': 'carousel',
		'aria-label': ariaLabel,
		dir: direction,
		'data-axis': axis,
		'data-loop': loop ? 'true' : undefined,
		'data-wp-interactive': 'rt-carousel/carousel',
		'data-wp-context': JSON.stringify( context ),
		'data-wp-init': 'callbacks.initCarousel',
		style: {
			'--rt-carousel-gap': `${ slideGap }px`,
			'--rt-carousel-height': axis === 'y' ? height : undefined,
		} as React.CSSProperties,
	} );

	const innerBlocksProps = useInnerBlocksProps.save( blockProps ) as ReturnType<
		typeof useInnerBlocksProps.save
	> & {
		children: React.ReactNode;
	};
	const { children, ...wrapperProps } = innerBlocksProps;
	const announcementLiveRegion = (
		<span
			className="screen-reader-text"
			role="status"
			aria-live="polite"
			aria-atomic="true"
			data-wp-text="context.announcement"
		/>
	);

	return (
		<div { ...wrapperProps }>
			{ children }
			{ announcementLiveRegion }
		</div>
	);
}

/*
 * Every entry declares the current attribute set, not the one its version shipped with.
 * `getBlockAttributes` only walks the schema it is handed, so a reduced schema drops
 * newer attributes on match and the block re-invalidates on the next save.
 */
const sharedAttributes = {
	allowedSlideBlocks: { type: 'array' as const, default: [] },
	transition: { type: 'string' as const, default: 'slide', enum: [ 'slide', 'fade' ] },
	loop: { type: 'boolean' as const, default: false },
	dragFree: { type: 'boolean' as const, default: false },
	carouselAlign: { type: 'string' as const, default: 'start' },
	containScroll: { type: 'string' as const, default: 'trimSnaps' },
	direction: { type: 'string' as const, default: 'ltr', enum: [ 'ltr', 'rtl' ] },
	axis: { type: 'string' as const, default: 'x', enum: [ 'x', 'y' ] },
	height: { type: 'string' as const, default: '300px' },
	autoplay: { type: 'boolean' as const, default: false },
	autoplayDelay: { type: 'number' as const, default: 4000 },
	autoplayStopOnInteraction: { type: 'boolean' as const, default: true },
	autoplayStopOnMouseEnter: { type: 'boolean' as const, default: false },
	ariaLabel: { type: 'string' as const, default: 'Carousel', role: 'content' as const },
	slideGap: { type: 'number' as const, default: 0 },
	slidesToScroll: { type: 'string' as const, default: '1' },
	lazyLoadImages: { type: 'boolean' as const, default: true },
	autoScroll: { type: 'boolean' as const, default: false },
	autoScrollSpeed: { type: 'number' as const, default: 2 },
	autoScrollDirection: { type: 'string' as const, default: 'forward', enum: [ 'forward', 'backward' ] },
	autoScrollStartDelay: { type: 'number' as const, default: 1000 },
	autoScrollStopOnInteraction: { type: 'boolean' as const, default: true },
	autoScrollStopOnMouseEnter: { type: 'boolean' as const, default: false },
	useTabs: { type: 'boolean' as const, default: false },
};

const sharedSupports = {
	interactivity: true,
	align: [ 'wide', 'full' ],
	html: false,
	color: {
		text: false,
		background: true,
	},
};

const deprecated = [
	{
		attributes: sharedAttributes,
		supports: sharedSupports,
		save: SaveV203,
	},
	{
		attributes: sharedAttributes,
		supports: sharedSupports,
		save: SaveV201,
	},
	{
		attributes: sharedAttributes,
		supports: sharedSupports,
		save: SaveV200,
	},
];

export default deprecated;
