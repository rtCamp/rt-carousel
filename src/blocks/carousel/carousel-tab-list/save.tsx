import { useBlockProps } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';
import type { TabListAttributes } from './types';
import { resolveWpValue } from './utils';
import { encodeContext } from '../encode-context';

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

export default function Save( { attributes }: { attributes: TabListAttributes } ) {
	const {
		labels,
		activeTabBackgroundColor,
		activeTabTextColor,
		inactiveTabBackgroundColor,
		inactiveTabTextColor,
	} = attributes;

	const style: React.CSSProperties = {};

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

	const contextJson = JSON.stringify( { dotLabels: labels ?? [] } );
	const blockProps = useBlockProps.save( {
		role: 'tablist',
		'aria-label': __( 'Carousel tabs', 'rt-carousel' ),
		style,
		'data-wp-interactive': 'rt-carousel/carousel',
		'data-wp-context': encodeContext( contextJson ),
	} );

	return (
		<div { ...blockProps }>
			<template data-wp-each--snap="context.scrollSnaps">
				<button
					className="wp-block-rt-carousel-carousel-tab-list__tab"
					type="button"
					role="tab"
					data-wp-class--is-active="callbacks.isDotActive"
					data-wp-bind--aria-selected="callbacks.isDotActive"
					data-wp-bind--tabindex="callbacks.getTabTabIndex"
					data-wp-bind--aria-controls="callbacks.getTabAriaControls"
					data-wp-bind--id="callbacks.getTabId"
					data-wp-on--click="actions.onDotClick"
					data-wp-on--keydown="actions.onTabKeydown"
				>
					<span data-wp-text="callbacks.getKeyFeatureDotText" />
				</button>
			</template>
		</div>
	);
}
