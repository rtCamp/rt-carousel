/**
 * Unit tests for handpicked posts editor enhancement.
 *
 * @package
 */

import '@testing-library/jest-dom';
import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { addFilter } from '@wordpress/hooks';

type Post = { id: number; title: { rendered: string } };

const mockStores: {
	parents: string[];
	queryParents: string[];
	queryAttributes: Record<string, unknown> | null;
	entityRecords: jest.Mock;
} = {
	parents: [],
	queryParents: [ 'query-1' ],
	queryAttributes: null,
	entityRecords: jest.fn(),
};

jest.mock( '@wordpress/hooks', () => ( { addFilter: jest.fn() } ) );

jest.mock( '@wordpress/block-editor', () => ( {
	InspectorControls: ( { children }: { children: ReactNode } ) => <div data-testid="inspector">{ children }</div>,
	useBlockProps: () => ( { 'data-testid': 'block-props' } ),
} ) );

jest.mock( '@wordpress/components', () => ( {
	Button: ( {
		children,
		label,
		disabled,
		onClick,
		'aria-describedby': describedBy,
	}: {
		children?: ReactNode;
		label?: string;
		disabled?: boolean;
		onClick?: () => void;
		'aria-describedby'?: string;
	} ) => (
		<button
			type="button"
			aria-label={ label }
			aria-describedby={ describedBy }
			aria-disabled={ disabled || undefined }
			onClick={ () => ! disabled && onClick?.() }
		>
			{ children }
		</button>
	),
	PanelBody: ( { children }: { children: ReactNode } ) => <div>{ children }</div>,
	Placeholder: ( { children }: { children: ReactNode } ) => <div data-testid="placeholder">{ children }</div>,
	Spinner: () => <div data-testid="spinner" />,
	SearchControl: ( {
		label,
		value,
		onChange,
	}: {
		label: string;
		value: string;
		onChange: ( v: string ) => void;
	} ) => <input aria-label={ label } value={ value } onChange={ ( e ) => onChange( e.target.value ) } />,
	ToggleControl: ( {
		label,
		checked,
		onChange,
	}: {
		label: string;
		checked: boolean;
		onChange: ( v: boolean ) => void;
	} ) => (
		<input type="checkbox" role="switch" aria-label={ label } checked={ checked } onChange={ ( e ) => onChange( e.target.checked ) } />
	),
	RangeControl: ( {
		label,
		value,
		min,
		max,
		onChange,
	}: {
		label: string;
		value: number;
		min: number;
		max: number;
		onChange: ( v: number | undefined ) => void;
	} ) => (
		<input
			type="number"
			aria-label={ label }
			value={ value }
			min={ min }
			max={ max }
			onChange={ ( e ) => onChange( e.target.value === '' ? undefined : Number( e.target.value ) ) }
		/>
	),
	RadioControl: ( {
		options,
		selected,
		onChange,
	}: {
		options: { label: string; value: string }[];
		selected: string;
		onChange: ( v: string ) => void;
	} ) => (
		<div>
			{ options.map( ( o ) => (
				<label key={ o.value } htmlFor={ `r-${ o.value }` }>
					<input
						id={ `r-${ o.value }` }
						type="radio"
						checked={ selected === o.value }
						onChange={ () => onChange( o.value ) }
					/>
					{ o.label }
				</label>
			) ) }
		</div>
	),
} ) );

const mockBlockEditor = {
	getBlockParentsByBlockName: ( _id: string, name: string ) =>
		name === 'rt-carousel/carousel' ? mockStores.parents : mockStores.queryParents,
	getBlockAttributes: () => mockStores.queryAttributes,
};

jest.mock( '@wordpress/data', () => ( {
	useSelect: ( selector: ( select: ( store: string ) => unknown ) => unknown ) =>
		selector( ( store: string ) => {
			if ( store === 'core' ) {
				return { getEntityRecords: mockStores.entityRecords };
			}
			return mockBlockEditor;
		} ),
} ) );

// eslint-disable-next-line import/first
import { withHandpickedPosts, MAX_HANDPICKED, normalizeFillCount } from '../handpicked-posts';

// Registration happens on import; capture before per-test mock resets.
const registrations = ( addFilter as jest.Mock ).mock.calls.slice();

const BlockEdit = jest.fn( ( props: { context?: unknown } ) => <div data-testid="core-edit">{ JSON.stringify( props.context ?? null ) }</div> );
const Enhanced = withHandpickedPosts( BlockEdit as never ) as unknown as ( p: Record<string, unknown> ) => JSX.Element;

const post = ( id: number, title = `Post ${ id }` ): Post => ( { id, title: { rendered: title } } );

/**
 * Entity mock: `include` queries resolve against `published`, searches return `searchResults`.
 *
 * @param {Post[]} published     Published posts.
 * @param {Post[]} searchResults Search results.
 */
function mockEntities( published: Post[], searchResults: Post[] = published ) {
	mockStores.entityRecords.mockImplementation( ( _k: string, _type: string, query: { include?: number[] } ) =>
		query.include ? published.filter( ( p ) => query.include!.includes( p.id ) ) : searchResults,
	);
}

function queryProps( attributes: Record<string, unknown> = {}, setAttributes = jest.fn() ) {
	return { name: 'core/query', clientId: 'query-1', attributes, setAttributes };
}

const handpicked = ( ids: number[], extra: Record<string, unknown> = {}, postType = 'post' ) => ( {
	query: { postType },
	metadata: { name: 'Keep me', rtCarousel: { mode: 'handpicked', ids, postType } },
	...extra,
} );

beforeEach( () => {
	mockStores.parents = [ 'carousel' ];
	mockStores.queryParents = [ 'query-1' ];
	mockStores.queryAttributes = null;
	mockStores.entityRecords.mockReset();
	mockEntities( [] );
	BlockEdit.mockClear();
} );

describe( 'registration', () => {
	it( 'registers one editor.BlockEdit filter', () => {
		expect( registrations ).toEqual( [ [ 'editor.BlockEdit', 'rt-carousel/handpicked-posts', withHandpickedPosts ] ] );
	} );

	it( 'passes unrelated blocks through', () => {
		render( <Enhanced name="core/group" clientId="g" attributes={ {} } /> );
		expect( screen.getByTestId( 'core-edit' ) ).toBeInTheDocument();
		expect( screen.queryByTestId( 'inspector' ) ).not.toBeInTheDocument();
	} );
} );

describe( 'Query inspector', () => {
	it( 'defaults to Latest when metadata is absent, writing nothing', () => {
		const setAttributes = jest.fn();
		render( <Enhanced { ...queryProps( { query: { postType: 'post' } }, setAttributes ) } /> );

		expect( screen.getByLabelText( 'Latest posts' ) ).toBeChecked();
		expect( screen.queryByLabelText( 'Search published content' ) ).not.toBeInTheDocument();
		fireEvent.click( screen.getByLabelText( 'Latest posts' ) );
		expect( setAttributes ).not.toHaveBeenCalled();
	} );

	it( 'is absent on a Query Loop outside a carousel', () => {
		mockStores.parents = [];
		render( <Enhanced { ...queryProps( { query: { postType: 'post' } } ) } /> );
		expect( screen.queryByTestId( 'inspector' ) ).not.toBeInTheDocument();
		expect( screen.getByTestId( 'core-edit' ) ).toBeInTheDocument();
	} );

	it( 'switching to Handpicked stores metadata and preserves other keys and query', () => {
		const setAttributes = jest.fn();
		const attributes = { query: { postType: 'post', perPage: 3 }, metadata: { name: 'Keep me' } };
		render( <Enhanced { ...queryProps( attributes, setAttributes ) } /> );

		fireEvent.click( screen.getByLabelText( 'Handpicked posts' ) );
		expect( setAttributes ).toHaveBeenCalledWith( {
			metadata: { name: 'Keep me', rtCarousel: { mode: 'handpicked', ids: [], postType: 'post' } },
		} );
	} );

	it( 'switching modes preserves IDs', () => {
		const setAttributes = jest.fn();
		mockEntities( [ post( 1 ), post( 2 ) ] );
		render( <Enhanced { ...queryProps( handpicked( [ 1, 2 ] ), setAttributes ) } /> );

		fireEvent.click( screen.getByLabelText( 'Latest posts' ) );
		expect( setAttributes ).toHaveBeenCalledWith( {
			metadata: { name: 'Keep me', rtCarousel: { mode: 'latest', ids: [ 1, 2 ], postType: 'post' } },
		} );
	} );

	it.each( [ 'handpicked', 'latest' ] )( 'clears IDs when the post type changes in %s mode', ( mode ) => {
		const setAttributes = jest.fn();
		const attributes = {
			query: { postType: 'page' },
			metadata: { name: 'Keep me', rtCarousel: { mode, ids: [ 1, 2 ], postType: 'post' } },
		};
		render( <Enhanced { ...queryProps( attributes, setAttributes ) } /> );

		expect( setAttributes ).toHaveBeenCalledTimes( 1 );
		expect( setAttributes ).toHaveBeenCalledWith( {
			metadata: { name: 'Keep me', rtCarousel: { mode, ids: [], postType: 'page' } },
		} );
	} );

	it( 'does not write when types match or metadata is absent', () => {
		const setAttributes = jest.fn();
		mockEntities( [ post( 1 ) ] );
		render( <Enhanced { ...queryProps( handpicked( [ 1 ] ), setAttributes ) } /> );
		render( <Enhanced { ...queryProps( { query: { postType: 'page' } }, setAttributes ) } /> );
		expect( setAttributes ).not.toHaveBeenCalled();
	} );

	it( 'requests the five latest published posts before typing', () => {
		render( <Enhanced { ...queryProps( handpicked( [], {}, 'page' ) ) } /> );

		expect( mockStores.entityRecords ).toHaveBeenCalledWith( 'postType', 'page', {
			status: 'publish',
			per_page: 5,
			order: 'desc',
			orderby: 'date',
		} );
	} );

	it( 'searches published content of the Query post type, five at a time', () => {
		render( <Enhanced { ...queryProps( handpicked( [], {}, 'page' ) ) } /> );
		fireEvent.change( screen.getByLabelText( 'Search published content' ), { target: { value: 'hello' } } );

		expect( mockStores.entityRecords ).toHaveBeenCalledWith( 'postType', 'page', {
			status: 'publish',
			per_page: 5,
			order: 'desc',
			orderby: 'date',
			search: 'hello',
		} );
	} );

	it( 'excludes picked posts from the request so five suggestions stay available', () => {
		mockEntities( [ post( 1 ), post( 2 ) ] );
		render( <Enhanced { ...queryProps( handpicked( [ 1, 2 ] ) ) } /> );

		expect( mockStores.entityRecords ).toHaveBeenCalledWith(
			'postType',
			'post',
			expect.objectContaining( { per_page: 5, exclude: [ 1, 2 ] } ),
		);
	} );

	it( 'never renders more than five suggestions, while all picks stay listed', () => {
		const picked = Array.from( { length: 8 }, ( _, i ) => i + 1 );
		const suggestions = Array.from( { length: 9 }, ( _, i ) => post( 100 + i ) );
		mockEntities( picked.map( ( id ) => post( id ) ), suggestions );
		render( <Enhanced { ...queryProps( handpicked( picked ) ) } /> );

		expect( screen.getAllByRole( 'button', { name: /^Add: / } ) ).toHaveLength( 5 );
		expect( screen.getAllByRole( 'button', { name: /^Remove: / } ) ).toHaveLength( 8 );
	} );

	it( 'adds a post by click, excluding already picked ones', () => {
		const setAttributes = jest.fn();
		mockEntities( [ post( 1 ), post( 2 ) ] );
		render( <Enhanced { ...queryProps( handpicked( [ 1 ] ), setAttributes ) } /> );

		expect( screen.queryByRole( 'button', { name: 'Add: Post 1' } ) ).not.toBeInTheDocument();
		fireEvent.click( screen.getByRole( 'button', { name: 'Add: Post 2' } ) );
		expect( setAttributes.mock.calls[ 0 ][ 0 ].metadata.rtCarousel ).toEqual( {
			mode: 'handpicked',
			ids: [ 1, 2 ],
			postType: 'post',
		} );
	} );

	it( 'persists the current post type when picks are first added', () => {
		const setAttributes = jest.fn();
		mockEntities( [ post( 5 ) ] );
		render( <Enhanced { ...queryProps( { query: { postType: 'page' }, metadata: { rtCarousel: { mode: 'handpicked' } } }, setAttributes ) } /> );

		fireEvent.click( screen.getByRole( 'button', { name: 'Add: Post 5' } ) );
		expect( setAttributes.mock.calls[ 0 ][ 0 ].metadata.rtCarousel ).toEqual( {
			mode: 'handpicked',
			ids: [ 5 ],
			postType: 'page',
		} );
	} );

	it( 'removes and reorders with named buttons', () => {
		const setAttributes = jest.fn();
		mockEntities( [ post( 1 ), post( 2 ), post( 3 ) ] );
		render( <Enhanced { ...queryProps( handpicked( [ 1, 2, 3 ] ), setAttributes ) } /> );
		const ids = () => setAttributes.mock.calls.at( -1 )[ 0 ].metadata.rtCarousel.ids;

		// Props are static here, so every action is applied to the original [1, 2, 3].
		fireEvent.click( screen.getByRole( 'button', { name: 'Move up: Post 2' } ) );
		expect( ids() ).toEqual( [ 2, 1, 3 ] );
		fireEvent.click( screen.getByRole( 'button', { name: 'Move down: Post 1' } ) );
		expect( ids() ).toEqual( [ 2, 1, 3 ] );
		fireEvent.click( screen.getByRole( 'button', { name: 'Move down: Post 2' } ) );
		expect( ids() ).toEqual( [ 1, 3, 2 ] );
		fireEvent.click( screen.getByRole( 'button', { name: 'Remove: Post 2' } ) );
		expect( ids() ).toEqual( [ 1, 3 ] );
	} );

	it( 'disables boundary move buttons', () => {
		mockEntities( [ post( 1 ), post( 2 ) ] );
		render( <Enhanced { ...queryProps( handpicked( [ 1, 2 ] ) ) } /> );

		expect( screen.getByRole( 'button', { name: 'Move up: Post 1' } ) ).toHaveAttribute( 'aria-disabled', 'true' );
		expect( screen.getByRole( 'button', { name: 'Move down: Post 2' } ) ).toHaveAttribute( 'aria-disabled', 'true' );
		expect( screen.getByRole( 'button', { name: 'Move down: Post 1' } ) ).not.toHaveAttribute( 'aria-disabled' );
	} );

	it( 'allows exactly 20 picks and disables a 21st with an explanation', () => {
		const setAttributes = jest.fn();
		const picked = Array.from( { length: MAX_HANDPICKED - 1 }, ( _, i ) => i + 1 );
		mockEntities( [ ...picked.map( ( id ) => post( id ) ), post( 100 ), post( 101 ) ] );
		const { rerender } = render( <Enhanced { ...queryProps( handpicked( picked ), setAttributes ) } /> );

		expect( screen.queryByRole( 'status' ) ).not.toBeInTheDocument();
		fireEvent.click( screen.getByRole( 'button', { name: 'Add: Post 100' } ) );
		expect( setAttributes.mock.calls[ 0 ][ 0 ].metadata.rtCarousel.ids ).toHaveLength( MAX_HANDPICKED );

		setAttributes.mockClear();
		rerender( <Enhanced { ...queryProps( handpicked( [ ...picked, 100 ] ), setAttributes ) } /> );
		const add = screen.getByRole( 'button', { name: 'Add: Post 101' } );
		expect( add ).toHaveAttribute( 'aria-disabled', 'true' );
		fireEvent.click( add );
		expect( setAttributes ).not.toHaveBeenCalled();
		expect( screen.getByRole( 'status' ) ).toHaveTextContent( /up to 20 posts/ );
		expect( add ).toHaveAttribute( 'aria-describedby', screen.getByRole( 'status' ).id );
	} );

	it( 'keeps unavailable picks removable and counted toward the cap', () => {
		const setAttributes = jest.fn();
		mockEntities( [ post( 1 ) ] );
		render( <Enhanced { ...queryProps( handpicked( [ 1, 99 ] ), setAttributes ) } /> );

		const rows = screen.getAllByRole( 'listitem' );
		expect( rows.some( ( r ) => /Unavailable post \(ID 99\)/.test( r.textContent ?? '' ) ) ).toBe( true );
		expect( screen.getByText( '2 post selected' ) ).toBeInTheDocument();
		fireEvent.click( screen.getByRole( 'button', { name: 'Remove: Unavailable post (ID 99)' } ) );
		expect( setAttributes.mock.calls[ 0 ][ 0 ].metadata.rtCarousel.ids ).toEqual( [ 1 ] );
	} );

	it( 'counts stale IDs toward the limit', () => {
		mockEntities( [] );
		const ids = Array.from( { length: MAX_HANDPICKED }, ( _, i ) => i + 1 );
		render( <Enhanced { ...queryProps( handpicked( ids ) ) } /> );
		expect( screen.getByRole( 'status' ) ).toBeInTheDocument();
	} );

	it( 'shows a spinner while results load', () => {
		mockStores.entityRecords.mockReturnValue( null );
		render( <Enhanced { ...queryProps( handpicked( [] ) ) } /> );
		expect( screen.getByTestId( 'spinner' ) ).toBeInTheDocument();
	} );
} );

describe( 'Post Template preview', () => {
	const templateProps = { name: 'core/post-template', clientId: 'pt', attributes: {}, setAttributes: jest.fn(), context: { queryId: 1, query: { perPage: 2, search: 'x', exclude: [ 4 ] } } };
	const context = () => JSON.parse( screen.getByTestId( 'core-edit' ).textContent ?? 'null' );

	it( 'passes Latest props through unchanged, with and without metadata', () => {
		mockStores.queryAttributes = { query: { postType: 'post' } };
		const { unmount } = render( <Enhanced { ...templateProps } /> );
		expect( BlockEdit.mock.calls[ 0 ]![ 0 ].context ).toBe( templateProps.context );
		unmount();

		mockStores.queryAttributes = { metadata: { rtCarousel: { mode: 'latest', ids: [ 1 ] } } };
		render( <Enhanced { ...templateProps } /> );
		expect( BlockEdit.mock.calls[ 1 ]![ 0 ].context ).toBe( templateProps.context );
	} );

	it( 'passes through when there is no Query ancestor', () => {
		// Attributes would trigger the override if the ancestor guard were missing.
		mockStores.queryParents = [];
		mockStores.queryAttributes = handpicked( [ 7 ] );
		render( <Enhanced { ...templateProps } /> );
		expect( BlockEdit.mock.calls[ 0 ]![ 0 ].context ).toBe( templateProps.context );
	} );

	it( 'overrides the query for picks, in order, ignoring other filters', () => {
		mockStores.queryAttributes = handpicked( [ 7, 3, 9 ] );
		mockEntities( [ post( 3 ), post( 7 ), post( 9 ) ] );
		render( <Enhanced { ...templateProps } /> );

		expect( context() ).toEqual( {
			queryId: 1,
			query: {
				postType: 'post',
				include: [ 7, 3, 9 ],
				orderBy: 'include',
				perPage: 3,
				inherit: false,
				offset: 0,
				status: 'publish',
				context: 'view',
			},
		} );
	} );

	it( 'works regardless of carousel ancestry', () => {
		mockStores.parents = [];
		mockStores.queryAttributes = handpicked( [ 1 ] );
		mockEntities( [ post( 1 ) ] );
		render( <Enhanced { ...templateProps } /> );
		expect( context().query.include ).toEqual( [ 1 ] );
	} );

	it( 'uses the Query post type and previews only the first 20 stored IDs', () => {
		mockStores.queryAttributes = handpicked( Array.from( { length: 30 }, ( _, i ) => i + 1 ), {}, 'page' );
		mockEntities( [ post( 1 ) ] );
		render( <Enhanced { ...templateProps } /> );

		expect( context().query.postType ).toBe( 'page' );
		expect( context().query.include ).toHaveLength( MAX_HANDPICKED );
		expect( context().query.perPage ).toBe( MAX_HANDPICKED );
	} );

	it( 'asks for published posts of the picked type to find survivors', () => {
		mockStores.queryAttributes = handpicked( [ 7, 3, 9 ] );
		mockEntities( [ post( 7 ), post( 9 ) ] );
		render( <Enhanced { ...templateProps } /> );

		expect( mockStores.entityRecords ).toHaveBeenCalledWith(
			'postType',
			'post',
			expect.objectContaining( { include: [ 7, 3, 9 ], status: 'publish', orderby: 'include' } ),
		);
		// Core renders the surviving cards; the query still names every pick.
		expect( screen.getByTestId( 'core-edit' ) ).toBeInTheDocument();
	} );

	it( 'shows a prompt, not core preview, when nothing is picked', () => {
		mockStores.queryAttributes = handpicked( [] );
		render( <Enhanced { ...templateProps } /> );

		expect( screen.getByText( 'Choose posts to show in this carousel' ) ).toBeInTheDocument();
		expect( BlockEdit ).not.toHaveBeenCalled();
	} );

	it( 'shows an empty-state prompt when every pick is unavailable', () => {
		mockStores.queryAttributes = handpicked( [ 7, 3, 9 ] );
		mockEntities( [] );
		render( <Enhanced { ...templateProps } /> );

		expect( screen.getByText( 'No selected published posts are available' ) ).toBeInTheDocument();
		expect( BlockEdit ).not.toHaveBeenCalled();
	} );

	it( 'keeps core preview while survivors are loading', () => {
		mockStores.queryAttributes = handpicked( [ 7 ] );
		mockStores.entityRecords.mockReturnValue( null );
		render( <Enhanced { ...templateProps } /> );
		expect( screen.getByTestId( 'core-edit' ) ).toBeInTheDocument();
	} );
} );

// Handpicked metadata with fill settings; `fill` merges extra rtCarousel keys.
const filled = ( ids: number[], fill: Record<string, unknown> = { fillWithLatest: true }, postType = 'post' ) => ( {
	query: { postType },
	metadata: { name: 'Keep me', rtCarousel: { mode: 'handpicked', ids, postType, ...fill } },
} );

/**
 * Entity mock for fill: `include` requests resolve against `published` (in request order),
 * everything else is a "latest" request honoring `per_page` and `exclude`.
 *
 * @param {Post[]} published Published picks that exist.
 * @param {Post[]} latest    Newest published posts, newest first.
 */
function mockFillEntities( published: Post[], latest: Post[] ) {
	mockStores.entityRecords.mockImplementation(
		( _k: string, _type: string, query: { include?: number[]; exclude?: number[]; per_page?: number } ) => {
			if ( query.include ) {
				return query.include.map( ( id ) => published.find( ( p ) => p.id === id ) ).filter( Boolean );
			}
			return latest.filter( ( p ) => ! query.exclude?.includes( p.id ) ).slice( 0, query.per_page );
		},
	);
}

describe( 'normalizeFillCount', () => {
	it.each( [
		[ undefined, 6 ],
		[ 1, 1 ],
		[ 20, 20 ],
		[ 0, 1 ],
		[ -4, 1 ],
		[ 21, 20 ],
		[ 1e9, 20 ],
		[ 4.0, 4 ],
		[ 2.5, 6 ],
		[ '4', 6 ],
		[ 'abc', 6 ],
		[ true, 6 ],
		[ null, 6 ],
		[ [ 3 ], 6 ],
		[ NaN, 6 ],
		[ Infinity, 6 ],
	] )( '%p becomes %p', ( value, expected ) => {
		expect( normalizeFillCount( value ) ).toBe( expected );
	} );
} );

describe( 'Fill with latest posts: settings', () => {
	const fillRawMeta = ( setAttributes: jest.Mock ) => setAttributes.mock.calls.at( -1 )[ 0 ].metadata;

	it( 'is off by default, with no number control and no writes', () => {
		const setAttributes = jest.fn();
		mockEntities( [ post( 1 ) ] );
		render( <Enhanced { ...queryProps( handpicked( [ 1 ] ), setAttributes ) } /> );

		expect( screen.getByRole( 'switch', { name: 'Fill with latest posts' } ) ).not.toBeChecked();
		expect( screen.queryByLabelText( 'Number of posts' ) ).not.toBeInTheDocument();
		expect( setAttributes ).not.toHaveBeenCalled();
	} );

	it( 'is hidden outside Handpicked mode', () => {
		render( <Enhanced { ...queryProps( { query: { postType: 'post' } } ) } /> );
		expect( screen.queryByRole( 'switch', { name: 'Fill with latest posts' } ) ).not.toBeInTheDocument();
	} );

	it( 'turning fill on keeps IDs, mode, post type and unrelated metadata, without materializing a count', () => {
		const setAttributes = jest.fn();
		mockEntities( [ post( 1 ), post( 2 ) ] );
		render( <Enhanced { ...queryProps( handpicked( [ 1, 2 ] ), setAttributes ) } /> );

		fireEvent.click( screen.getByRole( 'switch', { name: 'Fill with latest posts' } ) );
		expect( fillRawMeta( setAttributes ) ).toEqual( {
			name: 'Keep me',
			rtCarousel: { mode: 'handpicked', ids: [ 1, 2 ], postType: 'post', fillWithLatest: true },
		} );
	} );

	it( 'shows a labelled count with default 6 only while fill is on, with 1-20 bounds', () => {
		mockEntities( [] );
		render( <Enhanced { ...queryProps( filled( [] ) ) } /> );

		const count = screen.getByLabelText( 'Number of posts' );
		expect( count ).toHaveValue( 6 );
		expect( count ).toHaveAttribute( 'min', '1' );
		expect( count ).toHaveAttribute( 'max', '20' );
	} );

	it( 'count changes clamp to 1-20 and keep everything else', () => {
		const setAttributes = jest.fn();
		render( <Enhanced { ...queryProps( filled( [ 4 ], { fillWithLatest: true, numberOfPosts: 3 } ), setAttributes ) } /> );

		const count = screen.getByLabelText( 'Number of posts' );
		const countOf = () => fillRawMeta( setAttributes ).rtCarousel.numberOfPosts;

		fireEvent.change( count, { target: { value: '9' } } );
		expect( countOf() ).toBe( 9 );
		fireEvent.change( count, { target: { value: '0' } } );
		expect( countOf() ).toBe( 1 );
		fireEvent.change( count, { target: { value: '99' } } );
		expect( countOf() ).toBe( 20 );
		fireEvent.change( count, { target: { value: '' } } );
		expect( countOf() ).toBe( 6 );
		expect( fillRawMeta( setAttributes ) ).toEqual( {
			name: 'Keep me',
			rtCarousel: { mode: 'handpicked', ids: [ 4 ], postType: 'post', fillWithLatest: true, numberOfPosts: 6 },
		} );
	} );

	it.each( [
		[ 0, 1 ],
		[ 21, 20 ],
		[ 'abc', 6 ],
		[ 2.5, 6 ],
	] )( 'normalizes a stored count of %p to %p for display', ( stored, expected ) => {
		render( <Enhanced { ...queryProps( filled( [], { fillWithLatest: true, numberOfPosts: stored } ) ) } /> );
		expect( screen.getByLabelText( 'Number of posts' ) ).toHaveValue( expected );
	} );

	it( 'keeps fill settings when picks change, moves, mode switches or the count is retained while off', () => {
		const setAttributes = jest.fn();
		mockEntities( [ post( 1 ), post( 2 ), post( 3 ) ] );
		const attrs = filled( [ 1, 2 ], { fillWithLatest: false, numberOfPosts: 9 } );
		render( <Enhanced { ...queryProps( attrs, setAttributes ) } /> );

		const rt = () => fillRawMeta( setAttributes ).rtCarousel;
		fireEvent.click( screen.getByRole( 'button', { name: 'Add: Post 3' } ) );
		expect( rt() ).toEqual( { mode: 'handpicked', ids: [ 1, 2, 3 ], postType: 'post', fillWithLatest: false, numberOfPosts: 9 } );
		fireEvent.click( screen.getByRole( 'button', { name: 'Move down: Post 1' } ) );
		expect( rt() ).toMatchObject( { ids: [ 2, 1 ], fillWithLatest: false, numberOfPosts: 9 } );
		fireEvent.click( screen.getByRole( 'button', { name: 'Remove: Post 1' } ) );
		expect( rt() ).toMatchObject( { ids: [ 2 ], numberOfPosts: 9 } );
		fireEvent.click( screen.getByLabelText( 'Latest posts' ) );
		expect( rt() ).toEqual( { mode: 'latest', ids: [ 1, 2 ], postType: 'post', fillWithLatest: false, numberOfPosts: 9 } );
	} );

	it( 'keeps fill settings when the post type changes and clears only the picks', () => {
		const setAttributes = jest.fn();
		const attrs = { ...filled( [ 1, 2 ], { fillWithLatest: true, numberOfPosts: 8 } ), query: { postType: 'page' } };
		render( <Enhanced { ...queryProps( attrs, setAttributes ) } /> );

		expect( setAttributes ).toHaveBeenCalledWith( {
			metadata: {
				name: 'Keep me',
				rtCarousel: { mode: 'handpicked', ids: [], postType: 'page', fillWithLatest: true, numberOfPosts: 8 },
			},
		} );
	} );

	it( 'does not touch the five-suggestion list or the 20-pick cap', () => {
		mockEntities( [], [ post( 100 ) ] );
		render( <Enhanced { ...queryProps( filled( [], { fillWithLatest: true, numberOfPosts: 20 } ) ) } /> );
		expect( mockStores.entityRecords ).toHaveBeenCalledWith( 'postType', 'post', {
			status: 'publish',
			per_page: 5,
			order: 'desc',
			orderby: 'date',
		} );
	} );
} );

describe( 'Fill with latest posts: preview', () => {
	const templateProps = { name: 'core/post-template', clientId: 'pt', attributes: {}, setAttributes: jest.fn(), context: { queryId: 1, query: { perPage: 2, search: 'x', exclude: [ 4 ] } } };
	const include = () => JSON.parse( screen.getByTestId( 'core-edit' ).textContent ?? 'null' ).query;
	const latest = [ post( 90 ), post( 80 ), post( 70 ), post( 60 ), post( 50 ), post( 40 ), post( 30 ) ];

	it( 'composes survivors in saved order, then newest non-picks (default 6)', () => {
		mockStores.queryAttributes = filled( [ 2, 1 ] );
		mockFillEntities( [ post( 1 ), post( 2 ) ], [ post( 2 ), ...latest ] );
		render( <Enhanced { ...templateProps } /> );

		expect( include() ).toEqual( {
			postType: 'post',
			include: [ 2, 1, 90, 80, 70, 60 ],
			orderBy: 'include',
			perPage: 6,
			inherit: false,
			offset: 0,
			status: 'publish',
			context: 'view',
		} );
		expect( mockStores.entityRecords ).toHaveBeenCalledWith( 'postType', 'post', {
			status: 'publish',
			per_page: 4,
			order: 'desc',
			orderby: 'date',
			exclude: [ 2, 1 ],
		} );
	} );

	it( 'orders survivors by saved order even if the store returns them differently', () => {
		mockStores.queryAttributes = filled( [ 3, 1, 2 ], { fillWithLatest: true, numberOfPosts: 3 } );
		mockStores.entityRecords.mockImplementation( ( _k: string, _t: string, q: { include?: number[] } ) =>
			q.include ? [ post( 1 ), post( 2 ), post( 3 ) ] : [],
		);
		render( <Enhanced { ...templateProps } /> );
		expect( include().include ).toEqual( [ 3, 1, 2 ] );
	} );

	it( 'truncates extra picks to the count without requesting fill', () => {
		mockStores.queryAttributes = filled( [ 1, 2, 3, 4, 5 ], { fillWithLatest: true, numberOfPosts: 3 } );
		mockFillEntities( [ post( 1 ), post( 2 ), post( 3 ), post( 4 ), post( 5 ) ], latest );
		render( <Enhanced { ...templateProps } /> );

		expect( include().include ).toEqual( [ 1, 2, 3 ] );
		expect( include().perPage ).toBe( 3 );
		const fillRequests = mockStores.entityRecords.mock.calls.filter( ( c ) => ! c[ 2 ].include );
		expect( fillRequests ).toHaveLength( 0 );
	} );

	it( 'replaces an unavailable pick from the fill, excluding every pick', () => {
		mockStores.queryAttributes = filled( [ 1, 2, 3 ], { fillWithLatest: true, numberOfPosts: 3 } );
		// 2 is draft/deleted.
		mockFillEntities( [ post( 1 ), post( 3 ) ], latest );
		render( <Enhanced { ...templateProps } /> );

		expect( include().include ).toEqual( [ 1, 3, 90 ] );
		expect( mockStores.entityRecords ).toHaveBeenCalledWith(
			'postType',
			'post',
			expect.objectContaining( { per_page: 1, exclude: [ 1, 2, 3 ] } ),
		);
	} );

	it( 'shows the newest N when nothing is picked, without an include-less picks request', () => {
		mockStores.queryAttributes = filled( [], { fillWithLatest: true, numberOfPosts: 3 } );
		mockFillEntities( [], latest );
		render( <Enhanced { ...templateProps } /> );

		expect( include().include ).toEqual( [ 90, 80, 70 ] );
		expect( screen.queryByText( 'Choose posts to show in this carousel' ) ).not.toBeInTheDocument();
		const fill = mockStores.entityRecords.mock.calls.find( ( c ) => ! c[ 2 ].include );
		expect( fill[ 2 ] ).not.toHaveProperty( 'exclude' );
	} );

	it( 'shows fewer slides when fewer posts exist', () => {
		mockStores.queryAttributes = filled( [ 1 ], { fillWithLatest: true, numberOfPosts: 10 } );
		mockFillEntities( [ post( 1 ) ], [ post( 1 ), post( 2 ) ] );
		render( <Enhanced { ...templateProps } /> );

		expect( include().include ).toEqual( [ 1, 2 ] );
		expect( include().perPage ).toBe( 2 );
	} );

	it( 'shows an empty prompt, never include: [], when nothing is published', () => {
		mockStores.queryAttributes = filled( [ 1 ], { fillWithLatest: true, numberOfPosts: 4 } );
		mockFillEntities( [], [] );
		render( <Enhanced { ...templateProps } /> );

		expect( screen.getByText( 'No published posts are available' ) ).toBeInTheDocument();
		expect( BlockEdit ).not.toHaveBeenCalled();
	} );

	it( 'shows only a spinner while loading, never previous or partial results', () => {
		mockStores.queryAttributes = filled( [ 1 ], { fillWithLatest: true, numberOfPosts: 4 } );
		mockStores.entityRecords.mockImplementation( ( _k: string, _t: string, q: { include?: number[] } ) => ( q.include ? [ post( 1 ) ] : null ) );
		render( <Enhanced { ...templateProps } /> );

		expect( screen.getByTestId( 'spinner' ) ).toBeInTheDocument();
		expect( BlockEdit ).not.toHaveBeenCalled();

		mockStores.entityRecords.mockImplementation( () => null );
		BlockEdit.mockClear();
		render( <Enhanced { ...templateProps } /> );
		expect( BlockEdit ).not.toHaveBeenCalled();
	} );

	it( 'applies the clamped count to malformed stored values', () => {
		mockStores.queryAttributes = filled( [], { fillWithLatest: true, numberOfPosts: 99 } );
		mockFillEntities( [], Array.from( { length: 30 }, ( _, i ) => post( 1000 - i ) ) );
		render( <Enhanced { ...templateProps } /> );
		expect( include().include ).toHaveLength( 20 );
	} );

	it( 'works for a Query outside a carousel and updates live with settings', () => {
		mockStores.parents = [];
		mockStores.queryAttributes = filled( [ 1 ], { fillWithLatest: true, numberOfPosts: 2 } );
		mockFillEntities( [ post( 1 ) ], latest );
		const { rerender } = render( <Enhanced { ...templateProps } /> );
		expect( include().include ).toEqual( [ 1, 90 ] );

		mockStores.queryAttributes = filled( [ 1 ], { fillWithLatest: true, numberOfPosts: 3 } );
		rerender( <Enhanced { ...templateProps } /> );
		expect( include().include ).toEqual( [ 1, 90, 80 ] );

		mockStores.queryAttributes = filled( [ 1 ], { fillWithLatest: false, numberOfPosts: 3 } );
		rerender( <Enhanced { ...templateProps } /> );
		expect( include().include ).toEqual( [ 1 ] );
	} );

	it( 'fill off keeps the original prompts and exact picks', () => {
		mockStores.queryAttributes = filled( [], { fillWithLatest: false } );
		render( <Enhanced { ...templateProps } /> );
		expect( screen.getByText( 'Choose posts to show in this carousel' ) ).toBeInTheDocument();
	} );

	it( 'fill off with unavailable picks keeps the unavailable prompt', () => {
		mockStores.queryAttributes = filled( [ 7 ], { fillWithLatest: false, numberOfPosts: 5 } );
		mockEntities( [] );
		render( <Enhanced { ...templateProps } /> );
		expect( screen.getByText( 'No selected published posts are available' ) ).toBeInTheDocument();
	} );

	it( 'Latest mode ignores fill settings and passes props through', () => {
		mockStores.queryAttributes = {
			query: { postType: 'post' },
			metadata: { rtCarousel: { mode: 'latest', ids: [ 1 ], postType: 'post', fillWithLatest: true, numberOfPosts: 5 } },
		};
		render( <Enhanced { ...templateProps } /> );
		expect( BlockEdit.mock.calls[ 0 ]![ 0 ].context ).toBe( templateProps.context );
	} );
} );
