/**
 * Tech Bazzar - Background Service Worker
 * Manages API communication and threat logging
 */

class BackgroundManager {
    constructor() {
        this.apiUrl = 'https://api.techbazzar.com';
        this.companyApiKey = null;
        this.init();
    }

    init() {
        console.log('[Tech Bazzar] Background service worker initialized');
        
        // Listen for messages from content scripts and popup
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true;
        });

        // Load API key from storage
        this.loadApiKey();

        // Set up periodic cleanup
        setInterval(() => this.cleanupOldThreats(), 3600000); // Every hour
    }

    /**
     * Handle incoming messages
     */
    async handleMessage(request, sender, sendResponse) {
        try {
            console.log('[Background] Message:', request.action);

            switch(request.action) {
                case 'analyzeSQLi':
                    const result = await this.analyzeSQLi(request.data);
                    sendResponse(result);
                    break;

                case 'logThreat':
                    await this.logThreat(request.data, sender);
                    sendResponse({ success: true });
                    break;

                case 'getSettings':
                    const settings = await this.getSettings();
                    sendResponse(settings);
                    break;

                case 'updateSettings':
                    await this.updateSettings(request.data);
                    sendResponse({ success: true });
                    break;

                case 'getStats':
                    const stats = await this.getStats();
                    sendResponse(stats);
                    break;

                case 'clearLogs':
                    await this.clearLogs();
                    sendResponse({ success: true });
                    break;

                case 'setApiKey':
                    await this.setApiKey(request.apiKey);
                    sendResponse({ success: true });
                    break;

                default:
                    sendResponse({ error: 'Unknown action' });
            }
        } catch (error) {
            console.error('[Background] Error:', error);
            sendResponse({ error: error.message });
        }
    }

    /**
     * Analyze SQL injection by calling backend API
     */
    async analyzeSQLi(data) {
        try {
            if (!this.companyApiKey) {
                console.warn('[Background] No API key configured');
                return { is_malicious: false, error: 'Not configured' };
            }

            console.log('[Background] Sending to API:', data);

            const response = await fetch(`${this.apiUrl}/api/detect-sqli`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.companyApiKey}`
                },
                body: JSON.stringify({
                    query: data.query,
                    url: data.url,
                    timestamp: new Date().toISOString()
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const result = await response.json();
            console.log('[Background] API Response:', result);
            return result;

        } catch (error) {
            console.error('[Background] Analysis failed:', error);
            return { 
                is_malicious: false, 
                error: error.message,
                local_analysis: this.localAnalysis(data.query)
            };
        }
    }

    /**
     * Local analysis (fallback if API is down)
     */
    localAnalysis(query) {
        const suspiciousPatterns = [
            /(\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b)/i,
            /(\bUNION\b.*\bSELECT\b)/i,
            /[';].*(-{2}|\/\*)/,
            /(\bOR\b\s+['"]?[^']*?['"]?\s*=\s*['"][^'"]*['"])/i,
            /xp_cmdshell/i,
        ];

        let suspicionScore = 0;
        suspiciousPatterns.forEach(pattern => {
            if (pattern.test(query)) suspicionScore++;
        });

        return suspicionScore > 2;
    }

    /**
     * Log threat to backend
     */
    async logThreat(threatData, sender) {
        try {
            console.log('[Background] Logging threat');

            const threats = await this.getThreatsFromStorage();
            threats.push({
                ...threatData,
                timestamp: new Date().toISOString(),
                senderUrl: sender.url,
                senderId: sender.tab?.id
            });

            // Keep only last 1000 threats locally
            const limitedThreats = threats.slice(-1000);
            await chrome.storage.local.set({ threats: limitedThreats });

            // Send to backend if API key exists
            if (this.companyApiKey) {
                await fetch(`${this.apiUrl}/api/log-threat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.companyApiKey}`
                    },
                    body: JSON.stringify({
                        ...threatData,
                        url: sender.url,
                        timestamp: new Date().toISOString()
                    })
                }).catch(err => console.error('[Background] Failed to log to backend:', err));
            }

        } catch (error) {
            console.error('[Background] Logging failed:', error);
        }
    }

    /**
     * Get settings from Chrome storage
     */
    async getSettings() {
        return new Promise((resolve) => {
            chrome.storage.sync.get([
                'apiKey',
                'blockAttacks',
                'enableNotifications',
                'notificationLevel'
            ], (result) => {
                resolve({
                    apiKey: result.apiKey || '',
                    blockAttacks: result.blockAttacks !== false,
                    enableNotifications: result.enableNotifications !== false,
                    notificationLevel: result.notificationLevel || 'high'
                });
            });
        });
    }

    /**
     * Update settings
     */
    async updateSettings(settings) {
        return new Promise((resolve) => {
            chrome.storage.sync.set(settings, () => {
                console.log('[Background] Settings updated');
                resolve();
            });
        });
    }

    /**
     * Get statistics
     */
    async getStats() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['threats'], (result) => {
                const threats = result.threats || [];
                const blocked = threats.filter(t => t.is_malicious).length;
                
                resolve({
                    total: threats.length,
                    blocked: blocked,
                    threats: threats
                });
            });
        });
    }

    /**
     * Clear all logs
     */
    async clearLogs() {
        return new Promise((resolve) => {
            chrome.storage.local.set({ threats: [] }, () => {
                console.log('[Background] Logs cleared');
                resolve();
            });
        });
    }

    /**
     * Set API key
     */
    async setApiKey(apiKey) {
        return new Promise((resolve) => {
            chrome.storage.sync.set({ apiKey }, () => {
                this.companyApiKey = apiKey;
                console.log('[Background] API key set');
                resolve();
            });
        });
    }

    /**
     * Load API key from storage
     */
    async loadApiKey() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['apiKey'], (result) => {
                this.companyApiKey = result.apiKey || null;
                console.log('[Background] API key loaded:', !!this.companyApiKey);
                resolve();
            });
        });
    }

    /**
     * Get threats from storage
     */
    async getThreatsFromStorage() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['threats'], (result) => {
                resolve(result.threats || []);
            });
        });
    }

    /**
     * Clean up old threats (older than 7 days)
     */
    async cleanupOldThreats() {
        const threats = await this.getThreatsFromStorage();
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        
        const recentThreats = threats.filter(threat => {
            return new Date(threat.timestamp).getTime() > sevenDaysAgo;
        });

        await chrome.storage.local.set({ threats: recentThreats });
        console.log('[Background] Cleanup complete. Kept', recentThreats.length, 'threats');
    }
}

// Initialize background manager
const bgManager = new BackgroundManager();
