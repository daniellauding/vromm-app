// Web shim for react-native-webview
import React from 'react';
import { StyleSheet } from 'react-native';

const WebView = React.forwardRef((props, ref) => {
  const { source, style } = props;
  const src = source?.uri || '';
  // Flatten RN style arrays/objects to a plain object safe for DOM elements
  const flatStyle = style ? StyleSheet.flatten(style) : {};
  // Remove RN-only transform arrays that crash on web DOM
  const { transform, ...safeStyle } = flatStyle || {};
  return React.createElement('iframe', {
    ref,
    src,
    style: { border: 'none', width: '100%', height: '100%', ...safeStyle },
  });
});

WebView.displayName = 'WebView';
export { WebView };
export default WebView;
