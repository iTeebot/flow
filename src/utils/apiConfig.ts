export const getApiUrl = (): string => {
  const url = import.meta.env.VITE_API_URL || "https://api.afmsolution.tech/api/teebot-flow";
  if (import.meta.env.DEV && url.startsWith("http")) {
    try {
      const parsed = new URL(url);
      return parsed.pathname;
    } catch (e) {
      return url;
    }
  }
  return url;
};