import React, { useState } from "react";
import axios from "axios";
import { graphql, useStaticQuery } from "gatsby";
import { Helmet } from "react-helmet";
import { SnackbarProvider } from "notistack";

import Container from "@material-ui/core/Container";
import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";
import ServerCard from "../components/ServerCard";
import { useMountEffect } from "../util/hooks";

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
		site: {
			siteMetadata: { title: siteTitle, gatewayUrl },
		},
	} = useStaticQuery(
		graphql`
			query {
				site {
					siteMetadata {
						title
						gatewayUrl
					}
				}
			}
		`
	);
	const [games, setGames] = useState([]);
	async function updateRegisteredGames() {
		if (document.hidden) {
			return;
		}
		const { data } = await axios.get(`${gatewayUrl}register/`);
		setGames(data.games);
	}
	useMountEffect(() => {
		updateRegisteredGames();
		setInterval(updateRegisteredGames, 10 * 1000);
	});

	let renderedContainer = (
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
				{games.map(({ game, id, name, ...gameProps }) => (
					<Grid item key={id} xs={12} sm={6} md={4}>
						<ServerCard
							game={game}
							id={id}
							title={name}
							icon={`/icons/${game}.png`}
							baseUrl={`${gatewayUrl}${id}/`}
							{...gameProps}
						/>
					</Grid>
				))}
			</Grid>
		</Container>
	);
	renderedContainer = <SnackbarProvider>{renderedContainer}</SnackbarProvider>;
	return renderedContainer;
};
