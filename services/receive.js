'use strict';

const
    Response = require("./response"),
    GraphAPi = require("./graph-api"),
    i18n = require("../i18n.config");

module.exports = class Receive {
    constructor(user, webhookEvent) {
        this.user = user;
        this.webhookEvent = webhookEvent;
    }

    // Check if the event is a message or postback and
    // call the appropriate handler function
    handleMessage() {
        let event = this.webhookEvent;

        let responses;

        try {
            if (event.message) {
                let message = event.message;

                if (message.quick_reply) {
                    responses = this.handleQuickReply();
                } else if (message.attachments) {
                    responses = this.handleAttachmentMessage();
                } else if (message.text) {
                    responses = this.handleTextMessage();
                }
            } else if (event.postback) {
                responses = this.handlePostback();
            } else if (event.referral) {
                responses = this.handleReferral();
            }
        } catch (error) {
            console.error(error);
            responses = {
                text: `An error has occured: '${error}'. We have been notified and \
        will fix the issue shortly!`
            };
        }

        if (Array.isArray(responses)) {
            let delay = 0;
            for (let response of responses) {
                this.sendMessage(response, delay * 2000);
                delay++;
            }
        } else {
            this.sendMessage(responses);
        }
    }

    // Handles messages events with text
    handleTextMessage() {
        console.log(
            "Received text:",
            `${this.webhookEvent.message.text} for ${this.user.psid}`
        );

        // check greeting is here and is confident
        //let greeting = this.firstEntity(this.webhookEvent.message.nlp, "greetings");

        let message = this.webhookEvent.message.text.trim().toLowerCase();

        let response;

        console.log("USER PROFILE:", GraphAPi.getUserProfile(this.webhookEvent.sender.id))
        if (message === "hello" || message === "hi") {
            response = Response.genText("Hi! What can we do to help you today?")
        } else {
            response = Response.genText("I don't understand.")
        }

        return response;
    }

    sendMessage(response, delay = 0) {
        // Check if there is delay in the response
        if ("delay" in response) {
            delay = response["delay"];
            delete response["delay"];
        }

        // Construct the message body
        let requestBody = {
            recipient: {
                id: this.user.psid
            },
            message: response
        };

        // Check if there is persona id in the response
        if ("persona_id" in response) {
            let persona_id = response["persona_id"];
            delete response["persona_id"];

            requestBody = {
                recipient: {
                    id: this.user.psid
                },
                message: response,
                persona_id: persona_id
            };
        }

        setTimeout(() => GraphAPi.callSendAPI(requestBody), delay);
    }

    firstEntity(nlp, name) {
        return nlp && nlp.entities && nlp.entities[name] && nlp.entities[name][0];
    }
};