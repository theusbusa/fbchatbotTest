'use strict';

const
    mysql = require("mysql"); // npm install mysql --save

let instance = null;

const con = mysql.createConnection({
    host: "dev-db.cgy3xpod6h10.ap-southeast-1.rds.amazonaws.com",
    user: "root",
    password: "0^^N!pot3ncE",
    database: "omnichannel"
});

con.connect(function (err) {
    if (err) {
        console.log(err.message);
    }
    console.log("DATABASE CONNECTED!");
});

module.exports = class DbService {
    static getDbServiceInstance() {
        return instance ? instance : new DbService();
    }

    async queryData(query) {
        try {
            const response = await new Promise((resolve, reject) => {
                con.query(query, (err, result) => {
                    if (err) reject(new Error(err.message));
                    //const array = this.keyboardButton(result);
                    
                    resolve(result);
                })
            });

            //console.log(response);
            return response;
        } catch (error) {
            console.log(error);
        }
    }

    keyboardButton(result) {
        let array = []

        for (var i = 0; i < result.length; i++) {
            //console.log(result[i].category);
            array.push({ title: result[i].category, payload: result[i].category });
        }

        return array;
    }
};