"use strict";
exports.__esModule = true;
exports.addUri = exports.stopDownload = exports.uploadFile = exports.getFileSize = exports.isDownloadMetadata = exports.getError = exports.getStatus = exports.getAriaFilePath = exports.setOnDownloadError = exports.setOnDownloadComplete = exports.setOnDownloadStop = exports.setOnDownloadStart = exports.openWebsocket = void 0;
var downloadUtils = require("./utils");
var drive = require("../fs-walk");
var Aria2 = require('aria2');
var constants = require("../.constants");
var tar = require("../drive/tar");
var diskspace = require('diskspace');
var filenameUtils = require("./filename-utils");
var ariaOptions = {
    host: 'localhost',
    port: constants.ARIA_PORT ? constants.ARIA_PORT : 8210,
    secure: false,
    secret: constants.ARIA_SECRET,
    path: '/jsonrpc'
};
var aria2 = new Aria2(ariaOptions);
function openWebsocket(callback) {
    aria2.open()
        .then(function () {
        callback(null);
    })["catch"](function (err) {
        callback(err);
    });
}
exports.openWebsocket = openWebsocket;
function setOnDownloadStart(callback) {
    aria2.onDownloadStart = function (keys) {
        callback(keys.gid, 1);
    };
}
exports.setOnDownloadStart = setOnDownloadStart;
function setOnDownloadStop(callback) {
    aria2.onDownloadStop = function (keys) {
        callback(keys.gid, 1);
    };
}
exports.setOnDownloadStop = setOnDownloadStop;
function setOnDownloadComplete(callback) {
    aria2.onDownloadComplete = function (keys) {
        callback(keys.gid, 1);
    };
}
exports.setOnDownloadComplete = setOnDownloadComplete;
function setOnDownloadError(callback) {
    aria2.onDownloadError = function (keys) {
        callback(keys.gid, 1);
    };
}
exports.setOnDownloadError = setOnDownloadError;
function getAriaFilePath(gid, callback) {
    aria2.getFiles(gid, function (err, files) {
        if (err) {
            callback(err.message, null);
        }
        else {
            var filePath = filenameUtils.findAriaFilePath(files);
            if (filePath) {
                callback(null, filePath.path);
            }
            else {
                callback(null, null);
            }
        }
    });
}
exports.getAriaFilePath = getAriaFilePath;
/**
 * Get a human-readable message about the status of the given download. Uses
 * HTML markup. Filename and filesize is always present if the download exists,
 * message is only present if the download is active.
 * @param {string} gid The Aria2 GID of the download
 * @param {function} callback The function to call on completion. (err, message, filename, filesize).
 */
function getStatus(dlDetails, callback) {
    aria2.tellStatus(dlDetails.gid, ['status', 'totalLength', 'completedLength', 'downloadSpeed', 'files'], function (err, res) {
        if (err) {
            callback(err.message, null, null, null);
        }
        else if (res.status === 'active') {
            var statusMessage = downloadUtils.generateStatusMessage(parseFloat(res.totalLength), parseFloat(res.completedLength), parseFloat(res.downloadSpeed), res.files, false);
            callback(null, statusMessage.message, statusMessage.filename, statusMessage.filesize);
        }
        else if (dlDetails.isUploading) {
            var downloadSpeed;
            var time = new Date().getTime();
            if (!dlDetails.lastUploadCheckTimestamp) {
                downloadSpeed = 0;
            }
            else {
                downloadSpeed = (dlDetails.uploadedBytes - dlDetails.uploadedBytesLast)
                    / ((time - dlDetails.lastUploadCheckTimestamp) / 1000);
            }
            dlDetails.uploadedBytesLast = dlDetails.uploadedBytes;
            dlDetails.lastUploadCheckTimestamp = time;
            var statusMessage = downloadUtils.generateStatusMessage(parseFloat(res.totalLength), dlDetails.uploadedBytes, downloadSpeed, res.files, true);
            callback(null, statusMessage.message, statusMessage.filename, statusMessage.filesize);
        }
        else {
            var filePath = filenameUtils.findAriaFilePath(res['files']);
            var filename = filenameUtils.getFileNameFromPath(filePath.path, filePath.inputPath, filePath.downloadUri);
            var message;
            if (res.status === 'waiting') {
                message = "<i>" + filename + "</i> - Queued";
            }
            else {
                message = "<i>" + filename + "</i> - " + res.status;
            }
            callback(null, message, filename, '0B');
        }
    });
}
exports.getStatus = getStatus;
function getError(gid, callback) {
    aria2.tellStatus(gid, ['errorMessage'], function (err, res) {
        if (err) {
            callback(err.message, null);
        }
        else {
            callback(null, res.errorMessage);
        }
    });
}
exports.getError = getError;
function isDownloadMetadata(gid, callback) {
    aria2.tellStatus(gid, ['followedBy'], function (err, res) {
        if (err) {
            callback(err.message, null, null);
        }
        else {
            if (res.followedBy) {
                callback(null, true, res.followedBy[0]);
            }
            else {
                callback(null, false, null);
            }
        }
    });
}
exports.isDownloadMetadata = isDownloadMetadata;
function getFileSize(gid, callback) {
    aria2.tellStatus(gid, ['totalLength'], function (err, res) {
        if (err) {
            callback(err.message, res);
        }
        else {
            callback(null, res['totalLength']);
        }
    });
}
exports.getFileSize = getFileSize;
/**
 * Sets the upload flag, uploads the given path to Google Drive, then calls the callback,
 * cleans up the download directory, and unsets the download and upload flags.
 * If a directory  is given, and isTar is set in vars, archives the directory to a tar
 * before uploading. Archival fails if fileSize is equal to or more than the free space on disk.
 * @param {dlVars.DlVars} dlDetails The dlownload details for the current download
 * @param {string} filePath The path of the file or directory to upload
 * @param {number} fileSize The size of the file
 * @param {function} callback The function to call with the link to the uploaded file
 */
function uploadFile(dlDetails, filePath, fileSize, callback) {
    dlDetails.isUploading = true;
    var fileName = filenameUtils.getFileNameFromPath(filePath, null);
    var realFilePath = filenameUtils.getActualDownloadPath(filePath);
    if (dlDetails.isTar) {
        if (filePath === realFilePath) {
            // If there is only one file, do not archive
            driveUploadFile(dlDetails, realFilePath, fileName, fileSize, callback);
        }
        else {
            diskspace.check(constants.ARIA_DOWNLOAD_LOCATION_ROOT, function (err, res) {
                if (err) {
                    console.log('uploadFile: diskspace: ' + err);
                    // Could not archive, so upload normally
                    driveUploadFile(dlDetails, realFilePath, fileName, fileSize, callback);
                    return;
                }
                if (res['free'] > fileSize) {
                    console.log('Starting archival');
                    var destName = fileName + '.tar';
                    tar.archive(realFilePath, destName, function (err, size) {
                        if (err) {
                            callback(err, dlDetails.gid, null, null, null, null, false);
                        }
                        else {
                            console.log('Archive complete');
                            driveUploadFile(dlDetails, realFilePath + '.tar', destName, size, callback);
                        }
                    });
                }
                else {
                    console.log('uploadFile: Not enough space, uploading without archiving');
                    driveUploadFile(dlDetails, realFilePath, fileName, fileSize, callback);
                }
            });
        }
    }
    else {
        driveUploadFile(dlDetails, realFilePath, fileName, fileSize, callback);
    }
}
exports.uploadFile = uploadFile;
function driveUploadFile(dlDetails, filePath, fileName, fileSize, callback) {
    drive.uploadRecursive(dlDetails, filePath, constants.GDRIVE_PARENT_DIR_ID, function (err, url, isFolder) {
        callback(err, dlDetails.gid, url, filePath, fileName, fileSize, isFolder);
    });
}
function stopDownload(gid, callback) {
    aria2.remove(gid, callback);
}
exports.stopDownload = stopDownload;
function addUri(uri, dlDir, callback) {
    aria2.addUri([uri], { dir: constants.ARIA_DOWNLOAD_LOCATION + "/" + dlDir })
        .then(function (gid) {
        callback(null, gid);
    })["catch"](function (err) {
        callback(err, null);
    });
}
exports.addUri = addUri;
