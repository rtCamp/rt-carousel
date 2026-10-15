import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';
import type { CarouselSlideAttributes } from '../types';

export default function Save( {
	attributes,
	context,
}: {
	attributes: CarouselSlideAttributes;
	context?: { 'rt-carousel/carousel/useTabs'?: boolean };
} ) {
	const { verticalAlignment } = attributes;
	const useTabs = context?.[ 'rt-carousel/carousel/useTabs' ] ?? false;

	const blockProps = useBlockProps.save( {
		className: `embla__slide${
			verticalAlignment ? ` is-vertically-aligned-${ verticalAlignment }` : ''
		}`,
		role: useTabs ? 'tabpanel' : 'group',
		...( ! useTabs ? { 'aria-roledescription': 'slide' } : {} ),
		'data-wp-interactive': 'rt-carousel/carousel',
		...( useTabs
			? {
				'data-wp-bind--id': 'callbacks.getSlideTabPanelId',
				'data-wp-bind--aria-labelledby': 'callbacks.getSlideTabLabelledBy',
				'data-wp-class--is-active': 'callbacks.isSlideActive',
			}
			: {
				'data-wp-class--is-active': 'callbacks.isSlideActive',
				'data-wp-bind--aria-current': 'callbacks.isSlideActive',
			} ),
	} );

	const innerBlocksProps = useInnerBlocksProps.save( blockProps );

	return <div { ...innerBlocksProps } />;
}
