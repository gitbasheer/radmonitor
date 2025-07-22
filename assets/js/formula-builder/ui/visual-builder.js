/**
 * Visual Builder - Drag and drop formula builder
 */

import DOMPurify from './../../lib/dompurify.js';

export class VisualBuilder {
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;
  }

  render() {
    // Stub implementation
    this.container.innerHTML = DOMPurify.sanitize('<div class="visual-builder-stub">Visual Builder</div>');
  }
}
