// =====================================================
// CONFIGURATION
// =====================================================

const API_BASE_URL = 'https://jagompledge-001-site1.dtempurl.com/api';

// =====================================================
// INITIALIZATION - Load data when page loads
// =====================================================

document.addEventListener('DOMContentLoaded', function() {
    loadData();
    loadMemberDropdown();
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
        
        document.getElementById('totalPledged').textContent = formatCurrency(data.totalPledged);
        document.getElementById('totalReceived').textContent = formatCurrency(data.totalReceived);
        document.getElementById('remaining').textContent = formatCurrency(data.remaining);
        
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
        
        // Update total members count
        document.getElementById('totalMembers').textContent = data.length;
        
    } catch (error) {
        console.error('Error loading pledges:', error);
        showToast('Failed to load pledges data', 'error');
    }
}

async function loadMemberDropdown() {
    try {
        const response = await fetch(`${API_BASE_URL}/Admin/pledges`);
        if (!response.ok) throw new Error('Failed to load members');
        
        const data = await response.json();
        const select = document.getElementById('paymentMemberSelect');
        
        // Clear existing options (keep first one)
        select.innerHTML = '<option value="">-- Select Member --</option>';
        
        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item.memberId;
            option.textContent = item.memberName;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error loading member dropdown:', error);
        showToast('Failed to load member list', 'error');
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
    let index = 1;
    
    data.forEach(item => {
        const statusClass = item.status === 'Fully Paid' ? 'status-paid' : 
                           item.status === 'Partial' ? 'status-partial' : 'status-unpaid';
        
        html += `
            <tr data-membername="${item.memberName.toLowerCase()}" data-status="${item.status}">
                <td>${index++}</td>
                <td><strong>${escapeHtml(item.memberName)}</strong></td>
                <td>${formatCurrency(item.totalPledged)}</td>
                <td>${formatCurrency(item.totalPaid)}</td>
                <td>${formatCurrency(item.balance)}</td>
                <td><span class="status-badge ${statusClass}">${item.status}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-sm-success" onclick="openPaymentModal(${item.memberId})">💰 Pay</button>
                        <button class="btn btn-sm btn-sm-info" onclick="openEditMemberModal(${item.memberId}, '${escapeHtml(item.memberName)}')">✏️ Name</button>
                        <button class="btn btn-sm btn-sm-warning" onclick="openEditPledgeModal(${item.pledgeId}, '${escapeHtml(item.memberName)}', ${item.totalPledged})">📝 Pledge</button>
                        <button class="btn btn-sm btn-sm-danger" onclick="deleteMember(${item.memberId}, '${escapeHtml(item.memberName)}')">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// =====================================================
// FILTER TABLE
// =====================================================

function filterTable() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const rows = document.querySelectorAll('#pledgeTableBody tr');
    
    rows.forEach(row => {
        const name = row.getAttribute('data-membername') || '';
        const status = row.getAttribute('data-status') || '';
        
        const matchesSearch = name.includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || status === statusFilter;
        
        row.style.display = (matchesSearch && matchesStatus) ? '' : 'none';
    });
}

// =====================================================
// ADD MEMBER
// =====================================================

function openAddMemberModal() {
    document.getElementById('memberName').value = '';
    document.getElementById('initialPledge').value = '';
    document.getElementById('addMemberModal').classList.add('active');
}

async function submitAddMember(event) {
    event.preventDefault();
    
    const name = document.getElementById('memberName').value.trim();
    const initialPledge = parseFloat(document.getElementById('initialPledge').value);
    
    if (!name || isNaN(initialPledge) || initialPledge < 0) {
        showToast('Please enter valid name and pledge amount', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/Admin/member`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                initialPledge: initialPledge
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create member');
        }
        
        closeModal('addMemberModal');
        showToast('Member created successfully!', 'success');
        refreshData();
        
    } catch (error) {
        console.error('Error creating member:', error);
        showToast(error.message || 'Failed to create member', 'error');
    }
}

// =====================================================
// EDIT MEMBER
// =====================================================

function openEditMemberModal(id, name) {
    document.getElementById('editMemberId').value = id;
    document.getElementById('editMemberName').value = name;
    document.getElementById('editMemberModal').classList.add('active');
}

async function submitEditMember(event) {
    event.preventDefault();
    
    const id = document.getElementById('editMemberId').value;
    const name = document.getElementById('editMemberName').value.trim();
    
    if (!name) {
        showToast('Please enter a valid name', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/Admin/member/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: name })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update member');
        }
        
        closeModal('editMemberModal');
        showToast('Member updated successfully!', 'success');
        refreshData();
        
    } catch (error) {
        console.error('Error updating member:', error);
        showToast(error.message || 'Failed to update member', 'error');
    }
}

// =====================================================
// EDIT PLEDGE
// =====================================================

function openEditPledgeModal(pledgeId, memberName, amount) {
    document.getElementById('editPledgeId').value = pledgeId;
    document.getElementById('editPledgeMemberName').value = memberName;
    document.getElementById('editPledgeAmount').value = amount;
    document.getElementById('editPledgeModal').classList.add('active');
}

async function submitEditPledge(event) {
    event.preventDefault();
    
    const id = document.getElementById('editPledgeId').value;
    const amount = parseFloat(document.getElementById('editPledgeAmount').value);
    
    if (isNaN(amount) || amount < 0) {
        showToast('Please enter a valid pledge amount', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/Admin/pledge/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ amount: amount })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update pledge');
        }
        
        closeModal('editPledgeModal');
        showToast('Pledge updated successfully!', 'success');
        refreshData();
        
    } catch (error) {
        console.error('Error updating pledge:', error);
        showToast(error.message || 'Failed to update pledge', 'error');
    }
}

// =====================================================
// DELETE MEMBER
// =====================================================

async function deleteMember(id, name) {
    if (!confirm(`Are you sure you want to delete "${name}"? This will also delete their pledge and all payments.`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/Admin/member/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete member');
        }
        
        showToast(`Member "${name}" deleted successfully!`, 'success');
        refreshData();
        
    } catch (error) {
        console.error('Error deleting member:', error);
        showToast(error.message || 'Failed to delete member', 'error');
    }
}

// =====================================================
// RECORD PAYMENT
// =====================================================

function openPaymentModal(memberId) {
    // Reset form
    document.getElementById('paymentAmountPaid').value = '';
    document.getElementById('paymentTotalBalance').value = '';
    
    // Set the selected member
    document.getElementById('paymentMemberSelect').value = memberId;
    
    // Load member details
    loadMemberPaymentDetails();
    
    document.getElementById('paymentModal').classList.add('active');
}

async function loadMemberPaymentDetails() {
    const memberId = document.getElementById('paymentMemberSelect').value;
    
    if (!memberId) {
        document.getElementById('paymentPledgeAmount').value = '';
        document.getElementById('paymentOutstandingBalance').value = '';
        document.getElementById('paymentTotalBalance').value = '';
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/Admin/member/${memberId}`);
        if (!response.ok) throw new Error('Failed to load member details');
        
        const data = await response.json();
        
        document.getElementById('paymentPledgeAmount').value = formatCurrency(data.pledgeAmount);
        document.getElementById('paymentOutstandingBalance').value = formatCurrency(data.outstandingBalance);
        
        // Reset calculated fields
        document.getElementById('paymentAmountPaid').value = '';
        document.getElementById('paymentTotalBalance').value = '';
        
    } catch (error) {
        console.error('Error loading member details:', error);
        showToast('Failed to load member details', 'error');
    }
}

function calculatePaymentBalance() {
    const outstandingText = document.getElementById('paymentOutstandingBalance').value;
    const amountPaid = parseFloat(document.getElementById('paymentAmountPaid').value);
    
    if (!outstandingText) {
        document.getElementById('paymentTotalBalance').value = '';
        return;
    }
    
    const outstanding = parseFloat(outstandingText.replace(/[$,]/g, ''));
    
    if (isNaN(outstanding) || isNaN(amountPaid) || amountPaid <= 0) {
        document.getElementById('paymentTotalBalance').value = formatCurrency(outstanding);
        return;
    }
    
    const newBalance = outstanding - amountPaid;
    document.getElementById('paymentTotalBalance').value = formatCurrency(newBalance >= 0 ? newBalance : 0);
}

async function submitPayment(event) {
    event.preventDefault();
    
    const memberId = document.getElementById('paymentMemberSelect').value;
    const amountPaid = parseFloat(document.getElementById('paymentAmountPaid').value);
    
    if (!memberId) {
        showToast('Please select a member', 'error');
        return;
    }
    
    if (isNaN(amountPaid) || amountPaid <= 0) {
        showToast('Please enter a valid payment amount', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/Admin/payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                memberId: parseInt(memberId),
                amountPaid: amountPaid
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to record payment');
        }
        
        closeModal('paymentModal');
        showToast('Payment recorded successfully!', 'success');
        refreshData();
        
    } catch (error) {
        console.error('Error recording payment:', error);
        showToast(error.message || 'Failed to record payment', 'error');
    }
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
        
        // Create PDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape', 'mm', 'a4');
        
        // Add title
        doc.setFontSize(18);
        doc.setTextColor(26, 35, 126);
        doc.text('Church Pledge Tracker - Report', 14, 20);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 27);
        
        // Add summary
        const totalPledged = data.reduce((sum, item) => sum + item.totalPledged, 0);
        const totalPaid = data.reduce((sum, item) => sum + item.totalPaid, 0);
        const totalBalance = totalPledged - totalPaid;
        
        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.text(`Total Pledged: $${totalPledged.toFixed(2)}`, 14, 35);
        doc.text(`Total Received: $${totalPaid.toFixed(2)}`, 80, 35);
        doc.text(`Total Balance: $${totalBalance.toFixed(2)}`, 150, 35);
        doc.text(`Total Members: ${data.length}`, 220, 35);
        
        // Prepare table data
        const tableData = data.map((item, index) => [
            index + 1,
            item.memberName,
            `$${item.totalPledged.toFixed(2)}`,
            `$${item.totalPaid.toFixed(2)}`,
            `$${item.balance.toFixed(2)}`,
            item.status
        ]);
        
        // Add table
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
        
        // Save PDF
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
    return `₦${amount.toFixed(2)}`;
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

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function refreshData() {
    loadData();
    loadMemberDropdown();
}

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