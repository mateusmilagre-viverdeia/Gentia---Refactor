import { useState, useEffect, useCallback } from 'react';

interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission;
  registration: ServiceWorkerRegistration | null;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: 'default',
    registration: null,
  });

  useEffect(() => {
    const isSupported = 'Notification' in window && 'serviceWorker' in navigator;
    
    if (isSupported) {
      setState(prev => ({
        ...prev,
        isSupported: true,
        permission: Notification.permission,
      }));

      // Get existing registration if any
      navigator.serviceWorker.ready.then(registration => {
        setState(prev => ({ ...prev, registration }));
      }).catch(() => {
        // Service worker not registered yet
      });
    }
  }, []);

  const registerServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return null;

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      setState(prev => ({ ...prev, registration }));
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!state.isSupported) return false;

    try {
      let registration = state.registration;
      if (!registration) {
        registration = await registerServiceWorker();
      }

      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));

      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [state.isSupported, state.registration, registerServiceWorker]);

  const showNotification = useCallback(async (
    title: string, 
    options?: NotificationOptions
  ) => {
    if (state.permission !== 'granted') return null;

    try {
      if (state.registration) {
        // Use service worker notification for better support
        await state.registration.showNotification(title, {
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          ...options,
        });
      } else {
        // Fallback to basic notification
        new Notification(title, {
          icon: '/icons/icon-192x192.png',
          ...options,
        });
      }
      return true;
    } catch (error) {
      console.error('Error showing notification:', error);
      return false;
    }
  }, [state.permission, state.registration]);

  const schedulePulseReminder = useCallback(async () => {
    if (state.permission !== 'granted' || !state.registration) return;

    // This would typically be handled by the backend sending push notifications
    // For now, we can show a local notification if the user hasn't responded today
    await showNotification('Hora do Pulse! 🔥', {
      body: 'Não perca seu streak! Responda o Pulse de hoje em menos de 60 segundos.',
      tag: 'pulse-reminder',
      data: { url: '/retencao/pulse/daily' },
    });
  }, [state.permission, state.registration, showNotification]);

  return {
    isSupported: state.isSupported,
    permission: state.permission,
    isEnabled: state.permission === 'granted',
    requestPermission,
    showNotification,
    schedulePulseReminder,
  };
}
