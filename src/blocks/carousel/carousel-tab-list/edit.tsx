import { __, sprintf } from '@wordpress/i18n';
import {
	InspectorControls,
	RichText,
	useBlockProps,
	ColorPalette,
} from '@wordpress/block-editor';
import { PanelBody, BaseControl } from '@wordpress/components';
import { useContext } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { EditorCarouselContext } from '../editor-context';
import { findBlockDeep, type BlockEditorSelectors } from '../types';
import type { TabListAttributes } from './types';
import { resolveWpValue } from './utils';

const JUSTIFY_MAP: Record< string, string > = {
	left: 'flex-start',
	center: 'center',
	right: 'flex-end',
	'space-between': 'space-between',
};

/* Hoisted: captures no state. */
function setStyleVar(
	style: React.CSSProperties,
	key: string,
	value?: string,
): void {
	if ( value ) {
		( style as Record< string, string > )[ key ] = value;
	}
}

export default function Edit( {
	attributes,
	setAttributes,
	clientId,
}: {
	attributes: TabListAttributes;
	setAttributes: ( attrs: Partial< TabListAttributes > ) => void;
	clientId: string;
} ) {
	const {
		labels,
		activeTabBackgroundColor,
		activeTabTextColor,
		inactiveTabBackgroundColor,
		inactiveTabTextColor,
	} = attributes;

	const carousel = useContext( EditorCarouselContext );

	const slideCount = useSelect(
		( select ) => {
			const blockEditor = select( 'core/block-editor' ) as BlockEditorSelectors;
			// Find closest carousel ancestor — tab-list may be nested through
			// columns/group blocks for side-by-side tab layouts.
			const carouselParents = blockEditor.getBlockParentsByBlockName(
				clientId,
				'rt-carousel/carousel',
			);
			const carouselClientId = carouselParents[ carouselParents.length - 1 ];
			if ( ! carouselClientId ) {
				return 0;
			}
			const carouselBlocks = blockEditor.getBlocks( carouselClientId );
			// Viewport may also be nested anywhere inside the carousel.
			const viewport = findBlockDeep( carouselBlocks, 'rt-carousel/carousel-viewport' );
			return viewport?.innerBlocks?.length ?? 0;
		},
		[ clientId ],
	);

	const dotCount = Math.max( slideCount, 1 );

	const style: React.CSSProperties = {};

	/* Only write layout-derived inline styles when non-default — defaults are
	 * provided by the browser (flex-start / row) so we don't fight WP's own
	 * layout CSS or duplicate values in the DOM. */
	const justify = attributes.layout?.justifyContent;
	if ( justify && justify !== 'left' ) {
		style.justifyContent = JUSTIFY_MAP[ justify ] ?? 'flex-start';
	}
	if ( attributes.layout?.orientation === 'vertical' ) {
		style.flexDirection = 'column';
		// Stretch tabs to a uniform width in vertical mode. WP's layout
		// class defaults align-items to flex-start, which makes each tab
		// only as wide as its label. Match the editor's WYSIWYG behaviour.
		style.alignItems = 'stretch';
		// flex-wrap: wrap would stack tabs into staggered columns when a
		// parent (e.g. core/column) constrains height. Tabs belong on one
		// vertical track; disable wrapping.
		style.flexWrap = 'nowrap';
	}

	setStyleVar( style, 'gap', resolveWpValue( attributes.style?.spacing?.blockGap ) );
	setStyleVar( style, '--rt-tab-active-bg', activeTabBackgroundColor );
	setStyleVar( style, '--rt-tab-active-color', activeTabTextColor );
	setStyleVar( style, '--rt-tab-inactive-bg', inactiveTabBackgroundColor );
	setStyleVar( style, '--rt-tab-inactive-color', inactiveTabTextColor );
	setStyleVar( style, '--rt-tab-border-color', resolveWpValue( attributes.style?.border?.color ) );
	setStyleVar( style, '--rt-tab-border-width', attributes.style?.border?.width );
	setStyleVar( style, '--rt-tab-border-style', attributes.style?.border?.style );
	setStyleVar( style, '--rt-tab-border-radius', resolveWpValue( attributes.style?.border?.radius ) );

	const blockProps = useBlockProps( { style } );

	const setLabelAt = ( index: number, value: string ) => {
		const next = [ ...labels ];
		while ( next.length <= index ) {
			next.push( '' );
		}
		next[ index ] = value;
		setAttributes( { labels: next } );
	};

	return (
		<>
			<InspectorControls group="styles">
				<PanelBody title={ __( 'Active Tab', 'rt-carousel' ) } initialOpen={ true }>
					<BaseControl
						__nextHasNoMarginBottom
						id="rt-tab-active-bg"
						label={ __( 'Background', 'rt-carousel' ) }
					>
						<ColorPalette
							value={ activeTabBackgroundColor }
							onChange={ ( color ) =>
								setAttributes( { activeTabBackgroundColor: color ?? '' } )
							}
						/>
					</BaseControl>
					<BaseControl
						__nextHasNoMarginBottom
						id="rt-tab-active-text"
						label={ __( 'Text', 'rt-carousel' ) }
					>
						<ColorPalette
							value={ activeTabTextColor }
							onChange={ ( color ) =>
								setAttributes( { activeTabTextColor: color ?? '' } )
							}
						/>
					</BaseControl>
				</PanelBody>
				<PanelBody title={ __( 'Inactive Tab', 'rt-carousel' ) } initialOpen={ false }>
					<BaseControl
						__nextHasNoMarginBottom
						id="rt-tab-inactive-bg"
						label={ __( 'Background', 'rt-carousel' ) }
					>
						<ColorPalette
							value={ inactiveTabBackgroundColor }
							onChange={ ( color ) =>
								setAttributes( { inactiveTabBackgroundColor: color ?? '' } )
							}
						/>
					</BaseControl>
					<BaseControl
						__nextHasNoMarginBottom
						id="rt-tab-inactive-text"
						label={ __( 'Text', 'rt-carousel' ) }
					>
						<ColorPalette
							value={ inactiveTabTextColor }
							onChange={ ( color ) =>
								setAttributes( { inactiveTabTextColor: color ?? '' } )
							}
						/>
					</BaseControl>
				</PanelBody>
			</InspectorControls>
			<div { ...blockProps } role="tablist" aria-label={ __( 'Carousel tabs', 'rt-carousel' ) }>
				{ Array.from( { length: dotCount } ).map( ( _, index ) => {
					const label = labels[ index ] ?? '';
					return (
						<RichText
							key={ `tab-${ index }` }
							tagName="span"
							role="tab"
							aria-selected={ index === carousel.selectedIndex }
							tabIndex={ index === carousel.selectedIndex ? 0 : -1 }
							className={ `wp-block-rt-carousel-carousel-tab-list__tab${ index === carousel.selectedIndex ? ' is-active' : '' }` }
							value={ label }
							onChange={ ( value ) => setLabelAt( index, value ) }
							/* translators: %d: tab number */
							placeholder={ sprintf( __( 'Tab %d', 'rt-carousel' ), index + 1 ) }
							allowedFormats={ [] }
							onFocus={ () => {
								carousel.setSelectedIndex( index );
							} }
						/>
					);
				} ) }
			</div>
		</>
	);
}
