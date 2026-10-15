/**
 * TemplatePicker — grid of slide template options shown during block setup.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import { Button, Icon } from '@wordpress/components';
import { useRef, useEffect } from '@wordpress/element';
import type { SlideTemplate } from '../templates';

interface TemplatePickerProps {
	templates: SlideTemplate[];
	onSelect: ( template: SlideTemplate ) => void;
	onBack: () => void;
}

export default function TemplatePicker( {
	templates,
	onSelect,
	onBack,
}: TemplatePickerProps ) {
	const gridRef = useRef< HTMLDivElement >( null );

	useEffect( () => {
		const firstButton = gridRef.current?.querySelector< HTMLButtonElement >( 'button' );
		firstButton?.focus();
	}, [] );

	return (
		<div className="rt-carousel-template-picker">
			<div ref={ gridRef } className="rt-carousel-template-picker__grid">
				{ templates.map( ( template ) => (
					<button
						key={ template.name }
						type="button"
						className="rt-carousel-template-picker__item"
						onClick={ () => onSelect( template ) }
					>
						<div className="rt-carousel-template-picker__icon">
							<Icon icon={ template.icon } size={ 28 } />
						</div>
						<div className="rt-carousel-template-picker__label">
							{ template.label }
						</div>
						<div className="rt-carousel-template-picker__description">
							{ template.description }
						</div>
					</button>
				) ) }
			</div>
			<Button
				variant="link"
				className="rt-carousel-template-picker__back"
				onClick={ onBack }
			>
				{ __( 'Back', 'rt-carousel' ) }
			</Button>
		</div>
	);
}
