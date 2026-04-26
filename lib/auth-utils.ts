import { TextEncoder } from 'util';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const SECRET_FILE = path.join(process.cwd(), '.jwt_secret');

export async function getJwtSecret(): Promise<Uint8Array> {
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32) {
         return new TextEncoder().encode(process.env.JWT_SECRET);
    }
    
    if (fs.existsSync(SECRET_FILE)) {
        const secret = fs.readFileSync(SECRET_FILE, 'utf8');
        return new TextEncoder().encode(secret);
    }

    // Generate and save new secret if not found
    const newSecret = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(SECRET_FILE, newSecret);
    return new TextEncoder().encode(newSecret);
}
