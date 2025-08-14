#!/bin/bash

# Configuration script to update Adobe Express add-on with EC2 server IP
# Run this script after getting your EC2 public IP

echo "=== Uniicon Add-on Configuration ===" 
echo ""

# Get EC2 public IP
echo "Getting EC2 public IP..."
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

if [ -n "$PUBLIC_IP" ]; then
    echo "✅ Found EC2 Public IP: $PUBLIC_IP"
    echo ""
    
    # Update the add-on configuration
    echo "Updating add-on configuration..."
    
    # Replace the placeholder in index.js
    sed -i "s/YOUR_EC2_PUBLIC_IP_HERE/$PUBLIC_IP/g" src/index.js
    
    echo "✅ Updated src/index.js with IP: $PUBLIC_IP"
    echo ""
    
    # Test server accessibility
    echo "Testing server accessibility..."
    if curl -f "http://$PUBLIC_IP:3000/api/health" > /dev/null 2>&1; then
        echo "✅ Server is accessible from outside!"
    else
        echo "⚠️  Server is not accessible. Check security group settings."
        echo "   Make sure port 3000 is open to 0.0.0.0/0"
    fi
    
    echo ""
    echo "🎯 Next steps:"
    echo "1. Run 'npm run build' to rebuild the add-on"
    echo "2. Run 'npm run package' to create new dist.zip"
    echo "3. Upload the new dist.zip to Adobe Express"
    echo ""
    echo "Your add-on will now connect to: http://$PUBLIC_IP:3000"
    
else
    echo "❌ Could not get EC2 public IP. Are you running this on EC2?"
    echo ""
    echo "Manual setup:"
    echo "1. Get your EC2 public IP from AWS Console"
    echo "2. Edit src/index.js and replace 'YOUR_EC2_PUBLIC_IP_HERE' with your IP"
    echo "3. Rebuild and package the add-on"
fi
