const WebSocket = require("ws");

const ws = new WebSocket("ws://127.0.0.1:6725/messages");
ws.on("open", () => {
	ws.send(
		JSON.stringify({
			type: "message",
			name: "Neb",
			message: "Test Websocket message",
		})
	);
});

ws.on("message", data => {
	console.log("Received ", data);
});
