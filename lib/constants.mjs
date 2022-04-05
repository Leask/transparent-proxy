const DEFAULT_OPTIONS = {
    auth: false,
    injectData: false,
    injectResponse: false,
    intercept: false,
    keys: false,
    logLevel: 0,
    tcpOutgoingAddress: false,
    upstream: false,
};

const EVENTS = {
    CLOSE: 'close',
    DATA: 'data',
    ERROR: 'error',
    EXIT: 'exit',
};

const ERROR_CODES = {
    ENOTFOUND: 'ENOTFOUND',
    EPIPE: 'EPIPE',
    EPROTO: 'EPROTO',
    ETIMEDOUT: 'ETIMEDOUT',
};

const HTTP = 'http';
const HTTP_PORT = 80;
const HTTPS = 'https';
const HTTPS_PORT = 443;

const HTTP_BODIES = {
    AUTH_REQUIRED: 'Proxy Authorization Required!',
    NOT_FOUND: 'Not Found!'
};

const HTTP_RESPONSES = {
    AUTH_REQUIRED: 'HTTP/1.0 407 Proxy Authorization Required' + '\r\nProxy-Authenticate: Basic realm=""',
    NOT_FOUND: 'HTTP/1.0 404 Not Found',
    NOT_OK: 'HTTP/1.0 400 Bad Request',
    OK: 'HTTP/1.0 200 OK',
    TIMED_OUT: 'HTTP/1.0 408 Request Timeout'
};

const HTTP_METHODS = {
    CONNECT: 'CONNECT',
    GET: 'GET',
};

const STRINGS = {
    AT: '@',
    BLANK: ' ',
    CLRF: '\r\n',
    EMPTY: '',
    PROXY_AUTH_BASIC: 'Basic',
    PROXY_AUTH: 'Proxy-Authorization',
    SEPARATOR: ':',
};

const SLASH = '/';
const SLASH_REGEXP = /\//gmi;
const SLASH_REGEXP_ONCE = /\//g;

// openssl req -x509 -sha256 -nodes -days 3650 -newkey rsa:2048 -keyout privateKey.key -out certificate.crt
const DEFAULT_KEYS = {
    key: ['-----BEGIN PRIVATE KEY-----',
        'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDbZKNnV6BP9D95',
        'x9Rm6r+uAfOO0ZHmJycaTZJDgF4HbnZpk+vJNtcGHusK9h16Q4GPsVf21K95DMmU',
        'm0pvkQG2Yu5XvJ2fnXA92TxuhcukuKfqm7twPPyY7E18NZk91KDPcMb1A0PfsOj4',
        'qaDwqHaoxwSoSnF7IWVBzaETvEoA1VXB2HAWypjaB1huXtpS3FGXkLdXEsNPi7OG',
        'e7QjLMs7hJ/5rxLaPSTGOwrfOe4EXrST3BVFSJf5Ex+er2Pw28XrnJoLl63yMpKk',
        'me5J/c+8v+DCbSBYXTc9e8FI8czIK6e8P+BCtv37tUvqnSw+fHmhYcS2YD8h96dr',
        'khy37iHJAgMBAAECggEAGqI5BA6rM4mfOxV7P5M3+dPa0Xe3ko0mPhc0rmUjBRvv',
        '3BlNAnxZ1jBisE34fiM700ngN+LR+owG3LeNbcXYw193N8d6Cyp9ucRphbFQa4rP',
        'N7f4JUQCFj55mZ6YH910ODqkrJHc54b+gVF2bEDHRu4CLrv60svXEwn3iAHPqhIC',
        'WRBXHcsEvzUsV9TcRa5bR7dBu/dxPqUIX2I144EWPP2aUd3pd+hij1nwQfU+cmcL',
        'Cq8x5NpT79TVTqNaCT2CT/WP/9Hdio1MOxhZRHLX6nMvOK/H+SonikESTpJF2JND',
        '8VMRkDYfklf4tIZ10qWxJT+OvBuwO6MZhaVnUpliAQKBgQD6zaQN/dWNMxnAYDus',
        '1y/xKjyhzv3PlgZx7Nrl9yMWvv0XQO9P0seN/8w5z0UNqPiIpS5QNPdbp55AxYbT',
        'hJ7An18fPDxShdQH0LGDXz2wDe4ubYvThGqv/FPQOKah18NIKoS3OMmONwi2K+OA',
        'yfwo/ypmrj0HCDneOsnAsC6i2QKBgQDf8GK2VR+x3vujOHGOtFlUQwfXped6rA/H',
        'DopehvBLIvQvi07HFtg6gAN8oh7Sd8us+IRvmaQ6D4iGs0wQ2q8y8R52Y7Jy1bCR',
        'ggfwfXlSnA6Fi5zvWwWu4iZhDQ6pXgf0VivQxLFWROHFm75bPAOai8xpXmwvf7MQ',
        '21rtNnJAcQKBgQCvJULG/pfOlnwKS2oBJvl0+mEDQrEe8Y8oqhan9/GKJfBK9+7n',
        'mLQBJzywtl1rz69YhboVCxge6qxqYUbpmbjfnaxo/MDHhGvw1T3SF4XV17SYuamn',
        'GdcDdTv2skkzxqC6We76oO6ooSg1R+sFeojc/GzY7h7yNT1sQzO3m5HF6QKBgHL+',
        'yFIFSG9YqDPa6kVzy2N/wGk24rWV4cxAZUHBXWfYHTjE+sE1s/fmgOPhhJ5jsg2y',
        '2J9OcIz4KQ2yyN7mzY0FULVO4PYjUbaG5XjTlheb18EwPniTb0mtDDRONjc2+DK6',
        'hWmBd+drG90T6x6CpP8ZxvBc8oU5uERxwDGMAgOhAoGAKxpfG8b8wcJFjD0cyEek',
        'O/CbnvhxnyGau//qwq9w6nwOuQ4ZTPAhWfzKFtUPm1M5BMfddWrfbDieNVcJqZwC',
        'KuJMhV3JVHZjl5OiAuFeOMmdQEaNz0BkvYHz5nH+gbbyFbjF/6np8v6YieHtK4Ac',
        'EOVDnunHPxLyC2JjFlofq38=',
        '-----END PRIVATE KEY-----'].join('\n'),
    cert: ['-----BEGIN CERTIFICATE-----',
        'MIIDQDCCAigCCQDqniG6wnI1vDANBgkqhkiG9w0BAQsFADBiMQswCQYDVQQGEwJD',
        'QTEQMA4GA1UECAwHT250YXJpbzEPMA0GA1UEBwwGT3R0YXdhMRMwEQYDVQQKDApM',
        'ZWFzayBXb25nMRswGQYJKoZIhvcNAQkBFgxpQGxlYXNraC5jb20wHhcNMjIwNDA0',
        'MTQyMjEwWhcNMzIwNDAxMTQyMjEwWjBiMQswCQYDVQQGEwJDQTEQMA4GA1UECAwH',
        'T250YXJpbzEPMA0GA1UEBwwGT3R0YXdhMRMwEQYDVQQKDApMZWFzayBXb25nMRsw',
        'GQYJKoZIhvcNAQkBFgxpQGxlYXNraC5jb20wggEiMA0GCSqGSIb3DQEBAQUAA4IB',
        'DwAwggEKAoIBAQDbZKNnV6BP9D95x9Rm6r+uAfOO0ZHmJycaTZJDgF4HbnZpk+vJ',
        'NtcGHusK9h16Q4GPsVf21K95DMmUm0pvkQG2Yu5XvJ2fnXA92TxuhcukuKfqm7tw',
        'PPyY7E18NZk91KDPcMb1A0PfsOj4qaDwqHaoxwSoSnF7IWVBzaETvEoA1VXB2HAW',
        'ypjaB1huXtpS3FGXkLdXEsNPi7OGe7QjLMs7hJ/5rxLaPSTGOwrfOe4EXrST3BVF',
        'SJf5Ex+er2Pw28XrnJoLl63yMpKkme5J/c+8v+DCbSBYXTc9e8FI8czIK6e8P+BC',
        'tv37tUvqnSw+fHmhYcS2YD8h96drkhy37iHJAgMBAAEwDQYJKoZIhvcNAQELBQAD',
        'ggEBACIC7DeW+vLRqtoS86rKljm5dlMUli/4yBAlg7AZXtSnFhPXMAydq/MLa3oJ',
        '1kwcNFijKy/uehHza5YKC8JWZ/dH6/wkooQMlXcwSKhjnnTOfu8VNF4f10Cffz/M',
        'y89Z+JOCDlCn87FUBvO2JfFZ72XjkxhfHZHB8FeKekioEC2t9jlENiU/cSXuBQZe',
        '7POFsWgtEZXy6wz6fWdv/Nzs/inrtRAz9EkAMZQOOewoHpzMsAvjs0x8rHVWuq5q',
        'Ug2TB2CjPSuH24+7r3H5N0rLaxMNI0nWN4xmbY1aZHCx5kM/H5reQ0UcgFaJ6UlN',
        '0NLclDC1FZN4RjACOG+ulGM5m2s=',
        '-----END CERTIFICATE-----'].join('\n'),
};

export {
    DEFAULT_KEYS,
    DEFAULT_OPTIONS,
    ERROR_CODES,
    EVENTS,
    HTTP_BODIES,
    HTTP_METHODS,
    HTTP_PORT,
    HTTP_RESPONSES,
    HTTP,
    HTTPS_PORT,
    HTTPS,
    SLASH_REGEXP_ONCE,
    SLASH_REGEXP,
    SLASH,
    STRINGS,
};
