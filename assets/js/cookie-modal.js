/**
 * Cookie Entry Modal
 * Provides a clean UI for entering authentication cookies
 */

import { radTheme as theme } from './theme/rad-theme.js';

// Module state
let modalElement = null;
let resolveCallback = null;

/**
 * Initialize the modal (create DOM elements)
 */
export function init() {
    if (modalElement) return;

    // Create modal HTML with vnext-dashboard theme
    const modalHTML = `
        <div id="cookieModal" class="modal" style="
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            z-index: 1000;
        ">
            <div class="modal-content gd-modal" style="
                position: relative;
                background-color: ${theme.colors.background.primary};
                margin: 10% auto;
                padding: 0;
                border: 1px solid ${theme.colors.border.primary};
                border-radius: ${theme.borderRadius.medium};
                width: 90%;
                max-width: 600px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            ">
                <div class="modal-header gd-modal-header" style="
                    padding: ${theme.spacing.xl};
                    border-bottom: 1px solid ${theme.colors.border.secondary};
                ">
                    <h2 style="
                        margin: 0;
                        color: ${theme.colors.text.accent};
                        font-size: ${theme.fontSize.xlarge};
                        font-weight: 500;
                    ">Authentication Required</h2>
                </div>
                <div class="modal-body gd-modal-body" style="
                    padding: ${theme.spacing.xl};
                    color: ${theme.colors.text.primary};
                ">
                    <p style="
                        margin-bottom: ${theme.spacing.xl};
                        color: ${theme.colors.text.secondary};
                        font-size: ${theme.fontSize.medium};
                    ">Please enter your Kibana authentication cookie to access the dashboard.</p>

                    <div style="
                        background: ${theme.colors.background.secondary};
                        padding: ${theme.spacing.lg};
                        border-radius: ${theme.borderRadius.medium};
                        margin-bottom: ${theme.spacing.xl};
                        border: 1px solid ${theme.colors.border.secondary};
                    ">
                        <h4 style="
                            margin: 0 0 ${theme.spacing.md} 0;
                            color: ${theme.colors.text.primary};
                            font-size: ${theme.fontSize.medium};
                        ">How to get your cookie:</h4>
                        <ol style="
                            margin: ${theme.spacing.xs} 0;
                            padding-left: ${theme.spacing.xl};
                            font-size: ${theme.fontSize.small};
                            color: ${theme.colors.text.secondary};
                            line-height: 1.6;
                        ">
                            <li>Open Kibana in another tab</li>
                            <li>Press F12 to open Developer Tools</li>
                            <li>Go to the Network tab</li>
                            <li>Refresh the page</li>
                            <li>Click any request and find the "Cookie" header</li>
                            <li>Copy the value starting with "sid=Fe26.2**..."</li>
                        </ol>
                    </div>

                    <div style="margin-bottom: ${theme.spacing.lg};">
                        <label for="cookieInput" style="
                            display: block;
                            margin-bottom: ${theme.spacing.xs};
                            font-weight: 600;
                            color: ${theme.colors.text.primary};
                            font-size: ${theme.fontSize.medium};
                        ">Cookie:</label>
                        <textarea
                            id="cookieInput"
                            placeholder="Paste your cookie here (e.g., sid=Fe26.2**...)"
                            style="
                                width: 100%;
                                height: 100px;
                                padding: ${theme.spacing.sm};
                                border: 1px solid ${theme.colors.border.primary};
                                border-radius: ${theme.borderRadius.small};
                                font-family: monospace;
                                font-size: ${theme.fontSize.small};
                                resize: vertical;
                                background-color: ${theme.colors.background.secondary};
                                color: ${theme.colors.text.primary};
                            "
                        ></textarea>
                    </div>

                    <div id="cookieError" style="
                        color: #f44336;
                        font-size: ${theme.fontSize.small};
                        margin-bottom: ${theme.spacing.md};
                        display: none;
                    "></div>

                    <div style="display: flex; gap: ${theme.spacing.md}; justify-content: flex-end;">
                        <button id="cancelCookieBtn" class="ux-button ux-button--secondary">Cancel</button>
                        <button id="saveCookieBtn" class="ux-button ux-button--primary">
                            <span id="saveBtnText">Save Cookie</span>
                            <span id="saveSpinner" style="display: none;">Validating...</span>
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
export function show() {
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
export function hide() {
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
            console.log('(✓)Cookie saved successfully - caller should refresh if needed');
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

// Create default export object for backward compatibility
const CookieModal = {
    init,
    show,
    hide
};

// Export as default
export default CookieModal;
