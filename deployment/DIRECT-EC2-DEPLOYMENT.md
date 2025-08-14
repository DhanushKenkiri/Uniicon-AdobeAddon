# Direct EC2 Deployment Guide for Uniicon AI Server

## 🚀 Step 1: Create EC2 Instance (AWS Console)

### Launch Instance:
1. **Go to AWS Console** → **EC2** → **Launch Instance**
2. **Name:** `uniicon-ai-server`
3. **AMI:** Amazon Linux 2023 (or Ubuntu 22.04 LTS)
4. **Instance Type:** `t3.medium` (or larger for production)
5. **Key Pair:** Create new or use existing
6. **Security Group:** Create new with these rules:
   - **SSH (22)** - Your IP only
   - **HTTP (80)** - 0.0.0.0/0
   - **Custom TCP (3000)** - 0.0.0.0/0 (for API)
   - **HTTPS (443)** - 0.0.0.0/0 (for future SSL)

### Instance Configuration:
- **Storage:** 20 GB gp3 (minimum)
- **Advanced Details → IAM Role:** Create role with Bedrock permissions (see below)

## 🔐 Step 2: Create IAM Role for EC2

### Create IAM Role:
1. **Go to IAM** → **Roles** → **Create Role**
2. **Trusted Entity:** AWS Service → EC2
3. **Permissions:** Attach these policies:
   - `AmazonBedrockFullAccess`
   - `AmazonSSMReadOnlyAccess`
   - Custom policy (see below)

### Custom Policy for EC2 Role:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ssm:GetParameter",
                "ssm:GetParameters", 
                "ssm:GetParametersByPath",
                "bedrock:*",
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": "*"
        }
    ]
}
```

4. **Role Name:** `UniconEC2Role`
5. **Attach to Instance:** When launching or after creation

## 🔑 Step 3: Connect to EC2 Instance

### Using EC2 Instance Connect (Easy):
1. **Go to EC2 Console** → **Instances** → Select your instance
2. **Click "Connect"** → **EC2 Instance Connect**
3. **Click "Connect"** (opens web-based terminal)

### Using SSH (Traditional):
```bash
# Download your key pair file and run:
ssh -i "your-key.pem" ec2-user@YOUR_INSTANCE_PUBLIC_IP
```

## 📦 Step 4: Install Dependencies on EC2

### Amazon Linux 2023:
```bash
# Update system
sudo dnf update -y

# Install Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo dnf install -y nodejs

# Install Git
sudo dnf install -y git

# Install Docker (optional, for containerized deployment)
sudo dnf install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ec2-user
```

### Ubuntu 22.04:
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Git
sudo apt install -y git

# Install Docker (optional)
sudo apt install -y docker.io
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ubuntu
```

## 📁 Step 5: Deploy Application Code

### Clone Repository:
```bash
# Clone your repository
git clone https://github.com/DhanushKenkiri/Uniicon-AdobeAddon.git
cd Uniicon-AdobeAddon

# Install dependencies
npm install
```

### Build Application:
```bash
# Build the add-on files
npm run build

# Test the build
ls -la dist/
```

## ⚙️ Step 6: Configure Environment

### Create Environment File:
```bash
# Create production environment file
cat > .env << EOF
NODE_ENV=production
PORT=3000

# AWS Configuration
AWS_REGION=ap-south-1
BEDROCK_REGION=us-east-1

# These will be automatically picked up from EC2 IAM role
# No need to set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY

# Remove.bg API Key
REMOVEBG_API_KEY=your_removebg_api_key_here

# Bedrock Agent IDs (replace with your actual agent IDs)
EXTRACT_AGENT_ID=your_extract_agent_id
INTERPRET_AGENT_ID=your_interpret_agent_id  
PLANNER_AGENT_ID=your_planner_agent_id
GENERATOR_AGENT_ID=your_generator_agent_id

# Bedrock Agent Aliases
EXTRACT_AGENT_ALIAS=TSTALIASID
INTERPRET_AGENT_ALIAS=TSTALIASID
PLANNER_AGENT_ALIAS=TSTALIASID
GENERATOR_AGENT_ALIAS=TSTALIASID
EOF
```

### Test AWS Access:
```bash
# Test if EC2 can access AWS services
aws sts get-caller-identity
aws bedrock list-foundation-models --region us-east-1
```

## 🚀 Step 7: Start the Server

### Method 1: Direct Node.js (Quick Test):
```bash
# Start server directly
npm run deploy:production

# Or
node servers/server.js
```

### Method 2: Using PM2 (Production):
```bash
# Install PM2 for process management
sudo npm install -g pm2

# Start with PM2
pm2 start servers/server.js --name "uniicon-server"

# Set up auto-restart on boot
pm2 startup
pm2 save
```

### Method 3: Using Docker:
```bash
# Build Docker image
docker build -t uniicon-server .

# Run container
docker run -d \
  --name uniicon-server \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  uniicon-server
```

### Method 4: Using systemd (Most Reliable):
```bash
# Create systemd service file
sudo tee /etc/systemd/system/uniicon.service > /dev/null << EOF
[Unit]
Description=Uniicon AI Server
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/Uniicon-AdobeAddon
Environment=NODE_ENV=production
ExecStart=/usr/bin/node servers/server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable uniicon
sudo systemctl start uniicon

# Check status
sudo systemctl status uniicon
```

## ✅ Step 8: Verify Deployment

### Test Health Endpoint:
```bash
# Test locally on EC2
curl http://localhost:3000/api/health

# Test from outside (replace with your instance's public IP)
curl http://YOUR_INSTANCE_PUBLIC_IP:3000/api/health
```

### Check Logs:
```bash
# PM2 logs
pm2 logs uniicon-server

# systemd logs
sudo journalctl -u uniicon -f

# Docker logs
docker logs uniicon-server
```

## 🔧 Step 9: Configure Reverse Proxy (Optional)

### Install Nginx:
```bash
# Amazon Linux
sudo dnf install -y nginx

# Ubuntu
sudo apt install -y nginx
```

### Configure Nginx:
```bash
sudo tee /etc/nginx/conf.d/uniicon.conf > /dev/null << EOF
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

## 🎯 Step 10: Update Adobe Express Add-on

### Update Add-on Configuration:
In your Adobe Express add-on files, update the API base URL:

```javascript
// In your add-on code, update the server URL
const API_BASE_URL = 'http://YOUR_INSTANCE_PUBLIC_IP:3000';
// Or with Nginx: 'http://YOUR_DOMAIN'
```

### Rebuild and Upload:
```bash
# On your local machine
npm run build
npm run package

# Upload the new dist.zip to Adobe Express
```

## 🔍 Troubleshooting

### Common Issues:
1. **Port 3000 blocked:** Check security group allows inbound traffic on port 3000
2. **Bedrock access denied:** Ensure IAM role has Bedrock permissions
3. **Service won't start:** Check logs with `sudo journalctl -u uniicon -f`
4. **Out of memory:** Upgrade to larger instance type (t3.large)

### Debug Commands:
```bash
# Check if service is running
sudo systemctl status uniicon

# Check what's listening on port 3000
sudo netstat -tulpn | grep 3000

# Check process memory usage
top -p $(pgrep node)

# Test Bedrock connection
aws bedrock list-foundation-models --region us-east-1
```

---

## 🎉 Success!

Your Uniicon AI server should now be running on EC2 and accessible at:
- **API:** `http://YOUR_INSTANCE_PUBLIC_IP:3000`
- **Health Check:** `http://YOUR_INSTANCE_PUBLIC_IP:3000/api/health`

Your Adobe Express add-on can now connect to this server for AI-powered icon generation!
