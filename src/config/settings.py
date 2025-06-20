"""
Minimal settings module for cors_proxy_enhanced
"""

def get_settings():
    """Return basic settings for the application"""
    return {
        'elastic_cookie': None,
        'log_level': 'INFO',
        'cors_allowed_origins': ['*'],
        'port': 8889
    }
