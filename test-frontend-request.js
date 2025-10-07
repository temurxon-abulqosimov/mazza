// Test script to simulate frontend request
const axios = require('axios');

const BASE_URL = 'https://ulgur-backend-production-53b2.up.railway.app';

async function testProductCreation() {
  try {
    console.log('🔧 Testing product creation with frontend format...');
    
    // First login to get token
    const loginResponse = await axios.post(`${BASE_URL}/webapp/auth/login`, {
      telegramId: '5543081353',
      role: 'SELLER'
    });
    
    const token = loginResponse.data.access_token;
    console.log('✅ Login successful, token:', token.substring(0, 20) + '...');
    
    // Test product creation with frontend format
    const productData = {
      name: 'Test Product Description', // Frontend sends description as name
      description: 'Test Product Description', // Also as description
      price: 10000,
      originalPrice: 12000,
      quantity: 5,
      availableUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 19) + 'Z', // 24 hours from now in ISO format
      availableFrom: undefined,
      category: 'other'
      // sellerId will be set by backend automatically
    };
    
    console.log('🔧 Sending product data:', productData);
    
    const response = await axios.post(`${BASE_URL}/webapp/products`, productData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Product created successfully:', response.data);
    
  } catch (error) {
    console.error('❌ Error creating product:', error.response?.data || error.message);
    console.error('❌ Status:', error.response?.status);
    console.error('❌ Headers:', error.response?.headers);
  }
}

testProductCreation();
