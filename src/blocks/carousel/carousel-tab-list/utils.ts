/**
 * Convert WP preset format "var:preset|spacing|40" → "var(--wp--preset--spacing--40)".
 * WP stores preset references in this pipe-separated form inside attributes.style.*.
 * The frontend needs the resolved CSS variable form for inline styles.
 * @param {string} [value] - Raw value from attributes.style.* (may be undefined).
 */
export function resolveWpValue( value?: string ): string | undefined {
	if ( ! value ) {
		return undefined;
	}
	return value.replace( /^var:preset\|(.+)\|(.+)$/, 'var(--wp--preset--$1--$2)' );
}
