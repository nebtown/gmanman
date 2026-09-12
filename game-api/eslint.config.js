const js = require("@eslint/js");
const n = require("eslint-plugin-n");

module.exports = [
	js.configs.recommended,
	n.configs["flat/recommended-script"],
	{
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: "commonjs",
		},
		rules: {
			"n/exports-style": ["error", "module.exports"],
			"n/file-extension-in-import": ["error", "always"],
			"n/prefer-global/buffer": ["error", "always"],
			"n/prefer-global/console": ["error", "always"],
			"n/prefer-global/process": ["error", "always"],
			"n/prefer-global/url-search-params": ["error", "always"],
			"n/prefer-global/url": ["error", "always"],
			"n/prefer-promises/dns": "warn",
			"n/prefer-promises/fs": "warn",
			"no-unused-vars": 0,
			"no-mixed-spaces-and-tabs": 0,
			"no-useless-escape": "warn",
		},
	},
];
