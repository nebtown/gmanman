import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import axios from "axios";

import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";
import ListItemText from "@material-ui/core/ListItemText";
import Switch from "@material-ui/core/Switch";
import TextField from "@material-ui/core/TextField";

import CloseIcon from "@material-ui/icons/Close";
import AddIcon from "@material-ui/icons/Add";
import SaveIcon from "@material-ui/icons/Save";

ModsViewer.propTypes = {
	title: PropTypes.string.isRequired,
	modsUrl: PropTypes.string.isRequired,
	open: PropTypes.bool,
	setOpen: PropTypes.func.isRequired,
};

export default function ModsViewer({ title, modsUrl, open, setOpen }) {
	const [modsList, setModsList] = useState(null);
	const [modIdInput, setModIdInput] = useState("");

	useEffect(() => {
		if (!open) {
			setModsList(null);
			return;
		}
		(async () => {
			const {
				data: { mods: newMods },
			} = await axios.get(modsUrl);
			if (newMods) {
				setModsList(newMods);
			}
		})();
	}, [open, modsUrl]);

	return (
		<Dialog
			open={open}
			onClose={() => {
				setOpen(false);
			}}
			scroll="paper"
			maxWidth="md"
			aria-labelledby="scroll-dialog-title"
		>
			<DialogTitle id="scroll-dialog-title">{title} Mods</DialogTitle>
			<DialogContent dividers={true}>
				{!modsList ? (
					"Loading..."
				) : (
					<List dense={true}>
						{modsList.map(({ id, label, enabled }) => (
							<ListItem key={id}>
								<ListItemText id={`${id}-label`} primary={label || id} />
								<ListItemSecondaryAction>
									<Switch
										edge="end"
										onChange={() => {
											setModsList(
												modsList.map(mod => {
													if (mod.id === id) {
														mod.enabled = !mod.enabled;
													}
													return mod;
												})
											);
										}}
										checked={enabled}
										inputProps={{ "aria-labelledby": `${id}-label` }}
									/>
								</ListItemSecondaryAction>
							</ListItem>
						))}
						<ListItem>
							<TextField
								id="new-mod-field"
								label="New Mod ID"
								value={modIdInput}
								onChange={event =>
									setModIdInput(event.target.value.replace(/[\r\n,]/, ""))
								}
								margin="dense"
								variant="outlined"
							/>
							<Button
								onClick={() => {
									setModsList([
										...modsList,
										{
											id: modIdInput.trim(),
											enabled: true,
										},
									]);
									setModIdInput("");
								}}
							>
								<AddIcon classes={{ root: "margin-right-2" }} /> Add
							</Button>
						</ListItem>
					</List>
				)}
			</DialogContent>
			<DialogActions>
				<Button
					onClick={() => {
						setOpen(false);
					}}
				>
					<CloseIcon classes={{ root: "margin-right-2" }} /> Cancel
				</Button>
				<Button
					onClick={async () => {
						await axios.put(modsUrl, { mods: modsList });
						setOpen(false);
					}}
					color="primary"
				>
					<SaveIcon classes={{ root: "margin-right-2" }} /> Save
				</Button>
			</DialogActions>
		</Dialog>
	);
}
