/**
 * API Helper Functions
 */

const API_BASE = 'https://api.techbazzar.com';

class TechBazzarAPI {
    static async detectSQLi(query, url, apiKey) {
        try {
            const response = await fetch(`${API_BASE}/api/detect-sqli`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    query,
                    url,
                    timestamp: new Date().toISOString()
                })
            });

            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Detection API error:', error);
            throw error;
        }
    }

    static async logThreat(threatData, apiKey) {
        try {
            const response = await fetch(`${API_BASE}/api/log-threat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(threatData)
            });

            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Logging API error:', error);
            // Don't throw, logging failures shouldn't break detection
        }
    }

    static async getAnalytics(apiKey) {
        try {
            const response = await fetch(`${API_BASE}/api/analytics`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });

            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Analytics API error:', error);
            throw error;
        }
    }
}
