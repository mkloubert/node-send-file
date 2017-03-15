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
        let completed = (err: any, socket?: SimpleSocket.SimpleSocket) => {
            if (socket) {
                socket.end().then(() => {
                }).catch((err) => {
                });
            }

            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        };
        
        try {
            let workflow = new Workflows.Workflow();

            workflow.then(() => {
                app.writeln(Chalk.reset
                                 .gray(`Sending files...`));
            });

            // tell that we have a new connection
            workflow.then((ctx) => {
                return new Promise<any>((resolve, reject) => {
                    SimpleSocket.connect(app.port, app.host).then((socket) => {
                        socket.on('error', (err) => {
                        });

                        socket.once('close', () => {
                            if (app.verbose) {
                                app.writeln()
                                   .write(Chalk.reset
                                               .bgBlue
                                               .bold
                                               .white(`Closed connection`))
                                   .write(Chalk.reset
                                               .bgBlue
                                               .gray(` with `))
                                   .write(Chalk.reset
                                               .bgBlue
                                               .bold
                                               .white(socket.socket.remoteAddress))
                                   .writeln();
                            }
                        });

                        if (app.verbose) {
                            socket.once('rsakey.generating', function(keySize) {
                                app.writeln(`Generating RSA key (${keySize})...`);
                            });
                        }

                        app.writeln()
                           .write(Chalk.reset
                                       .bgBlue
                                       .bold
                                       .white(`Connection estabished`))
                           .write(Chalk.reset
                                       .bgBlue
                                       .gray(` to `))
                           .write(Chalk.reset
                                       .bgBlue
                                       .bold
                                       .white(socket.socket.remoteAddress))
                           .writeln();

                        ctx.value = socket;

                        resolve();
                    }).catch((err) => {
                        reject(err);
                    });
                });
            });

            // actions for each file
            app.files.forEach((f, i) => {
                // start a request
                workflow.then((ctx) => {
                    let socket: SimpleSocket.SimpleSocket = ctx.value;

                    return new Promise<any>((resolve, reject) => {
                        FS.lstat(f, (err, stats) => {
                            if (err) {
                                reject(err);
                            }
                            else {
                                let req: sf_contracts.IFileRequest = {
                                    count: app.files.length,
                                    index: i,
                                    name: Path.basename(f),
                                    size: stats.size,
                                    type: 1,
                                };

                                // send request
                                socket.writeJSON(req).then(() => {
                                    socket.readJSON<sf_contracts.IAnswer>().then((answer) => {
                                        try {
                                            if (answer.code === 0 && answer.type === 0) {
                                                ctx.value = {
                                                    request: req,
                                                    socket: ctx.value,
                                                };

                                                resolve();
                                            }
                                            else {
                                                reject(new Error(`Unexpected answer!`));
                                            }
                                        }
                                        catch (e) {
                                            reject(e);
                                        }
                                    }, (err) => {
                                        reject(err);  // could not read answer
                                    });
                                }).catch((err) => {
                                    reject(err);  // could not send request
                                });
                            }
                        });
                    });
                });

                // send file
                workflow.then((ctx) => {
                    let req: sf_contracts.IFileRequest = ctx.value.request;
                    let socket: SimpleSocket.SimpleSocket = ctx.value.socket;

                    return new Promise<any>((resolve, reject) => {
                        try {
                            let bar: Progress;
                            let hash = Crypto.createHash(app.hash);

                            let writeListener = (fdSrc, remainingBytes, chunk, hashOfChunk) => {
                                if (hash) {
                                    hash.update(chunk);
                                }

                                if (bar && !bar.complete) {
                                    bar.tick(chunk.length);
                                }
                            };

                            let sendCompleted = (err: any) => {
                                socket.removeListener('stream.write', writeListener);

                                if (err) {
                                    let errMsg = Chalk.bold(Chalk.red(`    [FAILED: '${err}']`));
                                    app.output.write(errMsg + OS.EOL);

                                    reject(err);
                                }
                                else {
                                    let okMsg = Chalk.bold(Chalk.green(`    [OK: ${hash.digest('hex')}:${req.size}]`));
                                    app.output.write(okMsg + OS.EOL);

                                    resolve();
                                }
                            };

                            let formatStr = Chalk.bold(
                                Chalk.white(
                                    `  send '${Truncate(Path.basename(f), 30)}' (${req.index + 1}/${req.count}; ${FileSize(req.size)}) [:bar] :percent :etas`
                                ));

                            bar = new Progress(formatStr, {
                                callback: () => {

                                },
                                complete: '=',
                                incomplete: ' ',
                                stream: app.output,
                                width: 20,
                                total: req.size,
                            });

                            socket.on('stream.write', writeListener);

                            // send file
                            socket.writeFile(f).then(() => {
                                sendCompleted(null);
                            }).catch((err) => {
                                sendCompleted(err);
                            });
                        }
                        catch (e) {
                            reject(e);
                        }
                    });
                });

                // cleanups
                workflow.then((ctx) => {
                    ctx.value = ctx.value.socket;
                });
            });

            // start sending files
            workflow.start().then(() => {
                completed(null);
            }).catch((err) => {
                completed(err);
            });
        }
        catch (e) {
            completed(e);
        }
    });
}
