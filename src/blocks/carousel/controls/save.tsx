import { useBlockProps } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';
import { NextIcon, PreviousIcon } from './components/icons';
import { getPositionClassName } from './get-position-class';
import type { CarouselControlsAttributes } from '../types';

export default function Save( {
	attributes,
}: {
	attributes: CarouselControlsAttributes;
} ) {
	const { position } = attributes;

	const blockProps = useBlockProps.save( {
		className: getPositionClassName( position ),
	} );

	return (
		<div { ...blockProps }>
			<button
				type="button"
				className="rt-carousel-controls__btn rt-carousel-controls__btn--prev"
				data-wp-on--click="actions.scrollPrev"
				data-wp-bind--disabled="!state.canScrollPrev"
				aria-label={ __( 'Previous Slide', 'rt-carousel' ) }
			>
				<PreviousIcon />
			</button>
			<button
				type="button"
				className="rt-carousel-controls__btn rt-carousel-controls__btn--next"
				data-wp-on--click="actions.scrollNext"
				data-wp-bind--disabled="!state.canScrollNext"
				aria-label={ __( 'Next Slide', 'rt-carousel' ) }
			>
				<NextIcon />
			</button>
		</div>
	);
}
