import React, { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import axios from "axios";
import { useLocalStorage } from "@rehooks/local-storage";

import useMediaQuery from "@mui/material/useMediaQuery";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";

import Button from "@mui/material/Button";
import CardMedia from "@mui/material/CardMedia";
import IconButton from "@mui/material/IconButton";
import Grid from "@mui/material/Grid";
import Tooltip from "@mui/material/Tooltip";

import StartIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import DeviceUnknownIcon from "@mui/icons-material/DeviceUnknown";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloudOffIcon from "@mui/icons-material/CloudOff";
import ExtensionIcon from "@mui/icons-material/Extension";
import FlightLandIcon from "@mui/icons-material/FlightLand";
import FlightTakeoffIcon from "@mui/icons-material/FlightTakeoff";
import PowerIcon from "@mui/icons-material/Power";
import SubjectIcon from "@mui/icons-material/Subject";
import UpdateIcon from "@mui/icons-material/SystemUpdateAlt";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import SettingsIcon from "@mui/icons-material/Settings";

import { useInterval, useMountEffect } from "../util/hooks";
import { useAuthedAxios } from "../util/useAuthedAxios";
import LogViewer from "./LogViewer";
import ModsViewer from "./ModsViewer";
import BackupsViewer from "./BackupsViewer";
import ConfirmationModal from "./ConfirmationModal";
import CardFlip from "./CardFlip";
import EditCard from "./EditCard";

ServerCard.propTypes = {
	className: PropTypes.string,
	game: PropTypes.string,
	gameId: PropTypes.string,
	title: PropTypes.string.isRequired,
	icon: PropTypes.string,
	baseUrl: PropTypes.string.isRequired,
	features: PropTypes.arrayOf(PropTypes.string).isRequired,
	connectUrl: PropTypes.string,
	setSpawningPoolApis: PropTypes.func,
};

export default function ServerCard({
	className,
	setSpawningPoolApis,
	...props
}) {
	const {
		game,
		gameId,
		title,
		icon,
		baseUrl,
		features = [],
		connectUrl,
		apiOffline,
		usesSpawningPool,
	} = props;
	const supportsLogs = features.includes("logs");
	const supportsUpdate = features.includes("update");
	const supportsMods = features.includes("mods");
	const supportsBackup = features.includes("backup");
	const supportsRcon = features.includes("rcon");
	const controlUrl = baseUrl + "control/";
	const logsUrl = baseUrl + "logs/";
	const updateUrl = baseUrl + "update/";
	const modsUrl = baseUrl + "mods/";
	const rconUrl = baseUrl + "rcon/";

	const [isAdmin] = useLocalStorage("isAdmin");
	const [editMode] = useLocalStorage("editMode");
	const authedAxios = useAuthedAxios();
	const smallScreen = useMediaQuery(`(max-width:400px)`);

	const [status, setStatus] = useState(() =>
		apiOffline ? "apiOffline" : "unknown"
	);
	/** status: PropTypes.oneOf([
		"stopped",
		"starting",
		"running",
		"stopping",
		"updating",
		"unknown",
	]), */
	const [numPlayers, setNumPlayers] = useState(-1);
	const [players, setPlayers] = useState([]);
	const [links, setLinks] = useState([]);
	const [logOpen, setLogOpen] = useState(false);
	const logOffset = useRef(-1000);
	const logFetchRunning = useRef(false);
	const [logLines, setLogLines] = useState("");
	const [modsOpen, setModsOpen] = useState(false);
	const [stopConfirmationOpen, setStopConfirmationOpen] = useState(false);
	const [backupsOpen, setBackupsOpen] = useState(false);
	const [editing, setEditing] = useState(!gameId);

	useEffect(() => {
		if (!gameId && !editing) {
			// remove the blank card once its submitted
			setSpawningPoolApis((apis) => apis.filter(({ gameId }) => !!gameId));
		}
	}, [gameId, editing]);

	const pollStatus = async () => {
		if (document.hidden || !gameId || apiOffline) {
			return;
		}
		try {
			const {
				data: {
					status: newStatus,
					playerCount: newNumPlayers,
					players: newPlayers,
					links: newLinks,
				},
			} = await axios.get(controlUrl);
			setStatus(newStatus);
			setNumPlayers(newNumPlayers !== null ? newNumPlayers : -1);
			setPlayers(newPlayers || []);
			setLinks(newLinks || []);
		} catch (e) {
			console.warn(`Cannot poll ${title}, ${e.message}`);
			setStatus("unknown");
		}
	};
	useInterval(() => {
		if (
			status === "starting" ||
			status === "stopping" ||
			status === "updating" ||
			status === "unknown"
		) {
			pollStatus();
		}
	}, 1000);
	useInterval(() => {
		if (
			!(
				status === "starting" ||
				status === "stopping" ||
				status === "updating" ||
				status === "unknown"
			)
		) {
			pollStatus();
		}
	}, 5000);
	useMountEffect(() => {
		pollStatus();
	});

	const fetchLogs = useCallback(async () => {
		if (logFetchRunning.current) {
			return;
		}
		logFetchRunning.current = true;
		try {
			const { data } = await axios.get(
				`${logsUrl}?offset=${logOffset.current}`
			);
			if (data.offset) {
				// eslint-disable-next-line require-atomic-updates
				logOffset.current = data.offset;
				if (data.logs) {
					setLogLines((oldLogs) => (oldLogs + "\n" + data.logs).trim());
				}
			} else if (data.logs !== undefined) {
				setLogLines(data.logs);
			}
		} finally {
			// eslint-disable-next-line require-atomic-updates
			logFetchRunning.current = false;
		}
	}, [logsUrl]);

	const statusIcon =
		status === "stopped" ? (
			<CloudOffIcon style={{ color: "red" }} />
		) : status === "starting" ? (
			<FlightTakeoffIcon style={{ color: "green" }} />
		) : status === "running" ? (
			<CheckCircleOutlineIcon style={{ color: "green" }} />
		) : status === "stopping" ? (
			<FlightLandIcon style={{ color: "red" }} />
		) : status === "updating" ? (
			<UpdateIcon style={{ color: "orange" }} />
		) : (
			<DeviceUnknownIcon />
		);
	const statusMessage =
		status === "stopped"
			? "Stopped"
			: status === "starting"
			? "Starting"
			: status === "running"
			? "Online"
			: status === "stopping"
			? "Stopping"
			: status === "updating"
			? "Updating"
			: status === "apiOffline"
			? "GameApi Offline"
			: "Status Unknown";

	const playerNamesString = players.map(({ name }) => name).join(", ");

	const cardRendered = (
		<Card
			raised={["starting", "running", "stopping", "updating"].includes(status)}
			className={`game-card ${status} ${className}`}
		>
			<CardHeader
				title={title}
				action={
					editMode && usesSpawningPool ? (
						<IconButton
							aria-label="settings"
							onClick={() => setEditing((state) => !state)}
						>
							<SettingsIcon />
						</IconButton>
					) : undefined
				}
			/>
			<CardContent style={{ minHeight: "96px" }}>
				<Grid
					container
					direction="row"
					alignItems="center"
					wrap="nowrap"
					spacing={1}
				>
					{icon && (
						<Grid item>
							<CardMedia image={icon} className="game-icon" />
						</Grid>
					)}
					<Grid item style={{ flexGrow: 1 }}>
						<Grid container direction="column" alignItems="center" grow={1}>
							<Grid item>
								<Grid container direction="row" alignItems="center" spacing={1}>
									<Grid item>{statusIcon}</Grid>
									<Grid item>
										{statusMessage}
										{status === "running" &&
											numPlayers !== -1 &&
											`${smallScreen ? "" : " with"} ${
												numPlayers !== undefined ? numPlayers : "?"
											} players`}
										{playerNamesString.length > 0 && (
											<Tooltip title={playerNamesString}>
												<div
													style={{
														textAlign: "right",
														maxWidth: "9rem",
														textOverflow: "ellipsis",
														overflow: "hidden",
														whiteSpace: "nowrap",
														fontSize: "0.8rem",
													}}
												>
													{playerNamesString}
												</div>
											</Tooltip>
										)}
									</Grid>
								</Grid>
							</Grid>
							{connectUrl && status === "running" && (
								<Grid item>
									<Tooltip title={connectUrl}>
										<Button href={connectUrl} color="inherit">
											<PowerIcon style={{ color: "green" }} /> Connect
										</Button>
									</Tooltip>
								</Grid>
							)}
							<Grid item>
								<Grid container direction="row" spacing={1}>
									{features.includes("modPack") && (
										<Grid item xs={6}>
											<Button
												size="small"
												color="inherit"
												href={`${baseUrl}mods/pack`}
												variant="outlined"
												style={{
													whiteSpace: "nowrap",
												}}
											>
												Mod Pack
											</Button>
										</Grid>
									)}
									{links.length > 0 &&
										links.map(({ link, title }, i) => (
											<Grid item xs={6} key={`link-${gameId}-${i}`}>
												<Button
													color="inherit"
													size="small"
													href={link}
													variant="outlined"
													style={{
														whiteSpace: "nowrap",
													}}
												>
													{title}
												</Button>
											</Grid>
										))}
								</Grid>
							</Grid>
						</Grid>
					</Grid>
				</Grid>
			</CardContent>
			<CardActions>
				{(status === "stopped" || status === "unknown") && (
					<Button
						color="primary"
						onClick={async () => {
							const {
								data: { status: newStatus },
							} = await axios.put(controlUrl);
							setStatus(newStatus);
						}}
					>
						{features.includes("updateOnStart") && (
							<div className="button-supertext">Update +</div>
						)}
						<StartIcon /> Start
					</Button>
				)}
				{(status === "starting" || status === "running") && (
					<Button
						color="error"
						disabled={!isAdmin && numPlayers > 0}
						onClick={() => {
							setStopConfirmationOpen(true);
						}}
					>
						<StopIcon /> Stop
					</Button>
				)}
				{supportsLogs && (
					<Button
						color="inherit"
						size="small"
						onClick={async () => {
							await fetchLogs();
							setLogOpen(true);
						}}
					>
						<SubjectIcon /> Logs
					</Button>
				)}
				{supportsUpdate && (
					<Button
						color="inherit"
						size="small"
						disabled={!isAdmin || status !== "stopped"}
						onClick={async () => {
							const {
								data: { status: newStatus },
							} = await authedAxios.post(updateUrl);
							setStatus(newStatus);
						}}
					>
						<UpdateIcon classes={{ root: "margin-right-2" }} /> Update
					</Button>
				)}
				{supportsMods && (
					<Button
						color="inherit"
						size="small"
						onClick={() => {
							setModsOpen(true);
						}}
					>
						<ExtensionIcon classes={{ root: "margin-right-2" }} /> Mods
					</Button>
				)}
				{supportsBackup && (
					<Button
						color="inherit"
						size="small"
						disabled={!isAdmin}
						onClick={() => {
							setBackupsOpen(true);
						}}
						style={{ minWidth: "initial" }}
						title="Backups"
					>
						<CloudUploadIcon classes={{ root: "margin-right-2" }} />
					</Button>
				)}
			</CardActions>
			{supportsLogs && logOpen && (
				<LogViewer
					title={title}
					open={logOpen}
					setOpen={setLogOpen}
					logLines={logLines}
					rconUrl={
						supportsRcon && isAdmin && status === "running" ? rconUrl : ""
					}
					fetchLogs={fetchLogs}
				/>
			)}
			{supportsMods && (
				<ModsViewer
					title={title}
					modsUrl={modsUrl}
					supportsModList={features.includes("modList")}
					supportsModSearch={features.includes("modSearch")}
					open={modsOpen}
					setOpen={setModsOpen}
					readOnly={!isAdmin}
				/>
			)}
			{supportsBackup && (
				<BackupsViewer
					title={title}
					gameId={gameId}
					baseUrl={baseUrl}
					open={backupsOpen}
					setOpen={setBackupsOpen}
				/>
			)}
			<ConfirmationModal
				title="Shutdown Confirmation"
				open={stopConfirmationOpen}
				setOpen={setStopConfirmationOpen}
				primaryButton={
					<Button
						onClick={async () => {
							const {
								data: { status: newStatus },
							} = await authedAxios.delete(controlUrl);
							setStatus(newStatus);
							setStopConfirmationOpen(false);
						}}
						color="secondary"
					>
						<PowerIcon /> Confirm
					</Button>
				}
			>
				Just double checking you wanted to shutdown {title}?
				{numPlayers && numPlayers > 0 ? (
					<>
						<br />
						There are still {numPlayers} players connected!!
					</>
				) : (
					""
				)}
			</ConfirmationModal>
		</Card>
	);

	return (
		<CardFlip
			cardFront={cardRendered}
			cardBack={
				<EditCard
					{...props}
					editing={editing}
					setEditing={setEditing}
					active={editing}
				/>
			}
			flipped={editing}
		/>
	);
}
