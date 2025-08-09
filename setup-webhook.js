const axios = require('axios');
require('dotenv').config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

if (!TELEGRAM_BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN is required');
  process.exit(1);
}

if (!WEBHOOK_URL) {
  console.error('❌ WEBHOOK_URL is required');
  process.exit(1);
}

// Validate webhook URL format
if (!WEBHOOK_URL.startsWith('https://')) {
  console.error('❌ WEBHOOK_URL must start with https:// for security');
  process.exit(1);
}

async function setupWebhook() {
  try {
    console.log('🔧 Setting up Telegram webhook...');
    console.log(`📡 Webhook URL: ${WEBHOOK_URL}/webhook`);
    
    const webhookData = {
      url: `${WEBHOOK_URL}/webhook`,
      max_connections: 40,
      allowed_updates: [
        'message',
        'edited_message',
        'channel_post',
        'edited_channel_post',
        'inline_query',
        'chosen_inline_result',
        'callback_query',
        'shipping_query',
        'pre_checkout_query',
        'poll',
        'poll_answer',
        'my_chat_member',
        'chat_member',
        'chat_join_request'
      ]
    };

    // Add secret token if configured
    if (process.env.WEBHOOK_SECRET) {
      webhookData.secret_token = process.env.WEBHOOK_SECRET;
      console.log('🔐 Using webhook secret token');
    } else {
      console.log('⚠️  No webhook secret token configured');
    }

    const response = await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
      webhookData,
      {
        timeout: 10000, // 10 second timeout
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.ok) {
      console.log('✅ Webhook set successfully!');
      console.log('📊 Webhook info:', response.data.result);
    } else {
      console.error('❌ Failed to set webhook:', response.data);
      process.exit(1);
    }
  } catch (error) {
    if (error.response) {
      console.error('❌ Telegram API Error:', error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      console.error('❌ Connection refused. Check if your server is accessible.');
    } else if (error.code === 'ENOTFOUND') {
      console.error('❌ Domain not found. Check your WEBHOOK_URL.');
    } else {
      console.error('❌ Error setting webhook:', error.message);
    }
    process.exit(1);
  }
}

async function deleteWebhook() {
  try {
    console.log('🗑️ Deleting Telegram webhook...');
    
    const response = await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook`,
      {},
      {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.ok) {
      console.log('✅ Webhook deleted successfully!');
    } else {
      console.error('❌ Failed to delete webhook:', response.data);
      process.exit(1);
    }
  } catch (error) {
    if (error.response) {
      console.error('❌ Telegram API Error:', error.response.data);
    } else {
      console.error('❌ Error deleting webhook:', error.message);
    }
    process.exit(1);
  }
}

async function getWebhookInfo() {
  try {
    console.log('📊 Getting webhook info...');
    
    const response = await axios.get(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`,
      {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.ok) {
      console.log('📋 Webhook info:', JSON.stringify(response.data.result, null, 2));
    } else {
      console.error('❌ Failed to get webhook info:', response.data);
      process.exit(1);
    }
  } catch (error) {
    if (error.response) {
      console.error('❌ Telegram API Error:', error.response.data);
    } else {
      console.error('❌ Error getting webhook info:', error.message);
    }
    process.exit(1);
  }
}

const command = process.argv[2];

switch (command) {
  case 'setup':
    setupWebhook();
    break;
  case 'delete':
    deleteWebhook();
    break;
  case 'info':
    getWebhookInfo();
    break;
  default:
    console.log('Usage: node setup-webhook.js [setup|delete|info]');
    console.log('');
    console.log('Commands:');
    console.log('  setup  - Set up the webhook');
    console.log('  delete - Delete the webhook');
    console.log('  info   - Get webhook information');
    console.log('');
    console.log('Make sure your .env file contains:');
    console.log('  TELEGRAM_BOT_TOKEN=your_bot_token');
    console.log('  WEBHOOK_URL=https://your-domain.com');
    console.log('  WEBHOOK_SECRET=your_secret_token (optional)');
    break;
} 