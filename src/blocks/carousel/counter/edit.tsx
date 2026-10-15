import { __, sprintf } from '@wordpress/i18n';
import { useBlockProps } from '@wordpress/block-editor';
import { useContext } from '@wordpress/element';
import { EditorCarouselContext } from '../editor-context';

export default function Edit() {
	const blockProps = useBlockProps( {
		className: 'rt-carousel-counter',
	} );

	const { selectedIndex, scrollSnaps, slideCount } =
		useContext( EditorCarouselContext );
	const total = Math.max( scrollSnaps.length || slideCount, 1 );
	const current = Math.min( Math.max( selectedIndex + 1, 1 ), total );
	const label = sprintf(
		/* translators: 1: current slide number, 2: total slide count. */
		__( 'Slide %1$d of %2$d', 'rt-carousel' ),
		current,
		total,
	);

	return (
		<div { ...blockProps } role="group" aria-label={ label }>
			<span className="rt-carousel-counter__current">{ current }</span>
			<span className="rt-carousel-counter__separator" aria-hidden="true">
				/
			</span>
			<span className="rt-carousel-counter__total">{ total }</span>
		</div>
	);
}
