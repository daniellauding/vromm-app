import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { YStack, XStack, Card, Separator, Text, Input } from 'tamagui';
import { useT } from '../hooks/useT';
import { AuthTitle } from '../components/AuthTitle';
import { AuthButton } from '../components/AuthButton';
import { Switch } from 'tamagui';

export const TranslatedAuthDemo: React.FC = () => {
  const { t, language, toggleLanguage } = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    setLoading(true);
    // Simulate loading
    setTimeout(() => {
      setLoading(false);
    }, 2000);
  };

  return (
    <ScrollView style={styles.container}>
      <YStack space="$4" padding="$4">
        <Card bordered padding="$4">
          <YStack space="$2">
            <Text fontSize="$6" fontWeight="bold">
              Translated Auth Demo
            </Text>

            <XStack alignItems="center" space="$2">
              <Text>English</Text>
              <Switch checked={language === 'sv'} onCheckedChange={toggleLanguage}>
                <Switch.Thumb animation="bouncy" />
              </Switch>
              <Text>Swedish</Text>
            </XStack>
          </YStack>
        </Card>

        {/* Login Demo */}
        <Card bordered padding="$4">
          <YStack space="$4">
            <AuthTitle titleKey="auth.signIn.title" subtitleKey="auth.signIn.slogan" />

            <YStack space="$2">
              <Text fontWeight="bold">{t('auth.signIn.emailLabel')}</Text>
              <Input
                placeholder={t('auth.signIn.emailPlaceholder')}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text fontWeight="bold" marginTop="$2">
                {t('auth.signIn.passwordLabel')}
              </Text>
              <Input
                placeholder={t('auth.signIn.passwordPlaceholder')}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <Text color="$blue10" textAlign="right" marginTop="$1" pressStyle={{ opacity: 0.7 }}>
                {t('auth.signIn.forgotPassword')}
              </Text>

              <AuthButton
                textKey="auth.signIn.signInButton"
                marginTop="$4"
                isLoading={loading}
                onPress={handleSubmit}
              />

              <XStack justifyContent="center" space="$2" marginTop="$4" alignItems="center">
                <Text>{t('auth.signIn.noAccount')}</Text>
                <Text color="$blue10" fontWeight="bold" pressStyle={{ opacity: 0.7 }}>
                  {t('auth.signIn.signUpLink')}
                </Text>
              </XStack>
            </YStack>
          </YStack>
        </Card>

        {/* Signup Demo */}
        <Card bordered padding="$4">
          <YStack space="$4">
            <AuthTitle titleKey="auth.signUp.title" subtitleKey="auth.signUp.subtitle" />

            <YStack space="$2">
              <Text fontWeight="bold">{t('auth.signUp.emailLabel')}</Text>
              <Input
                placeholder={t('auth.signUp.emailPlaceholder')}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text fontWeight="bold" marginTop="$2">
                {t('auth.signUp.passwordLabel')}
              </Text>
              <Input placeholder={t('auth.signUp.passwordPlaceholder')} secureTextEntry />

              <Text fontWeight="bold" marginTop="$2">
                {t('auth.signUp.confirmPasswordLabel')}
              </Text>
              <Input placeholder={t('auth.signUp.confirmPasswordPlaceholder')} secureTextEntry />

              <AuthButton textKey="auth.signUp.signUpButton" marginTop="$4" variant="primary" />

              <XStack justifyContent="center" space="$2" marginTop="$4" alignItems="center">
                <Text>{t('auth.signUp.hasAccount')}</Text>
                <Text color="$blue10" fontWeight="bold" pressStyle={{ opacity: 0.7 }}>
                  {t('auth.signUp.signInLink')}
                </Text>
              </XStack>
            </YStack>
          </YStack>
        </Card>

        {/* Reset Password Demo */}
        <Card bordered padding="$4">
          <YStack space="$4">
            <AuthTitle
              titleKey="auth.resetPassword.title"
              subtitleKey="auth.resetPassword.subtitle"
            />

            <YStack space="$2">
              <Text fontWeight="bold">{t('auth.resetPassword.emailLabel')}</Text>
              <Input
                placeholder={t('auth.resetPassword.emailPlaceholder')}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <AuthButton
                textKey="auth.resetPassword.resetButton"
                marginTop="$4"
                variant="primary"
              />

              <AuthButton
                textKey="auth.resetPassword.backToLogin"
                marginTop="$2"
                variant="outline"
              />
            </YStack>
          </YStack>
        </Card>
      </YStack>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  }
});

export default TranslatedAuthDemo;
