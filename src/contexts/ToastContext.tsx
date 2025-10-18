import React, { createContext, useContext, useState, ReactNode } from 'react';
import { View, Text, TouchableOpacity, Animated, useColorScheme, PanResponder } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';

export interface ToastData {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
  action?: {
    label: string;
    onPress: () => void;
  };
  routeId?: string; // For route-related toasts
  duration?: number; // Auto-dismiss duration in ms
}

interface ToastContextType {
  showToast: (toast: Omit<ToastData, 'id'>) => void;
  hideToast: (id: string) => void;
  showRouteCreatedToast: (
    routeId: string,
    routeName: string,
    isUpdate?: boolean,
    isDraft?: boolean,
    customAction?: () => void,
  ) => void;
  showEventCreatedToast: (eventId: string, eventName: string, isUpdate?: boolean) => void;
  showEventInviteToast: (eventId: string, eventName: string, inviteCount: number) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
  hideToast: () => {},
  showRouteCreatedToast: () => {},
  showEventCreatedToast: () => {},
  showEventInviteToast: () => {},
});

export const useToast = () => useContext(ToastContext);

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const navigation = useNavigation<NavigationProp>();

  // Removed debug useEffect that could cause insertion effect conflicts

  const hideToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = React.useCallback(
    (toastData: Omit<ToastData, 'id'>) => {
      console.log('showToast', toastData);
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const newToast: ToastData = {
        ...toastData,
        id,
        duration: toastData.duration || 4000,
      };

      // Add a small delay to prevent insertion effect conflicts
      setTimeout(() => {
        setToasts((prev) => [...prev, newToast]);
      }, 0);

      // Auto-dismiss after duration
      if (newToast.duration > 0) {
        setTimeout(() => {
          hideToast(id);
        }, newToast.duration);
      }
    },
    [hideToast],
  );

  const showRouteCreatedToast = React.useCallback(
    (routeId: string, routeName: string, isUpdate = false, isDraft = false, customAction?: () => void) => {
      const getTitle = () => {
        if (isDraft) return 'Draft Saved!';
        if (isUpdate) return 'Route Updated!';
        return 'Route Created!';
      };

      const getMessage = () => {
        if (isDraft) return `"${routeName}" has been saved as a draft`;
        if (isUpdate) return `"${routeName}" has been updated successfully`;
        return `"${routeName}" has been created successfully`;
      };

      showToast({
        title: getTitle(),
        message: getMessage(),
        type: 'success',
        action: {
          label: isDraft ? 'View Draft' : 'View',
          onPress: customAction || (() => {
            navigation.navigate('RouteDetail', { routeId });
          }),
        },
        routeId,
        duration: 5000,
      });
    },
    [navigation, showToast],
  );

  const showEventCreatedToast = React.useCallback(
    (eventId: string, eventName: string, isUpdate = false) => {
      showToast({
        title: isUpdate ? 'Event Updated!' : 'Event Created!',
        message: `"${eventName}" has been ${isUpdate ? 'updated' : 'created'} successfully`,
        type: 'success',
        action: {
          label: 'View',
          onPress: () => {
            navigation.navigate('EventDetail', { eventId });
          },
        },
        duration: 5000,
      });
    },
    [navigation, showToast],
  );

  const showEventInviteToast = React.useCallback(
    (eventId: string, eventName: string, inviteCount: number) => {
      showToast({
        title: 'Invitations Sent!',
        message: `${inviteCount} invitation${inviteCount > 1 ? 's' : ''} sent for "${eventName}"`,
        type: 'success',
        action: {
          label: 'View Event',
          onPress: () => {
            navigation.navigate('EventDetail', { eventId });
          },
        },
        duration: 4000,
      });
    },
    [navigation, showToast],
  );

  const value = React.useMemo(
    () => ({
      showToast,
      hideToast,
      showRouteCreatedToast,
      showEventCreatedToast,
      showEventInviteToast,
    }),
    [showToast, hideToast, showRouteCreatedToast, showEventCreatedToast, showEventInviteToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={hideToast} />
    </ToastContext.Provider>
  );
}

interface ToastItemProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
  colorScheme: 'light' | 'dark' | null;
}

function ToastItem({ toast, onDismiss, colorScheme }: ToastItemProps) {
  const translateY = React.useRef(new Animated.Value(-100)).current;
  const translateX = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Animate in with a small delay to avoid insertion effect conflicts
    const timer = setTimeout(() => {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }, 50);

    return () => clearTimeout(timer);
  }, [translateY]);

  const handleDismiss = React.useCallback(() => {
    // Animate out
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 400,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss(toast.id));
  }, [toast.id, onDismiss, translateX, translateY]);

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dx) > 10;
    },
    onPanResponderMove: (_, gestureState) => {
      translateX.setValue(gestureState.dx);
    },
    onPanResponderRelease: (_, gestureState) => {
      if (Math.abs(gestureState.dx) > 100) {
        handleDismiss();
      } else {
        // Snap back
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  const getBackgroundColor = React.useCallback(() => {
    const isDark = colorScheme === 'dark';
    switch (toast.type) {
      case 'success':
        return isDark ? '#1A5A1A' : '#D4F4DD';
      case 'error':
        return isDark ? '#5A1A1A' : '#F4D4D4';
      case 'info':
      default:
        return isDark ? '#1A3D3D' : '#D4E4F4';
    }
  }, [colorScheme, toast.type]);

  const getTextColor = React.useCallback(() => {
    const isDark = colorScheme === 'dark';
    switch (toast.type) {
      case 'success':
        return isDark ? '#69E369' : '#0F5132';
      case 'error':
        return isDark ? '#E36969' : '#842029';
      case 'info':
      default:
        return isDark ? '#69E3C4' : '#055160';
    }
  }, [colorScheme, toast.type]);

  const getIconName = React.useCallback(() => {
    switch (toast.type) {
      case 'success':
        return 'check-circle';
      case 'error':
        return 'alert-circle';
      case 'info':
      default:
        return 'info';
    }
  }, [toast.type]);

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={{
        transform: [{ translateY }, { translateX }],
        backgroundColor: getBackgroundColor(),
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        pointerEvents: 'auto',
      }}
    >
      <TouchableOpacity
        onPress={toast.action?.onPress}
        style={{ flexDirection: 'row', alignItems: 'center' }}
        activeOpacity={toast.action ? 0.7 : 1}
      >
        <Feather
          name={getIconName()}
          size={20}
          color={getTextColor()}
          style={{ marginRight: 12 }}
        />

        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: getTextColor(),
              marginBottom: 2,
            }}
          >
            {toast.title}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: getTextColor(),
              opacity: 0.8,
            }}
          >
            {toast.message}
          </Text>
        </View>

        {toast.action && (
          <View style={{ marginLeft: 12 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: getTextColor(),
                textDecorationLine: 'underline',
              }}
            >
              {toast.action.label}
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={handleDismiss}
          style={{ marginLeft: 12, padding: 4 }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="x" size={18} color={getTextColor()} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();

  if (toasts.length === 0) return null;

  return (
    <View
      style={{
        position: 'absolute',
        top: insets.top + 10,
        left: 16,
        right: 16,
        zIndex: 10000,
        pointerEvents: 'box-none',
      }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} colorScheme={colorScheme} />
      ))}
    </View>
  );
}
