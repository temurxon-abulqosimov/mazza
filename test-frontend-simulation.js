const axios = require('axios');

// Simulate exactly what the frontend is doing
const BASE_URL = 'https://ulgur-backend-production-53b2.up.railway.app';

async function simulateFrontendCall() {
  console.log('🎭 Simulating frontend API call...');
  
  // Use the exact same token that the frontend is using
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjMsInRlbGVncmFtSWQiOiI1NTQzMDgxMzUzIiwicm9sZSI6IlNFTExFUiIsImlhdCI6MTc1OTg0NzM3OCwiZXhwIjoxNzU5ODUwOTc4fQ.6J6K2RHXqxjs9zgQxMxTBDrLg4rQnW19F3-mporDPSI';
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'x-language': 'uz'
  };

  console.log('📤 Making request to /webapp/products/seller/my');
  console.log('📤 Headers:', headers);
  
  try {
    const response = await axios.get(`${BASE_URL}/webapp/products/seller/my`, { 
      headers,
      timeout: 10000
    });
    
    console.log('✅ SUCCESS!');
    console.log('📥 Response status:', response.status);
    console.log('📥 Response data:', response.data);
    console.log('📥 Product count:', Array.isArray(response.data) ? response.data.length : 'not array');
    
  } catch (error) {
    console.log('❌ FAILED!');
    console.log('📥 Error status:', error.response?.status);
    console.log('📥 Error message:', error.response?.data?.message || error.message);
    console.log('📥 Error data:', error.response?.data);
    console.log('📥 Request headers sent:', error.config?.headers);
  }
}

simulateFrontendCall();
