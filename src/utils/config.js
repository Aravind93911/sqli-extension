/**
 * Configuration
 */

const CONFIG = {
    // API Endpoints
    API_BASE: 'https://api.techbazzar.com',
    API_DETECT: '/api/detect-sqli',
    API_LOG: '/api/log-threat',
    API_ANALYTICS: '/api/analytics',
    
    // Behavior
    BLOCK_ATTACKS: true,
    ENABLE_NOTIFICATIONS: true,
    NOTIFICATION_LEVEL: 'medium',
    
    // Storage
    STORAGE_LIMIT: 1000,
    STORAGE_RETENTION_DAYS: 7,
    
    // Detection
    CONFIDENCE_THRESHOLD: 0.5,
    
    // Timeouts
    API_TIMEOUT: 5000,
    ANALYSIS_TIMEOUT: 3000,
    
    // UI
    WARNING_DURATION: 6000,
    STAT_REFRESH_INTERVAL: 5000,
};

export default CONFIG;
