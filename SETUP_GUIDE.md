# 🚀 Complete Setup Guide for Telegram Bot

This guide will walk you through setting up your Telegram bot on AWS EC2 with automatic CI/CD deployment.

## 📋 Prerequisites

- ✅ AWS EC2 instance running Amazon Linux 2 or Ubuntu
- ✅ SSH access to your EC2 instance
- ✅ GitHub repository for your bot
- ✅ Telegram bot token from @BotFather

## 🔧 Step 1: Initial Server Setup

### 1.1 Connect to Your EC2 Instance

```bash
ssh -i your-key.pem ec2-user@your-ec2-ip
```

### 1.2 Run the Setup Script

```bash
# Download and run the setup script
curl -O https://raw.githubusercontent.com/your-username/your-repo/main/deployment-setup.sh
chmod +x deployment-setup.sh
./deployment-setup.sh
```

This script will:
- ✅ Update system packages
- ✅ Install Node.js 18.x
- ✅ Install PM2 process manager
- ✅ Install PostgreSQL
- ✅ Create application directory

## 🔐 Step 2: Environment Variables Setup

### 2.1 Clone Your Repository

```bash
cd /opt/telegram-bot
git clone https://github.com/your-username/your-repo.git .
```

### 2.2 Configure Environment Variables

```bash
# Run the interactive setup script
chmod +x setup-env.sh
./setup-env.sh
```

This script will prompt you for:
- 🔑 **BOT_TOKEN**: Your Telegram bot token from @BotFather
- 🗄️ **Database credentials**: Host, port, username, password, database name
- 🔐 **JWT_SECRET**: Auto-generated secure secret
- 👤 **ADMIN_PASSWORD**: Password for admin panel

### 2.3 Manual Setup (Alternative)

If you prefer manual setup:

```bash
# Copy the template
cp env.production.example .env

# Edit the file
nano .env
```

Fill in your actual values:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=telegram_bot
DB_PASSWORD=your_secure_password
DB_DATABASE=telegram_bot_db

# Telegram Bot Configuration
BOT_TOKEN=your_actual_bot_token_here

# Application Configuration
NODE_ENV=production
PORT=3000

# Security
JWT_SECRET=your_generated_secret_here
ADMIN_PASSWORD=your_admin_password_here
```

## 🗄️ Step 3: Database Setup

### 3.1 Create Database and User

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE telegram_bot_db;
CREATE USER telegram_bot WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE telegram_bot_db TO telegram_bot;
\q
```

### 3.2 Run Database Migrations

```bash
# Navigate to project directory
cd /opt/telegram-bot

# Run migrations
npm run migration:run
```

## 🚀 Step 4: Initial Deployment

### 4.1 Deploy the Application

```bash
# Run the deployment script
chmod +x deploy.sh
./deploy.sh
```

### 4.2 Verify Deployment

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs telegram-bot

# Monitor in real-time
pm2 monit
```

## 🔄 Step 5: Setup CI/CD with GitHub Actions

### 5.1 Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add the following secrets:

| Secret Name | Description | Value |
|-------------|-------------|-------|
| `EC2_HOST` | Your EC2 public IP or domain | `your-ec2-ip` |
| `EC2_USERNAME` | SSH username | `ec2-user` |
| `EC2_SSH_KEY` | Your private SSH key | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `EC2_PORT` | SSH port (optional) | `22` |
| `TELEGRAM_BOT_TOKEN` | Bot token for notifications | `your_bot_token` |
| `TELEGRAM_CHAT_ID` | Your chat ID for notifications | `your_chat_id` |

### 5.2 Get Your Chat ID

To get your Telegram chat ID for notifications:

1. Send a message to your bot
2. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
3. Find your `chat.id` in the response

### 5.3 Test CI/CD

```bash
# Make a small change to your code
echo "# Test deployment" >> README.md

# Commit and push
git add README.md
git commit -m "Test CI/CD deployment"
git push origin main
```

Check the Actions tab in your GitHub repository to see the deployment progress.

## 🔍 Step 6: Verification and Testing

### 6.1 Test Your Bot

1. **Send `/start`** to your bot on Telegram
2. **Test admin commands** if you're an admin
3. **Check logs** for any errors:

```bash
pm2 logs telegram-bot --lines 50
```

### 6.2 Monitor Performance

```bash
# Real-time monitoring
pm2 monit

# Check resource usage
pm2 status
```

## 🔒 Step 7: Security Hardening

### 7.1 Configure Firewall

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (if using nginx)
sudo ufw allow 443/tcp   # HTTPS (if using nginx)
sudo ufw enable
```

### 7.2 Secure Database

```bash
# Edit PostgreSQL configuration
sudo nano /var/lib/pgsql/data/pg_hba.conf

# Add this line to restrict local connections
local   telegram_bot_db    telegram_bot    md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

## 📊 Step 8: Monitoring and Maintenance

### 8.1 Useful Commands

```bash
# View application status
pm2 status

# View logs
pm2 logs telegram-bot

# Restart application
pm2 restart telegram-bot

# Update application
cd /opt/telegram-bot
git pull origin main
./deploy.sh

# Monitor resources
pm2 monit
```

### 8.2 Log Rotation

PM2 automatically handles log rotation, but you can configure it:

```bash
# Edit PM2 configuration
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## 🚨 Troubleshooting

### Common Issues

1. **Bot not responding:**
   ```bash
   pm2 status
   pm2 logs telegram-bot
   ```

2. **Database connection issues:**
   ```bash
   sudo systemctl status postgresql
   sudo -u postgres psql -c "\l"
   ```

3. **Permission issues:**
   ```bash
   sudo chown -R ec2-user:ec2-user /opt/telegram-bot
   ```

4. **Port conflicts:**
   ```bash
   sudo netstat -tlnp | grep :3000
   ```

### Getting Help

- 📋 Check logs: `pm2 logs telegram-bot`
- 🔍 Monitor resources: `pm2 monit`
- 📊 Check status: `pm2 status`
- 🌐 GitHub Actions: Check the Actions tab in your repository

## 🎉 Success!

Your Telegram bot is now:
- ✅ Running on AWS EC2
- ✅ Automatically deployed via GitHub Actions
- ✅ Monitored with PM2
- ✅ Secured with environment variables
- ✅ Ready for production use!

## 📈 Next Steps

1. **Set up SSL/TLS** for HTTPS
2. **Configure backups** for your database
3. **Set up monitoring** with CloudWatch
4. **Scale horizontally** if needed
5. **Set up alerts** for downtime

---

**Need help?** Check the logs first, then refer to the troubleshooting section above. 