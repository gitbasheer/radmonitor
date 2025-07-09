/**
 * Dashboard UX Migration
 * Replaces hardcoded buttons and UI elements with UXCore components
 */

import { UXComponents } from './components/ux-components.js';

class DashboardUXMigration {
  constructor() {
    this.migrated = false;
  }

  /**
   * Initialize UX migration
   */
  init() {
    if (this.migrated) return;

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.migrateComponents());
    } else {
      this.migrateComponents();
    }
  }

  /**
   * Migrate all hardcoded components to UXCore
   */
  migrateComponents() {
    try {
      this.migrateButtons();
      this.migrateSearchInput();
      this.migrateFilterButtons();
      this.migrateModals();
      this.migrated = true;
      console.log('✅ Dashboard UX migration completed');
    } catch (error) {
      console.error('❌ Dashboard UX migration failed:', error);
    }
  }

  /**
   * Replace hardcoded buttons with UXCore buttons
   */
  migrateButtons() {
    const buttonMigrations = [
      {
        selector: 'button[onclick="Dashboard.testApiConnection()"]',
        config: {
          text: 'Test All Connections',
          variant: 'secondary',
          onClick: () => Dashboard.testApiConnection(),
          className: 'test-connections-btn'
        }
      },
      {
        selector: 'button[onclick="Dashboard.refresh()"]',
        config: {
          text: '🔄 REFRESH DATA',
          variant: 'primary',
          onClick: () => Dashboard.refresh(),
          disabled: true,
          className: 'refresh-data-btn'
        }
      },
      {
        selector: 'button[onclick="showAdvancedEditor()"]',
        config: {
          text: '⚙️ CONFIGURATION',
          variant: 'secondary',
          onClick: () => showAdvancedEditor(),
          disabled: true,
          className: 'configuration-btn'
        }
      },
      {
        selector: 'button[onclick="ConfigManager.exportConfiguration()"]',
        config: {
          text: 'Export Config',
          variant: 'secondary',
          onClick: () => ConfigManager.exportConfiguration(),
          className: 'export-config-btn'
        }
      },
      {
        selector: 'button[onclick="Dashboard.showApiSetupInstructions()"]',
        config: {
          text: 'Help',
          variant: 'secondary',
          onClick: () => Dashboard.showApiSetupInstructions(),
          className: 'help-btn'
        }
      },
      {
        selector: 'button[onclick="testFormula()"]',
        config: {
          text: '🧪 Test Formula',
          variant: 'primary',
          onClick: () => testFormula(),
          disabled: true,
          className: 'test-formula-btn'
        }
      },
      {
        selector: 'button[onclick="showHowItWorksModal()"]',
        config: {
          text: '📖 How It Works',
          variant: 'secondary',
          onClick: () => showHowItWorksModal(),
          className: 'how-it-works-btn'
        }
      }
    ];

    buttonMigrations.forEach(({ selector, config }) => {
      const originalBtn = document.querySelector(selector);
      if (originalBtn) {
        const newBtn = UXComponents.createButton(config);

        // Copy ID if exists
        if (originalBtn.id) {
          newBtn.id = originalBtn.id;
        }

        // Copy styles if needed
        if (originalBtn.style.width) {
          newBtn.style.width = originalBtn.style.width;
        }
        if (originalBtn.style.marginBottom) {
          newBtn.style.marginBottom = originalBtn.style.marginBottom;
        }

        originalBtn.replaceWith(newBtn);
        console.log(`✅ Migrated button: ${config.text}`);
      }
    });
  }

  /**
   * Replace search input with UXCore TextInput
   */
  migrateSearchInput() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      // Create UXCore search component would go here
      // For now, just add UXCore classes
      searchInput.className = 'ux-text-input ux-text-input--search';
      console.log('✅ Migrated search input');
    }
  }

  /**
   * Replace filter buttons with UXCore chips/buttons
   */
  migrateFilterButtons() {
    // Migrate main filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach((btn) => {
      const isActive = btn.classList.contains('active');
      const text = btn.textContent;
      const filter = btn.getAttribute('data-filter');

      const chip = UXComponents.createChip({
        text: text,
        variant: isActive ? 'primary' : 'default',
        className: `filter-chip ${isActive ? 'active' : ''}`,
      });

      // Copy the data attribute and click handler
      chip.setAttribute('data-filter', filter);
      chip.addEventListener('click', () => {
        // Remove active from all chips
        document.querySelectorAll('.filter-chip').forEach(c => {
          c.classList.remove('active');
          c.className = c.className.replace('ux-chip--primary', 'ux-chip--default');
        });

        // Add active to clicked chip
        chip.classList.add('active');
        chip.className = chip.className.replace('ux-chip--default', 'ux-chip--primary');

        // Trigger original functionality
        if (window.setFilter) {
          window.setFilter(filter);
        }
      });

      btn.replaceWith(chip);
    });

    console.log('✅ Migrated filter buttons to chips');
  }

  /**
   * Replace custom modals with UXCore modals
   */
  migrateModals() {
    // How It Works Modal
    this.migrateHowItWorksModal();

    // Advanced Editor Modal
    this.migrateAdvancedEditorModal();
  }

  /**
   * Migrate How It Works modal to UXCore
   */
  migrateHowItWorksModal() {
    const originalModal = document.getElementById('howItWorksModal');
    if (originalModal) {
      // Hide original modal
      originalModal.style.display = 'none';

      // Create UXCore modal controller
      window.howItWorksModalController = UXComponents.createModal({
        title: '📖 How RAD Monitor Works',
        content: '', // Will be set dynamically
        size: 'large',
        className: 'how-it-works-ux-modal'
      });

      // Update global function to use UXCore modal
      window.showHowItWorksModal = () => {
        const content = generateHowItWorksContent();
        window.howItWorksModalController.setContent(content);
        window.howItWorksModalController.open();
      };

      window.closeHowItWorksModal = () => {
        window.howItWorksModalController.close();
      };

      console.log('✅ Migrated How It Works modal');
    }
  }

  /**
   * Migrate Advanced Editor modal to UXCore
   */
  migrateAdvancedEditorModal() {
    const originalModal = document.getElementById('advancedEditorModal');
    if (originalModal) {
      // Hide original modal
      originalModal.style.display = 'none';

      // Create footer buttons
      const saveBtn = UXComponents.createButton({
        text: 'Apply Changes',
        variant: 'primary',
        onClick: () => ConfigEditor.saveConfig()
      });

      const resetBtn = UXComponents.createButton({
        text: 'Reset to Defaults',
        variant: 'secondary',
        onClick: () => ConfigEditor.resetToDefaults()
      });

      const cancelBtn = UXComponents.createButton({
        text: 'Cancel',
        variant: 'secondary',
        onClick: () => window.advancedEditorModalController.close()
      });

      const footerContainer = UXComponents.createBox({
        display: 'flex',
        className: 'modal-footer-buttons',
        children: [saveBtn, resetBtn, cancelBtn]
      });
      footerContainer.style.cssText = 'gap: 10px; justify-content: center;';

      // Create content container
      const contentContainer = document.createElement('div');
      contentContainer.innerHTML = `
        <div id="configEditorFields">
          <!-- Config fields will be loaded here -->
        </div>
        <div id="configEditorStatus" style="margin: 15px 0 10px 0; font-size: 13px; color: #666; text-align: center;"></div>
      `;

      // Create UXCore modal controller
      window.advancedEditorModalController = UXComponents.createModal({
        title: '⚙️ Configuration Settings',
        content: contentContainer,
        footer: footerContainer,
        size: 'large',
        className: 'advanced-editor-ux-modal'
      });

      // Update global functions
      window.showAdvancedEditor = async () => {
        await ConfigEditor.loadConfig();
        window.advancedEditorModalController.open();
      };

      window.closeAdvancedEditor = () => {
        window.advancedEditorModalController.close();
      };

      console.log('✅ Migrated Advanced Editor modal');
    }
  }
}

// Initialize migration
const dashboardUXMigration = new DashboardUXMigration();
dashboardUXMigration.init();

export { dashboardUXMigration };
