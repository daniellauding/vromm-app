import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshControl,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  View,
  Image,
} from 'react-native';
import { YStack, XStack, ScrollView, Text, Spinner, Switch } from 'tamagui';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { DashboardStatCard } from '../components/DashboardStatCard';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../contexts/TranslationContext';
import { useThemePreference } from '../hooks/useThemeOverride';
import { UserProfileSheet } from '../components/UserProfileSheet';
import { RouteDetailSheet } from '../components/RouteDetailSheet';
import { useToast } from '../contexts/ToastContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabKey = 'stats' | 'users' | 'schools' | 'routes' | 'settings';

type AdminStats = {
  totalUsers: number;
  totalRoutes: number;
  totalSchools: number;
  totalSupervisors: number;
};

type UserItem = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  avatar_url: string | null;
  account_status: string | null;
  created_at: string;
};

type RouteItem = {
  id: string;
  name: string;
  difficulty: string | null;
  created_at: string;
  creator_name: string;
  creator_id: string | null;
};

type SchoolItem = {
  id: string;
  name: string;
  contact_email: string | null;
  organization_number: string | null;
  is_active: boolean | null;
  created_at: string;
  member_count?: number;
};

type RoleFilter = 'all' | 'student' | 'instructor' | 'school' | 'admin';

const AVAILABLE_ROLES = ['student', 'instructor', 'school', 'admin'] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AdminDashboardScreen() {
  const { user } = useAuth();
  const { t, language } = useTranslation();
  const { effectiveTheme } = useThemePreference();
  const { showToast } = useToast();
  const isDark = effectiveTheme === 'dark';

  // Tab state
  const [activeTab, setActiveTab] = useState<TabKey>('stats');

  // Stats state
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalRoutes: 0,
    totalSchools: 0,
    totalSupervisors: 0,
  });

  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Users state
  const [users, setUsers] = useState<UserItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [usersPage, setUsersPage] = useState(0);
  const [usersHasMore, setUsersHasMore] = useState(true);

  // Routes state
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [routeSearch, setRouteSearch] = useState('');
  const [routesPage, setRoutesPage] = useState(0);
  const [routesHasMore, setRoutesHasMore] = useState(true);

  // Schools state
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [togglingSchoolId, setTogglingSchoolId] = useState<string | null>(null);

  // Settings state
  const [showSchoolsDefault, setShowSchoolsDefault] = useState(false);
  const [showInstructorsDefault, setShowInstructorsDefault] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Sheet states (reusing existing components)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showUserProfileSheet, setShowUserProfileSheet] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [showRouteDetailSheet, setShowRouteDetailSheet] = useState(false);

  // Role change modal
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleChangeTarget, setRoleChangeTarget] = useState<UserItem | null>(null);
  const [changingRole, setChangingRole] = useState(false);

  // User action modal (deactivate/reactivate)
  const [showUserActionModal, setShowUserActionModal] = useState(false);
  const [userActionTarget, setUserActionTarget] = useState<UserItem | null>(null);
  const [processingAction, setProcessingAction] = useState(false);

  // ---------------------------------------------------------------------------
  // Shared styles
  // ---------------------------------------------------------------------------

  const cardBg = isDark ? '#1A1A1A' : '#FFF';
  const cardBorder = isDark ? '#333' : '#E5E5E5';
  const inputColor = isDark ? '#FFF' : '#000';
  const placeholderColor = isDark ? '#666' : '#AAA';
  const textPrimary = isDark ? '#FFF' : '#000';
  const textSecondary = isDark ? '#AAA' : '#666';
  const textMuted = isDark ? '#666' : '#999';
  const screenBg = isDark ? '#111' : '#F5F5F5';

  // ---------------------------------------------------------------------------
  // Translation helper
  // ---------------------------------------------------------------------------

  const tx = (key: string, en: string, sv?: string): string => {
    const translated = t(key);
    if (translated && translated !== key) return translated;
    return language === 'sv' && sv ? sv : en;
  };

  // ---------------------------------------------------------------------------
  // Data loading: Stats
  // ---------------------------------------------------------------------------

  const loadStats = useCallback(async () => {
    try {
      const [usersRes, routesRes, schoolsRes, supervisorsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('routes').select('id', { count: 'exact', head: true }),
        supabase.from('schools').select('id', { count: 'exact', head: true }),
        supabase
          .from('student_supervisor_relationships')
          .select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        totalUsers: usersRes.count ?? 0,
        totalRoutes: routesRes.count ?? 0,
        totalSchools: schoolsRes.count ?? 0,
        totalSupervisors: supervisorsRes.count ?? 0,
      });
    } catch (error) {
      console.error('Error loading admin stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Data loading: Users
  // ---------------------------------------------------------------------------

  const loadUsers = useCallback(
    async (page = 0, append = false) => {
      setUsersLoading(true);
      try {
        const limit = 20;
        const from = page * limit;
        const to = from + limit - 1;

        let query = supabase
          .from('profiles')
          .select('id, full_name, email, role, avatar_url, account_status, created_at')
          .order('created_at', { ascending: false })
          .range(from, to);

        if (userSearch.trim().length > 0) {
          const search = `%${userSearch.trim()}%`;
          query = query.or(`full_name.ilike.${search},email.ilike.${search}`);
        }

        if (roleFilter !== 'all') {
          query = query.eq('role', roleFilter);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        const items: UserItem[] = (data || []).map((u: any) => ({
          id: u.id,
          full_name: u.full_name || 'Unknown',
          email: u.email || '',
          role: u.role || 'student',
          avatar_url: u.avatar_url || null,
          account_status: u.account_status || null,
          created_at: u.created_at || '',
        }));

        if (append) {
          setUsers((prev) => [...prev, ...items]);
        } else {
          setUsers(items);
        }

        setUsersHasMore(items.length === limit);
        setUsersPage(page);
      } catch (error) {
        console.error('Error loading users:', error);
      } finally {
        setUsersLoading(false);
      }
    },
    [userSearch, roleFilter],
  );

  // ---------------------------------------------------------------------------
  // Data loading: Schools
  // ---------------------------------------------------------------------------

  const loadSchools = useCallback(async () => {
    setSchoolsLoading(true);
    try {
      const { data, error: fetchErr } = await supabase
        .from('schools')
        .select('id, name, contact_email, organization_number, is_active, created_at')
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;

      const items: SchoolItem[] = (data || []).map((s: any) => ({
        id: s.id,
        name: s.name || 'Unnamed',
        contact_email: s.contact_email || null,
        organization_number: s.organization_number || null,
        is_active: s.is_active,
        created_at: s.created_at || '',
      }));

      setSchools(items);
    } catch (error) {
      console.error('Error loading schools:', error);
    } finally {
      setSchoolsLoading(false);
    }
  }, []);

  const handleToggleSchoolActive = async (schoolId: string, currentActive: boolean) => {
    setTogglingSchoolId(schoolId);
    try {
      const { error: updateErr } = await supabase
        .from('schools')
        .update({ is_active: !currentActive })
        .eq('id', schoolId);

      if (updateErr) throw updateErr;

      setSchools((prev) =>
        prev.map((s) => (s.id === schoolId ? { ...s, is_active: !currentActive } : s)),
      );
      showToast({
        title: !currentActive
          ? tx('admin.schoolActivated', 'School activated', 'Skola aktiverad')
          : tx('admin.schoolDeactivated', 'School deactivated', 'Skola inaktiverad'),
        message: '',
        type: 'success',
      });
    } catch (error) {
      console.error('Error toggling school active:', error);
      showToast({
        title: tx('common.error', 'Error', 'Fel'),
        message: tx('admin.schoolToggleFailed', 'Failed to update school', 'Kunde inte uppdatera skola'),
        type: 'error',
      });
    } finally {
      setTogglingSchoolId(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Data loading: Routes (fixed: use creator_id, not created_by)
  // ---------------------------------------------------------------------------

  const loadRoutes = useCallback(
    async (page = 0, append = false) => {
      setRoutesLoading(true);
      try {
        const limit = 20;
        const from = page * limit;
        const to = from + limit - 1;

        let query = supabase
          .from('routes')
          .select('id, name, difficulty, created_at, creator_id, creator:creator_id(full_name)')
          .order('created_at', { ascending: false })
          .range(from, to);

        if (routeSearch.trim().length > 0) {
          query = query.ilike('name', `%${routeSearch.trim()}%`);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        const items: RouteItem[] = (data || []).map((r: any) => ({
          id: r.id,
          name: r.name || (language === 'sv' ? 'Namnlös rutt' : 'Unnamed Route'),
          difficulty: r.difficulty || null,
          created_at: r.created_at || '',
          creator_name: (r.creator as any)?.full_name || 'Unknown',
          creator_id: r.creator_id || null,
        }));

        if (append) {
          setRoutes((prev) => [...prev, ...items]);
        } else {
          setRoutes(items);
        }

        setRoutesHasMore(items.length === limit);
        setRoutesPage(page);
      } catch (error) {
        console.error('Error loading routes:', error);
      } finally {
        setRoutesLoading(false);
      }
    },
    [routeSearch, language],
  );

  // ---------------------------------------------------------------------------
  // Data loading: Settings
  // ---------------------------------------------------------------------------

  const loadSettings = useCallback(async () => {
    try {
      const [schoolsVal, instructorsVal] = await Promise.all([
        AsyncStorage.getItem('admin_show_schools_default'),
        AsyncStorage.getItem('admin_show_instructors_default'),
      ]);
      setShowSchoolsDefault(schoolsVal === 'true');
      setShowInstructorsDefault(instructorsVal === 'true');
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setSettingsLoaded(true);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (activeTab === 'users') {
      setUsersPage(0);
      loadUsers(0, false);
    }
    if (activeTab === 'schools') {
      loadSchools();
    }
    if (activeTab === 'routes') {
      setRoutesPage(0);
      loadRoutes(0, false);
    }
    if (activeTab === 'settings' && !settingsLoaded) {
      loadSettings();
    }
  }, [activeTab]);

  // Re-fetch users when search or filter changes (debounced)
  useEffect(() => {
    if (activeTab === 'users') {
      const timer = setTimeout(() => {
        setUsersPage(0);
        loadUsers(0, false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [userSearch, roleFilter]);

  // Re-fetch routes when search changes (debounced)
  useEffect(() => {
    if (activeTab === 'routes') {
      const timer = setTimeout(() => {
        setRoutesPage(0);
        loadRoutes(0, false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [routeSearch]);

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
    if (activeTab === 'users') loadUsers(0, false);
    if (activeTab === 'schools') loadSchools();
    if (activeTab === 'routes') loadRoutes(0, false);
    if (activeTab === 'settings') loadSettings();
  };

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const handleChangeRole = async (newRole: string) => {
    if (!roleChangeTarget) return;
    setChangingRole(true);
    try {
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', roleChangeTarget.id);

      if (updateErr) throw updateErr;

      setUsers((prev) =>
        prev.map((u) => (u.id === roleChangeTarget.id ? { ...u, role: newRole } : u)),
      );
      showToast({
        title: language === 'sv' ? 'Roll uppdaterad' : 'Role updated',
        message: `${roleChangeTarget.full_name} → ${newRole}`,
        type: 'success',
      });
    } catch (error) {
      console.error('Error changing role:', error);
      showToast({
        title: language === 'sv' ? 'Fel' : 'Error',
        message: language === 'sv' ? 'Kunde inte ändra roll' : 'Failed to change role',
        type: 'error',
      });
    } finally {
      setChangingRole(false);
      setShowRoleModal(false);
      setRoleChangeTarget(null);
    }
  };

  const handleDeactivateUser = async () => {
    if (!userActionTarget) return;
    setProcessingAction(true);
    const isDeactivated = userActionTarget.account_status === 'deleted';
    const newStatus = isDeactivated ? 'active' : 'deleted';

    try {
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ account_status: newStatus })
        .eq('id', userActionTarget.id);

      if (updateErr) throw updateErr;

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userActionTarget.id ? { ...u, account_status: newStatus } : u,
        ),
      );
      loadStats();
      showToast({
        title: isDeactivated
          ? (language === 'sv' ? 'Användare återaktiverad' : 'User reactivated')
          : (language === 'sv' ? 'Användare inaktiverad' : 'User deactivated'),
        message: userActionTarget.full_name,
        type: 'success',
      });
    } catch (error) {
      console.error('Error updating user status:', error);
      showToast({
        title: language === 'sv' ? 'Fel' : 'Error',
        message: language === 'sv' ? 'Kunde inte uppdatera användare' : 'Failed to update user',
        type: 'error',
      });
    } finally {
      setProcessingAction(false);
      setShowUserActionModal(false);
      setUserActionTarget(null);
    }
  };

  const handleDeleteRoute = async (routeId: string) => {
    try {
      const { error: deleteErr } = await supabase.from('routes').delete().eq('id', routeId);
      if (deleteErr) throw deleteErr;
      setRoutes((prev) => prev.filter((r) => r.id !== routeId));
      loadStats();
      showToast({
        title: language === 'sv' ? 'Rutt borttagen' : 'Route deleted',
        message: '',
        type: 'success',
      });
    } catch (error) {
      console.error('Error deleting route:', error);
      showToast({
        title: language === 'sv' ? 'Fel' : 'Error',
        message: language === 'sv' ? 'Kunde inte ta bort rutt' : 'Failed to delete route',
        type: 'error',
      });
    }
  };

  const handleToggleSchoolsDefault = async (value: boolean) => {
    setShowSchoolsDefault(value);
    try {
      await AsyncStorage.setItem('admin_show_schools_default', value.toString());
    } catch (error) {
      console.error('Error saving setting:', error);
    }
  };

  const handleToggleInstructorsDefault = async (value: boolean) => {
    setShowInstructorsDefault(value);
    try {
      await AsyncStorage.setItem('admin_show_instructors_default', value.toString());
    } catch (error) {
      console.error('Error saving setting:', error);
    }
  };

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(language === 'sv' ? 'sv-SE' : undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const roleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return '#FF6B6B';
      case 'instructor':
        return '#00E6C3';
      case 'school':
        return '#0A84FF';
      default:
        return isDark ? '#888' : '#999';
    }
  };

  const roleLabel = (role: string) => {
    const labels: Record<string, { en: string; sv: string }> = {
      student: { en: 'Student', sv: 'Elev' },
      instructor: { en: 'Instructor', sv: 'Handledare' },
      school: { en: 'School', sv: 'Skola' },
      admin: { en: 'Admin', sv: 'Admin' },
    };
    const l = labels[role];
    return l ? (language === 'sv' ? l.sv : l.en) : role;
  };

  const difficultyLabel = (difficulty: string | null) => {
    if (!difficulty) return null;
    const labels: Record<string, { en: string; sv: string; color: string }> = {
      easy: { en: 'Easy', sv: 'Lätt', color: '#00E6C3' },
      medium: { en: 'Medium', sv: 'Medel', color: '#FFB800' },
      hard: { en: 'Hard', sv: 'Svår', color: '#FF6B6B' },
    };
    return labels[difficulty] || null;
  };

  // ---------------------------------------------------------------------------
  // Tab bar
  // ---------------------------------------------------------------------------

  const tabs: { key: TabKey; label: string; icon: keyof typeof Feather.glyphMap }[] = [
    { key: 'stats', label: tx('admin.stats', 'Stats', 'Statistik'), icon: 'bar-chart-2' },
    { key: 'users', label: tx('admin.users', 'Users', 'Användare'), icon: 'users' },
    { key: 'schools', label: tx('admin.schools', 'Schools', 'Skolor'), icon: 'home' },
    { key: 'routes', label: tx('admin.routes', 'Routes', 'Rutter'), icon: 'map' },
    { key: 'settings', label: tx('admin.settings', 'Settings', 'Inställningar'), icon: 'settings' },
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
              gap: 4,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: isActive ? '#00E6C3' : isDark ? '#333' : '#E5E5E5',
            }}
          >
            <Feather
              name={tab.icon}
              size={14}
              color={isActive ? '#000' : isDark ? '#FFF' : '#333'}
            />
            <Text
              fontSize="$2"
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
  // Renderers: Stats tab
  // ---------------------------------------------------------------------------

  const renderStatsTab = () => (
    <YStack gap="$3">
      <XStack gap="$3" flexWrap="wrap">
        <DashboardStatCard
          value={stats.totalUsers}
          label={tx('admin.totalUsers', 'Total Users', 'Totalt Användare')}
          icon="users"
          color="#00E6C3"
        />
        <DashboardStatCard
          value={stats.totalRoutes}
          label={tx('admin.totalRoutes', 'Total Routes', 'Totalt Rutter')}
          icon="map"
          color="#0A84FF"
        />
      </XStack>
      <XStack gap="$3" flexWrap="wrap">
        <DashboardStatCard
          value={stats.totalSchools}
          label={tx('admin.totalSchools', 'Total Schools', 'Totalt Skolor')}
          icon="home"
          color="#FFB800"
        />
        <DashboardStatCard
          value={stats.totalSupervisors}
          label={tx('admin.totalSupervisors', 'Total Supervisors', 'Totalt Handledare')}
          icon="shield"
          color="#FF6B6B"
        />
      </XStack>
    </YStack>
  );

  // ---------------------------------------------------------------------------
  // Renderers: Users tab
  // ---------------------------------------------------------------------------

  const roleFilters: { key: RoleFilter; label: string }[] = [
    { key: 'all', label: tx('admin.roleAll', 'All', 'Alla') },
    { key: 'student', label: tx('admin.roleStudent', 'Student', 'Elev') },
    { key: 'instructor', label: tx('admin.roleInstructor', 'Instructor', 'Handledare') },
    { key: 'school', label: tx('admin.roleSchool', 'School', 'Skola') },
    { key: 'admin', label: tx('admin.roleAdmin', 'Admin', 'Admin') },
  ];

  const renderUserItem = ({ item }: { item: UserItem }) => {
    const isDeactivated = item.account_status === 'deleted';
    const isSelf = item.id === user?.id;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          setSelectedUserId(item.id);
          setShowUserProfileSheet(true);
        }}
      >
        <YStack
          backgroundColor={cardBg}
          borderRadius={12}
          padding="$3"
          marginBottom="$2"
          borderWidth={1}
          borderColor={cardBorder}
          opacity={isDeactivated ? 0.5 : 1}
        >
          <XStack alignItems="center" gap="$3">
            {/* Avatar */}
            <YStack
              width={40}
              height={40}
              borderRadius={20}
              backgroundColor={isDark ? '#333' : '#E5E5E5'}
              justifyContent="center"
              alignItems="center"
              overflow="hidden"
            >
              {item.avatar_url ? (
                <Image
                  source={{ uri: item.avatar_url }}
                  style={{ width: 40, height: 40, borderRadius: 20 }}
                />
              ) : (
                <Feather name="user" size={20} color={textSecondary} />
              )}
            </YStack>

            {/* User info */}
            <YStack flex={1}>
              <XStack alignItems="center" gap="$2">
                <Text
                  fontSize="$4"
                  fontWeight="600"
                  color={textPrimary}
                  numberOfLines={1}
                  flex={1}
                >
                  {item.full_name}
                </Text>
                {/* Role badge - tappable to change role */}
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation?.();
                    if (!isSelf) {
                      setRoleChangeTarget(item);
                      setShowRoleModal(true);
                    }
                  }}
                  disabled={isSelf}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 10,
                    backgroundColor: roleBadgeColor(item.role) + '25',
                  }}
                >
                  <Text fontSize={11} fontWeight="600" color={roleBadgeColor(item.role)}>
                    {roleLabel(item.role)}
                  </Text>
                </TouchableOpacity>
              </XStack>
              <Text fontSize="$2" color={textSecondary} numberOfLines={1}>
                {item.email}
              </Text>
              <Text fontSize="$1" color={textMuted}>
                {formatDate(item.created_at)}
              </Text>
            </YStack>

            {/* Action menu */}
            {!isSelf && (
              <TouchableOpacity
                onPress={() => {
                  setUserActionTarget(item);
                  setShowUserActionModal(true);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ padding: 4 }}
              >
                <Feather name="more-vertical" size={18} color={textSecondary} />
              </TouchableOpacity>
            )}
          </XStack>
        </YStack>
      </TouchableOpacity>
    );
  };

  const renderUsersTab = () => (
    <YStack gap="$3">
      {/* Search input */}
      <XStack
        backgroundColor={cardBg}
        borderRadius={12}
        borderWidth={1}
        borderColor={cardBorder}
        alignItems="center"
        paddingHorizontal="$3"
      >
        <Feather name="search" size={18} color={textSecondary} />
        <TextInput
          value={userSearch}
          onChangeText={setUserSearch}
          placeholder={tx('admin.searchUsers', 'Search users...', 'Sök användare...')}
          placeholderTextColor={placeholderColor}
          style={{
            flex: 1,
            color: inputColor,
            padding: 12,
            fontSize: 14,
          }}
          returnKeyType="search"
        />
        {userSearch.length > 0 && (
          <TouchableOpacity onPress={() => setUserSearch('')}>
            <Feather name="x" size={18} color={textSecondary} />
          </TouchableOpacity>
        )}
      </XStack>

      {/* Role filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <XStack gap="$2" paddingVertical="$1">
          {roleFilters.map((rf) => {
            const isActive = roleFilter === rf.key;
            return (
              <TouchableOpacity
                key={rf.key}
                onPress={() => setRoleFilter(rf.key)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: isActive
                    ? '#00E6C3'
                    : isDark
                      ? '#333'
                      : '#E5E5E5',
                }}
              >
                <Text
                  fontSize="$3"
                  fontWeight={isActive ? 'bold' : 'normal'}
                  color={isActive ? '#000' : isDark ? '#FFF' : '#333'}
                >
                  {rf.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </XStack>
      </ScrollView>

      {/* Users list */}
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={renderUserItem}
        scrollEnabled={false}
        onEndReached={() => {
          if (usersHasMore && !usersLoading) {
            loadUsers(usersPage + 1, true);
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          usersLoading ? (
            <YStack padding="$4" alignItems="center">
              <Spinner size="small" color="#00E6C3" />
            </YStack>
          ) : null
        }
        ListEmptyComponent={
          !usersLoading ? (
            <YStack alignItems="center" padding="$6" gap="$3">
              <Feather name="users" size={48} color={textMuted} />
              <Text fontSize="$4" color={textMuted} textAlign="center">
                {tx('admin.noUsersFound', 'No users found', 'Inga användare hittades')}
              </Text>
            </YStack>
          ) : null
        }
      />
    </YStack>
  );

  // ---------------------------------------------------------------------------
  // Renderers: Schools tab
  // ---------------------------------------------------------------------------

  const renderSchoolItem = ({ item }: { item: SchoolItem }) => {
    const isActive = item.is_active === true;
    const isToggling = togglingSchoolId === item.id;

    return (
      <YStack
        backgroundColor={cardBg}
        borderRadius={12}
        padding="$3"
        marginBottom="$2"
        borderWidth={1}
        borderColor={isActive ? '#00E6C340' : cardBorder}
      >
        <XStack alignItems="center" gap="$3">
          <YStack
            width={40}
            height={40}
            borderRadius={20}
            backgroundColor={isActive ? '#00E6C320' : '#FFB80020'}
            justifyContent="center"
            alignItems="center"
          >
            <Feather
              name="home"
              size={20}
              color={isActive ? '#00E6C3' : '#FFB800'}
            />
          </YStack>

          <YStack flex={1}>
            <XStack alignItems="center" gap="$2">
              <Text fontSize="$4" fontWeight="600" color={textPrimary} numberOfLines={1} flex={1}>
                {item.name}
              </Text>
              <YStack
                paddingHorizontal={8}
                paddingVertical={2}
                borderRadius={10}
                backgroundColor={isActive ? '#00E6C325' : '#FFB80025'}
              >
                <Text fontSize={11} fontWeight="600" color={isActive ? '#00E6C3' : '#FFB800'}>
                  {isActive
                    ? tx('admin.verified', 'Verified', 'Verifierad')
                    : tx('admin.pending', 'Pending', 'Väntar')}
                </Text>
              </YStack>
            </XStack>
            {item.contact_email && (
              <Text fontSize="$2" color={textSecondary} numberOfLines={1}>
                {item.contact_email}
              </Text>
            )}
            <XStack gap="$2" alignItems="center">
              {item.organization_number && (
                <Text fontSize="$1" color={textMuted}>
                  Org: {item.organization_number}
                </Text>
              )}
              <Text fontSize="$1" color={textMuted}>
                {formatDate(item.created_at)}
              </Text>
            </XStack>
          </YStack>

          <TouchableOpacity
            onPress={() => handleToggleSchoolActive(item.id, isActive)}
            disabled={isToggling}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: isActive ? '#FF6B6B20' : '#00E6C320',
              opacity: isToggling ? 0.5 : 1,
            }}
          >
            {isToggling ? (
              <Spinner size="small" color={isActive ? '#FF6B6B' : '#00E6C3'} />
            ) : (
              <Text fontSize="$2" fontWeight="600" color={isActive ? '#FF6B6B' : '#00E6C3'}>
                {isActive
                  ? tx('admin.deactivate', 'Deactivate', 'Inaktivera')
                  : tx('admin.activate', 'Activate', 'Aktivera')}
              </Text>
            )}
          </TouchableOpacity>
        </XStack>
      </YStack>
    );
  };

  const renderSchoolsTab = () => (
    <YStack gap="$3">
      {schoolsLoading ? (
        <YStack padding="$4" alignItems="center">
          <Spinner size="small" color="#00E6C3" />
        </YStack>
      ) : (
        <FlatList
          data={schools}
          keyExtractor={(item) => item.id}
          renderItem={renderSchoolItem}
          scrollEnabled={false}
          ListEmptyComponent={
            <YStack alignItems="center" padding="$6" gap="$3">
              <Feather name="home" size={48} color={textMuted} />
              <Text fontSize="$4" color={textMuted} textAlign="center">
                {tx('admin.noSchools', 'No schools yet', 'Inga skolor ännu')}
              </Text>
            </YStack>
          }
        />
      )}
    </YStack>
  );

  // ---------------------------------------------------------------------------
  // Renderers: Routes tab
  // ---------------------------------------------------------------------------

  const renderRouteItem = ({ item }: { item: RouteItem }) => {
    const diff = difficultyLabel(item.difficulty);

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          setSelectedRouteId(item.id);
          setShowRouteDetailSheet(true);
        }}
      >
        <YStack
          backgroundColor={cardBg}
          borderRadius={12}
          padding="$3"
          marginBottom="$2"
          borderWidth={1}
          borderColor={cardBorder}
        >
          <XStack alignItems="center" gap="$3">
            {/* Route icon */}
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

            {/* Route info */}
            <YStack flex={1}>
              <Text fontSize="$4" fontWeight="600" color={textPrimary} numberOfLines={1}>
                {item.name}
              </Text>
              <XStack alignItems="center" gap="$2">
                <TouchableOpacity
                  onPress={() => {
                    if (item.creator_id) {
                      setSelectedUserId(item.creator_id);
                      setShowUserProfileSheet(true);
                    }
                  }}
                >
                  <Text fontSize="$2" color="#00E6C3" numberOfLines={1}>
                    {item.creator_name}
                  </Text>
                </TouchableOpacity>
                {diff && (
                  <YStack
                    paddingHorizontal={8}
                    paddingVertical={2}
                    borderRadius={10}
                    backgroundColor={diff.color + '25'}
                  >
                    <Text fontSize={11} fontWeight="600" color={diff.color}>
                      {language === 'sv' ? diff.sv : diff.en}
                    </Text>
                  </YStack>
                )}
              </XStack>
              <Text fontSize="$1" color={textMuted}>
                {formatDate(item.created_at)}
              </Text>
            </YStack>

            {/* Delete button */}
            <TouchableOpacity
              onPress={() => handleDeleteRoute(item.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ padding: 8 }}
            >
              <Feather name="trash-2" size={16} color="#FF6B6B" />
            </TouchableOpacity>
          </XStack>
        </YStack>
      </TouchableOpacity>
    );
  };

  const renderRoutesTab = () => (
    <YStack gap="$3">
      {/* Search input */}
      <XStack
        backgroundColor={cardBg}
        borderRadius={12}
        borderWidth={1}
        borderColor={cardBorder}
        alignItems="center"
        paddingHorizontal="$3"
      >
        <Feather name="search" size={18} color={textSecondary} />
        <TextInput
          value={routeSearch}
          onChangeText={setRouteSearch}
          placeholder={tx('admin.searchRoutes', 'Search routes...', 'Sök rutter...')}
          placeholderTextColor={placeholderColor}
          style={{
            flex: 1,
            color: inputColor,
            padding: 12,
            fontSize: 14,
          }}
          returnKeyType="search"
        />
        {routeSearch.length > 0 && (
          <TouchableOpacity onPress={() => setRouteSearch('')}>
            <Feather name="x" size={18} color={textSecondary} />
          </TouchableOpacity>
        )}
      </XStack>

      {/* Routes list */}
      <FlatList
        data={routes}
        keyExtractor={(item) => item.id}
        renderItem={renderRouteItem}
        scrollEnabled={false}
        onEndReached={() => {
          if (routesHasMore && !routesLoading) {
            loadRoutes(routesPage + 1, true);
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          routesLoading ? (
            <YStack padding="$4" alignItems="center">
              <Spinner size="small" color="#00E6C3" />
            </YStack>
          ) : null
        }
        ListEmptyComponent={
          !routesLoading ? (
            <YStack alignItems="center" padding="$6" gap="$3">
              <Feather name="map" size={48} color={textMuted} />
              <Text fontSize="$4" color={textMuted} textAlign="center">
                {tx('admin.noRoutesFound', 'No routes found', 'Inga rutter hittades')}
              </Text>
            </YStack>
          ) : null
        }
      />
    </YStack>
  );

  // ---------------------------------------------------------------------------
  // Renderers: Settings tab
  // ---------------------------------------------------------------------------

  const renderSettingsTab = () => (
    <YStack gap="$3">
      <YStack
        backgroundColor={cardBg}
        borderRadius={12}
        padding="$4"
        borderWidth={1}
        borderColor={cardBorder}
      >
        <XStack alignItems="center" justifyContent="space-between">
          <YStack flex={1} marginRight="$3">
            <Text fontSize="$4" fontWeight="600" color={textPrimary}>
              {tx('admin.showSchoolsDefault', 'Default show schools on map', 'Visa skolor på kartan som standard')}
            </Text>
            <Text fontSize="$2" color={textSecondary} marginTop="$1">
              {tx(
                'admin.showSchoolsDescription',
                'When enabled, schools will be shown on the map by default for all users.',
                'När aktiverat visas skolor på kartan som standard för alla användare.',
              )}
            </Text>
          </YStack>
          <Switch
            size="$4"
            checked={showSchoolsDefault}
            onCheckedChange={handleToggleSchoolsDefault}
            backgroundColor={showSchoolsDefault ? '$switchActive' : '$switchInactive'}
          >
            <Switch.Thumb backgroundColor="$switchThumb" />
          </Switch>
        </XStack>
      </YStack>

      <YStack
        backgroundColor={cardBg}
        borderRadius={12}
        padding="$4"
        borderWidth={1}
        borderColor={cardBorder}
      >
        <XStack alignItems="center" justifyContent="space-between">
          <YStack flex={1} marginRight="$3">
            <Text fontSize="$4" fontWeight="600" color={textPrimary}>
              {tx('admin.showInstructorsDefault', 'Default show instructors on map', 'Visa handledare på kartan som standard')}
            </Text>
            <Text fontSize="$2" color={textSecondary} marginTop="$1">
              {tx(
                'admin.showInstructorsDescription',
                'When enabled, instructors will be shown on the map by default for all users.',
                'När aktiverat visas handledare på kartan som standard för alla användare.',
              )}
            </Text>
          </YStack>
          <Switch
            size="$4"
            checked={showInstructorsDefault}
            onCheckedChange={handleToggleInstructorsDefault}
            backgroundColor={showInstructorsDefault ? '$switchActive' : '$switchInactive'}
          >
            <Switch.Thumb backgroundColor="$switchThumb" />
          </Switch>
        </XStack>
      </YStack>
    </YStack>
  );

  // ---------------------------------------------------------------------------
  // Role change modal
  // ---------------------------------------------------------------------------

  const renderRoleModal = () => (
    <Modal
      visible={showRoleModal}
      transparent
      animationType="fade"
      onRequestClose={() => {
        setShowRoleModal(false);
        setRoleChangeTarget(null);
      }}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 }}
        onPress={() => {
          setShowRoleModal(false);
          setRoleChangeTarget(null);
        }}
      >
        <Pressable
          style={{
            backgroundColor: isDark ? '#1A1A1A' : '#FFF',
            borderRadius: 16,
            padding: 20,
          }}
        >
          <Text fontSize="$5" fontWeight="700" color={textPrimary} marginBottom="$2">
            {language === 'sv' ? 'Ändra roll' : 'Change Role'}
          </Text>
          {roleChangeTarget && (
            <Text fontSize="$3" color={textSecondary} marginBottom="$4">
              {roleChangeTarget.full_name} ({roleChangeTarget.email})
            </Text>
          )}

          <YStack gap="$2">
            {AVAILABLE_ROLES.map((role) => {
              const isCurrentRole = roleChangeTarget?.role === role;
              return (
                <TouchableOpacity
                  key={role}
                  onPress={() => !isCurrentRole && handleChangeRole(role)}
                  disabled={changingRole || isCurrentRole}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 14,
                    borderRadius: 12,
                    backgroundColor: isCurrentRole
                      ? (isDark ? '#333' : '#F0F0F0')
                      : (isDark ? '#222' : '#FAFAFA'),
                    borderWidth: isCurrentRole ? 2 : 1,
                    borderColor: isCurrentRole ? '#00E6C3' : cardBorder,
                    opacity: changingRole ? 0.5 : 1,
                  }}
                >
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: roleBadgeColor(role),
                      marginRight: 12,
                    }}
                  />
                  <Text fontSize="$4" fontWeight="600" color={textPrimary} flex={1}>
                    {roleLabel(role)}
                  </Text>
                  {isCurrentRole && (
                    <Feather name="check" size={18} color="#00E6C3" />
                  )}
                </TouchableOpacity>
              );
            })}
          </YStack>

          {changingRole && (
            <YStack alignItems="center" marginTop="$3">
              <Spinner size="small" color="#00E6C3" />
            </YStack>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );

  // ---------------------------------------------------------------------------
  // User action modal (deactivate/reactivate)
  // ---------------------------------------------------------------------------

  const renderUserActionModal = () => {
    if (!userActionTarget) return null;
    const isDeactivated = userActionTarget.account_status === 'deleted';

    return (
      <Modal
        visible={showUserActionModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowUserActionModal(false);
          setUserActionTarget(null);
        }}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
          onPress={() => {
            setShowUserActionModal(false);
            setUserActionTarget(null);
          }}
        >
          <Pressable
            style={{
              backgroundColor: isDark ? '#1A1A1A' : '#FFF',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              padding: 20,
              paddingBottom: 36,
            }}
          >
            <Text fontSize="$5" fontWeight="700" color={textPrimary} marginBottom="$1">
              {userActionTarget.full_name}
            </Text>
            <Text fontSize="$3" color={textSecondary} marginBottom="$4">
              {userActionTarget.email}
            </Text>

            <YStack gap="$2">
              {/* View profile */}
              <TouchableOpacity
                onPress={() => {
                  setShowUserActionModal(false);
                  setSelectedUserId(userActionTarget.id);
                  setShowUserProfileSheet(true);
                  setUserActionTarget(null);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: isDark ? '#222' : '#FAFAFA',
                }}
              >
                <Feather name="user" size={18} color={textPrimary} style={{ marginRight: 12 }} />
                <Text fontSize="$4" color={textPrimary}>
                  {language === 'sv' ? 'Visa profil' : 'View profile'}
                </Text>
              </TouchableOpacity>

              {/* Change role */}
              <TouchableOpacity
                onPress={() => {
                  setShowUserActionModal(false);
                  setRoleChangeTarget(userActionTarget);
                  setShowRoleModal(true);
                  setUserActionTarget(null);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: isDark ? '#222' : '#FAFAFA',
                }}
              >
                <Feather name="shield" size={18} color={textPrimary} style={{ marginRight: 12 }} />
                <Text fontSize="$4" color={textPrimary}>
                  {language === 'sv' ? 'Ändra roll' : 'Change role'}
                </Text>
                <Text fontSize="$3" color={textSecondary} marginLeft="auto">
                  {roleLabel(userActionTarget.role)}
                </Text>
              </TouchableOpacity>

              {/* Deactivate/Reactivate */}
              <TouchableOpacity
                onPress={handleDeactivateUser}
                disabled={processingAction}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: isDeactivated ? '#00E6C315' : '#FF6B6B15',
                  opacity: processingAction ? 0.5 : 1,
                }}
              >
                {processingAction ? (
                  <Spinner size="small" color={isDeactivated ? '#00E6C3' : '#FF6B6B'} />
                ) : (
                  <>
                    <Feather
                      name={isDeactivated ? 'user-check' : 'user-x'}
                      size={18}
                      color={isDeactivated ? '#00E6C3' : '#FF6B6B'}
                      style={{ marginRight: 12 }}
                    />
                    <Text fontSize="$4" color={isDeactivated ? '#00E6C3' : '#FF6B6B'}>
                      {isDeactivated
                        ? (language === 'sv' ? 'Återaktivera' : 'Reactivate')
                        : (language === 'sv' ? 'Inaktivera' : 'Deactivate')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </YStack>
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <Screen>
        <Header title={tx('admin.title', 'Admin Dashboard', 'Adminpanel')} showBack />
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Spinner size="large" color="#00E6C3" />
        </YStack>
      </Screen>
    );
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <Screen scroll={false} padding={false}>
      <Header title={tx('admin.title', 'Admin Dashboard', 'Adminpanel')} showBack />
      <FlatList
        data={[{ key: 'content' }]}
        keyExtractor={(item) => item.key}
        renderItem={() => (
          <YStack
            padding="$4"
            gap="$3"
            backgroundColor={screenBg}
            minHeight="100%"
          >
            {renderTabBar()}

            {activeTab === 'stats' && renderStatsTab()}
            {activeTab === 'users' && renderUsersTab()}
            {activeTab === 'schools' && renderSchoolsTab()}
            {activeTab === 'routes' && renderRoutesTab()}
            {activeTab === 'settings' && renderSettingsTab()}
          </YStack>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      {/* Reuse existing sheets */}
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

      {/* Modals */}
      {renderRoleModal()}
      {renderUserActionModal()}
    </Screen>
  );
}
