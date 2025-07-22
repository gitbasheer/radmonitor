/**
 * Function Palette - UI component for function library
 */

import DOMPurify from './../../lib/dompurify.js';

export class FunctionPalette {
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;
  }

  render() {
    // Stub implementation
    this.container.innerHTML = DOMPurify.sanitize('<div class="function-palette-stub">Function Palette</div>');
  }
}
