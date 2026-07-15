/**
 * Tech Bazzar - Content Script
 * Runs on every webpage to detect SQL injection attempts
 */

class PageMonitor {
    constructor() {
        console.log('[Content] Loaded on:', window.location.href);
        this.init();
    }

    init() {
        // Monitor form submissions
        this.interceptForms();
        
        // Monitor network requests
        this.interceptNetworkRequests();
        
        // Listen for messages from background
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'testConnection') {
                sendResponse({ status: 'ok' });
            }
        });
    }

    /**
     * Intercept form submissions
     */
    interceptForms() {
        document.addEventListener('submit', async (event) => {
            const form = event.target;
            console.log('[Content] Form submitted');

            try {
                const formData = new FormData(form);
                
                for (const [fieldName, fieldValue] of formData) {
                    if (typeof fieldValue === 'string' && this.couldBeSQLi(fieldValue)) {
                        console.log('[Content] Suspicious input detected');
                        
                        const result = await this.analyzeSuspiciousInput(fieldValue);

                        if (result.is_malicious) {
                            event.preventDefault();
                            event.stopPropagation();
                            this.showWarning(result);
                            await this.logThreat(result, fieldValue);
                            return false;
                        }
                    }
                }
            } catch (error) {
                console.error('[Content] Form interception error:', error);
            }
        }, true);
    }

    /**
     * Intercept network requests (Fetch & XHR)
     */
    interceptNetworkRequests() {
        const self = this;

        // Override fetch
        const originalFetch = window.fetch;
        window.fetch = async function(...args) {
            const config = args[1] || {};

            if (config.body && (config.method === 'POST' || !config.method)) {
                const body = config.body.toString();
                
                if (self.couldBeSQLi(body)) {
                    const result = await self.analyzeSuspiciousInput(body);

                    if (result.is_malicious) {
                        self.showWarning(result);
                        await self.logThreat(result, body);

                        // Check if we should block
                        const settings = await new Promise(resolve => {
                            chrome.runtime.sendMessage(
                                { action: 'getSettings' },
                                resolve
                            );
                        });

                        if (settings.blockAttacks) {
                            return Promise.reject(
                                new Error('[Tech Bazzar] Blocked malicious request')
                            );
                        }
                    }
                }
            }

            return originalFetch.apply(this, args);
        };

        // Override XMLHttpRequest
        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function(method, url) {
            this._method = method;
            this._url = url;
            return originalOpen.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = async function(data) {
            if (data && typeof data === 'string' && self.couldBeSQLi(data)) {
                const result = await self.analyzeSuspiciousInput(data);
                
                if (result.is_malicious) {
                    self.showWarning(result);
                    await self.logThreat(result, data);
                }
            }

            return originalSend.apply(this, arguments);
        };
    }

    /**
     * Check if input could be SQL injection
     */
    couldBeSQLi(input) {
        if (!input || typeof input !== 'string' || input.length < 5) return false;

        const patterns = [
            /(\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b)/i,
            /(\bUNION\b.*\bSELECT\b)/i,
            /[';].*(-{2}|\/\*)/,
            /(\bOR\b\s+['"]?[^']*?['"]?\s*=\s*['"][^'"]*['"])/i,
            /xp_cmdshell/i,
            /exec\s*\(/i,
        ];

        return patterns.some(pattern => pattern.test(input));
    }

    /**
     * Send suspicious input to background for analysis
     */
    async analyzeSuspiciousInput(input) {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage(
                {
                    action: 'analyzeSQLi',
                    data: {
                        query: input,
                        url: window.location.href
                    }
                },
                (response) => {
                    console.log('[Content] Analysis result:', response);
                    resolve(response || { is_malicious: false });
                }
            );
        });
    }

    /**
     * Show warning banner to user
     */
    showWarning(result) {
        console.log('[Content] Showing warning');

        const banner = document.createElement('div');
        banner.id = 'tech-bazzar-warning';
        banner.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
                color: white;
                padding: 20px;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                z-index: 999999;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto;
                max-width: 350px;
                animation: tbSlideIn 0.3s ease-out;
                border-left: 5px solid rgba(255,255,255,0.5);
            ">
                <div style="display: flex; gap: 15px; align-items: flex-start;">
                    <div style="font-size: 28px; flex-shrink: 0;">⚠️</div>
                    <div style="flex: 1;">
                        <strong style="display: block; margin-bottom: 8px; font-size: 16px;">
                            SQL Injection Detected!
                        </strong>
                        <p style="margin: 6px 0; font-size: 13px; opacity: 0.95;">
                            Confidence: <strong>${(result.confidence * 100).toFixed(1)}%</strong>
                        </p>
                        <p style="margin: 6px 0; font-size: 12px; opacity: 0.9;">
                            This malicious request has been blocked by Tech Bazzar.
                        </p>
                    </div>
                    <button id="tbClose" style="
                        background: none;
                        border: none;
                        color: white;
                        font-size: 24px;
                        cursor: pointer;
                        padding: 0;
                        opacity: 0.7;
                        transition: opacity 0.2s;
                    ">×</button>
                </div>
            </div>
            <style>
                @keyframes tbSlideIn {
                    from {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            </style>
        `;

        document.body.appendChild(banner);

        banner.querySelector('#tbClose').addEventListener('click', () => {
            banner.remove();
        });

        setTimeout(() => {
            const el = document.getElementById('tech-bazzar-warning');
            if (el) el.remove();
        }, 6000);
    }

    /**
     * Log threat to background service
     */
    async logThreat(result, input) {
        chrome.runtime.sendMessage({
            action: 'logThreat',
            data: {
                query: input,
                confidence: result.confidence,
                is_malicious: result.is_malicious,
                risk_level: result.risk_level || 'UNKNOWN'
            }
        });
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new PageMonitor();
    });
} else {
    new PageMonitor();
}
