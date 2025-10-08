// Script to add sample products with images
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/ulgur_db'
});

const sampleProducts = [
  {
    name: 'Non va pishiriq',
    description: 'Yangi pishirilgan non va pishiriqlar',
    price: 15000,
    originalPrice: 20000,
    category: 'bread_bakery',
    quantity: 10,
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop'
  },
  {
    name: 'Shirinliklar',
    description: 'Turli xil shirinliklar va desertlar',
    price: 25000,
    originalPrice: 35000,
    category: 'desserts',
    quantity: 5,
    imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=300&fit=crop'
  },
  {
    name: 'Asosiy taomlar',
    description: 'Mazali asosiy taomlar',
    price: 45000,
    originalPrice: 60000,
    category: 'main_dishes',
    quantity: 8,
    imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop'
  },
  {
    name: 'Ichimliklar',
    description: 'Sovuq va issiq ichimliklar',
    price: 8000,
    originalPrice: 12000,
    category: 'beverages',
    quantity: 15,
    imageUrl: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=300&fit=crop'
  },
  {
    name: 'Pishiriqlar',
    description: 'Yangi pishirilgan pishiriqlar',
    price: 18000,
    originalPrice: 25000,
    category: 'pastry',
    quantity: 12,
    imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&h=300&fit=crop'
  }
];

async function seedSampleProducts() {
  try {
    await client.connect();
    console.log('Connected to database');

    // First, get a seller ID to assign products to
    const sellerResult = await client.query(`
      SELECT id FROM seller LIMIT 1
    `);

    if (sellerResult.rows.length === 0) {
      console.log('No sellers found. Please create a seller first.');
      return;
    }

    const sellerId = sellerResult.rows[0].id;
    console.log(`Using seller ID: ${sellerId}`);

    // Insert sample products
    for (const product of sampleProducts) {
      const productCode = Math.random().toString(36).substr(2, 6).toUpperCase();
      
      await client.query(`
        INSERT INTO product (
          name, description, price, original_price, category, quantity, 
          image_url, code, is_active, seller_id, created_at, updated_at,
          available_until
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW(), NOW() + INTERVAL '7 days')
      `, [
        product.name,
        product.description,
        product.price,
        product.originalPrice,
        product.category,
        product.quantity,
        product.imageUrl,
        productCode,
        true,
        sellerId
      ]);

      console.log(`Added product: ${product.name}`);
    }

    console.log('Sample products added successfully!');
  } catch (error) {
    console.error('Error adding sample products:', error);
  } finally {
    await client.end();
  }
}

seedSampleProducts();
