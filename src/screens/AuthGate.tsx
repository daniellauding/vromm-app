import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View, DevSettings } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';
import { Text } from '../components/Text';
import * as Updates from 'expo-updates';

export function AuthGate() {
  const { user, initialized } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const didForceRef = useRef(false);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    console.log('[AUTH_GATE] mounted with', { initialized, hasUser: !!user });
    const t = setTimeout(() => setShowFallback(true), 800);
    return () => clearTimeout(t);
  }, [initialized, user]);

  // Removed automatic navigation.reset calls to avoid race conditions. The
  // navigator will remount based on `user` via NavigationContainer `key`.
  // If needed, users can use the button below to force a reload.

  useEffect(() => {
    if (!__DEV__) return;
    // Dev-only: if stuck on AuthGate with a session, hard-reload after 2s
    const t = setTimeout(async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          console.log('[AUTH_GATE][DEV] Still on AuthGate with session, reloading app');
          DevSettings.reload();
        }
      } catch (e) {
        console.log('[AUTH_GATE][DEV] reload check error', e);
      }
    }, 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <ActivityIndicator />
      <Text size="md" intent="muted" style={{ marginTop: 12 }}>
        Finishing sign-in…
      </Text>
      {showFallback && (
        <View style={{ marginTop: 16, width: '100%', gap: 12 }}>
          <Button variant="primary" size="lg" onPress={() => Updates.reloadAsync()}>
            Continue to app
          </Button>
          {__DEV__ && (
            <Button variant="secondary" size="md" onPress={() => DevSettings.reload()}>
              Reload app (dev)
            </Button>
          )}
        </View>
      )}
    </View>
  );
} 