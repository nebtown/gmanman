import React from "react";
import { graphql, useStaticQuery } from "gatsby";

import Container from "@material-ui/core/Container";
import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";
import ServerCard from "../components/ServerCard";

export default () => {
	const {
		allGamesJson: { nodes: games },
		site: {
			siteMetadata: { title: siteTitle },
		},
	} = useStaticQuery(
		graphql`
			query {
				allGamesJson {
					nodes {
						name
						url
					}
				}
				site {
					siteMetadata {
						title
					}
				}
			}
		`
	);

	return (
		<Container>
			<Typography variant="h3" color="inherit" gutterBottom>
				{siteTitle}
			</Typography>

			<Grid container spacing={5} component="main">
				{games.map(({ name, url }) => (
					<Grid item key={name} xs={12} sm={6} md={4}>
						<ServerCard key={name} title={name} url={url} />
					</Grid>
				))}
			</Grid>
		</Container>
	);
};
