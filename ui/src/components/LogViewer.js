import React, { useEffect, useRef } from "react";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";

export default function LogViewer({ title, open, setOpen, logLines }) {
	const dialogContentRef = useRef();

	const logLineCounts = {};

	const parent = dialogContentRef.current?.parentElement;
	const shouldScroll =
		parent &&
		Math.round(
			(parent.scrollHeight - parent.clientHeight - parent.scrollTop) / 80
		) === 0;
	useEffect(() => {
		if (!dialogContentRef.current) {
			return;
		}
		if (shouldScroll) {
			dialogContentRef.current.scrollIntoView({ block: "end" });
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [logLines]);

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
			className="LogViewer"
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
					<code style={{ whiteSpace: "pre-wrap" }}>
						{logLines.split("\n").map((value, i) => {
							let key = value;
							if (key in logLineCounts) {
								key += logLineCounts[value];
								logLineCounts[value] += 1;
							} else {
								logLineCounts[value] = 1;
							}
							return (
								<React.Fragment key={key}>
									{value}
									<br />
								</React.Fragment>
							);
						})}
					</code>
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
