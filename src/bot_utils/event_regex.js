"use strict";
exports.__esModule = true;
exports.EventRegex = void 0;
var constants = require("../.constants");
var regexps = require("./reg_exps");
var EventRegex = /** @class */ (function () {
    function EventRegex() {
        var _this = this;
        var commands = ['^/start', '^/mirrorTar', '^/mirror', '^/mirrorStatus', '^/list', '^/getFolder', '^/cancelMirror', '^/cancelAll', '^/disk'];
        var commandsNoName = [];
        var commandAfter = ['$', ' (.+)', ' (.+)', '$', ' (.+)', '$', '$', '$', '$'];
        if (constants.COMMANDS_USE_BOT_NAME && constants.COMMANDS_USE_BOT_NAME.ENABLED) {
            commands.forEach(function (command, i) {
                if (command === '^/list') {
                    // In case of more than one of these bots in the same group, we want all of them to respond to /list
                    commands[i] = command + commandAfter[i];
                }
                else {
                    commands[i] = command + constants.COMMANDS_USE_BOT_NAME.NAME + commandAfter[i];
                }
                commandsNoName.push(_this.getNamelessCommand(command, commandAfter[i]));
            });
        }
        else {
            commands.forEach(function (command, i) {
                commands[i] = command + commandAfter[i];
                commandsNoName.push(_this.getNamelessCommand(command, commandAfter[i]));
            });
        }
        this.commandsRegex = new regexps.RegExps(commands);
        this.commandsRegexNoName = new regexps.RegExps(commandsNoName);
    }
    EventRegex.prototype.getNamelessCommand = function (command, after) {
        return "(" + command + "|" + command + "@[\\S]+)" + after;
    };
    return EventRegex;
}());
exports.EventRegex = EventRegex;
