/**
 * ESLint flat configuration for rtCarousel plugin.
 *
 * Port of the former .eslintrc.json (ESLint 10 no longer reads eslintrc files).
 * Uses the formatting-only WordPress preset, so Prettier is not enforced.
 *
 * @see https://eslint.org/docs/latest/use/configure/migration-guide
 * @see https://github.com/WordPress/gutenberg/blob/HEAD/packages/scripts/docs/vitest-migration.md#3-keep-jest-lint-rules
 */

const wpPlugin = require( '@wordpress/eslint-plugin' );
const importPlugin = require( 'eslint-plugin-import' );
const eslintComments = require( '@eslint-community/eslint-plugin-eslint-comments/configs' );
const jestPlugin = require( 'eslint-plugin-jest' );
const tsParser = require( '@typescript-eslint/parser' );
const tsPlugin = require( '@typescript-eslint/eslint-plugin' );
const globals = require( 'globals' );

module.exports = [
	// Formerly .eslintignore
	{
		ignores: [
			'**/*.min.js',
			'**/node_modules/**',
			'**/vendor/**',
			'**/build/**',
			'**/coverage/**',
		],
	},

	...wpPlugin.configs[ 'recommended-with-formatting' ],
	// The WordPress preset already registers the import plugin, so only
	// the rules and settings of these presets are applied here.
	{
		rules: importPlugin.flatConfigs.recommended.rules,
	},
	{
		settings: importPlugin.flatConfigs.typescript.settings,
		rules: importPlugin.flatConfigs.typescript.rules,
	},
	eslintComments.recommended,

	{
		languageOptions: {
			globals: {
				...globals.browser,
				_: true,
				IsPrefersReducedMotion: true,
			},
		},
		settings: {
			'import/resolver': {
				node: {
					extensions: [ '.js', '.jsx', '.ts', '.tsx' ],
				},
			},
		},
		rules: {
			'@eslint-community/eslint-comments/no-unlimited-disable': 'error',
			'jsdoc/check-indentation': 'error',
			'no-shadow': 'warn',
			'@wordpress/no-unsafe-wp-apis': 'warn',
			// WordPress surfaces snake_case keys and globals; allow them
			camelcase: 'off',
		},
	},

	{
		files: [ '**/*.{ts,tsx}' ],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				ecmaFeatures: { jsx: true },
				sourceType: 'module',
				project: [ './tsconfig.json', './tests/js/tsconfig.json' ],
			},
		},
		plugins: {
			'@typescript-eslint': tsPlugin,
		},
		rules: {
			'no-undef': 'off',
			'no-unused-vars': 'off',
			'no-shadow': 'off',
			'@typescript-eslint/consistent-type-imports': 'error',
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/no-shadow': 'warn',
			'@typescript-eslint/no-unnecessary-type-assertion': 'warn',
			'@typescript-eslint/no-unused-vars': 'error',
		},
	},

	{
		files: [ '**/*.d.ts' ],
		languageOptions: {
			parser: tsParser,
		},
		rules: {
			'no-undef': 'off',
			'import/no-unresolved': 'off',
			'@typescript-eslint/triple-slash-reference': 'off',
		},
	},

	{
		...jestPlugin.configs[ 'flat/recommended' ],
		files: [
			'**/__tests__/**/*.js',
			'**/test/*.js',
			'**/?(*.)test.js',
			'tests/js/**/*.js',
		],
	},

	{
		files: [ 'tests/js/jest.config.js' ],
		rules: {
			'jest/unbound-method': 'off',
		},
	},
];
