module.exports = {
	siteMetadata: {
		title: "Gman Server Manager",
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
