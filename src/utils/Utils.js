const request = require("request");
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");

let packageJson;
let projectPrefix;

class Utils {

	static getPackageJson() {
		const folder = vscode.workspace.rootPath;

		try {
			packageJson = JSON.parse(fs.readFileSync(path.join(folder, "package.json"), "utf-8"));
			projectPrefix = packageJson.name.split("-")[0];

			return packageJson;
		} catch (e) {
			console.warn("Unable to find package.json");
		}

		return {};
	}

	static get projectPrefix() {
		return projectPrefix;
	}

	static async getServiceList() {
		try {
			const url = `${this.getApiDocUrl()}/service-list`;

			return (await Utils.makeRequest(url)).services;
		} catch (err) {
			throw `Is ${Utils.getApiDocUrl()} running the latest version of fruster-api-doc?`
		}
	}

    /**
     * @param {String} service
    */
	static async getServiceEndpointsList(service) {
		const url = `${this.getApiDocUrl()}/service/${service}/endpoints`;
		return (await Utils.makeRequest(url)).endpoints;
	}

    /**
     * @param {String} service
     * @param {Array<String>} subjects
    */
	static async downloadServiceClient(service, subjects = []) {
		const url = `${this.getApiDocUrl()}/service-client/${service}?subjects=${subjects.join(",")}`;
		return (await Utils.makeRequest(url, { stringResponse: true }));
	}

	static getApiDocUrl() {
		return `http://${projectPrefix}-api-doc.c4.fruster.se`;
	}

    /**
     * @param {String} url
     * @param {Object} options
     * @param {Boolean} options.stringResponse
    */
	static makeRequest(url, { stringResponse } = { stringResponse: false }) {
		return new Promise((resolve, reject) => {
			request(url, (error, response, body) => {
				try {
					if (error)
						return reject(error);
					else if (stringResponse)
						resolve(body);
					else
						resolve(JSON.parse(body));
				} catch (err) {
					reject(err);
				}
			});
		});
	}

}

Utils.getPackageJson();

module.exports = Utils;
