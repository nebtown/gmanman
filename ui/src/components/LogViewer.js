import React, { useEffect, useRef, useState } from "react";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import { TextField } from "@material-ui/core";
import { useAuthedAxios } from "../util/useAuthedAxios";
import { useLocalStorage } from "@rehooks/local-storage";
import { useInterval } from "../util/hooks";

export default function LogViewer({
	title,
	open,
	setOpen,
	logLines,
	rconUrl,
	fetchLogs,
}) {
	const dialogContentRef = useRef();
	const authedAxios = useAuthedAxios();
	const [rconInput, setRconInput] = useState("");

	let [rconHistory, setRconHistory] = useLocalStorage(`rconHistory-${rconUrl}`);
	rconHistory = rconHistory || [];
	const [rconHistoryId, setRconHistoryId] = useState(0);

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

	useInterval(async () => {
		if (document.hidden || !open) {
			return;
		}
		await fetchLogs();
	}, 2000);

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
				{rconUrl && (
					<form
						onSubmit={async e => {
							e.preventDefault();
							setRconInput("");
							if (rconHistory.length === 0 || rconHistory[0] !== rconInput) {
								setRconHistory([rconInput, ...rconHistory]);
							}
							await authedAxios.post(rconUrl, { rcon: rconInput });
							await fetchLogs();
						}}
						style={{ width: "100%" }}
					>
						<TextField
							id="rcon"
							label="rcon"
							value={rconInput}
							onChange={event => setRconInput(event.target.value)}
							autoComplete="off"
							onKeyDown={event => {
								if (event.key === "ArrowUp") {
									setRconInput(rconHistory[rconHistoryId] || "");
									setRconHistoryId(
										Math.min(rconHistory.length - 1, rconHistoryId + 1)
									);
								} else if (event.key === "ArrowDown") {
									setRconInput(
										rconHistoryId > 0 ? rconHistory[rconHistoryId - 1] : ""
									);
									setRconHistoryId(Math.max(0, rconHistoryId - 1));
								} else {
									setRconHistoryId(0);
								}
							}}
							margin="dense"
							variant="outlined"
							style={{ width: "100%" }}
						/>
					</form>
				)}
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
