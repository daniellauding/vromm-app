import React from 'react';
import { XStack, Spinner, styled, YStack } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { Text } from './Text';
import { useThemePreference } from '../hooks/useThemeOverride';

type ChipSize = 'xs' | 'sm' | 'md' | 'lg';
type ChipVariant = 'default' | 'outline' | 'tag';
type ChipState = 'normal' | 'active' | 'disabled' | 'loading';

type TagColorProp = {
  backgroundColor?: string; // chip bg
  borderColor?: string; // chip border
  textColor?: string;
  iconColor?: string;
};

type ChipProps = {
  active?: boolean;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Feather.glyphMap;
  iconRight?: keyof typeof Feather.glyphMap;
  iconOnly?: boolean;
  children?: React.ReactNode;
  label?: string;
  onPress?: () => void;
  size?: ChipSize;
  variant?: ChipVariant;
  tagColor?: TagColorProp; // New: allow overriding colors for 'tag'
  testID?: string;
  showTestCases?: boolean;
  state?: ChipState;
};

const ChipRoot = styled(XStack, {
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'row',
  userSelect: 'none',
  cursor: 'pointer',
  borderWidth: 1,
  pressStyle: {
    opacity: 0.8,
  },
  focusStyle: {
    borderColor: '#00E6C3',
  },
  variants: {
    size: {
      xs: { px: 10, py: 4, borderRadius: 14, height: 28, gap: 4 },
      sm: { px: 14, py: 6, borderRadius: 16, height: 32, gap: 6 },
      md: { px: 16, py: 8, borderRadius: 19, height: 38, gap: 8 },
      lg: { px: 22, py: 10, borderRadius: 22, height: 44, gap: 12 },
    },
  } as const,
});

function getTagColors({
  isDark,
  variant,
  active,
  disabled,
  tagColor,
}: {
  isDark: boolean;
  variant: ChipVariant;
  active: boolean;
  disabled?: boolean;
  tagColor?: TagColorProp;
}) {
  // Allow manual override for all props if tagColor given!
  if (variant === 'tag' && tagColor) {
    return {
      backgroundColor: tagColor.backgroundColor ?? (active ? '#00E6C3' : isDark ? '#2C4252' : '#E0FDFC'),
      borderColor: tagColor.borderColor ?? (active ? '#00E6C3' : isDark ? '#24791B' : '#7DE1C2'),
      textColor: tagColor.textColor ?? (active ? '#000' : isDark ? '#D1F7EB' : '#23725C'),
      iconColor: tagColor.iconColor ?? (active ? '#000' : isDark ? '#D1F7EB' : '#23725C'),
      borderWidth: 1,
      opacity: disabled ? 0.45 : 1,
    };
  }
  // fallback to default (FilterSheet) chip colors
  const palette = isDark
    ? {
        bg: '#23272A',
        border: '#35373F',
        text: '#E9ECEF',
        bgActive: '#00E6C3',
        borderActive: '#00E6C3',
        textActive: '#000000',
      }
    : {
        bg: '#fff',
        border: '#e0e0e0',
        text: '#222',
        bgActive: '#00E6C3',
        borderActive: '#00E6C3',
        textActive: '#000000',
      };
  const isOutline = variant === 'outline';
  const backgroundColor = active
    ? palette.bgActive
    : isOutline
    ? 'transparent'
    : palette.bg;
  const borderColor = active
    ? palette.borderActive
    : isOutline
    ? '#00FFB9'
    : palette.border;

  let textColor = palette.text;
  if (active) textColor = palette.textActive;
  else if (isOutline) textColor = '#00E6C3';
  else textColor = palette.text;
  return {
    backgroundColor,
    borderColor,
    borderWidth: 1,
    textColor,
    iconColor: textColor,
    opacity: disabled ? 0.45 : 1,
  };
}

export function Chip({
  active: activeProp = false,
  disabled: disabledProp = false,
  loading: loadingProp = false,
  icon,
  iconRight,
  iconOnly = false,
  children,
  label,
  onPress,
  size = 'md',
  variant = 'default',
  tagColor,
  testID,
  showTestCases = false,
  state,
}: ChipProps) {
  // Controlled state support for tests/stories
  let active = activeProp;
  let disabled = disabledProp;
  let loading = loadingProp;
  if (state) {
    if (state === 'active') {
      active = true;
      disabled = false;
      loading = false;
    } else if (state === 'disabled') {
      active = false;
      disabled = true;
      loading = false;
    } else if (state === 'loading') {
      active = false;
      disabled = false;
      loading = true;
    } else {
      active = false;
      disabled = false;
      loading = false;
    }
  }

  // get theme/size
  const themePref = useThemePreference();
  const resolvedTheme =
    themePref && 'resolvedTheme' in themePref
      ? (themePref.resolvedTheme as string)
      : themePref?.effectiveTheme || 'light';
  const isDark = resolvedTheme === 'dark';

  // match size for use in config
  const sizeMap = {
    xs: { px: 10, py: 4, fontSize: 12, height: 28, icon: 14, borderRadius: 14, gap: 4 },
    sm: { px: 14, py: 6, fontSize: 14, height: 32, icon: 16, borderRadius: 16, gap: 6 },
    md: { px: 16, py: 8, fontSize: 15, height: 38, icon: 18, borderRadius: 19, gap: 8 },
    lg: { px: 22, py: 10, fontSize: 17, height: 44, icon: 22, borderRadius: 22, gap: 12 },
  } as const;
  const s = sizeMap[size as keyof typeof sizeMap];

  const isIconOnly = iconOnly || (!!icon && !label && !children && !iconRight);

  const btnColors = getTagColors({
    isDark,
    variant,
    active,
    disabled,
    tagColor,
  });

  // for press style (pressed or ripple effect for feedback)
  const pressStyle = {
    opacity: disabled ? 0.45 : 0.8,
    backgroundColor:
      !disabled && active
        ? btnColors.backgroundColor
        : !disabled && variant !== 'outline'
        ? isDark
          ? '#363B3E'
          : '#F7F7F7'
        : 'transparent',
  };

  const renderLabel = !isIconOnly && (label || children);

  // main chip element
  const chipNode = (
    <ChipRoot
      testID={testID}
      pointerEvents={disabled ? 'none' : 'auto'}
      size={size}
      borderRadius={s.borderRadius}
      backgroundColor={btnColors.backgroundColor}
      borderColor={btnColors.borderColor}
      borderWidth={btnColors.borderWidth}
      opacity={btnColors.opacity}
      height={s.height}
      minWidth={s.height}
      gap={isIconOnly ? 0 : s.gap}
      pressStyle={pressStyle}
      onPress={disabled ? undefined : onPress}
    >
      {loading && (
        <Spinner
          size="small"
          color={active ? '#000' : isDark ? '#ECECEC' : '#999'}
          marginRight={renderLabel ? 4 : 0}
        />
      )}
      {!loading && icon && (
        <Feather
          name={icon}
          size={s.icon}
          color={btnColors.iconColor}
          style={isIconOnly ? undefined : { marginLeft: 0, marginRight: s.gap / 2 }}
        />
      )}
      {renderLabel && (
        <Text
          color={btnColors.textColor}
          fontSize={s.fontSize}
          fontWeight="600"
          numberOfLines={1}
        >
          {label}
          {children}
        </Text>
      )}
      {!loading && iconRight && (
        <Feather
          name={iconRight}
          size={s.icon}
          color={btnColors.iconColor}
          style={isIconOnly ? undefined : { marginRight: 0, marginLeft: s.gap / 2 }}
        />
      )}
    </ChipRoot>
  );

  // Demo/test grid
  if (showTestCases) {
    const allStates: ChipState[] = ['normal', 'active', 'disabled', 'loading'];
    // Also show tag variant + color props
    const demoColors: TagColorProp = {
      backgroundColor: '#12746A',
      borderColor: '#09DFC0',
      textColor: '#fff',
      iconColor: '#fff',
    };
    return (
      <YStack gap={20} padding={10} backgroundColor={isDark ? '#181C1F' : '#F0F0F7'}>
        <Text color={isDark ? '#aab' : '#455'} fontSize={15} marginBottom={6}>
          Standard variants
        </Text>
        {/* Default + Outline */}
        <XStack flexWrap="wrap" gap={16}>
          {(['xs', 'sm', 'md', 'lg'] as ChipSize[]).map((sz) =>
            (['default', 'outline'] as ChipVariant[]).map((variantType) => (
              <YStack key={sz + variantType} gap={4} alignItems="center">
                <Text
                  color={isDark ? '#aab' : '#455'}
                  fontSize={11}
                  marginBottom={2}
                >{`${sz} ${variantType}`}</Text>
                <XStack gap={4}>
                  {allStates.map((stateVal) => (
                    <Chip
                      key={`${sz}-${variantType}-${stateVal}`}
                      label={stateVal === 'normal' ? sz : `${sz} ${stateVal}`}
                      size={sz}
                      variant={variantType}
                      icon="star"
                      iconRight="chevron-right"
                      state={stateVal}
                    />
                  ))}
                </XStack>
              </YStack>
            ))
          )}
        </XStack>

        <Text color={isDark ? '#aab' : '#2e9'} fontSize={15} marginVertical={6}>
          Tag style with custom color — match UX tag chips
        </Text>
        <XStack gap={12} flexWrap="wrap">
          {(['xs', 'sm', 'md', 'lg'] as ChipSize[]).map((sz) => (
            <Chip
              key={`tagdemo-${sz}`}
              label={sz}
              size={sz}
              variant="tag"
              tagColor={demoColors}
              icon="tag"
              iconRight="chevron-right"
            />
          ))}
        </XStack>
        <Text color={isDark ? '#bbb' : '#345'} fontSize={12} marginTop={20}>
          Example: icon only, active, color
        </Text>
        <Chip
          icon="book"
          size="lg"
          variant="tag"
          tagColor={demoColors}
          active
        />
      </YStack>
    );
  }

  return chipNode;
}
