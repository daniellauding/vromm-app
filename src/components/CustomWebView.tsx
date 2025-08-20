import React from 'react';
import { SafeAreaView, StyleSheet, TouchableOpacity, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Feather } from '@expo/vector-icons';

interface CustomWebViewProps {
  isVisible: boolean;
  onClose: () => void;
  url: string;
  title: string;
}

export const CustomWebView: React.FC<CustomWebViewProps> = ({ isVisible, onClose, url, title }) => {
  if (!isVisible) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityLabel="Close">
          <Feather name="x" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <WebView
        source={{ uri: url }}
        style={styles.webview}
        startInLoadingState
        javaScriptEnabled
        domStorageEnabled
        onLoadStart={() => console.log(`[WebView] Loading start: ${title} → ${url}`)}
        onLoadEnd={() => console.log(`[WebView] Loading end: ${title}`)}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent as any;
          console.error('[WebView] Error loading', { title, url, message: nativeEvent?.description });
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    zIndex: 9999,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginRight: 40,
  },
  webview: {
    flex: 1,
  },
});

export default CustomWebView;


