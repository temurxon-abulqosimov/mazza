// Simple test to check if the endpoint is working
const axios = require('axios');

const BASE_URL = 'https://ulgur-backend-production-53b2.up.railway.app';

async function simpleTest() {
  try {
    console.log('🔧 Testing simple product creation...');
    
    // First login
    const loginResponse = await axios.post(`${BASE_URL}/webapp/auth/login`, {
      telegramId: '5543081353',
      role: 'SELLER'
    });
    
    const token = loginResponse.data.access_token;
    console.log('✅ Login successful');
    
    // Complete product data
    const productData = {
      name: 'Simple Test Product',
      description: 'A simple test product',
      price: 1000,
      quantity: 1,
      availableUntil: '2025-10-08T12:00:00Z',
      category: 'other'
    };
    
    console.log('🔧 Sending simple product data:', productData);
    
    const response = await axios.post(`${BASE_URL}/webapp/products`, productData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Product created successfully:', response.data);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    console.error('❌ Status:', error.response?.status);
  }
}

simpleTest();
