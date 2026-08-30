import { hashPassword, comparePassword } from '../utils/password';

describe('Password Utility Test Suite', () => {
  it('should securely hash a plaintext password', async () => {
    const plain = 'SecretPassword123!';
    const hash = await hashPassword(plain);

    expect(typeof hash).toBe('string');
    expect(hash).not.toBe(plain);
    expect(hash.startsWith('$2')).toBe(true); // bcrypt signature
  });

  it('should return true when comparing correct password against hash', async () => {
    const plain = 'SecretPassword123!';
    const hash = await hashPassword(plain);

    const isMatch = await comparePassword(plain, hash);
    expect(isMatch).toBe(true);
  });

  it('should return false when comparing incorrect password against hash', async () => {
    const plain = 'SecretPassword123!';
    const hash = await hashPassword(plain);

    const isMatch = await comparePassword('WrongPassword', hash);
    expect(isMatch).toBe(false);
  });
});
