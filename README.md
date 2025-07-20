# Uniicon AI - Adobe Express Add-on (Deployment Package)

🎨 **AI-Powered 3D Animated Icon Generator for Adobe Express**

## Overview

This is the production-ready deployment package for the Uniicon Adobe Express add-on. It features a revolutionary 4-agent AI system powered by Amazon Bedrock that transforms simple text descriptions into professional 3D animated icons.

## Features

- **Multi-Agent AI Pipeline**: 4 specialized Bedrock agents working in harmony
  - Extract Agent: Understands and processes user requirements
  - Interpret Agent: Converts concepts into visual elements
  - Planner Agent: Designs optimal icon structure and composition
  - Generator Agent: Creates the final high-quality icon
- **Background Removal**: Automatic background removal using Remove.bg API
- **Adobe Integration**: Seamless integration with Adobe Express workflow
- **Real-time Generation**: Fast, efficient icon creation pipeline

## Quick Start

### Prerequisites

- Node.js 18+ 
- Adobe Express Developer Account
- AWS Bedrock Access (with agent IDs configured)
- Remove.bg API Key

### Installation

```bash
# Install dependencies
npm install

# Build the add-on
npm run build

# Start development server
npm run dev

# Start Adobe add-on development
npm run dev:adobe
```

### Environment Setup

1. Copy `.env` file and update with your credentials:
   - AWS Bedrock credentials and agent IDs
   - Remove.bg API key
   - Server configuration

2. Ensure all agent IDs in `.env` match your AWS Bedrock setup

### Building for Production

```bash
# Build optimized version
npm run build

# Package for Adobe marketplace
npm run package
```

## Architecture

```
📁 addon-deployed/
├── � servers/
│   └── �📄 server.js          # Express server with AI pipeline
├── 📁 src/
│   ├── 📄 index.html         # Add-on UI
│   ├── 📄 index.js           # Frontend logic
│   ├── 📄 manifest.json      # Adobe add-on configuration
│   ├── 📁 lib/
│   │   ├── 📄 bedrock.js     # Bedrock agents manager
│   │   └── 📄 secrets.js     # AWS credentials manager
│   └── 📁 utils/
│       ├── 📄 generate.js         # AI icon generation pipeline
│       ├── 📄 content-filter.js   # Input content filtering
│       └── 📄 removebg.js         # Background removal service
├── 📁 public/
│   └── 📁 generated/         # Generated icons storage
└── 📄 package.json           # Dependencies and scripts
```

## API Endpoints

- `POST /api/generate` - Generate icon from text description
- `GET /generated/*` - Serve generated icon files
- `GET /assets/*` - Serve static assets

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **AI**: Amazon Bedrock (Multi-Agent System)
- **Image Processing**: Remove.bg API
- **Integration**: Adobe Add-on SDK

## Development

### Local Development

```bash
# Start development with hot reload
npm run dev:watch

# Test Bedrock connection
npm run test-bedrock

# Check configuration
npm run check-config
```

### Testing

The add-on includes built-in testing for:
- Bedrock agent connectivity
- API endpoint functionality
- Environment configuration validation

## Production Deployment

1. **Environment Configuration**
   - Set `NODE_ENV=production` in `.env`
   - Configure production AWS credentials
   - Update server port if needed

2. **Build and Package**
   ```bash
   npm run build
   npm run package
   ```

3. **Adobe Marketplace Submission**
   - Upload the packaged add-on
   - Complete Adobe review process
   - Launch to users

## Security

- Environment variables are properly secured
- AWS credentials use IAM roles with minimal permissions
- API keys are never exposed to client-side code
- All generated content is sandboxed

## Support

For technical support or questions about the AI pipeline:
- Check environment configuration first
- Verify AWS Bedrock agent permissions
- Test API connectivity using included scripts

## License

This is a proprietary Adobe Express add-on. All rights reserved.

---

🚀 **Ready to revolutionize icon creation with AI?** Start generating professional icons with simple text descriptions!

**Inspired from** [GIthub Repo](https://github.com/DhanushKenkiri/Uniicon)
