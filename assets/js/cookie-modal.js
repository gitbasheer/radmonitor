/**
 * Cookie Entry Modal
 * Provides a clean UI for entering authentication cookies
 */

export const CookieModal = (() => {
    'use strict';

    let modalElement = null;
    let resolveCallback = null;

    /**
     * Initialize the modal (create DOM elements)
     */
    function init() {
        if (modalElement) return;

        // Create modal HTML
        const modalHTML = `
            <div id="cookieModal" class="modal" style="display: none;">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h2>🔐 Authentication Required</h2>
                    </div>
                    <div class="modal-body">
                        <p style="margin-bottom: 20px;">Please enter your Kibana authentication cookie to access the dashboard.</p>

                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                            <h4 style="margin: 0 0 10px 0; color: #333;">How to get your cookie:</h4>
                            <ol style="margin: 5px 0; padding-left: 20px; font-size: 14px;">
                                <li>Open Kibana in another tab</li>
                                <li>Press F12 to open Developer Tools</li>
                                <li>Go to the Network tab</li>
                                <li>Refresh the page</li>
                                <li>Click any request and find the "Cookie" header</li>
                                <li>Copy the value starting with "sid=Fe26.2**..."</li>
                            </ol>
                        </div>

                        <div style="margin-bottom: 15px;">
                            <label for="cookieInput" style="display: block; margin-bottom: 5px; font-weight: 600;">Cookie:</label>
                            <textarea
                                id="cookieInput"
                                placeholder="Paste your cookie here (e.g., sid=Fe26.2**...)"
                                style="width: 100%; height: 100px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-family: monospace; font-size: 12px; resize: vertical;"
                            ></textarea>
                        </div>

                        <div id="cookieError" style="color: #d32f2f; font-size: 14px; margin-bottom: 10px; display: none;"></div>

                        <div style="display: flex; gap: 10px; justify-content: flex-end;">
                            <button id="cancelCookieBtn" class="control-button secondary">Cancel</button>
                            <button id="saveCookieBtn" class="control-button" style="background: #4CAF50;">
                                <span id="saveBtnText">Save Cookie</span>
                                <span id="saveSpinner" style="display: none;">⏳ Validating...</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to page
        const div = document.createElement('div');
        div.innerHTML = modalHTML;
        modalElement = div.firstElementChild;
        document.body.appendChild(modalElement);

        // Add event listeners
        const cookieInput = document.getElementById('cookieInput');
        const saveBtn = document.getElementById('saveCookieBtn');
        const cancelBtn = document.getElementById('cancelCookieBtn');

        saveBtn.addEventListener('click', handleSave);
        cancelBtn.addEventListener('click', handleCancel);

        // Enter key saves
        cookieInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSave();
            }
        });

        // Click outside closes
        modalElement.addEventListener('click', (e) => {
            if (e.target === modalElement) {
                handleCancel();
            }
        });
    }

    /**
     * Show the cookie modal
     * @returns {Promise<string|null>} Cookie value or null if cancelled
     */
    function show() {
        return new Promise((resolve) => {
            init(); // Ensure modal exists

            resolveCallback = resolve;

            // Reset modal state
            document.getElementById('cookieInput').value = '';
            document.getElementById('cookieError').style.display = 'none';
            document.getElementById('saveBtnText').style.display = 'inline';
            document.getElementById('saveSpinner').style.display = 'none';

            // Show modal
            modalElement.style.display = 'block';

            // Focus input
            setTimeout(() => {
                document.getElementById('cookieInput').focus();
            }, 100);
        });
    }

    /**
     * Hide the modal
     */
    function hide() {
        if (modalElement) {
            modalElement.style.display = 'none';
        }
    }

    /**
     * Handle save button click
     */
    async function handleSave() {
        const input = document.getElementById('cookieInput');
        const errorEl = document.getElementById('cookieError');
        const saveBtnText = document.getElementById('saveBtnText');
        const saveSpinner = document.getElementById('saveSpinner');

        const cookie = input.value.trim();

        // Basic validation
        if (!cookie) {
            showError('Please enter a cookie');
            return;
        }

        // Check format
        if (!cookie.startsWith('Fe26.2') && !cookie.startsWith('sid=')) {
            showError('Invalid cookie format. Cookie should start with "sid=Fe26.2**" or just "Fe26.2**"');
            return;
        }

        // Show loading state
        saveBtnText.style.display = 'none';
        saveSpinner.style.display = 'inline';
        errorEl.style.display = 'none';

        try {
            // Use CentralizedAuth to validate and save
            if (window.CentralizedAuth) {
                await window.CentralizedAuth.setCookie(cookie);

                // Success!
                hide();
                if (resolveCallback) {
                    resolveCallback(cookie);
                    resolveCallback = null;
                }

                // Don't automatically refresh - let the calling code decide
                // This prevents multiple simultaneous requests
                console.log('✅ Cookie saved successfully - caller should refresh if needed');
            } else {
                // Fallback if CentralizedAuth not available
                hide();
                if (resolveCallback) {
                    resolveCallback(cookie);
                    resolveCallback = null;
                }
            }
        } catch (error) {
            showError(error.message || 'Cookie validation failed. Please check your cookie and try again.');
            saveBtnText.style.display = 'inline';
            saveSpinner.style.display = 'none';
        }
    }

    /**
     * Handle cancel button click
     */
    function handleCancel() {
        hide();
        if (resolveCallback) {
            resolveCallback(null);
            resolveCallback = null;
        }
    }

    /**
     * Show error message
     */
    function showError(message) {
        const errorEl = document.getElementById('cookieError');
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }

    // Public API
    return {
        init,
        show,
        hide
    };
})();

// Make available globally
window.CookieModal = CookieModal;
