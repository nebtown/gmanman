const express = require("express");
const router = express.Router();
const WebSocket = require("ws");
const fs = require("fs");

const Discord = require("discord.js");
const client = new Discord.Client();

const { debugLog, discordToken, discordChannel } = require("../cliArgs");

/** @type TextChannel */
let mainChannel;
let channels = {};

client.on("ready", async () => {
	console.log(`Discord logged in as ${client.user.tag}!`);
	try {
		mainChannel = await client.channels.fetch(discordChannel);
	} catch (err) {
		console.error("Discord channel init error: ", err);
	}
});

async function getChannel(id) {
	if (!channels[id]) {
		try {
			channels[id] = await client.channels.fetch(id);
		} catch (err) {
			console.error("Discord channel init error: ", err);
		}
	}
	return channels[id];
}

client.on("message", msg => {
	msg = /** @type Message */ msg;
	if (msg.author.id === client.user.id) {
		return;
	}
	const msgContainsGman = msg.content.match(/\bGman\b/i);
	if (msgContainsGman) {
		if (msg.content.match(/\bbridgeport\b/i)) {
			msg.reply("Bridgeport is alive and well :wink:");
		}
		if (msg.content.match(/\bwho\b.*\bam\b.*\bi\b/i)) {
			// Send the user's avatar URL
			msg.reply(msg.author.displayAvatarURL());
		}
		const nextMapMatch = msg.content.match(
			/\bnext ?map\b.+?\b([a-z]+_[a-z0-9_]+)\b/
		);
		if (nextMapMatch && msg.content.match(/bridge/i)) {
			fs.writeFile(
				"/servers/gmod-docker-overrides/garrysmod/data/nextmap.txt",
				nextMapMatch[1],
				err => console.error("Failed to write nextmap.txt: ", err)
			);
			msg.reply(`Next map queued: ${nextMapMatch[1]}`);
		}
	}
	if (msgContainsGman || msg.channel.id === mainChannel.id) {
		debugLog(
			`WS: Heard ${msg.author.username}: ${msg.content} (${wsConnections.length} clients)`
		);
		wsConnections.forEach(wsConnection => {
			wsConnection.send(
				JSON.stringify({
					type: "message",
					name: msg.author.username,
					message: msg.content,
					channel: (msg.channel || {}).id,
					channelName: (msg.channel || {}).name,
				})
			);
		});
	}
});

client
	.login(discordToken)
	.catch(err => console.error("Discord: failed to login ", err));

router.post("/", async function(req, response) {
	sendMessage(req.body.nick, req.body.message, req.body.channel).catch(err =>
		console.log(
			`Discord: failed to send message ${req.body.nick}: ${req.body.message} because: ${err}`
		)
	);
	response.json({ status: "ok" });
});

router.get("/send", async function(req, response) {
	await sendMessage(req.query.nick, req.query.message);
	response.json({ status: "ok" });
});

let lastNickname = "";
async function sendMessage(nickname, message, channelId) {
	const channel = channelId ? await getChannel(channelId) : mainChannel;
	debugLog(`Discord sending ${nickname}: ${message}`);
	if (!channel) {
		return console.warn("Discord: Not connected to channel", channelId);
	}
	let discordNickname = "Gman";
	if (nickname && nickname !== "Gman") {
		message = `${nickname}: ${message}`;
	}
	try {
		if (discordNickname !== lastNickname) {
			lastNickname = discordNickname;
			await channel.guild.me.setNickname(discordNickname);
		}
		if (message.match(/]\(https?:\/\//)) {
			const embed = new Discord.MessageEmbed().setDescription(message);
			await channel.send(embed);
		} else {
			await channel.send(message);
		}
	} catch (err) {
		console.error(`Discord sendMessage error: ${err}`);
	}
}

const wsServer = new WebSocket.Server({ noServer: true });
const wsConnections = [];

wsServer.on("connection", ws => {
	ws.on("message", message => {
		console.debug(`WS Received: ${message}`);
		const request = JSON.parse(message);
		if (request.type === "message") {
			const { name, message, avatar } = request;
			sendMessage(name, message);
		} else if (request.type === "ping") {
			ws.send(JSON.stringify({ type: "pong" }));
		} else if (request.type === "pong") {
			console.debug("WS received (ping) pong, all is well");
		} else {
			console.warn(`WS unhandled message: ${message}`);
		}
	});
	ws.on("close", () => {
		console.debug("WS Closing");
		wsConnections.splice(wsConnections.indexOf(ws), 1);
	});
	console.debug("WS connection opened");
	ws.send(JSON.stringify({ type: "ping" }));
	wsConnections.push(ws);
});

function initWebsocketListener(httpServer) {
	httpServer.on("upgrade", (req, socket, head) => {
		wsServer.handleUpgrade(req, socket, head, ws => {
			wsServer.emit("connection", ws, req);
		});
	});
}

module.exports = { router, sendMessage, initWebsocketListener };
