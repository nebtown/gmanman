import React from "react";
import PropTypes from "prop-types";

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

export default function ServerCard({ title, status }) {
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
					<Grid item>{statusMessage}</Grid>
				</Grid>
			</CardContent>
			<CardActions>
				<Button
					color="primary"
					disabled={status !== "stopped" && status !== "unknown"}
				>
					<StartIcon /> Start
				</Button>
				<Button
					color="secondary"
					disabled={status !== "starting" && status !== "running"}
				>
					<StopIcon /> Stop
				</Button>
			</CardActions>
		</Card>
	);
}
