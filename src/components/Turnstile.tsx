import { useEffect, useRef } from 'react';
type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
  reset: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}
export default function Turnstile({
  siteKey,
  action,
  onToken,
  reset = 0,
}: {
  siteKey: string;
  action: string;
  onToken: (token: string) => void;
  reset?: number;
}) {
  const element = useRef<HTMLDivElement>(null);
  const callback = useRef(onToken);
  callback.current = onToken;
  useEffect(() => {
    if (!siteKey) return;
    let id: string | undefined;
    if (!document.querySelector('#turnstile-script')) {
      const script = document.createElement('script');
      script.id = 'turnstile-script';
      script.src =
        'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      document.head.append(script);
    }
    const render = () => {
      if (window.turnstile && element.current && !id)
        id = window.turnstile.render(element.current, {
          sitekey: siteKey,
          action,
          theme: 'light',
          language: 'sl',
          callback: (token: string) => callback.current(token),
          'expired-callback': () => callback.current(''),
          'error-callback': () => callback.current(''),
        });
    };
    render();
    const interval = window.setInterval(render, 250);
    return () => {
      window.clearInterval(interval);
      if (id) window.turnstile?.remove(id);
    };
  }, [siteKey, action, reset]);
  return <div ref={element} className="turnstile-widget" />;
}
