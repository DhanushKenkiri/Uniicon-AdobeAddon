import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { screenPrompt } from "./content-filter.js";
import { secretsManager } from "../lib/secrets.js";
import { bedrockAgents } from "../lib/bedrock.js";

let client = null;

async function getClient() {
  if (!client) {
    const credentials = await secretsManager.getCredentials();
    
    console.log("Setting up AWS Bedrock client...");
    console.log(`Region: ${credentials.region}`);
    
    client = new BedrockRuntimeClient({
      region: credentials.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      },
    });
    
    console.log("Bedrock client ready");
  }
  return client;
}

export default async function generateIcon(inputText) {
  const bedrockClient = await getClient();
  
  console.log(`Starting icon generation for: "${inputText}"`);
    // Clean the input prompt
  const screening = screenPrompt(inputText);
  
  if (!screening.isClean) {
    console.log("Content filtering applied:");
    screening.flaggedWords.forEach(({ word, category }) => {
      console.log(`  - "${word}" (${category})`);
    });
  }
  
  const cleanedInput = screening.cleanedPrompt;
  
  try {
    // Run AI agent pipeline
    console.log("Running AI agent pipeline...");
    const agentResult = await bedrockAgents.executeAgentPipeline(cleanedInput);
    
    console.log(`Agent pipeline completed: ${agentResult.pipeline}`);
    
    // Prepare final prompt
    let finalPrompt = agentResult.optimizedPrompt;
    
    // Ensure prompt length is within limits
    const maxLength = 512;
    if (finalPrompt.length > maxLength) {
      finalPrompt = finalPrompt.substring(0, maxLength - 3) + "...";
      console.log(`Prompt truncated to ${finalPrompt.length} characters`);
    }
    
    console.log(`Final prompt: "${finalPrompt}"`);
    
    // Generate image with Titan
    const imageInput = {
      modelId: "amazon.titan-image-generator-v1",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        taskType: "TEXT_IMAGE",
        textToImageParams: {
          text: finalPrompt,
          negativeText: "blurry, low quality, distorted, watermark, text",
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

    console.log("Generating image...");
    
    const command = new InvokeModelCommand(imageInput);
    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    if (!responseBody.images || responseBody.images.length === 0) {
      throw new Error("No images generated");
    }

    // Convert image to buffer
    const imageBase64 = responseBody.images[0];
    const imageBytes = Buffer.from(imageBase64, "base64");
    
    console.log("Generation complete!");
    console.log(`Image size: ${imageBytes.length} bytes`);
    
    // Add metadata to the buffer
    imageBytes.metadata = {
      originalInput: inputText,
      cleanedInput: cleanedInput,
      agentPipeline: agentResult.pipeline,
      optimizedPrompt: finalPrompt,
      generatedAt: new Date().toISOString()
    };
    
    return imageBytes;    
  } catch (error) {
    console.error("Generation failed:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      region: process.env.AWS_REGION
    });
    throw error;
  }
}
