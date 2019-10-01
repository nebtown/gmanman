import React, { useRef } from "react";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";

export default function LogViewer({ title, open, setOpen, logLines }) {
	const dialogContentRef = useRef();

	return (
		<Dialog
			open={open}
			onClose={() => {
				setOpen(false);
			}}
			onEnter={() => {
				dialogContentRef.current.scrollIntoView({ block: "end" });
			}}
			scroll="paper"
			maxWidth="md"
			aria-labelledby="scroll-dialog-title"
		>
			<DialogTitle id="scroll-dialog-title">{title} Logs</DialogTitle>
			<DialogContent
				dividers={true}
				style={{
					backgroundColor: "rgb(34, 34, 37)",
				}}
			>
				<DialogContentText
					ref={dialogContentRef}
					style={{
						fontFamily: "'Roboto Mono', monospace",
						fontSize: "0.8rem",
						color: "rgb(232, 233, 237)",
						marginBottom: 0,
					}}
				>
					{logLines.split("\n").map((value, i) => (
						<React.Fragment key={i}>
							{value}
							<br />
						</React.Fragment>
					))}
				</DialogContentText>
			</DialogContent>
			<DialogActions>
				<Button
					onClick={() => {
						setOpen(false);
					}}
				>
					Close
				</Button>
			</DialogActions>
		</Dialog>
	);
}
