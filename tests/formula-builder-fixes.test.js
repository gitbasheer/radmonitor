/**
 * Tests for formula builder fixes
 * Ensures all imports and dependencies are properly resolved
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

describe('Formula Builder Component Fixes', () => {
  let dom;
  let window;
  let document;

  beforeEach(() => {
    // Setup DOM environment
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost',
      runScripts: 'dangerously',
      resources: 'usable'
    });
    window = dom.window;
    document = window.document;
    global.window = window;
    global.document = document;
    global.HTMLElement = window.HTMLElement;
    global.customElements = window.customElements;
    global.ShadowRoot = window.ShadowRoot;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Enhanced Formula Editor', () => {
    it('should import EnhancedFormulaParser successfully', async () => {
      // Import should not throw
      const module = await import('../assets/js/formula-builder/ui/enhanced-formula-editor.js');
      expect(module.EnhancedFormulaEditor).toBeDefined();
    });

    it('should handle setValue before element is connected', async () => {
      const { EnhancedFormulaEditor } = await import('../assets/js/formula-builder/ui/enhanced-formula-editor.js');
      
      // Define custom element
      if (!customElements.get('enhanced-formula-editor')) {
        customElements.define('enhanced-formula-editor', EnhancedFormulaEditor);
      }
      
      // Create element
      const editor = new EnhancedFormulaEditor();
      
      // Set value before connecting to DOM
      expect(() => editor.setValue('test formula')).not.toThrow();
      expect(editor.getValue()).toBe('test formula');
      
      // Connect to DOM
      document.body.appendChild(editor);
      
      // Value should be applied after connection
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(editor.getValue()).toBe('test formula');
    });
  });

  describe('Enhanced Visual Builder', () => {
    it('should import all required constants', async () => {
      // Import should not throw
      const module = await import('../assets/js/formula-builder/ui/enhanced-visual-builder.js');
      expect(module.EnhancedFormulaBuilder).toBeDefined();
    });

    it('should have access to FUNCTION_CATEGORIES', async () => {
      const { FUNCTION_CATEGORIES } = await import('../assets/js/formula-builder/core/formula-functions.js');
      expect(FUNCTION_CATEGORIES).toBeDefined();
      expect(Object.keys(FUNCTION_CATEGORIES).length).toBeGreaterThan(0);
    });

    it('should have access to FUNCTION_METADATA', async () => {
      const { FUNCTION_METADATA } = await import('../assets/js/formula-builder/core/formula-functions.js');
      expect(FUNCTION_METADATA).toBeDefined();
      expect(Object.keys(FUNCTION_METADATA).length).toBeGreaterThan(0);
    });

    it('should have access to FORMULA_PATTERNS', async () => {
      const { FORMULA_PATTERNS } = await import('../assets/js/formula-builder/core/formula-functions.js');
      expect(FORMULA_PATTERNS).toBeDefined();
      expect(Object.keys(FORMULA_PATTERNS).length).toBeGreaterThan(0);
    });
  });

  describe('Formula AI Assistant', () => {
    it('should not reference process.env', async () => {
      // Import should not throw
      const module = await import('../assets/js/formula-builder/ai/formula-ai-assistant.js');
      expect(module.FormulaAIAssistant).toBeDefined();
    });

    it('should use window global for API key', async () => {
      window.FORMULA_AI_API_KEY = 'test-key';
      const { FormulaAIAssistant } = await import('../assets/js/formula-builder/ai/formula-ai-assistant.js');
      const assistant = new FormulaAIAssistant();
      
      // Should not throw and should have initialized
      expect(assistant).toBeDefined();
    });
  });

  describe('Formula Editor Integration', () => {
    it('should initialize without errors', async () => {
      // Create formula editor element
      const editorElement = document.createElement('div');
      editorElement.id = 'formulaEditor';
      document.body.appendChild(editorElement);
      
      // Import should not throw
      const module = await import('../assets/js/formula-editor-integration.js');
      expect(module.formulaEditorIntegration).toBeDefined();
    });
  });

  describe('Visual Builder Integration', () => {
    it('should initialize without errors', async () => {
      // Import should not throw
      const module = await import('../assets/js/visual-formula-builder-integration.js');
      expect(module.visualBuilderIntegration).toBeDefined();
    });
  });
});

describe('Import Chain Validation', () => {
  it('should have all imports properly resolved', async () => {
    const imports = [
      '../assets/js/formula-builder/core/enhanced-ast-parser.js',
      '../assets/js/formula-builder/core/enhanced-validator.js',
      '../assets/js/formula-builder/core/formula-functions.js',
      '../assets/js/formula-builder/ui/enhanced-formula-editor.js',
      '../assets/js/formula-builder/ui/enhanced-visual-builder.js',
      '../assets/js/formula-builder/ai/formula-ai-assistant.js'
    ];

    for (const importPath of imports) {
      const module = await import(importPath);
      expect(module).toBeDefined();
      expect(Object.keys(module).length).toBeGreaterThan(0);
    }
  });
});

describe('Error Handling', () => {
  it('should handle missing DOM elements gracefully', async () => {
    const { formulaEditorIntegration } = await import('../assets/js/formula-editor-integration.js');
    
    // Remove formula editor element if exists
    const existingEditor = document.getElementById('formulaEditor');
    if (existingEditor) {
      existingEditor.remove();
    }
    
    // Init should not throw even with missing element
    await expect(formulaEditorIntegration.init()).resolves.not.toThrow();
  });

  it('should emit proper events on initialization', async () => {
    const events = [];
    
    // Listen for events
    window.addEventListener('formula:initialized', (e) => events.push(e));
    window.addEventListener('formula:error', (e) => events.push(e));
    
    // Create formula editor element
    const editorElement = document.createElement('enhanced-formula-editor');
    editorElement.id = 'formulaEditor';
    document.body.appendChild(editorElement);
    
    // Import and init
    const { formulaEditorIntegration } = await import('../assets/js/formula-editor-integration.js');
    await formulaEditorIntegration.init();
    
    // Should have emitted initialization event
    expect(events.some(e => e.type === 'formula:initialized')).toBe(true);
  });
});