/**
 * Animated Branding Component
 * Implements letter animation from vnext-dashboard Branding.js
 */

import { radTheme as theme } from '../theme/rad-theme.js';

/**
 * Create animated text with letter-by-letter animation
 * @param {string} text - Text to animate
 * @param {number} delay - Delay between each letter animation (ms)
 * @returns {string} HTML string with animated letters
 */
export function createAnimatedText(text, delay = 50) {
    return text.split('').map((letter, index) => {
        const isSpace = letter === ' ';
        return `<span 
            class="letter" 
            data-index="${index}"
            style="
                display: inline-block;
                opacity: 0;
                filter: blur(4px);
                transform: translateY(${index % 2 === 0 ? 20 : -20}px) rotate(${index % 2 === 0 ? 10 : -10}deg);
                transition: ${theme.transitions.opacity}, ${theme.transitions.blur}, ${theme.transitions.transform};
            "
        >${isSpace ? '&nbsp;' : letter}</span>`;
    }).join('');
}

/**
 * Animate letters in sequence
 * @param {HTMLElement|string} container - Container element or selector
 * @param {number} delay - Delay between each letter animation (ms)
 */
export function animateLetters(container, delay = 50) {
    const element = typeof container === 'string' 
        ? document.querySelector(container) 
        : container;
    
    if (!element) return;
    
    const letters = element.querySelectorAll('.letter');
    
    letters.forEach((letter, index) => {
        setTimeout(() => {
            letter.style.opacity = '1';
            letter.style.filter = 'blur(0)';
            letter.style.transform = 'translateY(0) rotate(0deg)';
        }, index * delay);
    });
}

/**
 * Create animated branding component
 * @param {string} title - Main title text
 * @param {string} subtitle - Optional subtitle
 * @returns {string} HTML string for animated branding
 */
export function createAnimatedBranding(title = 'RAD Monitor', subtitle = 'Traffic Health Dashboard') {
    return `
        <div class="animated-branding" style="
            padding: ${theme.spacing.xl};
            text-align: center;
        ">
            <h1 class="branding-title" style="
                color: ${theme.colors.text.accent};
                font-size: ${theme.typography.fontSize.xxlarge};
                font-weight: ${theme.typography.fontWeight.medium};
                margin: 0 0 ${theme.spacing.sm} 0;
            ">
                ${createAnimatedText(title)}
            </h1>
            ${subtitle ? `
                <p class="branding-subtitle" style="
                    color: ${theme.colors.text.secondary};
                    font-size: ${theme.typography.fontSize.medium};
                    margin: 0;
                ">
                    ${createAnimatedText(subtitle, 30)}
                </p>
            ` : ''}
        </div>
    `;
}

/**
 * Initialize animated branding
 * @param {HTMLElement|string} container - Container element or selector
 * @param {Object} options - Branding options
 */
export function initAnimatedBranding(container, options = {}) {
    const {
        title = 'RAD Monitor',
        subtitle = 'Traffic Health Dashboard',
        delay = 50,
        autoAnimate = true
    } = options;
    
    const element = typeof container === 'string' 
        ? document.querySelector(container) 
        : container;
    
    if (!element) return;
    
    // Create and insert branding
    element.innerHTML = createAnimatedBranding(title, subtitle);
    
    // Auto-animate if enabled
    if (autoAnimate) {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
            animateLetters(element.querySelector('.branding-title'), delay);
            if (subtitle) {
                setTimeout(() => {
                    animateLetters(element.querySelector('.branding-subtitle'), delay * 0.6);
                }, title.length * delay);
            }
        }, 100);
    }
}

// Export for use in other components
export default {
    createAnimatedText,
    animateLetters,
    createAnimatedBranding,
    initAnimatedBranding
};