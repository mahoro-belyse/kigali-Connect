import { useEffect, useState, useRef } from 'react';

export function useWebSocket(url: string, token: string | null) {
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;  // ← StrictMode guard

    const timer = setTimeout(() => {
      if (cancelled) return;  // ← abort if already unmounted

      const ws = new WebSocket(`${url}?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => { if (!cancelled) setIsConnected(true); };
      ws.onmessage = (event) => {
        if (cancelled) return;
        try {
          setLastMessage(JSON.parse(event.data));
        } catch (e) {
          console.error('Failed to parse WebSocket message', e);
        }
      };
      ws.onclose = () => { if (!cancelled) setIsConnected(false); };
      ws.onerror = (error) => { console.error('WebSocket error', error); };
    }, 100);  // small delay lets StrictMode's unmount/remount settle

    return () => {
      cancelled = true;
      clearTimeout(timer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [url, token]);

  return { lastMessage, isConnected };
}