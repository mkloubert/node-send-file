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

import * as Chalk from 'chalk';
const Clear = require('clear');
import * as Crypto from 'crypto';
import * as Glob from 'glob';
const Figlet = require('figlet');
import * as FS from 'fs';
import * as OS from 'os';
import * as sf_contracts from './contracts';
import * as sf_helpers from './helpers';
import * as Minimist from 'minimist';
import * as Path from 'path';
const SimpleSocket = require('node-simple-socket');


// unhandled exception
process.once('uncaughtException', function(err: any) {
    let errMsg: string;
    if (err instanceof Error) {
        errMsg = `!!!UNHANDLED ERROR!!!
        
${err.stack}`;
    }
    else {
        errMsg = sf_helpers.toStringSafe(err);
    }

    process.stderr
           .write(Chalk.bold
                       .bgRed
                       .yellow(OS.EOL + errMsg + OS.EOL));
});

// handle CTRL+C
process.once('SIGINT', function() {
    process.stdout
           .write(OS.EOL);

    process.exit();
});

// exit
process.once('exit', function(exitCode: number) {
    process.stdout
           .write(Chalk.reset
                       .grey(' '));
});


let args = Minimist(process.argv.slice(2));

let compress: boolean;
let bufferSize: number;
let doNotClose = false;
let dir: string;
let filePatterns: string[] = [];
let hash: string;
let host: string;
let handshakeCipher = 'aes-256-ctr';
let handshakePassword: Buffer;
let keySize: number;
let mode: '' | 'help' | 'receive' | 'send';
let noNoise = false;
let overwrite = false;
let passwordSize: number;
let port: number;
let showHelp: boolean;
let unknownArgs: string[] = [];
let verbose = false;
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

        case '?':
        case 'help':
            showHelp = true;
            break;

        case 'b':
        case 'buffer':
            bufferSize = parseInt(sf_helpers.toStringSafe(v).trim());
            break;

        case 'c':
        case 'compress':
            compress = true;
            break;

        case 'd':
        case 'dir':
            dir = sf_helpers.toStringSafe(v);
            break;

        case 'dnc':
        case 'do-not-close':
            doNotClose = true;
            break;
            
        case 'h':
        case 'host':
            host = sf_helpers.normalizeString(v);
            break;

        case 'hash':
            hash = sf_helpers.normalizeString(v);
            break;

        case 'hs':
        case 'handshake':
            handshakePassword = new Buffer(sf_helpers.toStringSafe(v), 'utf8');
            break;

        case 'hs64':
        case 'handshake64':
            let base64: string = sf_helpers.toStringSafe(v).trim();
            if (sf_helpers.isEmptyString(base64)) {
                handshakePassword = null;
            }
            else {
                handshakePassword = new Buffer(base64, 'base64');
            }
            break;

        case 'k':
        case 'key':
            keySize = parseInt(sf_helpers.toStringSafe(v).trim());
            break;

        case 'nc':
        case 'no-compression':
            compress = false;
            break;

        case 'nn':
        case 'no-noise':
            doNotClose = true;
            break;

        case 'o':
        case 'overwrite':
            overwrite = true;
            break;

        case 'p':
        case 'port':
            port = parseInt(sf_helpers.toStringSafe(v).trim());
            break;

        case 'pwd':
        case 'password':
            passwordSize = parseInt(sf_helpers.toStringSafe(v).trim());
            break;

        case 'r':
        case 'receive':
            mode = 'receive';
            break;

        case 's':
        case 'send':
            mode = 'send';
            break;

        case 'v':
        case 'verbose':
            verbose = true;
            break;

        default:
            unknownArgs.push(a);
            break;
    }
}

if (showHelp) {
    mode = 'help';
}

if (unknownArgs.length > 0) {
    mode = 'help';
}

if (sf_helpers.isEmptyString(host)) {
    host = 'localhost';
}

if (isNaN(port)) {
    port = 30904;
}

if (isNaN(keySize)) {
    keySize = 1024;
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

if (sf_helpers.isEmptyString(hash)) {
    hash = 'sha256';
}

if (sf_helpers.isEmptyString(mode)) {
    if (filePatterns.length > 0) {
        mode = 'send';
    }
    else {
        mode = 'receive';
    }
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
    doNotClose: !!doNotClose,
    dir: FS.realpathSync(dir),
    files: files,
    hash: hash,
    host: host,
    overwrite: !!overwrite,
    output: process.stdout,
    port: port,
    verbose: !!verbose,
    write: function(val) {
        let s: NodeJS.WritableStream = this.output || process.stdout;

        if (Buffer.isBuffer(val)) {
            val = val.toString('utf8');
        }

        s.write(sf_helpers.toStringSafe(val));
        return this;
    },
    writeln: function(val) {
        return this.write(val)
                   .write(OS.EOL);
    }
};

SimpleSocket.Compress = compress;
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

if (!noNoise) {
    // produces "noise" for
    // each exchanged data

    SimpleSocket.DefaultDataTransformer = (ctx) => {
        return new Promise<Buffer>((resolve, reject) => {
            try {
                let data: Buffer = ctx.data;

                if (1 === ctx.direction) {
                    // add "noise"

                    Crypto.randomBytes(1, (err, noiseByte) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            try {
                                let noiseLength = Math.floor(Math.random() * 256);
                                noiseLength = Math.min(noiseLength, 255);
                                noiseLength = Math.max(noiseLength, 0);

                                let newBuffer = Buffer.alloc(2 + noiseLength + data.length);

                                noiseByte.copy(newBuffer, 0);
                                newBuffer.writeUInt8(noiseLength, 1);

                                let appendData = () => {
                                    data.copy(newBuffer, 2 + noiseLength);

                                    resolve(newBuffer);
                                };

                                if (noiseLength > 0) {
                                    Crypto.randomBytes(noiseLength, (err, noise) => {
                                        try {
                                            if (err) {
                                                reject(err);
                                            }
                                            else {
                                                noise.copy(newBuffer, 2);

                                                appendData();
                                            }
                                        }
                                        catch (e) {
                                            reject(e);
                                        }
                                    });
                                }
                                else {
                                    appendData();
                                }
                            }
                            catch (e) {
                                reject(e);
                            }
                        }
                    });
                }
                else if (2 === ctx.direction) {
                    // extract "real data" from "noise"

                    let noiseLength = data.readUInt8(1);

                    let realData = Buffer.alloc(data.length - 2 - noiseLength);
                    data.copy(realData, 0, 2 + noiseLength);

                    resolve(realData);
                }
            }
            catch (e) {
                reject(e);
            }
        });
    };
}

if (handshakePassword && handshakePassword.length > 0) {
    // encrypt handshake with a password

    SimpleSocket.DefaultHandshakeTransformer = function(ctx) {        
        let cipher: Crypto.Cipher | Crypto.Decipher;
        if (1 === ctx.direction) {
            // encrypt
            cipher = Crypto.createCipher(handshakeCipher, handshakePassword);
        }
        else if (2 === ctx.direction) {
            // decrypt
            cipher = Crypto.createDecipher(handshakeCipher, handshakePassword);
        }

        return Buffer.concat([ cipher.update(ctx.data),
                               cipher.final() ]);
    };
}

let handler: sf_contracts.ModeHandler = require('./modes/' + mode);

let exitApp = (result?: any) => {
    let exitCode = parseInt(sf_helpers.toStringSafe(result).trim());
    if (isNaN(exitCode)) {
        exitCode = 0;
    }

    process.exit(exitCode);
};

Figlet('SendFile.node', (err, data) => {
    Clear();

    let header: string;
    if (err) {
        header = "send-file";
    }
    else {
        header = data;
    }

    appCtx.writeln(Chalk.bold.yellow(header))
          .writeln();

    if (unknownArgs.length > 0) {
        appCtx.writeln(Chalk.bold(Chalk.bgRed(Chalk.white(` Unknown argument${unknownArgs.length > 1 ? 's' : ''}: ${unknownArgs.join(', ')} `))))
              .writeln()
              .writeln();
    }

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
});
