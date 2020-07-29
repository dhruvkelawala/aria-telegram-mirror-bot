"use strict";
exports.__esModule = true;
exports.cancelMirror = exports.mirror = void 0;
var TelegramBot = require("node-telegram-bot-api");
var uuid = require("uuid/v4");
var downloadUtils = require("./utils");
var ariaTools = require("./aria-tools.js");
var constants = require("../.constants.js");
var msgTools = require("../bot_utils/msg-tools.js");
var dlm = require("../dl_model/dl-manager");
var driveList = require("../drive/drive-list.js");
var driveUtils = require("../drive/drive-utils.js");
var filenameUtils = require("./filename-utils");
var event_regex_1 = require("../bot_utils/event_regex");
var child_process_1 = require("child_process");
var eventRegex = new event_regex_1.EventRegex();
var bot = new TelegramBot(constants.TOKEN, { polling: true });
var websocketOpened = false;
var statusInterval;
var dlManager = dlm.DlManager.getInstance();
initAria2();
bot.on("polling_error", function (msg) { return console.error(msg.message); });
function setEventCallback(regexp, regexpNoName, callback) {
    bot.onText(regexpNoName, function (msg, match) {
        // Return if the command didn't have the bot name for non PMs ("Bot name" could be blank depending on config)
        if (msg.chat.type !== 'private' && !match[0].match(regexp))
            return;
        callback(msg, match);
    });
}
setEventCallback(eventRegex.commandsRegex.start, eventRegex.commandsRegexNoName.start, function (msg) {
    if (msgTools.isAuthorized(msg) < 0) {
        msgTools.sendUnauthorizedMessage(bot, msg);
    }
    else {
        msgTools.sendMessage(bot, msg, 'You should know the commands already. Happy mirroring.', -1);
    }
});
setEventCallback(eventRegex.commandsRegex.mirrorTar, eventRegex.commandsRegexNoName.mirrorTar, function (msg, match) {
    if (msgTools.isAuthorized(msg) < 0) {
        msgTools.sendUnauthorizedMessage(bot, msg);
    }
    else {
        mirror(msg, match, true);
    }
});
setEventCallback(eventRegex.commandsRegex.mirror, eventRegex.commandsRegexNoName.mirror, function (msg, match) {
    if (msgTools.isAuthorized(msg) < 0) {
        msgTools.sendUnauthorizedMessage(bot, msg);
    }
    else {
        mirror(msg, match);
    }
});
setEventCallback(eventRegex.commandsRegex.disk, eventRegex.commandsRegexNoName.disk, function (msg) {
    if (msgTools.isAuthorized(msg) < 0) {
        msgTools.sendUnauthorizedMessage(bot, msg);
    }
    else {
        child_process_1.exec("df --output=\"size,used,avail\" -h \"" + constants.ARIA_DOWNLOAD_LOCATION_ROOT + "\" | tail -n1", function (err, res) {
            var disk = res.trim().split(/\s+/);
            msgTools.sendMessage(bot, msg, "Total space: " + disk[0] + "B\nUsed: " + disk[1] + "B\nAvailable: " + disk[2] + "B");
        });
    }
});
/**
 * Start a new download operation. Make sure that this is triggered by an
 * authorized user, because this function itself does not check for that.
 * @param {Object} msg The Message that triggered the download
 * @param {Array} match Message matches
 * @param {boolean} isTar Decides if this download should be archived before upload
 */
function mirror(msg, match, isTar) {
    if (websocketOpened) {
        if (downloadUtils.isDownloadAllowed(match[2])) {
            prepDownload(msg, match[2], isTar);
        }
        else {
            msgTools.sendMessage(bot, msg, "Download failed. Blacklisted URL.");
        }
    }
    else {
        msgTools.sendMessage(bot, msg, "Websocket isn't open. Can't download");
    }
}
exports.mirror = mirror;
setEventCallback(eventRegex.commandsRegex.mirrorStatus, eventRegex.commandsRegexNoName.mirrorStatus, function (msg) {
    if (msgTools.isAuthorized(msg) < 0) {
        msgTools.sendUnauthorizedMessage(bot, msg);
    }
    else {
        sendStatusMessage(msg);
    }
});
setEventCallback(eventRegex.commandsRegex.list, eventRegex.commandsRegexNoName.list, function (msg, match) {
    if (msgTools.isAuthorized(msg) < 0) {
        msgTools.sendUnauthorizedMessage(bot, msg);
    }
    else {
        driveList.listFiles(match[2], function (err, res) {
            if (err) {
                msgTools.sendMessage(bot, msg, 'Failed to fetch the list of files');
            }
            else {
                msgTools.sendMessage(bot, msg, res, 60000);
            }
        });
    }
});
setEventCallback(eventRegex.commandsRegex.getFolder, eventRegex.commandsRegexNoName.getFolder, function (msg) {
    if (msgTools.isAuthorized(msg) < 0) {
        msgTools.sendUnauthorizedMessage(bot, msg);
    }
    else {
        msgTools.sendMessage(bot, msg, '<a href = \'' + driveUtils.getFileLink(constants.GDRIVE_PARENT_DIR_ID, true) + '\'>Drive mirror folder</a>', 60000);
    }
});
setEventCallback(eventRegex.commandsRegex.cancelMirror, eventRegex.commandsRegexNoName.cancelMirror, function (msg) {
    var authorizedCode = msgTools.isAuthorized(msg);
    if (msg.reply_to_message) {
        var dlDetails = dlManager.getDownloadByMsgId(msg.reply_to_message);
        if (dlDetails) {
            if (authorizedCode > -1 && authorizedCode < 3) {
                cancelMirror(dlDetails, msg);
            }
            else if (authorizedCode === 3) {
                msgTools.isAdmin(bot, msg, function (e, res) {
                    if (res) {
                        cancelMirror(dlDetails, msg);
                    }
                    else {
                        msgTools.sendMessage(bot, msg, 'You do not have permission to do that.');
                    }
                });
            }
            else {
                msgTools.sendUnauthorizedMessage(bot, msg);
            }
        }
        else {
            msgTools.sendMessage(bot, msg, "Reply to the command message for the download that you want to cancel." +
                " Also make sure that the download is even active.");
        }
    }
    else {
        msgTools.sendMessage(bot, msg, "Reply to the command message for the download that you want to cancel.");
    }
});
setEventCallback(eventRegex.commandsRegex.cancelAll, eventRegex.commandsRegexNoName.cancelAll, function (msg) {
    var authorizedCode = msgTools.isAuthorized(msg, true);
    if (authorizedCode === 0) {
        // One of SUDO_USERS. Cancel all downloads
        dlManager.forEachDownload(function (dlDetails) {
            dlManager.addCancelled(dlDetails);
        });
        cancelMultipleMirrors(msg);
    }
    else if (authorizedCode === 2) {
        // Chat admin, but not sudo. Cancel all downloads only from that chat.
        dlManager.forEachDownload(function (dlDetails) {
            if (msg.chat.id === dlDetails.tgChatId) {
                dlManager.addCancelled(dlDetails);
            }
        });
        cancelMultipleMirrors(msg);
    }
    else if (authorizedCode === 3) {
        msgTools.isAdmin(bot, msg, function (e, res) {
            if (res) {
                dlManager.forEachDownload(function (dlDetails) {
                    if (msg.chat.id === dlDetails.tgChatId) {
                        dlManager.addCancelled(dlDetails);
                    }
                });
                cancelMultipleMirrors(msg);
            }
            else {
                msgTools.sendMessage(bot, msg, 'You do not have permission to do that.');
            }
        });
    }
    else {
        msgTools.sendUnauthorizedMessage(bot, msg);
    }
});
function cancelMultipleMirrors(msg) {
    var count = 0;
    dlManager.forEachCancelledDl(function (dl) {
        if (cancelMirror(dl)) {
            count++;
        }
    });
    if (count > 0) {
        msgTools.sendMessage(bot, msg, count + " downloads cancelled.", -1);
        sendCancelledMessages();
    }
    else {
        msgTools.sendMessage(bot, msg, 'No downloads to cancel');
    }
}
function sendCancelledMessages() {
    dlManager.forEachCancelledChat(function (usernames, tgChat) {
        var message = usernames.reduce(function (prev, cur, i) { return (i > 0) ? "" + prev + cur + ", " : cur + ", "; }, usernames[0]);
        message += 'your downloads have been manually cancelled.';
        bot.sendMessage(tgChat, message, { parse_mode: 'HTML' })
            .then(function () {
            dlManager.removeCancelledMessage(tgChat);
        })["catch"](function (err) {
            dlManager.removeCancelledMessage(tgChat);
            console.error("sendMessage error: " + err.message);
        });
    });
}
function cancelMirror(dlDetails, cancelMsg) {
    if (dlDetails.isUploading) {
        if (cancelMsg) {
            msgTools.sendMessage(bot, cancelMsg, 'Upload in progress. Cannot cancel.');
        }
        return false;
    }
    else {
        ariaTools.stopDownload(dlDetails.gid, function () {
            // Not sending a message here, because a cancel will fire
            // the onDownloadStop notification, which will notify the
            // person who started the download
            if (cancelMsg && dlDetails.tgChatId !== cancelMsg.chat.id) {
                // Notify if this is not the chat the download started in
                msgTools.sendMessage(bot, cancelMsg, 'The download was canceled.');
            }
            if (!dlDetails.isDownloading) {
                // onDownloadStopped does not fire for downloads that haven't started yet
                // So calling this here
                ariaOnDownloadStop(dlDetails.gid, 1);
            }
        });
        return true;
    }
}
exports.cancelMirror = cancelMirror;
/**
 * Cancels the download if its filename contains a string from
 * constants.ARIA_FILTERED_FILENAMES. Call this on every status message update,
 * because the file name might not become visible for the first few status
 * updates, for example, in case of BitTorrents.
 *
 * @param {String} filename The name of the downloaded file/top level directory
 * @returns {boolean} False if file name is disallowed, true otherwise,
 *                    or if undetermined
 */
function handleDisallowedFilename(dlDetails, filename) {
    if (dlDetails) {
        if (dlDetails.isDownloadAllowed === 0)
            return false;
        if (dlDetails.isDownloadAllowed === 1)
            return true;
        if (!filename)
            return true;
        var isAllowed = filenameUtils.isFilenameAllowed(filename);
        if (isAllowed === 0) {
            dlDetails.isDownloadAllowed = 0;
            if (!dlDetails.isUploading) {
                cancelMirror(dlDetails);
            }
            return false;
        }
        else if (isAllowed === 1) {
            dlDetails.isDownloadAllowed = 1;
        }
    }
    return true;
}
function prepDownload(msg, match, isTar) {
    var dlDir = uuid();
    ariaTools.addUri(match, dlDir, function (err, gid) {
        dlManager.addDownload(gid, dlDir, msg, isTar);
        if (err) {
            var message = "Failed to start the download. " + err.message;
            console.error(message);
            cleanupDownload(gid, message);
        }
        else {
            console.log("gid: " + gid + " download:" + match);
            // Wait a second to give aria2 enough time to queue the download
            setTimeout(function () {
                dlManager.setStatusLock(msg, sendStatusMessage);
            }, 1000);
        }
    });
}
/**
 * Sends a single status message for all active and queued downloads.
 */
function sendStatusMessage(msg, keepForever) {
    var lastStatus = dlManager.getStatus(msg.chat.id);
    if (lastStatus) {
        msgTools.deleteMsg(bot, lastStatus.msg);
        dlManager.deleteStatus(msg.chat.id);
    }
    return new Promise(function (resolve) {
        downloadUtils.getStatusMessage()
            .then(function (res) {
            if (keepForever) {
                msgTools.sendMessage(bot, msg, res.message, -1, function (message) {
                    dlManager.addStatus(message, res.message);
                    resolve();
                });
            }
            else {
                var ttl = 60000;
                msgTools.sendMessage(bot, msg, res.message, ttl, function (message) {
                    dlManager.addStatus(message, res.message);
                    setTimeout(function () {
                        dlManager.deleteStatus(msg.chat.id);
                    }, ttl);
                    resolve();
                }, true);
            }
        })["catch"](resolve);
    });
}
/**
 * Updates all status messages
 */
function updateAllStatus() {
    downloadUtils.getStatusMessage()
        .then(function (res) {
        var staleStatusReply = 'ETELEGRAM: 400 Bad Request: message to edit not found';
        if (res.singleStatuses) {
            res.singleStatuses.forEach(function (status) {
                if (status.dlDetails) {
                    handleDisallowedFilename(status.dlDetails, status.filename);
                }
            });
        }
        dlManager.forEachStatus(function (status) {
            // Do not update the status if the message remains the same.
            // Otherwise, the Telegram API starts complaining.
            if (res.message !== status.lastStatus) {
                msgTools.editMessage(bot, status.msg, res.message, staleStatusReply)["catch"](function (err) {
                    if (err.message === staleStatusReply) {
                        dlManager.deleteStatus(status.msg.chat.id);
                    }
                });
                status.lastStatus = res.message;
            }
        });
        if (res.totalDownloadCount === 0) {
            // No more active or queued downloads, let's stop the status refresh timer
            clearInterval(statusInterval);
            statusInterval = null;
            deleteAllStatus();
        }
    })["catch"]();
}
function deleteAllStatus() {
    dlManager.forEachStatus(function (statusMessage) {
        msgTools.deleteMsg(bot, statusMessage.msg, 10000);
        dlManager.deleteStatus(statusMessage.msg.chat.id);
    });
}
/**
 * After a download is complete (failed or otherwise), call this to clean up.
 * @param gid The gid for the download that just finished
 * @param message The message to send as the Telegram download complete message
 * @param url The public Google Drive URL for the uploaded file
 */
function cleanupDownload(gid, message, url, dlDetails) {
    if (!dlDetails) {
        dlDetails = dlManager.getDownloadByGid(gid);
    }
    if (dlDetails) {
        var wasCancelAlled = false;
        dlManager.forEachCancelledDl(function (dlDetails) {
            if (dlDetails.gid === gid) {
                wasCancelAlled = true;
            }
        });
        if (!wasCancelAlled) {
            // If the dl was stopped with a cancelAll command, a message has already been sent to the chat.
            // Do not send another one.
            if (dlDetails.tgRepliedUsername) {
                message += "\ncc: " + dlDetails.tgRepliedUsername;
            }
            msgTools.sendMessageReplyOriginal(bot, dlDetails, message)["catch"](function (err) {
                console.error("cleanupDownload sendMessage error: " + err.message);
            });
        }
        if (url) {
            msgTools.notifyExternal(dlDetails, true, gid, dlDetails.tgChatId, url);
        }
        else {
            msgTools.notifyExternal(dlDetails, false, gid, dlDetails.tgChatId);
        }
        dlManager.removeCancelledDls(gid);
        dlManager.deleteDownload(gid);
        updateAllStatus();
        downloadUtils.deleteDownloadedFile(dlDetails.downloadDir);
    }
    else {
        // Why is this message so calm? We should be SCREAMING at this point!
        console.error("cleanupDownload: Could not get dlDetails for " + gid);
    }
}
function ariaOnDownloadStart(gid, retry) {
    var dlDetails = dlManager.getDownloadByGid(gid);
    if (dlDetails) {
        dlManager.moveDownloadToActive(dlDetails);
        console.log(gid + ": Started. Dir: " + dlDetails.downloadDir + ".");
        updateAllStatus();
        ariaTools.getStatus(dlDetails, function (err, message, filename) {
            if (!err) {
                handleDisallowedFilename(dlDetails, filename);
            }
        });
        if (!statusInterval) {
            statusInterval = setInterval(updateAllStatus, constants.STATUS_UPDATE_INTERVAL_MS ? constants.STATUS_UPDATE_INTERVAL_MS : 12000);
        }
    }
    else if (retry <= 8) {
        // OnDownloadStart probably got called before prepDownload's startDownload callback. Fairly common. Retry.
        setTimeout(function () { return ariaOnDownloadStart(gid, retry + 1); }, 500);
    }
    else {
        console.error("onDownloadStart: DlDetails still empty for " + gid + ". Giving up.");
    }
}
function ariaOnDownloadStop(gid, retry) {
    var dlDetails = dlManager.getDownloadByGid(gid);
    if (dlDetails) {
        console.log(gid + ": Stopped");
        var message = 'Download stopped.';
        if (dlDetails.isDownloadAllowed === 0) {
            message += ' Blacklisted file name.';
        }
        cleanupDownload(gid, message);
    }
    else if (retry <= 8) {
        // OnDownloadStop probably got called before prepDownload's startDownload callback. Unlikely. Retry.
        setTimeout(function () { return ariaOnDownloadStop(gid, retry + 1); }, 500);
    }
    else {
        console.error("onDownloadStop: DlDetails still empty for " + gid + ". Giving up.");
    }
}
function ariaOnDownloadComplete(gid, retry) {
    var dlDetails = dlManager.getDownloadByGid(gid);
    if (dlDetails) {
        ariaTools.getAriaFilePath(gid, function (err, file) {
            if (err) {
                console.error("onDownloadComplete: Error getting file path for " + gid + ". " + err);
                var message = 'Upload failed. Could not get downloaded files.';
                cleanupDownload(gid, message);
                return;
            }
            if (file) {
                ariaTools.getFileSize(gid, function (err, size) {
                    if (err) {
                        console.error("onDownloadComplete: Error getting file size for " + gid + ". " + err);
                        var message = 'Upload failed. Could not get file size.';
                        cleanupDownload(gid, message);
                        return;
                    }
                    var filename = filenameUtils.getFileNameFromPath(file, null);
                    dlDetails.isUploading = true;
                    if (handleDisallowedFilename(dlDetails, filename)) {
                        console.log(gid + ": Completed. Filename: " + filename + ". Starting upload.");
                        ariaTools.uploadFile(dlDetails, file, size, driveUploadCompleteCallback);
                    }
                    else {
                        var reason = 'Upload failed. Blacklisted file name.';
                        console.log(gid + ": Blacklisted. Filename: " + filename + ".");
                        cleanupDownload(gid, reason);
                    }
                });
            }
            else {
                ariaTools.isDownloadMetadata(gid, function (err, isMetadata, newGid) {
                    if (err) {
                        console.error(gid + ": onDownloadComplete: Failed to check if it was a metadata download: " + err);
                        var message = 'Upload failed. Could not check if the file is metadata.';
                        cleanupDownload(gid, message);
                    }
                    else if (isMetadata) {
                        console.log(gid + " Changed to " + newGid);
                        dlManager.changeDownloadGid(gid, newGid);
                    }
                    else {
                        console.error('onDownloadComplete: No files - not metadata.');
                        var reason = 'Upload failed. Could not get files.';
                        cleanupDownload(gid, reason);
                    }
                });
            }
        });
    }
    else if (retry <= 8) {
        // OnDownloadComplete probably got called before prepDownload's startDownload callback. Highly unlikely. Retry.
        setTimeout(function () { return ariaOnDownloadComplete(gid, retry + 1); }, 500);
    }
    else {
        console.error(gid + ": onDownloadComplete: DlDetails still empty. Giving up.");
    }
}
function ariaOnDownloadError(gid, retry) {
    var dlDetails = dlManager.getDownloadByGid(gid);
    if (dlDetails) {
        ariaTools.getError(gid, function (err, res) {
            var message;
            if (err) {
                message = 'Failed to download.';
                console.error(gid + ": failed. Failed to get the error message. " + err);
            }
            else {
                message = "Failed to download. " + res;
                console.error(gid + ": failed. " + res);
            }
            cleanupDownload(gid, message, null, dlDetails);
        });
    }
    else if (retry <= 8) {
        // OnDownloadError probably got called before prepDownload's startDownload callback,
        // or gid refers to a torrent files download, and onDownloadComplete for the torrent's
        // metadata hasn't been called yet. Fairly likely. Retry.
        setTimeout(function () { return ariaOnDownloadError(gid, retry + 1); }, 500);
    }
    else {
        console.error(gid + ": onDownloadError: DlDetails still empty. Giving up.");
    }
}
function initAria2() {
    ariaTools.openWebsocket(function (err) {
        if (err) {
            console.error('A2C: Failed to open websocket. Run aria.sh first. Exiting.');
            process.exit();
        }
        else {
            websocketOpened = true;
            console.log('A2C: Websocket opened. Bot ready.');
        }
    });
    ariaTools.setOnDownloadStart(ariaOnDownloadStart);
    ariaTools.setOnDownloadStop(ariaOnDownloadStop);
    ariaTools.setOnDownloadComplete(ariaOnDownloadComplete);
    ariaTools.setOnDownloadError(ariaOnDownloadError);
}
function driveUploadCompleteCallback(err, gid, url, filePath, fileName, fileSize, isFolder) {
    var finalMessage;
    if (err) {
        var message = err;
        console.error(gid + ": Failed to upload - " + filePath + ": " + message);
        finalMessage = "Failed to upload <code>" + fileName + "</code> to Drive. " + message;
        cleanupDownload(gid, finalMessage);
    }
    else {
        console.log(gid + ": Uploaded ");
        if (fileSize) {
            var fileSizeStr = downloadUtils.formatSize(fileSize);
            finalMessage = "<a href='" + url + "'>" + fileName + "</a> (" + fileSizeStr + ")";
        }
        else {
            finalMessage = "<a href='" + url + "'>" + fileName + "</a>";
        }
        if (constants.IS_TEAM_DRIVE && isFolder) {
            finalMessage += '\n\n<i>Folders in Shared Drives can only be shared with members of the drive. Mirror as an archive if you need public links.</i>';
        }
        cleanupDownload(gid, finalMessage, url);
    }
}
