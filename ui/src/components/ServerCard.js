import React, { useCallback, useRef, useState } from "react";
import PropTypes from "prop-types";
import axios from "axios";
import { useLocalStorage } from "@rehooks/local-storage";

import useMediaQuery from "@material-ui/core/useMediaQuery";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import CardHeader from "@material-ui/core/CardHeader";

import Button from "@material-ui/core/Button";
import CardMedia from "@material-ui/core/CardMedia";
import Grid from "@material-ui/core/Grid";
import Tooltip from "@material-ui/core/Tooltip";

import StartIcon from "@material-ui/icons/PlayArrow";
import StopIcon from "@material-ui/icons/Stop";
import DeviceUnknownIcon from "@material-ui/icons/DeviceUnknown";
import CheckCircleOutlineIcon from "@material-ui/icons/CheckCircleOutline";
import CloudOffIcon from "@material-ui/icons/CloudOff";
import ExtensionIcon from "@material-ui/icons/Extension";
import FlightLandIcon from "@material-ui/icons/FlightLand";
import FlightTakeoffIcon from "@material-ui/icons/FlightTakeoff";
import PowerIcon from "@material-ui/icons/Power";
import SubjectIcon from "@material-ui/icons/Subject";
import UpdateIcon from "@material-ui/icons/SystemUpdateAlt";
import CloudUploadIcon from "@material-ui/icons/CloudUpload";

import { useInterval, useMountEffect } from "../util/hooks";
import { useAuthedAxios } from "../util/useAuthedAxios";
import LogViewer from "./LogViewer";
import ModsViewer from "./ModsViewer";
import BackupsViewer from "./BackupsViewer";
import ConfirmationModal from "./ConfirmationModal";

ServerCard.propTypes = {
	className: PropTypes.string,
	game: PropTypes.string,
	id: PropTypes.string,
	title: PropTypes.string.isRequired,
	icon: PropTypes.string,
	baseUrl: PropTypes.string.isRequired,
	features: PropTypes.arrayOf(PropTypes.string).isRequired,
	connectUrl: PropTypes.string,
};

export default function ServerCard({
	className,
	game,
	id,
	title,
	icon,
	baseUrl,
	features,
	connectUrl,
}) {
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
	const authedAxios = useAuthedAxios();
	const smallScreen = useMediaQuery(`(max-width:400px)`);

	const [status, setStatus] = useState("unknown");
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

	const pollStatus = async () => {
		if (document.hidden) {
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
			: "Status Unknown";

	return (
		<Card
			raised={["starting", "running", "stopping", "updating"].includes(status)}
			className={`game-card ${status} ${className}`}
		>
			<CardHeader title={title} />
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
										{players.length > 0 && (
											<Tooltip
												title={players.map(({ name }) => name).join(", ")}
											>
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
													{players.map(({ name }) => name).join(", ")}
												</div>
											</Tooltip>
										)}
									</Grid>
								</Grid>
							</Grid>
							{connectUrl && status === "running" && (
								<Grid item>
									<Tooltip title={connectUrl}>
										<Button href={connectUrl}>
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
											<Grid item xs={6} key={`link-${id}-${i}`}>
												<Button
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
						<StartIcon /> Start
					</Button>
				)}
				{(status === "starting" || status === "running") && (
					<Button
						color="secondary"
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
						size="small"
						disabled={!isAdmin || status !== "stopped"}
						onClick={() => {
							setModsOpen(true);
						}}
					>
						<ExtensionIcon classes={{ root: "margin-right-2" }} /> Mods
					</Button>
				)}
				{supportsBackup && (
					<Button
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
				/>
			)}
			{supportsBackup && (
				<BackupsViewer
					title={title}
					gameId={id}
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
}
