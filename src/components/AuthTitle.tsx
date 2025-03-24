import React from 'react';
import { YStack, SizableText } from 'tamagui';
import { useT } from '../hooks/useT';

interface AuthTitleProps {
  titleKey: string;
  subtitleKey?: string;
  align?: 'center' | 'left' | 'right';
}

/**
 * A component for displaying translated auth screen titles and subtitles
 */
export const AuthTitle: React.FC<AuthTitleProps> = ({
  titleKey,
  subtitleKey,
  align = 'center'
}) => {
  const { t } = useT();

  return (
    <YStack space="$2" marginBottom="$4">
      <SizableText size="$8" fontWeight="bold" textAlign={align}>
        {t(titleKey)}
      </SizableText>

      {subtitleKey && (
        <SizableText size="$4" color="$gray11" textAlign={align}>
          {t(subtitleKey)}
        </SizableText>
      )}
    </YStack>
  );
};

export default AuthTitle;
