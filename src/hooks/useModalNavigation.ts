import { useEffect, useCallback } from 'react';
import { useNavigationStack } from '@/contexts/NavigationStackContext';
import { useLocation } from 'react-router-dom';

interface UseModalNavigationProps {
  isOpen: boolean;
  onClose: () => void;
  modalId: string;
  type?: 'modal' | 'widget';
  title?: string;
}

export const useModalNavigation = ({ 
  isOpen, 
  onClose, 
  modalId, 
  type = 'modal',
  title 
}: UseModalNavigationProps) => {
  const { pushToStack, popFromStack } = useNavigationStack();
  const location = useLocation();

  // Handle modal opening - add to navigation stack
  useEffect(() => {
    if (isOpen) {
      pushToStack({
        id: modalId,
        type,
        path: location.pathname,
        title,
        data: { onClose }
      });
    }
  }, [isOpen, modalId, type, title, location.pathname, pushToStack]);

  // Handle back button for this modal
  useEffect(() => {
    const handleCloseModal = (event: CustomEvent) => {
      const stackItem = event.detail;
      if (stackItem && stackItem.id === modalId) {
        onClose();
      }
    };

    window.addEventListener('closeCurrentModal', handleCloseModal as EventListener);
    
    return () => {
      window.removeEventListener('closeCurrentModal', handleCloseModal as EventListener);
    };
  }, [modalId, onClose]);

  // Handle modal closing - remove from navigation stack
  const handleClose = useCallback(() => {
    popFromStack();
    onClose();
  }, [popFromStack, onClose]);

  return { handleClose };
};