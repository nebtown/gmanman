import React from "react";
import PropTypes from "prop-types";
import { useLocalStorage } from "@rehooks/local-storage";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import AddIcon from "@mui/icons-material/Add";

export function tokenIsValid(loginToken) {
	if (!loginToken) {
		return false;
	}
	return loginToken.expires_at >= Date.now() / 1000;
}

CreateGameButton.propTypes = {
	gatewayUrl: PropTypes.string.isRequired,
	setSpawningPoolApis: PropTypes.func,
};

export default function CreateGameButton({ gatewayUrl, setSpawningPoolApis }) {
	const [editMode] = useLocalStorage("editMode");

	if (!editMode) {
		return null;
	}
	return (
		<Grid item>
			<Button
				color="inherit"
				startIcon={<AddIcon />}
				size="small"
				variant="outlined"
				onClick={() => {
					setSpawningPoolApis((apis) => [{ isNew: true }, ...apis]);
				}}
			>
				New Game
			</Button>
		</Grid>
	);
}
