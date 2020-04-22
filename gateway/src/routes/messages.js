const express = require("express");
const router = express.Router();

const Discord = require("discord.js");
const client = new Discord.Client();

const { debugLog, discordToken, discordChannel } = require("../cliArgs");

/** @type TextChannel */
let mainChannel;

client.on("ready", async () => {
	console.log(`Discord logged in as ${client.user.tag}!`);
	try {
		mainChannel = await client.channels.fetch(discordChannel);
	} catch (err) {
		console.error("Discord channel init error: ", err);
	}
});

client.on("message", msg => {
	msg = /** @type Message */ msg;
	if (msg.content.match(/\bGman\b/i)) {
		if (msg.content.match(/\bjake\b/i)) {
			return msg.reply("lolpants");
		}
		if (msg.content.match(/\bwho\b.*\bam\b.*\bi\b/i)) {
			// Send the user's avatar URL
			return msg.reply(msg.author.displayAvatarURL());
		}
	}
	if (msg.channel.id === mainChannel.id) {
		debugLog(`Heard ${msg.author.username}: ${msg.content}`);
	}
});

client
	.login(discordToken)
	.catch(err => console.error("Discord: failed to login ", err));

router.post("/", async function(req, response) {
	sendMessage(req.body.nick, req.body.message).catch(err =>
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
async function sendMessage(nickname, message) {
	debugLog(`Discord sending ${nickname}: ${message}`);
	if (!mainChannel) {
		return console.warn("Discord: Not connected to channel");
	}
	if (!nickname) {
		nickname = "Gman";
	}
	try {
		if (nickname !== lastNickname) {
			await mainChannel.guild.me.setNickname(nickname);
		}
		if (message.includes("://")) {
			const embed = new Discord.MessageEmbed().setDescription(message);
			await mainChannel.send(embed);
		} else {
			await mainChannel.send(message);
		}
	} catch (err) {
		console.error(`Discord sendMessage error: ${err}`);
	}
}

module.exports = { router, sendMessage };
