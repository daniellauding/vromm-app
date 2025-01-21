import { Input, Text, YStack, XStack, Label, styled } from 'tamagui';
import { tokens } from '../tokens';

const StyledInput = styled(Input, {
  name: 'StyledInput',
  h: tokens.size[10],
  borderWidth: 1,
  borderColor: tokens.color.gray300,
  bg: tokens.color.gray50,
  br: tokens.radius[2],
  px: tokens.space[3],
  fontSize: tokens.fontSize[2],

  // Focus state
  hoverStyle: {
    borderColor: tokens.color.gray400,
  },
  focusStyle: {
    borderColor: tokens.color.indigo600,
    borderWidth: 2,
    bg: tokens.color.white,
  },
});

const StyledLabel = styled(Label, {
  name: 'StyledLabel',
  color: tokens.color.gray700,
  fontSize: tokens.fontSize[2],
  mb: tokens.space[1],
});

type FormFieldProps = React.ComponentProps<typeof Input> & {
  label: string;
  error?: string;
  rightElement?: React.ReactNode;
};

export function FormField({ 
  label, 
  error, 
  rightElement,
  ...inputProps 
}: FormFieldProps) {
  return (
    <YStack gap={tokens.space[2]}>
      <XStack justifyContent="space-between">
        <StyledLabel>{label}</StyledLabel>
        {rightElement}
      </XStack>
      <StyledInput {...inputProps} />
      {error ? (
        <Text color={tokens.color.red500} fontSize={tokens.fontSize[1]}>
          {error}
        </Text>
      ) : null}
    </YStack>
  );
} 