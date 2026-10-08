import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, SelectControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useContext, useRef } from '@wordpress/element';
import { EditorCarouselContext } from '../editor-context';
import { NextIcon, PreviousIcon } from './components/icons';
import { getPositionClassName } from './get-position-class';
import type {
	CarouselControlsAttributes,
	CarouselControlsPosition,
} from '../types';
import type { EmblaCarouselType } from 'embla-carousel';
import { useMergeRefs } from '@wordpress/compose';

const EMBLA_KEY = Symbol.for( 'carousel-system.carousel' );

export default function Edit( {
	attributes,
	setAttributes,
}: {
	attributes: CarouselControlsAttributes;
	setAttributes: ( attributes: Partial<CarouselControlsAttributes> ) => void;
} ) {
	const { position } = attributes;
	const {
		emblaApi: contextApi,
		canScrollPrev,
		canScrollNext,
		carouselOptions,
	} = useContext( EditorCarouselContext );
	const ref = useRef<HTMLDivElement>( null );

	const blockProps = useBlockProps( {
		className: getPositionClassName( position ),
	} );

	const mergedRef = useMergeRefs( [ blockProps.ref, ref ] );

	const getEmblaFromDOM = () => {
		if ( ! ref.current ) {
			return null;
		}
		const wrapper = ref.current.closest( '.rt-carousel' );
		if ( ! wrapper ) {
			return null;
		}
		const viewport = wrapper.querySelector( '.embla' );
		if ( ! viewport ) {
			return null;
		}

		return ( viewport as { [EMBLA_KEY]?: EmblaCarouselType } )[ EMBLA_KEY ] ?? null;
	};

	const handleScroll = ( direction: 'prev' | 'next' ) => {
		const api = contextApi || getEmblaFromDOM();
		if ( api ) {
			if ( direction === 'prev' ) {
				api.scrollPrev();
			} else {
				api.scrollNext();
			}
		}
	};

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Settings', 'rt-carousel' ) }>
					<SelectControl
						label={ __( 'Position', 'rt-carousel' ) }
						value={ position }
						options={ [
							{ label: __( 'Below', 'rt-carousel' ), value: 'below' },
							{ label: __( 'Overlay', 'rt-carousel' ), value: 'overlay' },
							{ label: __( 'Outside', 'rt-carousel' ), value: 'outside' },
						] }
						onChange={ ( value ) =>
							setAttributes( {
								position: value as CarouselControlsPosition,
							} )
						}
						help={
							position !== 'below'
								? __(
									'For best results, place the Controls block directly inside the carousel (not inside a Group).',
									'rt-carousel',
								)
								: undefined
						}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			</InspectorControls>
			<div { ...blockProps } ref={ mergedRef }>
				<button
					className="rt-carousel-controls__btn rt-carousel-controls__btn--prev"
					onClick={ ( e ) => {
						e.stopPropagation();
						handleScroll( 'prev' );
					} }
					type="button"
					disabled={ ! carouselOptions?.autoScroll && ! canScrollPrev }
					aria-label={ __( 'Previous Slide', 'rt-carousel' ) }
				>
					<PreviousIcon />
				</button>
				<button
					className="rt-carousel-controls__btn rt-carousel-controls__btn--next"
					onClick={ ( e ) => {
						e.stopPropagation();
						handleScroll( 'next' );
					} }
					type="button"
					disabled={ ! carouselOptions?.autoScroll && ! canScrollNext }
					aria-label={ __( 'Next Slide', 'rt-carousel' ) }
				>
					<NextIcon />
				</button>
			</div>
		</>
	);
}
