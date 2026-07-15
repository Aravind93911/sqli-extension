/**
 * Local Logging Utilities
 */

class Logger {
    static log(source, message, data = null) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${source}] ${message}`;
        
        if (data) {
            console.log(logMessage, data);
        } else {
            console.log(logMessage);
        }
    }

    static error(source, message, error = null) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${source}] ERROR: ${message}`;
        
        if (error) {
            console.error(logMessage, error);
        } else {
            console.error(logMessage);
        }
    }

    static warn(source, message, data = null) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${source}] WARNING: ${message}`;
        
        if (data) {
            console.warn(logMessage, data);
        } else {
            console.warn(logMessage);
        }
    }
}
