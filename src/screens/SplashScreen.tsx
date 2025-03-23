import { Image } from 'react-native';
import { YStack, useTheme } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { useLanguage } from '../context/LanguageContext';

export function SplashScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useLanguage();
  const theme = useTheme();

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  const handleSignup = () => {
    navigation.navigate('Signup');
  };

  return (
    <Screen>
      <YStack f={1} justifyContent="center" alignItems="center" gap={32} paddingHorizontal="$4">
        <Image
          source={require('../../assets/images/vromm+label+stacked.png')}
          style={{ width: 200, height: 200, resizeMode: 'contain' }}
        />

        <YStack gap={12} alignItems="center">
          <Text size="3xl" weight="bold" textAlign="center" fontFamily="$heading">
            {t('auth.signIn.title')}
          </Text>
          <Text size="md" intent="muted" textAlign="center">
            {t('auth.signIn.slogan')}
          </Text>
        </YStack>

        <YStack gap={16} width="100%" paddingHorizontal="$4" marginTop="$4">
          <Button variant="primary" size="lg" onPress={handleLogin}>
            {t('auth.signIn.signInButton')}
          </Button>

          <Button variant="secondary" size="lg" onPress={handleSignup}>
            {t('auth.signUp.signUpButton')}
          </Button>
        </YStack>
      </YStack>
    </Screen>
  );
}
