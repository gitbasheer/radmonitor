/**
 * Loading Overlay Component
 * Vanilla JS component with Zustand store integration
 */

import { appStore } from '../stores/app-store.js';
import { radTheme as theme } from '../theme/rad-theme.js';
import DOMPurify from './../lib/dompurify.js';

class LoadingOverlay {
  constructor() {
    this.overlay = null;
    this.unsubscribe = null;
    this.init();
  }

  init() {
    this.createOverlay();
    this.addStyles();
    this.subscribeToStore();

    // Show initially
    this.show();
  }

  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'loadingOverlay';
    this.overlay.className = 'loading-overlay';
    document.body.appendChild(this.overlay);
  }

  subscribeToStore() {
    this.unsubscribe = appStore.subscribe((state) => {
      if (state.ui.isLoading) {
        this.updateContent(state);
        this.show();
      } else {
        this.hide();
      }
    });
  }

  updateContent(state) {
    const { loadingMessage } = state.ui;
    const { connection } = state;
    const { auth } = state;

    this.overlay.innerHTML = DOMPurify.sanitize(`
      <div class="loading-content">
        <div class="loading-card">
          <div class="loading-animation">
            <div class="loading-ring"></div>
            <div class="loading-icon">📊</div>
          </div>

          <h2 class="loading-title">${loadingMessage}</h2>

          <div class="loading-status">
            ${this.renderStatusItem('api', 'API Connection', connection.api)}
            ${this.renderStatusItem('auth', 'Authentication', {
              connected: auth.isAuthenticated,
              message: auth.isChecking ? 'Checking...' : (auth.isAuthenticated ? 'Authenticated' : 'Not authenticated')
            })}
            ${this.renderStatusItem('data', 'Data Service', connection.data)}
            ${this.renderStatusItem('formula', 'Formula Builder', connection.formula)}
          </div>

          ${state.ui.error ? `
            <div class="loading-error">
              <span class="error-icon">⚠️</span>
              <span class="error-message">${state.ui.error}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `);
  }

  renderStatusItem(key, label, status) {
    const isSuccess = status.connected || status.loaded || status.initialized;
    const icon = isSuccess ? '✅' : '⏳';
    const statusClass = isSuccess ? 'success' : '';

    return `
      <div class="status-item ${statusClass}">
        <span class="status-icon">${icon}</span>
        <span class="status-label">${label}</span>
        <span class="status-state">${status.message}</span>
      </div>
    `;
  }

  show() {
    if (this.overlay) {
      this.overlay.style.display = 'flex';
    }
  }

  hide() {
    if (this.overlay) {
      this.overlay.classList.add('fade-out');
      setTimeout(() => {
        if (this.overlay) {
          this.overlay.style.display = 'none';
          this.overlay.classList.remove('fade-out');
        }
      }, 300);
    }
  }

  addStyles() {
    if (document.getElementById('loadingOverlayStyles')) return;

    const style = document.createElement('style');
    style.id = 'loadingOverlayStyles';
    style.textContent = `
      .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: ${theme.colors.background.primary};
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
        transition: opacity 0.3s ease;
      }

      .loading-overlay.fade-out {
        opacity: 0;
      }

      .loading-content {
        text-align: center;
        max-width: 450px;
        width: 90%;
      }

      .loading-card {
        background: ${theme.colors.background.secondary};
        border: 1px solid ${theme.colors.border.primary};
        border-radius: 16px;
        padding: 48px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
      }

      .loading-animation {
        position: relative;
        width: 80px;
        height: 80px;
        margin: 0 auto 32px;
      }

      .loading-ring {
        position: absolute;
        width: 100%;
        height: 100%;
        border: 3px solid ${theme.colors.border.secondary};
        border-top-color: ${theme.colors.text.accent};
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      .loading-icon {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 32px;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      .loading-title {
        color: ${theme.colors.text.primary};
        font-size: 24px;
        margin: 0 0 32px 0;
        font-weight: 500;
      }

      .loading-status {
        display: flex;
        flex-direction: column;
        gap: 16px;
        text-align: left;
      }

      .status-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        background: ${theme.colors.background.primary};
        border-radius: 8px;
        transition: all 0.3s ease;
      }

      .status-item.success {
        background: rgba(76, 175, 80, 0.1);
        border: 1px solid rgba(76, 175, 80, 0.3);
      }

      .status-icon {
        font-size: 20px;
        width: 24px;
        text-align: center;
        flex-shrink: 0;
      }

      .status-label {
        flex: 1;
        color: ${theme.colors.text.primary};
        font-weight: 500;
      }

      .status-state {
        color: ${theme.colors.text.secondary};
        font-size: 14px;
      }

      .loading-error {
        margin-top: 24px;
        padding: 16px;
        background: rgba(244, 67, 54, 0.1);
        border: 1px solid rgba(244, 67, 54, 0.3);
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 12px;
        color: #f44336;
      }

      .error-icon {
        font-size: 24px;
        flex-shrink: 0;
      }

      .error-message {
        flex: 1;
        text-align: left;
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
export const loadingOverlay = new LoadingOverlay();
window.loadingOverlay = loadingOverlay;
