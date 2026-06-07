export function getTelegramLaunchParams() {
  const webApp = window.Telegram?.WebApp;
  const urlParams = getUrlLaunchParams();
  const initData = webApp?.initData || urlParams.get("tgWebAppData") || "";
  const inviteToken = webApp?.initDataUnsafe?.start_param || urlParams.get("tgWebAppStartParam") || urlParams.get("startapp") || undefined;

  webApp?.ready?.();

  return {
    initData,
    inviteToken
  };
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
        initDataUnsafe?: {
          start_param?: string;
        };
        ready?: () => void;
      };
    };
  }
}

function getUrlLaunchParams() {
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  const hashParams = new URLSearchParams(hash);

  hashParams.forEach((value, key) => {
    if (!params.has(key)) {
      params.set(key, value);
    }
  });

  return params;
}
