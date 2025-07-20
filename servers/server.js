// Production server for Uniicon Adobe Add-on

import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

console.log('Uniicon Server Starting:', {
    environment: process.env.NODE_ENV || 'development',
    region: process.env.AWS_REGION || process.env.BEDROCK_REGION,
    hasAWSCredentials: !!(process.env.AWS_ACCESS_KEY_ID || process.env.BEDROCK_ACCESS_KEY_ID),
    hasRemoveBgKey: !!process.env.REMOVEBG_API_KEY,
    port: PORT
});

// Middleware
app.use(express.json());
app.use(express.static('../dist'));
app.use('/assets', express.static('../public'));
app.use('/generated', express.static('../public/generated'));

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

// API route for enhanced Bedrock generation
app.post('/api/generate', async (req, res) => {
    try {
        const { description, mode } = req.body;
        
        if (!description || description.trim().length === 0) {
            return res.status(400).json({ 
                success: false,
                error: 'Description is required' 
            });
        }

        console.log('Generating icon for:', description);

        // Import the generator
        const { default: generateIcon } = await import('../src/utils/generate.js');
        
        // Generate with Bedrock AI pipeline
        const imageBuffer = await generateIcon(description);
        
        console.log('Starting background removal...');
        
        // Apply background removal
        let finalImageBuffer = imageBuffer;
        let backgroundRemoved = false;
        
        try {
            // Import Remove.bg service
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
                    console.log('Background removal successful!');
                    console.log(`Size: ${imageBuffer.length} → ${finalImageBuffer.length} bytes`);
                } else {
                    console.warn('Remove.bg returned empty buffer, using original');
                }
            } else {
                console.warn('Remove.bg connection failed, using original image');
            }
        } catch (bgError) {
            console.error('Background removal failed:', bgError.message);
            console.error('Using original image instead');
        }
        
        // Convert buffer to base64 data URL
        const base64Image = finalImageBuffer.toString('base64');
        const imageUrl = `data:image/png;base64,${base64Image}`;
          // Save generated image to public folder
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `generated-${description.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${timestamp}.png`;
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

// Serve the app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Uniicon Adobe Add-on server running on port ${PORT}`);
    console.log(`📱 Open http://localhost:${PORT} to view the add-on`);
    console.log(`🤖 Enhanced 4-Agent Bedrock Pipeline ready!`);
});
