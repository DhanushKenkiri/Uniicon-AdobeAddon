// AWS credentials management

class SecretsManager {
  async getCredentials() {
    const credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.BEDROCK_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.BEDROCK_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || process.env.BEDROCK_REGION || 'ap-south-1',
      source: 'environment'
    };

    if (!credentials.accessKeyId || !credentials.secretAccessKey) {
      throw new Error('AWS credentials not found in environment variables');
    }

    return credentials;
  }

  getConfig() {
    return {
      hasCredentials: !!(process.env.AWS_ACCESS_KEY_ID || process.env.BEDROCK_ACCESS_KEY_ID),
      hasRemoveBgKey: !!process.env.REMOVEBG_API_KEY,
      region: process.env.AWS_REGION || process.env.BEDROCK_REGION,
      environment: process.env.NODE_ENV || 'development'
    };
  }
}

export const secretsManager = new SecretsManager();
