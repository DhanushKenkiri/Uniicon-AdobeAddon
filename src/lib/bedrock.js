// Bedrock AI agents for icon generation

import { BedrockAgentRuntimeClient, InvokeAgentCommand } from "@aws-sdk/client-bedrock-agent-runtime";
import { secretsManager } from "./secrets.js";

class BedrockAgents {
  constructor() {
    this.client = null;
  }

  async getClient() {
    if (!this.client) {
      const credentials = await secretsManager.getCredentials();
      this.client = new BedrockAgentRuntimeClient({
        region: credentials.region,
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
        },
      });
    }
    return this.client;
  }
  async executeAgentPipeline(input) {
    try {
      console.log('Starting AI agent pipeline...');
      
      // Step 1: Extract Agent
      const extractResult = await this.callAgent('extract', input);
      console.log('Extract Agent completed');
      
      // Step 2: Interpret Agent
      const interpretResult = await this.callAgent('interpret', extractResult);
      console.log('Interpret Agent completed');
      
      // Step 3: Planner Agent
      const planResult = await this.callAgent('planner', interpretResult);
      console.log('Planner Agent completed');
      
      // Optimize the final prompt
      const optimizedPrompt = this.optimizePrompt(planResult);
      
      return {
        pipeline: 'complete',
        optimizedPrompt,
        extractResult,
        interpretResult,
        planResult
      };
        } catch (error) {
      console.warn('Agent pipeline failed, using fallback:', error.message);
      
      // Fallback optimization
      const optimizedPrompt = this.optimizePrompt(input);
      
      return {
        pipeline: 'fallback',
        optimizedPrompt,
        error: error.message
      };
    }
  }

  async callAgent(agentType, input) {
    try {
      const client = await this.getClient();
      
      const agentIds = {
        extract: {
          agentId: process.env.BEDROCK_EXTRACT_AGENT_ID,
          aliasId: process.env.BEDROCK_EXTRACT_AGENT_ALIAS_ID
        },
        interpret: {
          agentId: process.env.BEDROCK_INTERPRET_AGENT_ID,
          aliasId: process.env.BEDROCK_INTERPRET_AGENT_ALIAS_ID
        },
        planner: {
          agentId: process.env.BEDROCK_PLANNER_AGENT_ID,
          aliasId: process.env.BEDROCK_PLANNER_AGENT_ALIAS_ID
        }
      };      const agentConfig = agentIds[agentType];
      if (!agentConfig?.agentId) {
        console.warn(`No agent ID configured for ${agentType}`);
        return input;
      }      const command = new InvokeAgentCommand({
        agentId: agentConfig.agentId,
        agentAliasId: agentConfig.aliasId || 'TSTALIASID',
        sessionId: `session-${Date.now()}`,
        inputText: typeof input === 'string' ? input : JSON.stringify(input)
      });

      const response = await client.send(command);
      
      // Process the streaming response
      let result = '';
      if (response.completion) {
        for await (const event of response.completion) {
          if (event.chunk?.bytes) {
            const chunk = new TextDecoder().decode(event.chunk.bytes);
            result += chunk;
          }
        }
      }      return result || input;

    } catch (error) {
      console.warn(`${agentType} agent failed:`, error.message);
      return input;
    }
  }

  optimizePrompt(input) {
    // Create optimized prompt for icon generation
    let optimized = typeof input === 'string' ? input : JSON.stringify(input);
    
    // Add 3D and icon styling
    if (!optimized.toLowerCase().includes('3d')) {
      optimized = `3D rendered ${optimized}`;
    }
    
    if (!optimized.toLowerCase().includes('icon')) {
      optimized = `${optimized} as a professional icon`;
    }

    // Add quality enhancements
    optimized += ', high quality, clean design, vibrant colors, modern style';

    return optimized;
  }
}

export const bedrockAgents = new BedrockAgents();
