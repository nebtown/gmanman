module.exports = {
	env: {
		browser: true,
		es6: true,
	},
	extends: ["eslint:recommended", "plugin:react/recommended"],
	parser: "babel-eslint",
	parserOptions: {
		ecmaVersion: 8,
		ecmaFeatures: {
			experimentalObjectRestSpread: true,
			jsx: true,
		},
		sourceType: "module",
	},
	plugins: ["react", "react-hooks"],
	rules: {
		"react/display-name": 0,
		"react/no-unused-prop-types": "warn",
		"react-hooks/rules-of-hooks": "error",
		"react-hooks/exhaustive-deps": "warn",
		"no-unused-vars": "warn",
	},
	settings: {
		react: {
			version: "detect",
		},
	},
};
