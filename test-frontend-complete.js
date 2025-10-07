// Complete frontend simulation test
const axios = require('axios');

const BASE_URL = 'https://ulgur-backend-production-53b2.up.railway.app';

async function testCompleteFrontendFlow() {
  try {
    console.log('🔧 Testing complete frontend flow...');
    
    // Step 1: Login (exactly like frontend)
    console.log('\n📱 Step 1: Login');
    const loginResponse = await axios.post(`${BASE_URL}/webapp/auth/login`, {
      telegramId: '5543081353',
      role: 'SELLER'
    });
    
    const token = loginResponse.data.access_token;
    console.log('✅ Login successful, token:', token.substring(0, 20) + '...');
    
    // Step 2: Create product (exactly like frontend)
    console.log('\n📱 Step 2: Create Product');
    const productData = {
      name: 'Frontend Test Product',
      description: 'This is a test product from frontend simulation',
      price: 15000,
      originalPrice: 18000,
      quantity: 10,
      availableUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      availableFrom: undefined,
      category: 'other'
    };
    
    console.log('🔧 Sending product data:', productData);
    console.log('🔧 API URL:', `${BASE_URL}/webapp/products`);
    
    const response = await axios.post(`${BASE_URL}/webapp/products`, productData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-language': 'uz'
      }
    });
    
    console.log('✅ Product created successfully!');
    console.log('📦 Product ID:', response.data.id);
    console.log('📦 Product name:', response.data.name);
    console.log('📦 Product price:', response.data.price);
    
    // Step 3: Verify product was created
    console.log('\n📱 Step 3: Verify Product');
    const getResponse = await axios.get(`${BASE_URL}/webapp/products/${response.data.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Product verification successful!');
    console.log('📦 Retrieved product:', getResponse.data.name);
    
  } catch (error) {
    console.error('❌ Test failed:');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data);
    console.error('Headers:', error.response?.headers);
    
    if (error.response?.status === 403) {
      console.error('\n🔍 This is a seller status issue - the seller needs to be approved');
    } else if (error.response?.status === 400) {
      console.error('\n🔍 This is a validation issue - check the request format');
    } else if (error.response?.status === 500) {
      console.error('\n🔍 This is a server error - check the backend logs');
    }
  }
}

testCompleteFrontendFlow();
