/**
 * Authentication Prompt Component
 * Uses unified RAD Monitor theme
 */

import { radTheme as theme } from '../theme/rad-theme.js';

/**
 * Create authentication prompt HTML
 * @returns {string} HTML string for the auth prompt
 */
export function createAuthPrompt() {
    try {
        return `
            <div class="auth-prompt-container" style="
                background-color: ${theme.colors.background.primary};
                border: 1px solid ${theme.colors.border.primary};
                border-radius: ${theme.borderRadius.medium};
                padding: ${theme.spacing.xxxl};
                margin: ${theme.spacing.xl};
                text-align: center;
                color: ${theme.colors.text.primary};
            ">
                <h2 style="
                    color: ${theme.colors.text.accent};
                    margin-bottom: ${theme.spacing.xl};
                    font-size: ${theme.typography.fontSize.xlarge};
                    font-weight: 500;
                ">🔐 Authentication Required</h2>

            <p style="
                font-size: ${theme.typography.fontSize.medium};
                margin-bottom: ${theme.spacing.xxl};
                color: ${theme.colors.text.secondary};
                line-height: 1.5;
            ">To view RAD traffic data, you need to authenticate with your Kibana session.</p>

            <div style="
                background-color: ${theme.colors.background.secondary};
                border: 1px solid ${theme.colors.border.secondary};
                border-radius: ${theme.borderRadius.medium};
                padding: ${theme.spacing.xxl};
                margin: ${theme.spacing.xl} 0;
            ">
                <h3 style="
                    color: ${theme.colors.text.primary};
                    margin-bottom: 20px;
                    font-size: ${theme.typography.fontSize.large};
                    font-weight: 500;
                ">Quick Setup:</h3>

                <ol style="
                    text-align: left;
                    max-width: 500px;
                    margin: 0 auto;
                    color: ${theme.colors.text.secondary};
                    line-height: 1.8;
                ">
                    <li style="margin-bottom: ${theme.spacing.md};">
                        Open your browser console <code class="auth-code" style="
                            background-color: ${theme.colors.background.primary};
                            padding: ${theme.spacing.xs} ${theme.spacing.sm};
                            border-radius: ${theme.borderRadius.small};
                            font-family: monospace;
                            font-size: ${theme.typography.fontSize.small};
                            color: ${theme.colors.text.accent};
                        ">(F12)</code>
                    </li>
                    <li style="margin-bottom: ${theme.spacing.md};">
                        Run: <code class="auth-code" style="
                            background-color: ${theme.colors.background.primary};
                            padding: ${theme.spacing.xs} ${theme.spacing.sm};
                            border-radius: ${theme.borderRadius.small};
                            font-family: monospace;
                            font-size: ${theme.typography.fontSize.small};
                            color: ${theme.colors.text.success};
                        ">RADMonitor.setupTestCookie()</code>
                    </li>
                    <li style="margin-bottom: ${theme.spacing.md};">
                        Follow the instructions to get your Kibana cookie
                    </li>
                    <li style="margin-bottom: ${theme.spacing.md};">
                        Set it with: <code class="auth-code" style="
                            background-color: ${theme.colors.background.primary};
                            padding: ${theme.spacing.xs} ${theme.spacing.sm};
                            border-radius: ${theme.borderRadius.small};
                            font-family: monospace;
                            font-size: ${theme.typography.fontSize.small};
                            color: ${theme.colors.text.success};
                        ">RADMonitor.setAuth("sid=YOUR_COOKIE")</code>
                    </li>
                </ol>
            </div>

            <div style="margin-top: ${theme.spacing.xxl};">
                <a href="/kibana-cookie-sync.html"
                   class="auth-prompt-button"
                   style="
                       display: inline-block;
                       background-color: ${theme.colors.background.secondary};
                       color: ${theme.colors.text.primary};
                       border: 1px solid ${theme.colors.border.primary};
                       border-radius: ${theme.borderRadius.medium};
                       padding: ${theme.spacing.md} ${theme.spacing.xl};
                       text-decoration: none;
                       font-size: ${theme.typography.fontSize.medium};
                       transition: all 0.3s;
                       cursor: pointer;
                   "
                   onmouseover="this.style.backgroundColor='${theme.colors.background.hover}'; this.style.borderColor='${theme.colors.border.hover}'; this.style.color='${theme.colors.text.primary}';"
                   onmouseout="this.style.backgroundColor='${theme.colors.background.secondary}'; this.style.borderColor='${theme.colors.border.primary}'; this.style.color='${theme.colors.text.primary}';">
                    Use Cookie Sync Tool →
                </a>
            </div>
        </div>
    `;
    } catch (error) {
        console.error('Error creating auth prompt:', error);
        // Fallback UI without theme
        return `
            <div style="
                background-color: #1e2836;
                border: 1px solid rgba(222, 222, 222, 0.3);
                border-radius: 8px;
                padding: 48px;
                margin: 24px;
                text-align: center;
                color: rgba(222, 222, 222, 0.9);
            ">
                <h2 style="color: #ff6900; margin-bottom: 24px;">Authentication Required</h2>
                <p style="margin-bottom: 32px;">To view RAD traffic data, you need to authenticate with your Kibana session.</p>
                <div style="background: #2a3b52; padding: 32px; border-radius: 8px;">
                    <h3 style="margin-bottom: 20px;">Quick Setup:</h3>
                    <ol style="text-align: left; max-width: 500px; margin: 0 auto; line-height: 1.8;">
                        <li>Open your browser console (F12)</li>
                        <li>Run: <code style="background: #1e2836; padding: 4px 8px;">RADMonitor.setupTestCookie()</code></li>
                        <li>Follow the instructions to get your Kibana cookie</li>
                        <li>Set it with: <code style="background: #1e2836; padding: 4px 8px;">RADMonitor.setAuth("sid=YOUR_COOKIE")</code></li>
                    </ol>
                </div>
                <div style="margin-top: 32px;">
                    <a href="/kibana-cookie-sync.html" style="
                        display: inline-block;
                        background: #2a3b52;
                        color: rgba(222, 222, 222, 0.9);
                        border: 1px solid rgba(222, 222, 222, 0.3);
                        border-radius: 8px;
                        padding: 12px 24px;
                        text-decoration: none;
                    ">Use Cookie Sync Tool →</a>
                </div>
            </div>
        `;
    }
}

/**
 * Render authentication prompt into a container
 * @param {HTMLElement|string} container - DOM element or selector
 */
export function renderAuthPrompt(container) {
    try {
        const element = typeof container === 'string'
            ? document.querySelector(container)
            : container;

        if (element) {
            element.innerHTML = createAuthPrompt();
        } else {
            console.error('Auth prompt container not found:', container);
        }
    } catch (error) {
        console.error('Error rendering auth prompt:', error);
    }
}

// Export theme for use in other components
export { theme };
