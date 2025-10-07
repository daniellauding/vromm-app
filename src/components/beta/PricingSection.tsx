import React, { useEffect, useState } from 'react';
import { Alert, TouchableOpacity } from 'react-native';
import { YStack, XStack, Text, Card, Input, Button } from 'tamagui';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Plan {
  id: 'free' | 'basic' | 'premium' | 'school' | 'custom';
  name: string;
  price: string;
}

const plans: Plan[] = [
  { id: 'free', name: 'Free', price: '0 SEK' },
  { id: 'basic', name: 'Basic', price: '99 SEK' },
  { id: 'premium', name: 'Premium', price: '199 SEK' },
  { id: 'school', name: 'School', price: '999 SEK' },
  { id: 'custom', name: 'Custom', price: 'Your Price' },
];

export const PricingSection: React.FC = () => {
  const [selectedPlan, setSelectedPlan] = useState<Plan['id'] | null>(null);
  const [customPrice, setCustomPrice] = useState('');
  const [priceMotivation, setPriceMotivation] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const savedPlan = await AsyncStorage.getItem('beta_selected_plan');
        const savedPrice = await AsyncStorage.getItem('beta_custom_price');
        const savedMotivation = await AsyncStorage.getItem('beta_price_motivation');
        const savedEmail = await AsyncStorage.getItem('beta_user_email');
        if (savedPlan) setSelectedPlan(savedPlan as Plan['id']);
        if (savedPrice) setCustomPrice(savedPrice);
        if (savedMotivation) setPriceMotivation(savedMotivation);
        if (savedEmail) setUserEmail(savedEmail);
      } catch {}
    })();
  }, []);

  const handlePlanSelect = async (planId: Plan['id']) => {
    setSelectedPlan(planId);
    await AsyncStorage.setItem('beta_selected_plan', planId);
  };

  const submit = async () => {
    try {
      await AsyncStorage.multiSet([
        ['beta_selected_plan', selectedPlan ?? ''],
        ['beta_custom_price', customPrice],
        ['beta_price_motivation', priceMotivation],
        ['beta_user_email', userEmail],
      ]);
      Alert.alert('Thanks!', 'Your pricing preference has been saved locally.');
    } catch {
      Alert.alert('Error', 'Could not save your input.');
    }
  };

  return (
    <YStack gap="$4">
      <Text fontSize="$6" fontWeight="700">
        Help Us Price Vromm
      </Text>

      <YStack gap="$3">
        {plans.map((plan) => (
          <TouchableOpacity key={plan.id} onPress={() => handlePlanSelect(plan.id)}>
            <Card padding="$3" bordered>
              <XStack justifyContent="space-between" alignItems="center">
                <YStack>
                  <Text fontWeight="600">{plan.name}</Text>
                  <Text color="$gray11">{plan.price}/month</Text>
                </YStack>
                <Text>{selectedPlan === plan.id ? '✓' : ''}</Text>
              </XStack>
            </Card>
          </TouchableOpacity>
        ))}
      </YStack>

      {selectedPlan === 'custom' && (
        <YStack gap="$2">
          <Text>Your suggested price (SEK/month):</Text>
          <Input
            value={customPrice}
            onChangeText={setCustomPrice}
            keyboardType="numeric"
            placeholder="99"
          />
          <Input
            value={priceMotivation}
            onChangeText={setPriceMotivation}
            placeholder="What motivates this price?"
            multiline
          />
        </YStack>
      )}

      <YStack gap="$2">
        <Text>Email (optional):</Text>
        <Input
          value={userEmail}
          onChangeText={setUserEmail}
          keyboardType="email-address"
          placeholder="your@email.com"
        />
      </YStack>

      <Button onPress={submit} disabled={!selectedPlan}>
        Submit
      </Button>
    </YStack>
  );
};

export default PricingSection;
