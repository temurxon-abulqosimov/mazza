// Test script to verify product creation endpoint
const axios = require('axios');

const BASE_URL = 'https://your-railway-app-url.railway.app'; // Replace with your actual Railway URL

async function testProductCreation() {
  try {
    // Step 1: Login as seller
    console.log('🔧 Step 1: Logging in as seller...');
    const loginResponse = await axios.post(`${BASE_URL}/webapp/auth/login`, {
      telegramId: '5543081353',
      role: 'SELLER'
    });
    
    const { access_token } = loginResponse.data;
    console.log('✅ Login successful, got token:', access_token.substring(0, 20) + '...');
    
    // Step 2: Create product
    console.log('🔧 Step 2: Creating product...');
    const productData = {
      name: 'Test Product',
      price: 10000,
      originalPrice: 12000,
      description: 'Test product description',
      availableUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
      isActive: true,
      quantity: 10
    };
    
    const productResponse = await axios.post(`${BASE_URL}/webapp/products`, productData, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Product created successfully:', productResponse.data);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    }
  }
}

testProductCreation();
