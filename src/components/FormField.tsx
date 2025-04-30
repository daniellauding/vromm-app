import React, { forwardRef } from 'react';
import { Input, Text, YStack, XStack, Label, styled } from 'tamagui';
import { tokens } from '../tokens';
import { darkColors } from '../theme/tokens';

const StyledInput = styled(Input, {
  name: 'StyledInput',
  h: tokens.size[10],
  borderWidth: 1,
  borderColor: '$borderColor',
  bg: '$background',
  br: tokens.radius[2],
  px: tokens.space[3],
  fontSize: tokens.fontSize[2],
  color: '$color',
  placeholderTextColor: darkColors.textMuted,
  autoCapitalize: 'none',

  // Focus state
  hoverStyle: {
    borderColor: '$borderColorHover'
  },
  focusStyle: {
    borderColor: tokens.color.emerald400,
    borderWidth: 2,
    bg: '$backgroundFocus'
  }
});

const StyledLabel = styled(Label, {
  name: 'StyledLabel',
  color: '$color',
  fontSize: tokens.fontSize[2],
  mb: tokens.space[1]
});

type FormFieldProps = React.ComponentProps<typeof Input> & {
  label?: string;
  error?: string;
  rightElement?: React.ReactNode;
};

export const FormField = forwardRef<any, FormFieldProps>(
  ({ label, error, rightElement, ...inputProps }, ref) => {
    return (
      <YStack gap={tokens.space[2]} w="100%">
        {label && <StyledLabel>{label}</StyledLabel>}
        <XStack w="100%" gap={tokens.space[2]}>
          <StyledInput ref={ref} {...inputProps} flex={1} />
          {rightElement}
        </XStack>
        {error ? (
          <Text color="$error" fontSize={tokens.fontSize[1]}>
            {error}
          </Text>
        ) : null}
      </YStack>
    );
  }
);
