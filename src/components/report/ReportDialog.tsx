import React, { useState } from 'react';
import { Modal, Alert } from 'react-native';
import { YStack, XStack, Card, Button, TextArea, Text } from 'tamagui';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
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

const REPORT_TYPES: { value: ReportType; label: string; description: string }[] = [
  {
    value: 'spam',
    label: 'Spam',
    description: 'Repetitive, unwanted, or commercial content',
  },
  {
    value: 'harmful_content',
    label: 'Harmful Content',
    description: 'Content that may be harmful, offensive, or inappropriate',
  },
  {
    value: 'privacy_issue',
    label: 'Privacy Issue',
    description: 'Content that violates privacy or shares personal information',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Please provide details about your report',
  },
];

export function ReportDialog({ reportableId, reportableType, onClose }: ReportDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState<ReportType>('spam');
  const [content, setContent] = useState('');

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to report content');
      return;
    }

    if (reportType === 'other' && !content.trim()) {
      Alert.alert('Error', 'Please provide details for your report');
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
        (content?.trim() ? `${content.trim()}` : '') +
        `\n[type:${reportableType}]`
      ).trim();

      // Build structured context for deterministic routing
      const context: any = (() => {
        const base = { subtype: reportableType } as any;
        const dl = (p: string) => `vromm://${p}`;
        switch (reportableType) {
          case 'conversation':
            return { ...base, conversation_id: reportableId, deeplink: dl(`conversation/${reportableId}`) };
          case 'user':
            return { ...base, user_id: reportableId, deeplink: dl(`user/${reportableId}`) };
          case 'route':
            return { ...base, route_id: reportableId, deeplink: dl(`route/${reportableId}`) };
          case 'event':
            return { ...base, event_id: reportableId, deeplink: dl(`event/${reportableId}`) };
          case 'learning_path':
            return { ...base, learning_path_id: reportableId, deeplink: dl(`learning-path/${reportableId}`) };
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
        Alert.alert('Error', 'You have already reported this item');
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

      Alert.alert('Success', 'Report submitted successfully');
      onClose();
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedType = REPORT_TYPES.find((type) => type.value === reportType);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} presentationStyle="overFullScreen" statusBarTranslucent>
      <YStack flex={1} backgroundColor="rgba(0,0,0,0.5)" justifyContent="center" padding="$4">
        <Card elevate bordered backgroundColor="$background" padding="$4">
          <YStack gap="$4">
            <Text fontSize="$6" fontWeight="bold">
              Report Content
            </Text>

            <YStack gap="$2">
              <Text fontSize="$5" fontWeight="600">
                What's wrong with this content?
              </Text>
              <XStack flexWrap="wrap" gap="$2">
                {REPORT_TYPES.map((type) => (
                  <Button
                    key={type.value}
                    size="sm"
                    variant="outlined"
                    backgroundColor={reportType === type.value ? '$blue10' : undefined}
                    onPress={() => setReportType(type.value)}
                  >
                    {type.label}
                  </Button>
                ))}
              </XStack>
              {selectedType && (
                <Text fontSize="$3" color="$gray11">
                  {selectedType.description}
                </Text>
              )}
            </YStack>

            {(reportType === 'other' || content) && (
              <YStack gap="$2">
                <Text fontSize="$5" fontWeight="600">
                  Additional Details
                </Text>
                <TextArea
                  size="$4"
                  placeholder="Please provide more information about your report..."
                  value={content}
                  onChangeText={setContent}
                  autoCapitalize="none"
                  numberOfLines={4}
                />
              </YStack>
            )}

            <XStack gap="$2">
              <Button flex={1} variant="outlined" onPress={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                flex={1}
                variant="outlined"
                backgroundColor="$blue10"
                onPress={handleSubmit}
                disabled={loading || (reportType === 'other' && !content.trim())}
              >
                Submit Report
              </Button>
            </XStack>
          </YStack>
        </Card>
      </YStack>
    </Modal>
  );
}
