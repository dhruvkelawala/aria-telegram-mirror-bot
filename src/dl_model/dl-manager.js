"use strict";
exports.__esModule = true;
exports.DlManager = void 0;
var dlDetails = require("./detail");
var DlManager = /** @class */ (function () {
    function DlManager() {
        this.allDls = {};
        this.activeDls = {};
        /**
         * Stores all general status messages. General status messages show the status
         * of all downloads. Each chat can have at most 1 general status message.
         * Key: Chat ID: number
         * Value: Status message: TelegramBot.Message
         */
        this.statusAll = {};
        this.statusLock = {};
        this.cancelledMessages = {};
        this.cancelledDls = {};
    }
    DlManager.getInstance = function () {
        if (!DlManager.instance) {
            DlManager.instance = new DlManager();
        }
        return DlManager.instance;
    };
    DlManager.prototype.addDownload = function (gid, dlDir, msg, isTar) {
        var detail = new dlDetails.DlVars(gid, msg, isTar, dlDir);
        this.allDls[gid] = detail;
    };
    DlManager.prototype.getDownloadByGid = function (gid) {
        return this.allDls[gid];
    };
    /**
     * Mark a download as active, once Aria2 starts downloading it.
     * @param dlDetails The details for the download
     */
    DlManager.prototype.moveDownloadToActive = function (dlDetails) {
        dlDetails.isDownloading = true;
        dlDetails.isUploading = false;
        this.activeDls[dlDetails.gid] = dlDetails;
    };
    /**
     * Update the GID of a download. This is needed if a download causes Aria2c to start
     * another download, for example, in the case of BitTorrents. This function also
     * marks the download as inactive, because we only find out about the new GID when
     * Aria2c calls onDownloadComplete, at which point, the metadata download has been
     * completed, but the files download hasn't yet started.
     * @param oldGid The GID of the original download (the download metadata)
     * @param newGid The GID of the new download (the files specified in the metadata)
     */
    DlManager.prototype.changeDownloadGid = function (oldGid, newGid) {
        var dlDetails = this.getDownloadByGid(oldGid);
        this.deleteDownload(oldGid);
        dlDetails.gid = newGid;
        dlDetails.isDownloading = false;
        this.allDls[newGid] = dlDetails;
    };
    /**
     * Gets a download by the download command message, or the original reply
     * to the download command message.
     * @param msg The download command message
     */
    DlManager.prototype.getDownloadByMsgId = function (msg) {
        for (var _i = 0, _a = Object.keys(this.allDls); _i < _a.length; _i++) {
            var dl = _a[_i];
            var download = this.allDls[dl];
            if (download.tgChatId === msg.chat.id &&
                (download.tgMessageId === msg.message_id)) {
                return download;
            }
        }
        return null;
    };
    DlManager.prototype.deleteDownload = function (gid) {
        delete this.allDls[gid];
        delete this.activeDls[gid];
    };
    /**
     * Call the callback function for each download.
     * @param callback
     */
    DlManager.prototype.forEachDownload = function (callback) {
        for (var _i = 0, _a = Object.keys(this.allDls); _i < _a.length; _i++) {
            var key = _a[_i];
            var details = this.allDls[key];
            callback(details);
        }
    };
    DlManager.prototype.deleteStatus = function (chatId) {
        delete this.statusAll[chatId];
    };
    /**
     * Returns the general status message for a target chat.
     * @param chatId The chat ID of the target chat
     * @returns {TelegramBot.Message} The status message for the target group
     */
    DlManager.prototype.getStatus = function (chatId) {
        return this.statusAll[chatId];
    };
    DlManager.prototype.addStatus = function (msg, lastStatus) {
        this.statusAll[msg.chat.id] = {
            msg: msg,
            lastStatus: lastStatus
        };
    };
    /**
     * Call the callback function for each general status message.
     * @param callback
     */
    DlManager.prototype.forEachStatus = function (callback) {
        for (var _i = 0, _a = Object.keys(this.statusAll); _i < _a.length; _i++) {
            var key = _a[_i];
            callback(this.statusAll[key]);
        }
    };
    /**
     * Prevents race conditions when multiple status messages are sent in a short time.
     * Makes sure that a status message has been properly sent before allowing the next one.
     * @param msg The Telegram message that caused this status update
     * @param toCall The function to call to perform the status update
     */
    DlManager.prototype.setStatusLock = function (msg, toCall) {
        if (!this.statusLock[msg.chat.id]) {
            this.statusLock[msg.chat.id] = Promise.resolve();
        }
        this.statusLock[msg.chat.id] = this.statusLock[msg.chat.id].then(function () {
            return toCall(msg, true);
        });
    };
    DlManager.prototype.addCancelled = function (dlDetails) {
        this.cancelledDls[dlDetails.gid] = dlDetails;
        var message = this.cancelledMessages[dlDetails.tgChatId];
        if (message) {
            if (this.checkUnique(dlDetails.tgUsername, message)) {
                message.push(dlDetails.tgUsername);
            }
        }
        else {
            message = [dlDetails.tgUsername];
        }
        this.cancelledMessages[dlDetails.tgChatId] = message;
    };
    DlManager.prototype.forEachCancelledDl = function (callback) {
        for (var _i = 0, _a = Object.keys(this.cancelledDls); _i < _a.length; _i++) {
            var key = _a[_i];
            callback(this.cancelledDls[key]);
        }
    };
    DlManager.prototype.forEachCancelledChat = function (callback) {
        for (var _i = 0, _a = Object.keys(this.cancelledMessages); _i < _a.length; _i++) {
            var key = _a[_i];
            callback(this.cancelledMessages[key], key);
        }
    };
    DlManager.prototype.removeCancelledMessage = function (chatId) {
        delete this.cancelledMessages[chatId];
    };
    DlManager.prototype.removeCancelledDls = function (gid) {
        delete this.cancelledDls[gid];
    };
    DlManager.prototype.checkUnique = function (toFind, src) {
        for (var _i = 0, src_1 = src; _i < src_1.length; _i++) {
            var item = src_1[_i];
            if (item === toFind) {
                return false;
            }
        }
        return true;
    };
    return DlManager;
}());
exports.DlManager = DlManager;
