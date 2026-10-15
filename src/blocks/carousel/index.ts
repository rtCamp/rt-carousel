import {
	registerBlockType,
	registerBlockStyle,
	type BlockConfiguration,
} from '@wordpress/blocks';
import Edit from './edit';
import Save from './save';
import deprecated from './deprecated';
import './style.scss';
import './editor.scss';
import metadata from './block.json';
import type { CarouselAttributes } from './types';
import { __ } from '@wordpress/i18n';

// @ts-expect-error — __experimentalLabel exists in Gutenberg but is not yet typed
registerBlockType( metadata as BlockConfiguration<CarouselAttributes>, {
	edit: Edit,
	save: Save,
	deprecated: deprecated as unknown as NonNullable<
		BlockConfiguration<CarouselAttributes>[ 'deprecated' ]
	>,
	__experimentalLabel: ( attributes: CarouselAttributes ) => {
		return attributes.useTabs ? __( 'Tabs', 'rt-carousel' ) : undefined;
	},
} );

const styles = [
	{
		name: 'default',
		label: __( 'Default (100%)', 'rt-carousel' ),
		isDefault: true,
	},
	{ name: 'columns-2', label: __( '2 Columns (50%)', 'rt-carousel' ) },
	{ name: 'columns-3', label: __( '3 Columns (33%)', 'rt-carousel' ) },
	{ name: 'columns-4', label: __( '4 Columns (25%)', 'rt-carousel' ) },
];

styles.forEach( ( style ) => registerBlockStyle( metadata.name, style ) );
