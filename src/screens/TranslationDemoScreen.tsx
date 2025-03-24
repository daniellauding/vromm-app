import React, { useState, useEffect, useCallback } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet } from 'react-native';
import { Button, Card, Input, Select, XStack, YStack } from 'tamagui';
import { useTranslation } from '../contexts/TranslationContext';
import { Text } from '../components/Text';
import { supabase } from '../lib/supabase';
import { Feather } from '@expo/vector-icons';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';

// Types
interface Translation {
  id?: string;
  key: string;
  language: string;
  value: string;
  platform?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const TranslationDemoScreen = () => {
  const { language, setLanguage, refreshTranslations } = useTranslation();
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTranslation, setEditingTranslation] = useState<Translation | null>(null);
  const [newValue, setNewValue] = useState('');
  const [filterLanguage, setFilterLanguage] = useState<string | null>(null);
  const [showAddNew, setShowAddNew] = useState(false);
  const [newTranslation, setNewTranslation] = useState<Partial<Translation>>({
    key: '',
    language: language,
    value: '',
    platform: null
  });

  // Load all translations
  const loadTranslations = useCallback(async () => {
    try {
      setLoading(true);

      let query = supabase.from('translations').select('*');

      if (filterLanguage) {
        query = query.eq('language', filterLanguage);
      }

      const { data, error } = await query.order('key');

      if (error) {
        throw error;
      }

      setTranslations(data || []);
    } catch (error) {
      console.error('Error loading translations:', error);
      Alert.alert('Error', 'Failed to load translations');
    } finally {
      setLoading(false);
    }
  }, [filterLanguage]);

  useEffect(() => {
    loadTranslations();
  }, [loadTranslations]);

  // Save edited translation
  const saveTranslation = async (translation: Translation) => {
    try {
      setSaving(true);

      if (!newValue.trim()) {
        Alert.alert('Error', 'Translation value cannot be empty');
        return;
      }

      const { error } = await supabase
        .from('translations')
        .update({ value: newValue })
        .eq('id', translation.id);

      if (error) {
        throw error;
      }

      // Update local state
      setTranslations(prev =>
        prev.map(t => (t.id === translation.id ? { ...t, value: newValue } : t))
      );

      setEditingTranslation(null);
      setNewValue('');

      // Force refresh app translations
      await refreshTranslations();

      Alert.alert('Success', 'Translation updated successfully');
    } catch (error) {
      console.error('Error saving translation:', error);
      Alert.alert('Error', 'Failed to save translation');
    } finally {
      setSaving(false);
    }
  };

  // Create new translation
  const createTranslation = async () => {
    try {
      setSaving(true);

      if (
        !newTranslation.key?.trim() ||
        !newTranslation.value?.trim() ||
        !newTranslation.language
      ) {
        Alert.alert('Error', 'Key, language and value are required');
        return;
      }

      // Check if translation already exists
      const { data: existing } = await supabase
        .from('translations')
        .select('id')
        .eq('key', newTranslation.key)
        .eq('language', newTranslation.language);

      if (existing && existing.length > 0) {
        Alert.alert('Error', 'A translation with this key and language already exists');
        return;
      }

      const { data, error } = await supabase.from('translations').insert([newTranslation]).select();

      if (error) {
        throw error;
      }

      // Add to local state
      if (data) {
        setTranslations(prev => [...prev, data[0]]);
      }

      // Reset form
      setNewTranslation({
        key: '',
        language: language,
        value: '',
        platform: null
      });

      setShowAddNew(false);

      // Force refresh app translations
      await refreshTranslations();

      Alert.alert('Success', 'New translation created');
    } catch (error) {
      console.error('Error creating translation:', error);
      Alert.alert('Error', 'Failed to create translation');
    } finally {
      setSaving(false);
    }
  };

  // Delete translation
  const deleteTranslation = async (translation: Translation) => {
    try {
      Alert.alert(
        'Confirm Delete',
        `Are you sure you want to delete the translation for "${translation.key}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              setSaving(true);

              const { error } = await supabase
                .from('translations')
                .delete()
                .eq('id', translation.id);

              if (error) {
                throw error;
              }

              // Update local state
              setTranslations(prev => prev.filter(t => t.id !== translation.id));

              // Force refresh app translations
              await refreshTranslations();

              Alert.alert('Success', 'Translation deleted');
              setSaving(false);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error deleting translation:', error);
      Alert.alert('Error', 'Failed to delete translation');
      setSaving(false);
    }
  };

  // Filter translations by search query
  const filteredTranslations = translations.filter(
    t =>
      t.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.value.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Screen scroll={false}>
      <YStack f={1}>
        <Header
          title="Translation Admin"
          subtitle="Manage translations for your app"
          rightElement={
            <Button
              size="$3"
              chromeless
              circular
              icon={<Feather name="refresh-cw" size={20} color="$color" />}
              onPress={loadTranslations}
              disabled={loading}
            />
          }
        />

        <YStack f={1} px="$4" py="$4" space="$4">
          {/* Language Selector */}
          <Card bordered padding="$3">
            <YStack space="$2">
              <Text weight="bold">Current App Language</Text>
              <XStack space="$2">
                <Button
                  theme={language === 'en' ? 'active' : 'gray'}
                  onPress={() => setLanguage('en')}
                  flex={1}
                >
                  English
                </Button>
                <Button
                  theme={language === 'sv' ? 'active' : 'gray'}
                  onPress={() => setLanguage('sv')}
                  flex={1}
                >
                  Swedish
                </Button>
              </XStack>
            </YStack>
          </Card>

          {/* Search and Filter */}
          <XStack space="$2" alignItems="center">
            <Input
              flex={1}
              placeholder="Search translations..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              leftElement={
                <Feather name="search" size={18} color="gray" style={{ marginLeft: 8 }} />
              }
            />

            <Select
              value={filterLanguage || ''}
              onValueChange={val => setFilterLanguage(val || null)}
              placeholder="All languages"
            >
              <Select.Trigger width={130}>
                <Select.Value placeholder="Language" />
              </Select.Trigger>

              <Select.Content>
                <Select.Item index={0} value="">
                  All
                </Select.Item>
                <Select.Item index={1} value="en">
                  English
                </Select.Item>
                <Select.Item index={2} value="sv">
                  Swedish
                </Select.Item>
              </Select.Content>
            </Select>
          </XStack>

          {/* Add New Translation Button */}
          <Button
            onPress={() => setShowAddNew(!showAddNew)}
            icon={<Feather name={showAddNew ? 'minus' : 'plus'} size={18} color="white" />}
            backgroundColor="$blue10"
          >
            {showAddNew ? 'Cancel' : 'Add New Translation'}
          </Button>

          {/* Add New Translation Form */}
          {showAddNew && (
            <YStack backgroundColor="$backgroundHover" borderRadius="$4" padding="$4" space="$3">
              <Text weight="bold" size="lg">
                Add New Translation
              </Text>

              <YStack space="$2">
                <Text>Key (e.g. "auth.signIn.title")</Text>
                <Input
                  placeholder="Translation key"
                  value={newTranslation.key}
                  onChangeText={text => setNewTranslation(prev => ({ ...prev, key: text }))}
                />
              </YStack>

              <YStack space="$2">
                <Text>Language</Text>
                <Select
                  value={newTranslation.language || 'en'}
                  onValueChange={val => setNewTranslation(prev => ({ ...prev, language: val }))}
                >
                  <Select.Trigger>
                    <Select.Value placeholder="Language" />
                  </Select.Trigger>

                  <Select.Content>
                    <Select.Item index={0} value="en">
                      English
                    </Select.Item>
                    <Select.Item index={1} value="sv">
                      Swedish
                    </Select.Item>
                  </Select.Content>
                </Select>
              </YStack>

              <YStack space="$2">
                <Text>Translation Value</Text>
                <Input
                  placeholder="Translation value"
                  value={newTranslation.value}
                  onChangeText={text => setNewTranslation(prev => ({ ...prev, value: text }))}
                  multiline
                  numberOfLines={3}
                />
              </YStack>

              <YStack space="$2">
                <Text>Platform (optional)</Text>
                <Select
                  value={newTranslation.platform || ''}
                  onValueChange={val =>
                    setNewTranslation(prev => ({
                      ...prev,
                      platform: val === '' ? null : val
                    }))
                  }
                >
                  <Select.Trigger>
                    <Select.Value placeholder="Platform (optional)" />
                  </Select.Trigger>

                  <Select.Content>
                    <Select.Item index={0} value="">
                      All Platforms
                    </Select.Item>
                    <Select.Item index={1} value="web">
                      Web Only
                    </Select.Item>
                    <Select.Item index={2} value="mobile">
                      Mobile Only
                    </Select.Item>
                  </Select.Content>
                </Select>
              </YStack>

              <Button
                onPress={createTranslation}
                disabled={saving}
                backgroundColor="$green10"
                marginTop="$2"
              >
                {saving ? 'Creating...' : 'Create Translation'}
              </Button>
            </YStack>
          )}

          {/* Translation List */}
          {loading ? (
            <YStack f={1} justifyContent="center" alignItems="center">
              <ActivityIndicator size="large" />
              <Text marginTop="$4">Loading translations...</Text>
            </YStack>
          ) : (
            <>
              <Text size="sm" opacity={0.7}>
                {filteredTranslations.length} translations found
              </Text>

              <ScrollView style={{ flex: 1 }}>
                <YStack space="$3">
                  {filteredTranslations.map(translation => (
                    <YStack
                      key={translation.id}
                      backgroundColor="$backgroundHover"
                      borderRadius="$4"
                      padding="$3"
                      space="$2"
                    >
                      <XStack justifyContent="space-between" alignItems="center">
                        <Text weight="bold" numberOfLines={1} ellipsizeMode="middle" maxWidth={200}>
                          {translation.key}
                        </Text>
                        <Text size="xs" opacity={0.5}>
                          {translation.language.toUpperCase()}
                          {translation.platform && ` (${translation.platform})`}
                        </Text>
                      </XStack>

                      {editingTranslation?.id === translation.id ? (
                        <YStack space="$2">
                          <Input
                            value={newValue}
                            onChangeText={setNewValue}
                            multiline
                            numberOfLines={4}
                            autoFocus
                          />

                          <XStack space="$2">
                            <Button
                              flex={1}
                              onPress={() => {
                                setEditingTranslation(null);
                                setNewValue('');
                              }}
                              backgroundColor="$gray10"
                            >
                              Cancel
                            </Button>
                            <Button
                              flex={1}
                              onPress={() => saveTranslation(translation)}
                              disabled={saving}
                              backgroundColor="$blue10"
                            >
                              {saving ? 'Saving...' : 'Save'}
                            </Button>
                          </XStack>
                        </YStack>
                      ) : (
                        <>
                          <Text>{translation.value}</Text>

                          <XStack space="$2" marginTop="$1">
                            <Button
                              size="$2"
                              onPress={() => {
                                setEditingTranslation(translation);
                                setNewValue(translation.value);
                              }}
                              icon={<Feather name="edit" size={16} color="white" />}
                              backgroundColor="$blue10"
                              flex={1}
                            >
                              Edit
                            </Button>
                            <Button
                              size="$2"
                              onPress={() => deleteTranslation(translation)}
                              icon={<Feather name="trash-2" size={16} color="white" />}
                              backgroundColor="$red10"
                              flex={1}
                            >
                              Delete
                            </Button>
                          </XStack>
                        </>
                      )}
                    </YStack>
                  ))}
                </YStack>
              </ScrollView>
            </>
          )}
        </YStack>
      </YStack>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  translationRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  key: {
    flex: 0.4,
    fontWeight: 'bold'
  },
  value: {
    flex: 0.6
  }
});
