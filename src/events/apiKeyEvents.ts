export const OPEN_API_KEY_MODAL_EVENT = 'OPEN_API_KEY_MODAL';

export const openApiKeyModal = () => {
  window.dispatchEvent(new CustomEvent(OPEN_API_KEY_MODAL_EVENT));
};

export const subscribeToApiKeyModal = (callback: () => void) => {
  const handler = () => callback();
  window.addEventListener(OPEN_API_KEY_MODAL_EVENT, handler);
  return () => window.removeEventListener(OPEN_API_KEY_MODAL_EVENT, handler);
};
