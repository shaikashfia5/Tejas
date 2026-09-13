export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // vite-plugin-pwa generates sw.js in prod, /dev-sw.js in dev
      const swUrl = import.meta.env.PROD ? '/sw.js' : '/dev-sw.js?dev-sw';
      navigator.serviceWorker
        .register(swUrl, { type: import.meta.env.PROD ? 'classic' : 'module' })
        .then((registration) => {
          console.log('SW registered: ', registration.scope);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    });
  }
}
