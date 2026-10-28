import {
	registerBlockType,
	registerBlockStyle,
	type BlockConfiguration,
} from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';
import Edit from './edit';
import Save from './save';
import metadata from './block.json';
import type { CarouselControlsAttributes } from '../types';
import './style.scss';

registerBlockType( metadata as BlockConfiguration<CarouselControlsAttributes>, {
	edit: Edit,
	save: Save,
} );

const styles = [
	{ name: 'default', label: __( 'Below', 'rt-carousel' ), isDefault: true },
	{ name: 'overlay', label: __( 'Overlay', 'rt-carousel' ) },
	{ name: 'outside', label: __( 'Outside', 'rt-carousel' ) },
];

styles.forEach( ( style ) => registerBlockStyle( metadata.name, style ) );
