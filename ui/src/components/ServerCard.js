import React, { useState } from "react";
import PropTypes from "prop-types";
import axios from "axios";

import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import CardHeader from "@material-ui/core/CardHeader";

import Button from "@material-ui/core/Button";
import CardMedia from "@material-ui/core/CardMedia";
import Grid from "@material-ui/core/Grid";

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

import { useInterval, useMountEffect } from "../util/hooks";
import LogViewer from "./LogViewer";
import ModsViewer from "./ModsViewer";
import ConfirmationModal from "./ConfirmationModal";

ServerCard.propTypes = {
	title: PropTypes.string.isRequired,
	status: PropTypes.oneOf([
		"stopped",
		"starting",
		"running",
		"stopping",
		"updating",
		"unknown",
	]),
};

export default function ServerCard({
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
	const controlUrl = baseUrl + "control/";
	const logsUrl = baseUrl + "logs/";
	const updateUrl = baseUrl + "update/";
	const modsUrl = baseUrl + "mods/";

	const [status, setStatus] = useState("unknown");
	const [numPlayers, setNumPlayers] = useState(-1);
	const [logOpen, setLogOpen] = useState(false);
	const [logLines, setLogLines] = useState("");
	const [modsOpen, setModsOpen] = useState(false);
	const [stopConfirmationOpen, setStopConfirmationOpen] = useState(false);

	const pollStatus = async () => {
		try {
			const {
				data: { status: newStatus, playerCount: newNumPlayers },
			} = await axios.get(controlUrl);
			setStatus(newStatus);
			setNumPlayers(newNumPlayers !== null ? newNumPlayers : -1);
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
		if (document.hidden) {
			return;
		}
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

	useInterval(async () => {
		if (document.hidden || !logOpen) {
			return;
		}
		const {
			data: { logs: newLogs },
		} = await axios.get(logsUrl);
		if (newLogs) {
			setLogLines(newLogs);
		}
	}, 2000);

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
			className="game-card"
		>
			<CardHeader title={title} />
			<CardContent>
				<Grid container direction="row" alignItems="center" spacing={1}>
					{icon && (
						<Grid item>
							<CardMedia image={icon} className="game-icon" />
						</Grid>
					)}
					<Grid item>
						<Grid container direction="column" alignItems="center">
							<Grid item>
								<Grid container direction="row" alignItems="center" spacing={1}>
									<Grid item>{statusIcon}</Grid>
									<Grid item>
										{statusMessage}
										{status === "running" &&
											numPlayers !== -1 &&
											` with ${numPlayers} players`}
									</Grid>
								</Grid>
							</Grid>
							{connectUrl && status === "running" && (
								<Grid item>
									<Button href={connectUrl}>
										<PowerIcon style={{ color: "green" }} /> Connect
									</Button>
								</Grid>
							)}
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
							const {
								data: { logs: newLogs },
							} = await axios.get(logsUrl);
							setLogLines(newLogs);
							setLogOpen(true);
						}}
					>
						<SubjectIcon /> Logs
					</Button>
				)}
				{supportsUpdate && (
					<Button
						size="small"
						disabled={status !== "stopped"}
						onClick={async () => {
							const {
								data: { status: newStatus },
							} = await axios.post(updateUrl);
							setStatus(newStatus);
						}}
					>
						<UpdateIcon classes={{ root: "margin-right-2" }} /> Update
					</Button>
				)}
				{supportsMods && (
					<Button
						size="small"
						disabled={status !== "stopped"}
						onClick={() => {
							setModsOpen(true);
						}}
					>
						<ExtensionIcon classes={{ root: "margin-right-2" }} /> Mods
					</Button>
				)}
			</CardActions>
			{supportsLogs && (
				<LogViewer
					title={title}
					open={logOpen}
					setOpen={setLogOpen}
					logLines={logLines}
				/>
			)}
			{supportsMods && (
				<ModsViewer
					title={title}
					modsUrl={modsUrl}
					open={modsOpen}
					setOpen={setModsOpen}
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
							} = await axios.delete(controlUrl);
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
