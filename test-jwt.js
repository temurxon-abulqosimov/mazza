const jwt = require('jsonwebtoken');

const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjMsInRlbGVncmFtSWQiOiI1NTQzMDgxMzUzIiwicm9sZSI6IlNFTExFUiIsImlhdCI6MTc1OTg0NzM3OCwiZXhwIjoxNzU5ODUwOTc4fQ.6J6K2RHXqxjs9zgQxMxTBDrLg4rQnW19F3-mporDPSI';

// Try to decode without verification first
console.log('🔍 Decoding JWT without verification:');
try {
  const decoded = jwt.decode(TEST_TOKEN);
  console.log('Decoded payload:', decoded);
} catch (error) {
  console.log('Decode error:', error.message);
}

// Try to verify with different possible secrets
const possibleSecrets = [
  'your-secret-key',
  'jwt-secret-key',
  'secret',
  'my-secret-key',
  'webapp-secret',
  'mazza-secret'
];

console.log('\n🔍 Trying to verify JWT with different secrets:');
for (const secret of possibleSecrets) {
  try {
    const verified = jwt.verify(TEST_TOKEN, secret);
    console.log(`✅ JWT verified with secret: "${secret}"`);
    console.log('Verified payload:', verified);
    break;
  } catch (error) {
    console.log(`❌ Failed with secret: "${secret}" - ${error.message}`);
  }
}

// Check token expiration
console.log('\n🔍 Token expiration check:');
const decoded = jwt.decode(TEST_TOKEN);
const currentTime = Math.floor(Date.now() / 1000);
console.log('Current time:', currentTime);
console.log('Token issued at:', decoded.iat);
console.log('Token expires at:', decoded.exp);
console.log('Token expired:', currentTime > decoded.exp);
console.log('Time until expiration:', decoded.exp - currentTime, 'seconds');
