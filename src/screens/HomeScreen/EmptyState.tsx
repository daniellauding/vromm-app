import { YStack, XStack, Card, Separator, ScrollView, Select } from 'tamagui';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../types/navigation';

interface EmptyStateProps {
  title: string;
  message: string;
  icon?: keyof typeof Feather.glyphMap;
  actionLabel?: string;
  actionIcon?: keyof typeof Feather.glyphMap;
  onAction?: () => void;
  secondaryLabel?: string;
  secondaryIcon?: keyof typeof Feather.glyphMap;
  onSecondaryAction?: () => void;
  variant?: 'default' | 'success' | 'warning' | 'info';
}

export const EmptyState = ({ 
  title, 
  message, 
  icon = 'info',
  actionLabel,
  actionIcon = 'plus',
  onAction,
  secondaryLabel,
  secondaryIcon = 'external-link',
  onSecondaryAction,
  variant = 'default'
}: EmptyStateProps) => {
  const navigation = useNavigation<NavigationProp>();

  const getVariantColors = () => {
    switch (variant) {
      case 'success':
        return { iconColor: '#00E6C3', borderColor: 'rgba(0, 230, 195, 0.3)' };
      case 'warning':
        return { iconColor: '#FF9500', borderColor: 'rgba(255, 149, 0, 0.3)' };
      case 'info':
        return { iconColor: '#4B6BFF', borderColor: 'rgba(75, 107, 255, 0.3)' };
      default:
        return { iconColor: '$gray11', borderColor: 'transparent' };
    }
  };

  const { iconColor, borderColor } = getVariantColors();

  return (
    <Card 
      bordered 
      elevate 
      backgroundColor="$backgroundStrong" 
      padding="$4"
      borderWidth={variant !== 'default' ? 1 : 0}
      borderColor={borderColor}
    >
      <YStack alignItems="center" gap="$3">
        <Feather name={icon} size={32} color={iconColor} />
        <Text size="xl" weight="bold" textAlign="center">
          {title}
        </Text>
        <Text size="md" color="$gray11" textAlign="center" lineHeight={20}>
          {message}
        </Text>
        
        {/* Action buttons */}
        {(actionLabel || secondaryLabel) && (
          <YStack gap="$2" marginTop="$2" width="100%">
            {actionLabel && (
              <Button 
                variant="primary" 
                size="md" 
                onPress={onAction}
                iconBefore={<Feather name={actionIcon} size={16} color="white" />}
              >
                {actionLabel}
              </Button>
            )}
            {secondaryLabel && (
              <Button 
                variant="secondary" 
                size="sm" 
                onPress={onSecondaryAction}
                iconBefore={<Feather name={secondaryIcon} size={16} />}
              >
                {secondaryLabel}
              </Button>
            )}
          </YStack>
        )}
      </YStack>
    </Card>
  );
};
