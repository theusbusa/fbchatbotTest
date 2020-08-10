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
                    responses = await this.handleTextMessage();
                }
            } else if (event.postback) {
                responses = await this.handlePostback();
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
    async handleTextMessage() {
        console.log(
            "Received text:",
            `${this.webhookEvent.message.text} for ${this.user.psid}`
        );

        // check greeting is here and is confident
        //let greeting = this.firstEntity(this.webhookEvent.message.nlp, "greetings");

        let message = this.webhookEvent.message.text.trim().toLowerCase();

        let response;

        const dbase = db.getDbServiceInstance();
        const productCateg = await dbase.convertToList(await dbase.queryData("SELECT category FROM Products GROUP BY category")).map(v => v.toLowerCase());
        const productSubcateg = await dbase.convertToList(await dbase.queryData("SELECT subcategory FROM Products GROUP BY subcategory")).map(v => v.toLowerCase());
        console.log(productSubcateg)

        if (message === "hello" || message === "hi") {
            response = [
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
        } else if (message === "faqs" || message === "faq") {
            let query = "SELECT DISTINCT category FROM FAQs";
            const r = await dbase.queryData(query);
            const list = await dbase.convertToList(r);
            const result = await dbase.keyboardButton(list);
            let temp = "\n\n";

            for (var i = 0; i < result.length; i++) {
                temp = temp + (result[i].title + "\n");
            }

            response = Response.genQuickReply("Please select from the following FAQs:" + temp, result);
        } else if (message === "shop") {
            const result = await dbase.queryData("SELECT category, imageURL, gender FROM Products GROUP BY category, gender");
            const element = await dbase.mediaArray(result);

            response = [Response.genText("What are you looking for?"), Response.genImageTemplate2(element)];
        } else if (message.match(new RegExp(productCateg.join('|'), 'g')) !== null && message.match(new RegExp(["men", "women"].join('|'), 'g')) !== null) {
            const categ = message.match(new RegExp(productCateg.join('|'), 'g'))[0].toLowerCase();
            const gender = message.match(new RegExp(["men", "women"].join('|'), 'g'))[0].toLowerCase();
            const result = await dbase.queryData("SELECT subcategory, imageURL, gender FROM Products WHERE category = \"" + categ + "\" AND gender = \"" + gender + "\" GROUP BY subcategory, gender");
            const element = await dbase.mediaArray(result);

            response = Response.genImageTemplate2(element);
        } else if (message.match(new RegExp(productSubcateg.join('|'), 'g')) !== null && message.match(new RegExp(["men", "women"].join('|'), 'g')) !== null) {
            const subcateg = message.match(new RegExp(productSubcateg.join('|'), 'g'))[0].toLowerCase();
            const gender = message.match(new RegExp(["men", "women"].join('|'), 'g'))[0].toLowerCase();
            const result = await dbase.queryData("SELECT productName, price, imageURL, productURL FROM Products WHERE subcategory = \"" + subcateg + "\" AND gender = \"" + gender + "\"");

            if (result.length !== 0) {
                const element = await dbase.mediaArray(result);
                response = Response.genImageTemplate2(element);
            } else {
                response = Response.genText("Sorry, we don't have that kind of item.");
            }
            
        } else if (message.match(new RegExp(productCateg.join('|'), 'g')) !== null) {
            const categ = message.match(new RegExp(productCateg.join('|'), 'g'))[0].toLowerCase();
            const result = await dbase.queryData("SELECT category, imageURL, gender FROM Products WHERE category = \"" + categ + "\" GROUP BY category, gender");
            const element = await dbase.mediaArray(result);

            response = Response.genImageTemplate2(element);
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

        let response;

        console.log(payload)
        const dbase = db.getDbServiceInstance();
        const categ = await dbase.convertToList(await dbase.queryData("SELECT DISTINCT category FROM FAQs"));
        const articles = await dbase.convertToList(await dbase.queryData("SELECT DISTINCT articles FROM FAQs"));
        const productCateg = await dbase.convertToList(await dbase.queryData("SELECT DISTINCT CONCAT_WS(\"_\", category, gender) FROM Products"));
        const productSubcateg = await dbase.convertToList(await dbase.queryData("SELECT DISTINCT CONCAT_WS(\"_\", subcategory, gender) FROM Products"));

        // Set the response based on the payload
        if (payload === "hello" || payload === "hi") {
            response = [
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
        } else if(payload === "shop") {
            const result = await dbase.queryData("SELECT category, imageURL, gender FROM Products GROUP BY category, gender");
            const element = await dbase.mediaArray(result);

            response = [Response.genText("What are you looking for?"), Response.genImageTemplate2(element)];
        } else if (payload === "faqs") {
            const list = await dbase.convertToList(await dbase.queryData("SELECT DISTINCT category FROM FAQs"));
            const result = await dbase.keyboardButton(list);
            let temp = "\n\n";

            for (var i = 0; i < result.length; i++) {
                temp = temp + (result[i].title + "\n");
            }

            response = Response.genQuickReply("Please select from the following top FAQs:" + temp, result);
        } else if (categ.indexOf(payload) > -1) {
            const list = await dbase.convertToList(await dbase.queryData("SELECT articles FROM FAQs WHERE category = \"" + payload + "\""));
            let temp = "\n\n";
            let choice = [];

            for (var i = 0; i < list.length; i++) {
                choice.push(i + 1)
                temp = temp + ((i + 1).toString() + ". " + list[i].replace(/\n$/, '') + "\n");
            }

            choice = await dbase.keyboardButton(choice, list);
            response = Response.genQuickReply("Please select from the following FAQs:" + temp, choice);
        } else if (articles.indexOf(payload) > -1) {
            const result = await dbase.queryData("SELECT answers, imageURL FROM FAQs WHERE articles = \"" + payload + "\"");

            console.log(result[0].answers);
            console.log(result[0].imageURL);
            response = [Response.genText(result[0].answers), Response.genImageTemplate(result[0].imageURL)];
        } else if (productCateg.indexOf(payload) > -1) {
            const categ = payload.split("_")[0];
            const gender = payload.split("_")[1];
            const result = await dbase.queryData("SELECT subcategory, imageURL, gender FROM Products WHERE category = \"" + categ + "\" AND gender = \"" + gender + "\" GROUP BY subcategory");
            const element = await dbase.mediaArray(result);

            response = Response.genImageTemplate2(element);
        } else if (productSubcateg.indexOf(payload) > -1) {
            const subcateg = payload.split("_")[0];
            const gender = payload.split("_")[1];
            const result = await dbase.queryData("SELECT productName, price, imageURL, productURL FROM Products WHERE subcategory = \"" + subcateg + "\" AND gender = \"" + gender + "\"");
            const element = await dbase.mediaArray(result);

            response = Response.genImageTemplate2(element);
        } else {
            response = Response.genText("I don't understand.")
        }

        return response;
    }

    // Handles postbacks events
    async handlePostback() {
        let postback = this.webhookEvent.postback;
        // Check for the special Get Starded with referral
        let payload;
        if (postback.referral && postback.referral.type == "OPEN_THREAD") {
            payload = postback.referral.ref;
        } else {
            // Get the payload of the postback
            payload = postback.payload;
        }
        return await this.handlePayload(payload);
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