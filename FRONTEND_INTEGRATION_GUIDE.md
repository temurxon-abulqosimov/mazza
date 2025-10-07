# Frontend Integration Guide for Product Creation

## 🔧 Product Creation API

### **Endpoint:** `POST /webapp/products`

### **Authentication Required:** ✅ Yes (Bearer Token)

### **Headers:**
```
Authorization: Bearer <JWT_TOKEN_FROM_LOGIN>
Content-Type: application/json
```

### **Request Body Format:**
```json
{
  "name": "Product Name",           // REQUIRED: string, max 255 chars
  "price": 25000,                  // REQUIRED: number, min 0, max 1,000,000,000
  "originalPrice": 30000,          // OPTIONAL: number, min 0, max 1,000,000,000
  "description": "Product description", // OPTIONAL: string, max 1000 chars
  "availableUntil": "2024-01-15T22:00:00.000Z", // REQUIRED: ISO date string
  "code": "PROD001",               // OPTIONAL: string, exactly 6 chars
  "isActive": true,                // OPTIONAL: boolean, default true
  "quantity": 50,                  // OPTIONAL: number, min 1, max 10,000, default 1
  "category": "other"              // OPTIONAL: enum, default "other"
}
```

### **Valid Categories:**
- `bread_bakery`
- `pastry` 
- `main_dishes`
- `desserts`
- `beverages`
- `other`

## 🔄 Complete Flow

### **Step 1: Login**
```javascript
const loginResponse = await fetch('/webapp/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    telegramId: '5543081353',
    role: 'SELLER'
  })
});

const { access_token } = await loginResponse.json();
```

### **Step 2: Create Product**
```javascript
const productData = {
  name: 'Fresh Pizza Margherita',
  price: 25000,
  originalPrice: 30000,
  description: 'Delicious pizza with fresh tomatoes and mozzarella',
  availableUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
  isActive: true,
  quantity: 50
};

const productResponse = await fetch('/webapp/products', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(productData)
});

const product = await productResponse.json();
```

## ❌ Common Issues

### **1. Missing Authorization Header**
```javascript
// ❌ WRONG - Missing Authorization header
fetch('/webapp/products', {
  method: 'POST',
  body: JSON.stringify(productData)
});

// ✅ CORRECT - Include Authorization header
fetch('/webapp/products', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(productData)
});
```

### **2. Wrong Date Format**
```javascript
// ❌ WRONG - Invalid date format
availableUntil: "2024-01-15"

// ✅ CORRECT - ISO date string
availableUntil: "2024-01-15T22:00:00.000Z"
```

### **3. Missing Required Fields**
```javascript
// ❌ WRONG - Missing required fields
{
  "name": "Product"
  // Missing: price, availableUntil
}

// ✅ CORRECT - Include all required fields
{
  "name": "Product",
  "price": 10000,
  "availableUntil": "2024-01-15T22:00:00.000Z"
}
```

## 🧪 Testing

Use the provided test script:
```bash
node test-product-creation.js
```

## 📋 Response Format

### **Success Response:**
```json
{
  "id": 123,
  "name": "Fresh Pizza Margherita",
  "price": 25000,
  "originalPrice": 30000,
  "description": "Delicious pizza with fresh tomatoes and mozzarella",
  "availableUntil": "2024-01-15T22:00:00.000Z",
  "code": "ABC123",
  "isActive": true,
  "quantity": 50,
  "category": "other",
  "seller": {
    "id": 3,
    "businessName": "Business_5543081353"
  },
  "createdAt": "2024-01-10T09:00:00.000Z",
  "updatedAt": "2024-01-10T09:00:00.000Z"
}
```

### **Error Response:**
```json
{
  "statusCode": 400,
  "message": "Product name is required",
  "error": "Bad Request"
}
```
