'use strict';

const
    Response = require("./response"),
    GraphAPi = require("./graph-api"),
    db = require("./db"),
    i18n = require("../i18n.config");

module.exports = class Receive {
    constructor(user, webhookEvent) {
        this.user = user;
        this.webhookEvent = webhookEvent;
    }

    // Check if the event is a message or postback and
    // call the appropriate handler function
    async handleMessage() {
        let event = this.webhookEvent;

        let responses;

        try {
            if (event.message) {
                let message = event.message;

                if (message.quick_reply) {
                    responses = await this.handleQuickReply();
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

        if (message === "hello" || message === "hi") {
            response = [
                //Response.genText("Hi, " + this.user.firstName + "! What can we do to help you today?"),
                Response.genQuickReply("Hi, " + this.user.firstName + "! What can we do to help you today?", [
                    {
                        title: "Shop",
                        payload: "shop"
                    },
                    {
                        title: "FAQs",
                        payload: "faqs"
                    }
                ])
            ];
        } else {
            response = Response.genText("I don't understand.");
        }

        return response;
    }

    // Handles mesage events with quick replies
    async handleQuickReply() {
        // Get the payload of the quick reply
        let payload = this.webhookEvent.message.quick_reply.payload;

        return await this.handlePayload(payload);
    }

    async handlePayload(payload) {
        // Log CTA event in FBA
        GraphAPi.callFBAEventsAPI(this.user.psid, payload);

        let response, list;

        // Set the response based on the payload
        if (payload === "shop") {
            response = Response.genText("What are you looking for?");
        } else if (payload === "faqs") {
            const dbase = db.getDbServiceInstance();
            let query = "SELECT DISTINCT category FROM FAQs";
            const r = await dbase.queryData(query);
            list = await dbase.convertToList(r);
            const result = await dbase.keyboardButton(list);
            let temp = "\n\n";

            for (var i = 0; i < result.length; i++) {
                temp = temp + (result[i].title + "\n");
            }

            response = Response.genQuickReply("Please select from the following FAQs:" + temp, result)
        } else {
            console.log(list);
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