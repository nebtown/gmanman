import React, { useState } from "react";
import PropTypes from "prop-types";

import { useLocalStorage } from "@rehooks/local-storage";

import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";

import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Grid from "@mui/material/Grid";

import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";

import { useAuthedAxios } from "../util/useAuthedAxios";
import { css } from "@emotion/react";
import { TextField } from "@mui/material";
import { useStaticQuery, graphql } from "gatsby";
import Autocomplete from "@mui/material/Autocomplete";

const gameApiOptions = [
	{
		label: "Valheim",
		code: "valheim",
	},
];

EditCard.propTypes = {
	className: PropTypes.string,
	game: PropTypes.string,
	gameId: PropTypes.string,
	title: PropTypes.string.isRequired,
	editing: PropTypes.bool,
	setEditing: PropTypes.func,
	active: PropTypes.bool,
};

export default function EditCard({
	className,
	game,
	gameId,
	title,
	editing,
	setEditing,
	active,
}) {
	const {
		site: {
			siteMetadata: { gatewayUrl },
		},
	} = useStaticQuery(
		graphql`
			query {
				site {
					siteMetadata {
						gatewayUrl
					}
				}
			}
		`
	);

	const [isAdmin] = useLocalStorage("isAdmin");
	const authedAxios = useAuthedAxios();

	const [loading, setLoading] = useState(true);
	const [settings, setSettings] = useState({
		isNew: true,
		game,
		gameId: gameId,
		name: title,
		gamePassword: "",
		// gamePort: 0,
		// rconPort: 0,
		// apiPort: 0,
	});
	const patchSettings = React.useCallback((patch) => {
		setSettings((settings) => ({ ...settings, ...patch }));
	}, []);

	React.useEffect(() => {
		if (!gameId || !isAdmin || !active) {
			setLoading(false);
			return;
		}
		const fetchSpawningPoolData = async () => {
			setLoading(true);
			try {
				const {
					data: { gameApis },
				} = await authedAxios.get(`${gatewayUrl}/spawningPool`);
				setSettings(
					(defaultSettings) =>
						gameApis.find((gameApi) => gameApi.gameId === gameId) ||
						defaultSettings
				);
				setLoading(false);
			} catch (e) {
				console.warn(`Failed to fetch /spawningPool ${e.message}`);
			}
		};
		void fetchSpawningPoolData();
	}, [gameId, isAdmin, active]);

	async function submitSave() {
		await authedAxios.put(`${gatewayUrl}/spawningPool/`, {
			gameApi: settings,
		});
		setEditing(false);
	}

	if (!isAdmin) {
		return null;
	}

	return (
		<Card raised className={`game-card ${className}`}>
			<CardHeader
				title={title}
				action={
					<IconButton aria-label="close" onClick={() => setEditing(false)}>
						<CloseIcon />
					</IconButton>
				}
			/>
			<CardContent
				style={{ minHeight: "96px", paddingTop: 0, paddingBottom: 0 }}
			>
				<Grid container direction="column">
					<Autocomplete
						id="game"
						value={settings.game || ""}
						onChange={(event, newValue) => {
							patchSettings({
								game: newValue.code,
								gameId:
									settings.gameId ||
									newValue.code + Math.ceil(Math.random() * 1000),
								name: settings.name || newValue.label,
							});
						}}
						isOptionEqualToValue={(option, value) => {
							return value === option.code;
						}}
						options={[
							...gameApiOptions,
							...(!settings.game ||
							gameApiOptions.find(({ code }) => settings.game === code)
								? []
								: [
										{
											label: settings.game,
											code: settings.game,
										},
								  ]),
						]}
						disablePortal
						renderInput={(params) => <TextField {...params} label="Game" />}
						margin="dense"
						size="small"
						required
						disabled={!!gameId || loading}
					/>
					<TextField
						id="gameId"
						label="ID"
						value={settings.gameId || ""}
						onChange={(event) => patchSettings({ gameId: event.target.value })}
						margin="dense"
						size="small"
						required
						disabled={!!gameId || loading}
					/>
					<TextField
						id="name"
						label="Name"
						value={settings.name || ""}
						onChange={(event) => patchSettings({ name: event.target.value })}
						margin="dense"
						size="small"
						required
						disabled={loading}
					/>
					<TextField
						id="gamePassword"
						label="Password"
						value={settings.gamePassword || ""}
						onChange={(event) =>
							patchSettings({ gamePassword: event.target.value })
						}
						margin="dense"
						size="small"
						disabled={loading}
					/>
					<TextField
						id="gamePort"
						label="Game Port"
						placeholder="<default>"
						value={settings.gamePort || ""}
						onChange={(event) =>
							patchSettings({ gamePort: event.target.value })
						}
						type="number"
						margin="dense"
						size="small"
						disabled={loading}
					/>
					<TextField
						id="rconPort"
						label="Rcon Port"
						placeholder="<default>"
						value={settings.rconPort || ""}
						onChange={(event) =>
							patchSettings({ rconPort: event.target.value })
						}
						type="number"
						margin="dense"
						size="small"
						disabled={loading}
					/>
					<TextField
						id="apiPort"
						label="Api Port"
						placeholder="<autogen>"
						value={settings.apiPort || ""}
						onChange={(event) => patchSettings({ apiPort: event.target.value })}
						type="number"
						margin="dense"
						size="small"
						disabled={loading}
					/>
				</Grid>
			</CardContent>
			<CardActions>
				<Button
					color="primary"
					css={css`
						margin-left: auto;
					`}
					onClick={submitSave}
				>
					<SaveIcon /> Save
				</Button>
			</CardActions>
		</Card>
	);
}
