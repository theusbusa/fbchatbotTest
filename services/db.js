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

    // Convert list to quick reply button format
    keyboardButton(result, pl = null) {
        let array = []

        for (var i = 0; i < result.length; i++) {
            if (pl === null) {
                array.push({ title: result[i], payload: result[i] });
            } else {
                array.push({ title: result[i], payload: pl[i] });
            }
            
        }

        return array;
    }

    // Convert query result to list
    convertToList(result) {
        let array = []

        for (var i = 0; i < result.length; i++) {
            var t = result[i]
            array.push(t[Object.keys(t)[0]]);
        }

        return array;
    }

    mediaArray(result) {
        let array = []

        if (Object.keys(result[0]).length === 3) {
            for (var i = 0; i < result.length; i++) {
                var t = result[i]
                array.push({ title: t[Object.keys(t)[0]], subtitle: "", image_url: t[Object.keys(t)[1]], buttons: [{ type: "postback", title: t[Object.keys(t)[0]], payload: t[Object.keys(t)[0]] + "_" + t[Object.keys(t)[2]] }] });
            }
        } else if (Object.keys(result[0]).length === 4) {
            for (var i = 0; i < result.length; i++) {
                var t = result[i]
                array.push({ title: t[Object.keys(t)[0]], subtitle: "PHP" + t[Object.keys(t)[1]], image_url: t[Object.keys(t)[2]], buttons: [{ type: "web_url", title: "Order Here", url: t[Object.keys(t)[3]] }] });
            }
        }
        

        console.log(array)
        return array;
    }
};