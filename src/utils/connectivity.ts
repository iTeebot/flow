export interface ConnectivityStatus {
  hasInternet: boolean | null;
  serverAvailable: boolean | null;
  isChecking: boolean;
}

export interface ConnectivityResult {
  hasInternet: boolean;
  serverAvailable: boolean;
}

/**
 * Checks internet connectivity by attempting to fetch a reliable resource
 * Uses navigator.onLine as primary check and Google favicon as secondary verification
 */
export const checkInternetConnectivity = async (): Promise<boolean> => {
  try {
    // First check navigator.onLine for basic connectivity
    if (!navigator.onLine) {
      return false;
    }

    // Try to fetch a small, reliable resource from a CDN
    await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD', // HEAD request is lighter
      cache: 'no-cache',
      mode: 'no-cors', // Avoid CORS issues
      signal: AbortSignal.timeout(3000) // 3 second timeout
    });

    // Since we're using no-cors, we can't check response.ok
    // But if we get here without an exception, internet is likely working
    return true;
  } catch (error) {
    console.log('Internet check failed:', error);
    // Fallback to navigator.onLine if fetch fails
    return navigator.onLine;
  }
};

/**
 * Checks server health by calling the API health endpoint
 */
export const checkServerHealth = async (apiUrl?: string): Promise<boolean> => {
  try {
    const baseUrl = apiUrl || import.meta.env.VITE_API_URL || "https://api.afmsolution.tech/api/teebot-flow";
    console.log('Checking server health at:', `${baseUrl}/health`);

    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      cache: 'no-cache',
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    console.log('Server response status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('Server health data:', data);
      return data.status === "OK";
    }

    console.log('Server responded but not OK');
    return false;
  } catch (error) {
    console.log('Server health check failed:', error);
    return false;
  }
};

/**
 * Performs comprehensive connectivity check
 * Returns both internet and server status
 */
export const checkFullConnectivity = async (apiUrl?: string): Promise<ConnectivityResult> => {
  console.log('Starting full connectivity check...');

  // Check internet first
  const hasInternet = await checkInternetConnectivity();
  console.log('Internet check result:', hasInternet);

  if (!hasInternet) {
    return { hasInternet: false, serverAvailable: false };
  }

  // If internet is connected, check server
  const serverAvailable = await checkServerHealth(apiUrl);
  console.log('Server check result:', serverAvailable);

  return { hasInternet, serverAvailable };
};

/**
 * Creates an initial connectivity status object
 */
export const createInitialConnectivityStatus = (): ConnectivityStatus => ({
  hasInternet: null,
  serverAvailable: null,
  isChecking: false
});

/**
 * Updates connectivity status object
 */
export const updateConnectivityStatus = (
  status: ConnectivityStatus,
  updates: Partial<ConnectivityStatus>
): ConnectivityStatus => ({
  ...status,
  ...updates
});