/**
 * DOM Effects Manager
 * Handles DOM manipulations in response to store state changes
 * Keeps DOM manipulation separate from state management
 */

import { appStore, subscribe } from './app-store.js';

class DOMEffectsManager {
  constructor() {
    this.unsubscribe = null;
  }

  init() {
    // Subscribe to store changes
    this.unsubscribe = subscribe((state) => {
      this.handleStateChange(state);
    });

    // Apply initial state
    const initialState = appStore.getState();
    this.handleStateChange(initialState);
  }

  handleStateChange(state) {
    const { ui } = state;

    // Handle loading state body class
    if (ui.isLoading) {
      document.body.classList.add('loading');
    } else {
      document.body.classList.remove('loading');
    }

    // Handle main content visibility
    const mainContent = document.getElementById('mainAppContent');
    if (mainContent) {
      if (ui.mainContentVisible) {
        mainContent.style.display = 'block';
      } else {
        mainContent.style.display = 'none';
      }
    }

    // Handle auth prompt visibility
    const authOverlay = document.getElementById('authOverlay');
    if (authOverlay) {
      if (ui.showAuthPrompt) {
        authOverlay.style.display = 'flex';
      } else {
        authOverlay.style.display = 'none';
      }
    }

    // Handle modal open body class
    if (ui.activeModal) {
      document.body.classList.add('ux-modal-open');
    } else {
      document.body.classList.remove('ux-modal-open');
    }
  }

  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}

// Create singleton instance
const domEffects = new DOMEffectsManager();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    domEffects.init();
    console.log('🎯 DOM Effects Manager initialized');
  });
} else {
  domEffects.init();
  console.log('🎯 DOM Effects Manager initialized');
}

// Export for manual control if needed
export default domEffects;