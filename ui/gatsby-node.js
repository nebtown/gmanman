exports.onCreateBabelConfig = ({ actions }) => {
	actions.setBabelPlugin({
		name: require.resolve("@babel/plugin-proposal-optional-chaining"),
	});
};

exports.onCreatePage = async ({ page, actions }) => {
	const { createPage } = actions;

	// page.matchPath is a special key that's used for matching pages
	// only on the client.
	if (page.path.match(/^\/ss/)) {
		page.matchPath = `/ss/:name`;

		createPage(page);
	}
};
