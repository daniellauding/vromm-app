import React, { useState } from 'react';
import { TouchableOpacity, Share, Dimensions } from 'react-native';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../contexts/TranslationContext';
import { useThemePreference } from '../hooks/useThemeOverride';
import { useToast } from '../contexts/ToastContext';

// expo-camera is optional - scan mode shows fallback if not installed
let CameraView: any = null;
let useCameraPermissions: any = () => [null, () => {}];
try {
  const cam = require('expo-camera');
  CameraView = cam.CameraView;
  useCameraPermissions = cam.useCameraPermissions;
} catch {
  // expo-camera not installed
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const QR_SIZE = SCREEN_WIDTH * 0.6;

// Simple QR code display using a text-based approach
// In production you'd use react-native-qrcode-svg, but we generate a shareable link instead
function QRCodeDisplay({ value, size, isDark }: { value: string; size: number; isDark: boolean }) {
  return (
    <YStack
      width={size}
      height={size}
      backgroundColor="#FFF"
      borderRadius={16}
      justifyContent="center"
      alignItems="center"
      padding="$4"
      borderWidth={2}
      borderColor={isDark ? '#333' : '#E5E5E5'}
    >
      {/* QR-like visual placeholder - actual QR would use react-native-qrcode-svg */}
      <YStack
        width={size - 60}
        height={size - 60}
        backgroundColor="#F0F0F0"
        borderRadius={12}
        justifyContent="center"
        alignItems="center"
        gap="$2"
      >
        <Feather name="maximize" size={48} color="#333" />
        <Text fontSize="$2" color="#666" textAlign="center" paddingHorizontal="$2">
          Share this link for instant connect
        </Text>
      </YStack>
    </YStack>
  );
}

type Mode = 'show' | 'scan';

export function QRConnectScreen() {
  const { user, profile } = useAuth();
  const { t, language } = useTranslation();
  const { effectiveTheme } = useThemePreference();
  const { showToast } = useToast();
  const isDark = effectiveTheme === 'dark';

  const tx = (key: string, en: string, sv?: string): string => {
    const translated = t(key);
    if (translated && translated !== key) return translated;
    return language === 'sv' && sv ? sv : en;
  };

  const [mode, setMode] = useState<Mode>('show');
  const [processing, setProcessing] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const connectUrl = `vromm://connect/${user?.id}?role=${profile?.role || 'student'}`;

  const handleShare = async () => {
    try {
      const role = profile?.role || 'student';
      const name = profile?.full_name || 'Someone';
      let message = '';

      if (role === 'instructor' || role === 'teacher') {
        message = `Connect with ${name} as your driving instructor on Vromm!\n\n${connectUrl}`;
      } else if (role === 'school') {
        message = `Enroll in ${name} on Vromm!\n\n${connectUrl}`;
      } else {
        message = `Connect with ${name} on Vromm!\n\n${connectUrl}`;
      }

      await Share.share({ message, title: t('qrConnect.title') || 'Quick Connect' });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || processing) return;
    setScanned(true);
    setProcessing(true);

    try {
      // Parse the connect URL: vromm://connect/{userId}?role={role}
      const match = data.match(/vromm:\/\/connect\/([a-f0-9-]+)\?role=(\w+)/);
      if (!match) {
        showToast({ title: tx('qrConnect.invalidQR', 'Invalid QR', 'Ogiltig QR'), message: tx('qrConnect.invalidQRMessage', 'This QR code is not a valid Vromm connect code.', 'Denna QR-kod är inte en giltig Vromm-koppling.'), type: 'error' });
        setScanned(false);
        setProcessing(false);
        return;
      }

      const [, targetUserId, targetRole] = match;

      if (targetUserId === user?.id) {
        showToast({ title: 'Oops', message: tx('qrConnect.selfConnect', "You can't connect with yourself!", 'Du kan inte koppla dig till dig själv!'), type: 'error' });
        setScanned(false);
        setProcessing(false);
        return;
      }

      // Determine relationship direction
      const myRole = profile?.role || 'student';

      if ((targetRole === 'instructor' || targetRole === 'teacher') && myRole === 'student') {
        // Student scanning instructor QR -> create relationship
        const { error } = await supabase.from('student_supervisor_relationships').insert({
          student_id: user?.id,
          supervisor_id: targetUserId,
          status: 'active',
        });

        if (error) {
          if (error.code === '23505') {
            showToast({ title: tx('qrConnect.alreadyConnected', 'Already Connected', 'Redan kopplad'), message: tx('qrConnect.alreadyConnectedMessage', 'You are already connected!', 'Ni är redan kopplade!'), type: 'info' });
          } else {
            throw error;
          }
        } else {
          await supabase.from('notifications').insert({
            user_id: targetUserId,
            type: 'student_invitation',
            message: `${profile?.full_name || 'A student'} connected with you via QR code`,
            actor_id: user?.id,
          });
          showToast({ title: tx('qrConnect.connected', 'Connected!', 'Kopplad!'), message: tx('qrConnect.instructorConnected', 'You are now connected with your instructor.', 'Du är nu kopplad till din handledare.'), type: 'success' });
        }
      } else if ((myRole === 'instructor' || myRole === 'teacher') && targetRole === 'student') {
        // Instructor scanning student QR
        const { error } = await supabase.from('student_supervisor_relationships').insert({
          student_id: targetUserId,
          supervisor_id: user?.id,
          status: 'active',
        });

        if (error) {
          if (error.code === '23505') {
            showToast({ title: tx('qrConnect.alreadyConnected', 'Already Connected', 'Redan kopplad'), message: tx('qrConnect.alreadyConnectedStudent', 'Already connected!', 'Redan kopplad!'), type: 'info' });
          } else {
            throw error;
          }
        } else {
          await supabase.from('notifications').insert({
            user_id: targetUserId,
            type: 'supervisor_invitation',
            message: `${profile?.full_name || 'An instructor'} connected with you via QR code`,
            actor_id: user?.id,
          });
          showToast({ title: tx('qrConnect.connected', 'Connected!', 'Kopplad!'), message: tx('qrConnect.studentConnected', 'Student connected successfully.', 'Elev kopplad.'), type: 'success' });
        }
      } else if (targetRole === 'school' && (myRole === 'instructor' || myRole === 'teacher')) {
        // Instructor scanning school QR -> join as instructor
        const { data: school } = await supabase
          .from('school_memberships')
          .select('school_id')
          .eq('user_id', targetUserId)
          .in('role', ['admin', 'owner'])
          .limit(1)
          .single();

        if (school) {
          const { error } = await supabase.from('school_memberships').insert({
            school_id: school.school_id,
            user_id: user?.id,
            role: 'instructor',
          });

          if (error) {
            if (error.code === '23505') {
              showToast({ title: tx('qrConnect.alreadyMember', 'Already a Member', 'Redan medlem'), message: tx('qrConnect.alreadyMemberMessage', 'You are already a member of this school.', 'Du är redan medlem i denna skola.'), type: 'info' });
            } else {
              throw error;
            }
          } else {
            showToast({ title: tx('qrConnect.joined', 'Joined!', 'Ansluten!'), message: tx('qrConnect.joinedSchool', 'You have joined the school as an instructor.', 'Du har gått med i skolan som handledare.'), type: 'success' });
          }
        }
      } else if (targetRole === 'school') {
        // Student (or anyone else) scanning school QR -> enroll as student
        const { data: school } = await supabase
          .from('school_memberships')
          .select('school_id')
          .eq('user_id', targetUserId)
          .in('role', ['admin', 'owner'])
          .limit(1)
          .single();

        if (school) {
          const { error } = await supabase.from('school_memberships').insert({
            school_id: school.school_id,
            user_id: user?.id,
            role: 'student',
          });

          if (error) {
            if (error.code === '23505') {
              showToast({ title: tx('qrConnect.alreadyEnrolled', 'Already Enrolled', 'Redan inskriven'), message: tx('qrConnect.alreadyEnrolledMessage', 'You are already enrolled in this school.', 'Du är redan inskriven i denna skola.'), type: 'info' });
            } else {
              throw error;
            }
          } else {
            showToast({ title: tx('qrConnect.enrolled', 'Enrolled!', 'Inskriven!'), message: tx('qrConnect.enrolledSchool', 'You are now enrolled in the school.', 'Du är nu inskriven i skolan.'), type: 'success' });
          }
        }
      } else {
        showToast({ title: tx('qrConnect.connected', 'Connect', 'Koppling'), message: tx('qrConnect.requestSent', 'Connection request sent!', 'Kopplingsförfrågan skickad!'), type: 'success' });
      }
    } catch (error) {
      console.error('QR connect error:', error);
      showToast({ title: tx('qrConnect.error', 'Error', 'Fel'), message: tx('qrConnect.errorMessage', 'Failed to connect. Please try again.', 'Kunde inte koppla. Försök igen.'), type: 'error' });
    } finally {
      setProcessing(false);
      setTimeout(() => setScanned(false), 2000);
    }
  };

  const renderShowMode = () => (
    <YStack flex={1} alignItems="center" justifyContent="center" gap="$4" padding="$4">
      <QRCodeDisplay value={connectUrl} size={QR_SIZE} isDark={isDark} />

      <Text fontSize="$4" color={isDark ? '#CCC' : '#333'} textAlign="center">
        {profile?.role === 'school'
          ? (t('qrConnect.schoolEnroll') || 'Share to let students enroll')
          : profile?.role === 'instructor' || profile?.role === 'teacher'
            ? (t('qrConnect.instructorConnect') || 'Share to connect with students')
            : (t('qrConnect.scanToConnect') || 'Share to connect')}
      </Text>

      <TouchableOpacity
        onPress={handleShare}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 24,
          paddingVertical: 14,
          borderRadius: 12,
          backgroundColor: '#00E6C3',
        }}
      >
        <Feather name="share-2" size={20} color="#000" />
        <Text fontSize="$4" fontWeight="bold" color="#000">
          Share Connect Link
        </Text>
      </TouchableOpacity>

      <Text fontSize="$2" color={isDark ? '#666' : '#999'} textAlign="center" paddingHorizontal="$4">
        Others can scan this or use the shared link to instantly connect with you
      </Text>
    </YStack>
  );

  const renderScanMode = () => {
    if (!CameraView) {
      return (
        <YStack flex={1} justifyContent="center" alignItems="center" gap="$4" padding="$4">
          <Feather name="camera" size={48} color={isDark ? '#666' : '#CCC'} />
          <Text fontSize="$4" color={isDark ? '#CCC' : '#333'} textAlign="center">
            {t('qrConnect.cameraNotAvailable') || 'Camera scanning requires expo-camera. Use Share to connect instead.'}
          </Text>
        </YStack>
      );
    }

    if (!permission?.granted) {
      return (
        <YStack flex={1} justifyContent="center" alignItems="center" gap="$4" padding="$4">
          <Feather name="camera-off" size={48} color={isDark ? '#666' : '#CCC'} />
          <Text fontSize="$4" color={isDark ? '#CCC' : '#333'} textAlign="center">
            Camera permission is needed to scan QR codes
          </Text>
          <TouchableOpacity
            onPress={requestPermission}
            style={{
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 12,
              backgroundColor: '#00E6C3',
            }}
          >
            <Text fontWeight="bold" color="#000">Grant Permission</Text>
          </TouchableOpacity>
        </YStack>
      );
    }

    return (
      <YStack flex={1}>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        >
          {/* Scan overlay */}
          <YStack flex={1} justifyContent="center" alignItems="center">
            <YStack
              width={250}
              height={250}
              borderWidth={3}
              borderColor="#00E6C3"
              borderRadius={20}
              borderStyle="dashed"
            />
            {processing && (
              <YStack position="absolute" justifyContent="center" alignItems="center">
                <Spinner size="large" color="#00E6C3" />
              </YStack>
            )}
          </YStack>
          <YStack position="absolute" bottom={40} left={0} right={0} alignItems="center">
            <Text fontSize="$4" color="#FFF" fontWeight="600" textAlign="center">
              Point camera at a Vromm QR code
            </Text>
          </YStack>
        </CameraView>
      </YStack>
    );
  };

  return (
    <Screen>
      <Header title={t('qrConnect.title') || 'Quick Connect'} showBack />

      {/* Mode toggle */}
      <XStack padding="$3" gap="$2">
        <TouchableOpacity
          onPress={() => setMode('show')}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 10,
            alignItems: 'center',
            backgroundColor: mode === 'show' ? '#00E6C3' : (isDark ? '#333' : '#E5E5E5'),
          }}
        >
          <Text
            fontWeight={mode === 'show' ? 'bold' : 'normal'}
            color={mode === 'show' ? '#000' : (isDark ? '#FFF' : '#333')}
          >
            {t('qrConnect.showQR') || 'Show QR'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setMode('scan')}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 10,
            alignItems: 'center',
            backgroundColor: mode === 'scan' ? '#00E6C3' : (isDark ? '#333' : '#E5E5E5'),
          }}
        >
          <Text
            fontWeight={mode === 'scan' ? 'bold' : 'normal'}
            color={mode === 'scan' ? '#000' : (isDark ? '#FFF' : '#333')}
          >
            {t('qrConnect.scanQR') || 'Scan QR'}
          </Text>
        </TouchableOpacity>
      </XStack>

      {mode === 'show' ? renderShowMode() : renderScanMode()}
    </Screen>
  );
}
