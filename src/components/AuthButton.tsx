import React from 'react';
import { Button, ButtonProps } from 'tamagui';
import { useT } from '../hooks/useT';
import { ActivityIndicator } from 'react-native';

interface AuthButtonProps extends Omit<ButtonProps, 'children'> {
  textKey: string;
  isLoading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
}

/**
 * A button component for auth screens with built-in translation support
 */
export const AuthButton: React.FC<AuthButtonProps> = ({
  textKey,
  isLoading = false,
  variant = 'primary',
  disabled,
  ...props
}) => {
  const { t } = useT();

  // Button style based on variant
  const getButtonStyle = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: '$blue10',
          color: 'white',
        };
      case 'secondary':
        return {
          backgroundColor: '$blue3',
          color: '$blue10',
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: '$blue8',
          color: '$blue10',
        };
      case 'text':
        return {
          backgroundColor: 'transparent',
          color: '$blue10',
        };
      default:
        return {};
    }
  };

  return (
    <Button
      size="$4"
      height={50}
      paddingHorizontal="$4"
      {...getButtonStyle()}
      disabled={isLoading || disabled}
      pressStyle={{ opacity: 0.8 }}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === 'primary' ? 'white' : undefined} size="small" />
      ) : (
        t(textKey)
      )}
    </Button>
  );
};
