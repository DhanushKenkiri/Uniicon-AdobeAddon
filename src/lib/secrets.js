// AWS credentials management

class SecretsManager {
  async getCredentials() {
    // On EC2, prefer IAM role credentials (no explicit keys needed)
    // If running locally or elsewhere, fall back to environment variables
    const credentials = {
      region: process.env.AWS_REGION || process.env.BEDROCK_REGION || 'ap-south-1',
      source: 'iam-role'
    };

    // Only add explicit credentials if provided (for local development)
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.BEDROCK_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.BEDROCK_SECRET_ACCESS_KEY;

    if (accessKeyId && secretAccessKey) {
      credentials.accessKeyId = accessKeyId;
      credentials.secretAccessKey = secretAccessKey;
      credentials.source = 'environment';
    }

    // Note: AWS SDK will automatically use EC2 IAM role if no explicit credentials
    return credentials;
  }

  getConfig() {
    const hasExplicitCredentials = !!(process.env.AWS_ACCESS_KEY_ID || process.env.BEDROCK_ACCESS_KEY_ID);
    
    return {
      hasCredentials: hasExplicitCredentials || this.isRunningOnEC2(),
      hasRemoveBgKey: !!process.env.REMOVEBG_API_KEY,
      region: process.env.AWS_REGION || process.env.BEDROCK_REGION,
      environment: process.env.NODE_ENV || 'development',
      credentialSource: hasExplicitCredentials ? 'environment' : 'iam-role'
    };
  }

  isRunningOnEC2() {
    // Simple check if we're running on EC2 (presence of instance metadata)
    return !!(process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION) && 
           !process.env.AWS_ACCESS_KEY_ID;
  }
}

export const secretsManager = new SecretsManager();
