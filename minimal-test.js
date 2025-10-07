// Minimal test to isolate the validation issue
const axios = require('axios');

const BASE_URL = 'https://ulgur-backend-production-53b2.up.railway.app';

async function minimalTest() {
  try {
    console.log('🔧 Minimal test - checking validation...');
    
    // Login
    const loginResponse = await axios.post(`${BASE_URL}/webapp/auth/login`, {
      telegramId: '5543081353',
      role: 'SELLER'
    });
    
    const token = loginResponse.data.access_token;
    console.log('✅ Login successful');
    
    // Test with minimal required fields only
    const minimalData = {
      name: 'Test',
      price: 1000,
      availableUntil: '2025-10-08T12:00:00Z'
    };
    
    console.log('🔧 Testing minimal data:', minimalData);
    
    const response = await axios.post(`${BASE_URL}/webapp/products`, minimalData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Success with minimal data!');
    console.log('Product ID:', response.data.id);
    
  } catch (error) {
    console.error('❌ Minimal test failed:');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data);
    
    // Try to identify the specific validation issue
    if (error.response?.data?.message) {
      console.error('Validation errors:', error.response.data.message);
    }
  }
}

minimalTest();
