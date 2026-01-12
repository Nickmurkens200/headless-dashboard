// Runtime configuration helper
// This allows API URLs to be configured at runtime without rebuilding

interface RuntimeConfig {
  apiUrl: string;
  iconSourceUrl: string;
}

// Default configuration (can be overridden by environment variables)
const defaultConfig: RuntimeConfig = {
  apiUrl: 'http://localhost:4000/api',
  iconSourceUrl: 'https://cdn.jsdelivr.net/gh/selfhst/icons/png/',
};

// Get configuration from environment or defaults
export function getConfig(): RuntimeConfig {
  // In browser, check for window.__RUNTIME_CONFIG__ first (set by _document or server)
  if (typeof window !== 'undefined') {
    const windowConfig = (window as any).__RUNTIME_CONFIG__;
    if (windowConfig) {
      return windowConfig;
    }
  }

  // Use environment variables
  return {
    apiUrl: process.env.NEXT_PUBLIC_API_URL || defaultConfig.apiUrl,
    iconSourceUrl: process.env.NEXT_PUBLIC_ICON_SOURCE || defaultConfig.iconSourceUrl,
  };
}

export function getApiUrl(): string {
  return getConfig().apiUrl;
}

export function getIconSourceUrl(): string {
  return getConfig().iconSourceUrl;
}

// Build full icon URL from slug
export function getIconUrl(slugOrUrl: string | null | undefined): string | null {
  if (!slugOrUrl) return null;
  
  // If it's already a URL, return as-is
  if (slugOrUrl.startsWith('http://') || slugOrUrl.startsWith('https://')) {
    return slugOrUrl;
  }
  
  // Build URL from slug
  const baseUrl = getIconSourceUrl().replace(/\/+$/, '');
  return `${baseUrl}/${slugOrUrl}.png`;
}
