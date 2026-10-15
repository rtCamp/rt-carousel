import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
	InspectorAdvancedControls,
	BlockControls,
} from '@wordpress/block-editor';
import {
	PanelBody,
	ToggleControl,
	SelectControl,
	FormTokenField,
	BaseControl,
	TextControl,
	RangeControl,
	Placeholder,
	Button,
	ToolbarButton,
} from '@wordpress/components';
import { plus } from '@wordpress/icons';
import { useSelect, useDispatch } from '@wordpress/data';
import { useState, useMemo, useCallback, useEffect, useRef } from '@wordpress/element';
import { createBlock, type BlockConfiguration } from '@wordpress/blocks';
import { findBlockDeep, findAllBlocksDeep, type CarouselAttributes, type BlockEditorSelectors } from './types';
import { EditorCarouselContext } from './editor-context';
import type { EmblaCarouselType } from 'embla-carousel';
import { getSlideTemplates, type SlideTemplate } from './templates';
import TemplatePicker from './components/TemplatePicker';

type SetupStep = 'slide-count' | 'template';

export default function Edit( {
	attributes,
	setAttributes,
	clientId,
}: {
	attributes: CarouselAttributes;
	setAttributes: ( attrs: Partial<CarouselAttributes> ) => void;
	clientId: string;
} ) {
	const {
		transition,
		loop,
		dragFree,
		carouselAlign,
		containScroll,
		direction,
		axis,
		height,
		allowedSlideBlocks,
		autoplay,
		autoplayDelay,
		autoplayStopOnInteraction,
		autoplayStopOnMouseEnter,
		ariaLabel,
		slidesToScroll = '1',
		useTabs = false,
		lazyLoadImages,
		autoScroll,
		autoScrollSpeed,
		autoScrollDirection,
		autoScrollStartDelay,
		autoScrollStopOnInteraction,
		autoScrollStopOnMouseEnter,
	} = attributes;

	const [ emblaApi, setEmblaApi ] = useState<EmblaCarouselType | undefined>();
	const [ canScrollPrev, setCanScrollPrev ] = useState( false );
	const [ canScrollNext, setCanScrollNext ] = useState( false );
	const [ setupStep, setSetupStep ] = useState<SetupStep>( 'slide-count' );
	const [ pendingSlideCount, setPendingSlideCount ] = useState<number>( 0 );
	const [ scrollProgress, setScrollProgress ] = useState( 0 );
	const [ selectedIndex, setSelectedIndex ] = useState( 0 );
	const [ scrollSnaps, setScrollSnaps ] = useState<number[]>( [] );
	const [ slideCount, setSlideCount ] = useState( 0 );

	/* Mirror useTabs into a ref so Embla's select/reInit handlers always read
	 * the latest value without forcing this effect to re-subscribe. */
	const useTabsRef = useRef( useTabs );
	useTabsRef.current = useTabs;

	const slideTemplates = useMemo( getSlideTemplates, [ getSlideTemplates ] );

	const { replaceInnerBlocks, insertBlock, removeBlocks } = useDispatch( 'core/block-editor' );

	const hasInnerBlocks = useSelect(
		( selectStore ) =>
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			( selectStore( 'core/block-editor' ) as any ).getBlockCount( clientId ) > 0,
		[ clientId ],
	);

	const innerBlocks = useSelect(
		( selectStore ) => {
			const blockEditor = selectStore( 'core/block-editor' ) as BlockEditorSelectors;
			return blockEditor.getBlocks( clientId );
		},
		[ clientId ],
	);

	const viewportClientId = useMemo(
		() => findBlockDeep( innerBlocks, 'rt-carousel/carousel-viewport' )?.clientId,
		[ innerBlocks ],
	);

	const addSlide = useCallback( () => {
		if ( ! viewportClientId ) {
			return;
		}
		insertBlock( createBlock( 'rt-carousel/carousel-slide' ), undefined, viewportClientId );
	}, [ insertBlock, viewportClientId ] );

	const showSetup = ! hasInnerBlocks;
	const prevShowSetup = useRef( showSetup );
	const slideCountOptionsRef = useRef< HTMLDivElement >( null );
	const shouldRestoreSlideCountFocus = useRef( false );
	const shouldFocusEmptyViewport = useRef( false );

	// Reset the setup flow when the placeholder reopens after all inner blocks are removed.
	// When setup completes, focus the carousel block so focus stays in the canvas.
	// Supports both iframed and non-iframed editors.
	useEffect( () => {
		if ( ! prevShowSetup.current && showSetup ) {
			setSetupStep( 'slide-count' );
			setPendingSlideCount( 0 );
		}

		if ( prevShowSetup.current && ! showSetup ) {
			if ( typeof document !== 'undefined' ) {
				const iframe = document.querySelector< HTMLIFrameElement >( 'iframe[name="editor-canvas"]' );
				const blockNode =
					iframe?.contentDocument?.getElementById( `block-${ clientId }` ) ??
					document.getElementById( `block-${ clientId }` );

				if ( shouldFocusEmptyViewport.current ) {
					blockNode
						?.querySelector< HTMLElement >(
							'[data-rt-carousel-empty-appender="true"]',
						)
						?.focus();
					shouldFocusEmptyViewport.current = false;
				} else {
					blockNode?.focus();
				}
			}
		}
		prevShowSetup.current = showSetup;
	}, [ showSetup, clientId ] );

	// After navigating back from template step, restore focus to first slide-count button.
	useEffect( () => {
		if ( ! showSetup || setupStep !== 'slide-count' || ! shouldRestoreSlideCountFocus.current ) {
			return;
		}

		const rafId = requestAnimationFrame( () => {
			const firstBtn = slideCountOptionsRef.current?.querySelector< HTMLButtonElement >(
				'button',
			);
			firstBtn?.focus();
			shouldRestoreSlideCountFocus.current = false;
		} );

		return () => cancelAnimationFrame( rafId );
	}, [ showSetup, setupStep ] );

	// Fetch registered block types for the allowed-blocks token field
	const blockTypes = useSelect( ( selectStore ) => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return ( selectStore( 'core/blocks' ) as any ).getBlockTypes() as BlockConfiguration[];
	}, [] );

	const suggestions = blockTypes?.map( ( block ) => block.name ) || [];

	const blockProps = useBlockProps( {
		className: 'rt-carousel',
		dir: direction,
		'data-axis': axis,
		'data-loop': loop ? 'true' : undefined,
		'data-is-tabs': useTabs ? 'true' : undefined,
		style: {
			'--rt-carousel-gap': `${ attributes.slideGap }px`,
			'--rt-carousel-height': axis === 'y' ? height : undefined,
		} as React.CSSProperties,
	} );

	const innerBlocksProps = useInnerBlocksProps( blockProps, {} );

	const carouselOptions = useMemo(
		() => ( {
			transition,
			loop,
			dragFree,
			align: carouselAlign,
			containScroll,
			direction,
			axis,
			height,
			slidesToScroll: slidesToScroll === 'auto' ? 'auto' : parseInt( slidesToScroll, 10 ),
			autoScroll,
			...( useTabs ? { duration: 0 } : {} ),
		} ),
		[ transition, loop, dragFree, carouselAlign, containScroll, direction, axis, height, slidesToScroll, autoScroll, useTabs ],
	);

	const contextValue = useMemo(
		() => ( {
			emblaApi,
			setEmblaApi,
			canScrollPrev,
			setCanScrollPrev,
			canScrollNext,
			setCanScrollNext,
			scrollProgress,
			setScrollProgress,
			selectedIndex,
			setSelectedIndex,
			scrollSnaps,
			slideCount,
			carouselOptions,
			useTabs,
			autoScroll,
		} ),
		[
			emblaApi,
			canScrollPrev,
			canScrollNext,
			scrollProgress,
			selectedIndex,
			scrollSnaps,
			slideCount,
			carouselOptions,
			useTabs,
			autoScroll,
			setEmblaApi,
			setCanScrollPrev,
			setCanScrollNext,
			setScrollProgress,
		],
	);

	// Subscribe to Embla events to update scrollProgress, selectedIndex, and slideCount
	useEffect( () => {
		if ( ! emblaApi ) {
			return;
		}

		const updateScrollProgress = () => {
			setScrollProgress( emblaApi.scrollProgress() );
		};

		const updateState = () => {
			// In tabs mode selectedIndex is driven by tab clicks / tree-view selection,
			// not Embla's scroll position (hidden slides have 0-width, breaking snaps).
			if ( ! useTabsRef.current ) {
				setSelectedIndex( emblaApi.selectedScrollSnap() );
			}
			setScrollSnaps( emblaApi.scrollSnapList() );
			setSlideCount( emblaApi.slideNodes().length );
			updateScrollProgress();
		};

		emblaApi
			.on( 'scroll', updateScrollProgress )
			.on( 'select', updateState )
			.on( 'reInit', updateState );

		updateState();

		return () => {
			emblaApi
				.off( 'scroll', updateScrollProgress )
				.off( 'select', updateState )
				.off( 'reInit', updateState );
		};
	}, [ emblaApi ] );

	const createNavGroup = () =>
		createBlock(
			'core/group',
			{
				layout: {
					type: 'flex',
					flexWrap: 'nowrap',
					justifyContent: 'space-between',
				},
			},
			[
				createBlock( 'rt-carousel/carousel-controls', {} ),
				createBlock( 'rt-carousel/carousel-counter', {} ),
				createBlock( 'rt-carousel/carousel-dots', {} ),
			],
		);

	/**
	 * Handle the initial setup of the carousel block
	 *
	 * @param {number} count - The number of slides selected by the user.
	 */
	const handleSlideCountPicked = ( count: number ) => {
		setPendingSlideCount( count );
		setSetupStep( 'template' );
	};

	/**
	 * Handle the selection of a slide template during setup.
	 *
	 * @param {SlideTemplate} template - The slide template selected by the user.
	 */
	const handleTemplateSelected = ( template: SlideTemplate ) => {
		// Query Loop goes directly inside the viewport; regular templates get slide wrappers.
		const viewportChildren = template.isQueryLoop
			? [ createBlock( 'core/query', {}, [] ) ]
			: Array.from( { length: Math.max( pendingSlideCount, 1 ) }, () =>
				createBlock( 'rt-carousel/carousel-slide', {}, template.innerBlocks() ),
			);

		replaceInnerBlocks(
			clientId,
			[
				createBlock( 'rt-carousel/carousel-viewport', {}, viewportChildren ),
				createNavGroup(),
			],
			false,
		);
	};

	/**
	 * Skip — still creates the correct structure, just without slides.
	 */
	const handleSkip = () => {
		shouldFocusEmptyViewport.current = true;
		replaceInnerBlocks(
			clientId,
			[ createBlock( 'rt-carousel/carousel-viewport', {} ), createNavGroup() ],
			false,
		);
	};

	const handleUseTabsChange = ( value: boolean ) => {
		if ( value ) {
			setAttributes( {
				useTabs: true,
				transition: 'slide',
				loop: false,
				dragFree: false,
				carouselAlign: 'start',
				containScroll: 'trimSnaps',
				slidesToScroll: '1',
				autoplay: false,
				autoScroll: false,
				axis: 'x',
			} );
			const tabListExists = findBlockDeep( innerBlocks, 'rt-carousel/carousel-tab-list' );
			if ( ! tabListExists ) {
				// Auto-insert tab list as first child (before viewport)
				insertBlock(
					createBlock( 'rt-carousel/carousel-tab-list', {} ),
					0,
					clientId,
				);
			}
			// Find nav row containers (core/group containing navigation blocks) as well as any standalone nav blocks
			const navGroupBlocks = innerBlocks.filter(
				( b ) =>
					b.name === 'core/group' &&
					( findBlockDeep( b.innerBlocks ?? [], 'rt-carousel/carousel-controls' ) ||
						findBlockDeep( b.innerBlocks ?? [], 'rt-carousel/carousel-counter' ) ||
						findBlockDeep( b.innerBlocks ?? [], 'rt-carousel/carousel-dots' ) ),
			);
			const looseNavBlocks = [
				...findAllBlocksDeep( innerBlocks, 'rt-carousel/carousel-controls' ),
				...findAllBlocksDeep( innerBlocks, 'rt-carousel/carousel-counter' ),
				...findAllBlocksDeep( innerBlocks, 'rt-carousel/carousel-dots' ),
			];

			const idsToRemove = Array.from(
				new Set( [
					...navGroupBlocks.map( ( b ) => b.clientId ),
					...looseNavBlocks.map( ( b ) => b.clientId ),
				] ),
			);
			if ( idsToRemove.length > 0 ) {
				removeBlocks( idsToRemove );
			}
		} else {
			setAttributes( { useTabs: false } );
			const tabListBlocks = findAllBlocksDeep( innerBlocks, 'rt-carousel/carousel-tab-list' );
			const tabListIds = tabListBlocks.map( ( b ) => b.clientId );
			if ( tabListIds.length > 0 ) {
				removeBlocks( tabListIds );
			}

			const controlsExist = findBlockDeep( innerBlocks, 'rt-carousel/carousel-controls' );
			const counterExist = findBlockDeep( innerBlocks, 'rt-carousel/carousel-counter' );
			const dotsExist = findBlockDeep( innerBlocks, 'rt-carousel/carousel-dots' );

			if ( ! controlsExist && ! counterExist && ! dotsExist ) {
				// No navigation blocks exist — insert full nav group row container
				insertBlock( createNavGroup(), undefined, clientId );
			} else if ( ! controlsExist || ! counterExist || ! dotsExist ) {
				const navGroup = innerBlocks.find(
					( b ) =>
						b.name === 'core/group' &&
						( findBlockDeep( b.innerBlocks ?? [], 'rt-carousel/carousel-controls' ) ||
							findBlockDeep( b.innerBlocks ?? [], 'rt-carousel/carousel-counter' ) ||
							findBlockDeep( b.innerBlocks ?? [], 'rt-carousel/carousel-dots' ) ),
				);
				const targetParentId = navGroup ? navGroup.clientId : clientId;

				if ( ! controlsExist ) {
					insertBlock(
						createBlock( 'rt-carousel/carousel-controls', {} ),
						undefined,
						targetParentId,
					);
				}
				if ( ! counterExist ) {
					insertBlock(
						createBlock( 'rt-carousel/carousel-counter', {} ),
						undefined,
						targetParentId,
					);
				}
				if ( ! dotsExist ) {
					insertBlock(
						createBlock( 'rt-carousel/carousel-dots', {} ),
						undefined,
						targetParentId,
					);
				}
			}
		}
	};

	const inspectorControls = (
		<>
			<InspectorControls>
				<PanelBody title={ useTabs ? __( 'Tab Settings', 'rt-carousel' ) : __( 'Carousel Settings', 'rt-carousel' ) }>
					<ToggleControl
						label={ __( 'Use as Tabs', 'rt-carousel' ) }
						checked={ useTabs }
						onChange={ handleUseTabsChange }
						help={ __(
							'Converts the carousel into an accessible tab widget.',
							'rt-carousel',
						) }
					/>
					{ ! useTabs && (
						<>
							<SelectControl
								label={ __( 'Transition', 'rt-carousel' ) }
								value={ transition }
								disabled={ autoScroll }
								options={ [
									{ label: __( 'Slide', 'rt-carousel' ), value: 'slide' },
									{ label: __( 'Fade', 'rt-carousel' ), value: 'fade' },
								] }
								onChange={ ( value ) =>
									setAttributes( { transition: value as CarouselAttributes[ 'transition' ] } )
								}
								help={
									autoScroll
										? __( 'Auto Scroll does not support transitions.', 'rt-carousel' )
										: __(
											'Choose how slides transition: sliding horizontally or cross-fading.',
											'rt-carousel',
										)
								}
							/>
							<ToggleControl
								label={ __( 'Loop', 'rt-carousel' ) }
								checked={ loop }
								disabled={ autoScroll && autoScrollDirection === 'backward' }
								onChange={ ( value ) => setAttributes( { loop: value } ) }
								help={ autoScroll && autoScrollDirection === 'backward'
									? __( 'Loop is required for backward auto scroll.', 'rt-carousel' )
									: __( 'Enables infinite scrolling of slides.', 'rt-carousel' ) }
							/>
							{ transition !== 'fade' && (
								<ToggleControl
									label={ __( 'Free Drag', 'rt-carousel' ) }
									checked={ dragFree }
									onChange={ ( value ) => setAttributes( { dragFree: value } ) }
									help={ __( 'Enables momentum scrolling.', 'rt-carousel' ) }
								/>
							) }
							<ToggleControl
								label={ __( 'Lazy Load Images', 'rt-carousel' ) }
								checked={ lazyLoadImages }
								onChange={ ( value ) => setAttributes( { lazyLoadImages: value } ) }
								help={ __(
									'Load images only when they enter the viewport.',
									'rt-carousel',
								) }
							/>
							{ transition !== 'fade' && (
								<SelectControl
									label={ __( 'Alignment', 'rt-carousel' ) }
									value={ carouselAlign }
									options={ [
										{ label: __( 'Start', 'rt-carousel' ), value: 'start' },
										{ label: __( 'Center', 'rt-carousel' ), value: 'center' },
										{ label: __( 'End', 'rt-carousel' ), value: 'end' },
									] }
									onChange={ ( value ) =>
										setAttributes( { carouselAlign: value as CarouselAttributes[ 'carouselAlign' ] } )
									}
								/>
							) }
							{ transition !== 'fade' && (
								<SelectControl
									label={ __( 'Contain Scroll', 'rt-carousel' ) }
									value={ containScroll }
									options={ [
										{ label: __( 'Trim Snaps', 'rt-carousel' ), value: 'trimSnaps' },
										{ label: __( 'Keep Snaps', 'rt-carousel' ), value: 'keepSnaps' },
										{ label: __( 'None', 'rt-carousel' ), value: '' },
									] }
									onChange={ ( value ) =>
										setAttributes( { containScroll: value as CarouselAttributes[ 'containScroll' ] } )
									}
									help={ __(
										'Prevents excess scrolling at the beginning or end.',
										'rt-carousel',
									) }
								/>
							) }
							{ transition !== 'fade' && (
								<ToggleControl
									label={ __( 'Scroll Auto', 'rt-carousel' ) }
									checked={ slidesToScroll === 'auto' }
									onChange={ ( isAuto ) =>
										setAttributes( { slidesToScroll: isAuto ? 'auto' : '1' } )
									}
									help={ __(
										'Scrolls the number of slides currently visible in the viewport.',
										'rt-carousel',
									) }
								/>
							) }
							{ transition !== 'fade' && slidesToScroll !== 'auto' && (
								<RangeControl
									label={ __( 'Slides to Scroll', 'rt-carousel' ) }
									value={ parseInt( slidesToScroll, 10 ) || 1 }
									onChange={ ( value ) =>
										setAttributes( { slidesToScroll: ( value || 1 ).toString() } )
									}
									min={ 1 }
									max={ 10 }
								/>
							) }
							<SelectControl
								label={ __( 'Direction', 'rt-carousel' ) }
								value={ direction }
								options={ [
									{ label: __( 'Left to Right (LTR)', 'rt-carousel' ), value: 'ltr' },
									{ label: __( 'Right to Left (RTL)', 'rt-carousel' ), value: 'rtl' },
								] }
								onChange={ ( value ) =>
									setAttributes( { direction: value as CarouselAttributes[ 'direction' ] } )
								}
								help={ __(
									'Choose content direction. RTL is typically used for Arabic, Hebrew, and other right-to-left languages.',
									'rt-carousel',
								) }
							/>
							<SelectControl
								label={ __( 'Orientation', 'rt-carousel' ) }
								value={ axis }
								options={ [
									{ label: __( 'Horizontal', 'rt-carousel' ), value: 'x' },
									{ label: __( 'Vertical', 'rt-carousel' ), value: 'y' },
								] }
								onChange={ ( value ) =>
									setAttributes( { axis: value as CarouselAttributes[ 'axis' ] } )
								}
							/>
							{ axis === 'y' && (
								<TextControl
									label={ __( 'Height', 'rt-carousel' ) }
									value={ height }
									onChange={ ( value ) => setAttributes( { height: value } ) }
									help={ __(
										'Set a fixed height for vertical carousel (e.g., 400px).',
										'rt-carousel',
									) }
								/>
							) }
						</>
					) }
				</PanelBody>
				{ ! useTabs && (
					<PanelBody
						title={ __( 'Autoplay Options', 'rt-carousel' ) }
						initialOpen={ false }
					>
						<ToggleControl
							label={ __( 'Enable Autoplay', 'rt-carousel' ) }
							checked={ autoplay }
							onChange={ ( value ) => {
								setAttributes( {
									autoplay: value,
									autoScroll: value ? false : autoScroll,
								} );
							} }
						/>
						{ autoplay && (
							<>
								<RangeControl
									label={ __( 'Delay (ms)', 'rt-carousel' ) }
									value={ autoplayDelay }
									onChange={ ( value ) =>
										setAttributes( { autoplayDelay: value ?? 1000 } )
									}
									min={ 1000 }
									max={ 10000 }
									step={ 100 }
								/>
								<ToggleControl
									label={ __( 'Stop on Interaction', 'rt-carousel' ) }
									checked={ autoplayStopOnInteraction }
									onChange={ ( value ) =>
										setAttributes( { autoplayStopOnInteraction: value } )
									}
									help={ __(
										'Stop autoplay when user interacts with carousel.',
										'rt-carousel',
									) }
								/>
								<ToggleControl
									label={ __( 'Stop on Mouse Enter', 'rt-carousel' ) }
									checked={ autoplayStopOnMouseEnter }
									onChange={ ( value ) =>
										setAttributes( { autoplayStopOnMouseEnter: value } )
									}
									help={ __(
										'Stop autoplay when mouse hovers over carousel.',
										'rt-carousel',
									) }
								/>
							</>
						) }
					</PanelBody>
				) }
				{ ! useTabs && (
					<PanelBody
						title={ __( 'Auto Scroll', 'rt-carousel' ) }
						initialOpen={ false }
					>
						<ToggleControl
							label={ __( 'Enable Auto Scroll', 'rt-carousel' ) }
							checked={ autoScroll }
							onChange={ ( value ) => {
								const nextAttributes: Partial< CarouselAttributes > = {
									autoScroll: value,
									autoplay: value ? false : autoplay,
									loop: ( value && autoScrollDirection === 'backward' ) ? true : loop,
								};
								if ( value ) {
									nextAttributes.transition = 'slide';
								}
								setAttributes( nextAttributes );
							} }
						/>
						{ autoScroll && ( <>
							<RangeControl
								label={ __( 'Speed', 'rt-carousel' ) }
								value={ autoScrollSpeed }
								onChange={ ( value ) =>
									setAttributes( { autoScrollSpeed: value ?? 2 } )
								}
								min={ 1 }
								max={ 10 }
							/>
							<SelectControl
								label={ __( 'Direction', 'rt-carousel' ) }
								value={ autoScrollDirection }
								options={ [
									{ label: __( 'Forward', 'rt-carousel' ), value: 'forward' },
									{ label: __( 'Backward', 'rt-carousel' ), value: 'backward' },
								] }
								onChange={ ( value ) =>
									setAttributes( {
										autoScrollDirection: value as CarouselAttributes['autoScrollDirection'],
										loop: value === 'backward' ? true : loop,
									} )
								}
							/>
							<RangeControl
								label={ __( 'Start Delay (ms)', 'rt-carousel' ) }
								value={ autoScrollStartDelay }
								onChange={ ( value ) =>
									setAttributes( { autoScrollStartDelay: value ?? 1000 } )
								}
								min={ 0 }
								max={ 10000 }
								step={ 100 }
							/>
							<ToggleControl
								label={ __( 'Stop on Interaction', 'rt-carousel' ) }
								checked={ autoScrollStopOnInteraction }
								onChange={ ( value ) =>
									setAttributes( { autoScrollStopOnInteraction: value } )
								}
								help={ __( 'Stop auto scroll when user interacts with carousel.', 'rt-carousel' ) }
							/>
							<ToggleControl
								label={ __( 'Stop on Mouse Enter', 'rt-carousel' ) }
								checked={ autoScrollStopOnMouseEnter }
								onChange={ ( value ) =>
									setAttributes( { autoScrollStopOnMouseEnter: value } )
								}
								help={ __( 'Stop auto scroll when mouse hovers over carousel.', 'rt-carousel' ) }
							/>
						</> ) }
					</PanelBody>
				) }
			</InspectorControls>
			<InspectorAdvancedControls>
				<TextControl
					label={ __( 'ARIA Label', 'rt-carousel' ) }
					value={ ariaLabel }
					onChange={ ( value ) => setAttributes( { ariaLabel: value } ) }
					help={ __(
						"Provide a descriptive label for screen readers (e.g., 'Featured Products').",
						'rt-carousel',
					) }
				/>
				{ /* FormTokenField does not allow "help" prop */ }
				<BaseControl
					help={
						<>
							{ __(
								'Use this to allow only certain blocks in the slide. If empty, all blocks will be allowed.',
								'rt-carousel',
							) }
						</>
					}
				>
					<FormTokenField
						label={ __( 'Allowed Slide Blocks', 'rt-carousel' ) }
						value={ allowedSlideBlocks || [] }
						suggestions={ suggestions as string[] }
						maxSuggestions={ 10 }
						onChange={ ( tokens ) =>
							setAttributes( { allowedSlideBlocks: tokens as string[] } )
						}
						__experimentalValidateInput={ ( value: string ) =>
							suggestions.includes( value )
						}
					/>
				</BaseControl>
			</InspectorAdvancedControls>
			<InspectorControls group="styles">
				<PanelBody title={ __( 'Layout', 'rt-carousel' ) }>
					<RangeControl
						label={ __( 'Slide Gap (px)', 'rt-carousel' ) }
						value={ attributes.slideGap }
						onChange={ ( value ) => setAttributes( { slideGap: value ?? 0 } ) }
						min={ 0 }
						max={ 500 }
						initialPosition={ 0 }
						allowReset
					/>
				</PanelBody>
			</InspectorControls>
		</>
	);

	if ( showSetup ) {
		return (
			<EditorCarouselContext.Provider value={ contextValue }>
				{ inspectorControls }
				<div { ...blockProps }>
					<Placeholder
						icon="columns"
						label={ __( 'Carousel', 'rt-carousel' ) }
						instructions={
							setupStep === 'slide-count'
								? __( 'How many slides would you like to start with?', 'rt-carousel' )
								: __( 'Choose a slide template:', 'rt-carousel' )
						}
						className="rt-carousel-setup"
					>
						{ setupStep === 'slide-count' && (
							<>
								<div
									className="rt-carousel-setup__options"
									ref={ slideCountOptionsRef }
								>
									{ [ 1, 2, 3, 4 ].map( ( count ) => (
										<Button
											key={ count }
											variant="secondary"
											className="rt-carousel-setup__option"
											onClick={ () => handleSlideCountPicked( count ) }
										>
											{ count === 1
												? __( '1 Slide', 'rt-carousel' )
												: `${ count } ${ __( 'Slides', 'rt-carousel' ) }` }
										</Button>
									) ) }
								</div>
								<Button
									variant="link"
									className="rt-carousel-setup__skip"
									onClick={ handleSkip }
								>
									{ __( 'Skip', 'rt-carousel' ) }
								</Button>
							</>
						) }
						{ setupStep === 'template' && (
							<TemplatePicker
								templates={ slideTemplates }
								onSelect={ handleTemplateSelected }
								onBack={ () => {
									shouldRestoreSlideCountFocus.current = true;
									setSetupStep( 'slide-count' );
								} }
							/>
						) }
					</Placeholder>
				</div>
			</EditorCarouselContext.Provider>
		);
	}

	return (
		<EditorCarouselContext.Provider value={ contextValue }>
			<BlockControls>
				<ToolbarButton
					icon={ plus }
					label={ __( 'Add Slide', 'rt-carousel' ) }
					onClick={ addSlide }
				/>
			</BlockControls>
			{ inspectorControls }
			<div { ...innerBlocksProps } />
		</EditorCarouselContext.Provider>
	);
}
