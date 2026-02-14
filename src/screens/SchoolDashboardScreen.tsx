import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshControl,
  Alert,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  Platform,
} from 'react-native';
import { YStack, XStack, Text, Spinner, Switch } from 'tamagui';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { DashboardStatCard } from '../components/DashboardStatCard';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import { RootStackNavigationProp } from '../types/navigation';
import { useTranslation } from '../contexts/TranslationContext';
import { useThemePreference } from '../hooks/useThemeOverride';
import { Button } from '../components/Button';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type School = {
  id: string;
  name: string;
  description: string | null;
  contact_email: string | null;
  phone: string | null;
  location: string | null;
  logo_url: string | null;
  is_active: boolean | null;
};

type StudentMember = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: string;
};

type SchoolRoute = {
  id: string;
  route_id: string;
  route_name: string;
  route_description: string | null;
};

type SearchRouteResult = {
  id: string;
  name: string;
  description: string | null;
};

type TabKey = 'info' | 'students' | 'routes';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SchoolDashboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<RootStackNavigationProp>();
  const { t } = useTranslation();
  const { effectiveTheme } = useThemePreference();
  const isDark = effectiveTheme === 'dark';

  // Tab state
  const [activeTab, setActiveTab] = useState<TabKey>('info');

  // School state
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state (mirrors school fields for editing)
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formLocation, setFormLocation] = useState('');

  // Logo
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Students
  const [students, setStudents] = useState<StudentMember[]>([]);

  // Routes
  const [schoolRoutes, setSchoolRoutes] = useState<SchoolRoute[]>([]);
  const [routeSearchQuery, setRouteSearchQuery] = useState('');
  const [routeSearchResults, setRouteSearchResults] = useState<SearchRouteResult[]>([]);
  const [searchingRoutes, setSearchingRoutes] = useState(false);
  const [addingRoute, setAddingRoute] = useState<string | null>(null);
  const [removingRoute, setRemovingRoute] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  const loadSchool = useCallback(async () => {
    if (!user?.id) return;
    try {
      // Find the school where the current user is admin or owner
      const { data: memberships, error: memError } = await supabase
        .from('school_memberships')
        .select('school_id, role')
        .eq('user_id', user.id)
        .in('role', ['admin', 'school']);

      if (memError) throw memError;

      if (!memberships || memberships.length === 0) {
        setError(t('school.noSchoolFound') || 'No school found for your account.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const schoolId = memberships[0].school_id;
      if (!schoolId) {
        setError(t('school.noSchoolFound') || 'No school found for your account.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('id, name, description, contact_email, phone, location, logo_url, is_active')
        .eq('id', schoolId)
        .single();

      if (schoolError) throw schoolError;

      setSchool(schoolData);
      setFormName(schoolData.name || '');
      setFormDescription(schoolData.description || '');
      setFormEmail(schoolData.contact_email || '');
      setFormPhone(schoolData.phone || '');
      setFormLocation(schoolData.location || '');
      setError(null);
    } catch (err) {
      console.error('Error loading school:', err);
      setError(t('school.loadError') || 'Failed to load school data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, t]);

  const loadStudents = useCallback(async () => {
    if (!school?.id) return;
    try {
      const { data, error: studErr } = await supabase
        .from('school_memberships')
        .select(`
          id,
          user_id,
          role,
          profiles:user_id (
            id, full_name, email, avatar_url
          )
        `)
        .eq('school_id', school.id);

      if (studErr) throw studErr;

      const mapped: StudentMember[] = (data || [])
        .filter((m: any) => m.profiles)
        .map((m: any) => ({
          id: m.id,
          user_id: m.user_id || m.profiles?.id,
          full_name: m.profiles?.full_name || 'Unknown',
          email: m.profiles?.email || '',
          avatar_url: m.profiles?.avatar_url || null,
          role: m.role,
        }));

      setStudents(mapped);
    } catch (err) {
      console.error('Error loading students:', err);
    }
  }, [school?.id]);

  const loadSchoolRoutes = useCallback(async () => {
    if (!school?.id) return;
    try {
      const { data, error: routeErr } = await supabase
        .from('school_routes')
        .select(`
          id,
          route_id,
          routes:route_id (
            id, name, description
          )
        `)
        .eq('school_id', school.id);

      if (routeErr) throw routeErr;

      const mapped: SchoolRoute[] = (data || [])
        .filter((sr: any) => sr.routes)
        .map((sr: any) => ({
          id: sr.id,
          route_id: sr.route_id,
          route_name: (sr.routes as any)?.name || 'Unnamed Route',
          route_description: (sr.routes as any)?.description || null,
        }));

      setSchoolRoutes(mapped);
    } catch (err) {
      console.error('Error loading school routes:', err);
    }
  }, [school?.id]);

  // Initial load
  useEffect(() => {
    loadSchool();
  }, [loadSchool]);

  // Load tab-specific data when school or tab changes
  useEffect(() => {
    if (!school) return;
    if (activeTab === 'students') loadStudents();
    if (activeTab === 'routes') loadSchoolRoutes();
  }, [school, activeTab, loadStudents, loadSchoolRoutes]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSchool().then(() => {
      if (activeTab === 'students') loadStudents();
      if (activeTab === 'routes') loadSchoolRoutes();
    });
  };

  // ---------------------------------------------------------------------------
  // School info save
  // ---------------------------------------------------------------------------

  const handleSaveInfo = async () => {
    if (!school?.id) return;
    setSaving(true);
    try {
      const { error: updateErr } = await supabase
        .from('schools')
        .update({
          name: formName,
          description: formDescription || null,
          contact_email: formEmail || null,
          phone: formPhone || null,
          location: formLocation || null,
        })
        .eq('id', school.id);

      if (updateErr) throw updateErr;

      setSchool((prev) =>
        prev
          ? {
              ...prev,
              name: formName,
              description: formDescription || null,
              contact_email: formEmail || null,
              phone: formPhone || null,
              location: formLocation || null,
            }
          : prev,
      );

      Alert.alert(t('common.success') || 'Success', t('school.infoSaved') || 'School info saved.');
    } catch (err) {
      console.error('Error saving school info:', err);
      Alert.alert(t('common.error') || 'Error', t('school.saveFailed') || 'Failed to save school info.');
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Logo upload
  // ---------------------------------------------------------------------------

  const handleLogoUpload = async () => {
    if (!school?.id) return;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('common.error') || 'Error',
          t('school.permissionNeeded') || 'Media library permission is required.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      setUploadingLogo(true);
      const asset = result.assets[0];

      // Convert to base64
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64data = reader.result as string;
          resolve(base64data.split(',')[1]);
        };
        reader.onerror = () => reject(new Error('Failed to process image'));
        reader.readAsDataURL(blob);
      });

      const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `school-logos/${school.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, decode(base64), {
          contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(fileName);

      // Update school record
      const { error: updateErr } = await supabase
        .from('schools')
        .update({ logo_url: publicUrl })
        .eq('id', school.id);

      if (updateErr) throw updateErr;

      setSchool((prev) => (prev ? { ...prev, logo_url: publicUrl } : prev));
      Alert.alert(t('common.success') || 'Success', t('school.logoUploaded') || 'Logo uploaded.');
    } catch (err) {
      console.error('Error uploading logo:', err);
      Alert.alert(t('common.error') || 'Error', t('school.logoFailed') || 'Failed to upload logo.');
    } finally {
      setUploadingLogo(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Show on Map toggle
  // ---------------------------------------------------------------------------

  const handleToggleActive = async (checked: boolean) => {
    if (!school?.id) return;
    try {
      const { error: updateErr } = await supabase
        .from('schools')
        .update({ is_active: checked })
        .eq('id', school.id);

      if (updateErr) throw updateErr;
      setSchool((prev) => (prev ? { ...prev, is_active: checked } : prev));
    } catch (err) {
      console.error('Error toggling active:', err);
      Alert.alert(t('common.error') || 'Error', t('school.toggleFailed') || 'Failed to update visibility.');
    }
  };

  // ---------------------------------------------------------------------------
  // Route library helpers
  // ---------------------------------------------------------------------------

  const handleRouteSearch = async (query: string) => {
    setRouteSearchQuery(query);
    if (query.trim().length < 2) {
      setRouteSearchResults([]);
      return;
    }

    setSearchingRoutes(true);
    try {
      const { data, error: searchErr } = await supabase
        .from('routes')
        .select('id, name, description')
        .ilike('name', `%${query.trim()}%`)
        .eq('is_public', true)
        .limit(20);

      if (searchErr) throw searchErr;

      // Filter out routes already linked to this school
      const linkedIds = new Set(schoolRoutes.map((sr) => sr.route_id));
      setRouteSearchResults((data || []).filter((r: any) => !linkedIds.has(r.id)));
    } catch (err) {
      console.error('Error searching routes:', err);
    } finally {
      setSearchingRoutes(false);
    }
  };

  const handleAddRoute = async (routeId: string) => {
    if (!school?.id) return;
    setAddingRoute(routeId);
    try {
      const { error: insertErr } = await supabase.from('school_routes').insert({
        school_id: school.id,
        route_id: routeId,
      });

      if (insertErr) throw insertErr;

      // Refresh data
      await loadSchoolRoutes();
      // Remove from search results
      setRouteSearchResults((prev) => prev.filter((r) => r.id !== routeId));
    } catch (err) {
      console.error('Error adding route:', err);
      Alert.alert(t('common.error') || 'Error', t('school.addRouteFailed') || 'Failed to add route.');
    } finally {
      setAddingRoute(null);
    }
  };

  const handleRemoveRoute = async (schoolRouteId: string) => {
    setRemovingRoute(schoolRouteId);
    try {
      const { error: delErr } = await supabase
        .from('school_routes')
        .delete()
        .eq('id', schoolRouteId);

      if (delErr) throw delErr;

      setSchoolRoutes((prev) => prev.filter((sr) => sr.id !== schoolRouteId));
    } catch (err) {
      console.error('Error removing route:', err);
      Alert.alert(t('common.error') || 'Error', t('school.removeRouteFailed') || 'Failed to remove route.');
    } finally {
      setRemovingRoute(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Shared styles
  // ---------------------------------------------------------------------------

  const cardBg = isDark ? '#1A1A1A' : '#FFF';
  const cardBorder = isDark ? '#333' : '#E5E5E5';
  const inputBg = isDark ? '#2A2A2A' : '#F5F5F5';
  const inputColor = isDark ? '#FFF' : '#000';
  const inputBorder = isDark ? '#444' : '#E5E5E5';
  const placeholderColor = isDark ? '#666' : '#AAA';
  const textPrimary = isDark ? '#FFF' : '#000';
  const textSecondary = isDark ? '#AAA' : '#666';
  const textMuted = isDark ? '#666' : '#999';

  // ---------------------------------------------------------------------------
  // Tab bar
  // ---------------------------------------------------------------------------

  const tabs: { key: TabKey; label: string; icon: keyof typeof Feather.glyphMap }[] = [
    { key: 'info', label: t('school.tabInfo') || 'Info', icon: 'info' },
    { key: 'students', label: t('school.tabStudents') || 'Students', icon: 'users' },
    { key: 'routes', label: t('school.tabRoutes') || 'Routes', icon: 'map' },
  ];

  const renderTabBar = () => (
    <XStack gap="$2" marginBottom="$3">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: isActive ? '#00E6C3' : isDark ? '#333' : '#E5E5E5',
            }}
          >
            <Feather
              name={tab.icon}
              size={16}
              color={isActive ? '#000' : isDark ? '#FFF' : '#333'}
            />
            <Text
              fontSize="$3"
              fontWeight={isActive ? 'bold' : 'normal'}
              color={isActive ? '#000' : isDark ? '#FFF' : '#333'}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </XStack>
  );

  // ---------------------------------------------------------------------------
  // Renderers: Info tab
  // ---------------------------------------------------------------------------

  const renderInfoTab = () => (
    <YStack gap="$3">
      {/* Logo */}
      <YStack
        backgroundColor={cardBg}
        borderRadius="$4"
        padding="$4"
        borderWidth={1}
        borderColor={cardBorder}
        alignItems="center"
        gap="$3"
      >
        {school?.logo_url ? (
          <Image
            source={{ uri: school.logo_url }}
            style={{ width: 100, height: 100, borderRadius: 50 }}
          />
        ) : (
          <YStack
            width={100}
            height={100}
            borderRadius={50}
            backgroundColor={isDark ? '#333' : '#E5E5E5'}
            justifyContent="center"
            alignItems="center"
          >
            <Feather name="image" size={36} color={textMuted} />
          </YStack>
        )}

        <TouchableOpacity
          onPress={handleLogoUpload}
          disabled={uploadingLogo}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            backgroundColor: isDark ? '#333' : '#E5E5E5',
            opacity: uploadingLogo ? 0.6 : 1,
          }}
        >
          {uploadingLogo ? (
            <Spinner size="small" color="#00E6C3" />
          ) : (
            <Feather name="upload" size={16} color={textPrimary} />
          )}
          <Text fontSize="$3" color={textPrimary}>
            {uploadingLogo
              ? t('school.uploading') || 'Uploading...'
              : t('school.uploadLogo') || 'Upload Logo'}
          </Text>
        </TouchableOpacity>
      </YStack>

      {/* Form fields */}
      <YStack
        backgroundColor={cardBg}
        borderRadius="$4"
        padding="$4"
        borderWidth={1}
        borderColor={cardBorder}
        gap="$3"
      >
        {/* Name */}
        <YStack gap="$1">
          <Text fontSize="$2" fontWeight="600" color={textSecondary}>
            {t('school.name') || 'School Name'}
          </Text>
          <TextInput
            value={formName}
            onChangeText={setFormName}
            placeholder={t('school.namePlaceholder') || 'Enter school name'}
            placeholderTextColor={placeholderColor}
            style={{
              backgroundColor: inputBg,
              color: inputColor,
              borderRadius: 12,
              padding: 12,
              fontSize: 14,
              borderWidth: 1,
              borderColor: inputBorder,
            }}
          />
        </YStack>

        {/* Description */}
        <YStack gap="$1">
          <Text fontSize="$2" fontWeight="600" color={textSecondary}>
            {t('school.description') || 'Description'}
          </Text>
          <TextInput
            value={formDescription}
            onChangeText={setFormDescription}
            placeholder={t('school.descriptionPlaceholder') || 'Describe your school'}
            placeholderTextColor={placeholderColor}
            multiline
            numberOfLines={3}
            style={{
              backgroundColor: inputBg,
              color: inputColor,
              borderRadius: 12,
              padding: 12,
              fontSize: 14,
              minHeight: 80,
              textAlignVertical: 'top',
              borderWidth: 1,
              borderColor: inputBorder,
            }}
          />
        </YStack>

        {/* Email */}
        <YStack gap="$1">
          <Text fontSize="$2" fontWeight="600" color={textSecondary}>
            {t('school.contactEmail') || 'Contact Email'}
          </Text>
          <TextInput
            value={formEmail}
            onChangeText={setFormEmail}
            placeholder={t('school.emailPlaceholder') || 'contact@school.com'}
            placeholderTextColor={placeholderColor}
            keyboardType="email-address"
            autoCapitalize="none"
            style={{
              backgroundColor: inputBg,
              color: inputColor,
              borderRadius: 12,
              padding: 12,
              fontSize: 14,
              borderWidth: 1,
              borderColor: inputBorder,
            }}
          />
        </YStack>

        {/* Phone */}
        <YStack gap="$1">
          <Text fontSize="$2" fontWeight="600" color={textSecondary}>
            {t('school.phone') || 'Phone'}
          </Text>
          <TextInput
            value={formPhone}
            onChangeText={setFormPhone}
            placeholder={t('school.phonePlaceholder') || '+46 70 123 4567'}
            placeholderTextColor={placeholderColor}
            keyboardType="phone-pad"
            style={{
              backgroundColor: inputBg,
              color: inputColor,
              borderRadius: 12,
              padding: 12,
              fontSize: 14,
              borderWidth: 1,
              borderColor: inputBorder,
            }}
          />
        </YStack>

        {/* Location */}
        <YStack gap="$1">
          <Text fontSize="$2" fontWeight="600" color={textSecondary}>
            {t('school.location') || 'Location'}
          </Text>
          <TextInput
            value={formLocation}
            onChangeText={setFormLocation}
            placeholder={t('school.locationPlaceholder') || 'City, Country'}
            placeholderTextColor={placeholderColor}
            style={{
              backgroundColor: inputBg,
              color: inputColor,
              borderRadius: 12,
              padding: 12,
              fontSize: 14,
              borderWidth: 1,
              borderColor: inputBorder,
            }}
          />
        </YStack>

        {/* Save button */}
        <TouchableOpacity
          onPress={handleSaveInfo}
          disabled={saving}
          style={{
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: 'center',
            backgroundColor: '#00E6C3',
            opacity: saving ? 0.6 : 1,
          }}
        >
          <Text fontSize="$4" fontWeight="bold" color="#000">
            {saving ? t('common.saving') || 'Saving...' : t('common.save') || 'Save'}
          </Text>
        </TouchableOpacity>
      </YStack>

      {/* Show on Map toggle */}
      <YStack
        backgroundColor={cardBg}
        borderRadius="$4"
        padding="$4"
        borderWidth={1}
        borderColor={cardBorder}
      >
        <XStack alignItems="center" justifyContent="space-between">
          <YStack flex={1} marginRight="$3">
            <Text fontSize="$4" fontWeight="600" color={textPrimary}>
              {t('school.showOnMap') || 'Show on Map'}
            </Text>
            <Text fontSize="$2" color={textSecondary}>
              {t('school.showOnMapDescription') || 'Make your school visible on the public map.'}
            </Text>
          </YStack>
          <Switch
            size="$4"
            checked={school?.is_active ?? false}
            onCheckedChange={handleToggleActive}
            backgroundColor={school?.is_active ? '$switchActive' : '$switchInactive'}
          >
            <Switch.Thumb backgroundColor="$switchThumb" />
          </Switch>
        </XStack>
      </YStack>
    </YStack>
  );

  // ---------------------------------------------------------------------------
  // Renderers: Students tab
  // ---------------------------------------------------------------------------

  const renderStudentItem = ({ item }: { item: StudentMember }) => (
    <YStack
      backgroundColor={cardBg}
      borderRadius="$4"
      padding="$3"
      marginBottom="$2"
      borderWidth={1}
      borderColor={cardBorder}
    >
      <XStack alignItems="center" gap="$3">
        {item.avatar_url ? (
          <Image
            source={{ uri: item.avatar_url }}
            style={{ width: 40, height: 40, borderRadius: 20 }}
          />
        ) : (
          <YStack
            width={40}
            height={40}
            borderRadius={20}
            backgroundColor={isDark ? '#333' : '#E5E5E5'}
            justifyContent="center"
            alignItems="center"
          >
            <Text fontSize="$4" fontWeight="bold" color={textSecondary}>
              {item.full_name.charAt(0).toUpperCase()}
            </Text>
          </YStack>
        )}

        <YStack flex={1}>
          <Text fontSize="$4" fontWeight="600" color={textPrimary}>
            {item.full_name}
          </Text>
          <Text fontSize="$2" color={textSecondary} numberOfLines={1}>
            {item.email}
          </Text>
        </YStack>

        <YStack
          paddingHorizontal={10}
          paddingVertical={4}
          borderRadius={12}
          backgroundColor={
            item.role === 'admin' || item.role === 'school'
              ? '#00E6C320'
              : isDark
                ? '#333'
                : '#F0F0F0'
          }
        >
          <Text
            fontSize="$1"
            fontWeight="600"
            color={
              item.role === 'admin' || item.role === 'school' ? '#00E6C3' : textSecondary
            }
          >
            {item.role}
          </Text>
        </YStack>
      </XStack>
    </YStack>
  );

  const renderStudentsTab = () => (
    <FlatList
      data={students}
      keyExtractor={(item) => item.id}
      renderItem={renderStudentItem}
      scrollEnabled={false}
      ListEmptyComponent={
        <YStack alignItems="center" padding="$6" gap="$3">
          <Feather name="users" size={48} color={textMuted} />
          <Text fontSize="$4" color={textMuted} textAlign="center">
            {t('school.noStudents') || 'No members yet'}
          </Text>
        </YStack>
      }
    />
  );

  // ---------------------------------------------------------------------------
  // Renderers: Routes tab
  // ---------------------------------------------------------------------------

  const renderSchoolRouteItem = ({ item }: { item: SchoolRoute }) => (
    <YStack
      backgroundColor={cardBg}
      borderRadius="$4"
      padding="$3"
      marginBottom="$2"
      borderWidth={1}
      borderColor={cardBorder}
    >
      <XStack alignItems="center" gap="$3">
        <YStack
          width={36}
          height={36}
          borderRadius={18}
          backgroundColor="#00E6C320"
          justifyContent="center"
          alignItems="center"
        >
          <Feather name="map-pin" size={18} color="#00E6C3" />
        </YStack>

        <YStack flex={1}>
          <Text fontSize="$4" fontWeight="600" color={textPrimary} numberOfLines={1}>
            {item.route_name}
          </Text>
          {item.route_description ? (
            <Text fontSize="$2" color={textSecondary} numberOfLines={2}>
              {item.route_description}
            </Text>
          ) : null}
        </YStack>

        <TouchableOpacity
          onPress={() =>
            Alert.alert(
              t('school.removeRoute') || 'Remove Route',
              t('school.removeRouteConfirm') || 'Remove this route from the school library?',
              [
                { text: t('common.cancel') || 'Cancel', style: 'cancel' },
                {
                  text: t('common.remove') || 'Remove',
                  style: 'destructive',
                  onPress: () => handleRemoveRoute(item.id),
                },
              ],
            )
          }
          disabled={removingRoute === item.id}
          style={{ padding: 8, opacity: removingRoute === item.id ? 0.4 : 1 }}
        >
          {removingRoute === item.id ? (
            <Spinner size="small" color="#FF4444" />
          ) : (
            <Feather name="trash-2" size={18} color="#FF4444" />
          )}
        </TouchableOpacity>
      </XStack>
    </YStack>
  );

  const renderSearchResultItem = ({ item }: { item: SearchRouteResult }) => (
    <XStack
      alignItems="center"
      gap="$3"
      paddingVertical="$2"
      paddingHorizontal="$1"
      borderBottomWidth={1}
      borderBottomColor={cardBorder}
    >
      <YStack flex={1}>
        <Text fontSize="$3" fontWeight="600" color={textPrimary} numberOfLines={1}>
          {item.name}
        </Text>
        {item.description ? (
          <Text fontSize="$2" color={textSecondary} numberOfLines={1}>
            {item.description}
          </Text>
        ) : null}
      </YStack>

      <TouchableOpacity
        onPress={() => handleAddRoute(item.id)}
        disabled={addingRoute === item.id}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 8,
          backgroundColor: '#00E6C3',
          opacity: addingRoute === item.id ? 0.6 : 1,
        }}
      >
        {addingRoute === item.id ? (
          <Spinner size="small" color="#000" />
        ) : (
          <Feather name="plus" size={16} color="#000" />
        )}
        <Text fontSize="$2" fontWeight="bold" color="#000">
          {t('common.add') || 'Add'}
        </Text>
      </TouchableOpacity>
    </XStack>
  );

  const renderRoutesTab = () => (
    <YStack gap="$3">
      {/* Search to add routes */}
      <YStack
        backgroundColor={cardBg}
        borderRadius="$4"
        padding="$4"
        borderWidth={1}
        borderColor={cardBorder}
        gap="$3"
      >
        <Text fontSize="$4" fontWeight="600" color={textPrimary}>
          {t('school.addRoutes') || 'Add Routes'}
        </Text>
        <XStack alignItems="center" gap="$2">
          <TextInput
            value={routeSearchQuery}
            onChangeText={handleRouteSearch}
            placeholder={t('school.searchRoutes') || 'Search routes by name...'}
            placeholderTextColor={placeholderColor}
            style={{
              flex: 1,
              backgroundColor: inputBg,
              color: inputColor,
              borderRadius: 12,
              padding: 12,
              fontSize: 14,
              borderWidth: 1,
              borderColor: inputBorder,
            }}
          />
          {searchingRoutes && <Spinner size="small" color="#00E6C3" />}
        </XStack>

        {routeSearchResults.length > 0 && (
          <FlatList
            data={routeSearchResults}
            keyExtractor={(item) => item.id}
            renderItem={renderSearchResultItem}
            scrollEnabled={false}
            style={{ maxHeight: 200 }}
          />
        )}

        {routeSearchQuery.trim().length >= 2 &&
          !searchingRoutes &&
          routeSearchResults.length === 0 && (
            <Text fontSize="$2" color={textMuted} textAlign="center" paddingVertical="$2">
              {t('school.noRoutesFound') || 'No routes found.'}
            </Text>
          )}
      </YStack>

      {/* Linked routes */}
      <Text fontSize="$5" fontWeight="bold" color={textPrimary}>
        {t('school.linkedRoutes') || 'School Routes'} ({schoolRoutes.length})
      </Text>

      <FlatList
        data={schoolRoutes}
        keyExtractor={(item) => item.id}
        renderItem={renderSchoolRouteItem}
        scrollEnabled={false}
        ListEmptyComponent={
          <YStack alignItems="center" padding="$6" gap="$3">
            <Feather name="map" size={48} color={textMuted} />
            <Text fontSize="$4" color={textMuted} textAlign="center">
              {t('school.noRoutes') || 'No routes linked yet'}
            </Text>
          </YStack>
        }
      />
    </YStack>
  );

  // ---------------------------------------------------------------------------
  // Loading / Error states
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <Screen>
        <Header title={t('school.title') || 'School Dashboard'} showBack />
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Spinner size="large" color="#00E6C3" />
        </YStack>
      </Screen>
    );
  }

  if (error || !school) {
    return (
      <Screen>
        <Header title={t('school.title') || 'School Dashboard'} showBack />
        <YStack flex={1} justifyContent="center" alignItems="center" padding="$6" gap="$4">
          <Feather name="alert-circle" size={48} color="#FF4444" />
          <Text fontSize="$4" color={textMuted} textAlign="center">
            {error || t('school.noSchoolFound') || 'No school found for your account.'}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setLoading(true);
              setError(null);
              loadSchool();
            }}
            style={{
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 12,
              backgroundColor: '#00E6C3',
            }}
          >
            <Text fontSize="$3" fontWeight="bold" color="#000">
              {t('common.retry') || 'Retry'}
            </Text>
          </TouchableOpacity>
        </YStack>
      </Screen>
    );
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  const studentCount = students.length;
  const routeCount = schoolRoutes.length;

  return (
    <Screen scroll={false} padding={false}>
      <Header title={t('school.title') || 'School Dashboard'} showBack />
      <FlatList
        data={[{ key: 'content' }]}
        keyExtractor={(item) => item.key}
        renderItem={() => (
          <YStack padding="$4" gap="$3">
            {/* Stat cards */}
            <XStack gap="$3">
              <DashboardStatCard
                value={studentCount}
                label={t('school.totalMembers') || 'Members'}
                icon="users"
                color="#00E6C3"
              />
              <DashboardStatCard
                value={routeCount}
                label={t('school.totalRoutes') || 'Routes'}
                icon="map"
                color="#0A84FF"
              />
            </XStack>

            {/* Tabs */}
            {renderTabBar()}

            {/* Active tab content */}
            {activeTab === 'info' && renderInfoTab()}
            {activeTab === 'students' && renderStudentsTab()}
            {activeTab === 'routes' && renderRoutesTab()}
          </YStack>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </Screen>
  );
}
