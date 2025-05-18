import React, { createContext, useContext, useState, ReactNode } from 'react';
import { View } from 'react-native';

// Modal context for app-wide modals that appear above TabNavigator
interface ModalContextType {
  modalContent: ReactNode | null;
  showModal: (content: ReactNode) => void;
  hideModal: () => void;
}

const ModalContext = createContext<ModalContextType>({
  modalContent: null,
  showModal: () => {},
  hideModal: () => {},
});

export const useModal = () => useContext(ModalContext);

export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [modalContent, setModalContent] = useState<ReactNode | null>(null);

  const showModal = (content: ReactNode) => {
    setModalContent(content);
  };

  const hideModal = () => {
    setModalContent(null);
  };

  return (
    <ModalContext.Provider value={{ modalContent, showModal, hideModal }}>
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
        >
          {modalContent}
        </View>
      )}
    </ModalContext.Provider>
  );
}; 