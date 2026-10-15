/**
 * Escape a JSON-stringified context for safe use inside a `data-wp-context`
 * HTML attribute.
 *
 * WP's Interactivity API parses `data-wp-context` as JSON. Raw `<`, `>`, `&`,
 * `'`, `"` in any string field would break HTML parsing before JSON.parse runs.
 * The browser decodes HTML entities first, then the API runs JSON.parse on the
 * result — so this encoding round-trips correctly.
 *
 * Order matters: `&` must be escaped first to avoid double-encoding the
 * entities emitted for the other characters.
 *
 * @param {string} value - Raw JSON.stringify output.
 * @return {string} HTML-attribute-safe string.
 */
export function encodeContext( value: string ): string {
	return value
		.replace( /&/g, '&amp;' )
		.replace( /</g, '&lt;' )
		.replace( />/g, '&gt;' )
		.replace( /"/g, '&quot;' )
		.replace( /'/g, '&#39;' );
}
