import * as Device from 'expo-device';
import { Platform } from 'react-native';

export type DeviceTier = 'low' | 'mid' | 'high';

let cachedTier: DeviceTier | null = null;

/**
 * Detects device performance tier based on available hardware info.
 * Used to adapt the app experience for low-end devices (e.g., TCL T433D).
 *
 * - low: Skip video backgrounds, reduce animations, load fewer fonts
 * - mid: Use lighter effects, standard animations
 * - high: Full experience with video, blur, animations
 */
export function getDeviceTier(): DeviceTier {
  if (cachedTier) return cachedTier;

  // iOS devices from the last ~5 years are all "high"
  if (Platform.OS === 'ios') {
    cachedTier = 'high';
    return cachedTier;
  }

  // Android: check total memory and API level
  const totalMemoryBytes = Device.totalMemory;
  const totalMemoryGB = totalMemoryBytes ? totalMemoryBytes / (1024 * 1024 * 1024) : null;
  const apiLevel = Platform.Version as number;

  console.log(
    `📱 [DeviceCapabilities] Model: ${Device.modelName}, RAM: ${totalMemoryGB?.toFixed(1)}GB, API: ${apiLevel}, Brand: ${Device.brand}`,
  );

  // Low-end: less than 3GB RAM or old API level
  if ((totalMemoryGB !== null && totalMemoryGB < 3) || apiLevel < 28) {
    cachedTier = 'low';
    console.log('📱 [DeviceCapabilities] Tier: LOW - reduced experience');
    return cachedTier;
  }

  // Mid-range: 3-5GB RAM
  if (totalMemoryGB !== null && totalMemoryGB < 5) {
    cachedTier = 'mid';
    console.log('📱 [DeviceCapabilities] Tier: MID - standard experience');
    return cachedTier;
  }

  cachedTier = 'high';
  console.log('📱 [DeviceCapabilities] Tier: HIGH - full experience');
  return cachedTier;
}

export function isLowEndDevice(): boolean {
  return getDeviceTier() === 'low';
}

export function shouldSkipHeavyAssets(): boolean {
  return getDeviceTier() === 'low';
}

export function shouldReduceAnimations(): boolean {
  return getDeviceTier() === 'low';
}
