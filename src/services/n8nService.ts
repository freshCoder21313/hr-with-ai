// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const callN8nWebhook = async (payload: any) => {
  const url = localStorage.getItem('n8n_webhook_url');
  if (!url) throw new Error('n8n Webhook URL is not configured');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...payload,
        timestamp: Date.now(),
        source: 'hr-with-ai-client',
      }),
    });

    if (!response.ok) {
      throw new Error(`n8n responded with ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      return await response.text();
    }
  } catch (error) {
    console.error('n8n Error:', error);
    throw error;
  }
};
