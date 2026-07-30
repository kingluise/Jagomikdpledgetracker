// =====================================================
// CONFIGURATION
// =====================================================

const API_BASE_URL = 'https://jagompledge-001-site1.dtempurl.com/api';
const REFRESH_INTERVAL = 30000; // 30 seconds
const GOAL_AMOUNT = 2105000; // ₦2,105,000 - EDIT THIS
const DEADLINE_DATE = new Date('2026-11-30T23:59:59');

const DONUT_CIRCUMFERENCE = 2 * Math.PI * 50; // r=50 in the SVG

let isFirstLoad = true;
let goalCelebrated = false;
let lastPercentage = 0;
let lastReceived = 0;

// =====================================================
// INITIALIZATION - Load data when page loads
// =====================================================

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('goalAmount').textContent = formatCurrency(GOAL_AMOUNT);
    setQrCode();
    showSkeletons();
    loadSummary();
    startAutoRefresh();
    startCountdown();
});

// =====================================================
// LOAD SUMMARY ONLY
// =====================================================

async function loadSummary() {
    try {
        const response = await fetch(`${API_BASE_URL}/Public/summary`);
        if (!response.ok) throw new Error('Failed to load summary');
        
        const data = await response.json();

        hideSkeletons();
        
        // Update existing cards
        document.getElementById('totalPledged').textContent = formatCurrency(data.totalPledged);
        document.getElementById('totalReceived').textContent = formatCurrency(data.totalReceived);

        // Outstanding balance = pledged amount not yet received.
        // Use the API's value if it sends one, otherwise calculate it.
        const outstandingBalance = (typeof data.remaining === 'number')
            ? data.remaining
            : Math.max(data.totalPledged - data.totalReceived, 0);
        document.getElementById('remaining').textContent = formatCurrency(outstandingBalance);
        
        // NEW: Animate count-up for pledged/received/remaining
        animateNumber('totalPledged', 0, data.totalPledged);
        animateNumber('totalReceived', 0, data.totalReceived);
        animateNumber('remaining', 0, outstandingBalance);
        
        // NEW: Calculate and update progress
        const percentage = Math.min((data.totalReceived / GOAL_AMOUNT) * 100, 100);
        animateNumber('progressPercent', 0, percentage, '%', formatNumber);
        animateProgressBar(percentage);
        updateMilestones(percentage);
        updateDonut(percentage);
        
        // NEW: Update remaining text
        const remaining = Math.max(GOAL_AMOUNT - data.totalReceived, 0);
        document.getElementById('remainingText').textContent = 
            remaining > 0 
                ? `₦${remaining.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} more to reach our goal!`
                : '🎉 Goal reached! Thank you everyone!';

        lastPercentage = percentage;
        lastReceived = data.totalReceived;

        if (percentage >= 100 && !goalCelebrated) {
            goalCelebrated = true;
            triggerConfetti();
        }

        if (isFirstLoad) {
            isFirstLoad = false;
            showToast(`Welcome! We're at ${percentage.toFixed(1)}% of our goal so far 💙`, 'info');
        }
        
    } catch (error) {
        console.error('Error loading summary:', error);
        hideSkeletons();
        document.getElementById('totalPledged').textContent = 'Error';
        document.getElementById('totalReceived').textContent = 'Error';
        document.getElementById('remaining').textContent = 'Error';
        showToast('Failed to load data. Please refresh.', 'error');
    }
}

// =====================================================
// NEW: SKELETON LOADING
// =====================================================

function showSkeletons() {
    ['totalPledged', 'totalReceived', 'remaining', 'progressPercent'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('skeleton');
    });
}

function hideSkeletons() {
    ['totalPledged', 'totalReceived', 'remaining', 'progressPercent'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('skeleton');
    });
}

// =====================================================
// NEW: ANIMATIONS
// =====================================================

function animateNumber(elementId, start, end, suffix = '', formatter = formatCurrency) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const duration = 1500;
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
        }
    }
    
    requestAnimationFrame(update);
}

function animateProgressBar(percentage) {
    const fill = document.getElementById('progressFill');
    if (!fill) return;
    
    setTimeout(() => {
        fill.style.width = percentage + '%';
    }, 200);
}

// =====================================================
// NEW: MILESTONE MARKERS
// =====================================================

function updateMilestones(percentage) {
    const milestones = [25, 50, 75, 100];
    const ids = ['milestone25', 'milestone50', 'milestone75', 'milestone100'];

    milestones.forEach((value, i) => {
        const el = document.getElementById(ids[i]);
        if (!el) return;
        if (percentage >= value) {
            el.classList.add('reached');
        } else {
            el.classList.remove('reached');
        }
    });
}

// =====================================================
// NEW: DONUT CHART
// =====================================================

function updateDonut(percentage) {
    const circle = document.getElementById('donutCircle');
    const text = document.getElementById('donutText');
    if (!circle || !text) return;

    const offset = DONUT_CIRCUMFERENCE * (1 - percentage / 100);

    setTimeout(() => {
        circle.style.strokeDashoffset = offset;
    }, 200);

    animateNumber('donutText', 0, percentage, '%', formatNumber);
}

// =====================================================
// NEW: CONFETTI CELEBRATION
// =====================================================

function triggerConfetti() {
    const canvas = document.getElementById('confettiCanvas');
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');

    const colors = ['#1a237e', '#2e7d32', '#e65100', '#6a1b9a'];
    const particles = [];

    for (let i = 0; i < 150; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: -20 - Math.random() * canvas.height * 0.5,
            size: 4 + Math.random() * 6,
            color: colors[Math.floor(Math.random() * colors.length)],
            speedY: 2 + Math.random() * 4,
            speedX: -2 + Math.random() * 4,
            rotation: Math.random() * 360,
            rotationSpeed: -6 + Math.random() * 12
        });
    }

    let frame = 0;
    const maxFrames = 260;

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.y += p.speedY;
            p.x += p.speedX;
            p.rotation += p.rotationSpeed;

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
            ctx.restore();
        });

        frame++;
        if (frame < maxFrames) {
            requestAnimationFrame(draw);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    requestAnimationFrame(draw);
    showToast('🎉 Goal reached! Thank you everyone!', 'success');
}

// =====================================================
// NEW: COUNTDOWN TO DEADLINE
// =====================================================

function startCountdown() {
    updateCountdown();
    setInterval(updateCountdown, 60000); // refresh every minute
}

function updateCountdown() {
    const el = document.getElementById('countdownAmount');
    if (!el) return;

    const now = new Date();
    const diffMs = DEADLINE_DATE - now;

    if (diffMs <= 0) {
        el.textContent = 'Ended';
        return;
    }

    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    el.textContent = `${days}d`;
}

// =====================================================
// NEW: SHARE PROGRESS
// =====================================================

function shareProgress() {
    const message = `We've raised ${formatCurrency(lastReceived)} (${lastPercentage.toFixed(1)}%) of our ₦${GOAL_AMOUNT.toLocaleString()} JAGOM Ikorodu building goal! Join us in reaching the target 🙏`;

    if (navigator.share) {
        navigator.share({
            title: 'JAGOM Ikorodu Building Pledge',
            text: message
        }).catch(() => {});
    } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    }
}

// =====================================================
// NEW: QR CODE FOR ACCOUNT NUMBER
// =====================================================

function setQrCode() {
    const img = document.getElementById('qrCodeImg');
    const accountEl = document.getElementById('accountNumber');
    if (!img || !accountEl) return;

    const data = encodeURIComponent(accountEl.textContent.trim());
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${data}`;
}

// =====================================================
// NEW: MANUAL REFRESH
// =====================================================

function manualRefresh() {
    const btn = document.getElementById('refreshBtn');
    if (btn) {
        btn.classList.add('spinning');
        setTimeout(() => btn.classList.remove('spinning'), 800);
    }
    updateRefreshIndicator();
    loadSummary();
    showToast('Refreshing...', 'info');
}

// =====================================================
// NEW: PAYMENT MODAL
// =====================================================

function openPaymentModal() {
    document.getElementById('paymentModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closePaymentModal() {
    document.getElementById('paymentModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

function copyAccountNumber() {
    const accountNumber = document.getElementById('accountNumber').textContent;
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(accountNumber).then(() => {
            showToast('Account number copied! 📋', 'success');
        }).catch(() => {
            fallbackCopy(accountNumber);
        });
    } else {
        fallbackCopy(accountNumber);
    }
}

function fallbackCopy(text) {
    const input = document.createElement('input');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    showToast('Account number copied! 📋', 'success');
}

// Close modal on overlay click
document.addEventListener('click', function(event) {
    const modal = document.getElementById('paymentModal');
    if (event.target === modal) {
        closePaymentModal();
    }
});

// Close modal on Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closePaymentModal();
    }
});

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
    if (!container) return;
    
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
    return `₦${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

function formatNumber(amount) {
    return amount.toFixed(1);
}