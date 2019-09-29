module.exports = {
	siteMetadata: {
		title: "Gman Server Manager",
	},
	pathPrefix: "/gmanman",
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
				name: `srcData`,
				path: `${__dirname}/src/data/`,
			},
		},
	],
};
