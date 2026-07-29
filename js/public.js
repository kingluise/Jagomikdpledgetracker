// =====================================================
// CONFIGURATION
// =====================================================

const API_BASE_URL = 'https://jagompledge-001-site1.dtempurl.com/api';
const REFRESH_INTERVAL = 30000; // 30 seconds

// =====================================================
// INITIALIZATION - Load data when page loads
// =====================================================

document.addEventListener('DOMContentLoaded', function() {
    loadData();
    startAutoRefresh();
});

// =====================================================
// DATA LOADING
// =====================================================

async function loadData() {
    try {
        showLoading(true);
        await Promise.all([
            loadSummary(),
            loadPledges()
        ]);
    } catch (error) {
        console.error('Error loading data:', error);
        showToast('Failed to load data. Please refresh.', 'error');
    } finally {
        showLoading(false);
    }
}

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

async function loadPledges() {
    try {
        const response = await fetch(`${API_BASE_URL}/Public/pledges`);
        if (!response.ok) throw new Error('Failed to load pledges');
        
        const data = await response.json();
        renderTable(data);
        
    } catch (error) {
        console.error('Error loading pledges:', error);
        showToast('Failed to load pledges data', 'error');
    }
}

// =====================================================
// RENDER TABLE
// =====================================================

function renderTable(data) {
    const tbody = document.getElementById('pledgeTableBody');
    const emptyState = document.getElementById('emptyState');
    const tableWrapper = document.getElementById('tableWrapper');
    
    if (data.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        tableWrapper.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    tableWrapper.style.display = 'block';
    
    let html = '';
    
    data.forEach(item => {
        html += `
            <tr>
                <td>${item.serialNumber}</td>
                <td>${formatCurrency(item.totalPledged)}</td>
                <td>${formatCurrency(item.totalPaid)}</td>
                <td>${formatCurrency(item.balance)}</td>
                <td>
                    <div class="progress-container">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${item.percentagePaid}%;"></div>
                        </div>
                        <span class="progress-text">${item.percentagePaid}%</span>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    
    // Animate progress bars after a small delay
    setTimeout(() => {
        document.querySelectorAll('.progress-fill').forEach(bar => {
            const width = bar.style.width;
            bar.style.width = '0%';
            setTimeout(() => {
                bar.style.width = width;
            }, 100);
        });
    }, 200);
}

// =====================================================
// AUTO REFRESH
// =====================================================

function startAutoRefresh() {
    setInterval(() => {
        updateRefreshIndicator();
        loadData();
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

function showLoading(show) {
    const loading = document.getElementById('loadingMessage');
    const tableWrapper = document.getElementById('tableWrapper');
    
    if (show) {
        loading.style.display = 'block';
        tableWrapper.style.display = 'none';
    } else {
        loading.style.display = 'none';
        tableWrapper.style.display = 'block';
    }
}