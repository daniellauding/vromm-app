import { useCallback } from 'react';
import { MessageBell } from '../components/MessageBell';
import { NotificationBell } from '../components/NotificationBell';

export const useHeaderIcons = () => {
  const getHeaderRight = useCallback(() => {
    return (
      <>
        <MessageBell size={24} color="#FFFFFF" />
        <NotificationBell size={24} color="#FFFFFF" />
      </>
    );
  }, []);

  return { getHeaderRight };
}; 