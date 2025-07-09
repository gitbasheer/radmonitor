/**
 * RAD Monitor Theme
 * Unified theme matching vnext-dashboard design system
 * Based on Sidebar and Branding components
 */

export const radTheme = {
    // Color palette
    colors: {
        background: {
            primary: '#1e2836',        // Main dark background
            secondary: '#2a3b52',      // Slightly lighter sections
            hover: '#3a4b62',          // Hover states
            overlay: 'rgba(0, 0, 0, 0.7)'  // Modal overlays
        },
        text: {
            primary: 'rgb(222, 222, 222)',              // Full brightness text
            secondary: 'rgba(222, 222, 222, 0.9)',      // Slightly dimmed
            muted: 'rgba(222, 222, 222, 0.8)',          // More dimmed
            dimmed: 'rgba(222, 222, 222, 0.6)',         // Significantly dimmed
            placeholder: 'rgba(222, 222, 222, 0.4)',    // Placeholder text
            accent: '#ff6900',                           // GoDaddy Orange (updated)
            success: '#00a63f',                          // GoDaddy Success (updated)
            error: '#d72c0d',                            // GoDaddy Error (updated)
            warning: '#ffb900',                          // GoDaddy Warning (updated)
            info: '#0073cf'                              // GoDaddy Info (updated)
        },
        border: {
            primary: 'rgba(222, 222, 222, 0.3)',
            secondary: 'rgba(222, 222, 222, 0.2)',
            hover: 'rgba(222, 222, 222, 0.6)',
            focus: 'rgba(222, 222, 222, 0.8)'
        },
        chart: {
            // Chart colors for data visualization (Updated to GoDaddy Standards)
            series1: '#ff6900',  // GoDaddy Orange (updated)
            series2: '#00a63f',  // GoDaddy Success (updated)
            series3: '#0073cf',  // GoDaddy Info (updated)
            series4: '#9c27b0',  // Purple (kept for variety)
            series5: '#ffb900',  // GoDaddy Warning (updated)
            grid: 'rgba(222, 222, 222, 0.1)'
        }
    },

    // Spacing system (using rem for scalability)
    spacing: {
        xs: '4px',      // 0.25rem
        sm: '8px',      // 0.5rem
        md: '12px',     // 0.75rem
        lg: '16px',     // 1rem
        xl: '24px',     // 1.5rem
        xxl: '32px',    // 2rem
        xxxl: '48px',   // 3rem
        // Block-specific spacing from Branding
        blockEnd: {
            sm: '8px',
            md: '12px',
            lg: '24px'
        },
        blockStart: {
            sm: '8px'
        },
        inline: {
            start: '48px',
            end: '0px'
        }
    },

    // Typography
    typography: {
        fontFamily: {
            primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
            monospace: 'Monaco, Consolas, "Courier New", monospace'
        },
        fontSize: {
            xs: '12px',     // 0.75rem
            small: '14px',  // 0.875rem
            medium: '16px', // 1rem
            large: '18px',  // 1.125rem
            xlarge: '24px', // 1.5rem
            xxlarge: '32px' // 2rem
        },
        fontWeight: {
            normal: 400,
            medium: 500,
            semibold: 600,
            bold: 700
        },
        lineHeight: {
            tight: 1.2,
            normal: 1.5,
            relaxed: 1.8
        }
    },

    // Border radius
    borderRadius: {
        small: '4px',
        medium: '8px',
        large: '12px',
        round: '50%'
    },

    // Shadows
    shadows: {
        small: '0 2px 4px rgba(0, 0, 0, 0.2)',
        medium: '0 4px 10px rgba(0, 0, 0, 0.3)',
        large: '0 8px 20px rgba(0, 0, 0, 0.4)',
        modal: '0 4px 20px rgba(0, 0, 0, 0.5)'
    },

    // Transitions (matching Sidebar animations)
    transitions: {
        default: 'all 0.3s ease',
        fast: 'all 0.15s ease',
        slow: 'all 0.5s ease',
        // Cubic bezier from Branding animations
        smooth: 'all 500ms cubic-bezier(0.16, 1, 0.3, 1)',
        smoothSlow: 'all 600ms cubic-bezier(0.16, 1, 0.3, 1)',
        // Specific transitions
        background: 'background-color 0.3s ease',
        color: 'color 0.3s ease',
        border: 'border-color 0.3s ease',
        transform: 'transform 0.3s ease-out',
        opacity: 'opacity 0.3s ease-out',
        blur: 'filter 0.3s ease-out'
    },

    // Z-index layers
    zIndex: {
        base: 1,
        dropdown: 100,
        sticky: 200,
        fixed: 300,
        modalBackdrop: 1000,
        modal: 1001,
        popover: 1100,
        tooltip: 1200
    },

    // Animation keyframes
    animations: {
        // Letter animation from Branding
        letterFadeIn: {
            initial: {
                opacity: 0,
                filter: 'blur(4px)',
                transform: 'translateY(0) rotate(0deg)'
            },
            animated: (index) => ({
                transform: `translateY(${index % 2 === 0 ? 20 : -20}px) rotate(${index % 2 === 0 ? 10 : -10}deg)`
            }),
            final: {
                opacity: 1,
                filter: 'blur(0)',
                transform: 'translateY(0) rotate(0deg)'
            }
        },
        // Fade animations
        fadeIn: {
            from: { opacity: 0 },
            to: { opacity: 1 }
        },
        slideIn: {
            from: { transform: 'translateY(-10px)', opacity: 0 },
            to: { transform: 'translateY(0)', opacity: 1 }
        }
    },

    // Component-specific styles
    components: {
        button: {
            primary: {
                background: '#ff6900',  // GoDaddy Orange (updated)
                color: '#ffffff',
                border: 'none',
                hover: {
                    background: '#e55a00'  // GoDaddy Orange Hover
                }
            },
            secondary: {
                background: '#2a3b52',
                color: 'rgba(222, 222, 222, 0.9)',
                border: '1px solid rgba(222, 222, 222, 0.3)',
                hover: {
                    background: '#3a4b62',
                    color: 'rgb(222, 222, 222)',
                    borderColor: 'rgba(222, 222, 222, 0.6)'
                }
            },
            success: {
                background: '#00a63f',  // GoDaddy Success (updated)
                color: '#ffffff',
                border: 'none',
                hover: {
                    background: '#00953a'  // GoDaddy Success Hover (updated)
                }
            }
        },
        input: {
            background: '#2a3b52',
            color: 'rgb(222, 222, 222)',
            border: '1px solid rgba(222, 222, 222, 0.3)',
            placeholder: 'rgba(222, 222, 222, 0.4)',
            focus: {
                borderColor: 'rgba(222, 222, 222, 0.6)',
                outline: 'none'
            }
        },
        card: {
            background: '#1e2836',
            border: '1px solid rgba(222, 222, 222, 0.2)',
            hover: {
                borderColor: 'rgba(222, 222, 222, 0.4)'
            }
        }
    }
};

// Helper functions for using the theme
export const getColor = (path) => {
    const keys = path.split('.');
    let value = radTheme.colors;
    for (const key of keys) {
        value = value[key];
    }
    return value;
};

export const getSpacing = (size) => radTheme.spacing[size] || size;

export const applyButtonStyles = (type = 'secondary') => {
    const styles = radTheme.components.button[type];
    return `
        background-color: ${styles.background};
        color: ${styles.color};
        border: ${styles.border};
        border-radius: ${radTheme.borderRadius.medium};
        padding: ${radTheme.spacing.sm} ${radTheme.spacing.lg};
        font-size: ${radTheme.typography.fontSize.medium};
        font-weight: ${radTheme.typography.fontWeight.medium};
        cursor: pointer;
        transition: ${radTheme.transitions.default};
    `;
};

// Export default theme
export default radTheme;
