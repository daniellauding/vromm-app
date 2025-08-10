import React, { useState } from 'react';
import { Alert, TouchableOpacity } from 'react-native';
import { YStack, XStack, Text, Input, Button } from 'tamagui';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const FeedbackSection: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const save = async () => {
    if (!name || !comment || rating === 0) {
      Alert.alert('Missing info', 'Please provide your name, rating and a comment.');
      return;
    }
    try {
      const payload = { name, email, rating, comment, createdAt: Date.now() };
      const current = await AsyncStorage.getItem('beta_feedback_local');
      const list = current ? JSON.parse(current) : [];
      list.push(payload);
      await AsyncStorage.setItem('beta_feedback_local', JSON.stringify(list));
      Alert.alert('Thanks!', 'Your feedback has been saved locally.');
      setName('');
      setEmail('');
      setRating(0);
      setComment('');
    } catch {
      Alert.alert('Error', 'Could not save feedback.');
    }
  };

  return (
    <YStack gap="$4">
      <Text fontSize="$6" fontWeight="700">Share Your Feedback</Text>

      <Input placeholder="Your name" value={name} onChangeText={setName} />
      <Input placeholder="Email (optional)" value={email} onChangeText={setEmail} keyboardType="email-address" />

      <XStack gap="$2" alignItems="center">
        <Text>Rating:</Text>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => setRating(star)}>
            <Text fontSize={24}>{star <= rating ? '★' : '☆'}</Text>
          </TouchableOpacity>
        ))}
      </XStack>

      <Input
        placeholder="Share your thoughts..."
        value={comment}
        onChangeText={setComment}
        multiline
      />

      <Button onPress={save} disabled={!name || !comment || rating === 0}>Submit</Button>
    </YStack>
  );
};

export default FeedbackSection; 