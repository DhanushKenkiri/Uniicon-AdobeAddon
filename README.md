# Uniicon AI - Revolutionary Adobe Express Add-on

🚀 **Transform words into stunning 3D animated icons instantly with AI-powered precision**  
🎨 **The world's first multi-agent AI system that creates professional-grade icons directly in Adobe Express**

## ✨ Complete Vision

**Uniicon AI** represents the future of creative content generation, seamlessly bridging the gap between imagination and visual reality. Our cutting-edge Adobe Express add-on harnesses the power of five specialized AI agents working in perfect harmony to transform simple text descriptions into breathtaking 3D animated icons that captivate audiences and elevate your creative projects.

### � What Makes Uniicon Revolutionary

**Intelligent Multi-Agent Architecture**: Unlike traditional icon generators, Uniicon employs a sophisticated 5-agent AI pipeline powered by Amazon Bedrock, where each agent specializes in a critical aspect of icon creation:

- **🔍 Extract Agent**: Analyzes and understands the deepest nuances of your text descriptions, extracting key visual elements, emotional tones, and stylistic requirements
- **🧠 Interpret Agent**: Translates abstract concepts into concrete visual elements, understanding context, metaphors, and cultural references
- **📋 Planner Agent**: Architects the perfect icon composition, considering visual hierarchy, color psychology, and aesthetic balance
- **🎨 Generate Agent**: Creates stunning high-resolution 3D icons with professional lighting, textures, and animations
- **✂️ RemoveBG Agent**: Automatically removes backgrounds and optimizes icons for seamless integration into any design

### 🌟 Transformative User Experience

**Personalized AI Intelligence**: Every user gets their own customized AI experience. Our revolutionary user-specific instruction system allows you to train and personalize each AI agent according to your unique creative style, brand guidelines, and preferences. Your agents learn and evolve with your creative journey, ensuring consistent, on-brand results every time.

**Seamless Adobe Integration**: Designed from the ground up for Adobe Express, Uniicon feels like a native feature. No complicated workflows, no external tools - just pure creative flow within your familiar Adobe environment.

**Real-Time Generation**: Watch your ideas come to life in seconds, not hours. Our optimized AI pipeline delivers professional-quality results faster than traditional design processes.

### 🎪 Creative Possibilities Unleashed

**Infinite Icon Variations**: From minimalist corporate logos to vibrant gaming characters, from elegant e-commerce icons to dynamic social media graphics - Uniicon adapts to any style, theme, or industry requirement.

**Professional Quality Guaranteed**: Every generated icon meets professional design standards with:
- Crystal-clear 4K resolution support
- Optimized file formats for web and print
- Consistent visual quality across all outputs
- Automatic background removal and transparency
- Professional lighting and shadow effects

**Brand Consistency**: Train your personal AI agents to understand your brand voice, color schemes, and design preferences, ensuring every icon perfectly aligns with your visual identity.

### 🚀 Innovation That Scales

**Enterprise-Ready Architecture**: Built on Amazon Bedrock's enterprise-grade infrastructure, Uniicon scales effortlessly from individual creators to large design teams, maintaining consistent performance and reliability.

**Continuous Learning**: Our AI agents continuously improve through advanced machine learning, staying current with design trends and user preferences while maintaining the highest quality standards.

**Future-Proof Design**: Regular updates and new features ensure Uniicon evolves with your creative needs and Adobe's platform enhancements.

### 🌍 Global Creative Impact

Uniicon democratizes professional icon design, making high-quality visual content accessible to creators worldwide - from solo entrepreneurs and small businesses to Fortune 500 companies and creative agencies. Whether you're building the next viral app, launching a global brand, or crafting compelling marketing materials, Uniicon empowers you to create visual content that stands out in today's competitive digital landscape.

**Join the creative revolution. Transform your ideas into iconic visuals. Experience the future of design with Uniicon AI.**

---

## 🔥 Core Features

### 🤖 **Intelligent Multi-Agent AI System**
- **5 Specialized AI Agents**: Each powered by Amazon Bedrock for enterprise-grade performance
- **Collaborative Intelligence**: Agents work together seamlessly for optimal results
- **Continuous Learning**: AI improves with every interaction and user feedback

### 👤 **Personalized User Experience**
- **Custom Agent Training**: Train each AI agent to match your unique creative style
- **User-Specific Instructions**: Personalized AI behavior that evolves with your needs
- **Brand Consistency**: Maintain perfect brand alignment across all generated content
- **Local Storage**: Your preferences persist across sessions automatically

### 🎨 **Professional Quality Output**
- **4K Resolution Support**: Crystal-clear icons for any application
- **Multiple Format Export**: PNG, SVG, and more for maximum compatibility
- **Automatic Background Removal**: Clean, transparent icons ready for immediate use
- **Professional Lighting**: Advanced 3D rendering with realistic shadows and highlights

### ⚡ **Lightning-Fast Performance**
- **Real-Time Generation**: Watch your icons come to life in seconds
- **Optimized Pipeline**: Streamlined AI processing for maximum efficiency
- **Instant Preview**: See results immediately without leaving Adobe Express
- **Batch Processing**: Generate multiple variations simultaneously

### 🔧 **Advanced Customization**
- **Agent Instruction Editor**: Fine-tune AI behavior with intuitive controls
- **Style Consistency**: Maintain visual coherence across all your projects
- **Template System**: Save and reuse successful configurations
- **Export Settings**: Customize output parameters for specific use cases

### 🛡️ **Enterprise-Grade Security**
- **AWS Bedrock Integration**: Bank-level security and compliance
- **Content Filtering**: Automatic screening for inappropriate content
- **Data Privacy**: Your creative data stays secure and private
- **Validation System**: AI-powered instruction validation for optimal results

## Features

- **Multi-Agent AI Pipeline**: 4 specialized Bedrock agents working in harmony
  - Extract Agent: Understands and processes user requirements
  - Interpret Agent: Converts concepts into visual elements
  - Planner Agent: Designs optimal icon structure and composition
  - Generator Agent: Creates the final high-quality icon
- **Background Removal**: Automatic background removal using Remove.bg API
- **Adobe Integration**: Seamless integration with Adobe Express workflow
- **Real-time Generation**: Fast, efficient icon creation pipeline

---

## 🚀 Quick Start Guide

### Prerequisites

- **Node.js 18+** - Latest LTS version recommended
- **Adobe Express Developer Account** - For add-on integration
- **AWS Account with Bedrock Access** - Enterprise AI capabilities
- **Remove.bg API Key** - Professional background removal

### 📦 Installation & Setup

```bash
# Clone and navigate to project
git clone https://github.com/DhanushKenkiri/Uniicon-AdobeAddon.git
cd Uniicon-AdobeAddon

# Install dependencies
npm install

# Build the add-on for production
npm run build

# Start development server
npm run dev

# Launch Adobe Express development mode
npm run dev:adobe
```

### ⚙️ Environment Configuration

1. **Copy and configure environment variables:**
   ```bash
   cp .env.example .env
   ```

2. **Update `.env` with your credentials:**
   - AWS Bedrock credentials and region
   - Individual agent IDs for each AI agent
   - Remove.bg API key for background removal
   - Server configuration settings

3. **Verify agent IDs match your AWS Bedrock setup**

### 🏗️ Building for Production

```bash
# Create optimized production build
npm run build

# Package for Adobe marketplace submission
npm run package

# Run production server
npm start
```

### 🎯 First Use

1. **Open Adobe Express** and navigate to Add-ons
2. **Install Uniicon** from your development environment
3. **Access Agent Editor** to customize your AI agents
4. **Start Creating** - Type any description and watch magic happen!

## Architecture

```
📁 addon-deployed/
├── � servers/
│   └── �📄 server.js          # Express server with AI pipeline + Agent Management
├── 📁 src/
│   ├── 📄 index.html         # Add-on UI
│   ├── 📄 index.js           # Frontend logic + Agent Editor
│   ├── 📄 agent-editor.html  # AI Agent Instructions Editor
│   ├── 📄 manifest.json      # Adobe add-on configuration
│   ├── 📁 lib/
│   │   ├── 📄 bedrock.js     # Bedrock agents manager
│   │   ├── 📄 secrets.js     # AWS credentials manager
│   │   └── 📄 validator.js   # Agent instructions validator
│   └── 📁 utils/
│       ├── 📄 generate.js         # AI icon generation pipeline
│       ├── 📄 content-filter.js   # Input content filtering
│       ├── 📄 extract.js          # Extract Agent
│       ├── 📄 interpret.js        # Interpret Agent  
│       ├── 📄 planner.js          # Planner Agent
│       └── 📄 removebg.js         # Background removal service
├── 📁 public/
│   └── 📁 generated/         # Generated icons storage
└── 📄 package.json           # Dependencies and scripts
```

## AI Agent Management System

### Agent Instruction Editor Data Flow

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ User Interface  │───▶│ Validation      │───▶│ AWS Bedrock     │
│ (Agent Editor)  │    │ Agent           │    │ Agent Update    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌────────▼────────┐             │
         │              │ Content Filter  │             │
         │              │ - Min chars     │             │
         │              │ - Guidelines    │             │
         │              │ - Sensitive     │             │
         └──────────────▶│   content      │◀────────────┘
                        └─────────────────┘
                                 │
                        ┌────────▼────────┐
                        │ Success/Error   │
                        │ Notification    │
                        └─────────────────┘
```

### Multi-Agent Pipeline

```
User Input → [Extract] → [Planner] → [Generator] → [Interpret] → [RemoveBG] → Final Icon
     ↕              ↕           ↕            ↕            ↕             ↕
Custom Instructions (Editable via Agent Editor)
```

## API Endpoints

- `POST /api/generate` - Generate icon from text description
- `POST /api/edit` - Edit existing icon with 3-agent pipeline
- `GET /api/status` - Health checks and capability verification
- `GET /api/config` - Configuration delivery to frontend
- `GET /api/agents` - Get current agent configurations
- `POST /api/agents/:agentId/instructions` - Update agent instructions
- `POST /api/validate-instructions` - Validate agent instructions with AI
- `GET /agent-editor` - Agent Instructions Editor Interface
- `GET /generated/*` - Serve generated icon files
- `GET /assets/*` - Serve static assets

## Agent Instructions Validation System

### Validation Agent Configuration
- **Purpose**: Validates user-provided agent instructions for safety and quality
- **Model**: Amazon Bedrock Claude/Llama model
- **Validation Criteria**:
  - Minimum character length (100+ characters)
  - No sensitive content (harmful, inappropriate, malicious instructions)
  - Maintains agent role coherence
  - Follows best practices for AI instruction design
  - Preserves system security and functionality

### Required AWS Setup

1. **Bedrock Agent IDs** (Required for each agent):
   ```
   BEDROCK_EXTRACT_AGENT_ID=your_extract_agent_id
   BEDROCK_EXTRACT_AGENT_ALIAS_ID=your_extract_alias_id
   BEDROCK_INTERPRET_AGENT_ID=your_interpret_agent_id  
   BEDROCK_INTERPRET_AGENT_ALIAS_ID=your_interpret_alias_id
   BEDROCK_PLANNER_AGENT_ID=your_planner_agent_id
   BEDROCK_PLANNER_AGENT_ALIAS_ID=your_planner_alias_id
   ```

2. **Validation Agent** (New requirement):
   ```
   BEDROCK_VALIDATOR_AGENT_ID=your_validator_agent_id
   BEDROCK_VALIDATOR_AGENT_ALIAS_ID=your_validator_alias_id
   ```

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

## Acknowledgement

We acknowledge that the foundational concept and initial codebase for this project were developed during a previous hackathon that occurred within the same timeframe as this current hackathon. However, every single line of code in this Adobe Express Add-on implementation, including the Express SDK integration, UI components, AI pipeline optimization, and platform-specific features, has been written entirely during this hackathon period. The project represents a complete reimagining and rebuild of the original concept, specifically tailored for the Adobe Express ecosystem with new architecture, enhanced functionality, and production-ready implementation.

---

🚀 **Ready to revolutionize icon creation with AI?** Start generating professional icons with simple text descriptions!

**Inspired from** [Uniicon](https://github.com/DhanushKenkiri/Uniicon)
