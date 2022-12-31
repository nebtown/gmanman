import React, { useEffect, useState } from "react";
import axios from "axios";
import classNames from "classnames";
import { graphql, useStaticQuery } from "gatsby";
import { SnackbarProvider } from "notistack";
import queryString from "query-string";

import { ThemeProvider } from "@mui/material/styles";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import CardContent from "@mui/material/CardContent";
import Card from "@mui/material/Card";

// Force these components to only be loaded clientside, not during SSR
const ServerCard = React.lazy(() => import("../components/ServerCard"));
const LoginButton = React.lazy(() => import("../components/LoginButton"));
const CreateGameButton = React.lazy(() =>
	import("../components/CreateGameButton")
);
import { useMountEffect } from "../util/hooks";

import theme from "../theme";
import EditModeToggle from "./../components/EditModeToggle";
import { useLocalStorage } from "@rehooks/local-storage";
import { useAuthedAxios } from "./../util/useAuthedAxios";
import { Alert } from "@mui/material";

const titleOptions = [
	"GmanMan 2: Eclectic Boogaloo",
	"GmanMan: mostly harmless",
	"GmanMan Season 4",
	"GmanMan: sew much more than a fabric store",
	"GmanMan and other ores",
	"GmanMan: safer than ChatGPT!",
	"GmanMan: non-judgemental edition",
];
const pageRandom = Math.random();

function generatePageTitle() {
	return titleOptions[Math.floor(Math.random() * titleOptions.length)];
}

export function Head() {
	const isSSR = typeof window === "undefined";
	const query = queryString.parse(!isSSR && location.search);
	const april1 =
		query.better ||
		(new Date().getMonth() + 1 === 4 && new Date().getDay() === 1) ||
		pageRandom < 0.02;
	return (
		<>
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
		</>
	);
}

const GmanmanPage = () => {
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
	const authedAxios = useAuthedAxios();

	const [editMode, setEditMode] = useLocalStorage("editMode");
	const [errors, setErrors] = useState([]);
	function addError(label, severity) {
		setErrors((errors) => [
			...errors.filter((error) => error.label !== label),
			{ label, severity, timeout: Date.now() + 5000 },
		]);
	}
	const [games, setGames] = useState([]);
	const [spawningPoolApis, setSpawningPoolApis] = useState([]);
	async function updateRegisteredGames() {
		setErrors((errors) => errors.filter(({ timeout }) => timeout > Date.now()));
		if (document.hidden) {
			return;
		}
		try {
			const { data } = await axios.get(`${gatewayUrl}register/`);
			setGames(data.games);
		} catch (e) {
			console.error("Get /gateway/register/ Error: ", e);
			addError(
				"Unable to contact Gateway API, it probably needs restarting :("
			);
			return;
		}
	}
	useMountEffect(() => {
		updateRegisteredGames();
		setInterval(updateRegisteredGames, 10 * 1000);
	});
	useEffect(() => {
		async function fetchSpawningPoolData() {
			const { data: spawningPoolData } = await authedAxios.get(
				`${gatewayUrl}spawningPool/`
			);
			setSpawningPoolApis((pools) => [
				...(pools.length > 0 && pools[0].isNew ? [pools[0]] : []),
				...spawningPoolData.gameApis,
			]);
		}
		if (editMode) {
			void fetchSpawningPoolData();
		}
	}, [editMode]);

	const query = queryString.parse(!isSSR && location.search);
	const april1 =
		query.better ||
		(new Date().getMonth() + 1 === 4 && new Date().getDay() === 1) ||
		pageRandom < 0.02;

	const gameIds = games.map(({ gameId }) => gameId);
	const shownGames = [
		...spawningPoolApis
			.filter(({ gameId }) => !gameIds.includes(gameId))
			.map((poolApi) => ({ ...poolApi, apiOffline: true })), // add in offline apis
		...games,
	].filter(({ gameId, name }, index, self) => {
		if (query.id) {
			return gameId === query.id;
		}
		if (query.name) {
			return name.toLowerCase().includes(query.name.toLowerCase());
		}
		return true;
	});

	let renderedContainer = (
		<Container>
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
						{errors.map(({ label, severity }) => (
							<Grid item xs={12} key={label}>
								<Alert
									severity={severity || "error"}
									onClose={() =>
										setErrors((errors) =>
											errors.filter((error) => error.label !== label)
										)
									}
								>
									{label}
								</Alert>
							</Grid>
						))}
						{shownGames.map(({ game, gameId, name, ...gameProps }) => (
							<Grid item key={gameId || "new"} xs={12} sm={6} md={4}>
								<ServerCard
									game={game}
									gameId={gameId}
									title={name}
									icon={`/icons/${game !== "docker" ? game : gameId}.png`}
									baseUrl={`${gatewayUrl}${gameId}/`}
									className={query.id ? "game-card--big" : ""}
									setSpawningPoolApis={setSpawningPoolApis}
									usesSpawningPool={
										!!spawningPoolApis.find(
											(poolApi) => poolApi.gameId === gameId
										)
									}
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
					<Grid
						container
						spacing={1}
						style={{
							position: "absolute",
							top: "1em",
							right: "3em",
							justifyContent: "end",
							alignItems: "center",
						}}
					>
						<CreateGameButton
							gatewayUrl={gatewayUrl}
							setSpawningPoolApis={setSpawningPoolApis}
						/>
						<EditModeToggle />
						<LoginButton gatewayUrl={gatewayUrl} />
					</Grid>
				</React.Suspense>
			)}
		</Container>
	);
	renderedContainer = (
		<ThemeProvider theme={theme}>
			<SnackbarProvider>{renderedContainer}</SnackbarProvider>
		</ThemeProvider>
	);
	return renderedContainer;
};

export default GmanmanPage;
