document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    const mainAuthHeader = document.querySelector('.auth-header'); // The first one is the main one
    
    // Toggle Forms
    document.getElementById('show-register').addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.add('hidden');
        mainAuthHeader.classList.add('hidden');
        registerForm.classList.remove('hidden');
        if(typeof showStep === 'function') showStep(1);
    });

    document.getElementById('show-login').addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        mainAuthHeader.classList.remove('hidden');
    });

    // Handle Login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        const btn = e.target.querySelector('button');
        const ogText = btn.innerHTML;
        btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Loading...';

        try {
            const data = await ApiService.post('/auth/login', { username, password });
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify({id: data.id, username: data.username, role: data.role}));
            App.showToast('Login successful!', 'success');
            // Directly go to dashboard without page reload
            App.checkAuth();
        } catch (error) {
            App.showToast(error.message || 'Login failed', 'error');
            btn.innerHTML = ogText;
            document.getElementById('forgot-link').classList.remove('hidden'); // Show forgot link
        }
    });

    // Multistep Form Logic
    const step1 = document.getElementById('reg-step-1');
    const step2 = document.getElementById('reg-step-2');
    const step3 = document.getElementById('reg-step-3');
    const stepIndicator = document.getElementById('step-indicator');
    const backBtn = document.getElementById('reg-back');
    let currentStep = 1;
    
    // OTP State
    let isEmailVerified = false;
    let expectedEmailOtp = '';

    window.showStep = function(step) {
        step1.classList.add('hidden');
        step2.classList.add('hidden');
        step3.classList.add('hidden');
        
        if(step === 1) {
            step1.classList.remove('hidden');
        }
        if(step === 2) {
            step2.classList.remove('hidden');
        }
        if(step === 3) {
            if(!isEmailVerified) {
                App.showToast('Please verify your email first', 'warning');
                return;
            }
            step3.classList.remove('hidden');
        }
        
        stepIndicator.textContent = `Step ${step} of 3`;
        currentStep = step;
    };


    document.getElementById('btn-next-1').addEventListener('click', () => {
        const fullName = document.getElementById('reg-fullname').value.trim();
        const phone = document.getElementById('reg-phone').value.trim();
        const gender = document.getElementById('reg-gender').value;

        if (!fullName || !phone || !gender) {
            App.showToast('Please fill all fields', 'warning');
            return;
        }

        const nameRegex = /^[a-zA-Z\s\-]+$/;
        if (!nameRegex.test(fullName) || fullName.length < 3) {
            App.showToast('Please enter a valid full name (letters only)', 'warning');
            return;
        }

        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(phone)) {
            App.showToast('Please enter a valid 10-digit phone number', 'warning');
            return;
        }

        showStep(2);
    });

    // --- Email OTP Logic ---
    document.getElementById('btn-send-email-otp').addEventListener('click', async () => {
        const email = document.getElementById('reg-email').value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!email) {
            App.showToast('Please enter your email ID', 'warning');
            return;
        }
        if (!emailRegex.test(email)) {
            App.showToast('Please enter a valid email format', 'warning');
            return;
        }
        const btn = document.getElementById('btn-send-email-otp');
        const ogText = btn.innerHTML;
        btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Sending...';
        btn.disabled = true;

        try {
            await ApiService.post('/auth/send-otp', { identifier: email });
            document.getElementById('email-otp-group').style.display = 'block';
            App.showToast('OTP sent to email! Check your inbox.', 'success');
        } catch (error) {
            App.showToast(error.message || 'Failed to send OTP', 'error');
            btn.disabled = false;
        } finally {
            btn.innerHTML = ogText;
        }
    });

    document.getElementById('btn-verify-email-otp').addEventListener('click', async () => {
        const email = document.getElementById('reg-email').value;
        const enteredOtp = document.getElementById('reg-email-otp').value;
        if (!enteredOtp) {
             App.showToast('Please enter the OTP', 'warning');
             return;
        }
        
        const btn = document.getElementById('btn-verify-email-otp');
        const ogText = btn.innerHTML;
        btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Verifying...';

        try {
            await ApiService.post('/auth/verify-otp', { identifier: email, otp: enteredOtp });
            isEmailVerified = true;
            document.getElementById('reg-email').readOnly = true;
            document.getElementById('btn-send-email-otp').disabled = true;
            document.getElementById('btn-verify-email-otp').innerHTML = '<i class="ri-check-line"></i> Verified';
            document.getElementById('btn-verify-email-otp').disabled = true;
            document.getElementById('btn-verify-email-otp').classList.replace('btn-outline', 'btn-success');
            App.showToast('Email verified successfully', 'success');
        } catch (error) {
            App.showToast(error.message || 'Invalid Email OTP', 'error');
            btn.innerHTML = ogText;
        }
    });

    document.getElementById('btn-next-2').addEventListener('click', () => {
        if (!document.getElementById('reg-email').value) {
            App.showToast('Please enter your email', 'warning');
            return;
        }
        if(!isEmailVerified) {
            App.showToast('Please verify your email to continue', 'warning');
            return;
        }
        showStep(3);
    });

    backBtn.addEventListener('click', () => {
        if (currentStep === 3) showStep(2);
        else if (currentStep === 2) showStep(1);
        else if (currentStep === 1) document.getElementById('show-login').click();
    });

    // Handle Register
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('reg-username').value.trim();
        const password = document.getElementById('reg-password').value;
        const confirmPassword = document.getElementById('reg-confirm-password').value;
        const role = document.getElementById('reg-role').value;
        const fullName = document.getElementById('reg-fullname').value.trim();
        const phone = document.getElementById('reg-phone').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        
        if (!username || username.length < 4) {
             App.showToast('Username must be at least 4 characters long', 'warning');
             return;
        }
        
        if (!password || password.length < 6) {
             App.showToast('Password must be at least 6 characters long', 'warning');
             return;
        }
        
        if (password !== confirmPassword) {
            App.showToast('Passwords do not match!', 'error');
            return;
        }
        
        const btn = document.getElementById('btn-register-submit');
        const ogText = btn.innerHTML;
        btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Registering...';
        
        try {
            await ApiService.post('/auth/register', { username, password, role, fullName, phone, email });
            App.showToast('Registration successful! Please login.', 'success');
            document.getElementById('show-login').click();
            loginForm.querySelector('#login-username').value = username;
            registerForm.reset();
            showStep(1);
        } catch (error) {
            App.showToast(error.message || 'Registration failed', 'error');
        } finally {
            btn.innerHTML = ogText;
        }
    });

    // Handle Logout
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.reload();
    });

    // ==========================================
    // FORGOT PASSWORD FLOW
    // ==========================================
    const forgotForm = document.getElementById('forgot-form');
    let resetEmail = '';

    document.getElementById('show-forgot').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-form').classList.add('hidden');
        forgotForm.classList.remove('hidden');
        document.getElementById('auth-subtitle').textContent = 'Reset your password.';
    });

    document.getElementById('forgot-back').addEventListener('click', () => {
        forgotForm.classList.add('hidden');
        document.getElementById('login-form').classList.remove('hidden');
        document.getElementById('auth-subtitle').textContent = 'Welcome back! Please login to your account.';
        document.querySelectorAll('.forgot-form .step').forEach(s => s.classList.remove('active'));
        document.getElementById('forgot-step-1').classList.add('active');
    });

    document.getElementById('forgot-send-otp').addEventListener('click', async () => {
        const email = document.getElementById('forgot-email').value;
        if (!email) return App.showToast('Enter your registered email', 'error');
        const btn = document.getElementById('forgot-send-otp');
        const text = btn.innerHTML;
        btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Sending...';
        try {
            await ApiService.post('/auth/send-otp', { identifier: email });
            resetEmail = email;
            App.showToast('OTP sent to your email!', 'success');
            document.getElementById('forgot-step-1').classList.remove('active');
            document.getElementById('forgot-step-2').classList.add('active');
        } catch(err) { App.showToast(err.message || 'Failed to send OTP', 'error'); }
        btn.innerHTML = text;
    });

    document.getElementById('forgot-verify-otp').addEventListener('click', () => {
        const otp = document.getElementById('forgot-otp').value;
        if (!otp || otp.length < 4) return App.showToast('Enter a valid OTP', 'error');
        // Proceed to next step without making an API call to verify, let reset-password verify it.
        document.getElementById('forgot-step-2').classList.remove('active');
        document.getElementById('forgot-step-3').classList.add('active');
    });

    document.getElementById('forgot-reset-btn').addEventListener('click', async () => {
        const otp = document.getElementById('forgot-otp').value;
        const newPw = document.getElementById('forgot-new-pw').value;
        const confirmPw = document.getElementById('forgot-confirm-pw').value;
        if (!newPw || newPw.length < 6) return App.showToast('Password must be at least 6 characters', 'error');
        if (newPw !== confirmPw) return App.showToast('Passwords do not match', 'error');

        const btn = document.getElementById('forgot-reset-btn');
        const text = btn.innerHTML;
        btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Resetting...';
        try {
            await ApiService.post('/auth/reset-password', { email: resetEmail, otp: otp, newPassword: newPw });
            App.showToast('Password reset successful! Please login.', 'success');
            document.getElementById('forgot-back').click(); // go back to login
        } catch(err) { App.showToast(err.message || 'Reset failed (Invalid OTP or email?)', 'error'); }
        btn.innerHTML = text;
    });
});
