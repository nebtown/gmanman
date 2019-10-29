const process = require("process");

module.exports = {
	siteMetadata: {
		title: "Gman Server Manager",
		gatewayUrl:
			process.env.GMANMAN_GATEWAY_URL ||
			"https://gmanman.nebtown.info/gateway/",
	},
	plugins: [
		{
			resolve: `gatsby-plugin-material-ui`,
			options: {
				stylesProvider: {
					injectFirst: true,
				},
				disableMinification: true,
			},
		},
		`gatsby-plugin-sass`,
		`gatsby-transformer-json`,
		{
			resolve: `gatsby-source-filesystem`,
			options: {
				name: `static`,
				path: `${__dirname}/static/`,
			},
		},
		`gatsby-plugin-react-helmet`,
		`gatsby-plugin-favicon`,
	],
};
