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
     * The (working) directory.
     */
    readonly dir: string;
    /**
     * Do not close server after first connection?
     */
    readonly doNotClose: boolean;
    /**
     * The list of files to process.
     */
    readonly files: string[];
    /**
     * The host.
     */
    readonly host: string;
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
    readonly handle: (ctx: AppContext) => ModeHandlerResult;
}

/**
 * Result (types) of a mode handler.
 */
export type ModeHandlerResult = void | number | PromiseLike<number>;

/**
 * A message.
 */
export interface IMessage {
    /**
     * The type (ID).
     */
    type: number;
}

/**
 * An answer.
 */
export interface IAnswer extends IMessage {
    /**
     * The code.
     */
    code?: number;
    /**
     * The message.
     */
    msg?: string;
    /**
     * @inheritDoc
     */
    type: 0;
}

/**
 * A file reqest.
 */
export interface IFileRequest extends IMessage {
    /**
     * The total number of files.
     */
    count: number;
    /**
     * The zero based index of the current file.
     */
    index: number;
    /**
     * The name of the file.
     */
    name: string;
    /**
     * The size in bytes.
     */
    size: number;
    /**
     * @inheritDoc
     */
    type: 1;
}
