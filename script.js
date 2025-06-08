let paymentVerified = false;

document.addEventListener('DOMContentLoaded', function() {
    // Theme Toggle
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    const icon = themeToggle.querySelector('i');
    
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        body.classList.add(savedTheme);
        if (savedTheme === 'light-mode') {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        }
    }
    
    themeToggle.addEventListener('click', function() {
        body.classList.toggle('light-mode');
        
        if (body.classList.contains('light-mode')) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
            localStorage.setItem('theme', 'light-mode');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
            localStorage.setItem('theme', 'dark-mode');
        }
    });
    
    // Check if payment was previously verified
    if (localStorage.getItem('paymentVerified') === 'true') {
        paymentVerified = true;
        if (document.getElementById('registration-form')) {
            document.getElementById('registration-form').style.display = 'block';
            document.getElementById('payment-required-message').style.display = 'none';
            document.getElementById('payment-verified').value = 'true';
        }
    }

    // Copy buttons for payment info
    document.querySelectorAll('.copy-btn').forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const textToCopy = document.getElementById(targetId).textContent;
            
            navigator.clipboard.writeText(textToCopy).then(() => {
                const originalText = this.innerHTML;
                this.innerHTML = '<i class="fas fa-check"></i>';
                
                setTimeout(() => {
                    this.innerHTML = originalText;
                }, 2000);
            });
        });
    });
    
    // Bitcoin Payment Verification
    const verifyPaymentBtn = document.getElementById('verify-payment');
    if (verifyPaymentBtn) {
        verifyPaymentBtn.addEventListener('click', verifyBitcoinPayment);
        
        // Get current BTC price
        fetch('https://blockchain.info/ticker')
            .then(response => response.json())
            .then(data => {
                const btcRate = data.USD.last;
                document.getElementById('btc-rate').textContent = `$${btcRate.toLocaleString()}`;
            })
            .catch(error => {
                console.error("Error fetching BTC price:", error);
            });
    }
    
    // Form validation for apply page
    const registrationForm = document.getElementById('registration-form');
    if (registrationForm) {
        registrationForm.addEventListener('submit', function(e) {
            if (!paymentVerified) {
                e.preventDefault();
                alert('Please verify your payment before submitting the application');
                return false;
            }
            
            // Validate age
            const age = parseInt(document.getElementById('age').value);
            if (age < 10 || age > 65) {
                e.preventDefault();
                alert('Please enter a valid age between 10 and 65');
                return false;
            }
            
            // Validate terms checkbox
            if (!document.getElementById('terms').checked) {
                e.preventDefault();
                alert('You must agree to the terms and conditions');
                return false;
            }
            
            // Validate file sizes
            const headshot = document.getElementById('headshot').files[0];
            const video = document.getElementById('video').files[0];
            
            if (headshot && headshot.size > 5 * 1024 * 1024) { // 5MB
                e.preventDefault();
                alert('Headshot must be less than 5MB');
                return false;
            }
            
            if (video && video.size > 50 * 1024 * 1024) { // 50MB
                e.preventDefault();
                alert('Video must be less than 50MB');
                return false;
            }
            
            // Clear payment verification after successful submission
            clearPaymentVerification();
            
            return true;
        });
    }
    
    // Contact form submission
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            // Simple validation
            const name = document.getElementById('contact-name').value;
            const email = document.getElementById('contact-email').value;
            const message = document.getElementById('contact-message').value;
            
            if (!name || !email || !message) {
                e.preventDefault();
                alert('Please fill in all required fields');
                return false;
            }
            
            return true;
        });
    }
});

// Bitcoin payment verification function
async function verifyBitcoinPayment() {
    const txId = document.getElementById('tx-id').value.trim();
    const paymentStatus = document.getElementById('payment-status');
    const verifyPaymentBtn = document.getElementById('verify-payment');
    
    if (!txId) {
        paymentStatus.textContent = "Please enter a transaction ID";
        paymentStatus.className = "status-message error";
        return;
    }
    
    paymentStatus.textContent = "Verifying payment...";
    paymentStatus.className = "status-message processing";
    verifyPaymentBtn.disabled = true;
    
    try {
        // First verify the transaction exists
        const txResponse = await fetch(`https://blockchain.info/rawtx/${txId}`);
        const txData = await txResponse.json();
        
        if (!txData.hash) {
            throw new Error("Transaction not found");
        }
        
        // Check if transaction is confirmed
        if (!txData.block_height) {
            paymentStatus.textContent = "Transaction is not yet confirmed. Please try again later.";
            paymentStatus.className = "status-message error";
            verifyPaymentBtn.disabled = false;
            return;
        }
        
        // Check if transaction was sent to our address
        const ourAddress = document.getElementById('btc-address').textContent;
        const outputs = txData.out || [];
        const received = outputs.some(output => output.addr === ourAddress);
        
        if (received) {
            paymentStatus.textContent = "Payment verified successfully!";
            paymentStatus.className = "status-message success";
            
            paymentVerified = true;
            localStorage.setItem('paymentVerified', 'true');
            document.getElementById('payment-verified').value = 'true';
            
            // If on payment page, redirect to apply page
            if (window.location.pathname.includes('payment.html')) {
                setTimeout(() => {
                    window.location.href = 'apply.html';
                }, 1500);
            }
            
            // If already on apply page, show the form
            if (window.location.pathname.includes('apply.html')) {
                document.getElementById('registration-form').style.display = 'block';
                document.getElementById('payment-required-message').style.display = 'none';
                document.getElementById('payment-verified').value = 'true';
            }
        } else {
            paymentStatus.textContent = "Transaction found but not sent to our address";
            paymentStatus.className = "status-message error";
        }
    } catch (error) {
        console.error("Verification error:", error);
        paymentStatus.textContent = "Verification failed. Please check the transaction ID and try again.";
        paymentStatus.className = "status-message error";
    } finally {
        verifyPaymentBtn.disabled = false;
    }
}

function clearPaymentVerification() {
    paymentVerified = false;
    localStorage.removeItem('paymentVerified');
    document.getElementById('payment-verified').value = 'false';
}