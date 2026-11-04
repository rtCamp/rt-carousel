/**
 * Handpicked posts for Query Loop carousels.
 *
 * Stores the selection in `core/query` block metadata (`metadata.rtCarousel`), leaving the
 * Query block's own `query` attribute and saved markup untouched. The server (see
 * `Plugin::filter_handpicked_query_vars`) and the editor preview below both read it.
 */
import type { ComponentType, ReactNode } from 'react';
import { useEffect, useState } from '@wordpress/element';
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import {
	Button,
	PanelBody,
	Placeholder,
	RadioControl,
	RangeControl,
	SearchControl,
	Spinner,
	ToggleControl,
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { __, _n, sprintf } from '@wordpress/i18n';
import { chevronDown, chevronUp, close } from '@wordpress/icons';

// Keep in sync with HANDPICKED_LIMIT in inc/Plugin.php.
export const MAX_HANDPICKED = 20;
export const MAX_SUGGESTIONS = 5;
// Keep in sync with FILL_DEFAULT, FILL_MIN and FILL_MAX in inc/Plugin.php.
export const DEFAULT_FILL_COUNT = 6;
export const MIN_FILL_COUNT = 1;
export const MAX_FILL_COUNT = 20;
const CAROUSEL_BLOCK = 'rt-carousel/carousel';

type Mode = 'latest' | 'handpicked';

export interface RtCarouselMeta {
	mode: Mode;
	ids: number[];
	postType: string;
	/** Absent means off. */
	fillWithLatest?: boolean;
	/** Absent means 6; only applies while fill is on. */
	numberOfPosts?: number;
}

interface QueryAttributes {
	postType?: string;
	[ key: string ]: unknown;
}

interface QueryBlockAttributes {
	query?: QueryAttributes;
	metadata?: { rtCarousel?: Partial<RtCarouselMeta>; [ key: string ]: unknown };
	[ key: string ]: unknown;
}

interface EditProps {
	name: string;
	clientId: string;
	attributes: QueryBlockAttributes;
	setAttributes: ( attributes: Partial<QueryBlockAttributes> ) => void;
	context?: Record<string, unknown>;
	[ key: string ]: unknown;
}

interface BlockEditorSelect {
	getBlockParentsByBlockName: ( clientId: string, name: string ) => string[];
	getBlockAttributes: ( clientId: string ) => QueryBlockAttributes | null;
}

interface Post {
	id: number;
	title?: { rendered?: string; raw?: string };
}

interface CoreSelect {
	getEntityRecords: (
		kind: string,
		name: string,
		query: Record<string, unknown>,
	) => Post[] | null;
}

/**
 * Positive integers, first occurrence wins, capped at the limit.
 *
 * @param {unknown} ids Stored IDs.
 * @return {number[]} Clean IDs.
 */
export function normalizeIds( ids: unknown ): number[] {
	if ( ! Array.isArray( ids ) ) {
		return [];
	}
	const seen = new Set<number>();
	for ( const id of ids ) {
		if ( Number.isInteger( id ) && id > 0 ) {
			seen.add( id );
		}
	}
	return [ ...seen ].slice( 0, MAX_HANDPICKED );
}

/**
 * "Number of posts" for the fill: whole numbers clamp to 1-20, anything else is the default.
 *
 * @param {unknown} value Stored or entered value.
 * @return {number} Count between 1 and 20.
 */
export function normalizeFillCount( value: unknown ): number {
	if ( typeof value !== 'number' || ! Number.isInteger( value ) ) {
		return DEFAULT_FILL_COUNT;
	}
	return Math.min( MAX_FILL_COUNT, Math.max( MIN_FILL_COUNT, value ) );
}

export function getPostType( attributes: QueryBlockAttributes ): string {
	return attributes.query?.postType || 'post';
}

export function getMeta( attributes: QueryBlockAttributes ): RtCarouselMeta | null {
	const meta = attributes.metadata?.rtCarousel;
	if ( ! meta || typeof meta !== 'object' ) {
		return null;
	}
	return {
		mode: meta.mode === 'handpicked' ? 'handpicked' : 'latest',
		ids: normalizeIds( meta.ids ),
		postType: meta.postType || getPostType( attributes ),
		fillWithLatest: meta.fillWithLatest === true,
		numberOfPosts: normalizeFillCount( meta.numberOfPosts ),
	};
}

/**
 * Published posts of `postType` among `ids`; null while loading, [] when none (or no ids).
 *
 * @param {string}   postType Post type to query.
 * @param {number[]} ids      Picked IDs.
 */
function usePublishedPicks( postType: string, ids: number[] ): Post[] | null {
	const idsKey = ids.join( ',' );
	return useSelect(
		( select ) => {
			const include = idsKey ? idsKey.split( ',' ).map( Number ) : [];
			return include.length
				? ( select( 'core' ) as unknown as CoreSelect ).getEntityRecords( 'postType', postType, {
					include,
					per_page: include.length,
					status: 'publish',
					orderby: 'include',
				} )
				: [];
		},
		[ postType, idsKey ],
	);
}

/**
 * Newest published posts of `postType` that are not in `exclude`, for "fill with latest".
 * Null while loading; [] when `count` is 0 (nothing is requested) or nothing else is published.
 *
 * @param {string}   postType Post type to query.
 * @param {number}   count    How many posts are still needed.
 * @param {number[]} exclude  Every picked ID, including unavailable ones.
 */
function useLatestPosts( postType: string, count: number, exclude: number[] ): Post[] | null {
	const excludeKey = exclude.join( ',' );
	return useSelect(
		( select ) =>
			count > 0
				? ( select( 'core' ) as unknown as CoreSelect ).getEntityRecords( 'postType', postType, {
					status: 'publish',
					per_page: count,
					order: 'desc',
					orderby: 'date',
					...( excludeKey ? { exclude: excludeKey.split( ',' ).map( Number ) } : {} ),
				} )
				: [],
		[ postType, count, excludeKey ],
	);
}

function postTitle( post: Post ): string {
	const title = post.title?.raw || post.title?.rendered || '';
	// Rendered titles may contain entities; decode via a detached element.
	const el = document.createElement( 'textarea' );
	el.innerHTML = title;
	return el.value || sprintf( /* translators: %d: post ID */ __( '(no title) #%d', 'rt-carousel' ), post.id );
}

function PickedRow( {
	id,
	post,
	index,
	count,
	onMove,
	onRemove,
}: {
	id: number;
	post: Post | undefined;
	index: number;
	count: number;
	onMove: ( from: number, to: number ) => void;
	onRemove: ( id: number ) => void;
} ) {
	const title = post
		? postTitle( post )
		: sprintf( /* translators: %d: post ID */ __( 'Unavailable post (ID %d)', 'rt-carousel' ), id );

	return (
		<li className="rt-carousel-handpicked__row">
			<span className="rt-carousel-handpicked__title">{ title }</span>
			<Button
				icon={ chevronUp }
				size="small"
				/* translators: %s: post title */
				label={ sprintf( __( 'Move up: %s', 'rt-carousel' ), title ) }
				accessibleWhenDisabled
				disabled={ index === 0 }
				onClick={ () => onMove( index, index - 1 ) }
			/>
			<Button
				icon={ chevronDown }
				size="small"
				/* translators: %s: post title */
				label={ sprintf( __( 'Move down: %s', 'rt-carousel' ), title ) }
				accessibleWhenDisabled
				disabled={ index === count - 1 }
				onClick={ () => onMove( index, index + 1 ) }
			/>
			<Button
				icon={ close }
				size="small"
				isDestructive
				/* translators: %s: post title */
				label={ sprintf( __( 'Remove: %s', 'rt-carousel' ), title ) }
				onClick={ () => onRemove( id ) }
			/>
		</li>
	);
}

function HandpickedControls( {
	attributes,
	setAttributes,
}: Pick<EditProps, 'attributes' | 'setAttributes'> ) {
	const [ search, setSearch ] = useState( '' );
	const postType = getPostType( attributes );
	const meta = getMeta( attributes );
	const mode = meta?.mode ?? 'latest';
	const ids = meta?.ids ?? [];
	const fill = meta?.fillWithLatest === true;
	const numberOfPosts = meta?.numberOfPosts ?? DEFAULT_FILL_COUNT;
	const atLimit = ids.length >= MAX_HANDPICKED;

	const selected = usePublishedPicks( postType, mode === 'handpicked' ? ids : [] );
	const idsKey = ids.join( ',' );
	// Five latest published posts, or five matching a search. Picked posts are excluded
	// server-side so the list stays full; selected rows are resolved separately.
	const results = useSelect(
		( select ) =>
			mode === 'handpicked'
				? ( select( 'core' ) as unknown as CoreSelect ).getEntityRecords( 'postType', postType, {
					status: 'publish',
					per_page: MAX_SUGGESTIONS,
					order: 'desc',
					orderby: 'date',
					...( search ? { search } : {} ),
					...( idsKey ? { exclude: idsKey.split( ',' ).map( Number ) } : {} ),
				} )
				: [],
		[ mode, postType, search, idsKey ],
	);

	const update = ( next: Partial<RtCarouselMeta> ) =>
		setAttributes( {
			metadata: {
				...attributes.metadata,
				// Spread the stored record first so fill settings and any other keys survive.
				rtCarousel: { ...attributes.metadata?.rtCarousel, mode, ids, postType, ...next },
			},
		} );

	const setMode = ( value: string ) => {
		// Latest is the default: never write metadata just to say "latest".
		if ( value === 'latest' && ! meta ) {
			return;
		}
		update( { mode: value as Mode } );
	};

	const add = ( id: number ) => {
		if ( atLimit || ids.includes( id ) ) {
			return;
		}
		update( { ids: [ ...ids, id ], postType } );
	};

	const remove = ( id: number ) => update( { ids: ids.filter( ( i ) => i !== id ) } );

	const move = ( from: number, to: number ) => {
		const next = [ ...ids ];
		next.splice( to, 0, ...next.splice( from, 1 ) );
		update( { ids: next } );
	};

	const byId = new Map( ( selected ?? [] ).map( ( post ) => [ post.id, post ] ) );
	const available = ( results ?? [] ).filter( ( post ) => ! ids.includes( post.id ) ).slice( 0, MAX_SUGGESTIONS );
	const limitId = 'rt-carousel-handpicked-limit';

	return (
		<PanelBody title={ __( 'Carousel posts', 'rt-carousel' ) } initialOpen>
			<RadioControl
				label={ __( 'Show', 'rt-carousel' ) }
				selected={ mode }
				options={ [
					{ label: __( 'Latest posts', 'rt-carousel' ), value: 'latest' },
					{ label: __( 'Handpicked posts', 'rt-carousel' ), value: 'handpicked' },
				] }
				onChange={ setMode }
			/>
			{ mode === 'handpicked' && (
				<>
					<p className="rt-carousel-handpicked__count">
						{ sprintf(
							/* translators: %d: number of selected posts */
							_n( '%d post selected', '%d posts selected', ids.length, 'rt-carousel' ),
							ids.length,
						) }
					</p>
					{ ids.length > 0 && (
						<ol className="rt-carousel-handpicked__selected" aria-label={ __( 'Selected posts', 'rt-carousel' ) }>
							{ ids.map( ( id, index ) => (
								<PickedRow
									key={ id }
									id={ id }
									post={ byId.get( id ) }
									index={ index }
									count={ ids.length }
									onMove={ move }
									onRemove={ remove }
								/>
							) ) }
						</ol>
					) }
					<ToggleControl
						label={ __( 'Fill with latest posts', 'rt-carousel' ) }
						help={ __( 'Add the newest published posts after your picks to reach the number of posts.', 'rt-carousel' ) }
						checked={ fill }
						onChange={ ( value: boolean ) => update( { fillWithLatest: value } ) }
						__nextHasNoMarginBottom
					/>
					{ fill && (
						<RangeControl
							label={ __( 'Number of posts', 'rt-carousel' ) }
							value={ numberOfPosts }
							min={ MIN_FILL_COUNT }
							max={ MAX_FILL_COUNT }
							onChange={ ( value?: number ) => update( { numberOfPosts: normalizeFillCount( value ) } ) }
							__nextHasNoMarginBottom
						/>
					) }
					{ atLimit && (
						<p id={ limitId } role="status">
							{ sprintf(
								/* translators: %d: maximum number of posts */
								__( 'Limit reached: a carousel can show up to %d posts. Remove one to add another.', 'rt-carousel' ),
								MAX_HANDPICKED,
							) }
						</p>
					) }
					<SearchControl
						label={ __( 'Search published content', 'rt-carousel' ) }
						value={ search }
						onChange={ setSearch }
						__nextHasNoMarginBottom
					/>
					{ results === null && <Spinner /> }
					{ results !== null && available.length === 0 && (
						<p>{ __( 'No published posts found.', 'rt-carousel' ) }</p>
					) }
					<ul className="rt-carousel-handpicked__results">
						{ available.map( ( post ) => (
							<li key={ post.id }>
								<Button
									variant="tertiary"
									/* translators: %s: post title */
									label={ sprintf( __( 'Add: %s', 'rt-carousel' ), postTitle( post ) ) }
									accessibleWhenDisabled
									disabled={ atLimit }
									aria-describedby={ atLimit ? limitId : undefined }
									onClick={ () => add( post.id ) }
								>
									{ postTitle( post ) }
								</Button>
							</li>
						) ) }
					</ul>
				</>
			) }
		</PanelBody>
	);
}

function QueryEdit( {
	BlockEdit,
	props,
}: {
	BlockEdit: ComponentType<EditProps>;
	props: EditProps;
} ) {
	const { clientId, attributes, setAttributes } = props;
	const inCarousel = useSelect(
		( select ) =>
			( select( 'core/block-editor' ) as unknown as BlockEditorSelect )
				.getBlockParentsByBlockName( clientId, CAROUSEL_BLOCK ).length > 0,
		[ clientId ],
	);
	const postType = getPostType( attributes );
	const meta = getMeta( attributes );

	// Picks belong to one post type: drop them when the Query's type changes.
	useEffect( () => {
		if ( meta && meta.postType !== postType ) {
			setAttributes( {
				metadata: {
					...attributes.metadata,
					// Only the picks belong to the old type; fill settings carry over.
					rtCarousel: { ...attributes.metadata?.rtCarousel, mode: meta.mode, ids: [], postType },
				},
			} );
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ postType, meta?.postType ] );

	return (
		<>
			<BlockEdit { ...props } />
			{ inCarousel && (
				<InspectorControls>
					<HandpickedControls attributes={ attributes } setAttributes={ setAttributes } />
				</InspectorControls>
			) }
		</>
	);
}

function Prompt( { children }: { children: ReactNode } ) {
	const blockProps = useBlockProps();
	return (
		<div { ...blockProps }>
			<Placeholder>{ children }</Placeholder>
		</div>
	);
}

function PostTemplateEdit( {
	BlockEdit,
	props,
}: {
	BlockEdit: ComponentType<EditProps>;
	props: EditProps;
} ) {
	const queryAttributes = useSelect( ( select ) => {
		const editor = select( 'core/block-editor' ) as unknown as BlockEditorSelect;
		const parents = editor.getBlockParentsByBlockName( props.clientId, 'core/query' );
		return parents.length ? editor.getBlockAttributes( parents[ parents.length - 1 ] as string ) : null;
	}, [ props.clientId ] );

	const meta = queryAttributes ? getMeta( queryAttributes ) : null;
	const ids = meta?.mode === 'handpicked' ? meta.ids : [];
	const postType = queryAttributes ? getPostType( queryAttributes ) : 'post';
	const handpicked = meta?.mode === 'handpicked';

	// Tells "still loading" (null) from "nothing left to show" ([]).
	const survivors = usePublishedPicks( postType, ids );

	// Fill with latest: published picks in saved order (first N), then the newest other posts.
	const fill = handpicked && meta?.fillWithLatest === true;
	const count = meta?.numberOfPosts ?? DEFAULT_FILL_COUNT;
	const pickedIds = survivors
		? ids.filter( ( id ) => survivors.some( ( post ) => post.id === id ) ).slice( 0, count )
		: null;
	const latest = useLatestPosts( postType, fill && pickedIds ? count - pickedIds.length : 0, ids );

	if ( ! handpicked ) {
		return <BlockEdit { ...props } />;
	}

	let includeIds = ids;

	if ( fill ) {
		// Wait for both requests: never preview partial or previous results.
		if ( pickedIds === null || latest === null ) {
			return (
				<Prompt>
					<Spinner />
				</Prompt>
			);
		}

		includeIds = [ ...new Set( [ ...pickedIds, ...latest.map( ( post ) => post.id ) ] ) ].slice( 0, count );

		// Never send an empty `include`: core would select every post.
		if ( ! includeIds.length ) {
			return <Prompt>{ __( 'No published posts are available', 'rt-carousel' ) }</Prompt>;
		}
	} else {
		if ( ! ids.length ) {
			return <Prompt>{ __( 'Choose posts to show in this carousel', 'rt-carousel' ) }</Prompt>;
		}

		if ( survivors?.length === 0 ) {
			return <Prompt>{ __( 'No selected published posts are available', 'rt-carousel' ) }</Prompt>;
		}
	}

	return (
		<BlockEdit
			{ ...props }
			context={ {
				...props.context,
				query: {
					postType,
					include: includeIds,
					orderBy: 'include',
					perPage: includeIds.length,
					inherit: false,
					offset: 0,
					status: 'publish',
					// REST `context` param, forwarded by core Post Template; not the block context.
					context: 'view',
				},
			} }
		/>
	);
}

export const withHandpickedPosts = createHigherOrderComponent(
	( BlockEdit: ComponentType<EditProps> ) =>
		function WithHandpickedPosts( props: EditProps ) {
			if ( props.name === 'core/query' ) {
				return <QueryEdit BlockEdit={ BlockEdit } props={ props } />;
			}
			if ( props.name === 'core/post-template' ) {
				return <PostTemplateEdit BlockEdit={ BlockEdit } props={ props } />;
			}
			return <BlockEdit { ...props } />;
		},
	'withHandpickedPosts',
);

addFilter( 'editor.BlockEdit', 'rt-carousel/handpicked-posts', withHandpickedPosts );
