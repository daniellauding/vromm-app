import React, { useState } from 'react';
import {
  Modal,
  Alert,
  Pressable,
  useColorScheme,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { YStack, XStack, TextArea, Text } from 'tamagui';
import { BlurView } from 'expo-blur';
import { Button } from '../Button';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../contexts/TranslationContext';
import type { Database } from '../../lib/database.types';

type ReportType = Database['public']['Enums']['report_type'];

interface ReportDialogProps {
  reportableId: string;
  reportableType:
    | 'route'
    | 'event'
    | 'learning_path'
    | 'exercise'
    | 'conversation'
    | 'comment'
    | 'route_comment'
    | 'event_comment'
    | 'exercise_comment'
    | 'learning_path_comment'
    | 'review'
    | 'user';
  onClose: () => void;
}

const styles = StyleSheet.create({
  filterChip: {
    marginRight: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export function ReportDialog({ reportableId, reportableType, onClose }: ReportDialogProps) {
  const { user } = useAuth();
  const { t, language } = useTranslation();
  const colorScheme = useColorScheme();
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState<ReportType>('spam');
  const [content, setContent] = useState('');

  // Helper function to get translation with fallback when t() returns the key itself
  const getTranslation = (key: string, fallback: string): string => {
    const translated = t(key);
    // If translation is missing, t() returns the key itself - use fallback instead
    return translated && translated !== key ? translated : fallback;
  };

  const REPORT_TYPES: { value: ReportType; label: string; description: string }[] = [
    {
      value: 'spam',
      label: getTranslation('report.spam', language === 'sv' ? 'Spam' : 'Spam'),
      description: getTranslation(
        'report.spamDescription',
        language === 'sv'
          ? 'Repetitivt, oönskat eller kommersiellt innehåll'
          : 'Repetitive, unwanted, or commercial content'
      ),
    },
    {
      value: 'harmful_content',
      label: getTranslation(
        'report.harmfulContent',
        language === 'sv' ? 'Skadligt innehåll' : 'Harmful Content'
      ),
      description: getTranslation(
        'report.harmfulDescription',
        language === 'sv'
          ? 'Innehåll som kan vara skadligt, stötande eller olämpligt'
          : 'Content that may be harmful, offensive, or inappropriate'
      ),
    },
    {
      value: 'privacy_issue',
      label: getTranslation(
        'report.privacyIssue',
        language === 'sv' ? 'Integritetsproblem' : 'Privacy Issue'
      ),
      description: getTranslation(
        'report.privacyDescription',
        language === 'sv'
          ? 'Innehåll som bryter mot integriteten eller delar personlig information'
          : 'Content that violates privacy or shares personal information'
      ),
    },
    {
      value: 'other',
      label: getTranslation('report.other', language === 'sv' ? 'Annat' : 'Other'),
      description: getTranslation(
        'report.otherDescription',
        language === 'sv'
          ? 'Vänligen ge detaljer om din rapport'
          : 'Please provide details about your report'
      ),
    },
  ];

  const backgroundColor = colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textColor = colorScheme === 'dark' ? 'white' : 'black';
  const borderColor = colorScheme === 'dark' ? '#333' : '#DDD';

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert(
        getTranslation('common.error', language === 'sv' ? 'Fel' : 'Error'),
        getTranslation(
          'report.mustBeLoggedIn',
          language === 'sv' ? 'Du måste vara inloggad för att rapportera innehåll' : 'You must be logged in to report content'
        )
      );
      return;
    }

    if (reportType === 'other' && !content.trim()) {
      Alert.alert(
        getTranslation('common.error', language === 'sv' ? 'Fel' : 'Error'),
        getTranslation(
          'report.provideDetails',
          language === 'sv' ? 'Vänligen ge detaljer för din rapport' : 'Please provide details for your report'
        )
      );
      return;
    }

    try {
      setLoading(true);

      // Map extended types to current DB enum (route | comment | review | user)
      const normalizedType: ReportType = ((): any => {
        if (
          reportableType === 'route' ||
          reportableType === 'comment' ||
          reportableType === 'review' ||
          reportableType === 'user'
        ) {
          return reportableType;
        }
        if (reportableType === 'conversation') {
          // DB enum currently lacks 'conversation'; map to 'user' but keep original subtype in content
          return 'user';
        }
        if (
          reportableType === 'exercise' ||
          reportableType === 'learning_path' ||
          reportableType === 'event'
        ) {
          return 'route';
        }
        if (
          reportableType === 'route_comment' ||
          reportableType === 'event_comment' ||
          reportableType === 'exercise_comment' ||
          reportableType === 'learning_path_comment'
        ) {
          return 'comment';
        }
        return 'route';
      })();

      // Prefix subtype metadata into content so backend can see original type
      const finalContent = (
        (content?.trim() ? `${content.trim()}` : '') + `\n[type:${reportableType}]`
      ).trim();

      // Build structured context for deterministic routing
      const context: any = (() => {
        const base = { subtype: reportableType } as any;
        const dl = (p: string) => `vromm://${p}`;
        switch (reportableType) {
          case 'conversation':
            return {
              ...base,
              conversation_id: reportableId,
              deeplink: dl(`conversation/${reportableId}`),
            };
          case 'user':
            return { ...base, user_id: reportableId, deeplink: dl(`user/${reportableId}`) };
          case 'route':
            return { ...base, route_id: reportableId, deeplink: dl(`route/${reportableId}`) };
          case 'event':
            return { ...base, event_id: reportableId, deeplink: dl(`event/${reportableId}`) };
          case 'learning_path':
            return {
              ...base,
              learning_path_id: reportableId,
              deeplink: dl(`learning-path/${reportableId}`),
            };
          case 'exercise':
            return { ...base, exercise_id: reportableId, deeplink: dl(`exercise/${reportableId}`) };
          case 'route_comment':
          case 'event_comment':
          case 'exercise_comment':
          case 'learning_path_comment':
            return { ...base, comment_id: reportableId, deeplink: dl(`comment/${reportableId}`) };
          default:
            return base;
        }
      })();

      // Check if user has already reported this item
      const { data: existingReport } = await supabase
        .from('reports')
        .select('id')
        .eq('reportable_id', reportableId)
        .eq('reporter_id', user.id)
        .single();

      if (existingReport) {
        Alert.alert(
          getTranslation('common.error', language === 'sv' ? 'Fel' : 'Error'),
          getTranslation(
            'report.alreadyReported',
            language === 'sv' ? 'Du har redan rapporterat detta' : 'You have already reported this item'
          )
        );
        return;
      }

      // Submit the report
      const insertPayload: any = {
        reportable_id: reportableId,
        reportable_type: normalizedType,
        reporter_id: user.id,
        report_type: reportType,
        content: finalContent || undefined,
        status: 'pending',
        context,
      };

      const { error: reportError } = await supabase.from('reports').insert(insertPayload as any);

      if (reportError) throw reportError;

      Alert.alert(
        getTranslation('common.success', language === 'sv' ? 'Lyckades' : 'Success'),
        getTranslation(
          'report.submitted',
          language === 'sv' ? 'Rapport skickad' : 'Report submitted successfully'
        )
      );
      onClose();
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert(
        getTranslation('common.error', language === 'sv' ? 'Fel' : 'Error'),
        getTranslation(
          'report.failed',
          language === 'sv' ? 'Misslyckades att skicka rapport. Försök igen.' : 'Failed to submit report. Please try again.'
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const selectedType = REPORT_TYPES.find((type) => type.value === reportType);

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={true}
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
    >
      <BlurView
        style={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0 }}
        intensity={10}
        tint={colorScheme === 'dark' ? 'dark' : 'light'}
        pointerEvents="none"
      />
      <Pressable
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.3)',
        }}
        onPress={onClose}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <YStack
            width="90%"
            maxWidth={400}
            backgroundColor="transparent"
            justifyContent="center"
            alignItems="center"
          >
            <YStack
              backgroundColor={backgroundColor}
              paddingVertical="$4"
              paddingHorizontal="$4"
              overflow="hidden"
              borderRadius="$4"
              width="100%"
              gap="$4"
              borderColor={borderColor}
              borderWidth={1}
            >
              {/* Header */}
              <YStack gap="$3">
                <Text
                  fontSize={24}
                  fontWeight="900"
                  fontStyle="italic"
                  color={textColor}
                  textAlign="center"
                >
                  {getTranslation(
                    'report.title',
                    language === 'sv' ? 'Rapportera innehåll' : 'Report Content'
                  )}
                </Text>

                <YStack gap="$3">
                  <Text fontSize={18} fontWeight="600" color={textColor}>
                    {getTranslation(
                      'report.question',
                      language === 'sv' ? 'Vad är fel med detta innehåll?' : "What's wrong with this content?"
                    )}
                  </Text>
                  <XStack flexWrap="wrap" gap="$2">
                    {REPORT_TYPES.map((type) => (
                      <TouchableOpacity
                        key={type.value}
                        onPress={() => setReportType(type.value)}
                        disabled={loading}
                        style={[
                          styles.filterChip,
                          {
                            borderColor,
                            backgroundColor: reportType === type.value ? '#27febe' : 'transparent',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            {
                              color: reportType === type.value ? '#000000' : textColor,
                              fontWeight: reportType === type.value ? '600' : '500',
                            },
                          ]}
                        >
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </XStack>
                  {selectedType && (
                    <Text fontSize={12} color={textColor} opacity={0.7} fontStyle="italic">
                      {selectedType.description}
                    </Text>
                  )}
                </YStack>

                {(reportType === 'other' || content) && (
                  <YStack gap="$2">
                    <Text fontSize={16} fontWeight="600" color={textColor}>
                      {getTranslation(
                        'report.additionalDetails',
                        language === 'sv' ? 'Ytterligare detaljer' : 'Additional Details'
                      )}
                    </Text>
                    <TextArea
                      placeholder={getTranslation(
                        'report.placeholder',
                        language === 'sv'
                          ? 'Vänligen ge mer information om din rapport...'
                          : 'Please provide more information about your report...'
                      )}
                      value={content}
                      onChangeText={setContent}
                      autoCapitalize="sentences"
                      numberOfLines={4}
                      disabled={loading}
                      style={{
                        color: textColor,
                        backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5',
                        borderColor: borderColor,
                        borderWidth: 1,
                        borderRadius: 8,
                        padding: 12,
                      }}
                    />
                  </YStack>
                )}
              </YStack>

              {/* Action Buttons */}
              <YStack gap="$2">
                <Button
                  size="sm"
                  variant="primary"
                  onPress={handleSubmit}
                  disabled={loading || (reportType === 'other' && !content.trim())}
                >
                  {loading
                    ? getTranslation(
                        'report.submitting',
                        language === 'sv' ? 'Skickar...' : 'Submitting...'
                      )
                    : getTranslation(
                        'report.submitButton',
                        language === 'sv' ? 'Skicka rapport' : 'Submit Report'
                      )}
                </Button>

                <Button size="sm" variant="link" onPress={onClose} disabled={loading}>
                  {getTranslation('common.cancel', language === 'sv' ? 'Avbryt' : 'Cancel')}
                </Button>
              </YStack>
            </YStack>
          </YStack>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
