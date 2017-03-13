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

/**
 * An application context.
 */
export interface AppContext {
    /**
     * The list of files to process.
     */
    readonly files: string[];
    /**
     * The host.
     */
    readonly host: string;
    /**
     * The size for a RSA key.
     */
    readonly keySize: number;
    /**
     * The port.
     */
    readonly port: number;
}

/**
 * A mode handler.
 */
export interface ModeHandler {
    /**
     * Handles the mode.
     * 
     * @param {AppContext} ctx The application context.
     * 
     * @return {ModeHandlerResult} The result.
     */
    handle(ctx: AppContext): ModeHandlerResult;
}

/**
 * Result (types) of a mode handler.
 */
export type ModeHandlerResult = void | number | PromiseLike<number>;


export interface IMessage {
    type: number;
}

export interface IAnswer extends IMessage {
    code?: number;
    msg?: string;
    type: 0;
}

export interface IFileRequest extends IMessage {
    name: string;
    size: number;
    type: 1;
}
