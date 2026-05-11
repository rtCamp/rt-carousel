import { useBlockProps } from '@wordpress/block-editor';

export default function Save() {
	return (
		<div
			{ ...useBlockProps.save( {
				className: 'rt-carousel-counter',
			} ) }
			role="group"
			data-wp-interactive="rt-carousel/carousel"
			data-wp-bind--aria-label="callbacks.getCountLabel"
		>
			<span
				className="rt-carousel-counter__current"
				data-wp-text="callbacks.getCurrentCount"
			/>
			<span className="rt-carousel-counter__separator" aria-hidden="true">
				/
			</span>
			<span
				className="rt-carousel-counter__total"
				data-wp-text="callbacks.getTotalCount"
			/>
		</div>
	);
}
