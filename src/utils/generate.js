/**
 * Enhanced Bedrock Generator with 4-Agent Pipeline
 * Uses your Bedrock agents for intelligent icon generation
 */

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { screenPrompt } from "./content.js";
import { secretsManager } from "../lib/secrets.js";
import { bedrockAgents } from "../lib/bedrock.js";

let client = null;

async function getClient() {
  if (!client) {
    const credentials = await secretsManager.getCredentials();
    
    console.log(`🔧 Enhanced Generate.js - AWS Credentials Debug:`);
    console.log(`   Access Key ID: ${credentials.accessKeyId ? credentials.accessKeyId.substring(0, 8) + '...' : 'NOT FOUND'}`);
    console.log(`   Secret Key length: ${credentials.secretAccessKey ? credentials.secretAccessKey.length : 0}`);
    console.log(`   Region: ${credentials.region}`);
    console.log(`   Source: ${credentials.source || 'unknown'}`);
    
    client = new BedrockRuntimeClient({
      region: credentials.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      },
    });
    
    console.log(`✅ BedrockRuntimeClient created for enhanced generate.js`);
  }
  return client;
}

export default async function generateWithAgents(inputText) {
  // Get the client with proper credentials
  const bedrockClient = await getClient();
  
  console.log(`🤖 Starting Enhanced 4-Agent Generation Pipeline for: "${inputText}"`);
  
  // Check if this is an emoji request
  const emojiResult = detectEmojiRequest(inputText);
  
  if (emojiResult.isEmoji) {
    console.log(`🎭 Enhanced Emoji Generation Pipeline Activated!`);
    console.log(`   Emoji: ${emojiResult.selectedEmoji ? emojiResult.selectedEmoji.emoji + ' (' + emojiResult.selectedEmoji.keyword + ')' : 'generic emoji'}`);
    
    // For emoji requests, use specialized enhanced prompt generation
    const enhancedEmojiPrompt = generateEmojiPrompt(emojiResult, inputText);
    console.log(`📝 Enhanced emoji prompt: ${enhancedEmojiPrompt}`);
    
    // Still run through agent pipeline for additional optimization
    try {
      console.log("🚀 Executing 4-Agent Pipeline for emoji enhancement...");
      const agentResult = await bedrockAgents.executeAgentPipeline(enhancedEmojiPrompt);
      
      console.log(`✅ Agent Pipeline Result: ${agentResult.pipeline}`);
      const finalPrompt = agentResult.optimizedPrompt || enhancedEmojiPrompt;
      
      return await generateEmojiWithTitan(finalPrompt, bedrockClient, emojiResult);
    } catch (error) {
      console.log("⚠️ Agent pipeline failed, using direct emoji generation");
      return await generateEmojiWithTitan(enhancedEmojiPrompt, bedrockClient, emojiResult);
    }
  }
  
  // Original non-emoji enhanced generation logic
  const screening = screenPrompt(inputText);
  
  if (!screening.isClean) {
    console.log("🚨 Content screening found potential issues:");
    screening.flaggedWords.forEach(({ word, category }) => {
      console.log(`  - "${word}" (${category})`);
    });
    console.log("🔧 Auto-suggestions:", screening.suggestions);
    console.log("📝 Using cleaned prompt instead");
  }
  
  // Use the cleaned prompt or original if clean
  const cleanedInput = screening.cleanedPrompt;
  
  try {
    // Step 2: Execute 4-Agent Pipeline
    console.log("🚀 Executing 4-Agent Pipeline...");
    const agentResult = await bedrockAgents.executeAgentPipeline(cleanedInput);
    
    console.log(`✅ Agent Pipeline Result: ${agentResult.pipeline}`);
    if (agentResult.pipeline === 'complete') {
      console.log("🎯 Agents provided advanced optimization");
    } else {
      console.log("⚠️ Using fallback optimization");
    }
    
    // Step 3: Prepare optimized prompt for Titan
    let finalPrompt = agentResult.optimizedPrompt;
    
    // Ensure prompt length compliance
    const maxLength = 512;
    if (finalPrompt.length > maxLength) {
      finalPrompt = finalPrompt.substring(0, maxLength - 3) + "...";
      console.log(`⚠️ Prompt truncated from ${agentResult.optimizedPrompt.length} to ${finalPrompt.length} characters`);
    }
    
    console.log(`🔍 Final prompt length: ${finalPrompt.length}/${maxLength} characters`);
    console.log(`📝 Optimized prompt: "${finalPrompt}"`);
    
    return await generateWithTitan(finalPrompt, bedrockClient);
  } catch (error) {
    console.error("❌ Enhanced generation error:", error);
    throw error;
  }
}

async function generateEmojiWithTitan(prompt, bedrockClient, emojiResult) {
  console.log("🎭 Generating 3D animated emoji with enhanced Titan settings...");
  
  const maxLength = 512;
  const finalPrompt = prompt.length > maxLength 
    ? prompt.substring(0, maxLength - 3) + "..." 
    : prompt;
  
  console.log(`🎭 Emoji prompt length: ${finalPrompt.length}/${maxLength} characters`);
  
  const imageInput = {
    modelId: "amazon.titan-image-generator-v1",
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      taskType: "TEXT_IMAGE",
      textToImageParams: {
        text: finalPrompt,
        negativeText: "blurry, low quality, distorted, watermark, signature, text, words, letters, copyright, logo, brand name, cluttered, messy, chaotic, dark background, realistic human face, photographic, multiple faces, scary, horror",
      },
      imageGenerationConfig: {
        numberOfImages: 1,
        height: 1024,
        width: 1024,
        cfgScale: 8.5,  // Higher CFG for better emoji detail and expression
        seed: Math.floor(Math.random() * 1000000),
      },
    }),
  };

  try {
    const command = new InvokeModelCommand(imageInput);
    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    if (!responseBody.images || responseBody.images.length === 0) {
      throw new Error("No emoji images generated from Enhanced Titan Generator");
    }

    const image_base64 = responseBody.images[0];
    const image_bytes = Buffer.from(image_base64, "base64");
    
    // Add emoji metadata
    image_bytes.emojiData = emojiResult;
    image_bytes.enhanced = true;
    
    console.log(`✅ Enhanced 3D animated emoji generated: ${emojiResult.selectedEmoji ? emojiResult.selectedEmoji.emoji : '🎨'}`);
    return image_bytes;
  } catch (error) {
    console.error("Error generating enhanced emoji:", error);
    throw error;
  }
}

async function generateWithTitan(finalPrompt, bedrockClient) {
  // Step 4: Generate with Titan Image Generator
  const imageInput = {
    modelId: "amazon.titan-image-generator-v1",
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      taskType: "TEXT_IMAGE",
      textToImageParams: {
        text: finalPrompt,
        negativeText: "blurry, low quality, distorted, watermark, signature, text, words, letters, copyright, logo, brand name, cluttered, messy, chaotic, dark background",
      },
      imageGenerationConfig: {
        numberOfImages: 1,
        height: 1024,
        width: 1024,
        cfgScale: 7.5,
        seed: Math.floor(Math.random() * 1000000),
      },
    }),
  };

  try {
    console.log("🔍 Generating image with enhanced Titan Image Generator...");
    console.log("🔍 Model ID:", imageInput.modelId);
    console.log("🔍 Region:", process.env.BEDROCK_REGION || process.env.AWS_REGION);
    
    const command = new InvokeModelCommand(imageInput);
    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    if (!responseBody.images || responseBody.images.length === 0) {
      throw new Error("No images generated from Titan Image Generator");
    }
    
    // Return the image as a buffer with metadata
    const image_base64 = responseBody.images[0];
    const image_bytes = Buffer.from(image_base64, "base64");
    
    console.log("✅ Enhanced generation complete!");
    console.log(`📊 Image size: ${image_bytes.length} bytes`);
    
    // Add metadata for debugging and analytics
    image_bytes.metadata = {
      finalPrompt: finalPrompt,
      generatedAt: new Date().toISOString(),
      enhanced: true
    };
    
    return image_bytes;
    
  } catch (error) {
    console.error("Error in enhanced generation pipeline:", error);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      code: error.code,
      fault: error.$fault,
      region: process.env.BEDROCK_REGION || process.env.AWS_REGION,
      modelId: "amazon.titan-image-generator-v1"
    });
    throw error;
  }
}

// Enhanced emoji detection with comprehensive emoji database
function detectEmojiRequest(inputText) {
  const lowerText = inputText.toLowerCase();
  
  // Common emoji keywords and their corresponding emojis
  const emojiMap = {
    // Faces & emotions
    'smile': { emoji: '😊', keyword: 'happy smile' },
    'happy': { emoji: '😊', keyword: 'happy smile' },
    'sad': { emoji: '😢', keyword: 'sad crying' },
    'cry': { emoji: '😢', keyword: 'crying tears' },
    'laugh': { emoji: '😂', keyword: 'laughing tears' },
    'angry': { emoji: '😠', keyword: 'angry mad' },
    'love': { emoji: '😍', keyword: 'heart eyes love' },
    'wink': { emoji: '😉', keyword: 'winking playful' },
    'surprised': { emoji: '😲', keyword: 'surprised shocked' },
    'cool': { emoji: '😎', keyword: 'cool sunglasses' },
    
    // Animals
    'cat': { emoji: '🐱', keyword: 'cat feline' },
    'dog': { emoji: '🐶', keyword: 'dog puppy' },
    'bird': { emoji: '🐦', keyword: 'bird flying' },
    'fish': { emoji: '🐟', keyword: 'fish swimming' },
    'lion': { emoji: '🦁', keyword: 'lion king' },
    'elephant': { emoji: '🐘', keyword: 'elephant big' },
    'monkey': { emoji: '🐵', keyword: 'monkey playful' },
    'bear': { emoji: '🐻', keyword: 'bear cute' },
    'fox': { emoji: '🦊', keyword: 'fox clever' },
    'rabbit': { emoji: '🐰', keyword: 'rabbit bunny' },
    
    // Objects & symbols
    'heart': { emoji: '❤️', keyword: 'red heart love' },
    'star': { emoji: '⭐', keyword: 'golden star' },
    'fire': { emoji: '🔥', keyword: 'fire flame' },
    'music': { emoji: '🎵', keyword: 'music note' },
    'food': { emoji: '🍎', keyword: 'apple food' },
    'car': { emoji: '🚗', keyword: 'car vehicle' },
    'house': { emoji: '🏠', keyword: 'house home' },
    'tree': { emoji: '🌳', keyword: 'green tree' },
    'flower': { emoji: '🌸', keyword: 'cherry blossom' },
    'sun': { emoji: '☀️', keyword: 'bright sun' },
    'moon': { emoji: '🌙', keyword: 'crescent moon' },
    
    // Food
    'pizza': { emoji: '🍕', keyword: 'pizza slice' },
    'burger': { emoji: '🍔', keyword: 'hamburger' },
    'coffee': { emoji: '☕', keyword: 'coffee cup' },
    'cake': { emoji: '🍰', keyword: 'birthday cake' },
    'ice cream': { emoji: '🍦', keyword: 'ice cream cone' },
    
    // Sports & activities
    'ball': { emoji: '⚽', keyword: 'soccer ball' },
    'basketball': { emoji: '🏀', keyword: 'basketball' },
    'football': { emoji: '🏈', keyword: 'american football' },
    'tennis': { emoji: '🎾', keyword: 'tennis ball' },
    'gaming': { emoji: '🎮', keyword: 'game controller' },
    
    // Weather
    'rain': { emoji: '🌧️', keyword: 'rain drops' },
    'snow': { emoji: '❄️', keyword: 'snowflake' },
    'cloud': { emoji: '☁️', keyword: 'white cloud' },
    'lightning': { emoji: '⚡', keyword: 'lightning bolt' },
    
    // Technology
    'phone': { emoji: '📱', keyword: 'mobile phone' },
    'computer': { emoji: '💻', keyword: 'laptop computer' },
    'camera': { emoji: '📷', keyword: 'camera photo' },
    'rocket': { emoji: '🚀', keyword: 'rocket space' }
  };
  
  // Check if the text mentions "emoji" explicitly
  const isExplicitEmoji = lowerText.includes('emoji') || lowerText.includes('emoticon');
  
  // Find matching emoji from keywords
  let selectedEmoji = null;
  let confidence = 0;
  
  for (const [keyword, emojiData] of Object.entries(emojiMap)) {
    if (lowerText.includes(keyword)) {
      // Calculate confidence based on keyword match
      const keywordConfidence = keyword.length / lowerText.length;
      if (keywordConfidence > confidence) {
        confidence = keywordConfidence;
        selectedEmoji = emojiData;
      }
    }
  }
  
  // If no specific emoji found but explicit emoji request, use a generic one
  if (isExplicitEmoji && !selectedEmoji) {
    selectedEmoji = { emoji: '🎨', keyword: 'creative design' };
    confidence = 0.5;
  }
  
  return {
    isEmoji: isExplicitEmoji || selectedEmoji !== null,
    selectedEmoji: selectedEmoji,
    confidence: confidence,
    isExplicit: isExplicitEmoji
  };
}

// Generate enhanced prompt for emoji requests
function generateEmojiPrompt(emojiResult, originalText) {
  const baseEmoji = emojiResult.selectedEmoji;
  
  if (!baseEmoji) {
    return `3D animated icon inspired by emojis, ${originalText}, colorful, expressive, clean design, professional quality, isolated on transparent background`;
  }
  
  // Extract style and enhancement requests from original text
  const styleKeywords = extractStyleKeywords(originalText);
  
  // Create enhanced prompt that starts with the base emoji concept
  let enhancedPrompt = `3D animated ${baseEmoji.keyword} emoji`;
  
  // Add style enhancements from user request
  if (styleKeywords.colors.length > 0) {
    enhancedPrompt += ` in ${styleKeywords.colors.join(' and ')} colors`;
  }
  
  if (styleKeywords.styles.length > 0) {
    enhancedPrompt += ` with ${styleKeywords.styles.join(', ')} style`;
  }
  
  if (styleKeywords.effects.length > 0) {
    enhancedPrompt += ` featuring ${styleKeywords.effects.join(', ')}`;
  }
  
  // Add quality and technical specifications
  enhancedPrompt += `, high-quality 3D render, smooth gradients, professional emoji design, expressive features, clean and modern, isolated on transparent background, perfect for digital use`;
  
  console.log(`🎭 Base emoji: ${baseEmoji.emoji} (${baseEmoji.keyword})`);
  console.log(`🎨 Style keywords found:`, styleKeywords);
  
  return enhancedPrompt;
}

// Extract style keywords from user input
function extractStyleKeywords(text) {
  const lowerText = text.toLowerCase();
  
  const colorKeywords = ['red', 'blue', 'green', 'yellow', 'purple', 'pink', 'orange', 'black', 'white', 'gold', 'silver', 'rainbow', 'colorful', 'bright', 'dark', 'neon', 'pastel'];
  const styleKeywords = ['3d', 'flat', 'minimal', 'detailed', 'cartoon', 'realistic', 'abstract', 'vintage', 'modern', 'futuristic', 'cute', 'professional', 'playful', 'elegant', 'bold'];
  const effectKeywords = ['glowing', 'shiny', 'metallic', 'transparent', 'gradient', 'shadow', 'reflection', 'animated', 'sparkling', 'textured', 'smooth', 'glossy', 'matte'];
  
  return {
    colors: colorKeywords.filter(keyword => lowerText.includes(keyword)),
    styles: styleKeywords.filter(keyword => lowerText.includes(keyword)),
    effects: effectKeywords.filter(keyword => lowerText.includes(keyword))
  };
}
