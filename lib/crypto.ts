import crypto from 'crypto';
import logger from './logger';

// Use ENCRYPTION_KEY from environment.
// In production, ENCRYPTION_KEY should always be provided as a 32-byte hex string (64 chars).
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey() {
    if (!ENCRYPTION_KEY) {
        throw new Error('ENCRYPTION_KEY environment variable is missing');
    }
    // If it's 64 chars, assume it's hex and convert to 32 bytes Buffer
    if (ENCRYPTION_KEY.length === 64) {
        return Buffer.from(ENCRYPTION_KEY, 'hex');
    }
    // Falls back to deriving a key if not 64 chars (legacy or non-hex)
    return crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
}

export function encrypt(text: string): string {
    const iv = crypto.randomBytes(12);
    const key = getEncryptionKey();
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    
    // format: iv:authTag:encryptedText
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(text: string): string | null {
    try {
        const parts = text.split(':');
        if (parts.length !== 3) return null;
        
        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encryptedText = parts[2];
        
        const key = getEncryptionKey();
        
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (err) {
        logger.error({ err }, 'Decryption failed');
        return null;
    }
}
