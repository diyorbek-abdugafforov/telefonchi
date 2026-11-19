const API_URL = '/api';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers
  };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  }

  try {
    const res = await fetch(`${API_URL}${endpoint}`, config);
    
    let data;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Backend server topilmadi (404 xatosi). Vercel faqat frontendni ochgan, backend server ulanmagan.");
        }
        throw new Error(`Serverda xatolik (${res.status}): ${text.slice(0, 80)}`);
      }
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error("Serverdan noto'g'ri formatdagi javob qaytdi");
      }
    }

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        if (data.error && data.error.includes('majburan yopildi')) {
          localStorage.removeItem('token');
          window.location.reload();
        }
      }
      throw new Error(data.error || 'Serverda xatolik yuz berdi');
    }

    return data;
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
}
