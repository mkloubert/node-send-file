/// <reference types="node" />

// The MIT License (MIT)
// 
// node-send-file (https://github.com/mkloubert/node-send-file)
// Copyright (c) Marcel Joachim Kloubert <marcel.kloubert@gmx.net>
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
// DEALINGS IN THE SOFTWARE.

import * as Crypto from 'crypto';
import * as Glob from 'glob';
import * as sf_contracts from './contracts';
import * as sf_helpers from './helpers';
import * as Minimist from 'minimist';
import * as Path from 'path';
const SimpleSocket = require('node-simple-socket');


let args = Minimist(process.argv.slice(2));

let dir: string;
let bufferSize: number;
let filePatterns: string[] = [];
let host: string;
let mode: string;
let passwordSize: number;
let port: number;
let keySize: number;
for (let a in args) {
    let v = args[a];

    switch (sf_helpers.normalizeString(a)) {
        case '_':
            {
                let fp = sf_helpers.asArray<any>(args[a])
                                   .map(x => sf_helpers.toStringSafe(x));
                
                filePatterns = filePatterns.concat(fp);
            }
            break;

        case 'b':
        case 'buffer':
            bufferSize = parseInt(sf_helpers.toStringSafe(v).trim());
            break;

        case 'h':
        case 'host':
            host = sf_helpers.normalizeString(v);
            break;

        case 'pwd':
        case 'password':
            passwordSize = parseInt(sf_helpers.toStringSafe(v).trim());
            break;

        case 'p':
        case 'port':
            port = parseInt(sf_helpers.toStringSafe(v).trim());
            break;

        case 'k':
        case 'key':
            keySize = parseInt(sf_helpers.toStringSafe(v).trim());
            break;

        case 'receive':
            mode = 'receive';
            break;

        case 'd':
        case 'dir':
            dir = sf_helpers.toStringSafe(v);
            break;

        case 'send':
            mode = 'send';
            break;
    }
}

if (sf_helpers.isEmptyString(host)) {
    host = '127.0.0.1';
}

if (isNaN(port)) {
    port = 30904;
}

if (isNaN(keySize)) {
    keySize = 2048;
}

if (isNaN(bufferSize)) {
    bufferSize = 8192;
}

if (isNaN(passwordSize)) {
    passwordSize = 64;
}

if (sf_helpers.isEmptyString(dir)) {
    dir = process.cwd();
}
if (!Path.isAbsolute(dir)) {
    dir = Path.join(process.cwd(), dir);
}

if (sf_helpers.isEmptyString(mode)) {
    mode = 'receive';
}

filePatterns = filePatterns.filter(x => !sf_helpers.isEmptyString(x));
filePatterns = sf_helpers.distinctArray(filePatterns);

// collect files
let files: string[] = [];
filePatterns.forEach(x => {
    let matchingFiles = Glob.sync(x, {
        cwd: process.cwd(),
    });

    files = files.concat(matchingFiles);
});
files = sf_helpers.distinctArray(files);

let appCtx: sf_contracts.AppContext = {
    dir: dir,
    files: files,
    host: host,
    port: port,
};

SimpleSocket.DefaultReadBufferSize = bufferSize;
SimpleSocket.DefaultRSAKeySize = keySize;
SimpleSocket.DefaultPasswordGenerator = () => {
    return new Promise<Buffer>((resolve, reject) => {
        Crypto.randomBytes(passwordSize, (err, buff) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(buff);
            }
        });
    });
};

let handler: sf_contracts.ModeHandler = require('./modes/' + mode);

let exitApp = (result?: any) => {
    let exitCode = parseInt(sf_helpers.toStringSafe(result).trim());
    if (isNaN(exitCode)) {
        exitCode = 0;
    }

    process.exit(exitCode);
};

let handlerResult = handler.handle(appCtx);
if (sf_helpers.isNullOrUndefined(handlerResult)) {
    exitApp(0);
}
else {
    if ('object' === typeof handlerResult) {
        handlerResult.then((exitCode) => {
            exitApp(exitCode);
        }, (err) => {
            throw err;
        });
    }
    else {
        exitApp(handlerResult);
    }
}
