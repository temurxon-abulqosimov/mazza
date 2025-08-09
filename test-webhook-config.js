const fs = require('fs');
require('dotenv').config();

console.log('🔍 Testing webhook configuration...\n');

// Check required environment variables
const requiredVars = {
  'TELEGRAM_BOT_TOKEN': process.env.TELEGRAM_BOT_TOKEN,
  'WEBHOOK_URL': process.env.WEBHOOK_URL,
  'USE_WEBHOOK': process.env.USE_WEBHOOK,
};

let hasErrors = false;

console.log('📋 Environment Variables Check:');
for (const [key, value] of Object.entries(requiredVars)) {
  if (!value) {
    console.log(`❌ ${key}: Missing`);
    hasErrors = true;
  } else {
    console.log(`✅ ${key}: ${key === 'TELEGRAM_BOT_TOKEN' ? '***' + value.slice(-4) : value}`);
  }
}

// Check webhook URL format
if (process.env.WEBHOOK_URL) {
  if (!process.env.WEBHOOK_URL.startsWith('https://')) {
    console.log('\n❌ WEBHOOK_URL must start with https:// for security');
    hasErrors = true;
  } else {
    console.log('\n✅ WEBHOOK_URL format is correct');
  }
}

// Check webhook secret
if (process.env.USE_WEBHOOK === 'true') {
  if (!process.env.WEBHOOK_SECRET) {
    console.log('\n⚠️  WEBHOOK_SECRET is not set (optional but recommended for security)');
  } else {
    console.log('\n✅ WEBHOOK_SECRET is configured');
  }
}

// Check if .env file exists
if (!fs.existsSync('.env')) {
  console.log('\n❌ .env file not found');
  hasErrors = true;
} else {
  console.log('\n✅ .env file exists');
}

// Summary
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.log('❌ Configuration has errors. Please fix them before deploying.');
  process.exit(1);
} else {
  console.log('✅ Configuration looks good!');
  console.log('\n🚀 Ready to deploy with webhook mode!');
  console.log('\nNext steps:');
  console.log('1. Deploy to your server');
  console.log('2. Run: npm run webhook:setup');
  console.log('3. Start the application: npm run start:prod');
} 