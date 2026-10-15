import { registerBlockType, type BlockConfiguration } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';
import Edit from './edit';
import Save from './save';
import metadata from './block.json';
import type { CarouselSlideAttributes } from '../types';

// @ts-expect-error — __experimentalLabel exists in Gutenberg but is not yet typed
registerBlockType( metadata as BlockConfiguration<CarouselSlideAttributes>, {
	edit: Edit,
	save: Save,
	__experimentalLabel: (
		_attrs: unknown,
		{ context }: { context?: Record< string, unknown > },
	) => {
		return context?.[ 'rt-carousel/carousel/useTabs' ]
			? __( 'Tab Panel', 'rt-carousel' )
			: undefined;
	},
} );
