module.exports = {
	env: {
		es6: true,
		node: true,
	},
	extends: ["eslint:recommended", "plugin:node/recommended"],
	plugins: ["node"],
	rules: {
		"node/exports-style": ["error", "module.exports"],
		"node/file-extension-in-import": ["error", "always"],
		"node/prefer-global/buffer": ["error", "always"],
		"node/prefer-global/console": ["error", "always"],
		"node/prefer-global/process": ["error", "always"],
		"node/prefer-global/url-search-params": ["error", "always"],
		"node/prefer-global/url": ["error", "always"],
		"node/prefer-promises/dns": "warn",
		"node/prefer-promises/fs": "warn",
		"no-unused-vars": 0,
		"no-mixed-spaces-and-tabs": 0,
		"no-useless-escape": "warn",
	},
};
