/**
 * Visual Formula Builder Integration
 * Integrates the enhanced visual builder with the RAD Monitor dashboard
 *
 * @module VisualFormulaBuilderIntegration
 * @description This module provides a visual drag-and-drop interface for creating
 * monitoring formulas. It integrates with the existing formula editor and provides
 * RAD-specific templates and fields.
 *
 * @example
 * // The module auto-initializes when loaded
 * import { visualBuilderIntegration } from './visual-formula-builder-integration.js';
 *
 * // Programmatically show the modal
 * visualBuilderIntegration.showModal();
 *
 * // Add custom templates
 * visualBuilderIntegration.setTemplates([
 *   { name: 'Custom Alert', formula: 'count() > 1000', description: 'High traffic alert' }
 * ]);
 */

import { EnhancedFormulaBuilder } from './formula-builder/ui/enhanced-visual-builder.js';
import { FORMULA_PATTERNS } from './formula-builder/core/formula-functions.js';
import { UXComponents } from './components/ux-components.js';

/**
 * RAD-specific fields for the visual builder
 * @constant {Array<Object>} RAD_FIELDS
 * @property {string} name - Field name
 * @property {string} type - Field data type (string, number, date)
 * @property {string} description - Human-readable description
 */
const RAD_FIELDS = [
  { name: 'event_id', type: 'string', description: 'Traffic event identifier' },
  { name: 'rad_type', type: 'string', description: 'RAD type classification' },
  { name: 'count', type: 'number', description: 'Event count' },
  { name: 'unique_users', type: 'number', description: 'Unique user count' },
  { name: 'response_time', type: 'number', description: 'Average response time' },
  { name: 'error_count', type: 'number', description: 'Number of errors' },
  { name: 'timestamp', type: 'date', description: 'Event timestamp' }
];

/**
 * Main integration class for the Visual Formula Builder
 * @class VisualFormulaBuilderIntegration
 */
class VisualFormulaBuilderIntegration {
  /**
   * Creates an instance of VisualFormulaBuilderIntegration
   * @constructor
   */
  constructor() {
    /** @type {HTMLElement|null} Modal container element */
    this.modal = null;
    /** @type {EnhancedFormulaBuilder|null} Visual builder component instance */
    this.builder = null;
    /** @type {boolean} Initialization state flag */
    this.initialized = false;
  }

  /**
   * Initializes the visual builder integration
   * @async
   * @returns {Promise<void>}
   */
  async init() {
    if (this.initialized) return;

    // Create the Visual Formula Builder button
    this.addVisualBuilderButton();

    // Create the modal structure
    this.createModal();

    // Initialize the builder component
    this.initBuilder();

    this.initialized = true;
  }

  /**
   * Adds the Visual Builder button to the formula editor section
   * @private
   * @description Finds the formula editor container and adds a button that opens the visual builder modal.
   * Uses DOM traversal instead of :has() selector for better browser compatibility.
   */
  addVisualBuilderButton() {
    // Find the formula editor container - improved browser compatibility
    let formulaSection = null;
    const allSections = document.querySelectorAll('.control-section');
    for (const section of allSections) {
      if (section.querySelector('#formulaEditorContainer')) {
        formulaSection = section;
        break;
      }
    }

    if (!formulaSection) {
      console.warn('Formula editor section not found');
      return;
    }

    // Add the Visual Builder button after the label
    const label = formulaSection.querySelector('.control-label');
    if (label) {
      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'formula-header-container';

      // Move the label into the container
      const labelClone = label.cloneNode(true);
      buttonContainer.appendChild(labelClone);

      // Create the button using UXComponents
      const visualBuilderBtn = UXComponents.createButton({
        text: '🎨 Visual Builder',
        variant: 'secondary',
        size: 'small',
        onClick: () => this.showModal(),
        className: 'formula-visual-builder-btn'
      });
      visualBuilderBtn.id = 'visualBuilderBtn';

      buttonContainer.appendChild(visualBuilderBtn);
      label.replaceWith(buttonContainer);
    }
  }

  /**
   * Creates the modal dialog for the visual builder
   * @private
   * @description Uses UXComponents.createModal() for consistent styling and behavior
   */
  createModal() {
    // Create visual formula builder component
    const builder = document.createElement('enhanced-formula-builder');
    builder.id = 'visualFormulaBuilder';
    builder.style.cssText = 'width: 100%; height: 100%;';

    // Create footer with UXComponents buttons
    const insertBtn = UXComponents.createButton({
      text: 'Insert Formula',
      variant: 'primary',
      onClick: () => this.insertFormula(),
      className: 'formula-insert-btn'
    });

    const cancelBtn = UXComponents.createButton({
      text: 'Cancel',
      variant: 'secondary',
      onClick: () => this.modalController.close(),
      className: 'formula-cancel-btn'
    });

    const footerContainer = UXComponents.createBox({
      display: 'flex',
      className: 'modal-footer-buttons',
      children: [insertBtn, cancelBtn]
    });
    footerContainer.style.cssText = 'gap: 10px; justify-content: flex-end; padding: 15px 20px; border-top: 1px solid #eee;';

    // Create modal using UXComponents
    this.modalController = UXComponents.createModal({
      title: '🎨 Visual Formula Builder',
      content: builder,
      footer: footerContainer,
      size: 'large',
      onClose: () => {
        console.log('Visual builder modal closed');
      },
      className: 'visual-builder-modal'
    });

    this.modal = document.getElementById(this.modalController.modalId);
  }

  /**
   * Initializes the enhanced formula builder component
   * @private
   * @description Waits for the web component to be defined, then configures it with
   * RAD-specific fields and templates.
   */
  initBuilder() {
    this.builder = document.getElementById('visualFormulaBuilder');

    if (!this.builder) {
      console.debug('Visual formula builder element not found - skipping initialization');
      return;
    }

    // Wait for component to be defined
    customElements.whenDefined('enhanced-formula-builder').then(() => {
      // Configure the builder
      this.builder.userLevel = 'beginner'; // Start in beginner mode

      // Add RAD-specific fields
      if (typeof this.builder.addCustomFields === 'function') {
        try {
          this.builder.addCustomFields(RAD_FIELDS);
        } catch (error) {
          console.error('Failed to add custom fields:', error);
        }
      }

      // Get RAD-specific templates
      const radTemplates = Object.entries(FORMULA_PATTERNS)
        .filter(([_, pattern]) => pattern && pattern.category === 'rad-monitoring')
        .map(([name, pattern]) => ({
          name,
          formula: pattern.formula || '',
          description: pattern.description || ''
        }));

      // Add templates to the builder
      if (typeof this.builder.addTemplates === 'function' && radTemplates.length > 0) {
        try {
          this.builder.addTemplates(radTemplates);
        } catch (error) {
          console.error('Failed to add templates:', error);
        }
      }

      // Listen for formula changes
      this.builder.addEventListener('formula-change', (event) => {
        console.log('Formula changed:', event.detail);
      });
    }).catch(error => {
      console.error('Failed to initialize enhanced-formula-builder:', error);
    });
  }

  /**
   * Shows the visual builder modal
   * @public
   */
  showModal() {
    if (!this.modalController) {
      console.error('Modal not initialized');
      return;
    }

    // Show the modal using UXComponents controller
    this.modalController.open();

    // Focus the builder
    if (this.builder && this.builder.focus) {
      setTimeout(() => this.builder.focus(), 100);
    }
  }

  /**
   * Hides the visual builder modal
   * @public
   */
  hideModal() {
    if (this.modalController) {
      this.modalController.close();
    }
  }

  /**
   * Inserts the formula from the visual builder into the main formula editor
   * @private
   * @description Validates the formula, waits for the editor to be ready, then inserts
   * the formula and provides visual feedback.
   */
  insertFormula() {
    if (!this.builder) {
      console.error('Builder not initialized');
      this.showError('Visual builder not properly initialized');
      return;
    }

    // Get the formula from the builder
    const formula = this.builder.formula || '';

    if (!formula || formula.trim() === '') {
      this.showError('Please create a formula before inserting');
      return;
    }

    // Find the main formula editor
    const formulaEditor = document.getElementById('formulaEditor');
    if (!formulaEditor) {
      console.error('Formula editor element not found');
      this.showError('Could not find formula editor');
      return;
    }

    // Wait for the editor to be ready
    customElements.whenDefined('enhanced-formula-editor').then(() => {
      if (typeof formulaEditor.setValue === 'function') {
        // Set the formula in the main editor
        formulaEditor.setValue(formula);

        // Trigger a change event
        formulaEditor.dispatchEvent(new CustomEvent('formula-change', {
          detail: { formula, source: 'visual-builder' },
          bubbles: true
        }));

        // Close the modal
        this.hideModal();

        // Show success message
        this.showSuccess('Formula inserted from Visual Builder');
      } else {
        console.error('Formula editor does not have setValue method');
        this.showError('Formula editor not properly initialized');
      }
    }).catch(error => {
      console.error('Failed to insert formula:', error);
      this.showError('Failed to insert formula');
    });
  }

  /**
   * Shows a success message to the user
   * @private
   * @param {string} message - The success message to display
   */
  showSuccess(message) {
    const validationEl = document.getElementById('formulaStatus');
    if (validationEl) {
      validationEl.textContent = message;
      validationEl.style.color = '#4CAF50';

      // Reset after 3 seconds
      setTimeout(() => {
        validationEl.textContent = 'Ready to create formulas';
        validationEl.style.color = '#666';
      }, 3000);
    }
  }

  /**
   * Shows an error message to the user
   * @private
   * @param {string} message - The error message to display
   */
  showError(message) {
    const validationEl = document.getElementById('formulaStatus');
    if (validationEl) {
      validationEl.textContent = message;
      validationEl.style.color = '#ef4444';

      // Reset after 5 seconds
      setTimeout(() => {
        validationEl.textContent = 'Ready to create formulas';
        validationEl.style.color = '#666';
      }, 5000);
    } else {
      // Fallback to alert if no validation element
      alert(message);
    }
  }

  /**
   * Programmatically sets custom templates
   * @public
   * @param {Array<Object>} templates - Array of template objects
   * @param {string} templates[].name - Template name
   * @param {string} templates[].formula - Formula expression
   * @param {string} templates[].description - Template description
   */
  setTemplates(templates) {
    if (this.builder && this.builder.addTemplates) {
      this.builder.addTemplates(templates);
    }
  }

  /**
   * Programmatically sets custom fields
   * @public
   * @param {Array<Object>} fields - Array of field objects
   * @param {string} fields[].name - Field name
   * @param {string} fields[].type - Field type (string, number, date)
   * @param {string} fields[].description - Field description
   */
  setFields(fields) {
    if (this.builder && this.builder.addCustomFields) {
      this.builder.addCustomFields(fields);
    }
  }
}

// Create and export the integration instance
const visualBuilderIntegration = new VisualFormulaBuilderIntegration();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => visualBuilderIntegration.init());
} else {
  visualBuilderIntegration.init();
}

// Make it globally available for the onclick handlers
window.visualBuilderIntegration = visualBuilderIntegration;

export { visualBuilderIntegration };
