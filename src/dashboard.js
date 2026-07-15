/**
 * Tech Bazzar - Dashboard Script
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('[Dashboard] Loaded');
    loadDashboardData();
    setInterval(loadDashboardData, 5000); // Refresh every 5 seconds
});

function loadDashboardData() {
    chrome.runtime.sendMessage({ action: 'getStats' }, (result) => {
        if (result && result.threats) {
            const threats = result.threats;
            const malicious = threats.filter(t => t.is_malicious).length;
            const safe = threats.length - malicious;

            // Update stats
            document.getElementById('totalThreats').textContent = threats.length;
            document.getElementById('maliciousCount').textContent = malicious;
            document.getElementById('safeCount').textContent = safe;

            // Update table
            updateThreatsTable(threats);
        }
    });
}

function updateThreatsTable(threats) {
    const tbody = document.getElementById('threatsTableBody');
    
    if (threats.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; color: #636e72;">
                    No threats detected yet
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = threats.slice(-20).reverse().map(threat => `
        <tr class="${threat.is_malicious ? 'danger' : 'safe'}">
            <td>${new Date(threat.timestamp).toLocaleTimeString()}</td>
            <td>${(threat.confidence * 100).toFixed(1)}%</td>
            <td>${threat.is_malicious ? '🚫 Malicious' : '✓ Safe'}</td>
            <td><code>${threat.query.substring(0, 40)}${threat.query.length > 40 ? '...' : ''}</code></td>
        </tr>
    `).join('');
}
