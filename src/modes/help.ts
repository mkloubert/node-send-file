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

const CLI = require('clui');
const CLC = require('cli-color');
import * as sf_contracts from '../contracts';

const Line = CLI.Line;
const LineBuffer = CLI.LineBuffer;

export function handle(app: sf_contracts.AppContext): PromiseLike<number> {
    return new Promise<number>((resolve, reject) => {
        try {
            // table header
            app.writeln(
                new Line()
                    .padding(1)
                    .column('Parameter', 25, [ CLC.cyan ])
                    .column('Example', 32, [ CLC.cyan ])
                    .column('Description', undefined, [ CLC.cyan ])
                    .fill()
                    .contents());

            let addParamLine = (param: string, example: string, desc: string) => {
                app.writeln(
                    new Line()
                        .padding(2)
                        .column(param, 25, [ CLC.white ])
                        .column(example, 32, [ CLC.white ])
                        .column(desc, undefined, [ CLC.white ])
                        .fill()
                        .contents());
            };

            addParamLine('--b, --buffer', '--b=102400', 'Buffer size for reading files. Default: 8192');
            addParamLine('--c, --compress', '--c', 'Force compression.');
            addParamLine('--d, --dir', '--d=./files', 'The custom directory for / with the files. Default: ./');
            addParamLine('--dnc, --do-not-close', '--dnc', 'Do not close host after first connect.');
            addParamLine('--hash', '--hash=md5', 'The hash algorithm to use. Default: sha256');
            addParamLine('--h, --host', '--h=bob.example.com', 'The name of the host to connect to. Default: localhost');
            addParamLine('--hs, --handshake', '--hs=P@assword123!', 'A custom password for the handshake.');
            addParamLine('--hs64, --handshake64', '--hs64=UEBhc3N3b3JkMTIzIQ==', 'A custom password for the handshake in Base64 format.');
            addParamLine('--k, --key', '--k=2048', 'RSA key size. Default: 1024');
            addParamLine('--nc, --no-compression', '--nc', 'Do NOT use compression.');
            addParamLine('--nn, --no-noise', '--nn', 'Do NOT produce "noise" when exchanging data.');
            addParamLine('--p, --port', '--p=5979', 'The TCP port. Default: 30904');
            addParamLine('--pwd, --password', '--pwd=96', 'The size of the password for the encryption. Default: 64');
            addParamLine('--r, --receive', '--r', 'Force "receive files" mode');
            addParamLine('--s, --send', '--s', 'Force "send files" mode');
            addParamLine('--v, --verbose', '--v', 'Output additional information');

            app.writeln();
        }
        catch (e) {
            reject(e);
        }
    });
}
