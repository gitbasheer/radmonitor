/**
 * Loading Overlay using @ux components
 * Replaces the custom loading overlay with Antares components
 */

import { UXComponents } from './ux-components.js';
import { appStore, useUI, useConnection } from '../stores/app-store.js';
import DOMPurify from './../lib/dompurify.js';

class LoadingOverlayUX {
  constructor() {
    this.overlay = null;
    this.statusCard = null;
    this.messageEl = null;
    this.unsubscribe = null;
  }

  create() {
    // Create overlay container
    this.overlay = document.createElement('div');
    this.overlay.id = 'loadingOverlay';
    this.overlay.className = 'ux-loading-overlay';
    
    // Create centered content container
    const content = document.createElement('div');
    content.className = 'ux-loading-overlay__content';
    
    // Create spinner
    const spinner = UXComponents.createSpinner({
      size: 'large',
      text: 'Initializing RAD Monitor',
      className: 'ux-loading-overlay__spinner'
    });
    content.appendChild(spinner);
    
    // Create status card
    this.statusCard = UXComponents.createCard({
      title: 'Connection Status',
      content: this.createStatusContent(),
      variant: 'elevated',
      padding: 'large',
      className: 'ux-loading-overlay__status-card'
    });
    content.appendChild(this.statusCard);
    
    this.overlay.appendChild(content);
    
    // Subscribe to store changes
    this.subscribeToStore();
    
    return this.overlay;
  }

  createStatusContent() {
    const container = document.createElement('div');
    container.className = 'ux-space ux-space--vertical ux-space--gap-medium';
    
    const connection = useConnection();
    
    // Create status items
    const statusItems = [
      { key: 'api', label: 'API Connection', ...connection.api },
      { key: 'data', label: 'Data Service', ...connection.data },
      { key: 'formula', label: 'Formula Builder', ...connection.formula }
    ];
    
    statusItems.forEach(item => {
      const statusEl = this.createStatusItem(item);
      container.appendChild(statusEl);
    });
    
    return container;
  }

  createStatusItem({ label, connected, loaded, initialized, message }) {
    const item = document.createElement('div');
    item.className = 'ux-loading-overlay__status-item';
    
    // Determine status
    const isReady = connected || loaded || initialized;
    const statusIcon = isReady ? 'check-circle' : 'spinner';
    const statusClass = isReady ? 'success' : 'pending';
    
    // Create status indicator
    const indicator = document.createElement('span');
    indicator.className = `ux-icon ux-icon--${statusIcon} ux-icon--${statusClass}`;
    
    // Create label
    const labelEl = document.createElement('span');
    labelEl.className = 'ux-text ux-text--body-2';
    labelEl.textContent = label;
    
    // Create message
    const messageEl = document.createElement('span');
    messageEl.className = 'ux-text ux-text--caption ux-text--muted';
    messageEl.textContent = message;
    
    // Assemble
    item.appendChild(indicator);
    const textContainer = document.createElement('div');
    textContainer.className = 'ux-loading-overlay__status-text';
    textContainer.appendChild(labelEl);
    textContainer.appendChild(messageEl);
    item.appendChild(textContainer);
    
    return item;
  }

  subscribeToStore() {
    this.unsubscribe = appStore.subscribe((state) => {
      this.updateLoadingState(state);
    });
  }

  updateLoadingState(state) {
    const { ui, connection } = state;
    
    // Update loading message
    if (this.overlay) {
      const spinnerLabel = this.overlay.querySelector('.ux-spinner__label');
      if (spinnerLabel) {
        spinnerLabel.textContent = ui.loadingMessage;
      }
    }
    
    // Update status card content
    if (this.statusCard) {
      const newContent = this.createStatusContent();
      const cardBody = this.statusCard.querySelector('.ux-card__body');
      if (cardBody) {
        cardBody.innerHTML = ''; // Safe - clearing content only
        cardBody.appendChild(newContent);
      }
    }
    
    // Handle overlay visibility
    if (!ui.isLoading && this.overlay) {
      this.hide();
    }
  }

  show() {
    if (!this.overlay) {
      this.create();
    }
    
    document.body.appendChild(this.overlay);
    document.body.classList.add('ux-modal-open'); // Reuse modal's body class
    
    // Fade in animation
    requestAnimationFrame(() => {
      this.overlay.classList.add('ux-loading-overlay--visible');
    });
  }

  hide() {
    if (!this.overlay) return;
    
    this.overlay.classList.remove('ux-loading-overlay--visible');
    
    // Remove after animation
    setTimeout(() => {
      if (this.overlay && this.overlay.parentElement) {
        this.overlay.remove();
        document.body.classList.remove('ux-modal-open');
      }
    }, 300);
  }

  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    
    if (this.overlay && this.overlay.parentElement) {
      this.overlay.remove();
    }
    
    this.overlay = null;
    this.statusCard = null;
    this.messageEl = null;
  }
}

// Create singleton instance
const loadingOverlayUX = new LoadingOverlayUX();

// Export functions matching the original API
export function initializeLoadingOverlay() {
  return loadingOverlayUX.create();
}

export function showLoadingOverlay() {
  loadingOverlayUX.show();
}

export function hideLoadingOverlay() {
  loadingOverlayUX.hide();
}

export function updateLoadingStatus(message) {
  const spinnerLabel = document.querySelector('.ux-spinner__label');
  if (spinnerLabel) {
    spinnerLabel.textContent = message;
  }
}

// Auto-initialize when imported
console.log('🎨 Loading Overlay UX initialized');