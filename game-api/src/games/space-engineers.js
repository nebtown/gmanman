const gamedig = require("gamedig");
const xml2js = require("xml2js");
const fsPromises = require("../libjunkdrawer/fsPromises");
const path = require("path");
const { spawn: spawnProcess } = require("child_process");

const {
	gameDir,
	debugLog,
	connectUrl,
	steamApiKey,
	saveName,
} = require("../cliArgs");
const { steamWorkshopGetModSearch } = require("./common-helpers");

module.exports = class SpaceEngineersManager {
	constructor({ setStatus }) {
		this.setStatus = setStatus;
		this.logData = "";
		this.APPID = 244850;
	}
	getConnectUrl() {
		return `steam://connect/${connectUrl || "gman.nebtown.info:29016"}`;
	}
	start() {
		this.logData += "\n\n\nLaunching...\n";
		this.process = spawnProcess(path.join(gameDir, "Torch.Server.exe"));
		this.process.stdout.on("data", data => {
			let text = data.toString().trim();
			debugLog(text);
			this.logData += text + "\n";
		});
		this.process.stderr.on("data", data => {
			let text = data.toString().trim();
			debugLog(text);
			this.logData += text + "\n";
		});
		this.process.on("close", (code, signal) => {
			this.setStatus("stopped");
		});
	}
	stop() {
		this.process.kill("SIGINT");
	}
	async isProcessRunning() {
		return !!this.process && !this.process.killed;
	}
	async getPlayerCount() {
		try {
			const state = await gamedig.query({
				type: "spaceengineers",
				host: "localhost",
				port: 29016,
			});
			return state.players.length;
		} catch (e) {
			debugLog("gamedig", e.message);
			return false;
		}
	}
	async logs() {
		return this.logData;
	}
	getModsFileName() {
		return path.join(
			gameDir,
			"Instance",
			"Saves",
			saveName,
			"Sandbox_config.sbc"
		);
	}
	async getMods() {
		try {
			const rawXml = await fsPromises.readFile(this.getModsFileName());
			const result = await xml2js.parseStringPromise(rawXml);
			return result.MyObjectBuilder_WorldConfiguration.Mods[0].ModItem.map(
				({ $: { FriendlyName }, PublishedFileId }) => ({
					id: PublishedFileId[0],
					label: FriendlyName,
					href: `https://steamcommunity.com/sharedfiles/filedetails/?id=${
						PublishedFileId[0]
					}`,
					enabled: true,
				})
			);
		} catch (err) {
			console.warn("getMods", err);
			return [];
		}
	}
	async setMods(modsList) {
		try {
			const rawXml = await fsPromises.readFile(this.getModsFileName());
			const parsedXml = await xml2js.parseStringPromise(rawXml);
			const oldMods =
				parsedXml.MyObjectBuilder_WorldConfiguration.Mods[0].ModItem;
			parsedXml.MyObjectBuilder_WorldConfiguration.Mods[0].ModItem = modsList
				.filter(({ enabled }) => enabled)
				.map(({ id, label, enabled }) => {
					const oldMod = oldMods.find(
						({ PublishedFileId }) => PublishedFileId[0] === id
					);
					if (oldMod) {
						return oldMod;
					}

					return {
						$: {
							FriendlyName: label,
						},
						Name: [`${id}.sbm`],
						PublishedFileId: [id],
					};
				});
			await fsPromises.writeFile(
				this.getModsFileName(),
				new xml2js.Builder().buildObject(parsedXml)
			);
			return true;
		} catch (err) {
			console.warn("setMods", err);
			return false;
		}
	}
	async getModSearch(query) {
		return steamWorkshopGetModSearch(this.APPID, query);
	}
	async filesToBackup() {
		return [
			path.join("Instance", "Saves", "LastSession.sbl"),
			...(await fsPromises.readdir(path.join("Instance", "Saves", saveName)))
				.filter(file => file !== "Backup")
				.map(file => path.join("Instance", "Saves", saveName, file)),
			path.join("Instance", "Storage"),
			path.join("Instance", "SpaceEngineers-Dedicated.cfg"),
			path.join("Instance", "appworkshop_244850.acf"),
		];
	}
};

if (!steamApiKey) {
	console.warn("WARNING: --steamApiKey not found, mod searching disabled");
	delete module.exports.prototype.getModSearch;
}
