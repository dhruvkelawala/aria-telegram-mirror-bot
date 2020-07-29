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
var bot = require('./utils/bot');
var search = require("./utils/api");
var downloader_1 = require("./download_tools/downloader");
var redis = require("redis");
var client = redis.createClient({
    url: process.env.REDIS_URL
});
// bot.onText(/\/start/, (msg: TelegramBot.Message) => {
//   const chatId = msg.chat.id;
//   const resp = `Hello fellow Prix User. Thanks for using Prix. Using this bot, you can REQUEST some content using /request or REPORT A BUG using /bug.`;
//   bot.sendMessage(chatId, resp);
// });
// bot.onText(/^\/request (.+)/, (msg: TelegramBot.Message) => {
//   const req = msg.text.split(' ');
//   const chatId = msg.chat.id;
//   let contentType = req[1];
//   let respMessage;
//   if (contentType === '#movie') {
//     respMessage = 'Your Movie has been requested!';
//     forwardRequest('Movie', req.slice(2).join(' '));
//   } else if (contentType === '#show') {
//     respMessage = 'Your Show has been requested!';
//     forwardRequest(
//       'Show',
//       `${req.slice(2, req.indexOf('#season')).join(' ')} S0${req
//         .slice(req.indexOf('#season') + 1)
//         .join(' ')}`
//     );
//   } else {
//     respMessage = `Please follow the proper format. /request #movie MovieName or /request #show ShowName #season SeasonNumber`;
//   }
//   bot.sendMessage(chatId, respMessage);
// });
bot.onText(/^\/request$/, function (msg) {
    var opts = {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: 'Movie',
                        callback_data: 'movie'
                    },
                    {
                        text: 'Show',
                        callback_data: 'show'
                    },
                ],
            ]
        }
    };
    bot.sendMessage(msg.from.id, 'Which type of content do you want to request?', opts);
});
bot.on('callback_query', function onCallbackQuery(callbackQuery) {
    return __awaiter(this, void 0, void 0, function () {
        var action, msg, opts, text, actionList, buttons, modText, respMsg_1, senderText;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    action = callbackQuery.data;
                    msg = callbackQuery.message;
                    opts = {
                        chat_id: msg.chat.id,
                        message_id: msg.message_id
                    };
                    if (!(action === 'movie' || action === 'show')) return [3 /*break*/, 1];
                    if (action === 'movie') {
                        text = 'Movie Requested';
                        bot.editMessageText(text, opts);
                        getContent(msg);
                    }
                    else {
                        text = 'Show Requested';
                        bot.editMessageText(text, opts);
                        getSeason(msg);
                    }
                    return [3 /*break*/, 8];
                case 1:
                    if (!(action.includes('allow') || action.includes('reject'))) return [3 /*break*/, 6];
                    actionList = action.split(':');
                    if (!action.includes('allow')) return [3 /*break*/, 3];
                    text = 'approved';
                    return [4 /*yield*/, searchQuery(actionList[1], actionList[2])];
                case 2:
                    buttons = _a.sent();
                    if (buttons.length === 0) {
                        bot.sendMessage(opts.chat_id, 'Cannot Find the content', opts);
                        bot.sendMessage(actionList[3], "The content you requested(" + actionList[2] + ") was accepted but unfortunately, no result was found!");
                    }
                    else {
                        opts.reply_markup = { inline_keyboard: buttons };
                        console.log(opts);
                    }
                    return [3 /*break*/, 4];
                case 3:
                    text = 'rejected';
                    _a.label = 4;
                case 4:
                    modText = "Request of a " + actionList[1] + " named " + actionList[2] + " has been " + text + " by " + callbackQuery.from.first_name + "!";
                    return [4 /*yield*/, bot.editMessageText(modText, opts)];
                case 5:
                    respMsg_1 = _a.sent();
                    senderText = "Your request of " + actionList[2] + " has been " + text;
                    bot.sendMessage(actionList[3], senderText);
                    if (text === 'rejected') {
                        setTimeout(function () {
                            bot.deleteMessage(opts.chat_id, respMsg_1.message_id);
                        }, 10000);
                    }
                    return [3 /*break*/, 8];
                case 6: return [4 /*yield*/, getMagnet(action, msg)];
                case 7:
                    _a.sent();
                    _a.label = 8;
                case 8: return [2 /*return*/];
            }
        });
    });
});
var getSeason = function (msg) { return __awaiter(void 0, void 0, void 0, function () {
    var opts, text, reqMsg1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                opts = {
                    chat_id: msg.chat.id,
                    user: msg.from.first_name,
                    reply_markup: {
                        force_reply: true
                    }
                };
                text = 'Now send the name of the show you want';
                return [4 /*yield*/, bot.sendMessage(opts.chat_id, text, opts)];
            case 1:
                reqMsg1 = _a.sent();
                bot.onReplyToMessage(opts.chat_id, reqMsg1.message_id, function (showNameMsg) { return __awaiter(void 0, void 0, void 0, function () {
                    var respMsg;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, bot.sendMessage(opts.chat_id, "Send Season Number", opts)];
                            case 1:
                                respMsg = _a.sent();
                                bot.onReplyToMessage(opts.chat_id, respMsg.message_id, function (seasonMsg) {
                                    forwardRequest('Show', showNameMsg.text + " S0" + seasonMsg.text, opts);
                                    bot.sendMessage(opts.chat_id, "Season " + seasonMsg.text + " of " + showNameMsg.text + " has successfully been requested!");
                                });
                                return [2 /*return*/];
                        }
                    });
                }); });
                return [2 /*return*/];
        }
    });
}); };
var getContent = function (msg) { return __awaiter(void 0, void 0, void 0, function () {
    var opts, text, reqMsg;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                opts = {
                    chat_id: msg.chat.id,
                    user: msg.from.first_name,
                    reply_markup: {
                        force_reply: true
                    }
                };
                text = 'Now send the name of the movie you want';
                return [4 /*yield*/, bot.sendMessage(opts.chat_id, text, opts)];
            case 1:
                reqMsg = _a.sent();
                bot.onReplyToMessage(opts.chat_id, reqMsg.message_id, function (respMsg) {
                    forwardRequest('Movie', respMsg.text, opts);
                    bot.sendMessage(opts.chat_id, respMsg.text + " has successfully been requested!");
                });
                return [2 /*return*/];
        }
    });
}); };
var forwardRequest = function (content, text, senderOpts) {
    var MOD_CHAT_ID = '-405342289';
    var opts = {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: "Allow",
                        callback_data: "allow:" + content + ":" + text + ":" + senderOpts.chat_id
                    },
                    {
                        text: "Reject",
                        callback_data: "reject:" + content + ":" + text + ":" + senderOpts.chat_id
                    },
                ],
            ]
        }
    };
    text = "A " + content + " named " + text + " has been requested by " + senderOpts.user;
    bot.sendMessage(MOD_CHAT_ID, text, opts);
};
var searchQuery = function (content, query) { return __awaiter(void 0, void 0, void 0, function () {
    var buttons, searchResult, queryKey, i, callback;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                buttons = [];
                console.log(query);
                return [4 /*yield*/, search(query)];
            case 1:
                searchResult = _a.sent();
                if (searchResult.length <= 0) {
                    return [2 /*return*/, buttons];
                }
                queryKey = Math.random().toString(36).substring(7);
                for (i = 0; i <= 5; i++) {
                    callback = Math.random().toString(36).substring(7) + ':' + queryKey;
                    client.set(callback, searchResult[i]);
                    buttons.push([
                        {
                            text: "" + searchResult[i].name,
                            callback_data: "" + callback
                        },
                    ]);
                }
                buttons.push([
                    {
                        text: 'REJECT',
                        callback_data: "reject:" + content + ":" + query
                    },
                ]);
                return [2 /*return*/, buttons];
        }
    });
}); };
var getMagnet = function (action, msg) { return __awaiter(void 0, void 0, void 0, function () {
    var opts;
    return __generator(this, function (_a) {
        opts = {
            chat_id: msg.chat.id,
            message_id: msg.message_id
        };
        client.get(action, function (err, data) {
            if (err) {
                console.log(err);
            }
            else {
                if (data.magnet === undefined) {
                    bot.editMessageText('Failed to get the magnet link', opts);
                }
                else {
                    bot.editMessageText("Downloading " + data.name, opts);
                    downloader_1.mirror(msg, data.magnet);
                }
            }
        });
        return [2 /*return*/];
    });
}); };
