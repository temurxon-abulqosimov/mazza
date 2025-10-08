// Script to add sample images to products
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/ulgur_db'
});

const sampleImages = {
  'bread_bakery': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop',
  'pastry': 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&h=300&fit=crop',
  'main_dishes': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop',
  'desserts': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=300&fit=crop',
  'beverages': 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=300&fit=crop',
  'other': 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop'
};

async function addSampleImages() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Get all products without images
    const result = await client.query(`
      SELECT id, category, name 
      FROM product 
      WHERE image_url IS NULL OR image_url = ''
    `);

    console.log(`Found ${result.rows.length} products without images`);

    for (const product of result.rows) {
      const imageUrl = sampleImages[product.category] || sampleImages['other'];
      
      await client.query(`
        UPDATE product 
        SET image_url = $1 
        WHERE id = $2
      `, [imageUrl, product.id]);

      console.log(`Updated product ${product.id} (${product.name}) with image`);
    }

    console.log('Sample images added successfully!');
  } catch (error) {
    console.error('Error adding sample images:', error);
  } finally {
    await client.end();
  }
}

addSampleImages();
