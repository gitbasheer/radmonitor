/**
 * Theme Manager - Handles theme switching for the dashboard
 */

import { ConfigService } from './config-service.js';

export const ThemeManager = {
    /**
     * Initialize theme manager and apply saved theme
     */
    async init() {
        // Apply theme from config
        await this.applyTheme();
        
        // Listen for theme changes
        ConfigService.subscribe(({ event, newConfig, oldConfig }) => {
            if (newConfig?.theme !== oldConfig?.theme) {
                this.setTheme(newConfig.theme);
            }
        });
    },
    
    /**
     * Apply theme based on current configuration
     */
    async applyTheme() {
        const config = await ConfigService.getConfig();
        const theme = config.theme || 'light';
        this.setTheme(theme);
    },
    
    /**
     * Set the theme
     * @param {string} theme - 'light', 'dark', or 'auto'
     */
    setTheme(theme) {
        // Remove existing theme classes
        document.body.classList.remove('light-theme', 'dark-theme');
        
        if (theme === 'auto') {
            // Detect system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            theme = prefersDark ? 'dark' : 'light';
        }
        
        // Apply theme class
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.add('light-theme');
        }
        
        console.log(`Theme applied: ${theme}`);
    },
    
    /**
     * Toggle between light and dark theme
     */
    toggleTheme() {
        const isDark = document.body.classList.contains('dark-theme');
        const newTheme = isDark ? 'light' : 'dark';
        
        // Update config
        ConfigService.set('theme', newTheme);
    },
    
    /**
     * Listen for system theme changes when in auto mode
     */
    setupAutoThemeListener() {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        mediaQuery.addEventListener('change', async (e) => {
            const config = await ConfigService.getConfig();
            if (config.theme === 'auto') {
                this.setTheme('auto');
            }
        });
    }
};

// Auto-initialize when loaded
if (typeof window !== 'undefined') {
    // Initialize after ConfigService is ready
    window.addEventListener('DOMContentLoaded', async () => {
        // Wait a bit for ConfigService to initialize
        setTimeout(() => {
            ThemeManager.init();
            ThemeManager.setupAutoThemeListener();
        }, 100);
    });
}

export default ThemeManager;