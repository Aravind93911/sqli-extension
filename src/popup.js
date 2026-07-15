/**
 * Tech Bazzar - Popup Script
 */

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Popup] Loaded');

    // Load statistics
    loadStats();

    // Load settings
    loadSettings();

    // Setup event listeners
    setupEventListeners();

    // Refresh stats every 5 seconds
    setInterval(loadStats, 5000);
});

async function loadStats() {
    chrome.runtime.sendMessage({ action: 'getStats' }, (result) => {
        if (result && result.threats) {
            const threats = result.threats || [];
            const malicious = threats.filter(t => t.is_malicious).length;

            document.getElementById('todayThreats').textContent = threats.length;
            document.getElementById('blockedCount').textContent = malicious;

            // Show threats if any
            if (threats.length > 0) {
                document.getElementById('threatsList').style.display = 'block';
                const container = document.getElementById('threatsContainer');
                container.innerHTML = '';

                threats.slice(-5).forEach(threat => {
                    const item = document.createElement('div');
                    item.className = 'threat-item';
                    const time = new Date(threat.timestamp).toLocaleTimeString();
                    const conf = Math.round(threat.confidence * 100);
                    item.innerHTML = `<strong>${conf}%</strong> - ${time}`;
                    container.appendChild(item);
                });
            } else {
                document.getElementById('threatsList').style.display = 'none';
            }
        }
    });
}

function loadSettings() {
    chrome.runtime.sendMessage({ action: 'getSettings' }, (result) => {
        if (result) {
            document.getElementById('blockAttacks').checked = result.blockAttacks !== false;
            document.getElementById('enableNotifications').checked = result.enableNotifications !== false;
        }
    });
}

function setupEventListeners() {
    // Block attacks toggle
    document.getElementById('blockAttacks').addEventListener('change', (e) => {
        chrome.runtime.sendMessage({
            action: 'updateSettings',
            data: { blockAttacks: e.target.checked }
        });
    });

    // Enable notifications toggle
    document.getElementById('enableNotifications').addEventListener('change', (e) => {
        chrome.runtime.sendMessage({
            action: 'updateSettings',
            data: { enableNotifications: e.target.checked }
        });
    });

    // Open dashboard
    document.getElementById('openDashboard').addEventListener('click', () => {
        chrome.tabs.create({
            url: chrome.runtime.getURL('src/dashboard.html')
        });
        window.close();
    });

    // Open setup
    document.getElementById('openSetup').addEventListener('click', () => {
        chrome.tabs.create({
            url: chrome.runtime.getURL('src/setup.html')
        });
        window.close();
    });
}
