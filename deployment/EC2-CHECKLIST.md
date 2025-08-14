# ✅ EC2 Direct Deployment Checklist

## 🎯 Phase 1: AWS Console Setup (5-10 minutes)

### Step 1: Create IAM Role
- [ ] Go to **IAM** → **Roles** → **Create Role**
- [ ] Choose **AWS Service** → **EC2**
- [ ] Attach policies:
  - [ ] `AmazonBedrockFullAccess`
  - [ ] `AmazonSSMReadOnlyAccess`
- [ ] Name role: `UniconEC2Role`

### Step 2: Launch EC2 Instance
- [ ] Go to **EC2** → **Launch Instance**
- [ ] Name: `uniicon-ai-server`
- [ ] AMI: **Amazon Linux 2023** (recommended)
- [ ] Instance type: **t3.medium** (minimum)
- [ ] Key pair: Create new or select existing
- [ ] Security group: Create new with rules:
  - [ ] SSH (22) - Your IP
  - [ ] Custom TCP (3000) - 0.0.0.0/0
  - [ ] HTTP (80) - 0.0.0.0/0
  - [ ] HTTPS (443) - 0.0.0.0/0
- [ ] Storage: 20 GB minimum
- [ ] IAM role: `UniconEC2Role`
- [ ] Launch instance

### Step 3: Note Instance Details
- [ ] Public IP: `________________`
- [ ] Key pair file: `________________`
- [ ] Security group ID: `________________`

## 🖥️ Phase 2: Connect to EC2 (2 minutes)

### Option A: EC2 Instance Connect (Easiest)
- [ ] Go to **EC2 Console** → **Instances**
- [ ] Select your instance → **Connect**
- [ ] Choose **EC2 Instance Connect**
- [ ] Click **Connect** (opens web terminal)

### Option B: SSH (Traditional)
- [ ] Download key pair file (.pem)
- [ ] Set permissions: `chmod 400 your-key.pem`
- [ ] Connect: `ssh -i your-key.pem ec2-user@YOUR_PUBLIC_IP`

## 🛠️ Phase 3: Install Software (10-15 minutes)

### Automatic Installation (Recommended)
```bash
# Run the installation script
curl -sSL https://raw.githubusercontent.com/DhanushKenkiri/Uniicon-AdobeAddon/main/deployment/install-on-ec2.sh | bash
```

### Manual Installation Steps
- [ ] Update system: `sudo dnf update -y`
- [ ] Install Node.js: `curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -`
- [ ] Install Node.js: `sudo dnf install -y nodejs`
- [ ] Install Git: `sudo dnf install -y git`
- [ ] Install PM2: `sudo npm install -g pm2`
- [ ] Clone repo: `git clone https://github.com/DhanushKenkiri/Uniicon-AdobeAddon.git`
- [ ] Install deps: `cd Uniicon-AdobeAddon && npm install`
- [ ] Build app: `npm run build`

## ⚙️ Phase 4: Configuration (5 minutes)

### Create Environment File
- [ ] Edit `.env` file: `nano .env`
- [ ] Add your API keys and agent IDs:

```bash
NODE_ENV=production
PORT=3000
AWS_REGION=ap-south-1
BEDROCK_REGION=us-east-1

# REQUIRED: Your Remove.bg API key
REMOVEBG_API_KEY=your_removebg_key_here

# REQUIRED: Your Bedrock agent IDs
EXTRACT_AGENT_ID=your_extract_agent_id
INTERPRET_AGENT_ID=your_interpret_agent_id
PLANNER_AGENT_ID=your_planner_agent_id
GENERATOR_AGENT_ID=your_generator_agent_id

# Agent aliases (usually TSTALIASID for test)
EXTRACT_AGENT_ALIAS=TSTALIASID
INTERPRET_AGENT_ALIAS=TSTALIASID
PLANNER_AGENT_ALIAS=TSTALIASID
GENERATOR_AGENT_ALIAS=TSTALIASID
```

## 🚀 Phase 5: Start Server (2 minutes)

### Setup System Service
- [ ] Create service: Installation script does this automatically
- [ ] Enable service: `sudo systemctl enable uniicon`
- [ ] Start service: `sudo systemctl start uniicon`
- [ ] Check status: `sudo systemctl status uniicon`

### Test Server
- [ ] Test locally: `curl http://localhost:3000/api/health`
- [ ] Test externally: `curl http://YOUR_PUBLIC_IP:3000/api/health`

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-08-14T...",
  "services": {
    "bedrock": true,
    "removebg": true,
    "agents": {
      "extract": true,
      "interpret": true,
      "planner": true,
      "generator": true
    }
  }
}
```

## 🔧 Phase 6: Update Adobe Express Add-on (5 minutes)

### Update API URL in Add-on
- [ ] Edit your add-on code (locally)
- [ ] Update API base URL to: `http://YOUR_PUBLIC_IP:3000`
- [ ] Rebuild: `npm run build`
- [ ] Package: `npm run package`
- [ ] Upload new `dist.zip` to Adobe Express

## ✅ Verification Checklist

### Server Health
- [ ] Health endpoint returns 200: `curl http://YOUR_PUBLIC_IP:3000/api/health`
- [ ] All services show as `true` in health response
- [ ] Server logs are clean: `sudo journalctl -u uniicon -f`

### AWS Services
- [ ] EC2 can access Bedrock: `aws bedrock list-foundation-models --region us-east-1`
- [ ] IAM role is working: `aws sts get-caller-identity`

### Adobe Express Integration
- [ ] Add-on loads without errors
- [ ] Agent editor opens successfully
- [ ] Icon generation works end-to-end

## 🆘 Troubleshooting

### Common Issues
- [ ] **Port 3000 blocked**: Check security group inbound rules
- [ ] **Bedrock access denied**: Verify IAM role has Bedrock permissions
- [ ] **Service won't start**: Check logs with `sudo journalctl -u uniicon -f`
- [ ] **Out of memory**: Upgrade to t3.large instance type

### Quick Fixes
```bash
# Restart server
sudo systemctl restart uniicon

# View logs
sudo journalctl -u uniicon -f

# Check what's using port 3000
sudo netstat -tulpn | grep 3000

# Test Bedrock connection
aws bedrock list-foundation-models --region us-east-1
```

## 📱 Management Commands

Use the generated management script:
```bash
# Show help
./manage-server.sh

# Common commands
./manage-server.sh start      # Start server
./manage-server.sh stop       # Stop server
./manage-server.sh restart    # Restart server
./manage-server.sh status     # Show status
./manage-server.sh logs       # View real-time logs
./manage-server.sh health     # Test health endpoint
./manage-server.sh update     # Update code and restart
```

---

## 🎉 Success Criteria

✅ **Your deployment is successful when:**
- Health endpoint returns healthy status
- Adobe Express add-on can connect to server
- Icon generation pipeline works end-to-end
- Server automatically starts on EC2 reboot

**Total estimated time: 20-30 minutes**
