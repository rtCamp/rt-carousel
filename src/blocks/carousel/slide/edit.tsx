import {
	useBlockProps,
	useInnerBlocksProps,
	BlockControls,
	BlockVerticalAlignmentToolbar,
} from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';
import { useContext } from '@wordpress/element';
import type { CarouselSlideAttributes, BlockEditorSelectors } from '../types';
import { EditorCarouselContext } from '../editor-context';

export default function Edit( {
	attributes,
	setAttributes,
	clientId,
	context,
}: {
	attributes: CarouselSlideAttributes;
	setAttributes: ( attributes: Partial<CarouselSlideAttributes> ) => void;
	clientId: string;
	context: { 'rt-carousel/carousel/allowedSlideBlocks'?: string[]; 'rt-carousel/carousel/useTabs'?: boolean };
} ) {
	const allowedBlocks = context[ 'rt-carousel/carousel/allowedSlideBlocks' ];

	const { useTabs, selectedIndex } = useContext( EditorCarouselContext );

	const slideIndex = useSelect(
		( select ) => {
			const blockEditor = select( 'core/block-editor' ) as BlockEditorSelectors;
			const parentId = blockEditor.getBlockRootClientId( clientId );
			if ( ! parentId ) {
				return -1;
			}
			const siblings = blockEditor.getBlocks( parentId );
			return siblings.findIndex( ( b ) => b.clientId === clientId );
		},
		[ clientId ],
	);

	// In tabs mode, slideIndex < 0 is unexpected — surface it in dev builds.
	if ( useTabs && slideIndex < 0 && typeof console !== 'undefined' ) {
		// eslint-disable-next-line no-console
		console.warn(
			'rt-carousel: slide could not locate its index in the viewport. ' +
				'The block may be rendered outside a carousel-viewport.',
		);
	}

	const isActive = ! useTabs || slideIndex < 0 || slideIndex === selectedIndex;

	const { verticalAlignment } = attributes;

	const blockProps = useBlockProps( {
		className: `embla__slide${
			verticalAlignment ? ` is-vertically-aligned-${ verticalAlignment }` : ''
		}${ useTabs && isActive ? ' is-active' : '' }`,
	} );

	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		allowedBlocks:
			allowedBlocks && allowedBlocks.length > 0 ? allowedBlocks : undefined,
		templateLock: false,
	} );

	return (
		<>
			<BlockControls>
				<BlockVerticalAlignmentToolbar
					value={ verticalAlignment }
					onChange={ ( value ) =>
						setAttributes( { verticalAlignment: value } )
					}
				/>
			</BlockControls>
			<div { ...innerBlocksProps } />
		</>
	);
}
