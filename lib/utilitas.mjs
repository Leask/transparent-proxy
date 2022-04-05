import color from './color.mjs';
import path from 'path';

const fileURLToPath = (await import('url')).fileURLToPath
    || (url => new URL('', url).pathname);
const extError = (err, status, opt = {}) => Object.assign(err, { status }, opt);
const newError = (msg, status, opt) => extError(new Error(msg), status, opt);
const throwError = (msg, status, opt) => { throw newError(msg, status, opt); };

const __ = (url) => {
    assert(url, 'Invalid URL.', 500);
    const __filename = fileURLToPath(url);
    const __dirname = path.dirname(__filename);
    return { __filename, __dirname };
};

const { __filename } = __(import.meta.url);

const toString = (any, options) => {
    if (Object.isObject(any)) { return JSON.stringify(any); }
    else if (Date.isDate(any)) { return any.toISOString(); }
    else if (Error.isError(any)) { return options?.trace ? any.stack : any.message; }
    return String(any ?? '');
};

const ensureString = (str, options) => {
    str = toString(str, options);
    if (options?.case) {
        switch (toString(options?.case).trim().toUpperCase()) {
            case 'UP':
                str = str.toUpperCase();
                break;
            case 'LOW':
                str = str.toLowerCase();
                break;
            case 'CAP': // capitalize
                str = `${str.charAt(0).toUpperCase()}${str.slice(1)}`;
                break;
            default:
                throwError(`Invalid case option: '${options?.case}'.`, 500);
        }
    }
    options?.trim && (str = str.trim());
    options?.singleLine && (str = str.replace(/[\r\n]+/g, ' '));
    return str;
};

const isAscii = (str) => {
    if (String.isString(str)) {
        for (let i = 0; i < str.length; i++) {
            if (str.charCodeAt(i) > 127) { return false; }
        }
    }
    return true;
};

const basename = (filename) => path.basename(
    String(filename || __filename)
).replace(/\.[^\.]*$/, '').trim();

const modLog = (content, filename, options) => {
    options = options || [];
    const isErr = Error.isError(content);
    content = Object.isObject(content) ? JSON.stringify(content) : content;
    const strTime = options.time ? ` ${(Date.isDate(
        options.time, true
    ) ? options.time : new Date()).toISOString()}` : '';
    const args = ['['
        + color.red(basename(filename).toUpperCase()) + color.yellow(strTime)
        + ']' + (isErr ? '' : ` ${content}`)];
    if (isErr) { args.push(content); }
    return console.info.apply(null, args);
};

class Logger {

    _modName = '';
    _logLevels = ['log', 'info', 'debug', 'warn', 'error'];
    _logLevel = 0;
    _options = { time: true };
    _shouldLog(lvl) { return ~~this._logLevels.indexOf(lvl) >= ~~this._logLevel; };
    _log(args) { return modLog(args, this._modName, this._options); };

    log(args) { return this._shouldLog('log') && this._log(args); };

    error(args) { return this._shouldLog('error') && this._log(args); };

    constructor({ modName = '', logLevel = 0 }) {
        Object.assign(this, { _modName: modName, _logLevel: ~~logLevel });
    };

};

export {
    __,
    basename,
    ensureString,
    extError,
    fileURLToPath,
    isAscii,
    Logger,
    modLog,
    newError,
    throwError,
    toString,
};
