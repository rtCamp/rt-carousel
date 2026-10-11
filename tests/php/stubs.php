<?php
/**
 * Minimal runtime stand-ins for WordPress core classes referenced by Plugin.php.
 *
 * Brain\Monkey mocks WordPress functions but not core classes, and this test
 * suite doesn't boot WordPress itself, so WP_Block and WP_HTML_Tag_Processor
 * don't exist at runtime. Each stub only implements the surface
 * Plugin::handle_lazy_load_images() actually calls.
 *
 * @package Rt_Carousel\Tests
 */

declare(strict_types=1);

if ( ! class_exists( 'WP_Block' ) ) {
	/**
	 * Stub for WP_Block.
	 */
	class WP_Block {
		/**
		 * @param array<string, mixed> $attributes Block attributes.
		 */
		public function __construct( public array $attributes = [] ) {}
	}
}

if ( ! class_exists( 'WP_HTML_Tag_Processor' ) ) {
	/**
	 * Stub for WP_HTML_Tag_Processor, backed by DOMDocument.
	 */
	class WP_HTML_Tag_Processor {
		/**
		 * @var array<int, \DOMElement>
		 */
		private array $elements;

		private \DOMDocument $dom;

		private int $cursor = -1;

		/**
		 * @param string $html The HTML markup to process.
		 */
		public function __construct( string $html ) {
			$this->dom = new \DOMDocument();

			libxml_use_internal_errors( true );
			$this->dom->loadHTML( '<div>' . $html . '</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD );
			libxml_clear_errors();

			$root           = $this->dom->documentElement;
			$this->elements = iterator_to_array( $root->getElementsByTagName( '*' ) );
		}

		/**
		 * Advance to the next tag.
		 *
		 * @return bool Whether another tag was found.
		 */
		public function next_tag(): bool {
			++$this->cursor;

			return isset( $this->elements[ $this->cursor ] );
		}

		/**
		 * @return string|null The current tag name, uppercased.
		 */
		public function get_tag(): ?string {
			return isset( $this->elements[ $this->cursor ] ) ? strtoupper( $this->elements[ $this->cursor ]->tagName ) : null;
		}

		/**
		 * @param string $class Class name to check for.
		 *
		 * @return bool Whether the current tag has the given class.
		 */
		public function has_class( string $class ): bool {
			$classes = preg_split( '/\s+/', trim( $this->elements[ $this->cursor ]->getAttribute( 'class' ) ) );

			return in_array( $class, $classes, true );
		}

		/**
		 * @param string $name Attribute name.
		 *
		 * @return string|null The attribute value, or null if unset.
		 */
		public function get_attribute( string $name ): ?string {
			$element = $this->elements[ $this->cursor ];

			return $element->hasAttribute( $name ) ? $element->getAttribute( $name ) : null;
		}

		/**
		 * @param string $name  Attribute name.
		 * @param string $value Attribute value.
		 *
		 * @return bool Always true.
		 */
		public function set_attribute( string $name, string $value ): bool {
			$this->elements[ $this->cursor ]->setAttribute( $name, $value );

			return true;
		}

		/**
		 * @param string $name Attribute name.
		 *
		 * @return bool Whether the attribute was present.
		 */
		public function remove_attribute( string $name ): bool {
			$element = $this->elements[ $this->cursor ];

			if ( ! $element->hasAttribute( $name ) ) {
				return false;
			}

			$element->removeAttribute( $name );

			return true;
		}

		/**
		 * @return string The updated HTML.
		 */
		public function get_updated_html(): string {
			$html = '';

			foreach ( iterator_to_array( $this->dom->documentElement->childNodes ) as $child ) {
				$html .= $this->dom->saveHTML( $child );
			}

			return $html;
		}

		/**
		 * The element the cursor is on, for subclasses that need the DOM node.
		 *
		 * @return \DOMElement|null
		 */
		protected function current_element(): ?\DOMElement {
			return $this->elements[ $this->cursor ] ?? null;
		}
	}
}

if ( ! class_exists( 'WP_HTML_Processor' ) ) {
	class WP_HTML_Processor extends WP_HTML_Tag_Processor {
		/**
		 * @param string $html The HTML fragment.
		 *
		 * @return self|null
		 */
		public static function create_fragment( string $html ): ?self {
			return new self( $html );
		}

		/**
		 * Real WP reports 'unsupported' here when it abandons a walk; DOMDocument never does.
		 *
		 * @return string|null
		 */
		public function get_last_error(): ?string {
			return null;
		}

		/**
		 * Ancestor tag names, outermost first, ending with the current tag.
		 *
		 * @return array<int, string>
		 */
		public function get_breadcrumbs(): array {
			$element = $this->current_element();

			if ( null === $element ) {
				return [];
			}

			$crumbs = [];

			for ( $node = $element; $node instanceof \DOMElement; $node = $node->parentNode ) {
				array_unshift( $crumbs, strtoupper( $node->tagName ) );
			}

			return $crumbs;
		}
	}
}
