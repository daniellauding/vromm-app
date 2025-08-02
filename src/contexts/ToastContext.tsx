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
  showRouteCreatedToast: (routeId: string, routeName: string, isUpdate?: boolean) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
  hideToast: () => {},
  showRouteCreatedToast: () => {},
});

export const useToast = () => useContext(ToastContext);

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const navigation = useNavigation<NavigationProp>();

  const showToast = (toastData: Omit<ToastData, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newToast: ToastData = {
      ...toastData,
      id,
      duration: toastData.duration || 4000,
    };

    setToasts((prev) => [...prev, newToast]);

    // Auto-dismiss after duration
    if (newToast.duration > 0) {
      setTimeout(() => {
        hideToast(id);
      }, newToast.duration);
    }
  };

  const hideToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const showRouteCreatedToast = (routeId: string, routeName: string, isUpdate = false) => {
    showToast({
      title: isUpdate ? 'Route Updated!' : 'Route Created!',
      message: `"${routeName}" has been ${isUpdate ? 'updated' : 'created'} successfully`,
      type: 'success',
      action: {
        label: 'View',
        onPress: () => {
          navigation.navigate('RouteDetail', { routeId });
        },
      },
      routeId,
      duration: 5000,
    });
  };

  return (
    <ToastContext.Provider value={{ showToast, hideToast, showRouteCreatedToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={hideToast} />
    </ToastContext.Provider>
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

interface ToastItemProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
  colorScheme: 'light' | 'dark' | null;
}

function ToastItem({ toast, onDismiss, colorScheme }: ToastItemProps) {
  const translateY = new Animated.Value(-100);
  const translateX = new Animated.Value(0);

  React.useEffect(() => {
    // Animate in
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  }, []);

  const handleDismiss = () => {
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
  };

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

  const getBackgroundColor = () => {
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
  };

  const getTextColor = () => {
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
  };

  const getIconName = () => {
    switch (toast.type) {
      case 'success':
        return 'check-circle';
      case 'error':
        return 'alert-circle';
      case 'info':
      default:
        return 'info';
    }
  };

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
