// =====================================================
// CONFIGURATION
// =====================================================

const API_BASE_URL = 'https://jagompledge-001-site1.dtempurl.com/api';
const REFRESH_INTERVAL = 30000; // 30 seconds

// =====================================================
// INITIALIZATION - Load data when page loads
// =====================================================

document.addEventListener('DOMContentLoaded', function() {
    loadSummary();
    startAutoRefresh();
});

// =====================================================
// LOAD SUMMARY ONLY
// =====================================================

async function loadSummary() {
    try {
        const response = await fetch(`${API_BASE_URL}/Public/summary`);
        if (!response.ok) throw new Error('Failed to load summary');
        
        const data = await response.json();
        
        document.getElementById('totalPledged').textContent = formatCurrency(data.totalPledged);
        document.getElementById('totalReceived').textContent = formatCurrency(data.totalReceived);
        document.getElementById('remaining').textContent = formatCurrency(data.remaining);
        
    } catch (error) {
        console.error('Error loading summary:', error);
        document.getElementById('totalPledged').textContent = 'Error';
        document.getElementById('totalReceived').textContent = 'Error';
        document.getElementById('remaining').textContent = 'Error';
    }
}

// =====================================================
// AUTO REFRESH
// =====================================================

function startAutoRefresh() {
    setInterval(() => {
        updateRefreshIndicator();
        loadSummary();
    }, REFRESH_INTERVAL);
}

function updateRefreshIndicator() {
    const indicator = document.getElementById('refreshIndicator');
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    indicator.textContent = `Auto-refreshes every 30s • Last update: ${timeString}`;
    
    // Flash effect
    indicator.style.color = '#1a237e';
    setTimeout(() => {
        indicator.style.color = '#999';
    }, 500);
}

// =====================================================
// TOAST NOTIFICATIONS
// =====================================================

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s ease';
        setTimeout(() => {
            toast.remove();
        }, 500);
    }, 4000);
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

function formatCurrency(amount) {
    return `₦${amount.toFixed(2)}`;
}