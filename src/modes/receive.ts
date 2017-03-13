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
import * as FSExtra from 'fs-extra';
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
            SimpleSocket.listen(app.port, (err, socket?) => {
                if (err) {
                    completed(err);
                }
                else {
                    socket.once('password.generating', function() {
                        console.log(`Generating password...`);
                    });

                    socket.on('error', () => {
                        socket.end().catch(() => {
                            //TODO: log
                        });
                    });

                    waitForNextFile(app, socket);
                }
            }).then(() => {
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

function waitForNextFile(app: sf_contracts.AppContext, socket: SimpleSocket.SimpleSocket) {
    let workflow = Workflows.create();

    let bar: Progress;

    let readListener = (fdTarget, chunk, bytesWritten, hashOfChunk) => {
        if (bar) {
            bar.tick(bytesWritten);
        }
    };

    let completed = (err?: any) => {
        socket.removeListener('stream.read', readListener);

        if (err) {
            socket.end().catch(() => {
                //TODO: log
            });
        }
        else {
            waitForNextFile(app, socket);
        }
    };

    // first wait for request
    workflow.then((ctx) => {
        return new Promise<any>((resolve, reject) => {
            // wait for file request
            socket.readJSON<sf_contracts.IFileRequest>().then((req) => {
                // send OK
                socket.writeJSON<sf_contracts.IAnswer>({
                    code: 0,
                    type: 0,
                }).then(() => {
                    ctx.value = req;

                    resolve();
                }).catch((err) => {
                    reject(err);
                });
            }).catch((err) => {
                reject(err);
            });
        });
    });

    // then receive file
    workflow.then((ctx) => {
        let req: sf_contracts.IFileRequest = ctx.value;

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

                let outDir = Path.dirname(fullPath);

                bar = new Progress(`  receiving '${Truncate(Path.basename(fullPath), 30)}' [:bar] :percent :etas`, {
                    complete: '=',
                    incomplete: ' ',
                    width: 20,
                    total: req.size,
                });

                socket.on('stream.read', readListener);

                let receiveFile = () => {
                    socket.readFile(fullPath).then(() => {
                        resolve();
                    }).catch((err) => {
                        reject(err);
                    });
                };

                FS.exists(outDir, (exists) => {
                    if (exists) {
                        receiveFile();
                    }
                    else {
                        // directory needs to be created

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

    workflow.start().then(() => {
        completed();
    }).catch((err) => {
        completed(err);
    });
}
