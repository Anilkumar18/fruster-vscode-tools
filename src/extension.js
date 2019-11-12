const vscode = require("vscode");
const Utils = require("./utils/Utils");
const path = require("path");
const fs = require("fs-extra");

class FrusterVsCodeTools {

	constructor() {
		this.addServiceClientDisposable = vscode.commands.registerCommand("extension.fruster.add-service-client", () => this.addServiceClient());
	}

    /**
     * @param {vscode.ExtensionContext} context
    */
	async activate(context) {
		context.subscriptions.push(this.addServiceClientDisposable);
	}

	deactivate() { }

	async addServiceClient() {
		const ALL_ENDPOINTS = "All endpoints";
		const REDOWNLOAD_EXISTING_ENDPOINTS = "Redownload existing endpoints";

		const services = await Utils.getServiceList();
		services.sort();

		const selectedService = await vscode.window.showQuickPick(services);

		const endpoints = await Utils.getServiceEndpointsList(selectedService);
		endpoints.sort();

		let selectedEndpoint;
		const endpointsToGet = new Set();

		const filename = formatServiceClientName(selectedService);
		const filePath = path.join(vscode.workspace.rootPath, "lib", "clients", filename);

		(await getExistingEndpoints(filePath)).forEach(endpoint => endpointsToGet.add(endpoint));

		const endpointList = new Set();

		endpoints.forEach(({ subject }) => endpointList.add(subject));

		let hasEndpoints = !!endpointsToGet.size;

		do {
			Array.from(endpointsToGet).forEach(endpoint => endpointList.delete(endpoint));

			let endpointsToShow = [];

			if (hasEndpoints)
				endpointsToShow = [ALL_ENDPOINTS, REDOWNLOAD_EXISTING_ENDPOINTS, ...endpointList];
			else
				endpointsToShow = [ALL_ENDPOINTS, ...endpointList];

			selectedEndpoint = await vscode.window.showQuickPick(endpointsToShow);

			if (selectedEndpoint === ALL_ENDPOINTS) {
				selectedEndpoint = undefined;
				endpointList.forEach(endpoint => endpointsToGet.add(endpoint));
			}
			else if (selectedEndpoint === REDOWNLOAD_EXISTING_ENDPOINTS) {
				selectedEndpoint = undefined;
				Array.from(endpointsToGet).forEach(endpoint => endpointsToGet.add(endpoint));
			} else if (!!selectedEndpoint)
				endpointsToGet.add(selectedEndpoint);
		} while (!!selectedEndpoint && !(endpointList.size === 1 || endpointList.size === 2 && Array.from(endpointList)[1] === REDOWNLOAD_EXISTING_ENDPOINTS))

		if (!endpointsToGet.size)
			return;


		const file = await Utils.downloadServiceClient(selectedService, Array.from(endpointsToGet));

		fs.ensureFileSync(filePath);
		fs.writeFileSync(filePath, file.toString(), "utf8");
	}

}

module.exports = new FrusterVsCodeTools();

async function getExistingEndpoints(filePath) {
	if (fs.existsSync(filePath)) {
		const file = fs.readFileSync(filePath).toString();
		const lines = file.split("\n");

		let foundStart = false;
		let startLine = -1;
		let endLine = -1;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			if (line.includes("static get endpoints() {")) {
				foundStart = true;
				startLine = i;
			} else if (foundStart) {
				if (line.includes("};")) {
					endLine = i;
					break;
				}
			}
		}

		const endpoints = lines.slice(startLine + 3, endLine - 1).filter(line => line !== "" && line !== "\n").map(line => line.split(":")[1].split("\"").join("").split(",").join("").trim());

		return endpoints;
	} else
		return [];
}

function formatServiceClientName(serviceName) {
	let output = "";

	const parts = serviceName.split("-");

	parts.forEach(part => output += part[0].toUpperCase() + part.substring(1));

	output += "Client.js";

	return output;
}
