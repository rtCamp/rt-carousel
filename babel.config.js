/**
 * WordPress dependencies
 */
// @ts-ignore
const defaultConfig = require( '@wordpress/babel-preset-default' );

/**
 * @param {import('@babel/core').ConfigAPI} api
 */
module.exports = function( api ) {
	const config = defaultConfig( api );

	return {
		...config,
		plugins: [
			...config.plugins,
			// Add your own plugins here
		],
		sourceMaps: true,
		env: {
			production: {
				plugins: [
					...config.plugins,
					// Add your own plugins here
				],
			},
		},
	};
};
