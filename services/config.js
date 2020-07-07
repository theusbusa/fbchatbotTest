'use strict';

// Required environment variables
const ENV_VARS = [
  "PAGE_ID",
  "APP_ID",
  "PAGE_ACCESS_TOKEN",
  "APP_SECRET",
  "VERIFY_TOKEN",
  "APP_URL"
];

module.exports = {
  // Messenger Platform API
  mPlatformDomain: "https://graph.facebook.com",
  mPlatformVersion: "v3.2",

  // Page and Application information
  pageId: process.env.PAGE_ID,
  appId: process.env.APP_ID,
  pageAccesToken: process.env.PAGE_ACCESS_TOKEN,
  appSecret: process.env.APP_SECRET,
  verifyToken: process.env.VERIFY_TOKEN,

  // URL of your app domain
  appUrl: process.env.APP_URL,

  // URL of your website
  //shopUrl: process.env.SHOP_URL,

  // Persona IDs
  personas: {},

  // Preferred port (default to 3000)
  port: process.env.PORT || 3000,

  get mPlatform() {
    return this.mPlatformDomain + "/" + this.mPlatformVersion;
  },

  // URL of your webhook endpoint
  get webhookUrl() {
    return this.appUrl + "/webhook";
  },

  get newPersonas() {
    return [
      {
        name: "Jorge",
        picture: `${this.appUrl}/personas/sales.jpg`
      },
      {
        name: "Laura",
        picture: `${this.appUrl}/personas/billing.jpg`
      },
      {
        name: "Riandy",
        picture: `${this.appUrl}/personas/order.jpg`
      },
      {
        name: "Daniel",
        picture: `${this.appUrl}/personas/care.jpg`
      }
    ];
  },

  pushPersona(persona) {
    this.personas[persona.name] = persona.id;
  },

  get personaSales() {
    let id = this.personas["Jorge"] || process.env.PERSONA_SALES;
    return {
      name: "Jorge",
      id: id
    };
  },

  get personaBilling() {
    let id = this.personas["Laura"] || process.env.PERSONA_BILLING;
    return {
      name: "Laura",
      id: id
    };
  },

  get personaOrder() {
    let id = this.personas["Riandy"] || process.env.PERSONA_ORDER;
    return {
      name: "Riandy",
      id: id
    };
  },

  get personaCare() {
    let id = this.personas["Daniel"] || process.env.PERSONA_CARE;
    return {
      name: "Daniel",
      id: id
    };
  },

  get whitelistedDomains() {
    return [this.appUrl];
  },

  checkEnvVariables: function() {
    ENV_VARS.forEach(function(key) {
      if (!process.env[key]) {
        console.log("WARNING: Missing the environment variable " + key);
      } else {
        // Check that urls use https
        if (["APP_URL"].includes(key)) {
          const url = process.env[key];
          if (!url.startsWith("https://")) {
            console.log(
              "WARNING: Your " + key + ' does not begin with "https://"'
            );
          }
        }
      }
    });
  }
};