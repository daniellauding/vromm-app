import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshControl,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  Platform,
  Modal,
  Pressable,
  ScrollView as RNScrollView,
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
import { UserProfileSheet } from '../components/UserProfileSheet';
import { RouteDetailSheet } from '../components/RouteDetailSheet';
import { useToast } from '../contexts/ToastContext';
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
  const { user, profile: authProfile } = useAuth();
  const navigation = useNavigation<RootStackNavigationProp>();
  const { t, language } = useTranslation();
  const { showToast } = useToast();
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

  // Setup form state (for "Create School" empty state)
  const [setupName, setSetupName] = useState('');
  const [setupOrgNumber, setSetupOrgNumber] = useState('');
  const [setupEmail, setSetupEmail] = useState('');
  const [creatingSchool, setCreatingSchool] = useState(false);

  // Invite instructor state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [instructorSearch, setInstructorSearch] = useState('');
  const [instructorResults, setInstructorResults] = useState<{ id: string; full_name: string; email: string; avatar_url: string | null }[]>([]);
  const [searchingInstructors, setSearchingInstructors] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);

  // Sheet states
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showUserProfileSheet, setShowUserProfileSheet] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [showRouteDetailSheet, setShowRouteDetailSheet] = useState(false);

  // ---------------------------------------------------------------------------
  // Translation helper
  // ---------------------------------------------------------------------------

  const tx = (key: string, en: string, sv?: string): string => {
    const translated = t(key);
    if (translated && translated !== key) return translated;
    return language === 'sv' && sv ? sv : en;
  };

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
        setError(tx('school.noSchoolFound', 'No school found for your account.', 'Ingen skola hittades för ditt konto.'));
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const schoolId = memberships[0].school_id;
      if (!schoolId) {
        setError(tx('school.noSchoolFound', 'No school found for your account.', 'Ingen skola hittades för ditt konto.'));
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
      setError(tx('school.loadError', 'Failed to load school data.', 'Kunde inte ladda skoldata.'));
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
  // Create school (empty state fallback)
  // ---------------------------------------------------------------------------

  const handleCreateSchool = async () => {
    if (!user?.id || !setupName.trim()) return;
    setCreatingSchool(true);
    try {
      const { data: newSchool, error: schoolErr } = await supabase
        .from('schools')
        .insert({
          name: setupName.trim(),
          organization_number: setupOrgNumber.trim() || null,
          contact_email: setupEmail.trim() || user.email || null,
          is_active: false,
        })
        .select('id')
        .single();

      if (schoolErr) throw schoolErr;

      if (newSchool) {
        const { error: memErr } = await supabase
          .from('school_memberships')
          .insert({
            school_id: newSchool.id,
            user_id: user.id,
            role: 'admin',
          });

        if (memErr) throw memErr;
      }

      setError(null);
      showToast({ title: tx('common.success', 'Success', 'Klart'), message: tx('school.created', 'School created!', 'Skolan skapad!'), type: 'success' });
      await loadSchool();
    } catch (err) {
      console.error('Error creating school:', err);
      showToast({ title: tx('common.error', 'Error', 'Fel'), message: tx('school.createFailed', 'Failed to create school.', 'Kunde inte skapa skolan.'), type: 'error' });
    } finally {
      setCreatingSchool(false);
    }
  };

  // Pre-fill setup form when error state is shown
  useEffect(() => {
    if (error && !school) {
      setSetupName((authProfile as any)?.full_name || '');
      setSetupOrgNumber((authProfile as any)?.organization_number || '');
      setSetupEmail(user?.email || '');
    }
  }, [error, school, authProfile, user]);

  // ---------------------------------------------------------------------------
  // Invite instructor
  // ---------------------------------------------------------------------------

  const handleSearchInstructors = async (query: string) => {
    setInstructorSearch(query);
    if (query.trim().length < 2) {
      setInstructorResults([]);
      return;
    }
    setSearchingInstructors(true);
    try {
      const { data, error: searchErr } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('role', ['instructor', 'teacher'])
        .ilike('full_name', `%${query.trim()}%`)
        .limit(20);

      if (searchErr) throw searchErr;

      // Filter out users already members of this school
      const memberIds = new Set(students.map((s) => s.user_id));
      setInstructorResults((data || []).filter((p: any) => !memberIds.has(p.id)));
    } catch (err) {
      console.error('Error searching instructors:', err);
    } finally {
      setSearchingInstructors(false);
    }
  };

  const handleInviteInstructor = async (instructorId: string) => {
    if (!school?.id) return;
    setInvitingId(instructorId);
    try {
      const { error: insertErr } = await supabase.from('school_memberships').insert({
        school_id: school.id,
        user_id: instructorId,
        role: 'instructor',
      });

      if (insertErr) {
        if (insertErr.code === '23505') {
          showToast({ title: tx('school.alreadyMember', 'Already a member', 'Redan medlem'), message: '', type: 'info' });
        } else {
          throw insertErr;
        }
      } else {
        // Send notification
        await supabase.from('notifications').insert({
          user_id: instructorId,
          type: 'system',
          message: `You have been invited to ${school.name} as an instructor`,
          actor_id: user?.id,
        });

        showToast({ title: tx('common.success', 'Success', 'Klart'), message: tx('school.instructorInvited', 'Instructor invited!', 'Handledare inbjuden!'), type: 'success' });
        // Remove from search results
        setInstructorResults((prev) => prev.filter((p) => p.id !== instructorId));
        // Refresh members
        await loadStudents();
      }
    } catch (err) {
      console.error('Error inviting instructor:', err);
      showToast({ title: tx('common.error', 'Error', 'Fel'), message: tx('school.inviteFailed', 'Failed to invite instructor.', 'Kunde inte bjuda in handledare.'), type: 'error' });
    } finally {
      setInvitingId(null);
    }
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

      showToast({ title: tx('common.success', 'Success', 'Klart'), message: tx('school.infoSaved', 'School info saved.', 'Skolinformation sparad.'), type: 'success' });
    } catch (err) {
      console.error('Error saving school info:', err);
      showToast({ title: tx('common.error', 'Error', 'Fel'), message: tx('school.saveFailed', 'Failed to save school info.', 'Kunde inte spara skolinformation.'), type: 'error' });
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
        showToast({ title: tx('common.error', 'Error', 'Fel'), message: tx('school.permissionNeeded', 'Media library permission is required.', 'Behörighet till bildbiblioteket krävs.'), type: 'error' });
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
      showToast({ title: tx('common.success', 'Success', 'Klart'), message: tx('school.logoUploaded', 'Logo uploaded.', 'Logotyp uppladdad.'), type: 'success' });
    } catch (err) {
      console.error('Error uploading logo:', err);
      showToast({ title: tx('common.error', 'Error', 'Fel'), message: tx('school.logoFailed', 'Failed to upload logo.', 'Kunde inte ladda upp logotyp.'), type: 'error' });
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
      showToast({ title: tx('common.error', 'Error', 'Fel'), message: tx('school.toggleFailed', 'Failed to update visibility.', 'Kunde inte uppdatera synlighet.'), type: 'error' });
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
      showToast({ title: tx('common.error', 'Error', 'Fel'), message: tx('school.addRouteFailed', 'Failed to add route.', 'Kunde inte lägga till rutt.'), type: 'error' });
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
      showToast({ title: tx('common.success', 'Success', 'Klart'), message: tx('school.routeRemoved', 'Route removed.', 'Rutt borttagen.'), type: 'success' });
    } catch (err) {
      console.error('Error removing route:', err);
      showToast({ title: tx('common.error', 'Error', 'Fel'), message: tx('school.removeRouteFailed', 'Failed to remove route.', 'Kunde inte ta bort rutt.'), type: 'error' });
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
    { key: 'info', label: tx('school.tabInfo', 'Info', 'Info'), icon: 'info' },
    { key: 'students', label: tx('school.tabMembers', 'Members', 'Medlemmar'), icon: 'users' },
    { key: 'routes', label: tx('school.tabRoutes', 'Routes', 'Rutter'), icon: 'map' },
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
              ? tx('school.uploading', 'Uploading...', 'Laddar upp...')
              : tx('school.uploadLogo', 'Upload Logo', 'Ladda upp logotyp')}
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
            {tx('school.name', 'School Name', 'Skolans namn')}
          </Text>
          <TextInput
            value={formName}
            onChangeText={setFormName}
            placeholder={tx('school.namePlaceholder', 'Enter school name', 'Ange skolans namn')}
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
            {tx('school.description', 'Description', 'Beskrivning')}
          </Text>
          <TextInput
            value={formDescription}
            onChangeText={setFormDescription}
            placeholder={tx('school.descriptionPlaceholder', 'Describe your school', 'Beskriv din skola')}
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
            {tx('school.contactEmail', 'Contact Email', 'Kontakt e-post')}
          </Text>
          <TextInput
            value={formEmail}
            onChangeText={setFormEmail}
            placeholder={tx('school.emailPlaceholder', 'contact@school.com', 'kontakt@skola.se')}
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
            {tx('school.phone', 'Phone', 'Telefon')}
          </Text>
          <TextInput
            value={formPhone}
            onChangeText={setFormPhone}
            placeholder={tx('school.phonePlaceholder', '+46 70 123 4567', '+46 70 123 4567')}
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
            {tx('school.location', 'Location', 'Plats')}
          </Text>
          <TextInput
            value={formLocation}
            onChangeText={setFormLocation}
            placeholder={tx('school.locationPlaceholder', 'City, Country', 'Stad, Land')}
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
            {saving ? tx('common.saving', 'Saving...', 'Sparar...') : tx('common.save', 'Save', 'Spara')}
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
              {tx('school.showOnMap', 'Show on Map', 'Visa på kartan')}
            </Text>
            <Text fontSize="$2" color={textSecondary}>
              {tx('school.showOnMapDescription', 'Make your school visible on the public map.', 'Gör din skola synlig på den publika kartan.')}
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
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => {
        setSelectedUserId(item.user_id);
        setShowUserProfileSheet(true);
      }}
    >
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
    </TouchableOpacity>
  );

  const renderStudentsTab = () => (
    <YStack gap="$3">
      {/* Invite Instructor button */}
      <TouchableOpacity
        onPress={() => setShowInviteModal(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingVertical: 12,
          borderRadius: 12,
          backgroundColor: '#00E6C3',
        }}
      >
        <Feather name="user-plus" size={18} color="#000" />
        <Text fontSize="$3" fontWeight="600" color="#000">
          {tx('school.inviteInstructor', 'Invite Instructor', 'Bjud in handledare')}
        </Text>
      </TouchableOpacity>

      <FlatList
        data={students}
        keyExtractor={(item) => item.id}
        renderItem={renderStudentItem}
        scrollEnabled={false}
        ListEmptyComponent={
          <YStack alignItems="center" padding="$6" gap="$3">
            <Feather name="users" size={48} color={textMuted} />
            <Text fontSize="$4" color={textMuted} textAlign="center">
              {tx('school.noStudents', 'No members yet', 'Inga medlemmar ännu')}
            </Text>
          </YStack>
        }
      />
    </YStack>
  );

  // ---------------------------------------------------------------------------
  // Renderers: Routes tab
  // ---------------------------------------------------------------------------

  const renderSchoolRouteItem = ({ item }: { item: SchoolRoute }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => {
        setSelectedRouteId(item.route_id);
        setShowRouteDetailSheet(true);
      }}
    >
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
            onPress={(e) => {
              e.stopPropagation?.();
              handleRemoveRoute(item.id);
            }}
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
    </TouchableOpacity>
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
          {tx('common.add', 'Add', 'Lägg till')}
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
          {tx('school.addRoutes', 'Add Routes', 'Lägg till rutter')}
        </Text>
        <XStack alignItems="center" gap="$2">
          <TextInput
            value={routeSearchQuery}
            onChangeText={handleRouteSearch}
            placeholder={tx('school.searchRoutes', 'Search routes by name...', 'Sök rutter efter namn...')}
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
              {tx('school.noRoutesFound', 'No routes found.', 'Inga rutter hittades.')}
            </Text>
          )}
      </YStack>

      {/* Linked routes */}
      <Text fontSize="$5" fontWeight="bold" color={textPrimary}>
        {tx('school.linkedRoutes', 'School Routes', 'Skolans rutter')} ({schoolRoutes.length})
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
              {tx('school.noRoutes', 'No routes linked yet', 'Inga rutter länkade ännu')}
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
        <Header title={tx('school.title', 'School Dashboard', 'Skolpanel')} showBack />
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Spinner size="large" color="#00E6C3" />
        </YStack>
      </Screen>
    );
  }

  if (error || !school) {
    return (
      <Screen>
        <Header title={tx('school.title', 'School Dashboard', 'Skolpanel')} showBack />
        <YStack flex={1} padding="$4" gap="$4">
          {/* Friendly empty state */}
          <YStack alignItems="center" gap="$3" paddingTop="$6">
            <YStack
              width={80}
              height={80}
              borderRadius={40}
              backgroundColor="#00E6C320"
              justifyContent="center"
              alignItems="center"
            >
              <Feather name="home" size={40} color="#00E6C3" />
            </YStack>
            <Text fontSize="$6" fontWeight="bold" color={textPrimary} textAlign="center">
              {tx('school.setupTitle', 'Set Up Your School', 'Konfigurera din skola')}
            </Text>
            <Text fontSize="$3" color={textSecondary} textAlign="center">
              {tx('school.setupDescription', 'Fill in the details below to create your school profile.', 'Fyll i uppgifterna nedan för att skapa din skolprofil.')}
            </Text>
          </YStack>

          {/* Setup form */}
          <YStack
            backgroundColor={cardBg}
            borderRadius="$4"
            padding="$4"
            borderWidth={1}
            borderColor={cardBorder}
            gap="$3"
          >
            {/* School Name */}
            <YStack gap="$1">
              <Text fontSize="$2" fontWeight="600" color={textSecondary}>
                {tx('school.name', 'School Name', 'Skolans namn')}
              </Text>
              <TextInput
                value={setupName}
                onChangeText={setSetupName}
                placeholder={tx('school.namePlaceholder', 'Enter school name', 'Ange skolans namn')}
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

            {/* Org Number */}
            <YStack gap="$1">
              <Text fontSize="$2" fontWeight="600" color={textSecondary}>
                {tx('school.orgNumber', 'Organization Number', 'Organisationsnummer')}
              </Text>
              <TextInput
                value={setupOrgNumber}
                onChangeText={setSetupOrgNumber}
                placeholder={tx('school.orgNumberPlaceholder', 'e.g. 556677-8899', 't.ex. 556677-8899')}
                placeholderTextColor={placeholderColor}
                keyboardType="number-pad"
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

            {/* Contact Email */}
            <YStack gap="$1">
              <Text fontSize="$2" fontWeight="600" color={textSecondary}>
                {tx('school.contactEmail', 'Contact Email', 'Kontakt e-post')}
              </Text>
              <TextInput
                value={setupEmail}
                onChangeText={setSetupEmail}
                placeholder={tx('school.emailPlaceholder', 'contact@school.com', 'kontakt@skola.se')}
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

            {/* Create School button */}
            <TouchableOpacity
              onPress={handleCreateSchool}
              disabled={creatingSchool || !setupName.trim()}
              style={{
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: 'center',
                backgroundColor: '#00E6C3',
                opacity: creatingSchool || !setupName.trim() ? 0.6 : 1,
              }}
            >
              {creatingSchool ? (
                <Spinner size="small" color="#000" />
              ) : (
                <Text fontSize="$4" fontWeight="bold" color="#000">
                  {tx('school.createSchool', 'Create School', 'Skapa skola')}
                </Text>
              )}
            </TouchableOpacity>
          </YStack>
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
      <Header title={tx('school.title', 'School Dashboard', 'Skolpanel')} showBack />
      <FlatList
        data={[{ key: 'content' }]}
        keyExtractor={(item) => item.key}
        renderItem={() => (
          <YStack padding="$4" gap="$3">
            {/* Pending verification banner */}
            {school && !school.is_active && (
              <XStack
                backgroundColor="#FFB80020"
                borderRadius="$3"
                padding="$3"
                alignItems="center"
                gap="$2"
                borderWidth={1}
                borderColor="#FFB80040"
              >
                <Feather name="clock" size={18} color="#FFB800" />
                <Text fontSize="$3" color="#FFB800" flex={1}>
                  {tx('school.pendingVerification', 'Pending verification — your school will appear on the map once approved by an admin.', 'Väntar på verifiering — din skola visas på kartan när en admin godkänner.')}
                </Text>
              </XStack>
            )}

            {/* Stat cards */}
            <XStack gap="$3">
              <DashboardStatCard
                value={studentCount}
                label={tx('school.totalMembers', 'Members', 'Medlemmar')}
                icon="users"
                color="#00E6C3"
              />
              <DashboardStatCard
                value={routeCount}
                label={tx('school.totalRoutes', 'Routes', 'Rutter')}
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

      <UserProfileSheet
        visible={showUserProfileSheet}
        onClose={() => setShowUserProfileSheet(false)}
        userId={selectedUserId}
      />

      <RouteDetailSheet
        visible={showRouteDetailSheet}
        onClose={() => setShowRouteDetailSheet(false)}
        routeId={selectedRouteId}
        onNavigateToProfile={(userId) => {
          setShowRouteDetailSheet(false);
          setSelectedUserId(userId);
          setShowUserProfileSheet(true);
        }}
      />

      {/* Invite Instructor Modal */}
      <Modal
        visible={showInviteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          onPress={() => setShowInviteModal(false)}
        >
          <Pressable
            style={{
              backgroundColor: isDark ? '#1A1A1A' : '#FFF',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              maxHeight: '70%',
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text fontSize="$6" fontWeight="bold" color={textPrimary} marginBottom="$3">
              {tx('school.inviteInstructor', 'Invite Instructor', 'Bjud in handledare')}
            </Text>

            <XStack alignItems="center" gap="$2" marginBottom="$3">
              <TextInput
                value={instructorSearch}
                onChangeText={handleSearchInstructors}
                placeholder={tx('school.searchInstructors', 'Search instructors by name...', 'Sök handledare efter namn...')}
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
              {searchingInstructors && <Spinner size="small" color="#00E6C3" />}
            </XStack>

            <RNScrollView style={{ maxHeight: 300 }}>
              {instructorResults.map((instructor) => (
                <XStack
                  key={instructor.id}
                  alignItems="center"
                  gap="$3"
                  paddingVertical="$2"
                  borderBottomWidth={1}
                  borderBottomColor={cardBorder}
                >
                  {instructor.avatar_url ? (
                    <Image
                      source={{ uri: instructor.avatar_url }}
                      style={{ width: 36, height: 36, borderRadius: 18 }}
                    />
                  ) : (
                    <YStack
                      width={36}
                      height={36}
                      borderRadius={18}
                      backgroundColor={isDark ? '#333' : '#E5E5E5'}
                      justifyContent="center"
                      alignItems="center"
                    >
                      <Text fontSize="$3" fontWeight="bold" color={textSecondary}>
                        {(instructor.full_name || '?').charAt(0).toUpperCase()}
                      </Text>
                    </YStack>
                  )}
                  <YStack flex={1}>
                    <Text fontSize="$3" fontWeight="600" color={textPrimary} numberOfLines={1}>
                      {instructor.full_name || 'Unknown'}
                    </Text>
                    <Text fontSize="$2" color={textSecondary} numberOfLines={1}>
                      {instructor.email}
                    </Text>
                  </YStack>
                  <TouchableOpacity
                    onPress={() => handleInviteInstructor(instructor.id)}
                    disabled={invitingId === instructor.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: '#00E6C3',
                      opacity: invitingId === instructor.id ? 0.6 : 1,
                    }}
                  >
                    {invitingId === instructor.id ? (
                      <Spinner size="small" color="#000" />
                    ) : (
                      <Feather name="user-plus" size={14} color="#000" />
                    )}
                    <Text fontSize="$2" fontWeight="bold" color="#000">
                      {tx('school.invite', 'Invite', 'Bjud in')}
                    </Text>
                  </TouchableOpacity>
                </XStack>
              ))}

              {instructorSearch.trim().length >= 2 && !searchingInstructors && instructorResults.length === 0 && (
                <Text fontSize="$3" color={textMuted} textAlign="center" paddingVertical="$4">
                  {tx('school.noInstructorsFound', 'No instructors found.', 'Inga handledare hittades.')}
                </Text>
              )}
            </RNScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}
