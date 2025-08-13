// Uniicon Adobe Add-on

console.log("Uniicon Add-on starting...");

// Configuration
let apiBaseUrl = '';
let bedrockAvailable = false;

// Tenor API Configuration (will be loaded from server)
let TENOR_API_KEY = 'AIzaSyC2xRABHfXjo32Er0UToEYQRqUCkxkMk7I'; // Fallback key
const TENOR_BASE_URL = 'https://tenor.googleapis.com/v2';

// Infinite scroll and lazy loading state
let currentGifOffset = 0;
let isLoadingMoreGifs = false;
let hasMoreGifs = true;
let lazyImageObserver = null;

// Initialize lazy loading observer
function initLazyLoading() {
    if ('IntersectionObserver' in window) {
        lazyImageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const actualSrc = img.dataset.src;
                    const placeholder = img.previousElementSibling;
                    
                    console.log('Loading image:', actualSrc);
                    
                    if (actualSrc) {
                        // Show the image immediately and set the src
                        img.style.display = 'block';
                        img.src = actualSrc;
                        
                        img.onload = () => {
                            img.classList.add('loaded');
                            if (placeholder && placeholder.classList.contains('gif-placeholder')) {
                                placeholder.style.display = 'none';
                            }
                            console.log('Image loaded successfully:', actualSrc);
                        };
                        
                        img.onerror = () => {
                            img.style.display = 'none';
                            if (placeholder) {
                                placeholder.innerHTML = 'Failed to load';
                                placeholder.style.color = '#ff6b6b';
                            }
                            console.error('Failed to load GIF:', actualSrc);
                        };
                        
                        img.removeAttribute('data-src');
                        observer.unobserve(img);
                    }
                }
            });
        }, {
            rootMargin: '100px 0px', // Start loading 100px before the image enters viewport
            threshold: 0.01
        });
    } else {
        // Fallback for browsers without IntersectionObserver
        console.log('IntersectionObserver not supported, loading all images immediately');
        setTimeout(() => {
            document.querySelectorAll('.lazy-image').forEach(img => {
                const actualSrc = img.dataset.src;
                if (actualSrc) {
                    img.src = actualSrc;
                    img.style.display = 'block';
                }
            });
        }, 100);
    }
}

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
            <!-- Corner decorative circles -->
            <div class="corner-circle top-left"></div>
            <div class="corner-circle top-right"></div>
            <div class="corner-circle bottom-left"></div>
            <div class="corner-circle bottom-right"></div>
            
            <!-- Main title -->
            <div class="main-title">-UNIICON AI-</div>
            
            <!-- Input section -->
            <div class="input-section">
                <input 
                    id="icon-input" 
                    type="text"
                    placeholder="Enter your prompt here..."
                    class="main-input"
                />
            </div>
            
            <!-- Action buttons -->
            <div class="button-section">
                <button id="generate-btn" class="action-button generate-button">
                    GENERATE
                </button>
                
                <button id="marketplace-btn" class="action-button marketplace-button">
                    MARKETPLACE
                </button>
            </div>
            
            <!-- Result area (hidden initially) -->
            <div id="result-area" class="result-area" style="display: none;">
                <!-- Progress indicator -->
                <div id="progress-container" class="progress-container" style="display: none;">
                    <div class="progress-header">
                        <div class="progress-icon">🎨</div>
                        <div class="progress-title">Generating Your Icon</div>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" id="progress-fill"></div>
                    </div>
                    <div class="progress-steps">
                        <div class="progress-step" id="step-1">
                            <div class="step-dot"></div>
                        </div>
                        <div class="progress-step" id="step-2">
                            <div class="step-dot"></div>
                        </div>
                        <div class="progress-step" id="step-3">
                            <div class="step-dot"></div>
                        </div>
                        <div class="progress-step" id="step-4">
                            <div class="step-dot"></div>
                        </div>
                    </div>
                    <div class="progress-message" id="progress-message">Starting AI pipeline...</div>
                </div>
                <!-- Results will be shown here -->
            </div>
        </div>
    `;
}

function setupEventHandlers() {
    const btn = document.getElementById('generate-btn');
    const marketplaceBtn = document.getElementById('marketplace-btn');
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
                // Show result area and progress
                result.style.display = 'block';
                showProgress();
                
                // Update button state
                btn.disabled = true;
                btn.textContent = 'GENERATING...';
                btn.style.background = '#666';
                
                // Call API with progress updates
                const response = await callBedrockAPIWithProgress(description);
                
                if (response.success && response.imageUrl) {
                    hideProgress();
                    const bgStatus = response.backgroundRemoved ? 'Background Removed' : 'Original';
                    result.innerHTML = `
                        <div class="success-state">
                            <div class="success-title">Icon Generated!</div>
                            <img src="${response.imageUrl}" alt="Generated icon" class="generated-image" />
                            <div class="image-info">AWS Bedrock • Multi-Agent AI • ${bgStatus}</div>
                            <div class="action-buttons">
                                <button onclick="copyToClipboard('${response.imageUrl}')" class="action-btn">Copy</button>
                                <button onclick="addToCanvas('${response.imageUrl}')" class="action-btn">Add to Canvas</button>
                                <button onclick="editIcon('${response.imageUrl}', '${description.replace(/'/g, "\\'")}', this)" class="action-btn edit-btn">Edit Icon</button>
                            </div>
                        </div>
                    `;
                } else {
                    throw new Error(response.message || 'Generation failed');
                }
                
            } catch (error) {
                console.error('Generation Error:', error);
                hideProgress();
                showError(error.message);
            } finally {
                // Reset button
                btn.disabled = false;
                btn.textContent = 'GENERATE';
                btn.style.background = '#333';
            }
        });

        // Enter key support
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !btn.disabled) {
                btn.click();
            }
        });
    }

    // Marketplace button functionality
    if (marketplaceBtn) {
        marketplaceBtn.addEventListener('click', () => {
            showMarketplace();
        });
    }
}

function showError(message) {
    const result = document.getElementById('result-area');
    result.style.display = 'block';
    result.innerHTML = `
        <div class="loading-state">
            <div class="loading-title" style="color: #e53e3e;">Error</div>
            <div class="loading-description">${message}</div>
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

// Enhanced API call with progress updates
async function callBedrockAPIWithProgress(description) {
    try {
        console.log('Calling Bedrock API with progress tracking for:', description);
        
        // Simulate progress steps
        updateProgress(1, "Analyzing your prompt...");
        await delay(800);
        
        updateProgress(2, "Running AI agent pipeline...");
        await delay(1000);
        
        updateProgress(3, "Generating your icon...");
        
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

        updateProgress(4, "Applying final enhancements...");
        await delay(500);

        const result = await response.json();
        console.log('API Response received:', result);
        return result;
        
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// Progress management functions
function showProgress() {
    const progressContainer = document.getElementById('progress-container');
    if (progressContainer) {
        progressContainer.style.display = 'block';
        resetProgress();
    }
}

function hideProgress() {
    const progressContainer = document.getElementById('progress-container');
    if (progressContainer) {
        progressContainer.style.display = 'none';
    }
}

function updateProgress(step, message) {
    // Update progress bar
    const progressFill = document.getElementById('progress-fill');
    const progressMessage = document.getElementById('progress-message');
    
    if (progressFill && progressMessage) {
        const percentage = (step / 4) * 100;
        progressFill.style.width = `${percentage}%`;
        progressMessage.textContent = message;
    }
    
    // Update step indicators
    for (let i = 1; i <= 4; i++) {
        const stepElement = document.getElementById(`step-${i}`);
        if (stepElement) {
            if (i <= step) {
                stepElement.classList.add('active');
                if (i < step) {
                    stepElement.classList.add('completed');
                }
            } else {
                stepElement.classList.remove('active', 'completed');
            }
        }
    }
}

function resetProgress() {
    const progressFill = document.getElementById('progress-fill');
    const progressMessage = document.getElementById('progress-message');
    
    if (progressFill) progressFill.style.width = '0%';
    if (progressMessage) progressMessage.textContent = 'Starting AI pipeline...';
    
    // Reset all steps
    for (let i = 1; i <= 4; i++) {
        const stepElement = document.getElementById(`step-${i}`);
        if (stepElement) {
            stepElement.classList.remove('active', 'completed');
        }
    }
}

// Utility function for delays
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Tenor API functions
async function searchTenorGifs(query, limit = 12) {
    try {
        // Always try to get API key from server first
        let tenorKey = TENOR_API_KEY;
        
        try {
            const configResponse = await fetch(`${apiBaseUrl}/api/config`);
            const configResult = await configResponse.json();
            if (configResult.success && configResult.config.tenorApiKey) {
                tenorKey = configResult.config.tenorApiKey;
                console.log('Using Tenor API key from server');
            }
        } catch (configError) {
            console.log('Could not fetch server config, using hardcoded fallback key');
        }

        if (!tenorKey || tenorKey === 'YOUR_TENOR_API_KEY' || tenorKey === 'PASTE_YOUR_API_KEY_HERE') {
            console.log('❌ No valid Tenor API key, using placeholder GIFs');
            return generatePlaceholderGifs(query, limit);
        }

        console.log('🔍 Searching Tenor for:', query, 'with key:', tenorKey.substring(0, 10) + '...');
        const response = await fetch(
            `${TENOR_BASE_URL}/search?q=${encodeURIComponent(query)}&key=${tenorKey}&limit=${limit}&media_filter=tinygif,gif&client_key=uniicon_app`
        );
        
        if (!response.ok) {
            console.error('Tenor API HTTP error:', response.status, response.statusText);
            throw new Error(`Tenor API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('✅ Tenor API response:', data.results?.length, 'GIFs found');
        
        if (!data.results || data.results.length === 0) {
            console.warn('No GIFs found for query:', query);
            return generatePlaceholderGifs(query, limit);
        }
        
        return data.results.map(gif => {
            // Get the best available image URLs
            const gifUrl = gif.media_formats?.gif?.url;
            const previewUrl = gif.media_formats?.tinygif?.url || gif.media_formats?.nanogif?.url || gifUrl;
            const dims = gif.media_formats?.gif?.dims || gif.media_formats?.tinygif?.dims || [200, 200];
            
            return {
                id: gif.id,
                title: gif.content_description || gif.title || `Search GIF ${gif.id}`,
                url: gifUrl,
                preview: previewUrl,
                dims: dims,
                width: dims[0],
                height: dims[1]
            };
        });
    } catch (error) {
        console.error('❌ Tenor search failed:', error);
        return generatePlaceholderGifs(query, limit);
    }
}

async function getTrendingTenorGifs(limit = 12, offset = 0) {
    try {
        // Always try to get API key from server first
        let tenorKey = TENOR_API_KEY;
        
        try {
            const configResponse = await fetch(`${apiBaseUrl}/api/config`);
            const configResult = await configResponse.json();
            if (configResult.success && configResult.config.tenorApiKey) {
                tenorKey = configResult.config.tenorApiKey;
                console.log('Using Tenor API key from server for trending');
            }
        } catch (configError) {
            console.log('Could not fetch server config for trending, using fallback');
        }

        if (!tenorKey || tenorKey === 'YOUR_TENOR_API_KEY' || tenorKey === 'PASTE_YOUR_API_KEY_HERE') {
            console.log('No valid Tenor API key for trending, using placeholder GIFs');
            return { gifs: generatePlaceholderGifs('trending', limit), next: null };
        }

        console.log(`🔍 Fetching featured GIFs from Tenor (limit: ${limit}, offset: ${offset})`);
        
        // Use featured endpoint with pos parameter for pagination
        let url = `${TENOR_BASE_URL}/featured?key=${tenorKey}&limit=${limit}&media_filter=tinygif,gif&client_key=uniicon_app`;
        if (offset > 0) {
            url += `&pos=${offset}`;
        }
        
        const response = await fetch(url);
        
        if (!response.ok) {
            console.error('Tenor API HTTP error:', response.status, response.statusText);
            throw new Error(`Tenor API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('✅ Tenor featured response:', data.results?.length, 'GIFs found');
        
        if (!data.results || data.results.length === 0) {
            console.warn('No featured GIFs found');
            return { gifs: generatePlaceholderGifs('trending', limit), next: null };
        }
        
        const gifs = data.results.map(gif => {
            // Get the best available image URLs
            const gifUrl = gif.media_formats?.gif?.url;
            const previewUrl = gif.media_formats?.tinygif?.url || gif.media_formats?.nanogif?.url || gifUrl;
            const dims = gif.media_formats?.gif?.dims || gif.media_formats?.tinygif?.dims || [200, 200];
            
            return {
                id: gif.id,
                title: gif.content_description || gif.title || `Featured GIF ${gif.id}`,
                url: gifUrl,
                preview: previewUrl,
                dims: dims,
                width: dims[0],
                height: dims[1]
            };
        });
        
        return {
            gifs: gifs,
            next: data.next || null
        };
    } catch (error) {
        console.error('❌ Tenor featured failed:', error);
        return {
            gifs: generatePlaceholderGifs('trending', limit),
            next: null
        };
    }
}

function generatePlaceholderGifs(query, limit) {
    // Use simple emoji-based placeholders that always work
    const placeholders = [
        { id: '1', title: 'Happy Face', url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iI0ZGRDcwMCIvPjx0ZXh0IHg9IjUwIiB5PSI2MCIgZm9udC1zaXplPSI0MCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+YijwvdGV4dD48L3N2Zz4=', preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iI0ZGRDcwMCIvPjx0ZXh0IHg9IjUwIiB5PSI2MCIgZm9udC1zaXplPSI0MCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+YijwvdGV4dD48L3N2Zz4=' },
        { id: '2', title: 'Rocket', url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iIzQ4ODVGRiIvPjx0ZXh0IHg9IjUwIiB5PSI2MCIgZm9udC1zaXplPSI0MCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+agDwvdGV4dD48L3N2Zz4=', preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iIzQ4ODVGRiIvPjx0ZXh0IHg9IjUwIiB5PSI2MCIgZm9udC1zaXplPSI0MCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+agDwvdGV4dD48L3N2Zz4=' },
        { id: '3', title: 'Heart', url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iI0ZGNzA5QSIvPjx0ZXh0IHg9IjUwIiB5PSI2MCIgZm9udC1zaXplPSI0MCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+4p2k77iPPC90ZXh0Pjwvc3ZnPg==', preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iI0ZGNzA5QSIvPjx0ZXh0IHg9IjUwIiB5PSI2MCIgZm9udC1zaXplPSI0MCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+4p2k77iPPC90ZXh0Pjwvc3ZnPg==' },
        { id: '4', title: 'Art', url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iIzEwQjk4MSIvPjx0ZXh0IHg9IjUwIiB5PSI2MCIgZm9udC1zaXplPSI0MCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+OqDwvdGV4dD48L3N2Zz4=', preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iIzEwQjk4MSIvPjx0ZXh0IHg9IjUwIiB5PSI2MCIgZm9udC1zaXplPSI0MCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+OqDwvdGV4dD48L3N2Zz4=' },
        { id: '5', title: 'Star', url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iI0Y1OUUwQiIvPjx0ZXh0IHg9IjUwIiB5PSI2MCIgZm9udC1zaXplPSI0MCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+MnzwvdGV4dD48L3N2Zz4=', preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iI0Y1OUUwQiIvPjx0ZXh0IHg9IjUwIiB5PSI2MCIgZm9udC1zaXplPSI0MCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+MnzwvdGV4dD48L3N2Zz4=' },
        { id: '6', title: 'Music', url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iIzgzMzNGRiIvPjx0ZXh0IHg9IjUwIiB5PSI2MCIgZm9udC1zaXplPSI0MCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+OtTwvdGV4dD48L3N2Zz4=', preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iIzgzMzNGRiIvPjx0ZXh0IHg9IjUwIiB5PSI2MCIgZm9udC1zaXplPSI0MCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+OtTwvdGV4dD48L3N2Zz4=' },
        { id: '7', title: 'Fire', url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iI0VGNDQ0NCIvPjx0ZXh0IHg9IjUwIiB5PSI2MCIgZm9udC1zaXplPSI0MCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+UpTwvdGV4dD48L3N2Zz4=', preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iI0VGNDQ0NCIvPjx0ZXh0IHg9IjUwIiB5PSI2MCIgZm9udC1zaXplPSI0MCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+UpTwvdGV4dD48L3N2Zz4=' },
        { id: '8', title: 'Sun', url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iI0ZCQjYyNiIvPjx0ZXh0IHg9IjUwIiB5PSI2MCIgZm9udC1zaXplPSI0MCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+4piA77iPPC90ZXh0Pjwvc3ZnPg==', preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iI0ZCQjYyNiIvPjx0ZXh0IHg9IjUwIiB5PSI2MCIgZm9udC1zaXplPSI0MCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+4piA77iPPC90ZXh0Pjwvc3ZnPg==' },
        { id: '9', title: 'Moon', url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iIzM3NDE1RiIvPjx0ZXh0IHg9IjUwIiB5PSI2MCIgZm9udC1zaXplPSI0MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiPvCfjonwn4+CPCwvdGV4dD48L3N2Zz4=', preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iIzM3NDE1RiIvPjx0ZXh0IHg9IjUwIiB5PSI2MCIgZm9udC1zaXplPSI0MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiPvCfjonwn4+CPCwvdGV4dD48L3N2Zz4=' },
        { id: '10', title: 'Lightning', url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iI0ZCQjYyNiIvPjx0ZXh0IHg9IjUwIiB5PSI2MCIgZm9udC1zaXplPSI0MCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+4p6hPC90ZXh0Pjwvc3ZnPg==', preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iI0ZCQjYyNiIvPjx0ZXh0IHg9IjUwIiB5PSI2MCIgZm9udC1zaXplPSI0MCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+4p6hPC90ZXh0Pjwvc3ZnPg==' },
        { id: '11', title: 'Rainbow', url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iI0Y0M0Y1RSIvPjx0ZXh0IHg9IjUwIiB5PSI2MCIgZm9udC1zaXplPSI0MCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+MiDwvdGV4dD48L3N2Zz4=', preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iI0Y0M0Y1RSIvPjx0ZXh0IHg9IjUwIiB5PSI2MCIgZm9udC1zaXplPSI0MCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+MiDwvdGV4dD48L3N2Zz4=' },
        { id: '12', title: 'Unicorn', url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iI0Y0M0Y1RSIvPjx0ZXh0IHg9IjUwIiB5PSI2MCIgZm9udC1zaXplPSI0MCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+mhDwvdGV4dD48L3N2Zz4=', preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iI0Y0M0Y1RSIvPjx0ZXh0IHg9IjUwIiB5PSI2MCIgZm9udC1zaXplPSI0MCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+mhDwvdGV4dD48L3N2Zz4=' }
    ];
    
    return placeholders.slice(0, limit);
}

// Marketplace functionality
function showMarketplace() {
    const appContainer = document.getElementById('app');
    if (!appContainer) return;
    
    appContainer.innerHTML = createMarketplaceUI();
    setupMarketplaceHandlers();
    
    // Initialize with UNIICON MARKETPLACE tab active
    switchMarketplaceTab('uniicon');
}

function createMarketplaceUI() {
    return `
        <div class="marketplace-app">
            <!-- Corner decorative circles -->
            <div class="corner-circle top-left"></div>
            <div class="corner-circle top-right"></div>
            <div class="corner-circle bottom-left"></div>
            <div class="corner-circle bottom-right"></div>
            
            <!-- Header with back button -->
            <div class="marketplace-header">
                <button id="back-btn" class="back-button">← Back to Generator</button>
                <h2 class="marketplace-title">Browse Icon Collections</h2>
            </div>
            
            <!-- Toggle buttons -->
            <div class="marketplace-toggle">
                <button id="uniicon-tab" class="toggle-button active">
                    PUBLIC ICONS
                </button>
                <button id="public-tab" class="toggle-button">
                    UNIICON CREATIONS
                </button>
            </div>
            
            <!-- Search section -->
            <div class="search-section">
                <div class="search-container">
                    <input type="text" id="marketplace-search" placeholder="Search icons, styles, themes..." class="search-input">
                    <div class="search-icon">🔍</div>
                </div>
            </div>
            
            <!-- Content area -->
            <div class="marketplace-content">
                <div id="marketplace-grid" class="marketplace-grid">
                    <!-- Grid items will be populated here -->
                </div>
            </div>
        </div>
    `;
}

function setupMarketplaceHandlers() {
    // Initialize lazy loading
    initLazyLoading();
    
    const backBtn = document.getElementById('back-btn');
    const uniconTab = document.getElementById('uniicon-tab');
    const publicTab = document.getElementById('public-tab');
    
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            // Go back to main app
            const appContainer = document.getElementById('app');
            if (appContainer) {
                appContainer.innerHTML = createUI();
                setupEventHandlers();
                checkAPIAvailability();
            }
        });
    }
    
    if (uniconTab) {
        uniconTab.addEventListener('click', () => {
            switchMarketplaceTab('uniicon');
        });
    }
    
    if (publicTab) {
        publicTab.addEventListener('click', () => {
            switchMarketplaceTab('public');
        });
    }
    
    // Search functionality
    const searchInput = document.getElementById('marketplace-search');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const query = e.target.value.trim();
                if (query.length > 2) {
                    performMarketplaceSearch(query);
                } else {
                    // Reset to current tab
                    const activeTab = document.querySelector('.toggle-button.active');
                    if (activeTab && activeTab.id === 'uniicon-tab') {
                        populateUnicoonMarketplace();
                    } else {
                        populatePublicMarketplace();
                    }
                }
            }, 500);
        });
    }
    
    // Infinite scroll for PUBLIC tab only
    const marketplaceContent = document.querySelector('.marketplace-content');
    if (marketplaceContent) {
        marketplaceContent.addEventListener('scroll', () => {
            const activeTab = document.querySelector('.toggle-button.active');
            if (activeTab && activeTab.id === 'public-tab') {
                const scrollTop = marketplaceContent.scrollTop;
                const scrollHeight = marketplaceContent.scrollHeight;
                const clientHeight = marketplaceContent.clientHeight;
                
                // Load more when user is near bottom (200px from bottom for more responsive loading)
                if (scrollTop + clientHeight >= scrollHeight - 200) {
                    loadMoreGifs();
                }
            }
        });
    }
}

async function performMarketplaceSearch(query) {
    const grid = document.getElementById('marketplace-grid');
    if (!grid) return;
    
    grid.innerHTML = '<div class="loading-gifs">Searching for "' + query + '"...</div>';
    
    try {
        const gifs = await searchTenorGifs(query, 12);
        grid.innerHTML = '';
        
        if (gifs.length === 0) {
            grid.innerHTML = '<div class="no-results">No icons found for "' + query + '"</div>';
            return;
        }
        
        gifs.forEach((gif, index) => {
            grid.innerHTML += `
                <div class="gig-card" onclick="selectGif('${gif.url}', '${gif.title}')">
                    <div class="gig-content">
                        <img src="${gif.preview}" alt="${gif.title}" class="gig-gif" loading="lazy" />
                        <div class="gig-text">${gif.title}</div>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error('Search failed:', error);
        grid.innerHTML = '<div class="error-message">Search failed. Please try again.</div>';
    }
}

// Global function for GIF selection
window.selectGif = function(gifUrl, title) {
    console.log('Selected GIF:', title, gifUrl);
    
    // Show the selected GIF in a modal or result area
    const resultArea = document.getElementById('result-area');
    if (resultArea) {
        resultArea.style.display = 'block';
        resultArea.innerHTML = `
            <div class="success-state">
                <div class="success-title">Icon Selected!</div>
                <img src="${gifUrl}" alt="${title}" class="generated-image" style="max-width: 200px;" />
                <div class="image-info">Tenor GIF • ${title}</div>
                <div class="action-buttons">
                    <button onclick="copyToClipboard('${gifUrl}')" class="action-btn">Copy</button>
                    <button onclick="addToCanvas('${gifUrl}')" class="action-btn">Add to Canvas</button>
                </div>
            </div>
        `;
        
        // Scroll to result area
        resultArea.scrollIntoView({ behavior: 'smooth' });
    }
    
    showTemporaryMessage('GIF selected! You can now copy or add to canvas.');
}

function switchMarketplaceTab(tab) {
    // Update toggle button states
    const uniconTab = document.getElementById('uniicon-tab');
    const publicTab = document.getElementById('public-tab');
    const marketplaceGrid = document.getElementById('marketplace-grid');
    
    if (uniconTab && publicTab && marketplaceGrid) {
        // Reset button states
        uniconTab.classList.remove('active');
        publicTab.classList.remove('active');
        
        // Set active button
        if (tab === 'uniicon') {
            uniconTab.classList.add('active');
            populateUnicoonMarketplace();
        } else {
            publicTab.classList.add('active');
            populatePublicMarketplace();
        }
    }
}

function populateUnicoonMarketplace() {
    const grid = document.getElementById('marketplace-grid');
    if (!grid) return;
    
    console.log('Populating UNIICON marketplace with AI/digital art GIFs...');
    
    // Show loading state
    grid.innerHTML = '<div class="loading-gifs">Loading AI-generated icons...</div>';
    
    // Load GIFs for UNIICON creations (AI/digital art themed)
    searchTenorGifs('digital art animated icons logo design', 12)
        .then(gifs => {
            console.log('UNIICON GIFs loaded:', gifs.length);
            grid.innerHTML = '';
            gifs.forEach((gif, index) => {
                const aspectRatio = gif.width && gif.height ? (gif.height / gif.width) : 0.75;
                const cardHeight = Math.min(Math.max(aspectRatio * 120, 80), 150); // Dynamic height based on aspect ratio
                
                const cardElement = document.createElement('div');
                cardElement.className = 'gig-card';
                cardElement.style.minHeight = `${cardHeight}px`;
                cardElement.onclick = () => selectGif(gif.url, gif.title);
                
                cardElement.innerHTML = `
                    <div class="gig-content">
                        <img src="${gif.preview}" alt="${gif.title}" class="gif-image" 
                             style="height: ${cardHeight - 30}px; width: 100%; object-fit: cover;"
                             loading="lazy" 
                             onerror="this.style.display='none'; console.error('Failed to load GIF:', '${gif.url}')" />
                        <div class="gig-text" style="height: 25px; overflow: hidden;">${gif.title}</div>
                    </div>
                `;
                
                grid.appendChild(cardElement);
            });
        })
        .catch(error => {
            console.error('Failed to load UNIICON gifs:', error);
            grid.innerHTML = '<div class="error-message">Failed to load AI icons. Check console for details.</div>';
        });
}

function populatePublicMarketplace() {
    const grid = document.getElementById('marketplace-grid');
    if (!grid) return;
    
    console.log('Populating PUBLIC marketplace with real trending GIFs...');
    
    // Reset pagination state
    currentGifOffset = 0;
    isLoadingMoreGifs = false;
    hasMoreGifs = true;
    
    // Show loading state
    grid.innerHTML = '<div class="loading-gifs">Loading trending GIFs...</div>';
    
    // Load initial batch of trending GIFs
    loadMoreGifs(true);
}

async function loadMoreGifs(isInitial = false) {
    if (isLoadingMoreGifs || !hasMoreGifs) return;
    
    const grid = document.getElementById('marketplace-grid');
    if (!grid) return;

    isLoadingMoreGifs = true;
    
    if (!isInitial) {
        // Add loading indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-more';
        loadingDiv.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; gap: 10px; padding: 20px; color: #666;">
                <div style="width: 20px; height: 20px; border: 2px solid #ddd; border-top: 2px solid #333; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                Loading more GIFs...
            </div>
        `;
        grid.appendChild(loadingDiv);
    }
    
    try {
        const result = await getTrendingTenorGifs(20, currentGifOffset); // Increased from 12 to 20
        const gifs = result.gifs;        console.log(`Loaded ${gifs.length} GIFs (offset: ${currentGifOffset})`);
        
        if (isInitial) {
            grid.innerHTML = '';
        } else {
            // Remove loading indicator
            const loadingDiv = grid.querySelector('.loading-more');
            if (loadingDiv) loadingDiv.remove();
        }
        
        gifs.forEach((gif, index) => {
            const cardWidth = 140; // Fixed width
            const aspectRatio = gif.width && gif.height ? (gif.height / gif.width) : 0.75;
            const cardHeight = Math.min(Math.max(aspectRatio * cardWidth, 100), 200);
            
            const cardElement = document.createElement('div');
            cardElement.className = 'gig-card';
            cardElement.style.minHeight = `${cardHeight}px`;
            cardElement.onclick = () => selectGif(gif.url, gif.title);
            
            cardElement.innerHTML = `
                <div class="gig-content">
                    <img src="${gif.preview}" alt="${gif.title}" class="gif-image" 
                         style="height: ${cardHeight - 5}px; width: 100%; object-fit: cover;"
                         loading="lazy" 
                         onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\\"color:#999;padding:20px;text-align:center;\\">Failed to load</div>'; console.error('Failed to load GIF:', '${gif.url}')" />
                </div>
            `;
            
            grid.appendChild(cardElement);
        });
        
        currentGifOffset += gifs.length;
        
        // Check if we have more GIFs to load
        if (gifs.length < 20 || !result.next) { // Updated to match new batch size
            hasMoreGifs = false;
        }
        
    } catch (error) {
        console.error('Failed to load more gifs:', error);
        if (isInitial) {
            grid.innerHTML = '<div class="error-message">Failed to load trending GIFs. Check console for details.</div>';
        }
        hasMoreGifs = false;
    }
    
    isLoadingMoreGifs = false;
}

async function checkAPIAvailability() {
    try {
        console.log('Checking API availability...');
        
        // Check status
        const response = await fetch(`${apiBaseUrl}/api/status`);
        const result = await response.json();
        
        bedrockAvailable = result.success && result.available;
        
        // Load configuration (including Tenor API key)
        try {
            console.log('Fetching configuration from server...');
            const configResponse = await fetch(`${apiBaseUrl}/api/config`);
            const configResult = await configResponse.json();
            
            console.log('Server config response:', configResult);
            
            if (configResult.success && configResult.config.tenorApiKey) {
                TENOR_API_KEY = configResult.config.tenorApiKey;
                console.log('✅ Tenor API key loaded successfully:', TENOR_API_KEY.substring(0, 10) + '...');
            } else {
                console.warn('❌ Tenor API key not available from server - using placeholder GIFs');
                console.log('Config details:', configResult);
            }
        } catch (configError) {
            console.error('❌ Failed to load configuration:', configError);
        }
        
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

// Edit Icon functionality
window.editIcon = function(imageUrl, originalPrompt, buttonElement) {
    const resultArea = document.getElementById('result-area');
    if (!resultArea) return;
    
    // Show edit interface
    resultArea.innerHTML = `
        <div class="edit-state">
            <div class="edit-header">
                <h3>Edit Your Icon</h3>
                <p>Describe the changes you want to make to your icon</p>
            </div>
            
            <div class="edit-content">
                <div class="current-icon">
                    <img src="${imageUrl}" alt="Current icon" class="current-icon-img" />
                    <p class="original-prompt">Original: "${originalPrompt}"</p>
                </div>
                
                <div class="edit-controls">
                    <div class="edit-input-group">
                        <label for="edit-input">What would you like to change?</label>
                        <input type="text" id="edit-input" placeholder="e.g., make it more colorful, add a shadow, change to blue..." />
                    </div>
                    
                    <div class="edit-buttons">
                        <button onclick="applyEdit('${imageUrl}', '${originalPrompt.replace(/'/g, "\\'")}', this)" id="apply-edit-btn" class="action-btn edit-apply-btn">Apply Changes</button>
                        <button onclick="cancelEdit('${imageUrl}', '${originalPrompt.replace(/'/g, "\\'")}', this)" class="action-btn cancel-btn">Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Focus on the edit input
    setTimeout(() => {
        const editInput = document.getElementById('edit-input');
        if (editInput) {
            editInput.focus();
            
            // Add enter key support
            editInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const applyBtn = document.getElementById('apply-edit-btn');
                    if (applyBtn && !applyBtn.disabled) {
                        applyBtn.click();
                    }
                }
            });
        }
    }, 100);
};

window.applyEdit = async function(originalImageUrl, originalPrompt, buttonElement) {
    const editInput = document.getElementById('edit-input');
    const editRequest = editInput?.value.trim();
    
    if (!editRequest) {
        showError('Please describe what you want to change');
        return;
    }
    
    try {
        // Disable button
        buttonElement.disabled = true;
        buttonElement.textContent = 'Applying Changes...';
        
        // Show progress
        showProgress();
        updateProgress(1, 'Processing edit request...');
        
        // Create enhanced prompt for editing
        const editPrompt = `EDIT INSTRUCTION: Take the existing icon described as "${originalPrompt}" and apply these specific changes: ${editRequest}. 
        
IMPORTANT CONSTRAINTS:
- Keep the core concept and style of the original icon
- Only apply the requested changes: ${editRequest}
- Maintain the same icon format and overall composition
- Do not completely redesign - only modify as requested
- Keep the same general size, orientation and icon style
- Make minimal changes that address only the edit request`;
        
        console.log('Edit prompt:', editPrompt);
        
        // Call API with edit prompt
        const response = await callBedrockAPIWithProgress(editPrompt);
        
        if (response.success && response.imageUrl) {
            hideProgress();
            const bgStatus = response.backgroundRemoved ? 'Background Removed' : 'Original';
            
            // Show result with option to edit again
            const resultArea = document.getElementById('result-area');
            resultArea.innerHTML = `
                <div class="success-state">
                    <div class="success-title">Icon Updated!</div>
                    <div class="edit-comparison">
                        <div class="before-after">
                            <div class="comparison-item">
                                <img src="${originalImageUrl}" alt="Original icon" class="comparison-image" />
                                <p>Before</p>
                            </div>
                            <div class="comparison-arrow">→</div>
                            <div class="comparison-item">
                                <img src="${response.imageUrl}" alt="Edited icon" class="comparison-image generated-image" />
                                <p>After</p>
                            </div>
                        </div>
                    </div>
                    <div class="image-info">AWS Bedrock • AI Edit Applied • ${bgStatus}</div>
                    <div class="action-buttons">
                        <button onclick="copyToClipboard('${response.imageUrl}')" class="action-btn">Copy</button>
                        <button onclick="addToCanvas('${response.imageUrl}')" class="action-btn">Add to Canvas</button>
                        <button onclick="editIcon('${response.imageUrl}', '${originalPrompt.replace(/'/g, "\\'")}', this)" class="action-btn edit-btn">Edit Again</button>
                    </div>
                </div>
            `;
        } else {
            throw new Error(response.message || 'Edit failed');
        }
        
    } catch (error) {
        console.error('Edit Error:', error);
        hideProgress();
        showError('Edit failed: ' + error.message);
        
        // Re-enable button
        buttonElement.disabled = false;
        buttonElement.textContent = 'Apply Changes';
    }
};

window.cancelEdit = function(imageUrl, originalPrompt, buttonElement) {
    // Return to the original result view
    const resultArea = document.getElementById('result-area');
    resultArea.innerHTML = `
        <div class="success-state">
            <div class="success-title">Icon Generated!</div>
            <img src="${imageUrl}" alt="Generated icon" class="generated-image" />
            <div class="image-info">AWS Bedrock • Multi-Agent AI</div>
            <div class="action-buttons">
                <button onclick="copyToClipboard('${imageUrl}')" class="action-btn">Copy</button>
                <button onclick="addToCanvas('${imageUrl}')" class="action-btn">Add to Canvas</button>
                <button onclick="editIcon('${imageUrl}', '${originalPrompt.replace(/'/g, "\\'")}', this)" class="action-btn edit-btn">Edit Icon</button>
            </div>
        </div>
    `;
};

function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        .uniicon-app {
            width: 100%;
            min-height: 100vh;
            background: #f8f8f8;
            font-family: 'Arial', sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            position: relative;
            padding: 60px 20px 40px;
        }

        /* Corner decorative circles */
        .corner-circle {
            position: absolute;
            width: 40px;
            height: 40px;
            border: 2px solid #333;
            border-radius: 50%;
            background: transparent;
        }

        .corner-circle.top-left {
            top: 30px;
            left: 30px;
        }

        .corner-circle.top-right {
            top: 30px;
            right: 30px;
        }

        .corner-circle.bottom-left {
            bottom: 30px;
            left: 30px;
        }

        .corner-circle.bottom-right {
            bottom: 30px;
            right: 30px;
        }

        /* Main title */
        .main-title {
            font-size: 48px;
            font-weight: bold;
            color: #333;
            text-align: center;
            margin-bottom: 120px;
            letter-spacing: 2px;
            margin-top: 20px;
        }

        /* Input section */
        .input-section {
            margin-bottom: 40px;
            width: 100%;
            max-width: 500px;
        }

        .main-input {
            width: 100%;
            padding: 20px 25px;
            font-size: 16px;
            border: 3px solid #333;
            border-radius: 15px;
            background: #fff;
            outline: none;
            text-align: center;
            font-family: inherit;
        }

        .main-input::placeholder {
            color: #666;
            font-style: italic;
        }

        .main-input:focus {
            border-color: #555;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }

        /* Button section */
        .button-section {
            display: flex;
            flex-direction: column;
            gap: 15px;
            width: 100%;
            max-width: 300px;
        }

        .action-button {
            padding: 18px 40px;
            font-size: 18px;
            font-weight: bold;
            border: 3px solid #333;
            border-radius: 50px;
            background: #fff;
            color: #333;
            cursor: pointer;
            transition: all 0.3s ease;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-family: inherit;
        }

        .action-button:hover {
            background: #333;
            color: #fff;
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }

        .action-button:active {
            transform: translateY(0);
        }

        .generate-button {
            background: #333;
            color: #fff;
        }

        .generate-button:hover {
            background: #555;
        }

        .marketplace-button {
            background: #fff;
            color: #333;
        }

        /* Result area */
        .result-area {
            margin-top: 40px;
            width: 100%;
            max-width: 500px;
            text-align: center;
        }

        .loading-state {
            padding: 30px;
            background: #fff;
            border: 2px solid #333;
            border-radius: 15px;
            margin-top: 20px;
        }

        .loading-title {
            font-size: 20px;
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
        }

        .success-state {
            padding: 30px;
            background: #fff;
            border: 2px solid #333;
            border-radius: 15px;
            margin-top: 20px;
        }

        .generated-image {
            max-width: 100%;
            max-height: 300px;
            border-radius: 10px;
            margin: 20px 0;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }

        .action-buttons {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin-top: 20px;
        }

        .action-btn {
            padding: 10px 20px;
            font-size: 14px;
            border: 2px solid #333;
            border-radius: 25px;
            background: #fff;
            color: #333;
            cursor: pointer;
            font-weight: bold;
            transition: all 0.3s ease;
        }

        .action-btn:hover {
            background: #333;
            color: #fff;
        }

        .edit-btn {
            background: #4CAF50;
            border-color: #4CAF50;
            color: white;
        }

        .edit-btn:hover {
            background: #45a049;
            border-color: #45a049;
        }

        .cancel-btn {
            background: #f44336;
            border-color: #f44336;
            color: white;
        }

        .cancel-btn:hover {
            background: #da190b;
            border-color: #da190b;
        }

        /* Edit interface styles */
        .edit-state {
            background: #fff;
            border: 2px solid #333;
            border-radius: 15px;
            padding: 30px;
            text-align: center;
            margin-top: 20px;
        }

        .edit-header h3 {
            color: #333;
            font-size: 24px;
            margin-bottom: 10px;
        }

        .edit-header p {
            color: #666;
            margin-bottom: 25px;
        }

        .edit-content {
            display: flex;
            flex-direction: column;
            gap: 25px;
            align-items: center;
        }

        .current-icon {
            text-align: center;
        }

        .current-icon-img {
            width: 120px;
            height: 120px;
            object-fit: cover;
            border-radius: 12px;
            border: 2px solid #ddd;
            margin-bottom: 10px;
        }

        .original-prompt {
            color: #666;
            font-size: 14px;
            font-style: italic;
            max-width: 300px;
            line-height: 1.4;
        }

        .edit-controls {
            width: 100%;
            max-width: 400px;
        }

        .edit-input-group label {
            display: block;
            color: #333;
            font-weight: bold;
            margin-bottom: 8px;
            text-align: left;
        }

        .edit-input-group input {
            width: 100%;
            padding: 15px 20px;
            font-size: 16px;
            border: 2px solid #ddd;
            border-radius: 10px;
            background: #fff;
            outline: none;
            font-family: inherit;
            margin-bottom: 20px;
        }

        .edit-input-group input:focus {
            border-color: #4CAF50;
            box-shadow: 0 0 8px rgba(76, 175, 80, 0.2);
        }

        .edit-buttons {
            display: flex;
            gap: 10px;
            justify-content: center;
        }

        .edit-apply-btn {
            background: #4CAF50;
            border-color: #4CAF50;
            color: white;
            min-width: 140px;
        }

        .edit-apply-btn:hover {
            background: #45a049;
            border-color: #45a049;
        }

        .edit-apply-btn:disabled {
            background: #ccc;
            border-color: #ccc;
            cursor: not-allowed;
        }

        /* Comparison styles */
        .edit-comparison {
            margin: 20px 0;
        }

        .before-after {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 20px;
            flex-wrap: wrap;
        }

        .comparison-item {
            text-align: center;
        }

        .comparison-image {
            width: 100px;
            height: 100px;
            object-fit: cover;
            border-radius: 12px;
            border: 2px solid #ddd;
            margin-bottom: 8px;
        }

        .comparison-item p {
            color: #666;
            font-size: 14px;
            font-weight: bold;
        }

        .comparison-arrow {
            font-size: 24px;
            color: #4CAF50;
            font-weight: bold;
        }

        @media (max-width: 600px) {
            .before-after {
                flex-direction: column;
            }
            
            .comparison-arrow {
                transform: rotate(90deg);
            }
        }

        /* Progress indicator styles */
        .progress-container {
            padding: 30px;
            background: #fff;
            border: 2px solid #333;
            border-radius: 15px;
            margin-top: 20px;
            text-align: center;
        }

        .progress-header {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
            margin-bottom: 25px;
        }

        .progress-icon {
            font-size: 32px;
            animation: spin 2s linear infinite;
            line-height: 1;
        }

        .progress-title {
            font-size: 20px;
            font-weight: bold;
            color: #333;
            line-height: 1;
        }

        .progress-bar {
            width: 100%;
            height: 8px;
            background: #f0f0f0;
            border-radius: 4px;
            overflow: hidden;
            margin: 0 auto 25px auto;
            border: 1px solid #ddd;
            position: relative;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #333, #555, #333);
            background-size: 200% 100%;
            border-radius: 3px;
            transition: width 0.8s ease;
            animation: shimmer 2s linear infinite;
            width: 0%;
        }

        .progress-steps {
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 25px;
            gap: 20px;
            position: relative;
        }

        .progress-step {
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
        }

        .step-dot {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #ddd;
            border: 2px solid #ddd;
            transition: all 0.3s ease;
            position: relative;
        }

        .progress-step.active .step-dot {
            background: #333;
            border-color: #333;
            transform: scale(1.4);
            box-shadow: 0 0 0 4px rgba(51, 51, 51, 0.2);
        }

        .progress-step.completed .step-dot {
            background: #28a745;
            border-color: #28a745;
            transform: scale(1.2);
        }

        .progress-step.completed .step-dot::after {
            content: '✓';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 10px;
            font-weight: bold;
        }

        .progress-message {
            font-size: 14px;
            color: #666;
            font-style: italic;
            min-height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-top: 5px;
        }

        /* Animations */
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }

        @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }

        /* Marketplace styles */
        .marketplace-app {
            width: 100%;
            min-height: 100vh;
            background: #f8f8f8;
            font-family: 'Arial', sans-serif;
            display: flex;
            flex-direction: column;
            position: relative;
            padding: 20px;
        }

        .marketplace-header {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-bottom: 25px;
            text-align: center;
        }

        .back-button {
            padding: 12px 24px;
            font-size: 14px;
            font-weight: bold;
            border: 2px solid #333;
            border-radius: 25px;
            background: #fff;
            color: #333;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-bottom: 15px;
            align-self: flex-start;
        }

        .back-button:hover {
            background: #333;
            color: #fff;
            transform: translateX(-2px);
        }

        .marketplace-title {
            font-size: 24px;
            font-weight: bold;
            color: #333;
            margin: 0;
            letter-spacing: 1px;
        }

        .marketplace-toggle {
            display: flex;
            gap: 0;
            margin-bottom: 20px;
            justify-content: center;
        }

        .toggle-button {
            padding: 12px 25px;
            font-size: 14px;
            font-weight: bold;
            border: 3px solid #333;
            background: #fff;
            color: #333;
            cursor: pointer;
            transition: all 0.3s ease;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .toggle-button:first-child {
            border-radius: 25px 0 0 25px;
            border-right: 1.5px solid #333;
        }

        .toggle-button:last-child {
            border-radius: 0 25px 25px 0;
            border-left: 1.5px solid #333;
        }

        .toggle-button.active {
            background: #333;
            color: #fff;
        }

        .toggle-button:hover:not(.active) {
            background: #f0f0f0;
        }

        .search-section {
            margin-bottom: 25px;
            display: flex;
            justify-content: center;
        }

        .search-container {
            position: relative;
            max-width: 400px;
            width: 100%;
        }

        .search-input {
            width: 100%;
            padding: 15px 50px 15px 20px;
            font-size: 16px;
            border: 3px solid #333;
            border-radius: 30px;
            background: #fff;
            color: #333;
            outline: none;
            transition: all 0.3s ease;
        }

        .search-input:focus {
            border-color: #555;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }

        .search-input::placeholder {
            color: #666;
            font-style: italic;
        }

        .search-icon {
            position: absolute;
            right: 20px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 18px;
            color: #666;
            pointer-events: none;
        }

        .marketplace-content {
            flex: 1;
            display: flex;
            justify-content: center;
            overflow-y: auto;
            max-height: calc(100vh - 180px);
        }

        .marketplace-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
            max-width: 100%;
            width: 100%;
            padding: 0 15px;
            grid-auto-rows: max-content;
        }

        .gig-card {
            background: #fff;
            border: none;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s ease;
            padding: 0;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            width: 100%;
        }

        .gig-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .gig-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            gap: 6px;
            width: 100%;
        }

        .gig-emoji {
            font-size: 24px;
            line-height: 1;
        }

        .gig-gif {
            width: 100%;
            height: 60px;
            object-fit: cover;
            border-radius: 8px;
            border: 2px solid transparent;
            transition: all 0.2s ease;
        }

        .gif-image {
            width: 100%;
            border-radius: 12px;
            border: none;
            transition: all 0.3s ease;
            object-fit: cover;
            display: block;
            opacity: 0;
        }
        
        .gif-image.loaded {
            opacity: 1;
            display: block;
        }
        
        .gif-placeholder {
            border-radius: 12px;
            animation: shimmer 2s infinite linear;
        }
        
        @keyframes shimmer {
            0% { background-position: -200px 0; }
            100% { background-position: calc(200px + 100%) 0; }
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .lazy-image {
            transition: opacity 0.3s ease-in-out;
        }

        .gig-card:hover .gif-image {
            transform: scale(1.02);
        }

        .gig-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 4px;
            width: 100%;
            height: 100%;
            padding: 0;
        }

        .loading-more {
            grid-column: 1 / -1;
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 14px;
        }

        .loading-gifs {
            grid-column: 1 / -1;
            text-align: center;
            padding: 40px 20px;
            color: #666;
            font-style: italic;
            background: #f8f9fa;
            border-radius: 12px;
            border: 2px dashed #ddd;
        }

        .error-message {
            grid-column: 1 / -1;
            text-align: center;
            padding: 40px 20px;
            color: #e53e3e;
            background: #fee;
            border-radius: 12px;
            border: 2px solid #fecaca;
        }

        .no-results {
            grid-column: 1 / -1;
            text-align: center;
            padding: 40px 20px;
            color: #666;
            background: #f8f9fa;
            border-radius: 12px;
            border: 2px dashed #ddd;
        }

        .gig-text {
            font-size: 11px;
            font-weight: 600;
            color: #333;
            line-height: 1.2;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        /* Responsive design */
        @media (max-width: 600px) {
            .main-title {
                font-size: 32px;
                margin-bottom: 50px;
            }
            
            .corner-circle {
                width: 30px;
                height: 30px;
            }
            
            .corner-circle.top-left,
            .corner-circle.top-right {
                top: 20px;
            }
            
            .corner-circle.top-left,
            .corner-circle.bottom-left {
                left: 20px;
            }
            
            .corner-circle.top-right,
            .corner-circle.bottom-right {
                right: 20px;
            }
            
            .corner-circle.bottom-left,
            .corner-circle.bottom-right {
                bottom: 20px;
            }

            .progress-steps {
                gap: 15px;
            }
            
            .step-dot {
                width: 14px;
                height: 14px;
            }
            
            .progress-step.active .step-dot {
                transform: scale(1.3);
            }
            
            .progress-step.completed .step-dot {
                transform: scale(1.15);
            }
            
            .progress-message {
                font-size: 13px;
                min-height: 18px;
            }
            
            .progress-container {
                padding: 20px;
            }

            /* Marketplace responsive */
            .marketplace-header {
                margin-bottom: 20px;
            }
            
            .marketplace-title {
                font-size: 20px;
            }
            
            .marketplace-toggle {
                margin-bottom: 15px;
            }
            
            .toggle-button {
                padding: 10px 18px;
                font-size: 12px;
            }
            
            .search-section {
                margin-bottom: 20px;
            }
            
            .search-input {
                padding: 12px 45px 12px 18px;
                font-size: 14px;
            }
            
            .search-icon {
                right: 15px;
                font-size: 16px;
            }
            
            .marketplace-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 10px;
                padding: 0 10px;
            }
            
            .gig-card {
                min-height: 70px;
                padding: 6px;
            }
            
            .gig-emoji {
                font-size: 20px;
            }

            .gig-gif {
                height: 50px;
            }
            
            .gig-text {
                font-size: 10px;
            }
        }
    `;
    document.head.appendChild(style);
}

console.log("Uniicon script loaded successfully!");
