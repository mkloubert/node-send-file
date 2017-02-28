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

import * as sf_contracts from './contracts';
import * as sf_helpers from './helpers';
import * as Minimist from 'minimist';


let args = Minimist(process.argv.slice(2));

let host: string;
let mode: string;
let port: number;
for (let a in args) {
    let v = sf_helpers.toStringSafe(args[a]);

    switch (sf_helpers.normalizeString(a)) {
        case 'h':
        case 'host':
            host = sf_helpers.normalizeString(v);
            break;

        case 'p':
        case 'port':
            port = parseInt(v.trim());
            break;

        case 'receive':
            mode = 'receive';
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

if (sf_helpers.isEmptyString(mode)) {
    mode = 'receive';
}

let appCtx: sf_contracts.AppContext = {
    host: host,
    port: port,
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
