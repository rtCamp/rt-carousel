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

	/**
	 * Build fill-aware handpicked attributes.
	 *
	 * @param array<mixed>         $ids   Picked IDs.
	 * @param array<string, mixed> $meta  Extra rtCarousel metadata (fillWithLatest, numberOfPosts).
	 * @param array<string, mixed> $query Query overrides.
	 *
	 * @return array<string, mixed>
	 */
	private function fill_attrs( array $ids, array $meta = [ 'fillWithLatest' => true ], array $query = [] ): array {
		$attrs                           = $this->handpicked_attrs( $ids, $query );
		$attrs['metadata']['rtCarousel'] = array_merge( $attrs['metadata']['rtCarousel'], $meta );

		return $attrs;
	}

	/**
	 * Stub get_posts(): the first call resolves published picks, the second returns the fill.
	 *
	 * Records the arguments of every call into $calls.
	 *
	 * @param array<int, mixed>               $survivors IDs returned for the picks request.
	 * @param array<int, mixed>               $fill      IDs returned for the fill request.
	 * @param array<int, array<string,mixed>> $calls     Recorded get_posts() arguments.
	 *
	 * @return void
	 */
	private function stub_get_posts( array $survivors, array $fill, array &$calls ): void {
		\Brain\Monkey\Functions\when( 'get_posts' )->alias(
			function ( array $args ) use ( $survivors, $fill, &$calls ) {
				$calls[] = $args;

				return isset( $args['post__in'] ) ? $survivors : $fill;
			}
		);
	}

	/**
	 * Fill off never queries posts, even when a count is stored.
	 *
	 * @return void
	 */
	public function test_fill_off_keeps_exact_picks_and_skips_get_posts(): void {
		\Brain\Monkey\Functions\expect( 'get_posts' )->never();

		foreach ( [ [], [ 'fillWithLatest' => false, 'numberOfPosts' => 3 ], [ 'fillWithLatest' => 'true' ], [ 'numberOfPosts' => 3 ] ] as $meta ) {
			$vars = $this->final_query_vars( self::query_block( $this->fill_attrs( [ 9, 4 ], $meta ) ) );

			$this->assertSame( [ 9, 4 ], $vars['post__in'] );
			$this->assertSame( 2, $vars['posts_per_page'] );
		}
	}

	/**
	 * Fill settings are ignored outside handpicked mode.
	 *
	 * @return void
	 */
	public function test_latest_mode_ignores_fill_metadata(): void {
		\Brain\Monkey\Functions\expect( 'get_posts' )->never();

		$attrs                                 = $this->fill_attrs( [ 1 ], [ 'fillWithLatest' => true, 'numberOfPosts' => 5 ] );
		$attrs['metadata']['rtCarousel']['mode'] = 'latest';
		$block                                 = self::query_block( $attrs );
		$plugin                                = $this->plugin();
		$context                               = [ 'query' => [ 'inherit' => true ] ];

		$this->assertSame( $block, $plugin->filter_handpicked_block_data( $block ) );
		$this->assertSame( $context, $plugin->filter_handpicked_block_context( $context ) );
	}

	/**
	 * Default count is 6: picks first in order, then the newest posts excluding all picks.
	 *
	 * @return void
	 */
	public function test_fill_default_count_picks_then_latest(): void {
		$calls = [];
		$this->stub_get_posts( [ 4, 9 ], [ 50, 49, 48, 47 ], $calls );

		$vars = $this->final_query_vars( self::query_block( $this->fill_attrs( [ 9, 4 ] ) ) );

		$this->assertSame( [ 4, 9, 50, 49, 48, 47 ], $vars['post__in'], 'Published picks keep stored order from get_posts' );
		$this->assertSame( 'post__in', $vars['orderby'] );
		$this->assertSame( 6, $vars['posts_per_page'] );
		$this->assertSame( 'publish', $vars['post_status'] );
		$this->assertTrue( $vars['ignore_sticky_posts'] );
		$this->assertTrue( $vars['no_found_rows'] );
		$this->assertSame( 0, $vars['offset'] );

		$this->assertCount( 2, $calls );
		$this->assertSame(
			[
				'post_type'           => 'post',
				'post_status'         => 'publish',
				'post__in'            => [ 9, 4 ],
				'orderby'             => 'post__in',
				'posts_per_page'      => 2,
				'fields'              => 'ids',
				'ignore_sticky_posts' => true,
				'suppress_filters'    => true,
			],
			$calls[0]
		);
		$this->assertSame(
			[
				'post_type'           => 'post',
				'post_status'         => 'publish',
				'post__not_in'        => [ 9, 4 ],
				'posts_per_page'      => 4,
				'orderby'             => 'date',
				'order'               => 'DESC',
				'fields'              => 'ids',
				'ignore_sticky_posts' => true,
				'suppress_filters'    => true,
			],
			$calls[1]
		);
	}

	/**
	 * Fill ignores the Query's other settings and sticky priority.
	 *
	 * @return void
	 */
	public function test_fill_ignores_other_query_settings(): void {
		$calls = [];
		$this->stub_get_posts( [], [ 7, 6 ], $calls );

		$vars = $this->final_query_vars( self::query_block( $this->fill_attrs( [], [ 'fillWithLatest' => true, 'numberOfPosts' => 2 ] ) ) );

		$this->assertSame( [ 7, 6 ], $vars['post__in'] );
		foreach ( [ 's', 'author', 'post__not_in', 'tax_query' ] as $dropped ) {
			$this->assertArrayNotHasKey( $dropped, $vars );
		}
		foreach ( [ 's', 'author', 'tax_query', 'category__in', 'post__in' ] as $dropped ) {
			$this->assertArrayNotHasKey( $dropped, $calls[0] );
		}
		$this->assertSame( [], $calls[0]['post__not_in'], 'The Query exclude [7] does not apply; only picks are excluded' );
		$this->assertTrue( $calls[0]['ignore_sticky_posts'] );
		$this->assertArrayNotHasKey( 'offset', $calls[0] );
		$this->assertArrayNotHasKey( 'perm', $calls[0] );
	}

	/**
	 * Counts clamp to 1-20, malformed values default to 6.
	 *
	 * @param mixed $stored   Stored numberOfPosts.
	 * @param int   $expected Count requested from the server.
	 *
	 * @return void
	 */
	#[DataProvider( 'counts' )]
	public function test_fill_count_normalization( mixed $stored, int $expected ): void {
		$calls = [];
		$this->stub_get_posts( [], range( 100, 140 ), $calls );

		$vars = $this->final_query_vars( self::query_block( $this->fill_attrs( [], [ 'fillWithLatest' => true, 'numberOfPosts' => $stored ] ) ) );

		$this->assertSame( $expected, $calls[0]['posts_per_page'] );
		$this->assertCount( $expected, $vars['post__in'] );
		$this->assertSame( $expected, $vars['posts_per_page'] );
	}

	/**
	 * Data provider for counts.
	 *
	 * @return array<string, array{0: mixed, 1: int}>
	 */
	public static function counts(): array {
		return [
			'one'                => [ 1, 1 ],
			'three'              => [ 3, 3 ],
			'twenty'             => [ 20, 20 ],
			'zero clamps up'     => [ 0, 1 ],
			'negative clamps up' => [ -5, 1 ],
			'21 clamps down'     => [ 21, 20 ],
			'huge clamps down'   => [ 1000000, 20 ],
			'integer float'      => [ 4.0, 4 ],
			'huge float'         => [ 1.0e30, 20 ],
			'fractional'         => [ 2.5, 6 ],
			'numeric string'     => [ '4', 6 ],
			'text'               => [ 'abc', 6 ],
			'bool'               => [ true, 6 ],
			'null'               => [ null, 6 ],
			'array'              => [ [ 3 ], 6 ],
			'infinite'           => [ INF, 6 ],
			'not a number'       => [ NAN, 6 ],
		];
	}

	/**
	 * More valid picks than the count: first picks only, no fill request.
	 *
	 * @return void
	 */
	public function test_fill_truncates_extra_picks_without_fill_request(): void {
		$calls = [];
		$this->stub_get_posts( [ 1, 2, 3, 4, 5 ], [ 99 ], $calls );

		$vars = $this->final_query_vars( self::query_block( $this->fill_attrs( [ 1, 2, 3, 4, 5 ], [ 'fillWithLatest' => true, 'numberOfPosts' => 3 ] ) ) );

		$this->assertSame( [ 1, 2, 3 ], $vars['post__in'] );
		$this->assertCount( 1, $calls );
		$this->assertSame( 3, $vars['posts_per_page'] );
	}

	/**
	 * Exactly the count of valid picks: no fill request either.
	 *
	 * @return void
	 */
	public function test_fill_skips_fill_request_when_full(): void {
		$calls = [];
		$this->stub_get_posts( [ 1, 2 ], [ 99 ], $calls );

		$vars = $this->final_query_vars( self::query_block( $this->fill_attrs( [ 1, 2 ], [ 'fillWithLatest' => true, 'numberOfPosts' => 2 ] ) ) );

		$this->assertSame( [ 1, 2 ], $vars['post__in'] );
		$this->assertCount( 1, $calls );
	}

	/**
	 * Unavailable picks consume no slots and are excluded from the fill.
	 *
	 * @return void
	 */
	public function test_fill_replaces_unavailable_picks(): void {
		$calls = [];
		// 2 is draft, 999 deleted: only 1 and 3 survive.
		$this->stub_get_posts( [ 1, 3 ], [ 20, 19 ], $calls );

		$vars = $this->final_query_vars( self::query_block( $this->fill_attrs( [ 1, 2, 3, 999 ], [ 'fillWithLatest' => true, 'numberOfPosts' => 4 ] ) ) );

		$this->assertSame( [ 1, 3, 20, 19 ], $vars['post__in'] );
		$this->assertSame( [ 1, 2, 3, 999 ], $calls[1]['post__not_in'], 'Fill excludes every stored pick, including unavailable ones' );
		$this->assertSame( 2, $calls[1]['posts_per_page'] );
	}

	/**
	 * No picks: only the fill request is made, for the whole count.
	 *
	 * @return void
	 */
	public function test_fill_with_no_picks_shows_latest(): void {
		$calls = [];
		$this->stub_get_posts( [ 8, 8 ], [ 30, 29, 28 ], $calls );

		$vars = $this->final_query_vars( self::query_block( $this->fill_attrs( [], [ 'fillWithLatest' => true, 'numberOfPosts' => 3 ] ) ) );

		$this->assertCount( 1, $calls, 'No request for picks when there are none' );
		$this->assertSame( [], $calls[0]['post__not_in'] );
		$this->assertSame( 3, $calls[0]['posts_per_page'] );
		$this->assertSame( [ 30, 29, 28 ], $vars['post__in'] );
	}

	/**
	 * Fewer published posts than the count: only what exists, no gaps.
	 *
	 * @return void
	 */
	public function test_fill_with_too_few_posts_returns_available_only(): void {
		$calls = [];
		$this->stub_get_posts( [ 5 ], [ 4 ], $calls );

		$vars = $this->final_query_vars( self::query_block( $this->fill_attrs( [ 5 ], [ 'fillWithLatest' => true, 'numberOfPosts' => 10 ] ) ) );

		$this->assertSame( [ 5, 4 ], $vars['post__in'] );
		$this->assertSame( 2, $vars['posts_per_page'] );
	}

	/**
	 * Nothing published at all: matches nothing, never everything.
	 *
	 * @return void
	 */
	public function test_fill_with_nothing_available_matches_nothing(): void {
		$calls = [];
		$this->stub_get_posts( [], [], $calls );

		$vars = $this->final_query_vars( self::query_block( $this->fill_attrs( [ 5 ] ) ) );

		$this->assertSame( [ 0 ], $vars['post__in'] );
		$this->assertSame( 1, $vars['posts_per_page'] );
		$this->assertSame( 'publish', $vars['post_status'] );
	}

	/**
	 * The selected post type applies to both requests and the final query.
	 *
	 * @return void
	 */
	public function test_fill_uses_selected_post_type(): void {
		$calls = [];
		$this->stub_get_posts( [ 2 ], [ 3 ], $calls );

		$vars = $this->final_query_vars( self::query_block( $this->fill_attrs( [ 2 ], [ 'fillWithLatest' => true, 'numberOfPosts' => 2 ], [ 'postType' => 'page' ] ) ) );

		$this->assertSame( 'page', $calls[0]['post_type'] );
		$this->assertSame( 'page', $calls[1]['post_type'] );
		$this->assertSame( 'page', $vars['post_type'] );
	}

	/**
	 * A post is never repeated, and malformed results are normalized.
	 *
	 * @return void
	 */
	public function test_fill_never_repeats_a_post(): void {
		$calls = [];
		// The fill result repeats pick 1 and contains junk; both must be dropped.
		$this->stub_get_posts( [ '1', 2 ], [ 1, '3', 0, 'x', 3, 4 ], $calls );

		$vars = $this->final_query_vars( self::query_block( $this->fill_attrs( [ 1, 2 ], [ 'fillWithLatest' => true, 'numberOfPosts' => 5 ] ) ) );

		$this->assertSame( [ 1, 2, 3, 4 ], $vars['post__in'] );
	}

	/**
	 * Saved attributes and unrelated metadata are not modified by fill handling.
	 *
	 * @return void
	 */
	public function test_fill_does_not_modify_saved_block(): void {
		$block  = self::query_block( $this->fill_attrs( [ 1 ], [ 'fillWithLatest' => true, 'numberOfPosts' => 99 ] ) );
		$plugin = $this->plugin();

		$this->assertSame( $block, $plugin->filter_handpicked_block_data( $block ) );
	}

	/**
	 * Fill config belongs to its own Query: a nested Latest Query is untouched and the outer
	 * Query's fill applies again once the inner one has finished.
	 *
	 * @return void
	 */
	public function test_fill_is_scoped_to_its_query(): void {
		$plugin  = $this->plugin();
		$context = [ 'query' => [ 'inherit' => true ] ];

		$plugin->filter_handpicked_block_data( self::query_block( $this->fill_attrs( [ 5 ], [ 'fillWithLatest' => true, 'numberOfPosts' => 3 ] ) ) );
		$plugin->filter_handpicked_block_data( self::query_block( [ 'query' => [ 'inherit' => true ] ] ) );
		$this->assertSame( $context, $plugin->filter_handpicked_block_context( $context ) );
		$plugin->pop_handpicked_query( '' );

		$outer = $plugin->filter_handpicked_block_context( $context );
		$this->assertSame( [ 5 ], $outer['query']['rtCarouselHandpickedIds'] );
		$this->assertSame( 3, $outer['query']['rtCarouselFillCount'] );
		$plugin->pop_handpicked_query( '' );

		$this->assertSame( $context, $plugin->filter_handpicked_block_context( $context ) );
	}
}
