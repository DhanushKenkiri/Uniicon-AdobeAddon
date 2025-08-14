#!/bin/bash

# Uniicon AI Server - EC2 Direct Installation Script
# Run this script on your EC2 instance after connecting via SSH

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

echo -e "${BLUE}"
echo "=================================================="
echo "    Uniicon AI Server - EC2 Installation"
echo "=================================================="
echo -e "${NC}"

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    VER=$VERSION_ID
else
    log_error "Cannot detect OS version"
    exit 1
fi

log_info "Detected OS: $OS $VER"

# Step 1: Update system
log_step "1. Updating system packages..."
if [[ "$OS" == *"Amazon Linux"* ]]; then
    sudo dnf update -y
elif [[ "$OS" == *"Ubuntu"* ]]; then
    sudo apt update && sudo apt upgrade -y
else
    log_error "Unsupported OS: $OS"
    exit 1
fi

# Step 2: Install Node.js
log_step "2. Installing Node.js 18..."
if [[ "$OS" == *"Amazon Linux"* ]]; then
    curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
    sudo dnf install -y nodejs
elif [[ "$OS" == *"Ubuntu"* ]]; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Verify Node.js installation
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
log_info "Node.js version: $NODE_VERSION"
log_info "NPM version: $NPM_VERSION"

# Step 3: Install Git
log_step "3. Installing Git..."
if [[ "$OS" == *"Amazon Linux"* ]]; then
    sudo dnf install -y git
elif [[ "$OS" == *"Ubuntu"* ]]; then
    sudo apt install -y git
fi

# Step 4: Install AWS CLI (if not present)
log_step "4. Installing AWS CLI..."
if ! command -v aws &> /dev/null; then
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip awscliv2.zip
    sudo ./aws/install
    rm -rf aws awscliv2.zip
fi

# Step 5: Install PM2 for process management
log_step "5. Installing PM2..."
sudo npm install -g pm2

# Step 6: Clone repository
log_step "6. Cloning Uniicon repository..."
if [ -d "Uniicon-AdobeAddon" ]; then
    log_warn "Repository already exists. Updating..."
    cd Uniicon-AdobeAddon
    git pull
else
    git clone https://github.com/DhanushKenkiri/Uniicon-AdobeAddon.git
    cd Uniicon-AdobeAddon
fi

# Step 7: Install dependencies
log_step "7. Installing Node.js dependencies..."
npm install

# Step 8: Build application
log_step "8. Building application..."
npm run build

# Step 9: Create environment file template
log_step "9. Creating environment configuration..."
cat > .env << EOF
NODE_ENV=production
PORT=3000

# AWS Configuration (automatically uses EC2 IAM role)
AWS_REGION=ap-south-1
BEDROCK_REGION=us-east-1

# Remove.bg API Key (REQUIRED - replace with your key)
REMOVEBG_API_KEY=YOUR_REMOVEBG_API_KEY_HERE

# Bedrock Agent IDs (REQUIRED - replace with your agent IDs)
EXTRACT_AGENT_ID=YOUR_EXTRACT_AGENT_ID
INTERPRET_AGENT_ID=YOUR_INTERPRET_AGENT_ID
PLANNER_AGENT_ID=YOUR_PLANNER_AGENT_ID
GENERATOR_AGENT_ID=YOUR_GENERATOR_AGENT_ID

# Bedrock Agent Aliases
EXTRACT_AGENT_ALIAS=TSTALIASID
INTERPRET_AGENT_ALIAS=TSTALIASID
PLANNER_AGENT_ALIAS=TSTALIASID
GENERATOR_AGENT_ALIAS=TSTALIASID
EOF

# Step 10: Create systemd service
log_step "10. Creating systemd service..."
sudo tee /etc/systemd/system/uniicon.service > /dev/null << EOF
[Unit]
Description=Uniicon AI Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PWD
Environment=NODE_ENV=production
ExecStart=/usr/bin/node servers/server.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Step 11: Configure firewall (if ufw is present)
if command -v ufw &> /dev/null; then
    log_step "11. Configuring firewall..."
    sudo ufw allow ssh
    sudo ufw allow 3000
    sudo ufw allow 80
    sudo ufw allow 443
    echo "y" | sudo ufw enable || true
fi

# Test AWS access
log_step "12. Testing AWS access..."
if aws sts get-caller-identity > /dev/null 2>&1; then
    log_info "✅ AWS access working"
else
    log_warn "⚠️ AWS access not configured. Make sure EC2 has IAM role with Bedrock permissions."
fi

# Test Bedrock access
log_step "13. Testing Bedrock access..."
if aws bedrock list-foundation-models --region us-east-1 > /dev/null 2>&1; then
    log_info "✅ Bedrock access working"
else
    log_warn "⚠️ Bedrock access failed. Check IAM permissions."
fi

echo ""
echo -e "${GREEN}=================================================="
echo "    Installation Complete!"
echo "==================================================${NC}"
echo ""
echo "Next steps:"
echo ""
echo -e "${YELLOW}1. Update environment variables:${NC}"
echo "   nano .env"
echo ""
echo -e "${YELLOW}2. Start the service:${NC}"
echo "   sudo systemctl daemon-reload"
echo "   sudo systemctl enable uniicon"
echo "   sudo systemctl start uniicon"
echo ""
echo -e "${YELLOW}3. Check service status:${NC}"
echo "   sudo systemctl status uniicon"
echo ""
echo -e "${YELLOW}4. View logs:${NC}"
echo "   sudo journalctl -u uniicon -f"
echo ""
echo -e "${YELLOW}5. Test health endpoint:${NC}"
echo "   curl http://localhost:3000/api/health"
echo ""
echo -e "${YELLOW}6. Configure security group to allow port 3000${NC}"
echo ""
echo -e "${GREEN}Your server will be available at:${NC}"
echo "   http://YOUR_INSTANCE_PUBLIC_IP:3000"
echo ""

# Create quick management script
cat > manage-server.sh << 'EOF'
#!/bin/bash

case $1 in
    start)
        sudo systemctl start uniicon
        echo "Server started"
        ;;
    stop)
        sudo systemctl stop uniicon
        echo "Server stopped"
        ;;
    restart)
        sudo systemctl restart uniicon
        echo "Server restarted"
        ;;
    status)
        sudo systemctl status uniicon
        ;;
    logs)
        sudo journalctl -u uniicon -f
        ;;
    health)
        curl http://localhost:3000/api/health
        ;;
    update)
        git pull
        npm install
        npm run build
        sudo systemctl restart uniicon
        echo "Server updated and restarted"
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs|health|update}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the server"
        echo "  stop    - Stop the server"
        echo "  restart - Restart the server"
        echo "  status  - Show server status"
        echo "  logs    - Show real-time logs"
        echo "  health  - Test health endpoint"
        echo "  update  - Update code and restart"
        ;;
esac
EOF

chmod +x manage-server.sh

log_info "Created management script: ./manage-server.sh"
log_info "Use './manage-server.sh help' to see available commands"

echo ""
log_info "Installation script completed successfully! 🎉"
