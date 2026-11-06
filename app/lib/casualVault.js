import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from 'crypto';
import { appendFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

let cachedKey;

function readKeyFile() {
    const path = join(process.cwd(), '.env.local');
    if (!existsSync(path)) return '';
    const line = readFileSync(path, 'utf8')
        .split('\n')
        .find((entry) => entry.startsWith('CASUAL_STAFF_KEY='));
    if (!line) return '';
    return line.slice('CASUAL_STAFF_KEY='.length).trim().replace(/^["']|["']$/g, '');
}

function keyBytes() {
    if (cachedKey) return cachedKey;
    let secret = process.env.CASUAL_STAFF_KEY || readKeyFile();
    if (!secret) {
        secret = randomBytes(32).toString('hex');
        const path = join(process.cwd(), '.env.local');
        if (!existsSync(path)) {
            throw new Error('Add CASUAL_STAFF_KEY to the server environment before saving casual details.');
        }
        appendFileSync(path, `\nCASUAL_STAFF_KEY=${secret}\n`);
    }
    process.env.CASUAL_STAFF_KEY = secret;
    cachedKey = scryptSync(secret, 'mcic-casual-staff', 32);
    return cachedKey;
}

export function seal(value) {
    const text = String(value || '');
    if (!text) return '';
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', keyBytes(), iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    return [iv.toString('base64'), cipher.getAuthTag().toString('base64'), encrypted.toString('base64')].join('.');
}

export function openSeal(payload) {
    if (!payload) return '';
    const [iv, tag, data] = String(payload).split('.');
    if (!iv || !tag || !data) return '';
    const decipher = createDecipheriv('aes-256-gcm', keyBytes(), Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
}

export function tokenHash(token) {
    return createHash('sha256').update(String(token)).digest('hex');
}
