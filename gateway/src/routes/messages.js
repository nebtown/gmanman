const express = require("express");
const router = express.Router();
const WebSocket = require("ws");
const fs = require("fs");
const axios = require("axios");

const ytdl = require("ytdl-core");
const Discord = require("discord.js");
const {
	joinVoiceChannel,
	VoiceConnectionStatus,
	createAudioPlayer,
	createAudioResource,
	AudioPlayerStatus,
} = require("@discordjs/voice");

const { debugLog, discordToken, discordChannel } = require("../cliArgs");
const { findMember } = require("./discordUtil");
const {
	reBedtime,
	reBedtimeClear,
	handleCommandBedtime,
	handleCommandBedtimeClear,
} = require("./bedtime");

const client = new Discord.Client({
	intents: [
		Discord.Intents.FLAGS.GUILD_MESSAGES,
		Discord.Intents.FLAGS.GUILD_VOICE_STATES,
	],
});

/** @type TextChannel */
let mainChannel;
let channels = {};

async function getMainChannel() {
	if (mainChannel) {
		return mainChannel;
	}
	return new Promise(function (resolve, reject) {
		(function waitFor() {
			if (mainChannel) {
				return resolve(mainChannel);
			}
			setTimeout(waitFor, 100);
		})();
	});
}

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

client.on("messageCreate", async (msg) => {
	msg = /** @type Message */ msg;
	if (msg.author.id === client.user.id) {
		return;
	}
	const msgContainsGman = msg.content.match(/\bGman\b/i);
	if (msgContainsGman) {
		if (msg.content.match(/\bbridgeport\b/i)) {
			msg.reply("Bridgeport is alive and well :wink:");
		}
		const kickMatch = msg.content.match(/\bget rid of (\w+)\b/i);
		if (kickMatch) {
			const speakerVoiceChannel = msg.member.voice.channel;
			if (speakerVoiceChannel) {
				const target = findMember(speakerVoiceChannel.members, kickMatch[1]);
				if (target) {
					target.voice.kick("");
				}
			}
		}
		const joinChannelMatch = msg.content.match(/\bput (\w+) in (\w+)\b/i);
		if (joinChannelMatch) {
			const nickSearch = joinChannelMatch[1].toLowerCase();
			msg.guild.members
				.fetch({ query: nickSearch })
				.then((guildMembers) => {
					const target = findMember(guildMembers, nickSearch);
					if (target) {
						target.voice.setChannel(joinChannelMatch[2]);
					}
				})
				.catch(console.error);
		}
		const bedtimeMatch = msg.content.match(reBedtime);
		if (bedtimeMatch) {
			handleCommandBedtime(msg, bedtimeMatch);
		}
		const bedtimeClearMatch = msg.content.match(reBedtimeClear);
		if (bedtimeClearMatch) {
			handleCommandBedtimeClear(msg, bedtimeClearMatch);
		}
		const playMatch = msg.content.match(/\bplay \b(http.*youtu.*)\b/i);
		if (playMatch) {
			const url = playMatch[1];
			if (msg.member.voice.channelId) {
				const connection = joinVoiceChannel({
					channelId: msg.member.voice.channelId,
					guildId: msg.member.guild.id,
					adapterCreator: msg.member.guild.voiceAdapterCreator,
				});

				connection.on(VoiceConnectionStatus.Ready, () => {
					const player = createAudioPlayer();
					const ytStream = ytdl(url, { filter: "audioonly" });
					const resource = createAudioResource(ytStream, {
						inlineVolume: true,
					});
					resource.volume.setVolume(0.5);
					connection.subscribe(player);
					player.play(resource);
					player.on(AudioPlayerStatus.Idle, () => {
						connection.destroy();
					});
				});
			} else {
				msg.reply(
					"If I play a Youtube in a forest and no one is around to hear it, is it still a meme?"
				);
			}
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
				(err) => console.error("Failed to write nextmap.txt: ", err)
			);
			msg.reply(`Next map queued: ${nextMapMatch[1]}`);
		}
		const whoseOnServerMatch = msg.content.match(
			/(?:(?:\bwho.*on\w*\b)|(?:\bserver status (?:of\b)?)) ?(.*?)\??$/
		);
		if (whoseOnServerMatch) {
			async function repostGameInfo(gameId) {
				if (gameMessageMeta[gameId] && gameMessageMeta[gameId].message) {
					await gameMessageMeta[gameId].message.delete();
					delete gameMessageMeta[gameId].message;
				}
				pollGameHealth(knownGameApis[gameId]);
			}
			const searchTerm = whoseOnServerMatch
				? whoseOnServerMatch[1].toLowerCase()
				: "";
			if (
				!searchTerm ||
				searchTerm.includes("online") ||
				searchTerm.includes("active")
			) {
				// hit all online ones
				Object.entries(gameMessageMeta).map(([id, meta]) => {
					if (
						meta.message &&
						meta.lastResponse &&
						meta.lastResponse.playerCount > 0
					) {
						repostGameInfo(id);
					}
				});
			} else if (whoseOnServerMatch[1]) {
				let foundGameId;
				for (let gameId in knownGameApis) {
					if (
						gameId.toLowerCase() == searchTerm ||
						knownGameApis[gameId].name.toLowerCase() == searchTerm
					) {
						foundGameId = gameId;
						break;
					}
				}
				if (!foundGameId) {
					for (let gameId in knownGameApis) {
						if (
							gameId.toLowerCase().includes(searchTerm) ||
							knownGameApis[gameId].name.toLowerCase().includes(searchTerm)
						) {
							foundGameId = gameId;
							break;
						}
					}
				}
				if (foundGameId) {
					await repostGameInfo(foundGameId);
				}
			}
		}
	}
	if (msgContainsGman || msg.channel.id === mainChannel.id) {
		debugLog(
			`WS: Heard ${msg.author.username}: ${msg.content} (${wsConnections.length} clients)`
		);
		wsConnections.forEach((wsConnection) => {
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
	.catch((err) => console.error("Discord: failed to login ", err));

router.post("/", async function (req, response) {
	sendMessage(req.body.nick, req.body.message, req.body.channel).catch((err) =>
		console.warn(
			`Discord: failed to send message ${req.body.nick}: ${req.body.message} because: ${err}`
		)
	);
	response.json({ status: "ok" });
});

router.get("/send", async function (req, response) {
	await sendMessage(req.query.nick, req.query.message);
	response.json({ status: "ok" });
});

let lastNickname = "";
async function sendMessage(nickname, message, channelId) {
	const channel = channelId
		? await getChannel(channelId)
		: await getMainChannel();
	debugLog(`Discord sending ${nickname}: `, message);
	if (!channel) {
		console.warn("Discord: Not connected to channel", channelId);
		return;
	}
	let discordNickname = "Gman";
	if (nickname && nickname !== "Gman" && !message.title) {
		message = `${nickname}: ${message}`;
	}
	try {
		if (discordNickname !== lastNickname) {
			lastNickname = discordNickname;
			if (channel.guild.me) {
				// this seemed to be null in discordjs v13... unsure why?
				await channel.guild.me.setNickname(discordNickname);
			}
		}
		if (message.match && message.match(/]\(https?:\/\//)) {
			const embed = new Discord.MessageEmbed().setDescription(message);
			return await channel.send({ embeds: [embed] });
		} else if (message.title) {
			return await channel.send({ embeds: [message] });
		} else {
			return await channel.send({ content: message });
		}
	} catch (err) {
		console.error(`Discord sendMessage error: ${err}`);
	}
}

const wsServer = new WebSocket.Server({ noServer: true });
const wsConnections = [];

wsServer.on("connection", (ws) => {
	ws.on("messageCreate", (message) => {
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
		wsServer.handleUpgrade(req, socket, head, (ws) => {
			wsServer.emit("connection", ws, req);
		});
	});
}

const gameMessageMeta = {};
let knownGameApis = {};
async function pollGameHealth(gameApi) {
	const { id, game, name, url } = gameApi;
	if (!gameMessageMeta[id]) {
		gameMessageMeta[id] = {};
	}
	const { data } = await axios({
		method: "GET",
		url: `${url}control`,
		timeout: 8000,
	});
	if (data.status === "running") {
		const players = data.players || [];
		const embed = new Discord.MessageEmbed()
			.setTitle(`${name} is running`)
			.setDescription(data.connectUrl || "")
			.setThumbnail(`https://gmanman.nebtown.info/icons/${game}.png`);
		if (data.playerCount > 0) {
			const playerNamesText = players
				.map(({ name }) => name)
				.filter(Boolean)
				.join(", ");
			if (playerNamesText) {
				embed.addField(
					`Players: ${data.playerCount}`,
					players
						.map(({ name }) => name)
						.filter(Boolean)
						.join(", ") || "-",
					true
				);
			} else {
				embed.setDescription(
					embed.description + `\nPlayers: ${data.playerCount}`
				);
			}
		}
		try {
			if (!gameMessageMeta[id].message) {
				gameMessageMeta[id].message = await sendMessage("", embed);
			} else {
				gameMessageMeta[id].message = await gameMessageMeta[id].message.edit({
					embeds: [embed],
				});
			}
		} catch (err) {
			console.error("Failed to edit message: ", err);
		}
		gameApi.lastRunningTime = Date.now();
	} else if (["stopping", "stopped"].includes(data.status)) {
		if (gameMessageMeta[id].message) {
			const embed = new Discord.MessageEmbed().setTitle(`${name} was running`);
			await gameMessageMeta[id].message.edit({ embeds: [embed] });
			delete gameMessageMeta[id].message;
		}
	}
	gameMessageMeta[id].lastResponse = data;
}
const savedMessagesFilePath = "/tmp/gmanman-gateway-known-messages.json";
async function fileExists(path) {
	return !!(await fs.promises.stat(path).catch((e) => false));
}
async function initPlayerStatusPoller(_knownGameApis) {
	knownGameApis = _knownGameApis;

	try {
		const messagesStr =
			(await fileExists(savedMessagesFilePath)) &&
			(await fs.promises.readFile(savedMessagesFilePath));
		if (messagesStr) {
			const storedMessages = JSON.parse(messagesStr);
			const mainChannel = await getMainChannel();
			await Promise.all(
				Object.keys(storedMessages).map(async (id) => {
					if (!gameMessageMeta[id]) {
						gameMessageMeta[id] = {};
					}
					try {
						gameMessageMeta[id].message = await mainChannel.messages.fetch(
							storedMessages[id]
						);
					} catch (e) {
						console.warn("Discord: startup failed to read message", id, e);
					}
				})
			);
		}
	} catch (e) {
		console.warn("initPlayerStatusPoller reading storedMessages error:", e);
	}

	setInterval(async () => {
		const gameApisList = Object.values(knownGameApis);
		const results = await Promise.allSettled(gameApisList.map(pollGameHealth));
		results.forEach((result, i) => {
			if (result.status === "rejected") {
				console.warn(
					`Discord PlayerStatusPoller error ${gameApisList[i].gameId}: `,
					result.reason.message
				);
			}
		});
		try {
			await fs.promises.writeFile(
				savedMessagesFilePath,
				JSON.stringify(
					Object.keys(gameMessageMeta).reduce((carry, id) => {
						if (gameMessageMeta[id].message) {
							carry[id] = gameMessageMeta[id].message.id;
						}
						return carry;
					}, {})
				)
			);
		} catch (err) {
			console.warn(
				"Discord failed to write savedMessages error: ",
				err.message
			);
		}
	}, 8000);
}

module.exports = {
	router,
	sendMessage,
	initWebsocketListener,
	initPlayerStatusPoller,
};
