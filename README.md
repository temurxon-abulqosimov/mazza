# Ulgurib Qol - Telegram Bot

A comprehensive Telegram bot for connecting users with local businesses offering discounted products (similar to "Too Good To Go"). The bot supports both Uzbek and Russian languages and provides a complete marketplace experience.

## Features

### For Users
- 🔍 Find nearby stores with discounted products
- 📍 Location-based store discovery
- 💳 Multiple payment methods (Cash, Card, Click, Payme)
- 📱 Easy contact sharing and location sharing
- 📋 Order management with unique codes
- ⭐ Rate products and stores
- 🌐 Bilingual support (Uzbek/Russian)

### For Sellers
- 🏪 Business registration and verification
- 📦 Product listing with pricing and availability
- 📊 Order management
- 📈 Rating and review system
- 🕐 Business hours management
- 📍 Location-based visibility

### Technical Features
- 🏗️ Built with NestJS and TypeORM
- 🗄️ PostgreSQL database with PostGIS support
- 🔐 Secure authentication and validation
- 📱 Telegram Bot API integration
- 🎯 Scene-based conversation flow
- 🌍 Internationalization support

## Project Structure

```
src/
├── main.ts                 # Application entry point
├── app.module.ts          # Root module
├── config/               # Configuration files
├── common/               # Shared utilities and types
│   ├── enums/           # Enum definitions
│   ├── dtos/            # Data transfer objects
│   ├── interfaces/      # TypeScript interfaces
│   └── utils/           # Utility functions
├── users/               # User management
├── sellers/             # Seller management
├── products/            # Product management
├── orders/              # Order management
├── ratings/             # Rating system
└── bot/                 # Telegram bot logic
    ├── scenes/          # Conversation scenes
    ├── providers/       # Service providers
    └── middleware/      # Bot middleware
```

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- PostGIS extension (for location queries)
- Telegram Bot Token

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/temurxon-abulqosimov/ulgurib_qol.git
   cd ulgurib_qol
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=your_password
   DB_DATABASE=ulgur_bot
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   NODE_ENV=development
   ```

4. **Set up PostgreSQL database**
   ```sql
   CREATE DATABASE ulgur_bot;
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```

5. **Run database migrations**
   ```bash
   npm run start:dev
   ```
   The application will automatically create tables on first run.

## Usage

### Development
```bash
npm run start:dev
```

### Production
```bash
npm run build
npm run start:prod
```

### Testing
```bash
npm run test
npm run test:e2e
```

## Bot Commands

- `/start` - Start the bot and show main menu
- `/language` - Change language (Uzbek/Russian)
- `/supportchat` - Get support contact
- `/suggestions` - Submit suggestions
- `/complains` - Submit complaints

## API Endpoints

### Users
- `POST /users` - Create user
- `GET /users` - Get all users
- `GET /users/:id` - Get user by ID
- `GET /users/telegram/:telegramId` - Get user by Telegram ID
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user

### Sellers
- `POST /sellers` - Create seller
- `GET /sellers` - Get all sellers
- `GET /sellers/:id` - Get seller by ID
- `GET /sellers/telegram/:telegramId` - Get seller by Telegram ID
- `GET /sellers/approved` - Get approved sellers
- `GET /sellers/nearby/:lat/:lon` - Find nearby sellers
- `PUT /sellers/:id` - Update seller
- `DELETE /sellers/:id` - Delete seller

### Products
- `POST /products` - Create product
- `GET /products` - Get all products
- `GET /products/active` - Get active products
- `GET /products/:id` - Get product by ID
- `GET /products/seller/:sellerId` - Get products by seller
- `PUT /products/:id` - Update product
- `DELETE /products/:id` - Delete product

### Orders
- `POST /orders` - Create order
- `GET /orders` - Get all orders
- `GET /orders/:id` - Get order by ID
- `GET /orders/user/:userId` - Get orders by user
- `GET /orders/seller/:sellerId` - Get orders by seller
- `GET /orders/code/:code` - Get order by code
- `PUT /orders/:id/status` - Update order status
- `DELETE /orders/:id` - Delete order

### Ratings
- `POST /ratings` - Create rating
- `GET /ratings` - Get all ratings
- `GET /ratings/:id` - Get rating by ID
- `GET /ratings/product/:productId` - Get ratings by product
- `GET /ratings/user/:userId` - Get ratings by user
- `GET /ratings/product/:productId/average` - Get average rating by product
- `GET /ratings/seller/:sellerId/average` - Get average rating by seller
- `PUT /ratings/:id` - Update rating
- `DELETE /ratings/:id` - Delete rating

## Database Schema

### Users
- `id` - Primary key
- `telegramId` - Telegram user ID (unique)
- `phoneNumber` - Phone number
- `paymentMethod` - Payment method enum
- `language` - Language preference
- `location` - Geographic location (PostGIS point)
- `createdAt` - Creation timestamp
- `updatedAt` - Update timestamp

### Sellers
- `id` - Primary key
- `telegramId` - Telegram user ID (unique)
- `phoneNumber` - Phone number
- `businessName` - Business name
- `businessType` - Business type enum
- `location` - Geographic location (PostGIS point)
- `opensAt` - Opening time (minutes from midnight)
- `closesAt` - Closing time (minutes from midnight)
- `status` - Seller status enum
- `language` - Language preference
- `createdAt` - Creation timestamp
- `updatedAt` - Update timestamp

### Products
- `id` - Primary key
- `price` - Current price
- `originalPrice` - Original price (optional)
- `description` - Product description (optional)
- `availableUntil` - Availability deadline
- `isActive` - Active status
- `sellerId` - Foreign key to seller
- `createdAt` - Creation timestamp
- `updatedAt` - Update timestamp

### Orders
- `id` - Primary key
- `code` - Unique order code
- `status` - Order status enum
- `totalPrice` - Total price
- `userId` - Foreign key to user
- `productId` - Foreign key to product
- `createdAt` - Creation timestamp
- `updatedAt` - Update timestamp

### Ratings
- `id` - Primary key
- `rating` - Rating value (1-5)
- `comment` - Rating comment (optional)
- `userId` - Foreign key to user
- `productId` - Foreign key to product
- `createdAt` - Creation timestamp
- `updatedAt` - Update timestamp

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, contact: @temurxon_admin
