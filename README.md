# Mazza - Telegram Mini App for Food Saving

A comprehensive Telegram bot and mini app that connects users with local businesses offering discounted surplus food products. Built with NestJS backend and React frontend.

##  Features

### For Users
-  Browse nearby stores with discounted products
-  Location-based store discovery with distance calculation
-  Multiple payment methods (Cash, Card, Click, Payme)
-  Easy contact sharing and location sharing
-  Order management with unique codes
-  Rate products and stores
-  Bilingual support (Uzbek/Russian)
-  Beautiful Telegram Mini App interface

### For Sellers
-  Business registration and verification
-  Product listing with pricing and availability
-  Order management and statistics
-  Rating and review system
-  Business hours management
-  Location-based visibility
-  Web interface for product management

### For Admins
-  User and seller management
-  Advanced statistics and analytics
-  Notification system
-  Broadcast messages
-  Seller approval/rejection system

##  Architecture

### Backend (NestJS)
- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with PostGIS for location data
- **ORM**: TypeORM
- **Authentication**: Telegram WebApp authentication
- **API**: RESTful API with CORS support

### Frontend (React)
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **Telegram Integration**: Telegram WebApp SDK
- **Routing**: React Router
- **HTTP Client**: Axios

##  Project Structure

```
ulgurib_qol/
 src/                          # Backend source code
    admin/                    # Admin management
    bot/                      # Telegram bot logic
    common/                   # Shared utilities
       guards/              # Authentication guards
       enums/               # Enum definitions
       utils/               # Utility functions
    orders/                   # Order management
    products/                 # Product management
    ratings/                  # Rating system
    sellers/                  # Seller management
    users/                    # User management
    webapp/                   # Web app API controllers
    config/                   # Configuration files
 mazza-frontend/               # React frontend
    src/
       components/          # React components
       pages/               # Page components
       services/            # API services
       types/               # TypeScript types
       contexts/            # React contexts
    public/                   # Static files
 README.md
```

##  Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- Telegram Bot Token

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ulgurib_qol
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```env
   # Database
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=your_username
   DB_PASSWORD=your_password
   DB_NAME=mazza_db

   # Telegram Bot
   BOT_TOKEN=your_bot_token
   USE_WEBHOOK=false
   WEBHOOK_URL=https://your-domain.com
   WEBHOOK_SECRET=your_webhook_secret

   # Admin
   ADMIN_TELEGRAM_ID=your_telegram_id
   ADMIN_USERNAME=your_username
   ADMIN_PASSWORD=your_password

   # Web App
   WEBAPP_URL=https://your-frontend-domain.com
   ```

4. **Database Setup**
   ```bash
   # Create PostgreSQL database
   createdb mazza_db
   ```

5. **Run the application**
   ```bash
   npm run start:dev
   ```

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd mazza-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the frontend directory:
   ```env
   REACT_APP_API_URL=http://localhost:3000
   ```

4. **Run the development server**
   ```bash
   npm start
   ```

##  API Endpoints

### Web App API (Protected by Telegram WebApp Auth)

#### Products
- `GET /webapp/products` - Get all products
- `GET /webapp/products/nearby?lat={lat}&lng={lng}` - Get nearby products
- `GET /webapp/products/:id` - Get product by ID

#### Sellers
- `GET /webapp/sellers` - Get all approved sellers
- `GET /webapp/sellers/nearby?lat={lat}&lng={lng}` - Get nearby sellers
- `GET /webapp/sellers/:id` - Get seller by ID

#### Users
- `POST /webapp/users` - Create user
- `GET /webapp/users/telegram/:telegramId` - Get user by Telegram ID
- `PATCH /webapp/users/:id` - Update user

#### Orders
- `POST /webapp/orders` - Create order
- `GET /webapp/orders/user/:userId` - Get user orders
- `GET /webapp/orders/seller/:sellerId` - Get seller orders
- `PATCH /webapp/orders/:id/status` - Update order status

#### Ratings
- `POST /webapp/ratings` - Create rating
- `GET /webapp/ratings/product/:productId` - Get product ratings
- `GET /webapp/ratings/seller/:sellerId` - Get seller ratings

##  Bot Commands

- `/start` - Start the bot and show main menu
- `/webapp` - Launch the web app
- `/language` - Change language
- `/support` - Contact support
- `/admin` - Admin panel (admin only)

##  Telegram Mini App

The web app provides a modern, mobile-first interface for:
- Browsing products by category
- Finding nearby stores
- Viewing product details
- Placing orders
- Managing user profile
- Seller dashboard

### Key Features
- **Responsive Design**: Optimized for mobile devices
- **Real-time Location**: GPS-based store discovery
- **Category Filtering**: Filter by business type
- **Product Cards**: Rich product information with images
- **Distance Calculation**: Shows distance to stores
- **Order Management**: Track orders and history

##  Security

- **Telegram WebApp Authentication**: Validates initData from Telegram
- **CORS Protection**: Configured for specific origins
- **Input Validation**: Comprehensive validation using class-validator
- **Rate Limiting**: Prevents spam and abuse
- **SQL Injection Protection**: Using TypeORM parameterized queries

##  Internationalization

The application supports multiple languages:
- **Uzbek** (uz) - Default
- **Russian** (ru)

Language can be changed through:
- Bot commands
- Web app settings
- User registration

##  Database Schema

### Core Entities
- **Users**: Customer information and preferences
- **Sellers**: Business information and verification status
- **Products**: Food items with pricing and availability
- **Orders**: Purchase transactions
- **Ratings**: User feedback system

### Key Relationships
- Users can have multiple Orders
- Sellers can have multiple Products
- Products can have multiple Orders and Ratings
- Orders link Users and Products

##  Deployment

### Backend Deployment
1. Set up PostgreSQL database
2. Configure environment variables
3. Deploy to your preferred platform (Heroku, AWS, etc.)
4. Set up webhook for Telegram bot

### Frontend Deployment
1. Build the React app: `npm run build`
2. Deploy to static hosting (Vercel, Netlify, etc.)
3. Update `WEBAPP_URL` in backend environment

### Bot Setup
1. Create bot with @BotFather
2. Set webhook URL
3. Configure bot commands
4. Set up web app URL

##  Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

##  License

This project is licensed under the MIT License.

##  Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

##  Future Enhancements

- [ ] Push notifications
- [ ] Real-time chat
- [ ] Advanced analytics
- [ ] Mobile app (React Native)
- [ ] Payment integration
- [ ] Multi-language support expansion
- [ ] AI-powered recommendations
- [ ] Social features

---

Built with  for reducing food waste and connecting communities.
