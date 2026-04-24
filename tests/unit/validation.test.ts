import { userCreateSchema, serverCreateSchema, userPatchSchema, adminLoginSchema } from '../../lib/validation';

describe('adminLoginSchema', () => {
  it('accepts valid credentials', () => {
    const result = adminLoginSchema.safeParse({ username: 'admin', password: 'secret' });
    expect(result.success).toBe(true);
  });

  it('rejects empty username', () => {
    const result = adminLoginSchema.safeParse({ username: '', password: 'secret' });
    expect(result.success).toBe(false);
  });

  it('rejects missing password', () => {
    const result = adminLoginSchema.safeParse({ username: 'admin' });
    expect(result.success).toBe(false);
  });
});

describe('userCreateSchema', () => {
  it('accepts minimal valid user', () => {
    const result = userCreateSchema.safeParse({ username: 'testuser' });
    expect(result.success).toBe(true);
  });

  it('rejects username shorter than 3 chars', () => {
    const result = userCreateSchema.safeParse({ username: 'ab' });
    expect(result.success).toBe(false);
  });

  it('rejects username with invalid characters', () => {
    const result = userCreateSchema.safeParse({ username: 'test user!' });
    expect(result.success).toBe(false);
  });

  it('accepts valid username with allowed chars', () => {
    const result = userCreateSchema.safeParse({ username: 'test_user-01' });
    expect(result.success).toBe(true);
  });

  it('rejects port outside 1-65535', () => {
    const result = userCreateSchema.safeParse({ username: 'validuser', port: 99999 });
    expect(result.success).toBe(false);
  });

  it('rejects port 0', () => {
    const result = userCreateSchema.safeParse({ username: 'validuser', port: 0 });
    expect(result.success).toBe(false);
  });

  it('accepts port in valid range', () => {
    const result = userCreateSchema.safeParse({ username: 'validuser', port: 1194 });
    expect(result.success).toBe(true);
  });

  it('rejects invalid role', () => {
    const result = userCreateSchema.safeParse({ username: 'validuser', role: 'superadmin' as any });
    expect(result.success).toBe(false);
  });

  it('accepts valid roles', () => {
    for (const role of ['user', 'admin', 'reseller']) {
      const result = userCreateSchema.safeParse({ username: 'validuser', role });
      expect(result.success).toBe(true);
    }
  });
});

describe('serverCreateSchema', () => {
  it('accepts valid IPv4 address', () => {
    const result = serverCreateSchema.safeParse({ name: 'Node-01', ip_address: '192.168.1.1' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid IP address', () => {
    const result = serverCreateSchema.safeParse({ name: 'Node-01', ip_address: 'not-an-ip' });
    expect(result.success).toBe(false);
  });

  it('rejects empty server name', () => {
    const result = serverCreateSchema.safeParse({ name: '', ip_address: '1.2.3.4' });
    expect(result.success).toBe(false);
  });

  it('rejects port out of range in ports array', () => {
    const result = serverCreateSchema.safeParse({
      name: 'Node', ip_address: '1.2.3.4', ports: [70000],
    });
    expect(result.success).toBe(false);
  });
});

describe('userPatchSchema', () => {
  it('accepts valid status update', () => {
    const result = userPatchSchema.safeParse({ id: 1, status: 'active' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = userPatchSchema.safeParse({ id: 1, status: 'banned' });
    expect(result.success).toBe(false);
  });

  it('rejects non-positive id', () => {
    const result = userPatchSchema.safeParse({ id: 0, status: 'active' });
    expect(result.success).toBe(false);
  });
});
