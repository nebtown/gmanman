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

import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CloseIcon from "@mui/icons-material/Close";

import { useAuthedAxios } from "../util/useAuthedAxios";

BackupsViewer.propTypes = {
	title: PropTypes.string.isRequired,
	gameId: PropTypes.string.isRequired,
	baseUrl: PropTypes.string.isRequired,
	open: PropTypes.bool,
	setOpen: PropTypes.func.isRequired,
};

export default function BackupsViewer({
	title,
	gameId,
	baseUrl,
	open,
	setOpen,
}) {
	const authedAxios = useAuthedAxios();
	const [backupList, setBackupList] = useState(null);

	useEffect(() => {
		if (!open) {
			setBackupList(null);
			return;
		}
		(async () => {
			const {
				data: { backups: newBackups },
			} = await axios.get(`${baseUrl}backup/`);
			if (newBackups) {
				setBackupList(newBackups);
			}
		})();
	}, [open, baseUrl]);

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
			<DialogTitle id="scroll-dialog-title">{title} Backups</DialogTitle>
			<DialogContent
				style={{
					paddingTop: 0,
					paddingBottom: 2,
				}}
			>
				{!backupList ? (
					"Loading..."
				) : (
					<List dense={true} disablePadding>
						{backupList.map(({ name }) => (
							<ListItem key={name} disableGutters>
								<span style={{ paddingRight: "0.5em" }}>
									{name.replace(gameId + "-", "")}
								</span>
								<Button
									color="inherit"
									onClick={async () => {
										await authedAxios.post(`${baseUrl}restore/`, {
											file: name,
										});
										setOpen(false);
									}}
									style={{
										marginLeft: "auto",
									}}
									startIcon={<CloudDownloadIcon />}
								>
									Restore
								</Button>
							</ListItem>
						))}
					</List>
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
						await authedAxios.post(`${baseUrl}backup/`);
						setOpen(false);
					}}
					color="primary"
					startIcon={<CloudUploadIcon />}
				>
					New Backup
				</Button>
			</DialogActions>
		</Dialog>
	);
}
