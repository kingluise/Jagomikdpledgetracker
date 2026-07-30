// =====================================================
// CONFIGURATION
// =====================================================

const API_BASE_URL = 'https://jagompledge-001-site1.dtempurl.com/api';

// =====================================================
// INITIALIZATION - Load data when page loads
// =====================================================

document.addEventListener('DOMContentLoaded', function() {
    loadData();
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
        const response = await fetch(`${API_BASE_URL}/Admin/summary`);
        if (!response.ok) throw new Error('Failed to load summary');
        
        const data = await response.json();

        const remaining = (typeof data.remaining === 'number')
            ? data.remaining
            : Math.max(data.totalPledged - data.totalReceived, 0);
        
        animateNumber('totalPledged', data.totalPledged);
        animateNumber('totalReceived', data.totalReceived);
        animateNumber('remaining', remaining);
        
    } catch (error) {
        console.error('Error loading summary:', error);
        showToast('Failed to load summary data', 'error');
    }
}

async function loadPledges() {
    try {
        const response = await fetch(`${API_BASE_URL}/Admin/pledges`);
        if (!response.ok) throw new Error('Failed to load pledges');
        
        const data = await response.json();
        renderTable(data);
        
        // Update total members count (plain integer, no currency)
        animateNumber('totalMembers', data.length, '', formatInteger);
        
    } catch (error) {
        console.error('Error loading pledges:', error);
        showToast('Failed to load pledges data', 'error');
    }
}

// =====================================================
// NEW: COUNT-UP ANIMATION
// =====================================================

function animateNumber(elementId, end, suffix = '', formatter = formatCurrency) {
    const element = document.getElementById(elementId);
    if (!element) return;

    // Read whatever is currently displayed as the animation's start point,
    // so a refresh counts from the old value instead of always from 0.
    const currentText = element.textContent.replace(/[^0-9.]/g, '');
    const start = parseFloat(currentText) || 0;

    const duration = 1200;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = start + (end - start) * eased;

        element.textContent = formatter(current) + suffix;

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = formatter(end) + suffix;
            element.classList.remove('counted');
            // Force reflow so the pop animation can replay on refresh
            void element.offsetWidth;
            element.classList.add('counted');
        }
    }

    requestAnimationFrame(update);
}

// =====================================================
// RENDER TABLE (No Actions)
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
    let index = 1;
    
    data.forEach((item, i) => {
        const statusClass = item.status === 'Fully Paid' ? 'status-paid' : 
                           item.status === 'Partial' ? 'status-partial' : 'status-unpaid';

        // Stagger each row's entrance animation slightly, capped so a very
        // long list doesn't take forever to finish appearing.
        const delay = Math.min(i * 0.05, 1);
        
        html += `
            <tr style="animation-delay:${delay}s">
                <td>${index++}</td>
                <td><strong>${escapeHtml(item.memberName)}</strong></td>
                <td>${formatCurrency(item.totalPledged)}</td>
                <td>${formatCurrency(item.totalPaid)}</td>
                <td>${formatCurrency(item.balance)}</td>
                <td><span class="status-badge ${statusClass}">${item.status}</span></td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// =====================================================
// PDF EXPORT
// =====================================================

async function exportPDF() {
    try {
        showToast('Generating PDF...', 'info');
        
        const response = await fetch(`${API_BASE_URL}/Admin/pledges`);
        if (!response.ok) throw new Error('Failed to load data');
        
        const data = await response.json();
        
        if (data.length === 0) {
            showToast('No data to export', 'error');
            return;
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape', 'mm', 'a4');
        
        doc.setFontSize(18);
        doc.setTextColor(26, 35, 126);
        doc.text('Church Pledge Tracker - Report', 14, 20);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 27);
        
        const totalPledged = data.reduce((sum, item) => sum + item.totalPledged, 0);
        const totalPaid = data.reduce((sum, item) => sum + item.totalPaid, 0);
        const totalBalance = totalPledged - totalPaid;
        
        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.text(`Total Pledged: ₦${totalPledged.toFixed(2)}`, 14, 35);
        doc.text(`Total Received: ₦${totalPaid.toFixed(2)}`, 80, 35);
        doc.text(`Total Balance: ₦${totalBalance.toFixed(2)}`, 150, 35);
        doc.text(`Total Members: ${data.length}`, 220, 35);
        
        const tableData = data.map((item, index) => [
            index + 1,
            item.memberName,
            `₦${item.totalPledged.toFixed(2)}`,
            `₦${item.totalPaid.toFixed(2)}`,
            `₦${item.balance.toFixed(2)}`,
            item.status
        ]);
        
        doc.autoTable({
            startY: 42,
            head: [['#', 'Member Name', 'Pledged', 'Paid', 'Balance', 'Status']],
            body: tableData,
            theme: 'striped',
            headStyles: {
                fillColor: [26, 35, 126],
                textColor: [255, 255, 255],
                fontSize: 10
            },
            bodyStyles: {
                fontSize: 9
            },
            columnStyles: {
                0: { cellWidth: 15 },
                1: { cellWidth: 60 },
                2: { cellWidth: 30 },
                3: { cellWidth: 30 },
                4: { cellWidth: 30 },
                5: { cellWidth: 30 }
            }
        });
        
        doc.save('Pledge_Report.pdf');
        showToast('PDF exported successfully!', 'success');
        
    } catch (error) {
        console.error('Error exporting PDF:', error);
        showToast('Failed to export PDF', 'error');
    }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

function formatCurrency(amount) {
    return `₦${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

function formatInteger(amount) {
    return Math.round(amount).toString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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

function refreshData() {
    loadData();
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s ease';
        setTimeout(() => {
            toast.remove();
        }, 500);
    }, 4000);
}