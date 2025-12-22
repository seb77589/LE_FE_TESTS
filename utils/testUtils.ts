/**
 * Generates a random email address for testing
 * Uses domain from TEST_USER_EMAIL environment variable
 */
export function generateRandomEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  // Extract email domain from TEST_USER_EMAIL environment variable
  // Must be set in config/.env - validated by test-credentials.ts
  if (!process.env.TEST_USER_EMAIL) {
    throw new Error(
      'TEST_USER_EMAIL environment variable is required. Please configure it in config/.env',
    );
  }
  const testUserEmail = process.env.TEST_USER_EMAIL;
  const emailDomain = testUserEmail.split('@')[1];
  if (!emailDomain) {
    throw new Error(
      `Invalid TEST_USER_EMAIL format: ${testUserEmail}. Expected format: user@domain.com`,
    );
  }
  return `test-${random}-${timestamp}@${emailDomain}`;
}

/**
 * Generates a random password that meets common requirements
 */
export function generateRandomPassword(): string {
  const length = 12;
  const charset =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';

  // Ensure at least one uppercase, one lowercase, one number, and one special character
  password += 'A'; // Uppercase
  password += 'a'; // Lowercase
  password += '1'; // Number
  password += '!'; // Special character

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }

  // Shuffle the password
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}
