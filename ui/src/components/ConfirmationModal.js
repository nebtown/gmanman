import React from "react";
import PropTypes from "prop-types";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

ConfirmationModal.propTypes = {
	title: PropTypes.string.isRequired,
	open: PropTypes.bool,
	setOpen: PropTypes.func.isRequired,
	primaryButton: PropTypes.node,
};
export default function ConfirmationModal({
	title,
	children,
	open,
	setOpen,
	primaryButton,
}) {
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
			<DialogTitle id="scroll-dialog-title">{title}</DialogTitle>
			<DialogContent dividers={true}>
				<DialogContentText>{children}</DialogContentText>
			</DialogContent>
			<DialogActions>
				<Button
					color="inherit"
					onClick={() => {
						setOpen(false);
					}}
				>
					Cancel
				</Button>
				{primaryButton}
			</DialogActions>
		</Dialog>
	);
}
