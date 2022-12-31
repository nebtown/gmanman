const process = require("process");

module.exports = {
	siteMetadata: {
		title: "Gman Server Manager",
		gatewayUrl:
			process.env.GMANMAN_GATEWAY_URL ||
			"https://gmanman.nebtown.info/gateway/",
	},
	plugins: [
		`gatsby-plugin-emotion`,
		{
			resolve: `gatsby-plugin-sass`,
			options: { implementation: require("sass") },
		},
		{
			resolve: "gatsby-plugin-manifest",
			options: {
				icon: "src/favicon.png",
			},
		},
		`gatsby-transformer-json`,
		{
			resolve: `gatsby-source-filesystem`,
			options: {
				name: `static`,
				path: `${__dirname}/static/`,
			},
		},
	],
};
