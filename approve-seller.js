// Script to approve seller for testing
const axios = require('axios');

const BASE_URL = 'https://ulgur-backend-production-53b2.up.railway.app';

async function approveSeller() {
  try {
    console.log('🔧 Approving seller with telegramId: 5543081353');
    
    // First, let's check the current seller status
    const checkResponse = await axios.get(`${BASE_URL}/webapp/sellers/admin/telegram/5543081353`);
    console.log('📋 Current seller status:', checkResponse.data);
    
    // Update seller status to APPROVED
    const updateResponse = await axios.put(`${BASE_URL}/webapp/sellers/3/status`, {
      status: 'APPROVED'
    });
    
    console.log('✅ Seller approved successfully:', updateResponse.data);
    
  } catch (error) {
    console.error('❌ Error approving seller:', error.response?.data || error.message);
  }
}

approveSeller();
