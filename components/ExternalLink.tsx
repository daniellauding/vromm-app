import { openBrowserAsync } from 'expo-web-browser';
import { type ComponentProps } from 'react';
import { Platform, Text, Pressable, Linking } from 'react-native';

type Props = ComponentProps<typeof Text> & { href: string };

export function ExternalLink({ href, ...rest }: Props) {
  const handlePress = async () => {
    if (Platform.OS !== 'web') {
      // Open the link in an in-app browser.
      await openBrowserAsync(href);
    } else {
      // On web, use regular linking
      await Linking.openURL(href);
    }
  };

  return (
    <Pressable onPress={handlePress}>
      <Text {...rest} />
    </Pressable>
  );
}
