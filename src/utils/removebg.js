// Background removal service using Remove.bg API

class RemoveBgService {
  constructor() {
    this.apiKey = process.env.REMOVEBG_API_KEY;
    this.baseUrl = 'https://api.remove.bg/v1.0/removebg';
    
    console.log(`Remove.bg API key ${this.apiKey ? 'found' : 'NOT FOUND'}`);
    
    if (!this.apiKey) {
      console.warn('REMOVEBG_API_KEY not found - background removal will be skipped');
    }
  }

  // Test API connection
  async testConnection() {
    if (!this.apiKey) {
      return false;
    }

    try {
      console.log("Testing Remove.bg connection...");
      return true;
    } catch (error) {
      console.error("Remove.bg connection test failed:", error.message);
      return false;
    }
  }

  // Remove background from image
  async removeBackground(imageBuffer, options = {}) {
    if (!this.apiKey) {
      console.warn("Remove.bg API key not available, returning original image");
      return imageBuffer;
    }

    try {
      console.log("Starting background removal...");
      console.log("Input image size:", imageBuffer.length, "bytes");

      const { size = 'auto', type = 'auto', format = 'png', channels = 'rgba' } = options;

      const formData = new FormData();
      const imageBlob = new Blob([imageBuffer], { type: 'image/png' });
      formData.append('image_file', imageBlob, 'image.png');
      formData.append('size', size);
      formData.append('type', type);
      formData.append('format', format);
      formData.append('channels', channels);

      console.log("Sending request to Remove.bg API...");
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'X-Api-Key': this.apiKey,
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Remove.bg API error:", response.status, errorText);
        
        if (response.status === 402) {
          console.warn('Remove.bg quota exceeded, using original image');
          return imageBuffer;
        } else if (response.status === 400) {
          console.warn('Invalid image format, using original image');
          return imageBuffer;
        } else if (response.status === 403) {
          console.warn('Remove.bg API key invalid, using original image');
          return imageBuffer;
        }
        
        throw new Error(`Remove.bg API error: ${response.status}`);
      }

      // Get the cleaned image
      const cleanedImageBuffer = Buffer.from(await response.arrayBuffer());
      
      console.log("Background removal completed");
      console.log("Output image size:", cleanedImageBuffer.length, "bytes");
      
      return cleanedImageBuffer;

    } catch (error) {
      console.error("Remove.bg error:", error.message);
      console.warn("Falling back to original image");
      return imageBuffer;
    }
  }

  // Get remaining API quota
  async getQuota() {
    if (!this.apiKey) {
      return { available: 0, total: 0 };
    }

    try {
      const response = await fetch('https://api.remove.bg/v1.0/account', {
        headers: {
          'X-Api-Key': this.apiKey,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return {
          available: data.attributes.api.free_calls,
          total: data.attributes.api.sizes.regular
        };
      }
    } catch (error) {
      console.error("Failed to get Remove.bg quota:", error.message);
    }

    return { available: 'unknown', total: 'unknown' };
  }
}

export default RemoveBgService;
