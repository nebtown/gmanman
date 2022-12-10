const momentTz = require("moment-timezone");
const ytdl = require("ytdl-core");
const {
	joinVoiceChannel,
	VoiceConnectionStatus,
	createAudioPlayer,
	createAudioResource,
	AudioPlayerStatus,
} = require("@discordjs/voice");

const { findMember, arrayRandom } = require("./discordUtil");

let bedtimes = {};
const bedtimeReplies = [
	"nick should really go to bed.",
	"Its time for nick to turn into a pumpkin.",
	"Its sleepy time for nick!",
	"Oh noes, its that time again for nick!",
	"From all of us at http://wwn.nebcorp.com - we wish nick good night.",
];
const bedtimeSounds = [
	"https://www.youtube.com/watch?v=eISzv8Ry45U",
	"https://www.youtube.com/watch?v=uxkVSLv1dRQ",
	"https://www.youtube.com/watch?v=n0XaSvhTYd4",
	"https://www.youtube.com/watch?v=_FCp8wCm2Sw",
	"https://www.youtube.com/watch?v=4q1Zs3vbX8M",
];
const reBedtime = /\bset.+\b(\w{2,})(?:'s?)?\b.+bed.+to ([\d: \-AMPamp]+)\b/i;
const reBedtimeClear = /\b(?:clear|cancel|remove).+\b(\w{2,})(?:'s?)?\b.+bed/i;
function parseTime(timeString) {
	if (!timeString) {
		return null;
	}

	const time = timeString.match(/(\d+)(:(\d\d))?\s*(p?)(a?)/i);
	if (time == null) return null;
	const specifiedPM = time[4];
	const specifiedAM = time[5];

	let hours = parseInt(time[1], 10);
	const unclearTime = hours < 12 && !specifiedAM && !specifiedPM;
	if (hours === 12 && !specifiedPM) {
		hours = 0;
	} else {
		hours += hours < 12 && specifiedPM ? 12 : 0;
	}
	const d = new Date();
	d.setHours(hours);
	d.setMinutes(parseInt(time[3], 10) || 0);
	d.setSeconds(0, 0);

	if (d < new Date()) {
		console.debug("parsedTime", d, "was in past, advancing 24h");

		d.setDate(d.getDate() + 1);
		if (unclearTime && d.getTime() > Date.now() + 60000 * 60 * 12) {
			console.debug(
				"parsedTime was non-specific and > 12h in advance, subtracting 12h."
			);
			d.setHours(d.getHours() - 12);
		}
	}

	return d;
}
function processBedtime(memberId, playSound = false) {
	if (!bedtimes[memberId]) {
		return;
	}
	const member = bedtimes[memberId].member;
	member.fetch().then(async (member) => {
		console.log("inside fetch", member, member.voice.channel);
		if (member && member.voice.channel) {
			const connection = joinVoiceChannel({
				channelId: member.voice.channelId,
				guildId: member.guild.id,
				adapterCreator: member.guild.voiceAdapterCreator,
			});

			connection.on(VoiceConnectionStatus.Ready, () => {
				const player = createAudioPlayer();
				const ytStream = ytdl(arrayRandom(bedtimeSounds), {
					filter: "audioonly",
				});
				const resource = createAudioResource(ytStream, { inlineVolume: true });
				resource.volume.setVolume(0.5);
				connection.subscribe(player);
				player.play(resource);
				player.on(AudioPlayerStatus.Idle, () => {
					member.voice.kick("Bedtime!");
					connection.destroy();
				});
			});

			bedtimes[memberId].reply(
				arrayRandom(bedtimeReplies).replace("nick", bedtimes[memberId].name)
			);
		}
		if (Date.now() > bedtimes[memberId].time + 60000 * 60) {
			clearInterval(bedtimes[memberId].interval);
		}
	});
}

function handleCommandBedtime(msg, bedtimeMatch) {
	const nickSearch = bedtimeMatch[1].toLowerCase();
	const targetTime = momentTz.tz(
		parseTime(bedtimeMatch[2]),
		"America/Vancouver"
	);
	if (targetTime) {
		msg.guild.members
			.fetch({ query: nickSearch })
			.then((guildMembers) => {
				const target = findMember(guildMembers, nickSearch);
				if (target) {
					const targetId = target.id;
					if (bedtimes[targetId]) {
						clearTimeout(bedtimes[targetId].timer);
						clearInterval(bedtimes[targetId].interval);
					}
					const currentTimeMs = Date.now();
					const targetTimeMs = targetTime.valueOf();
					const delay = targetTimeMs - currentTimeMs;
					console.debug(
						`Setting bedtime of ${target.displayName} to ${targetTime} in ${
							delay / 60000
						} minutes`
					);

					bedtimes[targetId] = {
						member: target,
						name: target.displayName,
						time: targetTime,
						timer: setTimeout(() => {
							processBedtime(targetId, true);
							bedtimes[targetId].interval = setInterval(
								() => processBedtime(targetId, Math.random() < 0.333),
								(1 + Math.random() * 4) * 60000
							);
						}, delay),
						reply: (text) => msg.reply(text),
					};
					const timeHhmm = targetTime.format("hh:mm");
					msg.reply(
						`Ok sure: ${target.displayName}'s bedtime set to ${timeHhmm} PST`
					);
				}
			})
			.catch(console.error);
	}
}

function handleCommandBedtimeClear(msg, bedtimeClearMatch) {
	const nickSearch = bedtimeClearMatch[1].toLowerCase();
	msg.guild.members.fetch({ query: nickSearch }).then((guildMembers) => {
		const target = findMember(guildMembers, nickSearch);
		if (target && bedtimes[target.id]) {
			clearTimeout(bedtimes[target.id].timer);
			clearInterval(bedtimes[target.id].interval);
			delete bedtimes[target.id];
			msg.reply(`Ok, its cleared.`);
		}
	});
}

module.exports = {
	reBedtime,
	reBedtimeClear,
	handleCommandBedtime,
	handleCommandBedtimeClear,
};
