"use strict";
exports.__esModule = true;
exports.call = void 0;
var fs = require("fs");
var readline = require("readline");
var googleapis_1 = require("googleapis");
var SCOPE = 'https://www.googleapis.com/auth/drive';
var TOKEN_PATH = './credentials.json';
/**
 * Authorize a client with credentials, then call the Google Drive API.
 * @param {function} callback The callback to call with the authorized client.
 */
function call(callback) {
    // Load client secrets from a local file.
    fs.readFile('./client_secret.json', 'utf8', function (err, content) {
        if (err) {
            console.log('Error loading client secret file:', err.message);
            callback(err.message, null);
        }
        else {
            authorize(JSON.parse(content), callback);
        }
    });
}
exports.call = call;
/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
    var clientSecret = credentials.installed.client_secret;
    var clientId = credentials.installed.client_id;
    var redirectUris = credentials.installed.redirect_uris;
    var oAuth2Client = new googleapis_1.google.auth.OAuth2(clientId, clientSecret, redirectUris[0]);
    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, 'utf8', function (err, token) {
        if (err)
            return getAccessToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token));
        callback(null, oAuth2Client);
    });
}
/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
    var authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPE
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question('Enter the code from that page here: ', function (code) {
        rl.close();
        oAuth2Client.getToken(code, function (err, token) {
            if (err)
                return callback(err.message, null);
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), function (err) {
                if (err)
                    console.error(err);
                console.log('Token stored to', TOKEN_PATH);
            });
            callback(null, oAuth2Client);
        });
    });
}
