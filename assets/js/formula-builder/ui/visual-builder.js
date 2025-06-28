/**
 * Visual Builder - Drag and drop formula builder
 */

export class VisualBuilder {
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;
  }

  render() {
    // Stub implementation
    this.container.innerHTML = '<div class="visual-builder-stub">Visual Builder</div>';
  }
}
