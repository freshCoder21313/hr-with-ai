import React, { useState, useEffect } from 'react';

const ApiKeyModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [modelId, setModelId] = useState('');
  const [n8nUrl, setN8nUrl] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    const storedBaseUrl = localStorage.getItem('custom_base_url');
    const storedModelId = localStorage.getItem('custom_model_id');
    const storedN8nUrl = localStorage.getItem('n8n_webhook_url');
    
    if (storedKey) setApiKey(storedKey);
    if (storedBaseUrl) setBaseUrl(storedBaseUrl);
    if (storedModelId) setModelId(storedModelId);
    if (storedN8nUrl) setN8nUrl(storedN8nUrl);

    if (!storedKey) {
      setIsOpen(true);
    }
  }, []);

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem('gemini_api_key', apiKey.trim());
      if (baseUrl.trim()) {
        localStorage.setItem('custom_base_url', baseUrl.trim());
      } else {
        localStorage.removeItem('custom_base_url');
      }
      
      if (modelId.trim()) {
        localStorage.setItem('custom_model_id', modelId.trim());
      } else {
        localStorage.removeItem('custom_model_id');
      }

      if (n8nUrl.trim()) {
        localStorage.setItem('n8n_webhook_url', n8nUrl.trim());
      } else {
        localStorage.removeItem('n8n_webhook_url');
      }

      setIsOpen(false);
      window.location.reload(); 
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md border border-slate-200">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Configure AI Provider</h2>
        <p className="text-slate-500 text-sm mb-4">
          Enter your API Key. Default is Google Gemini, or configure a custom provider below.
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">API Key <span className="text-red-500">*</span></label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy... or sk-..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          <button 
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
          >
            {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options (Custom URL / Model)'}
          </button>

          {showAdvanced && (
            <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Base URL (Optional)</label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://openrouter.ai/api/v1"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
                <p className="text-[10px] text-slate-400 mt-1">Leave empty for default Google Gemini.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Model ID (Optional)</label>
                <input
                  type="text"
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  placeholder="google/gemini-2.0-flash-exp"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">n8n Webhook URL (Optional)</label>
                <input
                  type="text"
                  value={n8nUrl}
                  onChange={(e) => setN8nUrl(e.target.value)}
                  placeholder="https://your-n8n.com/webhook/..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
                <p className="text-[10px] text-slate-400 mt-1">Connect to n8n workflow for custom processing.</p>
              </div>
            </div>
          )}
          
          <button
            onClick={handleSave}
            disabled={!apiKey.trim()}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Save API Key
          </button>

          <p className="text-xs text-center text-slate-400">
            Get your key at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">Google AI Studio</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
