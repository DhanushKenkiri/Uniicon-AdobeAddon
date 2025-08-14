// Production server for Uniicon Adobe Add-on

import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
// Allow overriding bind host (useful if default isn't accessible externally)
const HOST = process.env.BIND_HOST || '0.0.0.0';

console.log('Uniicon Server Starting:', {
    environment: process.env.NODE_ENV || 'development',
    region: process.env.AWS_REGION || process.env.BEDROCK_REGION,
    hasAWSCredentials: !!(process.env.AWS_ACCESS_KEY_ID || process.env.BEDROCK_ACCESS_KEY_ID),
    hasRemoveBgKey: !!process.env.REMOVEBG_API_KEY,
    port: PORT
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'dist')));
app.use('/assets', express.static(path.join(__dirname, '..', 'public')));
app.use('/generated', express.static(path.join(__dirname, '..', 'public', 'generated')));

// Serve dist files explicitly
app.use('/dist', express.static(path.join(__dirname, '..', 'dist')));

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Health check endpoint for load balancers and monitoring
app.get('/api/health', (req, res) => {
    const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        services: {
            bedrock: !!(process.env.AWS_ACCESS_KEY_ID || process.env.BEDROCK_ACCESS_KEY_ID),
            removebg: !!process.env.REMOVEBG_API_KEY,
            agents: {
                extract: !!process.env.EXTRACT_AGENT_ID,
                interpret: !!process.env.INTERPRET_AGENT_ID,
                planner: !!process.env.PLANNER_AGENT_ID,
                generator: !!process.env.GENERATOR_AGENT_ID
            }
        },
        version: '1.0.0'
    };
    
    res.status(200).json(healthStatus);
});

// Lightweight status endpoint (logged on startup) returning minimal info
app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', ts: Date.now(), port: PORT });
});

// API route for enhanced Bedrock generation with proper pipeline
app.post('/api/generate', async (req, res) => {
    try {
        const { description, mode } = req.body;
        
        if (!description || description.trim().length === 0) {
            return res.status(400).json({ 
                success: false,
                error: 'Description is required' 
            });
        }

            console.log(`🤖 Starting Enhanced 5-Agent Generation Pipeline for: "${description}"`);

    try {
      // Step 1: Extract Agent - Analyze the prompt
      console.log('� Step 1: Extract Agent - Analyzing prompt...');
      const extractedData = await extractAgent(description);
      console.log(`✅ Extract Agent completed: ${extractedData.length} characters`);

      // Step 2: Planner Agent - Create generation plan  
      console.log('🗺️  Step 2: Planner Agent - Creating generation plan...');
      const generationPlan = await plannerAgent(extractedData);
      console.log(`✅ Planner Agent completed: ${generationPlan.length} characters`);

      // Step 3: Generate Agent - Create the image
      console.log('🎨 Step 3: Generate Agent - Creating image...');
      const imageResult = await generateAgent(generationPlan);
      console.log(`✅ Generate Agent completed: ${imageResult ? 'Success' : 'Failed'}`);

      if (!imageResult || !imageResult.imageUrl) {
        throw new Error('Image generation failed');
      }

      // Step 4: Interpret Agent - Analyze generated image
      console.log('🔍 Step 4: Interpret Agent - Analyzing generated image...');
      const imageAnalysis = await interpretAgent(imageResult.imageBase64, description);
      console.log(`✅ Interpret Agent completed: ${imageAnalysis.length} characters`);

      // Step 5: RemoveBG Agent - Remove background
      console.log('🎭 Step 5: RemoveBG Agent - Processing background removal...');
      const finalResult = await removeBgAgent(imageResult.imageUrl, imageResult.imageBase64);
      console.log(`✅ RemoveBG Agent completed: ${finalResult ? 'Success' : 'Failed'}`);

      console.log('🎉 5-Agent Pipeline completed successfully!');
      
      return {
        success: true,
        imageUrl: finalResult.imageUrl || imageResult.imageUrl,
        backgroundRemoved: finalResult.backgroundRemoved || false,
        pipeline: {
          extracted: extractedData,
          plan: generationPlan, 
          analysis: imageAnalysis,
          backgroundRemoved: finalResult.backgroundRemoved
        }
      };

    } catch (error) {
      console.error('❌ 5-Agent Pipeline failed:', error);
      // Fallback to direct generation
      console.log('🔄 Falling back to direct generation...');
      const result = await generateWithAgents(description);
      return result;
    }

        // Step 1: Extract - Analyze the user prompt
        console.log('📝 Step 1: Extract Agent - Analyzing prompt...');
        const { default: extractAgent } = await import('../src/utils/extract.js');
        const extractedData = await extractAgent(description);
        console.log('✅ Extract completed:', extractedData.substring(0, 200) + '...');
        
        // Step 2: Planner - Create generation plan
        console.log('🗺️  Step 2: Planner Agent - Creating generation plan...');
        const { default: plannerAgent } = await import('../src/utils/planner.js');
        const generationPlan = await plannerAgent(extractedData);
        console.log('✅ Plan created:', generationPlan.substring(0, 200) + '...');
        
        // Step 3: Generate - Create the icon image
        console.log('🎨 Step 3: Generate Agent - Creating icon...');
        const { default: generateAgent } = await import('../src/utils/generate.js');
        const imageBuffer = await generateAgent(generationPlan);
        console.log('✅ Icon generated, size:', imageBuffer.length, 'bytes');
        
        // Step 4: Interpret - Analyze the generated image
        console.log('👁️  Step 4: Interpret Agent - Analyzing generated image...');
        const { default: interpretAgent } = await import('../src/utils/interpret.js');
        const imageAnalysis = await interpretAgent(imageBuffer);
        console.log('✅ Image analyzed:', imageAnalysis.substring(0, 150) + '...');
        
        // Step 5: RemoveBG - Apply background removal
        console.log('🎭 Step 5: Background Removal - Cleaning image...');
        let finalImageBuffer = imageBuffer;
        let backgroundRemoved = false;
        
        try {
            const { default: RemoveBgService } = await import('../src/utils/removebg.js');
            const removeBg = new RemoveBgService();
            
            const connectionTest = await removeBg.testConnection();
            
            if (connectionTest) {
                console.log('Removing background from generated image...');
                const cleanedBuffer = await removeBg.removeBackground(imageBuffer, {
                    size: 'auto',
                    type: 'auto',
                    format: 'png',
                    channels: 'rgba'
                });
                
                if (cleanedBuffer && cleanedBuffer.length > 0) {
                    finalImageBuffer = cleanedBuffer;
                    backgroundRemoved = true;
                    console.log('✅ Background removal successful!');
                    console.log(`Size: ${imageBuffer.length} → ${finalImageBuffer.length} bytes`);
                } else {
                    console.warn('⚠️  Remove.bg returned empty buffer, using original');
                }
            } else {
                console.warn('⚠️  Remove.bg connection failed, using original image');
            }
        } catch (bgError) {
            console.error('❌ Background removal failed:', bgError.message);
            console.error('Using original image instead');
        }
        
        // Convert buffer to base64 data URL
        const base64Image = finalImageBuffer.toString('base64');
        const imageUrl = `data:image/png;base64,${base64Image}`;
        
        // Save generated image to public folder
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            // Create safe filename with length limit to prevent OS errors
            const safeDescription = description
              .replace(/[^a-z0-9]/gi, '-')
              .toLowerCase()
              .substring(0, 50); // Limit to 50 characters
            const fileName = `generated-${safeDescription}-${timestamp}.png`;
            const assetsPath = path.join(__dirname, '..', 'public', 'generated');
            
            // Ensure the generated directory exists
            if (!fs.existsSync(assetsPath)) {
                fs.mkdirSync(assetsPath, { recursive: true });
                console.log('Created generated assets directory');
            }
            
            const filePath = path.join(assetsPath, fileName);
            fs.writeFileSync(filePath, finalImageBuffer);
            console.log('💾 Image saved:', fileName);
        } catch (saveError) {
            console.warn('Failed to save image file:', saveError.message);
        }

        console.log('🎉 Pipeline completed successfully!');
        console.log('📊 Pipeline summary:');
        console.log(`   - Original prompt: "${description}"`);
        console.log(`   - Extract result: ${extractedData.length} chars`);
        console.log(`   - Plan result: ${generationPlan.length} chars`);
        console.log(`   - Image size: ${imageBuffer.length} bytes`);
        console.log(`   - Analysis: "${imageAnalysis}"`);
        console.log(`   - Background removed: ${backgroundRemoved}`);
        console.log(`   - Final size: ${finalImageBuffer.length} bytes`);

        res.json({ 
            success: true,
            imageUrl: imageUrl,
            backgroundRemoved: backgroundRemoved,
            pipeline: {
                extracted: extractedData,
                plan: generationPlan,
                analysis: imageAnalysis,
                steps: ['extract', 'plan', 'generate', 'interpret', 'removebg']
            }
        });
          // Save generated image to public folder
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            // Create safe filename with length limit to prevent OS errors  
            const safeDescription = description
              .replace(/[^a-z0-9]/gi, '-')
              .toLowerCase()
              .substring(0, 50); // Limit to 50 characters
            const fileName = `generated-${safeDescription}-${timestamp}.png`;
            const assetsPath = path.join(__dirname, '..', 'public', 'generated');
            
            // Ensure the generated directory exists
            if (!fs.existsSync(assetsPath)) {
                fs.mkdirSync(assetsPath, { recursive: true });
                console.log('Created generated assets directory');
            }
            
            const filePath = path.join(assetsPath, fileName);
            fs.writeFileSync(filePath, finalImageBuffer);
            
            console.log('Generated image saved successfully!');
            console.log(`Available at: /generated/${fileName}`);
        } catch (saveError) {
            console.error('Failed to save image backup:', saveError.message);
        }
        
        console.log('Enhanced image generated successfully');
        
        // Return response
        const response = {
            success: true,
            imageUrl: imageUrl,
            description: description,
            enhanced: true,
            mode: mode || 'full',
            metadata: {
                ...(imageBuffer.metadata || {}),
                backgroundRemoved: backgroundRemoved,
                serverProcessed: true,
                originalSize: imageBuffer.length,
                finalSize: finalImageBuffer.length
            },
            backgroundRemoved: backgroundRemoved
        };

        res.json(response);

    } catch (error) {
        console.error('❌ Enhanced Bedrock generation error:', error);
        
        res.status(500).json({
            success: false,
            error: 'Failed to generate image',
            message: error.message,
            enhanced: true
        });
    }
});

// API route for 3-agent editing pipeline: Interpret → Generate → RemoveBG
app.post('/api/edit', async (req, res) => {
    try {
        const { editRequest, originalImageUrl, originalDescription } = req.body;
        
        if (!editRequest || !originalImageUrl || !originalDescription) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: editRequest, originalImageUrl, originalDescription'
            });
        }

        console.log('🔧 Starting 3-Agent Edit Pipeline...');
        console.log(`   Original: "${originalDescription}"`);
        console.log(`   Edit: "${editRequest}"`);

        // Step 1: Interpret Agent - Analyze the edit request and create enhanced instructions
        console.log('🔍 Step 1: Interpret Agent - Analyzing edit request...');
        const { default: interpretAgent } = await import('../src/utils/interpret.js');
        
        const editInstructions = await interpretAgent(originalImageUrl, `
EDIT ANALYSIS TASK:
Original Icon Description: "${originalDescription}"
Edit Request: "${editRequest}"

Analyze the edit request and provide detailed generation instructions for creating a modified version of the icon.

REQUIREMENTS:
1. Understand what specific changes are being requested
2. Preserve the core concept and style of the original icon
3. Apply only the requested modifications
4. Maintain icon format and professional quality
5. Ensure the edit is precise and surgical - only change what's requested

RESPONSE FORMAT: Provide clear, detailed generation instructions that will guide the image generation agent to create the edited icon while preserving all unmentioned aspects of the original.
        `);
        console.log(`✅ Interpret Agent completed: ${editInstructions.length} characters`);

        // Step 2: Generate Agent - Create the edited image based on interpret instructions
        console.log('🎨 Step 2: Generate Agent - Creating edited image...');
        const { default: generateAgent } = await import('../src/utils/generate.js');
        
        const editedImageResult = await generateAgent(editInstructions);
        console.log(`✅ Generate Agent completed: ${editedImageResult ? 'Success' : 'Failed'}`);

        if (!editedImageResult || !editedImageResult.imageUrl) {
            throw new Error('Edited image generation failed');
        }

        // Step 3: RemoveBG Agent - Apply background removal to edited image
        console.log('🎭 Step 3: RemoveBG Agent - Processing background removal...');
        const { default: removeBgAgent } = await import('../src/utils/removebg.js');
        const removeBg = new removeBgAgent();
        
        let finalImageBuffer = editedImageResult.imageBuffer || Buffer.from(editedImageResult.imageBase64, 'base64');
        let backgroundRemoved = false;

        try {
            const connectionTest = await removeBg.testConnection();
            
            if (connectionTest) {
                console.log('Removing background from edited image...');
                const cleanedBuffer = await removeBg.removeBackground(finalImageBuffer, {
                    size: 'auto',
                    type: 'auto', 
                    format: 'png',
                    channels: 'rgba'
                });
                
                if (cleanedBuffer && cleanedBuffer.length > 0) {
                    finalImageBuffer = cleanedBuffer;
                    backgroundRemoved = true;
                    console.log('✅ Background removal successful!');
                    console.log(`Size: ${editedImageResult.imageBuffer?.length || 0} → ${finalImageBuffer.length} bytes`);
                } else {
                    console.warn('⚠️  Remove.bg returned empty buffer, using original');
                }
            } else {
                console.warn('⚠️  Remove.bg connection failed, using original image');
            }
        } catch (bgError) {
            console.error('❌ Background removal failed:', bgError.message);
            console.error('Using edited image without background removal');
        }

        // Convert buffer to base64 data URL
        const base64Image = finalImageBuffer.toString('base64');
        const finalImageUrl = `data:image/png;base64,${base64Image}`;

        // Save edited image to public folder
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const safeEditRequest = editRequest
              .replace(/[^a-z0-9]/gi, '-')
              .toLowerCase()
              .substring(0, 30); // Shorter limit for edits
            const fileName = `edited-${safeEditRequest}-${timestamp}.png`;
            const assetsPath = path.join(__dirname, '..', 'public', 'generated');
            
            // Ensure the generated directory exists
            if (!fs.existsSync(assetsPath)) {
                fs.mkdirSync(assetsPath, { recursive: true });
                console.log('Created generated assets directory');
            }
            
            const filePath = path.join(assetsPath, fileName);
            fs.writeFileSync(filePath, finalImageBuffer);
            console.log('💾 Edited image saved:', fileName);
        } catch (saveError) {
            console.warn('Failed to save edited image file:', saveError.message);
        }

        console.log('🎉 3-Agent Edit Pipeline completed successfully!');
        console.log('📊 Edit Pipeline summary:');
        console.log(`   - Original: "${originalDescription}"`);
        console.log(`   - Edit request: "${editRequest}"`);
        console.log(`   - Interpret instructions: ${editInstructions.length} chars`);
        console.log(`   - Background removed: ${backgroundRemoved}`);
        console.log(`   - Final size: ${finalImageBuffer.length} bytes`);

        res.json({
            success: true,
            imageUrl: finalImageUrl,
            backgroundRemoved: backgroundRemoved,
            editPipeline: {
                originalDescription: originalDescription,
                editRequest: editRequest,
                interpretInstructions: editInstructions,
                steps: ['interpret', 'generate', 'removebg']
            },
            metadata: {
                backgroundRemoved: backgroundRemoved,
                serverProcessed: true,
                finalSize: finalImageBuffer.length,
                editMode: true
            }
        });

    } catch (error) {
        console.error('❌ 3-Agent Edit Pipeline failed:', error);
        
        res.status(500).json({
            success: false,
            error: 'Failed to edit image',
            message: error.message,
            editMode: true
        });
    }
});

// API route for status checking
app.get('/api/status', async (req, res) => {
    try {
        console.log('🔍 Checking enhanced Bedrock status...');
        
        res.json({
            success: true,
            available: true,
            enhanced: true,
            agents: {
                available: true,
                extract: true,
                interpret: true,
                planner: true,
                generate: true
            },
            message: 'Enhanced 4-Agent Pipeline Ready'
        });
    } catch (error) {
        console.error('❌ Status check error:', error);
        
        res.status(500).json({
            success: false,
            available: false,
            error: error.message
        });
    }
});

// API route for client configuration (includes Tenor API key)
app.get('/api/config', (req, res) => {
    try {
        res.json({
            success: true,
            config: {
                tenorApiKey: process.env.TENOR_API_KEY || null,
                hasRemoveBg: !!process.env.REMOVEBG_API_KEY,
                hasAWS: !!(process.env.AWS_ACCESS_KEY_ID || process.env.BEDROCK_ACCESS_KEY_ID)
            }
        });
    } catch (error) {
        console.error('❌ Config error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Agent editor route
app.get('/agent-editor', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'src', 'agent-editor.html'));
});

// API route to get agent configurations
app.get('/api/agents', (req, res) => {
    try {
        const agentConfigs = {
            extract: {
                agentId: process.env.BEDROCK_EXTRACT_AGENT_ID || 'AIN8HDRSBV',
                aliasId: process.env.BEDROCK_EXTRACT_AGENT_ALIAS_ID || '6QBYKHARVB',
                status: !!(process.env.BEDROCK_EXTRACT_AGENT_ID) ? 'active' : 'inactive'
            },
            interpret: {
                agentId: process.env.BEDROCK_INTERPRET_AGENT_ID || 'NMLHZIHGZR',
                aliasId: process.env.BEDROCK_INTERPRET_AGENT_ALIAS_ID || '9Q6DSVPYBF',
                status: !!(process.env.BEDROCK_INTERPRET_AGENT_ID) ? 'active' : 'inactive'
            },
            planner: {
                agentId: process.env.BEDROCK_PLANNER_AGENT_ID || 'BR6FLJOHTV',
                aliasId: process.env.BEDROCK_PLANNER_AGENT_ALIAS_ID || 'ERJBOK40FB',
                status: !!(process.env.BEDROCK_PLANNER_AGENT_ID) ? 'active' : 'inactive'
            },
            generate: {
                agentId: 'amazon.titan-image-generator-v1',
                aliasId: 'N/A',
                status: 'active'
            }
        };

        res.json({
            success: true,
            agents: agentConfigs
        });
    } catch (error) {
        console.error('❌ Error getting agent configs:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API route to update agent instructions (placeholder for future implementation)
app.post('/api/agents/:agentId/instructions', (req, res) => {
    try {
        const { agentId } = req.params;
        const { instructions } = req.body;
        
        // TODO: Implement actual agent instruction updating
        // This would involve updating the agent configuration in AWS Bedrock
        console.log(`📝 Updating instructions for agent ${agentId}:`, instructions?.substring(0, 100) + '...');
        
        res.json({
            success: true,
            message: `Instructions updated for ${agentId} agent`,
            agentId: agentId
        });
    } catch (error) {
        console.error('❌ Error updating agent instructions:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API route to validate agent instructions
app.post('/api/validate-instructions', async (req, res) => {
    try {
        const { instructions, agentType, agentRole } = req.body;
        
        if (!instructions || !agentType) {
            return res.status(400).json({
                success: false,
                error: 'Instructions and agentType are required'
            });
        }
        
        console.log(`🔍 Validating instructions for ${agentType} agent...`);
        
        // Import and use the validator
        const { InstructionsValidator } = await import('../src/lib/validator.js');
        const validation = await InstructionsValidator.validate(instructions, agentType, agentRole);
        
        console.log(`✅ Validation result for ${agentType}:`, validation.valid ? 'PASSED' : 'FAILED');
        
        res.json({
            success: true,
            validation: validation
        });
        
    } catch (error) {
        console.error('❌ Error validating instructions:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Serve the app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

const server = app.listen(PORT, HOST, () => {
    console.log(`🚀 Uniicon Adobe Add-on server listening on http://${HOST === '0.0.0.0' ? '0.0.0.0' : HOST}:${PORT}`);
    console.log(`📱 Local access:       http://localhost:${PORT}`);
    console.log(`🔗 Status endpoint:    http://localhost:${PORT}/api/status`);
    console.log(`❤️ Health endpoint:    http://localhost:${PORT}/api/health`);
    console.log(`🤖 Enhanced 5-Agent Bedrock Pipeline ready!`);

    // Show quick external access hint if public IP env provided
    if (process.env.PUBLIC_IP) {
        console.log(`🌍 If security groups + NACL allow: http://${process.env.PUBLIC_IP}:${PORT}`);
    }

    // Auto-open browser in development
    if (process.env.NODE_ENV !== 'production') {
        setTimeout(() => {
            console.log('🌐 Opening browser...');
            exec(`start http://localhost:${PORT}`, (error) => {
                if (error) {
                    console.log('💡 Manually open: http://localhost:' + PORT);
                }
            });
        }, 1000);
    }
});

server.on('error', (err) => {
    console.error('❌ Server error starting listener:', err);
});
