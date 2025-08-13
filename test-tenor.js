// Test Tenor API functionality
import 'dotenv/config';

console.log('🔧 Testing Tenor API integration...');

async function testTenorAPI() {
    try {
        // Test config endpoint
        console.log('1️⃣ Testing config endpoint...');
        const configResponse = await fetch('http://localhost:3000/api/config');
        const config = await configResponse.json();
        console.log('✅ Config API successful:', config.success);
        console.log('🔑 Tenor key available:', !!config.config?.tenorApiKey);
        
        if (!config.config?.tenorApiKey) {
            throw new Error('No Tenor API key in config');
        }
        
        // Test Tenor API directly
        console.log('2️⃣ Testing Tenor featured endpoint...');
        const tenorUrl = `https://tenor.googleapis.com/v2/featured?key=${config.config.tenorApiKey}&limit=3&media_filter=tinygif,gif&client_key=uniicon_app`;
        console.log('🌐 Tenor URL:', tenorUrl.replace(config.config.tenorApiKey, 'API_KEY'));
        
        const tenorResponse = await fetch(tenorUrl);
        console.log('📡 Tenor HTTP status:', tenorResponse.status);
        
        if (!tenorResponse.ok) {
            throw new Error(`Tenor API error: ${tenorResponse.status} ${tenorResponse.statusText}`);
        }
        
        const tenorData = await tenorResponse.json();
        console.log('📊 Tenor results count:', tenorData.results?.length || 0);
        
        if (tenorData.results?.[0]) {
            const firstGif = tenorData.results[0];
            console.log('🎬 First GIF details:');
            console.log('  - ID:', firstGif.id);
            console.log('  - Title:', firstGif.content_description || firstGif.title || 'No title');
            console.log('  - Media formats available:', Object.keys(firstGif.media_formats || {}));
            console.log('  - Preview URL (tinygif):', firstGif.media_formats?.tinygif?.url || 'Not available');
            console.log('  - Full URL (gif):', firstGif.media_formats?.gif?.url || 'Not available');
            console.log('  - Dimensions:', firstGif.media_formats?.gif?.dims || firstGif.media_formats?.tinygif?.dims || 'Unknown');
        }
        
        console.log('✅ All tests passed! Tenor API is working correctly.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

testTenorAPI();
