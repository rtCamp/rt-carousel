<?php
/**
 * Unit tests for the handpicked posts server filters.
 *
 * @package Rt_Carousel\Tests\Unit
 */

declare(strict_types=1);

namespace Rt_Carousel\Tests\Unit;

use PHPUnit\Framework\Attributes\DataProvider;
use Rt_Carousel\Plugin;
use WP_Block;

/**
 * Tests for Plugin::filter_handpicked_block_data() and Plugin::filter_handpicked_query_vars().
 */
class HandpickedPostsTest extends UnitTestCase {

	/**
	 * Get a Plugin instance without running the constructor.
	 *
	 * @return Plugin
	 */
	private function plugin(): Plugin {
		return ( new \ReflectionClass( Plugin::class ) )->newInstanceWithoutConstructor();
	}

	/**
	 * Build a parsed core/query block.
	 *
	 * @param array<string, mixed> $attrs Block attributes.
	 *
	 * @return array<string, mixed>
	 */
	private static function query_block( array $attrs ): array {
		return [
			'blockName'    => 'core/query',
			'attrs'        => $attrs,
			'innerBlocks'  => [],
			'innerHTML'    => '',
			'innerContent' => [],
		];
	}

	/**
	 * Build handpicked Query attributes.
	 *
	 * @param array<mixed>         $ids   Picked IDs.
	 * @param array<string, mixed> $query Query overrides.
	 *
	 * @return array<string, mixed>
	 */
	private function handpicked_attrs( array $ids, array $query = [] ): array {
		return [
			'query'    => array_merge(
				[
					'perPage'  => 2,
					'postType' => 'post',
					'inherit'  => true,
					'search'   => 'foo',
					'author'   => '3',
					'offset'   => 4,
					'sticky'   => 'exclude',
					'exclude'  => [ 7 ],
					'taxQuery' => [ 'category' => [ 5 ] ],
				],
				$query
			),
			'metadata' => [
				'name'       => 'Keep me',
				'rtCarousel' => [
					'mode'     => 'handpicked',
					'ids'      => $ids,
					'postType' => 'post',
				],
			],
		];
	}

	/**
	 * Run the filters like WordPress would for a Query's Post Template and return the final query vars.
	 *
	 * @param array<string, mixed> $block Parsed Query block.
	 *
	 * @return array<string, mixed>
	 */
	private function final_query_vars( array $block ): array {
		$plugin = $this->plugin();
		$plugin->filter_handpicked_block_data( $block );

		// Core builds the Query's provided context from its saved attributes.
		$context = $plugin->filter_handpicked_block_context( [ 'query' => $block['attrs']['query'] ?? [] ] );
		$plugin->pop_handpicked_query( '' );

		return $plugin->filter_handpicked_query_vars(
			[
				'post_type'      => 'post',
				'posts_per_page' => 2,
				's'              => 'foo',
				'author'         => '3',
				'offset'         => 4,
				'post__not_in'   => [ 7 ],
				'tax_query'      => [ [ 'taxonomy' => 'category' ] ],
				'post_status'    => 'private',
			],
			new WP_Block( [], $context ),
			1
		);
	}

	/**
	 * Hooks are registered with the verified argument count.
	 *
	 * @return void
	 */
	public function test_hooks_registered(): void {
		\Brain\Monkey\Functions\when( 'is_multisite' )->justReturn( false );
		$plugin = $this->plugin();
		$method = new \ReflectionMethod( Plugin::class, 'setup_hooks' );
		$method->invoke( $plugin );

		$this->assertNotFalse( has_filter( 'render_block_data', [ $plugin, 'filter_handpicked_block_data' ] ) );
		$this->assertNotFalse( has_filter( 'render_block_core/query', [ $plugin, 'pop_handpicked_query' ] ) );
		$this->assertNotFalse( has_filter( 'render_block_context', [ $plugin, 'filter_handpicked_block_context' ] ) );
		$this->assertNotFalse( has_filter( 'query_loop_block_query_vars', [ $plugin, 'filter_handpicked_query_vars' ] ) );
	}

	/**
	 * Parsed blocks are never modified, and contexts outside a handpicked Query are untouched.
	 *
	 * @param array<string, mixed> $block Parsed block.
	 *
	 * @return void
	 */
	#[DataProvider( 'untouched_blocks' )]
	public function test_untouched_blocks( array $block ): void {
		$plugin  = $this->plugin();
		$context = [ 'query' => [ 'inherit' => true ] ];

		$this->assertSame( $block, $plugin->filter_handpicked_block_data( $block ) );
		$this->assertSame( $context, $plugin->filter_handpicked_block_context( $context ) );
		$plugin->pop_handpicked_query( '' );
	}

	/**
	 * Data provider for untouched blocks.
	 *
	 * @return array<string, array<int, array<string, mixed>>>
	 */
	public static function untouched_blocks(): array {
		return [
			'query without metadata'   => [ self::query_block( [ 'query' => [ 'inherit' => true ] ] ) ],
			'query latest mode'        => [
				self::query_block(
					[
						'query'    => [ 'perPage' => 3 ],
						'metadata' => [
							'rtCarousel' => [
								'mode' => 'latest',
								'ids'  => [ 1, 2 ],
							],
						],
					]
				),
			],
			'query other metadata'     => [ self::query_block( [ 'metadata' => [ 'name' => 'x' ] ] ) ],
			'malformed rtCarousel'     => [ self::query_block( [ 'metadata' => [ 'rtCarousel' => 'handpicked' ] ] ) ],
			'non-query block'          => [
				[
					'blockName' => 'core/group',
					'attrs'     => [ 'metadata' => [ 'rtCarousel' => [ 'mode' => 'handpicked' ] ] ],
				],
			],
			'freeform block (no name)' => [
				[
					'blockName' => null,
					'attrs'     => [],
				],
			],
		];
	}

	/**
	 * Query vars of unmarked queries are returned untouched.
	 *
	 * @return void
	 */
	public function test_query_vars_untouched_without_marker(): void {
		$vars  = [
			'post_type' => 'post',
			'orderby'   => 'date',
		];
		$block = new WP_Block( [], [ 'query' => [ 'perPage' => 3 ] ] );

		$this->assertSame( $vars, $this->plugin()->filter_handpicked_query_vars( $vars, $block, 1 ) );
		$this->assertSame( $vars, $this->plugin()->filter_handpicked_query_vars( $vars, new WP_Block(), 1 ) );
	}

	/**
	 * Handpicked Queries force a non-inherited context; saved content is untouched.
	 *
	 * @return void
	 */
	public function test_context_disables_inherit_and_content_is_untouched(): void {
		$plugin = $this->plugin();
		$block  = self::query_block( $this->handpicked_attrs( [ 5, 3 ] ) );

		$this->assertSame( $block, $plugin->filter_handpicked_block_data( $block ) );

		$context = $plugin->filter_handpicked_block_context( [ 'query' => [ 'inherit' => true ] ] );
		$this->assertFalse( $context['query']['inherit'] );
		$this->assertSame( [ 5, 3 ], $context['query']['rtCarouselHandpickedIds'] );

		// Blocks without query context are left alone.
		$this->assertSame( [ 'postId' => 1 ], $plugin->filter_handpicked_block_context( [ 'postId' => 1 ] ) );
	}

	/**
	 * Picks apply only while their Query renders, and nested Queries are independent.
	 *
	 * @return void
	 */
	public function test_picks_are_scoped_to_their_query(): void {
		$plugin  = $this->plugin();
		$context = [ 'query' => [ 'inherit' => true ] ];

		$plugin->filter_handpicked_block_data( self::query_block( $this->handpicked_attrs( [ 5 ] ) ) );
		$plugin->filter_handpicked_block_data( self::query_block( [ 'query' => [ 'inherit' => true ] ] ) );
		$this->assertSame( $context, $plugin->filter_handpicked_block_context( $context ), 'Nested latest Query' );

		$plugin->pop_handpicked_query( '' );
		$this->assertSame( [ 5 ], $plugin->filter_handpicked_block_context( $context )['query']['rtCarouselHandpickedIds'] );

		$plugin->pop_handpicked_query( '' );
		$this->assertSame( $context, $plugin->filter_handpicked_block_context( $context ), 'After the Query' );
	}

	/**
	 * Picks yield an ordered, published-only, unconstrained query.
	 *
	 * @return void
	 */
	public function test_query_vars_exact_picks_in_order(): void {
		$vars = $this->final_query_vars( self::query_block( $this->handpicked_attrs( [ 9, 4, 7 ] ) ) );

		$this->assertSame( [ 9, 4, 7 ], $vars['post__in'] );
		$this->assertSame( 'post__in', $vars['orderby'] );
		$this->assertSame( 'post', $vars['post_type'] );
		$this->assertSame( 'publish', $vars['post_status'] );
		$this->assertSame( 3, $vars['posts_per_page'] );
		$this->assertTrue( $vars['ignore_sticky_posts'] );
		$this->assertTrue( $vars['no_found_rows'] );
		$this->assertSame( 0, $vars['offset'] );
		foreach ( [ 's', 'author', 'post__not_in', 'tax_query' ] as $dropped ) {
			$this->assertArrayNotHasKey( $dropped, $vars );
		}
	}

	/**
	 * Twenty picks are all shown despite a smaller perPage.
	 *
	 * @return void
	 */
	public function test_twenty_picks_ignore_per_page(): void {
		$ids  = range( 1, 20 );
		$vars = $this->final_query_vars( self::query_block( $this->handpicked_attrs( $ids, [ 'perPage' => 2 ] ) ) );

		$this->assertSame( $ids, $vars['post__in'] );
		$this->assertSame( 20, $vars['posts_per_page'] );
	}

	/**
	 * Stored lists beyond the cap are truncated.
	 *
	 * @return void
	 */
	public function test_longer_lists_truncated_to_twenty(): void {
		$vars = $this->final_query_vars( self::query_block( $this->handpicked_attrs( range( 1, 30 ) ) ) );

		$this->assertSame( range( 1, 20 ), $vars['post__in'] );
	}

	/**
	 * The selected post type is used.
	 *
	 * @return void
	 */
	public function test_page_post_type(): void {
		$vars = $this->final_query_vars( self::query_block( $this->handpicked_attrs( [ 2 ], [ 'postType' => 'page' ] ) ) );

		$this->assertSame( 'page', $vars['post_type'] );
		$this->assertSame( [ 2 ], $vars['post__in'] );
	}

	/**
	 * Missing post type defaults to post.
	 *
	 * @return void
	 */
	public function test_missing_post_type_defaults_to_post(): void {
		$attrs = $this->handpicked_attrs( [ 2 ] );
		unset( $attrs['query']['postType'] );

		$vars = $this->final_query_vars( self::query_block( $attrs ) );

		$this->assertSame( 'post', $vars['post_type'] );
	}

	/**
	 * Duplicates and malformed IDs are dropped, first occurrence order kept.
	 *
	 * @return void
	 */
	public function test_malformed_and_duplicate_ids(): void {
		$vars = $this->final_query_vars(
			self::query_block( $this->handpicked_attrs( [ 5, '5', '3', 0, -4, 'abc', null, 2.0, [ 1 ], 3, true, '7x' ] ) )
		);

		$this->assertSame( [ 5, 3, 2 ], $vars['post__in'] );
	}

	/**
	 * A non-array ids value is treated as empty.
	 *
	 * @return void
	 */
	public function test_non_array_ids_is_empty(): void {
		$attrs                                       = $this->handpicked_attrs( [] );
		$attrs['metadata']['rtCarousel']['ids']      = 'nope';
		$vars                                        = $this->final_query_vars( self::query_block( $attrs ) );

		$this->assertSame( [ 0 ], $vars['post__in'] );
	}

	/**
	 * Empty picks never broaden to all posts and still require published status.
	 *
	 * @return void
	 */
	public function test_empty_picks_match_nothing(): void {
		$vars = $this->final_query_vars( self::query_block( $this->handpicked_attrs( [] ) ) );

		$this->assertSame( [ 0 ], $vars['post__in'] );
		$this->assertSame( 'publish', $vars['post_status'] );
		$this->assertSame( 1, $vars['posts_per_page'] );
	}

	/**
	 * Stale IDs stay in the query; WP_Query drops them via published + type restrictions.
	 *
	 * @return void
	 */
	public function test_stale_ids_never_broaden_query(): void {
		$vars = $this->final_query_vars( self::query_block( $this->handpicked_attrs( [ 11, 999, 12 ] ) ) );

		$this->assertSame( [ 11, 999, 12 ], $vars['post__in'] );
		$this->assertSame( 'publish', $vars['post_status'] );
		$this->assertSame( 'post', $vars['post_type'] );
		$this->assertSame( 'post__in', $vars['orderby'] );
	}

	/**
	 * The Query's own post type wins over a divergent metadata post type, so picks made for
	 * another type match nothing instead of leaking posts of the old type.
	 *
	 * @return void
	 */
	public function test_query_post_type_wins_over_divergent_metadata(): void {
		$attrs                                  = $this->handpicked_attrs( [ 10, 11 ], [ 'postType' => 'page' ] );
		$attrs['metadata']['rtCarousel']['postType'] = 'post';

		$vars = $this->final_query_vars( self::query_block( $attrs ) );

		$this->assertSame( 'page', $vars['post_type'] );
		$this->assertSame( [ 10, 11 ], $vars['post__in'] );
	}

	/**
	 * Published-only holds for privileged viewers: incoming status and permission overrides
	 * are dropped and no capability check is consulted.
	 *
	 * @return void
	 */
	public function test_published_only_for_privileged_users(): void {
		\Brain\Monkey\Functions\expect( 'current_user_can' )->never();

		$plugin = $this->plugin();
		$plugin->filter_handpicked_block_data( self::query_block( $this->handpicked_attrs( [ 1 ] ) ) );
		$context = $plugin->filter_handpicked_block_context( [ 'query' => [] ] );

		$vars = $plugin->filter_handpicked_query_vars(
			[
				'post_status' => [ 'publish', 'private', 'draft' ],
				'perm'        => 'readable',
			],
			new WP_Block( [], $context ),
			1
		);

		$this->assertSame( 'publish', $vars['post_status'] );
		$this->assertArrayNotHasKey( 'perm', $vars );
	}
}
