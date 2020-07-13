'use strict';

// Imports dependencies and set up http server
const
	express = require('express'),
	{ urlencoded, json } = require('body-parser'),
	Receive = require("./services/receive"),
	GraphAPi = require("./services/graph-api"),
	User = require("./services/user"),
	request = require('request'), // don't forget to install this! npm install request --save
	crypto = require("crypto"), // don't forget to install this! npm install crypto --save
	config = require("./services/config"),
	i18n = require("./i18n.config"),
	app = express(); // creates express http server

var users = {};

// Parse application/x-www-form-urlencoded
app.use(
	urlencoded({
		extended: true
	})
);

// Parse application/json. Verify that callback came from Facebook
app.use(json({ verify: verifyRequestSignature }));

// Creates the endpoint for our webhook
app.post('/webhook', (req, res) => {

	let body = req.body;

	// Checks this is an event from a page subscription
	if (body.object === 'page') {

		// Iterates over each entry - there may be multiple if batched
		body.entry.forEach(function(entry) {
			if ("changes" in entry) {
				// Handle Page Changes event
				let receiveMessage = new Receive();

				if (entry.changes[0].field === "feed") {
					let change = entry.changes[0].value;

					switch (change.item) {
						case "post":
							return receiveMessage.handlePrivateReply(
								"post_id",
								change.post_id
							);
						case "comment":
							return receiveMessage.handlePrivateReply(
								"comment_id",
								change.comment_id
							);
						default:
							console.log("Unsupported feed change type.");
							return;
					}
				}
			}

			// Gets the message. entry.messaging is an array, but
			// will only ever contain one message, so we get index 0
			let webhook_event = entry.messaging[0];
			console.log(webhook_event);

			// Discard uninteresting events
			if ("red" in webhook_event) {
				return;
			}

			if ("delivery" in webhook_event) {
				return;
			}

			// Get the sender PSID
			let sender_psid = webhook_event.sender.id;
			console.log('Sender PSID: ' + sender_psid);

			if (!(sender_psid in users)) {
				let user = new User(sender_psid);

				GraphAPi.getUserProfile(sender_psid)
					.then(userProfile => {
						user.setProfile(userProfile);
					})
					.catch(error => {
						console.log("Profile is unavailable:", error);
					})
					.finally(() => {
						users[sender_psid] = user;
						i18n.setLocale(user.locale);
						console.log(
							"New Profile PSID:",
							sender_psid,
							"with locale:",
							i18n.getLocale()
						);
						let receiveMessage = new Receive(users[sender_psid], webhook_event);
						return receiveMessage.handleMessage();
					});
			} else {
				i18n.setLocale(users[sender_psid].locale);
				console.log(
					"Profile already exists PSID:",
					sender_psid,
					"with locale",
					i18n.getLocale()
				);
				let receiveMessage = new Receive(users[sender_psid], webhook_event);
				return receiveMessage.handleMessage();
            }
		});

		// Returns a '200 OK' response to all requests
		res.status(200).send('EVENT_RECEIVED');
	} else {

		// Returns a '404 Not Found' if event is not from a page subscription
		res.sendStatus(404);
	}

});

// Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {

	// Your verify token. Should be a random string.
	//let VERIFY_TOKEN = "but_aw"

	// Parse the query params
	let mode = req.query['hub.mode'];
	let token = req.query['hub.verify_token'];
	let challenge = req.query['hub.challenge'];

	// Checks if a token and mode is in the query string of the requests
	if (mode && token) {

		// Checks the mode and token sent is correct
		if (mode === 'subscribe' && token === config.verifyToken) {

			// Responds with the challenge token from the requests
			console.log('WEBHOOK_VERIFIED');
			res.status(200).send(challenge);
		} else {
			// Responds with '403 Forbidden' if verify tokens do not match
			res.sendStatus(403);
		}
	}
});

// Verify that the callback came from Facebook.
function verifyRequestSignature(req, res, buf) {
  var signature = req.headers["x-hub-signature"];

  if (!signature) {
    console.log("Couldn't validate the signature.");
  } else {
    var elements = signature.split("=");
    var signatureHash = elements[1];
    var expectedHash = crypto
      .createHmac("sha1", config.appSecret)
      .update(buf)
      .digest("hex");
    if (signatureHash != expectedHash) {
      throw new Error("Couldn't validate the request signature.");
    }
  }
}

// Check if all environment variables are set
config.checkEnvVariables();

// listen for requests :)
var listener = app.listen(config.port, function() {
  console.log("Your app is listening on port " + listener.address().port);

  if (
    Object.keys(config.personas).length == 0 &&
    config.appUrl &&
    config.verifyToken
  ) {
    console.log(
      "Is this the first time running?\n" +
        "Make sure to set the both the Messenger profile, persona " +
        "and webhook by visiting:\n" +
        config.appUrl +
        "/profile?mode=all&verify_token=" +
        config.verifyToken
    );
  }

  if (config.pageId) {
    console.log("Test your app by messaging:");
    console.log("https://m.me/" + config.pageId);
  }
});