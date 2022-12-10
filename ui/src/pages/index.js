import React, { useState } from "react";
import axios from "axios";
import classNames from "classnames";
import { graphql, useStaticQuery } from "gatsby";
import { Helmet } from "react-helmet";
import { SnackbarProvider } from "notistack";
import queryString from "query-string";

import Container from "@material-ui/core/Container";
import Grid from "@material-ui/core/Grid";

// Force these components to only be loaded clientside, not during SSR
const ServerCard = React.lazy(() => import("../components/ServerCard"));
const LoginButton = React.lazy(() => import("../components/LoginButton"));
import { useMountEffect } from "../util/hooks";
import CardContent from "@material-ui/core/CardContent";
import Card from "@material-ui/core/Card";

const titleOptions = [
	"GmanMan 2: Eclectic Boogaloo",
	"GmanMan: mostly harmless",
	"GmanMan Season 3",
	"GmanMan: sew much more than a fabric store",
	"GmanMan and other ores",
];
const pageRandom = Math.random();

function generatePageTitle() {
	return titleOptions[Math.floor(Math.random() * titleOptions.length)];
}

export default () => {
	const isSSR = typeof window === "undefined";
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

	const query = queryString.parse(!isSSR && location.search);
	const april1 =
		query.better ||
		(new Date().getMonth() + 1 === 4 && new Date().getDay() === 1) ||
		pageRandom < 0.02;

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
				{april1 && <script src="/april1.css" />}
			</Helmet>
			<div
				className={classNames({ marquee: april1 })}
				style={{
					marginBottom: 8,
					position: "relative",
				}}
			>
				<span>
					<img src="/icons/gmanman_gears.png" height={64} />{" "}
					<img src="/icons/gmanman_title.png" height={64} alt={siteTitle} />
					{april1 && (
						<img
							src="/con2.gif"
							style={{ position: "absolute", bottom: 0, left: 200 }}
						/>
					)}
				</span>
			</div>
			{april1 && (
				<>
					<div style={{ textAlign: "center" }}>
						{[...new Array(9)].map((i) => (
							<img key={i} src="/con4.gif" />
						))}
					</div>
					<img
						src="/con1.gif"
						style={{ position: "absolute", top: 100, right: 30 }}
					/>
					<img
						src="/con1.gif"
						style={{ position: "absolute", top: 100, left: 30 }}
					/>
				</>
			)}

			{!isSSR && (
				<React.Suspense fallback={<div />}>
					<Grid container spacing={5} component="main">
						{games
							.filter(({ id, name }) => {
								if (query.id) {
									return id === query.id;
								}
								if (query.name) {
									return name.toLowerCase().includes(query.name.toLowerCase());
								}
								return true;
							})
							.map(({ game, id, name, ...gameProps }) => (
								<Grid item key={id} xs={12} sm={6} md={4}>
									<ServerCard
										game={game}
										id={id}
										title={name}
										icon={`/icons/${game}.png`}
										baseUrl={`${gatewayUrl}${id}/`}
										className={query.id ? "game-card--big" : ""}
										{...gameProps}
									/>
								</Grid>
							))}

						{april1 && (
							<Grid item xs={12} sm={6} md={4}>
								<Card className={`game-card`}>
									<CardContent>
										<img src="/con3.gif" />
									</CardContent>
								</Card>
							</Grid>
						)}
					</Grid>
					<LoginButton gatewayUrl={gatewayUrl} />
				</React.Suspense>
			)}
		</Container>
	);
	renderedContainer = <SnackbarProvider>{renderedContainer}</SnackbarProvider>;
	return renderedContainer;
};
