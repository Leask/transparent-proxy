const isFunction = (variable) => {
    return variable && typeof variable === 'function';
};

const isValidASCII = (str) => {
    if (typeof (str) !== 'string') {
        return false;
    }
    for (let i = 0; i < str.length; i++) {
        if (str.charCodeAt(i) > 127) {
            return false;
        }
    }
    return true;
};

class Logger {
    constructor(debugMode = false) {
        this.debug = debugMode;
    }

    log(args) {
        if (this.debug) {
            console.log('###', new Date(), ...arguments);
        }
    }

    error(args) {
        if (this.debug) {
            console.error('###', new Date(), ...arguments);
        }
    }
};

export {
    isFunction,
    isValidASCII,
    Logger,
};
