import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshControl,
  Alert,
  FlatList,
  TouchableOpacity,
  TextInput,
  Switch,
} from 'react-native';
import { YStack, XStack, ScrollView, Text, Spinner } from 'tamagui';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { DashboardStatCard } from '../components/DashboardStatCard';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../contexts/TranslationContext';
import { useThemePreference } from '../hooks/useThemeOverride';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabKey = 'stats' | 'users' | 'routes' | 'settings';

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
};

type RoleFilter = 'all' | 'student' | 'instructor' | 'school' | 'admin';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AdminDashboardScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { effectiveTheme } = useThemePreference();
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
  const [deactivatingUser, setDeactivatingUser] = useState<string | null>(null);

  // Routes state
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [routeSearch, setRouteSearch] = useState('');
  const [routesPage, setRoutesPage] = useState(0);
  const [routesHasMore, setRoutesHasMore] = useState(true);
  const [deletingRoute, setDeletingRoute] = useState<string | null>(null);

  // Settings state
  const [showSchoolsDefault, setShowSchoolsDefault] = useState(false);
  const [showInstructorsDefault, setShowInstructorsDefault] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

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
  // Data loading: Routes
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
          .select(
            'id, name, difficulty, created_at, created_by, profiles:created_by(full_name)',
          )
          .order('created_at', { ascending: false })
          .range(from, to);

        if (routeSearch.trim().length > 0) {
          query = query.ilike('name', `%${routeSearch.trim()}%`);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        const items: RouteItem[] = (data || []).map((r: any) => ({
          id: r.id,
          name: r.name || 'Unnamed Route',
          difficulty: r.difficulty || null,
          created_at: r.created_at || '',
          creator_name: (r.profiles as any)?.full_name || 'Unknown',
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
    [routeSearch],
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
    if (activeTab === 'routes') {
      setRoutesPage(0);
      loadRoutes(0, false);
    }
    if (activeTab === 'settings' && !settingsLoaded) {
      loadSettings();
    }
  }, [activeTab, loadUsers, loadRoutes, loadSettings, settingsLoaded]);

  // Re-fetch users when search or filter changes (debounced)
  useEffect(() => {
    if (activeTab === 'users') {
      const timer = setTimeout(() => {
        setUsersPage(0);
        loadUsers(0, false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [userSearch, roleFilter, activeTab, loadUsers]);

  // Re-fetch routes when search changes (debounced)
  useEffect(() => {
    if (activeTab === 'routes') {
      const timer = setTimeout(() => {
        setRoutesPage(0);
        loadRoutes(0, false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [routeSearch, activeTab, loadRoutes]);

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
    if (activeTab === 'users') loadUsers(0, false);
    if (activeTab === 'routes') loadRoutes(0, false);
    if (activeTab === 'settings') loadSettings();
  };

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const handleDeactivateUser = (userId: string) => {
    Alert.alert(
      t('admin.confirmDelete') || 'Are you sure?',
      t('admin.deactivateUserConfirm') || 'This will deactivate the user account.',
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('admin.deactivateUser') || 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            setDeactivatingUser(userId);
            try {
              const { error: updateErr } = await supabase
                .from('profiles')
                .update({ account_status: 'deleted' })
                .eq('id', userId);

              if (updateErr) throw updateErr;

              setUsers((prev) =>
                prev.map((u) =>
                  u.id === userId ? { ...u, account_status: 'deleted' } : u,
                ),
              );
              // Refresh stats after deactivation
              loadStats();
            } catch (error) {
              console.error('Error deactivating user:', error);
              Alert.alert(
                t('common.error') || 'Error',
                t('admin.deactivateFailed') || 'Failed to deactivate user.',
              );
            } finally {
              setDeactivatingUser(null);
            }
          },
        },
      ],
    );
  };

  const handleDeleteRoute = (routeId: string) => {
    Alert.alert(
      t('admin.confirmDelete') || 'Are you sure?',
      t('admin.deleteRouteConfirm') || 'This will permanently delete this route.',
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('admin.deleteRoute') || 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingRoute(routeId);
            try {
              const { error: deleteErr } = await supabase
                .from('routes')
                .delete()
                .eq('id', routeId);

              if (deleteErr) throw deleteErr;

              setRoutes((prev) => prev.filter((r) => r.id !== routeId));
              // Refresh stats after deletion
              loadStats();
            } catch (error) {
              console.error('Error deleting route:', error);
              Alert.alert(
                t('common.error') || 'Error',
                t('admin.deleteRouteFailed') || 'Failed to delete route.',
              );
            } finally {
              setDeletingRoute(null);
            }
          },
        },
      ],
    );
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
      return date.toLocaleDateString(undefined, {
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
        return isDark ? '#555' : '#CCC';
    }
  };

  const difficultyBadgeColor = (difficulty: string | null) => {
    switch (difficulty) {
      case 'easy':
        return '#00E6C3';
      case 'medium':
        return '#FFB800';
      case 'hard':
        return '#FF6B6B';
      default:
        return isDark ? '#555' : '#CCC';
    }
  };

  // ---------------------------------------------------------------------------
  // Tab bar
  // ---------------------------------------------------------------------------

  const tabs: { key: TabKey; label: string; icon: keyof typeof Feather.glyphMap }[] = [
    { key: 'stats', label: t('admin.stats') || 'Stats', icon: 'bar-chart-2' },
    { key: 'users', label: t('admin.users') || 'Users', icon: 'users' },
    { key: 'routes', label: t('admin.routes') || 'Routes', icon: 'map' },
    { key: 'settings', label: t('admin.settings') || 'Settings', icon: 'settings' },
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
          label={t('admin.totalUsers') || 'Total Users'}
          icon="users"
          color="#00E6C3"
        />
        <DashboardStatCard
          value={stats.totalRoutes}
          label={t('admin.totalRoutes') || 'Total Routes'}
          icon="map"
          color="#0A84FF"
        />
      </XStack>
      <XStack gap="$3" flexWrap="wrap">
        <DashboardStatCard
          value={stats.totalSchools}
          label={t('admin.totalSchools') || 'Total Schools'}
          icon="home"
          color="#FFB800"
        />
        <DashboardStatCard
          value={stats.totalSupervisors}
          label={t('admin.totalSupervisors') || 'Total Supervisors'}
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
    { key: 'all', label: t('admin.roleAll') || 'All' },
    { key: 'student', label: t('admin.roleStudent') || 'Student' },
    { key: 'instructor', label: t('admin.roleInstructor') || 'Instructor' },
    { key: 'school', label: t('admin.roleSchool') || 'School' },
    { key: 'admin', label: t('admin.roleAdmin') || 'Admin' },
  ];

  const renderUserItem = ({ item }: { item: UserItem }) => {
    const isDeactivated = item.account_status === 'deleted';

    return (
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
          {/* Avatar placeholder */}
          <YStack
            width={40}
            height={40}
            borderRadius={20}
            backgroundColor={isDark ? '#333' : '#E5E5E5'}
            justifyContent="center"
            alignItems="center"
          >
            <Feather name="user" size={20} color={textSecondary} />
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
              {/* Role badge */}
              <YStack
                paddingHorizontal={8}
                paddingVertical={2}
                borderRadius={10}
                backgroundColor={roleBadgeColor(item.role) + '25'}
              >
                <Text
                  fontSize={11}
                  fontWeight="600"
                  color={roleBadgeColor(item.role)}
                >
                  {item.role}
                </Text>
              </YStack>
            </XStack>
            <Text fontSize="$2" color={textSecondary} numberOfLines={1}>
              {item.email}
            </Text>
            <Text fontSize="$1" color={textMuted}>
              {formatDate(item.created_at)}
            </Text>
          </YStack>

          {/* Deactivate button */}
          {!isDeactivated && item.id !== user?.id && (
            <TouchableOpacity
              onPress={() => handleDeactivateUser(item.id)}
              disabled={deactivatingUser === item.id}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: '#FF444420',
                opacity: deactivatingUser === item.id ? 0.5 : 1,
              }}
            >
              {deactivatingUser === item.id ? (
                <Spinner size="small" color="#FF4444" />
              ) : (
                <Text fontSize="$2" fontWeight="600" color="#FF4444">
                  {t('admin.deactivateUser') || 'Deactivate'}
                </Text>
              )}
            </TouchableOpacity>
          )}

          {isDeactivated && (
            <YStack
              paddingHorizontal={10}
              paddingVertical={6}
              borderRadius={8}
              backgroundColor={isDark ? '#333' : '#F0F0F0'}
            >
              <Text fontSize="$2" fontWeight="600" color={textMuted}>
                {t('admin.deactivated') || 'Deactivated'}
              </Text>
            </YStack>
          )}
        </XStack>
      </YStack>
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
          placeholder={t('admin.searchUsers') || 'Search users...'}
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
                {t('admin.noUsersFound') || 'No users found'}
              </Text>
            </YStack>
          ) : null
        }
      />
    </YStack>
  );

  // ---------------------------------------------------------------------------
  // Renderers: Routes tab
  // ---------------------------------------------------------------------------

  const renderRouteItem = ({ item }: { item: RouteItem }) => (
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
            <Text fontSize="$2" color={textSecondary} numberOfLines={1}>
              {item.creator_name}
            </Text>
            {item.difficulty && (
              <YStack
                paddingHorizontal={8}
                paddingVertical={2}
                borderRadius={10}
                backgroundColor={difficultyBadgeColor(item.difficulty) + '25'}
              >
                <Text
                  fontSize={11}
                  fontWeight="600"
                  color={difficultyBadgeColor(item.difficulty)}
                >
                  {item.difficulty}
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
          disabled={deletingRoute === item.id}
          style={{
            padding: 8,
            opacity: deletingRoute === item.id ? 0.4 : 1,
          }}
        >
          {deletingRoute === item.id ? (
            <Spinner size="small" color="#FF4444" />
          ) : (
            <Feather name="trash-2" size={18} color="#FF4444" />
          )}
        </TouchableOpacity>
      </XStack>
    </YStack>
  );

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
          placeholder={t('admin.searchRoutes') || 'Search routes...'}
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
                {t('admin.noRoutesFound') || 'No routes found'}
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
      {/* Show schools default */}
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
              {t('admin.showSchoolsDefault') || 'Default show schools on map'}
            </Text>
            <Text fontSize="$2" color={textSecondary} marginTop="$1">
              {t('admin.showSchoolsDescription') ||
                'When enabled, schools will be shown on the map by default for all users.'}
            </Text>
          </YStack>
          <Switch
            trackColor={{ false: isDark ? '#555' : '#D1D1D6', true: '#00E6C3' }}
            thumbColor="#FFF"
            value={showSchoolsDefault}
            onValueChange={handleToggleSchoolsDefault}
          />
        </XStack>
      </YStack>

      {/* Show instructors default */}
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
              {t('admin.showInstructorsDefault') || 'Default show instructors on map'}
            </Text>
            <Text fontSize="$2" color={textSecondary} marginTop="$1">
              {t('admin.showInstructorsDescription') ||
                'When enabled, instructors will be shown on the map by default for all users.'}
            </Text>
          </YStack>
          <Switch
            trackColor={{ false: isDark ? '#555' : '#D1D1D6', true: '#00E6C3' }}
            thumbColor="#FFF"
            value={showInstructorsDefault}
            onValueChange={handleToggleInstructorsDefault}
          />
        </XStack>
      </YStack>
    </YStack>
  );

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <Screen>
        <Header title={t('admin.title') || 'Admin Dashboard'} showBack />
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
      <Header title={t('admin.title') || 'Admin Dashboard'} showBack />
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
            {/* Tabs */}
            {renderTabBar()}

            {/* Active tab content */}
            {activeTab === 'stats' && renderStatsTab()}
            {activeTab === 'users' && renderUsersTab()}
            {activeTab === 'routes' && renderRoutesTab()}
            {activeTab === 'settings' && renderSettingsTab()}
          </YStack>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </Screen>
  );
}
