import { YStack, XStack, Card, Separator, ScrollView, Select } from 'tamagui';
import { Text } from '../../components/Text';
import { Feather } from '@expo/vector-icons';

export const EmptyState = ({ title, message }: { title: string; message: string }) => {
  return (
    <Card bordered elevate backgroundColor="$backgroundStrong" padding="$4">
      <YStack alignItems="center" gap="$2">
        <Feather name="info" size={24} color="$gray11" />
        <Text size="lg" weight="bold">
          {title}
        </Text>
        <Text size="sm" color="$gray11" textAlign="center">
          {message}
        </Text>
      </YStack>
    </Card>
  );
};
