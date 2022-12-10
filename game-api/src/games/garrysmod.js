const {
	dockerComposeBuild,
	steamWorkshopGetModSearch,
} = require("./common-helpers");
const GenericDockerManager = require("./docker");

module.exports = class GarrysmodManager extends GenericDockerManager {
	constructor({ getCurrentStatus, setStatus }) {
		super({ getCurrentStatus, setStatus });
		this.APPID = 4000;
	}
	update() {
		dockerComposeBuild({
			commandOptions: [["--build-arg", `TRIGGER_UPDATE=${Date.now()}`]],
		})
			.then((res) => {
				console.log("finished gmod update: ", res);
				this.setStatus("stopped");
			})
			.catch((e) => {
				console.error("update error: ", e);
				this.setStatus("stopped");
			});
	}
	async getModsTodo() {}
	async setModsTodo(modsList) {
		try {
			// todo
		} catch (e) {
			console.error("setMods error: ", e);
			return false;
		}
	}
	async getModSearch(query) {
		return steamWorkshopGetModSearch(this.APPID, query);
	}
	async filesToBackupTodo() {}
};
