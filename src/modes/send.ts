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

import * as FS from 'fs';
import * as Path from 'path';
import * as sf_contracts from '../contracts';
import * as sf_helpers from '../helpers';
import * as SimpleSocket from 'node-simple-socket';
import * as Workflows from 'node-workflows';


export function handle(app: sf_contracts.AppContext): PromiseLike<number> {
    return new Promise<number>((resolve, reject) => {
        let completed = sf_helpers.createSimplePromiseCompletedAction(resolve, reject);
        
        try {
            //TODO

            let workflow = new Workflows.Workflow();

            workflow.then(() => {
                console.log('Sending files...');
            });

            workflow.then((ctx) => {
                return new Promise<any>((resolve, reject) => {
                    SimpleSocket.connect(app.port, app.host).then((socket) => {
                        console.log(`Connection estabished to '${socket.socket.remoteAddress}:${socket.socket.remotePort}'`);

                        ctx.value = socket;

                        resolve();
                    }).catch((err) => {
                        reject(err);
                    });
                });
            });

            console.log();

            app.files.forEach(f => {
                console.log(f);

                workflow.then((ctx) => {
                    console.log(`Sending file '${f}'...`);
                });

                workflow.then((ctx) => {
                    let socket: SimpleSocket.SimpleSocket = ctx.value;

                    return new Promise<any>((resolve, reject) => {
                        FS.lstat(f, (err, stats) => {
                            if (err) {
                                reject(err);
                            }
                            else {
                                socket.writeJSON<sf_contracts.IFileRequest>({
                                    name: Path.basename(f),
                                    size: stats.size,
                                    type: 1,
                                }).then(() => {
                                    socket.readJSON<sf_contracts.IAnswer>().then((answer) => {
                                        resolve();
                                    }, (err) => {
                                        reject();
                                    });
                                }).catch((err) => {
                                    reject(err);
                                });
                            }
                        });
                    });
                });

                workflow.then((ctx) => {
                    let socket: SimpleSocket.SimpleSocket = ctx.value;

                    return new Promise<any>((resolve, reject) => {
                        socket.writeFile(f).then(() => {
                            resolve();
                        }).catch((err) => {
                            reject(err);
                        });
                    });
                });
            });

            workflow.start().then(() => {
                completed();
            }).catch((err) => {
                completed(err);
            });
        }
        catch (e) {
            completed(e);
        }
    });
}
