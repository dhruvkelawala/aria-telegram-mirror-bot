"use strict";
exports.__esModule = true;
exports.archive = void 0;
var tar = require("tar");
var fs = require("fs");
function archive(srcPath, destName, callback) {
    var dlDirPath = srcPath.substring(0, srcPath.lastIndexOf('/'));
    var writeStream = fs.createWriteStream(dlDirPath + "/" + destName);
    var targetDirName = "" + srcPath.substring(srcPath.lastIndexOf('/') + 1);
    var size = 0;
    writeStream.on('close', function () { return callback(null, size); });
    writeStream.on('error', function (err) { return callback(err.message, size); });
    var stream = tar.c({
        // @ts-ignore Unknown property error
        maxReadSize: 163840,
        jobs: 1,
        cwd: dlDirPath
    }, [targetDirName]);
    stream.on('error', function (err) { return callback(err.message, size); });
    stream.on('data', function (chunk) {
        size += chunk.length;
    });
    stream.pipe(writeStream);
}
exports.archive = archive;
