# ESCRO Platform - Deployment Guide

Instructions for deploying ESCRO platform to production on gazduire.net.

## 📋 Pre-Deployment Checklist

- [ ] All features tested locally
- [ ] Environment variables configured for production
- [ ] PostgreSQL database backed up
- [ ] Stripe account upgraded to live mode
- [ ] SSL certificates obtained/renewed
- [ ] DNS records prepared
- [ ] Email notifications configured (optional)
- [ ] Admin account created with Claudiu credentials

## 🔄 Deployment Steps

### 1. Backend Deployment

#### Option A: Traditional Hosting (cPanel/Direct Admin)

**1.1 Connect via SSH**
```bash
ssh user@gazduire.net
cd /home/user/public_html  # or preferred directory
```

**1.2 Clone or Upload Code**
```bash
# If using Git
git clone <your-repo> escro-backend
cd escro-backend

# OR upload files manually via FTP/cPanel File Manager
```

**1.3 Install Node Dependencies**
```bash
npm install
```

**1.4 Setup Production Environment**
```bash
# Edit .env for production
nano .env
```

Set production values:
```env
PORT=5000
NODE_ENV=production

# Database (managed or local)
DB_HOST=localhost
DB_PORT=5432
DB_USER=escro_user
DB_PASSWORD=STRONG_PASSWORD_HERE
DB_NAME=escro_platform

# JWT
JWT_SECRET=VERY_LONG_RANDOM_STRING_MIN_32_CHARS
JWT_EXPIRE=7d

# Stripe (LIVE keys, not test!)
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_PUB_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET

# Files
UPLOAD_DIR=/home/user/public_html/uploads
MAX_FILE_SIZE=10485760

# Admin
ADMIN_EMAIL=vladau.claudiu95@gmail.com

# Frontend
FRONTEND_URL=https://escro.gazduire.net
```

**1.5 Initialize Production Database**
```bash
npm run db:init
```

**1.6 Setup Process Manager (PM2)**
```bash
# Install PM2 globally
npm install -g pm2

# Create ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'escro-backend',
    script: './server.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/error.log',
    out_file: './logs/output.log'
  }]
};
EOF

# Create logs directory
mkdir -p logs

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 config to auto-start on reboot
pm2 save
pm2 startup
```

**1.7 Setup Nginx Reverse Proxy**

Ask hosting provider or create:
```bash
# /etc/nginx/sites-available/escro-backend
server {
    listen 5000 ssl;
    server_name api.escro.gazduire.net;

    ssl_certificate /etc/ssl/certs/escro.crt;
    ssl_certificate_key /etc/ssl/private/escro.key;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 2. Frontend Deployment

#### 2.1 Build Frontend
```bash
cd ../escro-frontend  # or wherever frontend code is
npm install
npm run build
```

#### 2.2 Upload Build to Web Root

```bash
# Copy dist/ to public_html
cp -r dist/* /home/user/public_html/escro/

# Or if using separate subdomain
cp -r dist/* /home/user/subdomains/escro/public_html/
```

#### 2.3 Configure Nginx for Frontend

```nginx
# /etc/nginx/sites-available/escro
server {
    listen 443 ssl http2;
    server_name escro.gazduire.net;

    ssl_certificate /etc/ssl/certs/escro.crt;
    ssl_certificate_key /etc/ssl/private/escro.key;

    # React SPA - serve index.html for all routes
    location / {
        root /home/user/public_html/escro;
        try_files $uri $uri/ /index.html;
        
        # Cache busting for assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Proxy API requests to backend
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Security headers
    add_header X-Content-Type-Options "nosniff";
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name escro.gazduire.net;
    return 301 https://$server_name$request_uri;
}
```

**Enable site:**
```bash
# If using Nginx directly
ln -s /etc/nginx/sites-available/escro /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 3. Database Setup

#### Option A: Managed PostgreSQL
Contact gazduire.net support for managed PostgreSQL instance.

#### Option B: Local PostgreSQL on Server
```bash
# Already installed? Check:
psql --version

# Create database
sudo -u postgres createdb escro_platform
sudo -u postgres createuser escro_user
sudo -u postgres psql -c "ALTER USER escro_user WITH PASSWORD 'STRONG_PASSWORD';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE escro_platform TO escro_user;"

# Test connection
psql -h localhost -U escro_user -d escro_platform
```

### 4. Stripe Webhooks

1. Go to https://dashboard.stripe.com/webhooks
2. Add new endpoint:
   - URL: `https://escro.gazduire.net/api/webhooks/stripe`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`
3. Copy webhook secret → Add to `.env` as `STRIPE_WEBHOOK_SECRET`
4. Restart backend: `pm2 restart escro-backend`

### 5. Email Notifications (Optional)

Add to `.env`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=app-specific-password
SMTP_FROM=noreply@escro.gazduire.net
```

Create email service in backend:
```javascript
// backend/services/emailService.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

module.exports = transporter;
```

### 6. Database Backups

**Set up automatic backups:**
```bash
# Create backup script
cat > /home/user/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/user/backups/database"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U escro_user escro_platform > $BACKUP_DIR/escro_$DATE.sql
gzip $BACKUP_DIR/escro_$DATE.sql
# Keep only last 7 days
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete
EOF

chmod +x /home/user/backup-db.sh

# Add to crontab (daily at 2 AM)
# crontab -e
# Add: 0 2 * * * /home/user/backup-db.sh
```

### 7. Monitoring & Logs

**Check backend status:**
```bash
pm2 status
pm2 logs escro-backend

# View logs
tail -f /home/user/public_html/escro-backend/logs/output.log
tail -f /home/user/public_html/escro-backend/logs/error.log
```

**Monitor system resources:**
```bash
pm2 monit
```

### 8. SSL Certificate

Use Let's Encrypt (free):
```bash
# If using Certbot
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d escro.gazduire.net -d api.escro.gazduire.net

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## 🧪 Post-Deployment Testing

### 1. Check Backend Health
```bash
curl https://escro.gazduire.net/api/health
# Should return: {"status":"ok"}
```

### 2. Test Frontend
- Open `https://escro.gazduire.net` in browser
- Should load without errors
- Check browser console (F12) for any errors

### 3. Test Authentication
```bash
curl -X POST https://escro.gazduire.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@escro.ro",
    "password": "admin123"
  }'
# Should return JWT token
```

### 4. Test Full Flow
1. Register test user (expert)
2. Login as admin and verify expert
3. Create project as client
4. Assign to expert
5. Upload deliverable
6. Approve milestone
7. Verify payment processing

---

## 🔐 Security Checklist

- [ ] All secrets in `.env` (not committed to Git)
- [ ] HTTPS/SSL enabled on all endpoints
- [ ] CORS configured correctly (frontend URL only)
- [ ] Rate limiting enabled
- [ ] SQL injection protection (use parameterized queries)
- [ ] File upload validation (type, size, malware scan)
- [ ] Password hashing with bcrypt
- [ ] JWT token expiration set
- [ ] Admin endpoints require auth
- [ ] Firewall rules restrict direct database access
- [ ] Regular security updates applied
- [ ] Logs monitored for suspicious activity

---

## 📊 Monitoring Services

Recommended tools:
- **Error Tracking:** Sentry.io (free tier available)
- **Uptime Monitoring:** Uptime Robot (free tier)
- **Log Management:** Loggly or Datadog
- **Performance:** New Relic or Datadog

Setup Sentry:
```bash
npm install --save @sentry/node

# Add to server.js
const Sentry = require('@sentry/node');
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: 'production'
});
```

---

## 🔧 Troubleshooting

### Backend not responding
```bash
# Check if running
pm2 status

# Restart
pm2 restart escro-backend

# Check logs
pm2 logs escro-backend
```

### Frontend shows blank page
- Check browser console for errors
- Verify API_URL matches backend URL in frontend
- Check Nginx configuration for index.html fallback

### Database connection error
```bash
# Test connection
psql -h localhost -U escro_user -d escro_platform

# Check credentials in .env
cat .env | grep DB_
```

### SSL certificate errors
```bash
# Verify certificate
openssl x509 -in /etc/ssl/certs/escro.crt -text -noout

# Renew if needed
certbot renew --force-renewal
```

---

## 🚀 Scaling Notes

For high traffic:

1. **Use CDN** for frontend assets (Cloudflare)
2. **Database replication** for read scaling
3. **Redis cache** for session/auth tokens
4. **Load balancer** for multiple backend instances
5. **Docker containers** for easy deployment/scaling

---

## 📞 Support

**Gazduire.net Support:**
- Email: support@gazduire.net
- Phone: +40...

**Stripe Support:**
- Dashboard: https://dashboard.stripe.com
- Email: support@stripe.com

**Node.js Issues:**
- Docs: https://nodejs.org/docs/
- NPM: https://www.npmjs.com/

---

**Last Updated:** February 7, 2026
**Platform:** ESCRO
**Version:** 1.0.0 (Production Ready)
