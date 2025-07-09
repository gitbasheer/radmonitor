/**
 * Authentication Overlay Component
 * Vanilla JS component with Zustand store integration
 */

import { appStore } from '../stores/app-store.js';
import { radTheme as theme } from '../theme/rad-theme.js';

class AuthOverlay {
  constructor() {
    this.overlay = null;
    this.unsubscribe = null;
    this.isSubmitting = false;
    this.init();
  }

  init() {
    this.createOverlay();
    this.addStyles();
    this.subscribeToStore();
    this.addEventListeners();
  }

  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'authOverlay';
    this.overlay.className = 'auth-overlay';
    this.overlay.style.display = 'none';
    this.overlay.style.opacity = '0';
    this.overlay.style.transition = 'opacity 0.2s ease-in-out';
    document.body.appendChild(this.overlay);
  }

  subscribeToStore() {
    setTimeout(() => {
      this.unsubscribe = appStore.subscribe((state) => {
        if (state.ui.showAuthPrompt) {
          this.updateContent(state);
          this.show();
        } else {
          this.hide();
        }
      });
    }, 100);
  }

  updateContent(state) {
    const { error } = state.auth;

    this.overlay.innerHTML = `
      <div class="ux-modal__dialog ux-modal__dialog--medium">
        <div class="ux-modal__content">
          <div class="ux-modal__header">
            <h2 class="ux-text ux-text--heading-2">Authentication Required</h2>
          </div>

          <div class="ux-modal__body">
            <p class="ux-text ux-text--body-1" style="text-align: center; margin-bottom: 24px; color: #666;">
              Connect your Kibana session to view RAD traffic data
            </p>

            ${error ? `
              <div class="ux-alert ux-alert--error" style="margin-bottom: 24px;">
                <span class="ux-icon ux-icon--error"></span>
                <div class="ux-alert__content">${error}</div>
              </div>
            ` : ''}

            <div class="ux-card" style="margin-bottom: 24px;">
              <div class="ux-card__body">
                <h3 class="ux-text ux-text--heading-4" style="margin-bottom: 16px;">Quick Setup</h3>
                <div class="setup-steps">
                  <div class="setup-step">
                    <span class="step-badge">1</span>
                    <span class="ux-text ux-text--body-2">Open Kibana in another tab</span>
                  </div>
                  <div class="setup-step">
                    <span class="step-badge">2</span>
                    <span class="ux-text ux-text--body-2">Open DevTools (F12) → Application → Cookies</span>
                  </div>
                  <div class="setup-step">
                    <span class="step-badge">3</span>
                    <span class="ux-text ux-text--body-2">Find and copy the "sid" cookie value</span>
                  </div>
                  <div class="setup-step">
                    <span class="step-badge">4</span>
                    <span class="ux-text ux-text--body-2">Paste it below</span>
                  </div>
                </div>
              </div>
            </div>

            <form class="auth-form">
              <div style="display: flex; gap: 12px;">
                <input
                  type="text"
                  id="cookieInput"
                  class="ux-text-input"
                  placeholder="Paste your sid cookie value here..."
                  style="flex: 1; padding: 12px 16px; font-size: 16px;"
                  ${this.isSubmitting ? 'disabled' : ''}
                />
                <button
                  type="submit"
                  class="ux-button ux-button--primary"
                  ${this.isSubmitting ? 'disabled' : ''}
                  style="padding: 12px 24px;"
                >
                  ${this.isSubmitting ? '<span class="ux-spinner ux-spinner--small"></span>' : 'Connect'}
                </button>
              </div>
            </form>
          </div>

          <div class="ux-modal__footer" style="justify-content: center;">
            <a href="/kibana-cookie-sync.html" class="ux-button ux-button--tertiary">
              Use Cookie Sync Tool →
            </a>
          </div>
        </div>
      </div>
    `;
  }

  addEventListeners() {
    // Use event delegation for dynamically created form
    this.overlay.addEventListener('submit', (e) => {
      if (e.target.classList.contains('auth-form')) {
        e.preventDefault();
        this.handleSubmit(e);
      }
    });

    // Also handle Enter key in input
    this.overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.id === 'cookieInput') {
        e.preventDefault();
        const form = e.target.closest('.auth-form');
        if (form) {
          this.handleSubmit({ target: form });
        }
      }
    });
  }

  async handleSubmit(e) {
    e.preventDefault();

    const input = this.overlay.querySelector('#cookieInput');
    const value = input?.value.trim();

    if (!value) {
      this.showError('Please enter a cookie value');
      return;
    }

    this.isSubmitting = true;
    this.updateContent(appStore.getState()); // Re-render with disabled state

    try {
      // Set the cookie in store
      appStore.getState().actions.setCookie(value);

      // Test the connection with the auth status endpoint
      const cookie = value.startsWith('sid=') ? value : `sid=${value}`;
      console.log('🔐 Testing authentication with cookie: present');

      const response = await fetch('/api/v1/auth/status', {
        method: 'GET',
        headers: {
          'Cookie': cookie,
          'X-Elastic-Cookie': cookie
        },
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        console.log('📡 Auth status response:', result);

        // Check if actually authenticated
        if (result.authenticated) {
          console.log('✅ Authentication successful: Cookie is valid');

          // Store the cookie and reload
          localStorage.setItem('elastic_cookie', cookie);

          // Success! Reload to reinitialize with auth
          setTimeout(() => {
            window.location.reload();
          }, 500);
        } else {
          throw new Error('Cookie not authenticated - please check your cookie value');
        }
      } else {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Invalid cookie or connection failed');
      }
    } catch (err) {
      console.error('Auth submission error:', err);
      this.showError(err.message);
      this.isSubmitting = false;
      this.updateContent(appStore.getState());
    }
  }

  showError(message) {
    // Update the store with the error
    const currentState = appStore.getState();
    appStore.setState({
      ...currentState,
      auth: { ...currentState.auth, error: message }
    });
  }

  show() {
    if (this.overlay) {
      this.overlay.style.display = 'flex';
      // Force reflow to ensure the display change is applied before opacity transition
      this.overlay.offsetHeight;
      this.overlay.style.opacity = '1';

      // Focus the input field after a brief delay
      setTimeout(() => {
        const input = this.overlay.querySelector('#cookieInput');
        if (input && !this.isSubmitting) {
          input.focus();
        }
      }, 100);
    }
  }

  hide() {
    if (this.overlay) {
      this.overlay.style.opacity = '0';
      // Wait for transition to complete before hiding
      setTimeout(() => {
        this.overlay.style.display = 'none';
        this.isSubmitting = false;
      }, 200);
    }
  }

  addStyles() {
    if (document.getElementById('authOverlayStyles')) return;

    const style = document.createElement('style');
    style.id = 'authOverlayStyles';
    style.textContent = `
      .auth-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(2px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      }

      /* Custom styles for authentication specific needs */
      .setup-steps {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .setup-step {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .step-badge {
        width: 24px;
        height: 24px;
        background: var(--gd-color-brand-primary, #ff6900);
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
        flex-shrink: 0;
      }

      /* UXCore text input styles */
      .ux-text-input {
        background: white;
        border: 1px solid var(--gd-color-border-primary, #d4d4d4);
        border-radius: 0.25rem;
        padding: 0.5rem 1rem;
        font-size: 1rem;
        color: var(--gd-color-text-primary, #111);
        transition: all 0.2s ease-in-out;
      }

      .ux-text-input:focus {
        outline: none;
        border-color: var(--gd-color-brand-primary, #ff6900);
        box-shadow: 0 0 0 2px rgba(255, 105, 0, 0.2);
      }

      .ux-text-input:disabled {
        background-color: var(--gd-color-background-secondary, #f5f5f5);
        color: var(--gd-color-text-secondary, #666);
        cursor: not-allowed;
      }

      /* Override modal dialog positioning for overlay */
      .auth-overlay .ux-modal__dialog {
        position: relative;
        margin: 0;
      }

      /* Clean form styling */
      .auth-form {
        margin: 0;
      }
    `;
    document.head.appendChild(style);
  }

  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    if (this.overlay) {
      this.overlay.remove();
    }
  }
}

// Create and export global instance
export const authOverlay = new AuthOverlay();
window.authOverlay = authOverlay;
