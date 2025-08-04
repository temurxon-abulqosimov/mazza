# Admin Panel Setup Guide

## Getting Your Chat ID

To get your Telegram Chat ID, follow these steps:

1. **Start a conversation with your bot**
2. **Send the command**: `/chatid`
3. **The bot will reply with your chat information**, including:
   - Chat ID (this is what you need)
   - Chat Type
   - Your Telegram User ID
   - Username and other details

## Environment Variables Setup

Add these variables to your `.env` file:

```env
# Admin Configuration
ADMIN_TELEGRAM_ID=your_telegram_user_id_here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password_here
```

## Admin Panel Features

### Authentication
- **Password Protection**: Admin panel requires username/password authentication
- **Session Management**: Authenticated sessions persist until logout
- **Secure Storage**: Passwords are hashed using bcrypt

### Commands
- `/admin` - Access admin panel (requires authentication)
- `/chatid` - Get chat information (useful for setup)

### Admin Actions
- **View All Sellers** - Complete list with pagination
- **Pending Sellers** - Sellers awaiting approval
- **Approved Sellers** - Active sellers
- **Rejected Sellers** - Declined applications
- **Blocked Sellers** - Suspended accounts
- **Statistics** - System-wide statistics
- **Search** - Search sellers by name, phone, or business type

### Seller Management
- ✅ **Approve** - Change status to approved
- ❌ **Reject** - Change status to rejected
- 🚫 **Block** - Change status to blocked
- 📞 **Contact** - View seller contact information
- 📋 **Products** - View seller's products
- 📊 **Rating** - View seller's ratings

## Database Setup

The admin system automatically creates the admin account from environment variables on first run. The admin entity includes:

- `telegramId` - Your Telegram user ID
- `username` - Admin username
- `password` - Hashed password
- `isActive` - Account status
- `lastLoginAt` - Last login timestamp

## Security Notes

1. **Change Default Password**: Always change the default password in production
2. **Secure Environment**: Keep your `.env` file secure and never commit it to version control
3. **Regular Updates**: Update admin credentials regularly
4. **Access Control**: Only share admin credentials with trusted personnel

## Troubleshooting

### "Not Authorized" Error
- Ensure your `ADMIN_TELEGRAM_ID` matches your actual Telegram user ID
- Check that the admin account was created in the database

### Authentication Failed
- Verify username and password match your environment variables
- Check that the admin account is active in the database

### Database Issues
- Ensure the admin entity is properly migrated
- Check database connection and permissions 