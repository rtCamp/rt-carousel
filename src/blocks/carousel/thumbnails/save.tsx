import { useBlockProps } from '@wordpress/block-editor';

export default function Save() {
	const blockProps = useBlockProps.save( {
		className: 'rt-carousel-thumbnails',
		'data-wp-interactive': 'rt-carousel/carousel',
		'data-wp-init': 'callbacks.initThumbnails',
	} );

	return (
		<div { ...blockProps }>
			<div className="rt-carousel-thumbnails__viewport">
				<div className="rt-carousel-thumbnails__container" />
			</div>
		</div>
	);
}
