"use strict";
/* Copyright seedceo */
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
exports.uploadGoogleDriveFile = void 0;
var parseRange = require('http-range-parse');
var request = require("request");
var fs = require("fs");
var driveAuth = require("./drive-auth");
var driveUtils = require("./drive-utils");
/**
   * Divide the file to multi path for upload
   * @returns {array} array of chunk info
   */
function getChunks(filePath, start) {
    var allsize = fs.statSync(filePath).size;
    var sep = allsize < (20 * 1024 * 1024) ? allsize : (20 * 1024 * 1024) - 1;
    var ar = [];
    for (var i = start; i < allsize; i += sep) {
        var bstart = i;
        var bend = i + sep - 1 < allsize ? i + sep - 1 : allsize - 1;
        var cr = 'bytes ' + bstart + '-' + bend + '/' + allsize;
        var clen = bend != allsize - 1 ? sep : allsize - i;
        var stime = allsize < (20 * 1024 * 1024) ? 5000 : 10000;
        ar.push({
            bstart: bstart,
            bend: bend,
            cr: cr,
            clen: clen,
            stime: stime
        });
    }
    return ar;
}
/**
   * Upload one chunk to the server
   * @returns {string} file id if any
   */
function uploadChunk(filePath, chunk, mimeType, uploadUrl) {
    return new Promise(function (resolve, reject) {
        request.put({
            url: uploadUrl,
            headers: {
                'Content-Length': chunk.clen,
                'Content-Range': chunk.cr,
                'Content-Type': mimeType
            },
            body: fs.createReadStream(filePath, {
                encoding: null,
                start: chunk.bstart,
                end: chunk.bend + 1
            })
        }, function (error, response, body) {
            if (error) {
                console.log("Upload chunk failed, Error from request module: " + error.message);
                return reject(error);
            }
            var headers = response.headers;
            if (headers && headers.range) {
                var range = parseRange(headers.range);
                if (range && range.last != chunk.bend) {
                    // range is diff, need to return to recreate chunks
                    return resolve(range);
                }
            }
            if (!body) {
                console.log("Upload chunk return empty body.");
                return resolve(null);
            }
            try {
                body = JSON.parse(body);
            }
            catch (e) {
                // TODO: So far `body` has been 1 liners here. If large `body` is noticed, change this
                // to dump `body` to a file instead.
                console.log(body);
                return resolve(null);
            }
            if (body && body.id) {
                return resolve(body.id);
            }
            else {
                console.log("Got file id null");
                // Yes, I know this should be a reject, but meh, why bother changing what works
                return resolve(null);
            }
        });
    });
}
function uploadGoogleDriveFile(dlDetails, parent, file) {
    var fileName = file.filePath.substring(file.filePath.lastIndexOf('/') + 1);
    return new Promise(function (resolve, reject) {
        var size = fs.statSync(file.filePath).size;
        driveAuth.call(function (err, auth) {
            if (err) {
                return reject(new Error('Failed to get OAuth client'));
            }
            auth.getAccessToken().then(function (tokenResponse) {
                var token = tokenResponse.token;
                var options = driveUtils.getPublicUrlRequestHeaders(size, file.mimeType, token, fileName, parent);
                request(options, function (error, response) {
                    return __awaiter(this, void 0, void 0, function () {
                        var chunks, fileId, i, lastUploadedBytes, er_1;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    if (error) {
                                        return [2 /*return*/, reject(error)];
                                    }
                                    if (!response) {
                                        return [2 /*return*/, reject(new Error("Get drive resumable url return undefined headers"))];
                                    }
                                    if (!response.headers || !response.headers.location || response.headers.location.length <= 0) {
                                        return [2 /*return*/, reject(new Error("Get drive resumable url return invalid headers: " + JSON.stringify(response.headers, null, 2)))];
                                    }
                                    chunks = getChunks(file.filePath, 0);
                                    fileId = null;
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 5, , 6]);
                                    i = 0;
                                    lastUploadedBytes = 0;
                                    _a.label = 2;
                                case 2:
                                    if (!(i < chunks.length)) return [3 /*break*/, 4];
                                    return [4 /*yield*/, uploadChunk(file.filePath, chunks[i], file.mimeType, response.headers.location)];
                                case 3:
                                    // last chunk will return the file id
                                    fileId = _a.sent();
                                    if ((typeof fileId === 'object') && (fileId !== null)) {
                                        chunks = getChunks(file.filePath, fileId.last);
                                        i = 0;
                                        dlDetails.uploadedBytes = dlDetails.uploadedBytes - lastUploadedBytes + fileId.last;
                                        lastUploadedBytes = fileId.last;
                                    }
                                    else {
                                        dlDetails.uploadedBytes = dlDetails.uploadedBytes - lastUploadedBytes + chunks[i].bend;
                                        lastUploadedBytes = chunks[i].bend;
                                        i++;
                                    }
                                    return [3 /*break*/, 2];
                                case 4:
                                    if (fileId && fileId.length > 0) {
                                        return [2 /*return*/, resolve(fileId)];
                                    }
                                    else {
                                        return [2 /*return*/, reject(new Error('Uploaded and got invalid id for file ' + fileName))];
                                    }
                                    return [3 /*break*/, 6];
                                case 5:
                                    er_1 = _a.sent();
                                    console.log("Uploading chunks for file " + fileName + " failed: " + er_1.message);
                                    return [2 /*return*/, reject(er_1)];
                                case 6: return [2 /*return*/];
                            }
                        });
                    });
                });
            })["catch"](function (err) {
                console.log('Sending request to get resumable url: ' + err.message);
                return reject(err);
            });
        });
    });
}
exports.uploadGoogleDriveFile = uploadGoogleDriveFile;
