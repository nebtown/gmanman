import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import axios from "axios";

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

import { useInterval } from "../util/hooks";

ServerCard.propTypes = {
	title: PropTypes.string.isRequired,
	status: PropTypes.oneOf([
		"stopped",
		"starting",
		"running",
		"stopping",
		"unknown",
	]),
};

export default function ServerCard({ title, url }) {
	const [status, setStatus] = useState("unknown");
	const [numPlayers, setNumPlayers] = useState(-1);

	const pollStatus = async () => {
		if (!url) {
			console.warn(`Cannot poll ${title}, missing url`);
			return;
		}
		const {
			data: { status: newStatus, playerCount: newNumPlayers },
		} = await axios.get(url + "control/");
		setStatus(newStatus);
		setNumPlayers(newNumPlayers !== null ? newNumPlayers : -1);
	};
	useInterval(() => {
		if (
			status === "starting" ||
			status === "stopping" ||
			status === "unknown"
		) {
			pollStatus();
		}
	}, 1000);
	useEffect(() => {
		pollStatus();
	}, []);

	const statusIcon =
		status === "stopped" ? (
			<CloudOffIcon style={{ color: "red" }} />
		) : status === "starting" ? (
			<FlightTakeoffIcon style={{ color: "green" }} />
		) : status === "running" ? (
			<CheckCircleOutlineIcon style={{ color: "green" }} />
		) : status === "stopping" ? (
			<FlightLandIcon style={{ color: "red" }} />
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
			: "Status Unknown";
	return (
		<Card>
			<CardHeader title={title} />
			<CardContent>
				<Grid container direction="row" alignItems="center" spacing={1}>
					<Grid item>{statusIcon}</Grid>
					<Grid item>
						{statusMessage}
						{status === "running" &&
							numPlayers !== -1 &&
							` with ${numPlayers} players`}
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
						} = await axios.put(url + "control/");
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
						} = await axios.delete(url + "control/");
						setStatus(newStatus);
					}}
				>
					<StopIcon /> Stop
				</Button>
			</CardActions>
		</Card>
	);
}
