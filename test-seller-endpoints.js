const axios = require('axios');

// Test script to verify seller endpoints work correctly
const BASE_URL = 'https://ulgur-backend-production-53b2.up.railway.app';

// Test with the actual user's token from the logs
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjMsInRlbGVncmFtSWQiOiI1NTQzMDgxMzUzIiwicm9sZSI6IlNFTExFUiIsImlhdCI6MTc1OTg0NzM3OCwiZXhwIjoxNzU5ODUwOTc4fQ.6J6K2RHXqxjs9zgQxMxTBDrLg4rQnW19F3-mporDPSI';

async function testSellerEndpoints() {
  console.log('🧪 Testing seller endpoints...');
  
  const headers = {
    'Authorization': `Bearer ${TEST_TOKEN}`,
    'Content-Type': 'application/json'
  };

  try {
    // Test 1: Seller Profile
    console.log('\n1️⃣ Testing /webapp/sellers/profile');
    try {
      const profileResponse = await axios.get(`${BASE_URL}/webapp/sellers/profile`, { headers });
      console.log('✅ Seller profile response:', profileResponse.data);
    } catch (error) {
      console.log('❌ Seller profile error:', error.response?.data || error.message);
    }

    // Test 2: Seller Products
    console.log('\n2️⃣ Testing /webapp/products/seller/my');
    try {
      const productsResponse = await axios.get(`${BASE_URL}/webapp/products/seller/my`, { headers });
      console.log('✅ Seller products response:', productsResponse.data);
      console.log('📊 Product count:', productsResponse.data?.length || 0);
    } catch (error) {
      console.log('❌ Seller products error:', error.response?.data || error.message);
    }

    // Test 3: Seller Orders
    console.log('\n3️⃣ Testing /webapp/orders/seller/my');
    try {
      const ordersResponse = await axios.get(`${BASE_URL}/webapp/orders/seller/my`, { headers });
      console.log('✅ Seller orders response:', ordersResponse.data);
      console.log('📊 Order count:', ordersResponse.data?.length || 0);
    } catch (error) {
      console.log('❌ Seller orders error:', error.response?.data || error.message);
    }

    // Test 4: Decode JWT token
    console.log('\n4️⃣ Decoding JWT token');
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.decode(TEST_TOKEN);
      console.log('🔍 JWT payload:', decoded);
    } catch (error) {
      console.log('❌ JWT decode error:', error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSellerEndpoints();
