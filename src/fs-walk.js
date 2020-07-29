"use strict";
exports.__esModule = true;
exports.uploadRecursive = void 0;
var fs = require("fs");
var mime = require("mime-types");
var gdrive = require("./drive/drive-upload");
/**
 * Recursively uploads a directory or a file to Google Drive. Also makes this upload
 * visible to everyone on Drive, then calls a callback with the public link to this upload.
 * @param {string} path The path of the file or directory to upload
 * @param {string} parent The ID of the Drive folder to upload into
 * @param {function} callback A function to call with an error or the public Drive link
 */
function uploadRecursive(dlDetails, path, parent, callback) {
    fs.stat(path, function (err, stat) {
        if (err) {
            callback(err.message, null, false);
            return;
        }
        if (stat.isDirectory()) {
            gdrive.uploadFileOrFolder(dlDetails, path, 'application/vnd.google-apps.folder', parent, 0, function (err, fileId) {
                if (err) {
                    callback(err, null, false);
                }
                else {
                    walkSubPath(dlDetails, path, fileId, function (err) {
                        if (err) {
                            callback(err, null, false);
                        }
                        else {
                            gdrive.getSharableLink(fileId, true, callback);
                        }
                    });
                }
            });
        }
        else {
            processFileOrDir(dlDetails, path, parent, function (err, fileId) {
                if (err) {
                    callback(err, null, false);
                }
                else {
                    gdrive.getSharableLink(fileId, false, callback);
                }
            });
        }
    });
}
exports.uploadRecursive = uploadRecursive;
function walkSubPath(dlDetails, path, parent, callback) {
    fs.readdir(path, function (err, files) {
        if (err) {
            callback(err.message);
        }
        else {
            walkSingleDir(dlDetails, path, files, parent, callback);
        }
    });
}
function walkSingleDir(dlDetails, path, files, parent, callback) {
    if (files.length === 0) {
        callback(null);
        return;
    }
    var uploadNext = function (position) {
        processFileOrDir(dlDetails, path + '/' + files[position], parent, function (err) {
            if (err) {
                callback(err);
            }
            else {
                if (++position < files.length) {
                    uploadNext(position);
                }
                else {
                    callback(null);
                }
            }
        });
    };
    uploadNext(0);
}
function processFileOrDir(dlDetails, path, parent, callback) {
    fs.stat(path, function (err, stat) {
        if (err) {
            callback(err.message);
            return;
        }
        if (stat.isDirectory()) {
            // path is a directory. Do not call the callback until the path has been completely traversed.
            gdrive.uploadFileOrFolder(dlDetails, path, 'application/vnd.google-apps.folder', parent, 0, function (err, fileId) {
                if (err) {
                    callback(err);
                }
                else {
                    walkSubPath(dlDetails, path, fileId, callback);
                }
            });
        }
        else {
            var mimeType = mime.lookup(path);
            if (!mimeType) {
                mimeType = 'application/octet-stream';
            }
            gdrive.uploadFileOrFolder(dlDetails, path, mimeType, parent, stat.size, function (err, fileId) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, fileId);
                }
            });
        }
    });
}
