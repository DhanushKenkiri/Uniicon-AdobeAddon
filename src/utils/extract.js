import {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
} from "@aws-sdk/client-bedrock-agent-runtime";
import { v4 as uuidv4 } from "uuid";
import { secretsManager } from "../lib/secrets.js";
import { detectEmojiRequest, generateEmojiPrompt } from "./content.js";

let client = null;

async function getClient() {
  if (!client) {
    const credentials = await secretsManager.getCredentials();
    client = new BedrockAgentRuntimeClient({
      region: credentials.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      },
    });
  }
  return client;
}

const agentId = process.env.BEDROCK_EXTRACT_AGENT_ID || "AIN8HDRSBV";
const agentAliasId = process.env.BEDROCK_EXTRACT_AGENT_ALIAS_ID || "6QBYKHARVB";

export default async function extract(inputText) {
  const bedrockClient = await getClient();
  const sessionId = uuidv4();

  // Check if this is an emoji request
  const emojiResult = detectEmojiRequest(inputText);
  
  // Enhance the input for the extract agent to better understand emoji requests
  let enhancedInput = inputText;
  if (emojiResult.isEmoji) {
    enhancedInput = `EMOJI REQUEST (Confidence: ${(emojiResult.confidence * 100).toFixed(0)}%): User wants a 3D animated emoji. Original request: "${inputText}"`;
    
    if (emojiResult.selectedEmoji) {
      enhancedInput += ` Best match: ${emojiResult.selectedEmoji.emoji} (${emojiResult.selectedEmoji.keyword}, score: ${emojiResult.selectedEmoji.score})`;
    }
    
    if (emojiResult.allMatches && emojiResult.allMatches.length > 1) {
      enhancedInput += ` Alternative matches: ${emojiResult.allMatches.slice(1).map(m => `${m.emoji} (${m.keyword})`).join(', ')}`;
    }
    
    enhancedInput += ` Focus on: facial expression analysis, emotional state extraction, animation potential for 3D emoji face generation. Consider micro-expressions, eye movements, mouth shapes, and emotional nuances.`;
  }

  const command = new InvokeAgentCommand({
    agentId,
    agentAliasId,
    sessionId,
    inputText: enhancedInput,
  });  try {
    const response = await bedrockClient.send(command);
    let result = "";

    for await (const event of response.completion) {
      if (event.chunk?.bytes) {
        result += Buffer.from(event.chunk.bytes).toString();
      }
    }

    // Include emoji metadata in the result
    if (emojiResult.isEmoji) {
      result += `\n\nEMOJI_METADATA: ${JSON.stringify({
        isEmoji: true,
        selectedEmoji: emojiResult.selectedEmoji,
        enhancedPrompt: generateEmojiPrompt(emojiResult, inputText)
      })}`;
    }

    return result;
  } catch (error) {
    console.error("Error invoking agent:", error);
    throw error;
  }
}
