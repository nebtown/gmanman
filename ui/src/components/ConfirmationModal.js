import React from "react";
import PropTypes from "prop-types";

import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";

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
