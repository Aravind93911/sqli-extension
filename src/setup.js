/**
 * Tech Bazzar - Setup Script
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('[Setup] Loaded');
    
    loadSavedSettings();
    setupEventListeners();
});

function loadSavedSettings() {
    chrome.runtime.sendMessage({ action: 'getSettings' }, (result) => {
        if (result) {
            document.getElementById('apiKey').value = result.apiKey || '';
            document.getElementById('blockAttacksToggle').checked = result.blockAttacks !== false;
            document.getElementById('enableNotificationsToggle').checked = result.enableNotifications !== false;
            document.getElementById('notificationLevel').value = result.notificationLevel || 'medium';
        }
    });
}

function setupEventListeners() {
    // Form submission
    document.getElementById('setupForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        saveSettings();
    });

    // Test API button
    document.getElementById('testApiBtn').addEventListener('click', testApiConnection);

    // Clear logs button
    document.getElementById('clearLogsBtn').addEventListener('click', () => {
        if (confirm('Are you sure? This cannot be undone.')) {
            chrome.runtime.sendMessage({ action: 'clearLogs' }, () => {
                showMessage('Logs cleared successfully', 'success');
            });
        }
    });

    // Export logs button
    document.getElementById('exportLogsBtn').addEventListener('click', exportLogs);
}

function saveSettings() {
    const settings = {
        apiKey: document.getElementById('apiKey').value,
        blockAttacks: document.getElementById('blockAttacksToggle').checked,
        enableNotifications: document.getElementById('enableNotificationsToggle').checked,
        notificationLevel: document.getElementById('notificationLevel').value
    };

    chrome.runtime.sendMessage(
        { action: 'updateSettings', data: settings },
        () => {
            showMessage('Settings saved successfully!', 'success');
        }
    );
}

async function testApiConnection() {
    const apiKey = document.getElementById('apiKey').value;
    
    if (!apiKey) {
        showMessage('Please enter an API key', 'error');
        return;
    }

    const resultDiv = document.getElementById('testResult');
    resultDiv.innerHTML = '<p>Testing...</p>';
    resultDiv.style.display = 'block';

    try {
        const response = await fetch('https://api.techbazzar.com/health', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (response.ok) {
            resultDiv.innerHTML = '<p style="color: green;">✓ Connection successful!</p>';
        } else {
            resultDiv.innerHTML = '<p style="color: red;">✗ Invalid API key</p>';
        }
    } catch (error) {
        resultDiv.innerHTML = `<p style="color: red;">✗ Connection failed: ${error.message}</p>`;
    }
}

function exportLogs() {
    chrome.runtime.sendMessage({ action: 'getStats' }, (result) => {
        if (result && result.threats) {
            const threats = result.threats;
            const csv = convertToCSV(threats);
            downloadCSV(csv, 'tech-bazzar-threats.csv');
        }
    });
}

function convertToCSV(threats) {
    const headers = ['Timestamp', 'Confidence', 'Is Malicious', 'Query', 'URL'];
    const rows = threats.map(t => [
        new Date(t.timestamp).toISOString(),
        (t.confidence * 100).toFixed(1) + '%',
        t.is_malicious ? 'Yes' : 'No',
        '"' + (t.query || '').replace(/"/g, '""') + '"',
        t.senderUrl || ''
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
}

function downloadCSV(csv, filename) {
    const link = document.createElement('a');
    link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    link.download = filename;
    link.click();
}

function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.style.display = 'block';
    messageDiv.style.background = type === 'success' ? '#d4edda' : '#f8d7da';
    messageDiv.style.color = type === 'success' ? '#155724' : '#721c24';

    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 3000);
}
