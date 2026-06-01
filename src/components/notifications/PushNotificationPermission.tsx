import { useState, useEffect } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PushNotificationPermissionProps {
  className?: string;
  compact?: boolean;
}

export function PushNotificationPermission({ className, compact = false }: PushNotificationPermissionProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      
      // Show banner only if permission not decided yet
      const dismissed = localStorage.getItem('push-notification-dismissed');
      if (Notification.permission === 'default' && !dismissed) {
        // Delay showing the banner
        const timer = setTimeout(() => setShowBanner(true), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const registerServiceWorker = async () => {
    if (!('serviceWorker' in navigator)) return null;

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  };

  const requestPermission = async () => {
    if (!isSupported) {
      toast.error('Seu navegador não suporta notificações push');
      return;
    }

    setIsLoading(true);

    try {
      // Register service worker first
      const registration = await registerServiceWorker();
      
      if (!registration) {
        throw new Error('Falha ao registrar o Service Worker');
      }

      // Request notification permission
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        toast.success('Notificações ativadas! Você receberá lembretes do Pulse.');
        setShowBanner(false);
        
        // Show a test notification
        new Notification('Gentia', {
          body: 'Notificações ativadas com sucesso! 🎉',
          icon: '/icons/icon-192x192.png',
        });
      } else if (result === 'denied') {
        toast.error('Notificações bloqueadas. Você pode ativar nas configurações do navegador.');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Erro ao ativar notificações');
    } finally {
      setIsLoading(false);
    }
  };

  const dismissBanner = () => {
    setShowBanner(false);
    localStorage.setItem('push-notification-dismissed', 'true');
  };

  // Compact version for settings
  if (compact) {
    return (
      <div className={cn('flex items-center justify-between', className)}>
        <div className="flex items-center gap-3">
          {permission === 'granted' ? (
            <Bell className="h-5 w-5 text-primary" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
          <div>
            <p className="font-medium text-sm">Notificações Push</p>
            <p className="text-xs text-muted-foreground">
              {permission === 'granted' 
                ? 'Ativadas' 
                : permission === 'denied' 
                  ? 'Bloqueadas no navegador'
                  : 'Desativadas'}
            </p>
          </div>
        </div>
        {permission !== 'granted' && permission !== 'denied' && (
          <Button 
            size="sm" 
            onClick={requestPermission}
            disabled={isLoading || !isSupported}
          >
            {isLoading ? 'Ativando...' : 'Ativar'}
          </Button>
        )}
      </div>
    );
  }

  // Don't render if not supported or already decided
  if (!isSupported || !showBanner) return null;

  // Banner version for prompting users
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className={cn('fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-md', className)}
      >
        <Card className="p-4 shadow-lg border-primary/20 bg-card/95 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm">Ativar notificações?</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Receba lembretes para responder o Pulse diário e não perca seu streak!
              </p>
              <div className="flex gap-2 mt-3">
                <Button 
                  size="sm" 
                  onClick={requestPermission}
                  disabled={isLoading}
                >
                  {isLoading ? 'Ativando...' : 'Ativar'}
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={dismissBanner}
                >
                  Agora não
                </Button>
              </div>
            </div>
            <button 
              onClick={dismissBanner}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
