import { useEffect } from 'react';
import { MessageBell } from '../components/MessageBell';
import { NotificationBell } from '../components/NotificationBell';

export const useHeaderIcons = () => {
  useEffect(() => {
    // Header icons setup logic can go here
  }, []);

  return {
    MessageBell,
    NotificationBell,
  };
}; 