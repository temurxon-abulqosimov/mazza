# Add Sample Images to Products

To add sample images to existing products, run the following script:

```bash
cd ulgurib_qol
node src/scripts/add-sample-images.js
```

This script will:
1. Connect to the database
2. Find all products without images
3. Assign appropriate sample images based on product category
4. Update the database with the image URLs

## Sample Images by Category:
- **bread_bakery**: Fresh bread and bakery items
- **pastry**: Pastries and sweet baked goods  
- **main_dishes**: Main course dishes
- **desserts**: Desserts and sweets
- **beverages**: Drinks and beverages
- **other**: General food items

The script uses high-quality images from Unsplash that are optimized for web display.
