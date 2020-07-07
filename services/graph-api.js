"use strict";

// Imports dependencies
const request = require("request"),
	camelCase = require("camelcase"), // npm install camelcase --save
	config = require("./config");

module.exports = class GraphAPi {
	static callSendAPI(requestBody) {
		// Send the HTTP request to the Messenger Platform
		request(
			{
				uri: `${config.mPlatfom}/me/messages`,
				qs: {
					access_token: config.pageAccesToken
				},
				method: "POST",
				json: requestBody
			},
			error => {
				if (error) {
					console.error("Unable to send message:", error);
				}
			}
		);
	}

	static async getUserProfile(senderPsid) {
		try {
			const userProfile = await this.callUserProfileAPI(senderPsid);

			for (const key in userProfile) {
				const camelizedKey = camelCase(key);
				const value = userProfile[key];
				delete userProfile[key];
				userProfile[camelizedKey] = value;
			}

			return userProfile;
		} catch (err) {
			console.log("Fetch failed:", err);
		}
	}

	static callUserProfileAPI(senderPsid) {
		return new Promise(function(resolve, reject) {
			let body = [];

			// Send the HTTP request to the Graph API
			console.log("WAWAWA:", config.mPlatform)
			request({
				"uri": `${config.mPlatform}/${senderPsid}`,
				"qs": {
					"access_token": config.pageAccesToken,
					"fields": "first_name, last_name, gender, locale, timezone"
				},
				"method": "GET"
			})
				.on("response", function(response) {
					if (response.statusCode !== 200) {
						reject(Error(response.statusCode));
					}
				})
				.on("data", function(chunk) {
					body.push(chunk);
				})
				.on("error", function(error) {
					console.error("unable to fetch profile:" + error);
					reject(Error("Network Error"));
				})
				.on("end", () => {
					body = Buffer.concat(body).toString();
					resolve(JSON.parse(body))
				});
		});
	}
}