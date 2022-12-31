import React, { useState } from "react";
import { useLocalStorage } from "@rehooks/local-storage";

import Grid from "@mui/material/Grid";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";

export default function EditModeToggle() {
	const [isAdmin] = useLocalStorage("isAdmin");
	const [editMode, setEditMode] = useLocalStorage("editMode", false);

	React.useEffect(() => {
		if (!isAdmin && editMode) {
			setEditMode(false);
		}
	}, [isAdmin, editMode]);
	if (!isAdmin) {
		return null;
	}
	return (
		<Grid item>
			<FormControlLabel
				control={
					<Switch
						onChange={() => setEditMode((b) => !b)}
						checked={!!editMode}
					/>
				}
				label="Edit Mode"
			/>
		</Grid>
	);
}
