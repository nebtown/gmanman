import React, { useState } from "react";
import PropTypes from "prop-types";
import axios from "axios";
import Img from "gatsby-image";

import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import CardHeader from "@material-ui/core/CardHeader";

import Button from "@material-ui/core/Button";
import Grid from "@material-ui/core/Grid";

import StartIcon from "@material-ui/icons/PlayArrow";
import StopIcon from "@material-ui/icons/Stop";
import DeviceUnknownIcon from "@material-ui/icons/DeviceUnknown";
import CheckCircleOutlineIcon from "@material-ui/icons/CheckCircleOutline";
import CloudOffIcon from "@material-ui/icons/CloudOff";
import FlightLandIcon from "@material-ui/icons/FlightLand";
import FlightTakeoffIcon from "@material-ui/icons/FlightTakeoff";
import PowerIcon from "@material-ui/icons/Power";
import SubjectIcon from "@material-ui/icons/Subject";
import UpdateIcon from "@material-ui/icons/SystemUpdateAlt";

import { useInterval, useMountEffect } from "../util/hooks";
import LogViewer from "./LogViewer";

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
	title,
	icon,
	controlUrl,
	logsUrl,
	updateUrl,
	connectIp,
}) {
	const [status, setStatus] = useState("unknown");
	const [numPlayers, setNumPlayers] = useState(-1);
	const [logOpen, setLogOpen] = React.useState(false);
	const [logLines, setLogLines] = React.useState("");

	const pollStatus = async () => {
		if (!controlUrl) {
			console.warn(`Cannot poll ${title}, missing controlUrl`);
			return;
		}
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
							<Img fixed={icon} className="game-icon" fadeIn={false} />
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
							{connectIp && status === "running" && (
								<Grid item>
									<Button href={`steam://connect/${connectIp}`}>
										<PowerIcon style={{ color: "green" }} /> Connect
									</Button>
								</Grid>
							)}
						</Grid>
					</Grid>
				</Grid>
			</CardContent>
			<CardActions>
				<Button
					color="primary"
					disabled={status !== "stopped" && status !== "unknown"}
					onClick={async () => {
						const {
							data: { status: newStatus },
						} = await axios.put(controlUrl);
						setStatus(newStatus);
					}}
				>
					<StartIcon /> Start
				</Button>
				<Button
					color="secondary"
					disabled={status !== "starting" && status !== "running"}
					onClick={async () => {
						const {
							data: { status: newStatus },
						} = await axios.delete(controlUrl);
						setStatus(newStatus);
					}}
				>
					<StopIcon /> Stop
				</Button>
				{logsUrl && (
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
				{updateUrl && (
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
			</CardActions>
			<LogViewer
				title={title}
				open={logOpen}
				setOpen={setLogOpen}
				logLines={logLines}
			/>
		</Card>
	);
}
