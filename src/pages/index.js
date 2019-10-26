import React from "react";
import { graphql, useStaticQuery } from "gatsby";
import { Helmet } from "react-helmet";

import Container from "@material-ui/core/Container";
import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";
import ServerCard from "../components/ServerCard";

const titleOptions = [
	"GmanMan 2: Eclectic Boogaloo",
	"GmanMan: mostly functional",
	"GmanMan: sew much more than a fabric store",
	"GmanMan and other ores",
];

function generatePageTitle() {
	return titleOptions[Math.floor(Math.random() * titleOptions.length)];
}

export default () => {
	const {
		allGamesJson: { nodes: games },
		site: {
			siteMetadata: { title: siteTitle },
		},
		allFile: { nodes: files },
	} = useStaticQuery(
		graphql`
			query {
				allGamesJson {
					nodes {
						name
						controlUrl
						logsUrl
						updateUrl
						modsUrl
						connectIp
						icon
					}
				}
				site {
					siteMetadata {
						title
					}
				}
				allFile(filter: { relativePath: { regex: "/icons.*\\\\.png/" } }) {
					nodes {
						relativePath
						childImageSharp {
							fixed(width: 100, height: 100) {
								...GatsbyImageSharpFixed
							}
						}
					}
				}
			}
		`
	);

	return (
		<Container>
			<Helmet>
				<title>{generatePageTitle()}</title>
				<link
					rel="stylesheet"
					href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap"
				/>
				<link
					rel="stylesheet"
					href="https://fonts.googleapis.com/css?family=Roboto+Mono&display=swap"
				/>
			</Helmet>
			<Typography variant="h3" color="inherit" gutterBottom>
				{siteTitle}
			</Typography>

			<Grid container spacing={5} component="main">
				{games.map(({ name, icon, ...gameProps }) => (
					<Grid item key={name} xs={12} sm={6} md={4}>
						<ServerCard
							key={name}
							title={name}
							{...gameProps}
							icon={
								files.find(({ relativePath }) => relativePath === icon)
									?.childImageSharp?.fixed
							}
						/>
					</Grid>
				))}
			</Grid>
		</Container>
	);
};
