import React, { useState } from 'react';
import { Modal, Alert } from 'react-native';
import { YStack, XStack, Card, Button, TextArea, Text } from 'tamagui';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { Database } from '../../lib/database.types';

type ReportType = Database['public']['Enums']['report_type'];

interface ReportDialogProps {
  reportableId: string;
  reportableType: 'route' | 'comment' | 'review' | 'user';
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
      const { error: reportError } = await supabase.from('reports').insert({
        reportable_id: reportableId,
        reportable_type: reportableType,
        reporter_id: user.id,
        report_type: reportType,
        content: content.trim() || undefined,
        status: 'pending',
      });

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
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
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
