import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import axios from "axios";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemSecondaryAction from "@mui/material/ListItemSecondaryAction";
import ListItemText from "@mui/material/ListItemText";
import Switch from "@mui/material/Switch";

import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";

import ModsSearch from "./ModsSearch";
import { useAuthedAxios } from "../util/useAuthedAxios";

ModsViewer.propTypes = {
	title: PropTypes.string.isRequired,
	modsUrl: PropTypes.string.isRequired,
	supportsModList: PropTypes.bool,
	supportsModSearch: PropTypes.bool,
	open: PropTypes.bool,
	setOpen: PropTypes.func.isRequired,
	readOnly: PropTypes.bool,
};

export default function ModsViewer({
	title,
	modsUrl,
	supportsModList,
	supportsModSearch,
	open,
	setOpen,
	readOnly,
}) {
	const authedAxios = useAuthedAxios();
	const [modsList, setModsList] = useState(null);

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
						{modsList.map(({ id, label, href, enabled, outdated }) => (
							<ListItem
								key={id}
								style={label && id ? { paddingTop: 0, paddingBottom: 0 } : {}}
							>
								<ListItemText
									id={`${id}-label`}
									primary={label}
									secondary={
										<>
											{href ? (
												<a
													href={href}
													target="_blank"
													rel="noopener noreferrer"
													style={{ fontSize: "smaller" }}
												>
													{id}
												</a>
											) : (
												id
											)}
											{!!outdated && " Old"}
										</>
									}
								/>
								<ListItemSecondaryAction>
									<Switch
										edge="end"
										onChange={() => {
											setModsList(
												modsList.map((mod) => {
													if (mod.id === id) {
														mod.enabled = !mod.enabled;
													}
													return mod;
												})
											);
										}}
										checked={enabled}
										disabled={readOnly}
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
				{!readOnly && (
					<ModsSearch
						modsUrl={modsUrl}
						currentMods={modsList || []}
						setCurrentMods={setModsList}
						supportsModList={supportsModList}
						supportsModSearch={supportsModSearch}
					/>
				)}
			</DialogContent>
			<DialogActions>
				<Button
					color="inherit"
					onClick={() => {
						setOpen(false);
					}}
					startIcon={<CloseIcon />}
				>
					Cancel
				</Button>
				<Button
					onClick={async () => {
						await authedAxios.put(modsUrl, { mods: modsList });
						setOpen(false);
					}}
					disabled={readOnly}
					color="primary"
					startIcon={<SaveIcon />}
				>
					Save
				</Button>
			</DialogActions>
		</Dialog>
	);
}
