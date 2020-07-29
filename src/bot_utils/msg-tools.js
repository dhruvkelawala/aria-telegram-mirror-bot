"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.notifyExternal = exports.isAdmin = exports.isAuthorized = exports.sleep = exports.sendMessageReplyOriginal = exports.sendUnauthorizedMessage = exports.sendMessage = exports.editMessage = exports.deleteMsg = void 0;
var constants = require("../.constants");
var http = require("http");
var ariaTools = require("../download_tools/aria-tools");
var dlm = require("../dl_model/dl-manager");
var dlManager = dlm.DlManager.getInstance();
function deleteMsg(bot, msg, delay) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!delay) return [3 /*break*/, 2];
                    return [4 /*yield*/, sleep(delay)];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2:
                    bot.deleteMessage(msg.chat.id, msg.message_id.toString())["catch"](function (err) {
                        console.log("Failed to delete message. Does the bot have message delete permissions for this chat? " + err.message);
                    });
                    return [2 /*return*/];
            }
        });
    });
}
exports.deleteMsg = deleteMsg;
function editMessage(bot, msg, text, suppressError) {
    return new Promise(function (resolve, reject) {
        if (msg && msg.chat && msg.chat.id && msg.message_id) {
            bot.editMessageText(text, {
                chat_id: msg.chat.id,
                message_id: msg.message_id,
                parse_mode: 'HTML'
            })
                .then(resolve)["catch"](function (err) {
                if (err.message !== suppressError) {
                    console.log("editMessage error: " + err.message);
                }
                reject(err);
            });
        }
        else {
            resolve();
        }
    });
}
exports.editMessage = editMessage;
function sendMessage(bot, msg, text, delay, callback, quickDeleteOriginal) {
    if (!delay)
        delay = 10000;
    bot.sendMessage(msg.chat.id, text, {
        reply_to_message_id: msg.message_id,
        parse_mode: 'HTML'
    })
        .then(function (res) {
        if (callback)
            callback(res);
        if (delay > -1) {
            deleteMsg(bot, res, delay);
            if (quickDeleteOriginal) {
                deleteMsg(bot, msg);
            }
            else {
                deleteMsg(bot, msg, delay);
            }
        }
    })["catch"](function (err) {
        console.error("sendMessage error: " + err.message);
    });
}
exports.sendMessage = sendMessage;
function sendUnauthorizedMessage(bot, msg) {
    sendMessage(bot, msg, "You aren't authorized to use this bot here.");
}
exports.sendUnauthorizedMessage = sendUnauthorizedMessage;
function sendMessageReplyOriginal(bot, dlDetails, message) {
    return bot.sendMessage(dlDetails.tgChatId, message, {
        reply_to_message_id: dlDetails.tgMessageId,
        parse_mode: 'HTML'
    });
}
exports.sendMessageReplyOriginal = sendMessageReplyOriginal;
function sleep(ms) {
    return new Promise(function (resolve) { return setTimeout(resolve, ms); });
}
exports.sleep = sleep;
function isAuthorized(msg, skipDlOwner) {
    for (var i = 0; i < constants.SUDO_USERS.length; i++) {
        if (constants.SUDO_USERS[i] === msg.from.id)
            return 0;
    }
    if (!skipDlOwner && msg.reply_to_message) {
        var dlDetails = dlManager.getDownloadByMsgId(msg.reply_to_message);
        if (dlDetails && msg.from.id === dlDetails.tgFromId)
            return 1;
    }
    if (constants.AUTHORIZED_CHATS.indexOf(msg.chat.id) > -1 &&
        msg.chat.all_members_are_administrators)
        return 2;
    if (constants.AUTHORIZED_CHATS.indexOf(msg.chat.id) > -1)
        return 3;
    return -1;
}
exports.isAuthorized = isAuthorized;
function isAdmin(bot, msg, callback) {
    bot.getChatAdministrators(msg.chat.id)
        .then(function (members) {
        for (var i = 0; i < members.length; i++) {
            if (members[i].user.id === msg.from.id) {
                callback(null, true);
                return;
            }
        }
        callback(null, false);
    })["catch"](function () {
        callback(null, false);
    });
}
exports.isAdmin = isAdmin;
/**
 * Notifies an external webserver once a download is complete.
 * @param {boolean} successful True is the download completed successfully
 * @param {string} gid The GID of the downloaded file
 * @param {number} originGroup The Telegram chat ID of the group where the download started
 * @param {string} driveURL The URL of the uploaded file
 */
function notifyExternal(dlDetails, successful, gid, originGroup, driveURL) {
    if (!constants.DOWNLOAD_NOTIFY_TARGET || !constants.DOWNLOAD_NOTIFY_TARGET.enabled)
        return;
    ariaTools.getStatus(dlDetails, function (err, message, filename, filesize) {
        var name;
        var size;
        if (!err) {
            if (filename !== 'Metadata')
                name = filename;
            if (filesize !== '0B')
                size = filesize;
        }
        // TODO: Check which vars are undefined and make those null
        var data = JSON.stringify({
            successful: successful,
            file: {
                name: name,
                driveURL: driveURL,
                size: size
            },
            originGroup: originGroup
        });
        var options = {
            host: constants.DOWNLOAD_NOTIFY_TARGET.host,
            port: constants.DOWNLOAD_NOTIFY_TARGET.port,
            path: constants.DOWNLOAD_NOTIFY_TARGET.path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };
        var req = http.request(options);
        req.on('error', function (e) {
            console.error("notifyExternal failed: " + e.message);
        });
        req.write(data);
        req.end();
    });
}
exports.notifyExternal = notifyExternal;
