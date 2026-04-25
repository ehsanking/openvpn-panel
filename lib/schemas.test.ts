import { describe, it, expect } from 'vitest';
import { UserSchema } from './schemas';

describe('UserSchema', () => {
  it('should validate a correct user object', () => {
    const data = {
      username: 'johndoe',
      password: 'password123',
      role: 'user'
    };
    const result = UserSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should fail if username is too short', () => {
    const data = {
      username: 'jo',
      password: 'password123',
      role: 'user'
    };
    const result = UserSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should fail if password is too short', () => {
    const data = {
      username: 'johndoe',
      password: '123',
      role: 'user'
    };
    const result = UserSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should fail if role is invalid', () => {
    const data = {
      username: 'johndoe',
      password: 'password123',
      role: 'superadmin'
    };
    const result = UserSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});
