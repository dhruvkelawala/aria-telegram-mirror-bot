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
exports.getSharableLink = exports.uploadFileOrFolder = void 0;
var driveAuth = require("./drive-auth");
var driveFile = require("./upload-file");
var utils = require("./drive-utils");
var googleapis_1 = require("googleapis");
var constants = require("../.constants.js");
function uploadFileOrFolder(dlDetails, filePath, mime, parent, size, callback) {
    driveAuth.call(function (err, auth) {
        if (err) {
            callback(err, null);
            return;
        }
        var drive = googleapis_1.google.drive({ version: 'v3', auth: auth });
        if (mime === 'application/vnd.google-apps.folder' || size === 0) {
            createFolderOrEmpty(drive, filePath, parent, mime, callback);
        }
        else {
            driveFile.uploadGoogleDriveFile(dlDetails, parent, {
                filePath: filePath,
                mimeType: mime
            })
                .then(function (id) { return callback(null, id); })["catch"](function (err) { return callback(err.message, null); });
        }
    });
}
exports.uploadFileOrFolder = uploadFileOrFolder;
function createFolderOrEmpty(drive, filePath, parent, mime, callback) {
    drive.files.create({
        // @ts-ignore Unknown property error
        fields: 'id',
        supportsAllDrives: true,
        requestBody: {
            mimeType: mime,
            name: filePath.substring(filePath.lastIndexOf('/') + 1),
            parents: [parent]
        }
    }, function (err, res) {
        if (err) {
            callback(err.message, null);
        }
        else {
            callback(null, res.data.id);
        }
    });
}
function getSharableLink(fileId, isFolder, callback) {
    if (!constants.IS_TEAM_DRIVE || (constants.IS_TEAM_DRIVE && !isFolder)) {
        driveAuth.call(function (err, auth) {
            if (err) {
                callback(err, null, false);
                return;
            }
            var drive = googleapis_1.google.drive({ version: 'v3', auth: auth });
            createPermissions(drive, fileId)
                .then(function () {
                callback(null, utils.getFileLink(fileId, isFolder), isFolder);
            })["catch"](function (err) {
                callback(err.message, null, false);
            });
        });
    }
    else {
        callback(null, utils.getFileLink(fileId, isFolder), isFolder);
    }
}
exports.getSharableLink = getSharableLink;
function createPermissions(drive, fileId) {
    return __awaiter(this, void 0, void 0, function () {
        var req, _i, _a, email, perm;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!(constants.DRIVE_FILE_PRIVATE && constants.DRIVE_FILE_PRIVATE.ENABLED)) return [3 /*break*/, 5];
                    req = [];
                    _i = 0, _a = constants.DRIVE_FILE_PRIVATE.EMAILS;
                    _b.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 4];
                    email = _a[_i];
                    return [4 /*yield*/, drive.permissions.create({
                            fileId: fileId,
                            supportsAllDrives: true,
                            requestBody: {
                                role: 'reader',
                                type: 'user',
                                emailAddress: email
                            }
                        })];
                case 2:
                    perm = _b.sent();
                    req.push(perm);
                    _b.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/, Promise.all(req)];
                case 5: return [2 /*return*/, drive.permissions.create({
                        fileId: fileId,
                        supportsAllDrives: true,
                        requestBody: {
                            role: 'reader',
                            type: 'anyone'
                        }
                    })];
            }
        });
    });
}
