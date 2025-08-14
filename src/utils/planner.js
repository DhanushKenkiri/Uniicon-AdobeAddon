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
const agentId = process.env.BEDROCK_PLANNER_AGENT_ID || "BR6FLJOHTV";
const agentAliasId = process.env.BEDROCK_PLANNER_AGENT_ALIAS_ID || "ERJBOK40FB";

export default async function plan(extractedData) {
  const bedrockClient = await getClient();
  const sessionId = uuidv4();

  console.log(`🗺️  Planner Agent (${agentId}): Creating generation plan...`);

  const command = new InvokeAgentCommand({
    agentId,
    agentAliasId,
    sessionId,
    inputText: `EXTRACTED_DATA: ${extractedData}

TASK: Create a detailed generation plan for an icon based on the extracted analysis above. 
Focus on visual elements, composition, style, and technical specifications that will guide the image generation process.

PLAN_REQUIREMENTS:
- Visual composition and layout
- Color scheme and style direction  
- Key elements and their positioning
- Technical specifications for icon format
- Quality and enhancement guidelines

RESPONSE_FORMAT: Provide a comprehensive generation plan that can be used directly by the image generation agent.`,
  });

  try {
    const response = await bedrockClient.send(command);
    let result = "";

    for await (const event of response.completion) {
      if (event.chunk?.bytes) {
        result += Buffer.from(event.chunk.bytes).toString();
      }
    }

    console.log(`✅ Planner Agent completed: ${result.length} characters`);
    return result;
  } catch (error) {
    console.error("❌ Planner Agent error:", error);
    throw error;
  }
}