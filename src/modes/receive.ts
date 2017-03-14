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
import * as Crypto from 'crypto';
import * as FileSize from 'filesize';
import * as FS from 'fs';
import * as FSExtra from 'fs-extra';
import * as Net from 'net';
import * as OS from 'os';
import * as Path from 'path';
import * as Progress from 'progress';
import * as sf_contracts from '../contracts';
import * as sf_helpers from '../helpers';
import * as SimpleSocket from 'node-simple-socket';
const Truncate = require('truncate');
import * as Workflows from 'node-workflows';


export function handle(app: sf_contracts.AppContext): PromiseLike<number> {
    return new Promise<number>((resolve, reject) => {
        let completed = sf_helpers.createSimplePromiseCompletedAction(resolve, reject);
        
        try {
            let hasAlreadyConnectedWithOne = false;
            let server: Net.Server;

            SimpleSocket.listen(app.port, (err, socket?) => {
                try {
                    if (err) {
                        completed(err);
                    }
                    else {
                        if (hasAlreadyConnectedWithOne) {
                            if (!app.doNotClose) {
                                socket.end().then(() => {
                                }).catch(() => {
                                });

                                return;
                            }
                        }

                        hasAlreadyConnectedWithOne = true;

                        socket.on('error', (err) => {
                        });

                        socket.once('close', () => {
                            console.log(`Closed connection with '${socket.socket.remoteAddress}:${socket.socket.remotePort}'`);
                        });

                        socket.once('password.generating', function() {
                            console.log(`Generating password...`);
                        });

                        console.log(`Connection estabished with '${socket.socket.remoteAddress}:${socket.socket.remotePort}'`);

                        waitForNextFile(app, server, socket);
                    }
                }
                catch (e) {

                }
            }).then((srv) => {
                server = srv; 

                console.log('Waiting for files...');
            }).catch((err) => {
                completed(err);
            });
        }
        catch (e) {
            completed(e);
        }
    });
}

function waitForNextFile(app: sf_contracts.AppContext, server: Net.Server, socket: SimpleSocket.SimpleSocket) {
    let workflow = Workflows.create();

    let bar: Progress;
    let hash: Crypto.Hash;

    let readListener = (fdTarget, chunk, bytesWritten, hashOfChunk) => {
        if (hash) {
            hash.update(chunk);
        }
        
        if (bar) {
            bar.tick(bytesWritten);
        }
    };

    let completed = (err: any, req?: sf_contracts.IFileRequest) => {
        let isLast: boolean;
        if (req) {
            isLast = req.index === (req.count - 1);
        }
        
        if (bar) {
            bar.complete = true;
            bar.render();
        }

        if (err) {
            let errMsg = Chalk.bold(Chalk.red(`    [FAILED: '${err}']`));
            process.stderr.write(errMsg + OS.EOL);

            socket.end().then(() => {
            }).catch(() => {
            });
        }
        else {
            let okMsg = Chalk.bold(Chalk.green(`    [OK: ${hash.digest('hex')}:${req.size}]`));
            process.stderr.write(okMsg + OS.EOL);

            if (app.doNotClose && !isLast) {
                setTimeout(() => {
                    waitForNextFile(app, server, socket);
                }, 100);
            }
            else {
                // close server

                if (server) {
                    server.close(() => {
                    });
                }
            }
        }
    };

    // [0] initialize
    workflow.then((ctx) => {
        hash = Crypto.createHash(app.hash);
    });

    // [1] first wait for request
    workflow.then((ctx) => {
        return new Promise<any>((resolve, reject) => {
            // wait for file request
            socket.readJSON<sf_contracts.IFileRequest>().then((req) => {
                try {
                    if (1 !== req.type) {
                        reject(new Error(`Unexpected message type '${req.type}'!`));
                        return;
                    }

                    if (isNaN(req.count)) {
                        reject(new Error(`Corrupt message (1)!`));
                        return;
                    }


                    if (isNaN(req.index)) {
                        reject(new Error(`Corrupt message (2)!`));
                        return;
                    }

                    if (req.index < 0 || req.index >= req.count) {
                        reject(new Error(`Corrupt message (3)!`));
                        return;
                    }

                    // send OK
                    socket.writeJSON<sf_contracts.IAnswer>({
                        code: 0,
                        type: 0,
                    }).then(() => {
                        ctx.value = req;

                        resolve();
                    }).catch((err) => {
                        reject(err);  // could not send answer
                    });
                }
                catch (e) {
                    reject(e);
                }
            }).catch((err) => {
                reject(err);  // could not read request
            });
        });
    });

    // [2] then receive file
    workflow.then((ctx) => {
        let req: sf_contracts.IFileRequest = ctx.result = ctx.value;

        return new Promise<any>((resolve, reject) => {
            try {
                let fileName = req.name;

                let ext = Path.extname(fileName);
                let baseName = Path.basename(fileName, ext);
                
                let fileNameIndex = -1;
                let updateFileName = () => {
                    fileName = `${baseName}_${++fileNameIndex}${ext}`;
                };

                let fullPath = Path.join(app.dir, fileName);
                while (FS.existsSync(fullPath)) {
                    updateFileName();

                    fullPath = Path.join(app.dir, fileName);
                }

                let outDir = FS.realpathSync(Path.dirname(fullPath));
                if (outDir.indexOf(app.dir) < 0) {
                    // no inside directory!
                    
                    reject(new Error('Invalid request!'));
                    return;
                }

                let formatStr = Chalk.bold(`  receiving '${Truncate(Path.basename(fullPath), 30)}' (${req.index + 1}/${req.count}; ${FileSize(req.size)}) [:bar] :percent :etas`);

                bar = new Progress(formatStr, {
                    complete: '=',
                    incomplete: ' ',
                    total: req.size,
                    width: 20,
                });

                let receiveCompleted = (err: any) => {
                    socket.removeListener('stream.read', readListener);

                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                };

                let receiveFile = () => {
                    socket.on('stream.read', readListener);

                    socket.readFile(fullPath).then(() => {
                        receiveCompleted(null);  // finished
                    }).catch((err) => {
                        receiveCompleted(err);  // could not read file
                    });
                };

                // check if start directory exists...
                FS.exists(outDir, (exists) => {
                    if (exists) {
                        receiveFile();  // ... yes, start receiving file
                    }
                    else {
                        // ... no => directory needs to be created

                        FSExtra.mkdirs(outDir, (err) => {
                            if (err) {
                                reject(err);
                            }
                            else {
                                receiveFile();
                            }
                        });
                    }
                });
            }
            catch (e) {
                reject(e);
            }
        });
    });

    // wait for file
    workflow.start().then((req: sf_contracts.IFileRequest) => {
        completed(null, req);
    }).catch((err) => {
        completed(err);
    });
}
