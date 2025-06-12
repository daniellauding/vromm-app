import React from 'react';
import { YStack, Button } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { NavigationProp } from '../types/navigation';
import { Header } from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { View, Alert, TextInput, Modal, Pressable } from 'react-native';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { Feather } from '@expo/vector-icons';

type UserRole = Database['public']['Enums']['user_role'];

// Add type assertion to handle role_confirmed
type TypedProfile = Database['public']['Tables']['profiles']['Row'] & {
  role_confirmed?: boolean;
};

export function RoleSelectionScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, profile: rawProfile, refreshProfile } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [showOrgNumberModal, setShowOrgNumberModal] = React.useState(false);
  const [orgNumber, setOrgNumber] = React.useState('');
  const [selectedRole, setSelectedRole] = React.useState<UserRole | null>(null);

  // Type assertion for role_confirmed
  const profile = rawProfile as TypedProfile;

  // The available role options
  const roles: { id: UserRole; title: string; description: string; icon: string }[] = [
    {
      id: 'student',
      title: 'Student',
      description: 'Jag vill ta körkort och lära mig köra',
      icon: 'user',
    },
    {
      id: 'instructor',
      title: 'Handledare/Lärare',
      description: 'Jag lär ut och handleder elever',
      icon: 'users',
    },
    {
      id: 'school',
      title: 'Trafikskola',
      description: 'Jag representerar en trafikskola',
      icon: 'home',
    },
    {
      id: 'admin',
      title: 'Admin',
      description: 'Jag administrerar systemet',
      icon: 'settings',
    },
  ];

  const handleRoleSelect = async (role: UserRole) => {
    if (!user) return;

    // If role is 'school', prompt for organization number
    if (role === 'school') {
      setSelectedRole(role);
      setShowOrgNumberModal(true);
      return;
    }

    try {
      setLoading(true);

      // Update the profile with the selected role and mark as confirmed
      const { error } = await supabase
        .from('profiles')
        .update({
          role: role,
          role_confirmed: true,
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error saving role selection:', error);
        Alert.alert('Error', 'Could not update your role. Please try again later.');
      } else {
        // Refresh the profile to get the updated data
        await refreshProfile();

        // Navigate back
        navigation.goBack();
      }
    } catch (err) {
      console.error('Error saving role selection:', err);
      Alert.alert('Error', 'Could not update your role. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitOrgNumber = async () => {
    if (!selectedRole || !user) return;

    try {
      setLoading(true);

      // Update the profile with the selected role, organization number, and mark as confirmed
      const { error } = await supabase
        .from('profiles')
        .update({
          role: selectedRole,
          role_confirmed: true,
          organization_number: orgNumber,
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error saving role selection with org number:', error);
        Alert.alert('Error', 'Could not update your role. Please try again later.');
      } else {
        // Refresh the profile to get the updated data
        await refreshProfile();

        // Close modal and navigate back
        setShowOrgNumberModal(false);
        navigation.goBack();
      }
    } catch (err) {
      console.error('Error saving role selection with org number:', err);
      Alert.alert('Error', 'Could not update your role. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Header title="Välj din roll" showBack />

      <YStack padding="$4" space="$4">
        <Text size="xl" weight="bold">
          Vad beskriver dig bäst?
        </Text>

        <YStack flexDirection="row" alignItems="center" gap="$2" marginTop="$1">
          <Text color="$gray11">Status:</Text>
          <View
            style={{
              backgroundColor: profile?.role_confirmed ? '#00E6C3' : '#4B6BFF',
              borderRadius: 12,
              paddingHorizontal: 8,
              paddingVertical: 4,
            }}
          >
            <Text fontSize={12} color={profile?.role_confirmed ? '#000' : '#fff'} fontWeight="bold">
              {profile?.role_confirmed ? '100% KLART' : '0% ATT GÖRA'}
            </Text>
          </View>
        </YStack>

        <Text color="$gray11" marginTop="$2">
          Välj den roll som passar dig bäst. Detta hjälper oss att anpassa applikationen efter dina
          behov.
        </Text>

        <YStack space="$4" marginTop="$4">
          {roles.map((roleOption) => {
            const isSelected = profile?.role === roleOption.id;
            return (
              <Button
                key={roleOption.id}
                variant={isSelected ? 'primary' : 'secondary'}
                size="$4"
                onPress={() => handleRoleSelect(roleOption.id)}
                disabled={loading}
                height={90}
                justifyContent="flex-start"
                alignItems="center"
                padding="$4"
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: isSelected ? '#00E6C3' : '#E5E5E5',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 16,
                    }}
                  >
                    <Feather
                      name={roleOption.icon}
                      size={24}
                      color={isSelected ? '#000' : '#555'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text weight="bold" size="lg">
                      {roleOption.title}
                    </Text>
                    <Text color="$gray11" size="sm">
                      {roleOption.description}
                    </Text>
                  </View>
                  {isSelected && (
                    <View
                      style={{
                        backgroundColor: '#00E6C3',
                        borderRadius: 12,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        marginLeft: 8,
                      }}
                    >
                      <Text fontSize={10} color="#000" fontWeight="bold">
                        VALD
                      </Text>
                    </View>
                  )}
                </View>
              </Button>
            );
          })}
        </YStack>

        <Text color="$gray11" marginTop="$4" textAlign="center">
          Du kan alltid ändra din roll senare i din profil
        </Text>
      </YStack>

      {/* Organization Number Modal */}
      <Modal
        visible={showOrgNumberModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOrgNumberModal(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => setShowOrgNumberModal(false)}
        >
          <Pressable
            style={{
              width: '80%',
              backgroundColor: '#fff',
              padding: 20,
              borderRadius: 10,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text weight="bold" size="xl" marginBottom="$2">
              Organisation
            </Text>
            <Text marginBottom="$4">
              När du väljer rollen Trafikskola behöver du ange organisationsnummer.
            </Text>

            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#ccc',
                padding: 10,
                borderRadius: 5,
                marginBottom: 15,
              }}
              placeholder="Organisationsnummer"
              value={orgNumber}
              onChangeText={setOrgNumber}
              keyboardType="number-pad"
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Button
                variant="secondary"
                size="$4"
                onPress={() => setShowOrgNumberModal(false)}
                disabled={loading}
                width="48%"
              >
                Avbryt
              </Button>
              <Button
                variant="primary"
                size="$4"
                onPress={handleSubmitOrgNumber}
                disabled={loading || !orgNumber.trim()}
                width="48%"
              >
                Spara
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}
