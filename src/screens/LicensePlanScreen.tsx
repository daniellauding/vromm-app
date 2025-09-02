import React, { useState } from 'react';
import { YStack, XStack, Switch, Button, Input, TextArea } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { NavigationProp } from '../types/navigation';
import { Header } from '../components/Header';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useTranslation } from '../contexts/TranslationContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';

export function LicensePlanScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, profile, refreshProfile } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  // Form state
  const [targetDate, setTargetDate] = useState<Date | null>(() => {
    if (profile?.license_plan_data?.target_date) {
      return new Date(profile.license_plan_data.target_date);
    }
    return null;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [hasTheory, setHasTheory] = useState<boolean>(
    () => profile?.license_plan_data?.has_theory || false,
  );
  const [hasPractice, setHasPractice] = useState<boolean>(
    () => profile?.license_plan_data?.has_practice || false,
  );
  const [previousExperience, setPreviousExperience] = useState<string>(
    () => profile?.license_plan_data?.previous_experience || '',
  );
  const [specificGoals, setSpecificGoals] = useState<string>(
    () => profile?.license_plan_data?.specific_goals || '',
  );

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setTargetDate(selectedDate);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Format the data to save
      const licenseData = {
        target_date: targetDate ? targetDate.toISOString() : null,
        has_theory: hasTheory,
        has_practice: hasPractice,
        previous_experience: previousExperience,
        specific_goals: specificGoals,
      };

      // Update the profile
      const { error } = await supabase
        .from('profiles')
        .update({
          license_plan_completed: true,
          license_plan_data: licenseData,
        })
        .eq('id', user.id);

      if (error) throw error;

      // Refresh the profile to get the updated data
      await refreshProfile();

      // Navigate back
      navigation.goBack();
    } catch (err) {
      console.error('Error saving license plan:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Header title="Din körkortsplan" showBack />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView>
          <YStack padding="$4" space="$4">
            <Text size="xl" weight="bold">
              Berätta om dig och dina mål
            </Text>

            <Text color="$gray11">
              Hjälp oss anpassa din körkortsplan genom att svara på några frågor.
            </Text>

            <YStack space="$4" marginTop="$4">
              {/* Target License Date */}
              <YStack space="$2">
                <Text weight="bold">När vill du ta körkort?</Text>
                <Button
                  variant="outlined"
                  onPress={() => setShowDatePicker(true)}
                  icon={<Feather name="calendar" size={18} />}
                >
                  {targetDate ? targetDate.toLocaleDateString() : 'Välj datum'}
                </Button>

                {showDatePicker && (
                  <DateTimePicker
                    value={targetDate || new Date()}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                    themeVariant="dark"
                  />
                )}
              </YStack>

              {/* Theory Test */}
              <YStack space="$2">
                <Text weight="bold">Har du klarat teoriprovet?</Text>
                <XStack alignItems="center" space="$2">
                  <Switch checked={hasTheory} onCheckedChange={setHasTheory}>
                    <Switch.Thumb />
                  </Switch>
                  <Text>{hasTheory ? 'Ja' : 'Nej'}</Text>
                </XStack>
              </YStack>

              {/* Practice Test */}
              <YStack space="$2">
                <Text weight="bold">Har du klarat uppkörningen?</Text>
                <XStack alignItems="center" space="$2">
                  <Switch checked={hasPractice} onCheckedChange={setHasPractice}>
                    <Switch.Thumb />
                  </Switch>
                  <Text>{hasPractice ? 'Ja' : 'Nej'}</Text>
                </XStack>
              </YStack>

              {/* Previous Experience */}
              <YStack space="$2">
                <Text weight="bold">Tidigare körerfarenhet</Text>
                <TextArea
                  placeholder="Beskriv din tidigare körerfarenhet"
                  value={previousExperience}
                  onChangeText={setPreviousExperience}
                  minHeight={100}
                />
              </YStack>

              {/* Specific Goals */}
              <YStack space="$2">
                <Text weight="bold">Specifika mål</Text>
                <TextArea
                  placeholder="Har du specifika mål med ditt körkort?"
                  value={specificGoals}
                  onChangeText={setSpecificGoals}
                  minHeight={100}
                />
              </YStack>
            </YStack>

            <Button
              variant="primary"
              size="$4"
              marginTop="$6"
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Sparar...' : 'Spara körkortsplan'}
            </Button>
          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
