import { isFunction } from './utilitas.mjs';

export default async (upstream, { data, bridgedConnection }) => {
    if (isFunction(upstream)) {
        let returnValue = upstream(data, bridgedConnection);
        if (returnValue instanceof Promise) {
            returnValue = await returnValue;
        }
        if (returnValue !== 'localhost') {
            return returnValue;
        }
    }
    return false;
};
