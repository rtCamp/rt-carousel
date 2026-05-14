import { __, sprintf } from '@wordpress/i18n';
import { useBlockProps } from '@wordpress/block-editor';
import { useContext, useEffect, useMemo, useState } from '@wordpress/element';
import { EditorCarouselContext } from '../editor-context';

const getPreviewText = ( slide: HTMLElement | undefined, index: number ) => {
	const text = slide?.textContent?.replace( /\s+/g, ' ' ).trim();
	/* translators: %d: slide number */
	return text || sprintf( __( 'Slide %d', 'rt-carousel' ), index + 1 );
};

const getPreviewImage = ( slide: HTMLElement | undefined ) => {
	const image = slide?.querySelector<HTMLImageElement>( 'img' );
	if ( ! image ) {
		return undefined;
	}

	return {
		src: image.currentSrc || image.src,
		srcset: image.getAttribute( 'srcset' ) || undefined,
		sizes: image.getAttribute( 'sizes' ) || undefined,
	};
};

const getSlideForSnap = (
	slides: HTMLElement[],
	snapIndex: number,
	snapCount: number,
) => {
	if ( slides.length === 0 || snapCount <= 0 ) {
		return undefined;
	}

	const estimatedGroupSize = Math.max( 1, Math.ceil( slides.length / snapCount ) );
	return slides[ Math.min( snapIndex * estimatedGroupSize, slides.length - 1 ) ];
};

export default function Edit() {
	const blockProps = useBlockProps( {
		className: 'rt-carousel-thumbnails',
	} );

	const { emblaApi, selectedIndex } = useContext( EditorCarouselContext );
	const [ slideNodes, setSlideNodes ] = useState<HTMLElement[]>( [] );
	const [ snapCount, setSnapCount ] = useState( 0 );

	useEffect( () => {
		if ( ! emblaApi ) {
			setSlideNodes( [] );
			setSnapCount( 0 );
			return;
		}

		const update = () => {
			setSlideNodes( emblaApi.slideNodes() );
			setSnapCount( emblaApi.scrollSnapList().length );
		};

		emblaApi.on( 'reInit', update );
		emblaApi.on( 'select', update );
		update();

		return () => {
			emblaApi.off( 'reInit', update );
			emblaApi.off( 'select', update );
		};
	}, [ emblaApi ] );

	const thumbnails = useMemo( () => {
		const count = snapCount || slideNodes.length || 3;
		return Array.from( { length: count }, ( _, index ) => {
			const slide = getSlideForSnap( slideNodes, index, count );
			return {
				index,
				label: getPreviewText( slide, index ),
				image: getPreviewImage( slide ),
			};
		} );
	}, [ slideNodes, snapCount ] );

	return (
		<div { ...blockProps }>
			<div className="rt-carousel-thumbnails__viewport">
				<div className="rt-carousel-thumbnails__container">
					{ thumbnails.map( ( thumbnail ) => {
						const isActive = thumbnail.index === selectedIndex;
						return (
							<button
								key={ thumbnail.index }
								className={ `rt-carousel-thumbnail${ isActive ? ' is-active' : '' }` }
								type="button"
								aria-current={ isActive ? 'true' : undefined }
								aria-label={ sprintf(
									/* translators: %d: slide number */
									__( 'Go to slide %d', 'rt-carousel' ),
									thumbnail.index + 1,
								) }
								onClick={ () => emblaApi?.scrollTo( thumbnail.index ) }
							>
								<span className="rt-carousel-thumbnail__preview" aria-hidden="true">
									{ thumbnail.image ? (
										<img
											className="rt-carousel-thumbnail__image"
											src={ thumbnail.image.src }
											srcSet={ thumbnail.image.srcset }
											sizes={ thumbnail.image.sizes }
											alt=""
											loading="lazy"
										/>
									) : (
										<span className="rt-carousel-thumbnail__editor-preview">
											{ thumbnail.label }
										</span>
									) }
								</span>
							</button>
						);
					} ) }
				</div>
			</div>
		</div>
	);
}
