const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error("API request error");
  }

  return response.json();
}