const axios = require('axios');

const BASE_URL = 'https://telegram.avtemur.uz';

async function testPostmanFormat() {
  try {
    console.log('🔧 Testing with exact Postman collection format...');
    
    // Step 1: Login as SELLER
    console.log('🔧 Step 1: Logging in as SELLER...');
    const loginResponse = await axios.post(`${BASE_URL}/webapp/auth/login`, {
      telegramId: '5543081353',
      role: 'SELLER'
    });
    
    console.log('✅ Login successful');
    const token = loginResponse.data.access_token;
    console.log('🔧 Token received:', token ? 'Yes' : 'No');
    
    // Step 2: Create product with exact Postman format
    console.log('🔧 Step 2: Creating product with Postman format...');
    const productData = {
      name: "Fresh Pizza Margherita",
      price: 25000,
      originalPrice: 30000,
      description: "Delicious pizza with fresh tomatoes and mozzarella",
      availableUntil: "2025-01-15T22:00:00.000Z",
      code: "PIZZA1",
      isActive: true,
      quantity: 50
    };
    
    console.log('🔧 Product data:', productData);
    
    const response = await axios.post(`${BASE_URL}/webapp/products`, productData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Product created successfully!');
    console.log('📦 Response:', response.data);
    
  } catch (error) {
    console.error('❌ Test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);
      console.error('Headers:', error.response.headers);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testPostmanFormat();
