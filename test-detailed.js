const axios = require('axios');

const BASE_URL = 'https://ulgur-backend-production-53b2.up.railway.app';
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjMsInRlbGVncmFtSWQiOiI1NTQzMDgxMzUzIiwicm9sZSI6IlNFTExFUiIsImlhdCI6MTc1OTg0NzM3OCwiZXhwIjoxNzU5ODUwOTc4fQ.6J6K2RHXqxjs9zgQxMxTBDrLg4rQnW19F3-mporDPSI';

async function testDetailed() {
  console.log('🔍 Detailed endpoint testing...');
  
  const headers = {
    'Authorization': `Bearer ${TEST_TOKEN}`,
    'Content-Type': 'application/json',
    'x-language': 'uz'
  };

  // Test each endpoint individually with detailed error handling
  const endpoints = [
    { name: 'Seller Profile', url: '/webapp/sellers/profile' },
    { name: 'Seller Products', url: '/webapp/products/seller/my' },
    { name: 'Seller Orders', url: '/webapp/orders/seller/my' }
  ];

  for (const endpoint of endpoints) {
    console.log(`\n🧪 Testing ${endpoint.name}: ${endpoint.url}`);
    try {
      const response = await axios.get(`${BASE_URL}${endpoint.url}`, { 
        headers,
        timeout: 10000
      });
      console.log(`✅ ${endpoint.name} SUCCESS:`, {
        status: response.status,
        dataLength: Array.isArray(response.data) ? response.data.length : 'not array',
        data: response.data
      });
    } catch (error) {
      console.log(`❌ ${endpoint.name} FAILED:`, {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        data: error.response?.data,
        headers: error.response?.headers
      });
    }
  }

  // Test JWT token details
  console.log('\n🔍 JWT Token Analysis:');
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(TEST_TOKEN);
    console.log('JWT Payload:', decoded);
    console.log('Current time:', Math.floor(Date.now() / 1000));
    console.log('Token expires at:', decoded.exp);
    console.log('Token expired:', Math.floor(Date.now() / 1000) > decoded.exp);
  } catch (error) {
    console.log('JWT decode error:', error.message);
  }
}

testDetailed();
