import type { EmblaOptionsType } from 'embla-carousel';
import type {
	BlockVerticalAlignmentToolbar,
	InnerBlocks,
} from '@wordpress/block-editor';

export type CarouselAttributes = {
	transition: 'slide' | 'fade';
	loop: boolean;
	dragFree: boolean;
	carouselAlign: 'start' | 'center' | 'end';
	align?: 'start' | 'center' | 'end'; // Add align property optional
	containScroll: 'trimSnaps' | 'keepSnaps';
	direction: 'ltr' | 'rtl';
	axis: 'x' | 'y';
	height: string;
	allowedSlideBlocks: string[];
	autoplay: boolean;
	autoplayDelay: number;
	autoplayStopOnInteraction: boolean;
	autoplayStopOnMouseEnter: boolean;
	ariaLabel: string;
	slideGap: number;
	slidesToScroll: string;
	lazyLoadImages: boolean;
	autoScroll: boolean;
	autoScrollSpeed: number;
	autoScrollDirection: 'forward' | 'backward';
	autoScrollStartDelay: number;
	autoScrollStopOnInteraction: boolean;
	autoScrollStopOnMouseEnter: boolean;
	useTabs: boolean;
};

export type CarouselViewportAttributes = Record<string, never>;
export type CarouselSlideAttributes = {
	verticalAlignment?: BlockVerticalAlignmentToolbar.Value;
};
export type CarouselControlsAttributes = Record<string, never>;
export type CarouselDotsAttributes = Record<string, never>;
export type CarouselProgressAttributes = Record<string, never>;
export type CarouselCounterAttributes = Record<string, never>;

/**
 * Recursive block-editor block shape. Covers the fields this plugin reads.
 */
export interface WPBlock {
	clientId: string;
	name: string;
	innerBlocks?: WPBlock[];
}

/**
 * Typed subset of the block editor store selectors used in this plugin.
 * This avoids `as any` casts while keeping dot-notation and type safety.
 */
export interface BlockEditorSelectors {
	getBlocks: ( clientId: string ) => WPBlock[];
	getSelectedBlockClientId: () => string | null;
	getBlockParents: ( clientId: string ) => string[];
	/** Returns ancestor clientIds filtered by block name (closest last). */
	getBlockParentsByBlockName: ( clientId: string, name: string ) => string[];
	getBlockRootClientId: ( clientId: string ) => string | null;
}

/**
 * This is required because `@types/wordpress__block-editor` predates `defaultBlock`/`directInsert`
 */
export type ViewportInnerBlocksOptions = InnerBlocks.Props & {
	defaultBlock?: { name: string; attributes?: Record< string, unknown > };
	directInsert?: boolean;
};

/**
 * Depth-first search for the first block of `name` anywhere in the tree.
 *
 * @template {Object} T - Block-like value with a `name` and optional `innerBlocks`.
 * @param {T[]}    blocks - Block tree to search (must include innerBlocks).
 * @param {string} name   - Block name to match.
 * @return {T | undefined} First matching block, if any.
 */
export function findBlockDeep<T extends { name: string; innerBlocks?: T[] }>(
	blocks: T[],
	name: string,
): T | undefined {
	for ( const block of blocks ) {
		if ( block.name === name ) {
			return block;
		}
		if ( block.innerBlocks?.length ) {
			const found = findBlockDeep( block.innerBlocks, name );
			if ( found ) {
				return found;
			}
		}
	}
	return undefined;
}

/**
 * Depth-first search for all blocks of `name` anywhere in the tree.
 *
 * @template {Object} T - Block-like value with a `name` and optional `innerBlocks`.
 * @param {T[]}    blocks - Block tree to search (must include innerBlocks).
 * @param {string} name   - Block name to match.
 * @return {T[]} All matching blocks.
 */
export function findAllBlocksDeep<T extends { name: string; innerBlocks?: T[] }>(
	blocks: T[],
	name: string,
): T[] {
	const result: T[] = [];
	for ( const block of blocks ) {
		if ( block.name === name ) {
			result.push( block );
		}
		if ( block.innerBlocks?.length ) {
			result.push( ...findAllBlocksDeep( block.innerBlocks, name ) );
		}
	}
	return result;
}

export type CarouselContext = {
	transition: 'slide' | 'fade';
	options: EmblaOptionsType & {
		slidesToScroll?: number | 'auto';
	};
	autoplay:
		| boolean
		| {
				delay: number;
				stopOnInteraction: boolean;
				stopOnMouseEnter: boolean;
		};
	isPlaying: boolean;
	timerIterationId: number;
	selectedIndex: number;
	scrollSnaps: { index: number }[];
	canScrollPrev: boolean;
	canScrollNext: boolean;
	scrollProgress: number;
	ariaLabelPattern: string;
	countLabelPattern?: string;
	announcement?: string;
	announcementPattern?: string;
	shouldAnnounce?: boolean;
	ref?: HTMLElement | null;
	slideCount: number;
	initialized?: boolean;
	autoScroll: boolean | {
		speed: number;
		direction: 'forward' | 'backward';
		startDelay: number;
		stopOnInteraction: boolean;
		stopOnMouseEnter: boolean;
		stopOnFocusIn: boolean;
	};
	useTabs?: boolean;
	carouselId?: string;
};
