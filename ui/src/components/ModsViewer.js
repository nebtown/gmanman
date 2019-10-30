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

import CloseIcon from "@material-ui/icons/Close";
import AddIcon from "@material-ui/icons/Add";
import SaveIcon from "@material-ui/icons/Save";

import ModsSearch from "./ModsSearch";

ModsViewer.propTypes = {
	title: PropTypes.string.isRequired,
	modsUrl: PropTypes.string.isRequired,
	supportsModList: PropTypes.bool,
	open: PropTypes.bool,
	setOpen: PropTypes.func.isRequired,
};

export default function ModsViewer({
	title,
	modsUrl,
	supportsModList,
	open,
	setOpen,
}) {
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
			<DialogContent
				style={{
					paddingTop: 0,
					paddingBottom: 2,
				}}
			>
				{!modsList ? (
					"Loading..."
				) : (
					<List dense={true} disablePadding>
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
					</List>
				)}
			</DialogContent>
			<DialogContent
				style={{
					paddingTop: 0,
					paddingBottom: 0,
					overflowY: "initial",
					display: "flex",
				}}
			>
				<ModsSearch
					modsUrl={modsUrl}
					currentMods={modsList}
					supportsModList={supportsModList}
					modIdInput={modIdInput}
					setModIdInput={setModIdInput}
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
					startIcon={<AddIcon />}
				>
					Add
				</Button>
			</DialogContent>
			<DialogActions>
				<Button
					onClick={() => {
						setOpen(false);
					}}
					startIcon={<CloseIcon />}
				>
					Cancel
				</Button>
				<Button
					onClick={async () => {
						await axios.put(modsUrl, { mods: modsList });
						setOpen(false);
					}}
					color="primary"
					startIcon={<SaveIcon />}
				>
					Save
				</Button>
			</DialogActions>
		</Dialog>
	);
}
