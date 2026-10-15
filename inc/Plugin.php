<?php
/**
 * Plugin manifest class.
 *
 * @package Rt_Carousel
 */

declare(strict_types=1);

namespace Rt_Carousel;

use Rt_Carousel\Traits\Singleton;
use WP_Block;
use WP_HTML_Tag_Processor;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Plugin class.
 */
class Plugin {
	use Singleton;

	/**
	 * Plugin constructor.
	 */
	protected function __construct() {
		$this->setup_hooks();
	}

	/**
	 * Setup hooks.
	 *
	 * @return void
	 */
	protected function setup_hooks(): void {
		add_action( 'init', [ $this, 'register_blocks' ] );
		add_filter( 'block_categories_all', [ $this, 'register_block_category' ] );
		add_action( 'init', [ $this, 'register_pattern_category' ] );
		add_action( 'init', [ $this, 'register_block_patterns' ] );
		add_action( 'admin_notices', [ $this, 'legacy_plugin_notice' ] );
		add_action( 'network_admin_notices', [ $this, 'legacy_plugin_notice' ] );
		add_filter( 'render_block_rt-carousel/carousel', [ $this, 'handle_lazy_load_images' ], 16, 3 );
		add_filter( 'render_block_rt-carousel/carousel', [ $this, 'mark_query_loop_slides' ] );
	}

	/**
	 * Show an admin notice if the legacy "Carousel Kit" plugin is still active.
	 *
	 * Handles both single-site and network-wide activations.
	 */
	public function legacy_plugin_notice(): void {
		$old_plugin   = 'carousel-kit/carousel-kit.php';
		$network_wide = is_multisite() && is_plugin_active_for_network( $old_plugin );

		if ( ! is_plugin_active( $old_plugin ) ) {
			return;
		}

		if ( $network_wide && ! current_user_can( 'manage_network_plugins' ) ) {
			return;
		}

		if ( ! $network_wide && ! current_user_can( 'activate_plugins' ) ) {
			return;
		}

		// Only show the notice in the matching admin context.
		if ( is_network_admin() !== $network_wide ) {
			return;
		}

		if ( $network_wide ) {
			$deactivate_url = wp_nonce_url(
				add_query_arg(
					[
						'action'      => 'deactivate',
						'plugin'      => $old_plugin,
						'networkwide' => '1',
					],
					network_admin_url( 'plugins.php' )
				),
				'deactivate-plugin_' . $old_plugin
			);
		} else {
			$deactivate_url = wp_nonce_url(
				add_query_arg(
					[
						'action' => 'deactivate',
						'plugin' => $old_plugin,
					],
					admin_url( 'plugins.php' )
				),
				'deactivate-plugin_' . $old_plugin
			);
		}

		printf(
			'<div class="notice notice-warning is-dismissible"><p>%s <a href="%s">%s</a></p></div>',
			esc_html__( 'The "Carousel Kit" plugin is still active. rtCarousel is its replacement — please deactivate Carousel Kit.', 'rt-carousel' ),
			esc_url( $deactivate_url ),
			esc_html__( 'Deactivate Carousel Kit', 'rt-carousel' )
		);
	}

	/**
	 * Register block category.
	 *
	 * @param array $categories Block categories.
	 *
	 * @return array
	 */
	public function register_block_category( array $categories ): array {
		return array_merge(
			$categories,
			[
				[
					'slug'  => 'rt-carousel',
					'title' => __( 'rtCarousel', 'rt-carousel' ),
				],
			]
		);
	}

	/**
	 * Register blocks.
	 *
	 * @return void
	 */
	public function register_blocks(): void {
		$blocks = [
			'carousel',
			'carousel/carousel-tab-list',
			'carousel/controls',
			'carousel/counter',
			'carousel/dots',
			'carousel/progress',
			'carousel/viewport',
			'carousel/slide',
		];

		foreach ( $blocks as $block ) {
			// Ensure path constant is defined before use to avoid fatal errors.
			if ( ! defined( 'RT_CAROUSEL_BUILD_PATH' ) ) {
				continue;
			}

			register_block_type( RT_CAROUSEL_BUILD_PATH . '/blocks/' . $block );
		}
	}

	/**
	 * Register pattern category.
	 *
	 * @return void
	 */
	public function register_pattern_category(): void {
		register_block_pattern_category(
			'rt-carousel',
			[
				'label'       => __( 'rtCarousel', 'rt-carousel' ),
				'description' => __( 'Pre-configured carousel patterns for various use cases.', 'rt-carousel' ),
			]
		);
	}

	/**
	 * Register block patterns.
	 *
	 * Uses a transient to cache file reads to improve performance on 'init'.
	 * Cache is bypassed if WP_DEBUG is true.
	 *
	 * @return void
	 */
	public function register_block_patterns(): void {
		if ( ! defined( 'RT_CAROUSEL_PATH' ) ) {
			return;
		}

		// Use cached patterns if available and not in debug mode.
		$cache_key = 'rt_carousel_patterns_cache';
		$patterns  = get_transient( $cache_key );

		if ( ( defined( 'WP_DEBUG' ) && WP_DEBUG ) || false === $patterns ) {
			$patterns = $this->load_patterns_from_disk();
			set_transient( $cache_key, $patterns, DAY_IN_SECONDS );
		}

		if ( empty( $patterns ) ) {
			return;
		}

		foreach ( $patterns as $pattern ) {
			register_block_pattern( $pattern['slug'], $pattern['args'] );
		}
	}

	/**
	 * Load patterns from the filesystem.
	 *
	 * Separated from registration logic for cleaner code and testability.
	 *
	 * @return array
	 */
	private function load_patterns_from_disk(): array {
		$patterns_dir = RT_CAROUSEL_PATH . '/examples/patterns';
		$data         = [];

		if ( ! is_dir( $patterns_dir ) ) {
			return $data;
		}

		$pattern_files = glob( $patterns_dir . '/*.php' );

		if ( empty( $pattern_files ) ) {
			return $data;
		}

		foreach ( $pattern_files as $pattern_file ) {
			$file_headers = get_file_data(
				$pattern_file,
				[
					'title'       => 'Title',
					'slug'        => 'Slug',
					'description' => 'Description',
					'categories'  => 'Categories',
				]
			);

			// Skip if required data is missing.
			if ( empty( $file_headers['title'] ) || empty( $file_headers['slug'] ) ) {
				continue;
			}

			// Skip if pattern is already registered.
			if ( \WP_Block_Patterns_Registry::get_instance()->is_registered( $file_headers['slug'] ) ) {
				continue;
			}

			ob_start();
			include $pattern_file; // phpcs:ignore WordPressVIPMinimum.Files.IncludingFile.UsingVariable -- $pattern_file is sourced from glob() in a fixed plugin directory (examples/patterns/*.php).
			$content = ob_get_clean();

			if ( false === $content || '' === trim( $content ) ) {
				continue;
			}

			// Parse categories.
			$categories = ! empty( $file_headers['categories'] )
			? array_filter( array_map( 'trim', explode( ',', $file_headers['categories'] ) ) )
			: [ 'rt-carousel' ];

			$data[] = [
				'slug' => $file_headers['slug'],
				'args' => [
					'title'       => $file_headers['title'],
					'description' => $file_headers['description'],
					'content'     => $content,
					'categories'  => $categories,
				],
			];
		}

		return $data;
	}

	/**
	 * Add loading="lazy" to images in carousel slides.
	 *
	 * @param string         $block_content The block content.
	 * @param array          $parsed_block  The parsed block.
	 * @param \WP_Block|null $instance      The block instance.
	 *
	 * @return string Modified block content.
	 */
	public function handle_lazy_load_images( string $block_content, array $parsed_block, ?WP_Block $instance ): string {
		// $instance was added in WP 5.9.0, if it's not available, return the block content unmodified.
		if ( ! $instance ) {
			return $block_content;
		}

		// Bail early if the lazyLoadImages setting is not set.
		if ( ! isset( $instance->attributes['lazyLoadImages'] ) ) {
			return $block_content;
		}

		$lazy_load = (bool) $instance->attributes['lazyLoadImages'];

		// If lazy loading is disabled, return as-is.
		if ( ! $lazy_load ) {
			return $block_content;
		}

		// Use WP_HTML_Tag_Processor to add loading="lazy" to <img> tags.
		$processor   = new WP_HTML_Tag_Processor( $block_content );
		$slide_index = 0;

		while ( $processor->next_tag() ) {
			$tag = $processor->get_tag();

			// Keep a track of the slide index to determine if an image is in the first slide or subsequent slides.
			if ( 'DIV' === $tag && $processor->has_class( 'embla__slide' ) ) {
				++$slide_index;
			}

			if ( 'IMG' !== $tag || null !== $processor->get_attribute( 'loading' ) ) {
				continue;
			}

			// The first slide's image loads eager (LCP); subsequent slides load lazy.
			if ( 1 === $slide_index ) {
				$processor->set_attribute( 'loading', 'eager' );
				$processor->set_attribute( 'fetchpriority', 'high' );
				continue;
			}

			$processor->set_attribute( 'loading', 'lazy' );
		}

		return $processor->get_updated_html();
	}

	/**
	 * Add the active-slide directives to Query Loop and Terms Query slides.
	 *
	 * The Slide block ships these directives in its saved markup; query and term loop items carry
	 * none, so the runtime never marks them. See: https://github.com/rtCamp/rt-carousel/issues/179
	 *
	 * @param string $block_content The carousel's rendered HTML.
	 *
	 * @return string The filtered HTML.
	 */
	public function mark_query_loop_slides( string $block_content ): string {
		if ( ! str_contains( $block_content, 'wp-block-post-template' ) && ! str_contains( $block_content, 'wp-block-term-template' ) ) {
			return $block_content;
		}

		// WordPress 6.6, the plugin's floor, always has the HTML Processor; the unit harness stubs only the Tag Processor.
		$processor = class_exists( \WP_HTML_Processor::class )
			? \WP_HTML_Processor::create_fragment( $block_content )
			: new WP_HTML_Tag_Processor( $block_content );

		if ( null === $processor ) {
			return $block_content;
		}

		while ( $processor->next_tag() ) {
			if ( 'LI' !== $processor->get_tag() ) {
				continue;
			}

			if ( ! $processor->has_class( 'wp-block-post' ) && ! $processor->has_class( 'wp-block-term' ) ) {
				continue;
			}

			if (
				null !== $processor->get_attribute( 'data-wp-interactive' )
				|| null !== $processor->get_attribute( 'data-wp-class--is-active' )
				|| null !== $processor->get_attribute( 'data-wp-bind--aria-current' )
			) {
				continue;
			}

			// Depth one is the carousel's own track; a loop nested inside a slide keeps its items untouched.
			if (
				$processor instanceof \WP_HTML_Processor
				&& 1 !== count( array_keys( $processor->get_breadcrumbs(), 'LI', true ) )
			) {
				continue;
			}

			$processor->set_attribute( 'data-wp-interactive', 'rt-carousel/carousel' );
			$processor->set_attribute( 'data-wp-class--is-active', 'callbacks.isSlideActive' );
			$processor->set_attribute( 'data-wp-bind--aria-current', 'callbacks.isSlideActive' );
		}

		return $processor->get_updated_html();
	}
}
