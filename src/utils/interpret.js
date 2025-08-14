import {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
} from "@aws-sdk/client-bedrock-agent-runtime";
import { v4 as uuidv4 } from "uuid";
import { secretsManager } from "../lib/secrets.js";

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

// Use environment variables for agent configuration
const agentId = process.env.BEDROCK_INTERPRET_AGENT_ID || "NMLHZIHGZR";
const agentAliasId = process.env.BEDROCK_INTERPRET_AGENT_ALIAS_ID || "9Q6DSVPYBF";

export default async function interpret(imageBase64, prompt) {
  const bedrockClient = await getClient();
  const sessionId = uuidv4();

  console.log(`🔍 Interpret Agent (${agentId}): Analyzing generated image...`);

  const command = new InvokeAgentCommand({
    agentId,
    agentAliasId,
    sessionId,
    inputText: `TASK: You are a visual content assistant helping an icon animation storyboard writer. When given an icon-style image, your task is to generate a short, clear, and animation-ready description of the visual content.

ORIGINAL_PROMPT: ${prompt}

IMAGE_DATA: ${imageBase64}

INSTRUCTIONS:
- Focus only on elements relevant for animation — such as characters, objects, environments, positions, and actions
- Avoid stylistic details, colors (unless essential), or anything irrelevant to animation movement or staging
- Keep your response one sentence
- Be literal and descriptive, not interpretive
- Imagine you're passing visual instructions to another AI for animating the scene

EXAMPLE: A hot air balloon floats between three rounded hills. A small figure is seated inside the balloon's basket.

RESPONSE_FORMAT: Provide a single sentence description of the visual content suitable for animation purposes.`,
  });

  try {
    const response = await bedrockClient.send(command);
    let result = "";

    for await (const event of response.completion) {
      if (event.chunk?.bytes) {
        result += Buffer.from(event.chunk.bytes).toString();
      }
    }

    console.log(`✅ Interpret Agent completed: ${result.length} characters`);
    return result;
  } catch (error) {
    console.error("❌ Interpret Agent error:", error);
    throw error;
  }
}