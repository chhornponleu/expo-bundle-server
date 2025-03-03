import * as crypto from 'crypto';

export function convertSHA256HashToUUID(value = '') {
    return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(
        16,
        20
    )}-${value.slice(20, 32)}`;
}

export function createHash(file: Buffer, hashingAlgorithm: string, encoding: any) {
    return crypto.createHash(hashingAlgorithm).update(file).digest(encoding);
}

export function getBase64URLEncoding(base64EncodedString: string) {
    return base64EncodedString.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}