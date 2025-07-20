// Uniicon Adobe Add-on

console.log("Uniicon Add-on starting...");

// Configuration
let apiBaseUrl = '';
let bedrockAvailable = false;

// Environment detection
if (window.location.hostname === 'localhost') {
    apiBaseUrl = 'http://localhost:3000';
} else {
    apiBaseUrl = window.location.origin;
}

console.log("API Base URL:", apiBaseUrl);

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

async function initApp() {
    console.log("Initializing Uniicon UI...");
    
    const appContainer = document.getElementById('app');
    if (!appContainer) {
        console.error("App container not found");
        return;
    }
    
    // Wait for Adobe SDK
    try {
        if (typeof addOnUISdk !== 'undefined') {
            console.log("Waiting for Adobe SDK...");
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('SDK timeout')), 5000)
            );
            
            await Promise.race([addOnUISdk.ready, timeoutPromise]);
            console.log("Adobe SDK ready!");
        } else {
            console.log("Adobe SDK not detected");
        }
    } catch (error) {
        console.warn("Adobe SDK initialization failed:", error);
    }
    
    // Create UI
    try {
        appContainer.innerHTML = createUI();
        setupEventHandlers();
        checkAPIAvailability();
        addStyles();
        console.log("Uniicon UI loaded successfully!");
    } catch (error) {
        console.error("Failed to create UI:", error);
        appContainer.innerHTML = `
            <div style="padding: 20px; background: #fee; border-radius: 8px; margin: 20px;">
                <h3 style="color: #c33;">UI Creation Failed</h3>
                <p>Error: ${error.message}</p>
            </div>
        `;
    }
}

function createUI() {
    return `
        <div class="uniicon-app">
            <div class="header">
                <div class="logo-container">
                    <div class="logo-icon">🦄</div>
                    <h1 class="logo-text">Uniicon</h1>
                </div>
                <div class="status-badge" id="status-badge">
                    <div class="status-dot"></div>
                    <span>Online</span>
                </div>
            </div>

            <div class="main-card">
                <div class="intro-section">
                    <h2 class="title">AI-Powered Icon Generator</h2>
                    <p class="description">Generate professional icons using multi-agent AI pipeline</p>
                </div>                <div class="input-section">
                    <div class="input-container">
                        <label class="input-label">Describe your icon</label>
                        <input 
                            id="icon-input" 
                            type="text"
                            placeholder="A floating hot air balloon with rainbow stripes..."
                            class="icon-input"
                        />
                    </div>
                    
                    <button id="generate-btn" class="generate-btn">
                        <span class="btn-icon">✨</span>
                        <span class="btn-text">Generate Icon</span>
                    </button>
                </div>

                <div id="result-area" class="result-area">
                    <div class="ready-state">
                        <div class="pipeline-header">
                            <h3>AI Agent Pipeline + Background Removal</h3>
                            <p>Specialized agents working together</p>
                        </div>
                        <div class="agent-pipeline">
                            <div class="agent-step">
                                <div class="agent-icon">🔍</div>
                                <span>Extract</span>
                            </div>
                            <div class="agent-step">
                                <div class="agent-icon">🧠</div>
                                <span>Interpret</span>
                            </div>
                            <div class="agent-step">
                                <div class="agent-icon">📋</div>
                                <span>Plan</span>
                            </div>
                            <div class="agent-step">
                                <div class="agent-icon">🎨</div>
                                <span>Generate</span>
                            </div>
                            <div class="agent-step">
                                <div class="agent-icon">🧹</div>
                                <span>Clean</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function setupEventHandlers() {
    const btn = document.getElementById('generate-btn');
    const input = document.getElementById('icon-input');
    const result = document.getElementById('result-area');

    if (btn && input && result) {
        btn.addEventListener('click', async () => {
            const description = input.value.trim();
            
            if (!description) {
                showError('Please enter an icon description');
                return;
            }

            if (!bedrockAvailable) {
                showError('API server is not available');
                return;
            }

            try {
                // Update UI to loading state
                btn.disabled = true;
                btn.innerHTML = '<span class="btn-icon">🔄</span><span class="btn-text">Processing...</span>';
                  result.innerHTML = `
                    <div class="loading-state">
                        <div class="loading-title">Generating Your Icon</div>
                        <div class="loading-description">AI agents are working...</div>
                        <div class="agent-pipeline active">
                            <div class="agent-step active">🔍 Extract</div>
                            <div class="agent-step">🧠 Interpret</div>
                            <div class="agent-step">📋 Plan</div>
                            <div class="agent-step">🎨 Generate</div>
                            <div class="agent-step">🧹 Clean</div>
                        </div>
                    </div>
                `;

                // Call API
                const response = await callBedrockAPI(description);
                  if (response.success && response.imageUrl) {
                    const bgStatus = response.backgroundRemoved ? 'Background Removed' : 'Original';
                    result.innerHTML = `
                        <div class="success-state">
                            <div class="success-title">Icon Generated!</div>
                            <img src="${response.imageUrl}" alt="Generated icon" class="generated-image" />
                            <div class="image-info">AWS Bedrock • Multi-Agent AI • ${bgStatus}</div>
                            <div class="action-buttons">
                                <button onclick="copyToClipboard('${response.imageUrl}')" class="action-btn">Copy</button>
                                <button onclick="addToCanvas('${response.imageUrl}')" class="action-btn">Add to Canvas</button>
                            </div>
                        </div>
                    `;
                } else {
                    throw new Error(response.message || 'Generation failed');
                }
                
            } catch (error) {
                console.error('Generation Error:', error);
                showError(error.message);
            } finally {
                // Reset button
                btn.disabled = false;
                btn.innerHTML = '<span class="btn-icon">✨</span><span class="btn-text">Generate Icon</span>';
            }
        });

        // Enter key support
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !btn.disabled) {
                btn.click();
            }
        });
    }
}

function showError(message) {
    const result = document.getElementById('result-area');
    result.innerHTML = `
        <div class="error-state">
            <div class="error-title">Error</div>
            <div class="error-message">${message}</div>
            <button onclick="checkAPIAvailability()" class="action-btn">Retry</button>
        </div>
    `;
}

async function callBedrockAPI(description) {
    try {
        console.log('Calling Bedrock API for:', description);
        
        const response = await fetch(`${apiBaseUrl}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                description: description,
                mode: 'enhanced'
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('API Response received:', result);
        return result;
        
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

async function checkAPIAvailability() {
    try {
        console.log('Checking API availability...');
        
        const response = await fetch(`${apiBaseUrl}/api/status`);
        const result = await response.json();
        
        bedrockAvailable = result.success && result.available;
        
        const statusBadge = document.getElementById('status-badge');
        if (statusBadge) {
            if (bedrockAvailable) {
                statusBadge.innerHTML = '<div class="status-dot online"></div><span>Online</span>';
                statusBadge.className = 'status-badge online';
            } else {
                statusBadge.innerHTML = '<div class="status-dot offline"></div><span>Offline</span>';
                statusBadge.className = 'status-badge offline';
            }
        }
        
        console.log('API Status:', bedrockAvailable ? 'Available' : 'Unavailable');
        
    } catch (error) {
        console.error('API check failed:', error);
        bedrockAvailable = false;
        
        const statusBadge = document.getElementById('status-badge');
        if (statusBadge) {
            statusBadge.innerHTML = '<div class="status-dot offline"></div><span>Offline</span>';
            statusBadge.className = 'status-badge offline';
        }
    }
}

// Global functions for button actions
window.copyToClipboard = async function(imageUrl) {
    try {
        if (navigator.clipboard && window.ClipboardItem) {
            // Modern Clipboard API
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            await navigator.clipboard.write([
                new ClipboardItem({ [blob.type]: blob })
            ]);
            console.log('Image copied to clipboard');
            showTemporaryMessage('Copied to clipboard!');
        } else {
            // Fallback - copy as data URL
            await navigator.clipboard.writeText(imageUrl);
            console.log('Image URL copied to clipboard');
            showTemporaryMessage('Image URL copied!');
        }
    } catch (error) {
        console.error('Copy failed:', error);
        showTemporaryMessage('Copy failed');
    }
};

window.addToCanvas = async function(imageUrl) {
    try {
        if (typeof addOnUISdk !== 'undefined' && addOnUISdk.app?.document) {
            console.log('Adding image to Adobe Express canvas...');
            
            // Convert data URL to blob
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            
            // Add to document
            await addOnUISdk.app.document.addImage(blob);
            console.log('Image added to canvas');
            showTemporaryMessage('Added to canvas!');
        } else {
            console.warn('Adobe SDK not available');
            showTemporaryMessage('Adobe SDK not available');
        }
    } catch (error) {
        console.error('Add to canvas failed:', error);
        showTemporaryMessage('Failed to add to canvas');
    }
};

function showTemporaryMessage(message) {
    const temp = document.createElement('div');
    temp.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    temp.textContent = message;
    document.body.appendChild(temp);
    
    setTimeout(() => {
        temp.remove();
    }, 3000);
}

function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        .uniicon-app {
            width: 100%;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 12px;
            font-size: 14px;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
        }

        .logo-container {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .logo-icon {
            font-size: 24px;
        }

        .logo-text {
            font-size: 18px;
            font-weight: 800;
            color: white;
            text-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }

        .status-badge {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            background: rgba(255, 255, 255, 0.15);
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            color: white;
        }

        .status-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
        }

        .status-dot.online {
            background: #00ff88;
            box-shadow: 0 0 8px rgba(0, 255, 136, 0.5);
        }

        .status-dot.offline {
            background: #ff4757;
        }

        .main-card {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 16px;
            padding: 20px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }

        .intro-section {
            text-align: center;
            margin-bottom: 20px;
        }

        .title {
            font-size: 20px;
            font-weight: 800;
            color: #1a202c;
            margin-bottom: 6px;
        }

        .description {
            font-size: 12px;
            color: #718096;
        }

        .input-section {
            margin-bottom: 20px;
        }

        .input-container {
            margin-bottom: 16px;
        }

        .input-label {
            display: block;
            font-size: 12px;
            font-weight: 600;
            color: #4a5568;
            margin-bottom: 6px;
        }

        .icon-input {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 14px;
            background: white;
            transition: border-color 0.2s;
        }

        .icon-input:focus {
            outline: none;
            border-color: #667eea;
        }

        .generate-btn {
            width: 100%;
            padding: 12px 24px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
        }

        .generate-btn:hover:not(:disabled) {
            transform: translateY(-1px);
        }

        .generate-btn:disabled {
            opacity: 0.7;
            cursor: not-allowed;
        }

        .result-area {
            min-height: 200px;
        }

        .ready-state, .loading-state, .success-state, .error-state {
            text-align: center;
            padding: 20px;
        }

        .pipeline-header h3 {
            font-size: 14px;
            margin-bottom: 4px;
            color: #2d3748;
        }

        .pipeline-header p {
            font-size: 12px;
            color: #718096;
            margin-bottom: 16px;
        }

        .agent-pipeline {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 8px;
            margin: 16px 0;
        }

        .agent-step {
            flex: 1;
            text-align: center;
            padding: 8px 4px;
            border-radius: 6px;
            font-size: 10px;
            color: #718096;
            transition: all 0.3s;
        }

        .agent-step.active {
            background: #667eea;
            color: white;
            transform: scale(1.05);
        }

        .agent-icon {
            font-size: 16px;
            margin-bottom: 4px;
        }

        .generated-image {
            max-width: 100%;
            max-height: 200px;
            border-radius: 8px;
            margin: 16px 0;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .image-info {
            font-size: 10px;
            color: #718096;
            margin-bottom: 16px;
        }

        .action-buttons {
            display: flex;
            gap: 8px;
            justify-content: center;
        }

        .action-btn {
            padding: 8px 16px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            font-size: 12px;
            background: white;
            cursor: pointer;
            transition: all 0.2s;
        }

        .action-btn:hover {
            background: #f7fafc;
            border-color: #cbd5e0;
        }

        .loading-title, .success-title, .error-title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 8px;
        }

        .success-title {
            color: #38a169;
        }

        .error-title {
            color: #e53e3e;
        }

        .loading-description, .error-message {
            font-size: 12px;
            color: #718096;
            margin-bottom: 16px;
        }
    `;
    document.head.appendChild(style);
}

console.log("Uniicon script loaded successfully!");
