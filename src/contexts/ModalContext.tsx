import React, { createContext, useContext, useState, ReactNode } from 'react';
import { View } from 'react-native';

// Modal context for app-wide modals that appear above TabNavigator
interface ModalContextType {
  modalContent: ReactNode | null;
  showModal: (content: ReactNode) => void;
  hideModal: () => void;
  setModalPointerEvents: (pointerEvents: 'auto' | 'box-none') => void;
}

const ModalContext = createContext<ModalContextType>({
  modalContent: null,
  showModal: () => {},
  hideModal: () => {},
  setModalPointerEvents: () => {},
});

export const useModal = () => useContext(ModalContext);

export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [modalContent, setModalContent] = useState<ReactNode | null>(null);
  const [modalPointerEvents, setModalPointerEventsState] = useState<'auto' | 'box-none'>('auto');

  const showModal = React.useCallback((content: ReactNode) => {
    // Ensure we're getting a proper React element
    if (React.isValidElement(content)) {
      setModalContent(content);
      setModalPointerEventsState('auto'); // Reset to auto when showing new modal
    } else {
      console.error('Invalid modal content - must be a valid React element');
    }
  }, []);

  const hideModal = React.useCallback(() => {
    setModalContent(null);
    setModalPointerEventsState('auto'); // Reset when hiding
  }, []);

  const setModalPointerEvents = React.useCallback((pointerEvents: 'auto' | 'box-none') => {
    setModalPointerEventsState(pointerEvents);
  }, []);

  const contextValue = React.useMemo(
    () => ({ modalContent, showModal, hideModal, setModalPointerEvents }),
    [modalContent, showModal, hideModal, setModalPointerEvents],
  );

  return (
    <ModalContext.Provider value={contextValue}>
      {children}
      {modalContent && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999, // Higher than anything else in the app
          }}
          pointerEvents={modalPointerEvents}
        >
          {modalContent}
        </View>
      )}
    </ModalContext.Provider>
  );
};
