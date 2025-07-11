/**
 * UX Components Registry and Loader
 * Manages Antares/@ux component integration with the RAD Monitor
 *
 * IMPORTANT: The @ux packages are React components, but this project uses vanilla JavaScript.
 * Therefore, this file creates HTML elements that mimic the UXCore component structure
 * and uses the UXCore CSS classes for styling (loaded via uxcore-bundle.css).
 *
 * For proper React-based usage, see vnext-dashboard as a reference.
 *
 * Version Strategy: Targeting UXCore 2400+ for optimal compatibility
 * See: https://godaddy-corp.atlassian.net/wiki/spaces/ANTARES/pages/3209847110
 */

import { appStore, useUI, useActions } from '../stores/app-store.js';
import DOMPurify from './../lib/dompurify.js';

// Component registry - maps component names to their @ux imports
const UX_COMPONENTS = {
  // Core UI Components
  Button: '@ux/button',
  Card: '@ux/card',
  Box: '@ux/box',                    // 2400+ only - excellent for spacing
  Text: '@ux/text',
  TextLockup: '@ux/text-lockup',     // 2400+ only - better spacing control than Text
  Space: '@ux/space',

  // Form Components
  TextInput: '@ux/text-input',
  SelectInput: '@ux/select-input',
  Checkbox: '@ux/checkbox',
  Radio: '@ux/radio',
  Search: '@ux/search',

  // Feedback Components
  Alert: '@ux/alert',
  Growl: '@ux/growl',
  Modal: '@ux/modal',
  Dialog: '@ux/dialog',
  Popover: '@ux/popover',
  Tooltip: '@ux/tooltip',
  Spinner: '@ux/spinner',
  ProgressBar: '@ux/progress-bar',

  // Display Components
  Chip: '@ux/chip',
  Tag: '@ux/tag',
  Icon: '@ux/icon',
  Menu: '@ux/menu',
  TabsLegacy: '@ux/tabs-legacy',     // Consider upgrading to @ux/tabs when available
  CollapsibleLegacy: '@ux/collapsible-legacy', // Consider upgrading to @ux/collapsible
  SiblingSet: '@ux/sibling-set',

  // Chart Components
  Charts: '@ux/charts',

  // Special Components
  UniversalAdWidget: '@ux-dri/universal-ad-widget',
  UxCore2: '@ux/uxcore2',            // Note: Avoid in distributed systems per docs
};

// Component factory functions
export const UXComponents = {
  /**
   * Create a button element
   * @param {Object} options - Button configuration
   * @returns {HTMLElement}
   */
  createButton(options = {}) {
    const {
      text = '',
      variant = 'primary', // primary, secondary, tertiary
      size = 'medium', // small, medium, large
      disabled = false,
      loading = false,
      onClick = () => {},
      className = '',
      icon = null,
    } = options;

    const button = document.createElement('button');
    button.className = `ux-button ux-button--${variant} ux-button--${size} ${className}`;
    button.disabled = disabled || loading;

    if (loading) {
      button.classList.add('ux-button--loading');
      button.innerHTML = DOMPurify.sanitize('<span class="ux-spinner ux-spinner--small"></span>');
    } else {
      button.textContent = text;
      if (icon) {
        button.innerHTML = DOMPurify.sanitize(`<span class="ux-icon ux-icon--${icon}"></span> ${text}`);
      }
    }

    button.addEventListener('click', onClick);
    return button;
  },

  /**
   * Create a card element
   * @param {Object} options - Card configuration
   * @returns {HTMLElement}
   */
  createCard(options = {}) {
    const {
      title = '',
      content = '',
      footer = null,
      variant = 'default', // default, elevated, outlined
      padding = 'medium', // small, medium, large
      className = '',
    } = options;

    const card = document.createElement('div');
    card.className = `ux-card ux-card--${variant} ux-card--padding-${padding} ${className}`;

    if (title) {
      const header = document.createElement('div');
      header.className = 'ux-card__header';
      header.innerHTML = DOMPurify.sanitize(`<h3 class="ux-text ux-text--heading-3">${title}</h3>`);
      card.appendChild(header);
    }

    const body = document.createElement('div');
    body.className = 'ux-card__body';
    if (typeof content === 'string') {
      body.innerHTML = DOMPurify.sanitize(content);
    } else {
      body.appendChild(content);
    }
    card.appendChild(body);

    if (footer) {
      const footerEl = document.createElement('div');
      footerEl.className = 'ux-card__footer';
      if (typeof footer === 'string') {
        footerEl.innerHTML = DOMPurify.sanitize(footer);
      } else {
        footerEl.appendChild(footer);
      }
      card.appendChild(footerEl);
    }

    return card;
  },

  /**
   * Create a modal element
   * @param {Object} options - Modal configuration
   * @returns {Object} Modal controller
   */
  createModal(options = {}) {
    const {
      title = '',
      content = '',
      size = 'medium', // small, medium, large, fullscreen
      closable = true,
      footer = null,
      onClose = () => {},
      className = '',
    } = options;

    const modalId = `ux-modal-${Date.now()}`;
    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = `ux-modal ${className}`;

    const backdrop = document.createElement('div');
    backdrop.className = 'ux-modal__backdrop';

    const dialog = document.createElement('div');
    dialog.className = `ux-modal__dialog ux-modal__dialog--${size}`;

    const modalContent = document.createElement('div');
    modalContent.className = 'ux-modal__content';

    if (title) {
      const header = document.createElement('div');
      header.className = 'ux-modal__header';
      header.innerHTML = DOMPurify.sanitize(`
        <h2 class="ux-text ux-text--heading-2">${title}</h2>
        ${closable ? '<button class="ux-modal__close ux-button ux-button--tertiary ux-button--small"><span class="ux-icon ux-icon--close"></span></button>' : ''}
      `);
      modalContent.appendChild(header);

      if (closable) {
        header.querySelector('.ux-modal__close').addEventListener('click', () => {
          controller.close();
        });
      }
    }

    const body = document.createElement('div');
    body.className = 'ux-modal__body';
    if (typeof content === 'string') {
      body.innerHTML = DOMPurify.sanitize(content);
    } else {
      body.appendChild(content);
    }
    modalContent.appendChild(body);

    if (footer) {
      const footerEl = document.createElement('div');
      footerEl.className = 'ux-modal__footer';
      if (typeof footer === 'string') {
        footerEl.innerHTML = DOMPurify.sanitize(footer);
      } else {
        footerEl.appendChild(footer);
      }
      modalContent.appendChild(footerEl);
    }

    dialog.appendChild(modalContent);
    modal.appendChild(backdrop);
    modal.appendChild(dialog);

    // Modal controller
    const controller = {
      open() {
        document.body.appendChild(modal);
        document.body.classList.add('ux-modal-open');
        useActions().showModal(modalId);

        // Focus trap
        const focusableElements = modal.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length) {
          focusableElements[0].focus();
        }
      },

      close() {
        modal.remove();
        document.body.classList.remove('ux-modal-open');
        useActions().hideModal();
        onClose();
      },

      setContent(newContent) {
        if (typeof newContent === 'string') {
          body.innerHTML = DOMPurify.sanitize(newContent);
        } else {
          body.innerHTML = ''; // Safe - clearing content only
          body.appendChild(newContent);
        }
      },
    };

    // Close on backdrop click
    backdrop.addEventListener('click', () => {
      if (closable) {
        controller.close();
      }
    });

    // Close on escape key
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && closable) {
        controller.close();
      }
    });

    return controller;
  },

  /**
   * Create a spinner element
   * @param {Object} options - Spinner configuration
   * @returns {HTMLElement}
   */
  createSpinner(options = {}) {
    const {
      size = 'medium', // small, medium, large
      text = '',
      className = '',
    } = options;

    const container = document.createElement('div');
    container.className = `ux-spinner-container ${className}`;

    const spinner = document.createElement('div');
    spinner.className = `ux-spinner ux-spinner--${size}`;
    container.appendChild(spinner);

    if (text) {
      const label = document.createElement('div');
      label.className = 'ux-spinner__label ux-text ux-text--body-2';
      label.textContent = text;
      container.appendChild(label);
    }

    return container;
  },

  /**
   * Create an alert element
   * @param {Object} options - Alert configuration
   * @returns {HTMLElement}
   */
  createAlert(options = {}) {
    const {
      message = '',
      type = 'info', // info, success, warning, error
      dismissible = true,
      onDismiss = () => {},
      className = '',
    } = options;

    const alert = document.createElement('div');
    alert.className = `ux-alert ux-alert--${type} ${className}`;

    const icon = document.createElement('span');
    icon.className = `ux-icon ux-icon--${type}`;
    alert.appendChild(icon);

    const content = document.createElement('div');
    content.className = 'ux-alert__content';
    content.innerHTML = DOMPurify.sanitize(message);
    alert.appendChild(content);

    if (dismissible) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'ux-alert__close ux-button ux-button--tertiary ux-button--small';
      closeBtn.innerHTML = DOMPurify.sanitize('<span class="ux-icon ux-icon--close"></span>');
      closeBtn.addEventListener('click', () => {
        alert.remove();
        onDismiss();
      });
      alert.appendChild(closeBtn);
    }

    return alert;
  },

  /**
   * Create a chip/tag element
   * @param {Object} options - Chip configuration
   * @returns {HTMLElement}
   */
  createChip(options = {}) {
    const {
      text = '',
      variant = 'default', // default, primary, success, warning, error
      size = 'medium', // small, medium
      dismissible = false,
      onDismiss = () => {},
      className = '',
    } = options;

    const chip = document.createElement('span');
    chip.className = `ux-chip ux-chip--${variant} ux-chip--${size} ${className}`;

    const label = document.createElement('span');
    label.className = 'ux-chip__label';
    label.textContent = text;
    chip.appendChild(label);

    if (dismissible) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'ux-chip__close';
      closeBtn.innerHTML = DOMPurify.sanitize('<span class="ux-icon ux-icon--close-small"></span>');
      closeBtn.addEventListener('click', () => {
        chip.remove();
        onDismiss();
      });
      chip.appendChild(closeBtn);
    }

    return chip;
  },

  /**
   * Show a growl notification
   * @param {Object} options - Growl configuration
   */
  showGrowl(options = {}) {
    const {
      message = '',
      type = 'info', // info, success, warning, error
      duration = 3000,
      position = 'top-right', // top-left, top-center, top-right, bottom-left, bottom-center, bottom-right
    } = options;

    // Use the store's growl action
    useActions().showGrowl(message, type, duration);

    // Create growl container if it doesn't exist
    let container = document.getElementById('ux-growl-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'ux-growl-container';
      container.className = `ux-growl-container ux-growl-container--${position}`;
      document.body.appendChild(container);
    }

    const growl = this.createAlert({
      message,
      type,
      dismissible: true,
      className: 'ux-growl',
    });

    container.appendChild(growl);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        growl.remove();
      }, duration);
    }
  },

  /**
   * Create a tooltip
   * @param {HTMLElement} target - Element to attach tooltip to
   * @param {Object} options - Tooltip configuration
   */
  createTooltip(target, options = {}) {
    const {
      content = '',
      position = 'top', // top, bottom, left, right
      trigger = 'hover', // hover, click, focus
      delay = 200,
    } = options;

    const tooltip = document.createElement('div');
    tooltip.className = `ux-tooltip ux-tooltip--${position}`;
    tooltip.innerHTML = DOMPurify.sanitize(content);

    let showTimeout;
    let hideTimeout;

    const show = () => {
      clearTimeout(hideTimeout);
      showTimeout = setTimeout(() => {
        document.body.appendChild(tooltip);

        // Position the tooltip
        const targetRect = target.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();

        // Calculate position based on preferred position
        let top, left;
        switch (position) {
          case 'top':
            top = targetRect.top - tooltipRect.height - 8;
            left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
            break;
          case 'bottom':
            top = targetRect.bottom + 8;
            left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
            break;
          case 'left':
            top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
            left = targetRect.left - tooltipRect.width - 8;
            break;
          case 'right':
            top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
            left = targetRect.right + 8;
            break;
        }

        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
        tooltip.classList.add('ux-tooltip--visible');
      }, delay);
    };

    const hide = () => {
      clearTimeout(showTimeout);
      hideTimeout = setTimeout(() => {
        tooltip.classList.remove('ux-tooltip--visible');
        setTimeout(() => tooltip.remove(), 200);
      }, 100);
    };

    // Attach event listeners based on trigger
    if (trigger === 'hover') {
      target.addEventListener('mouseenter', show);
      target.addEventListener('mouseleave', hide);
      tooltip.addEventListener('mouseenter', () => clearTimeout(hideTimeout));
      tooltip.addEventListener('mouseleave', hide);
    } else if (trigger === 'click') {
      target.addEventListener('click', (e) => {
        e.stopPropagation();
        if (tooltip.classList.contains('ux-tooltip--visible')) {
          hide();
        } else {
          show();
        }
      });
      document.addEventListener('click', hide);
    } else if (trigger === 'focus') {
      target.addEventListener('focus', show);
      target.addEventListener('blur', hide);
    }

    return {
      show,
      hide,
      destroy: () => {
        hide();
        target.removeEventListener('mouseenter', show);
        target.removeEventListener('mouseleave', hide);
        target.removeEventListener('click', show);
        target.removeEventListener('focus', show);
        target.removeEventListener('blur', hide);
      },
    };
  },

  /**
   * Create a box element for spacing and layout (UXCore 2400+ only)
   * @param {Object} options - Box configuration
   * @returns {HTMLElement}
   */
  createBox(options = {}) {
    const {
      padding = null,     // 'small', 'medium', 'large', or custom
      margin = null,      // 'small', 'medium', 'large', or custom
      display = 'block',  // 'block', 'flex', 'inline', 'inline-block'
      children = null,
      className = '',
    } = options;

    const box = document.createElement('div');
    box.className = `ux-box ${className}`;

    if (padding) {
      box.classList.add(`ux-box--padding-${padding}`);
    }

    if (margin) {
      box.classList.add(`ux-box--margin-${margin}`);
    }

    if (display !== 'block') {
      box.classList.add(`ux-box--display-${display}`);
    }

    if (children) {
      if (Array.isArray(children)) {
        children.forEach(child => {
          if (typeof child === 'string') {
            box.innerHTML = DOMPurify.sanitize(box.innerHTML + child);
          } else {
            box.appendChild(child);
          }
        });
      } else if (typeof children === 'string') {
        box.innerHTML = DOMPurify.sanitize(children);
      } else {
        box.appendChild(children);
      }
    }

    return box;
  },

  /**
   * Create a text lockup element for better spacing control (UXCore 2400+ only)
   * @param {Object} options - TextLockup configuration
   * @returns {HTMLElement}
   */
  createTextLockup(options = {}) {
    const {
      texts = [],         // Array of text objects: [{text: 'Hello', variant: 'heading-1'}, ...]
      spacing = 'tight',  // 'tight', 'normal', 'loose'
      className = '',
    } = options;

    const lockup = document.createElement('div');
    lockup.className = `ux-text-lockup ux-text-lockup--spacing-${spacing} ${className}`;

    texts.forEach(textConfig => {
      const {
        text = '',
        variant = 'body-1', // 'heading-1', 'heading-2', 'body-1', 'body-2', etc.
        tag = null,         // Override default tag for semantic HTML
      } = textConfig;

      const element = document.createElement(tag || this._getDefaultTagForVariant(variant));
      element.className = `ux-text ux-text--${variant}`;
      element.textContent = text;
      lockup.appendChild(element);
    });

    return lockup;
  },

  /**
   * Helper method to get default HTML tag for text variant
   * @private
   */
  _getDefaultTagForVariant(variant) {
    const tagMap = {
      'heading-1': 'h1',
      'heading-2': 'h2',
      'heading-3': 'h3',
      'heading-4': 'h4',
      'heading-5': 'h5',
      'heading-6': 'h6',
      'body-1': 'p',
      'body-2': 'p',
      'caption': 'span',
      'label': 'label',
    };

    return tagMap[variant] || 'span';
  },
};

// Initialize UX components when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('✨ UX Components ready');
  });
} else {
  console.log('✨ UX Components ready');
}

// Export for global access
window.UXComponents = UXComponents;
