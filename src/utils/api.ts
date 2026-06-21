import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export async function apiFetch(
  body: Record<string, unknown>,
  options?: { signal?: AbortSignal }
): Promise<Response> {
  const token = useAuthStore.getState().token;
  const res = await fetch('api.php', {
    method: 'POST',
    signal: options?.signal,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    useAuthStore.getState().logout();
  }
  
  if (!res.ok) {
    let errorMessage = `Error: ${res.status} ${res.statusText}`;
    try {
      const data = await res.clone().json();
      if (data && data.error) {
        errorMessage = data.error;
      }
    } catch {
      // Ignore JSON parse errors
    }
    toast.error(errorMessage);
    throw new Error(errorMessage);
  }
  
  return res;
}
