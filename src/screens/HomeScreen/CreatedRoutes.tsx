import { RouteCard } from '@/src/components/RouteCard';
import { SectionHeader } from '@/src/components/SectionHeader';
import { useAuth } from '@/src/context/AuthContext';
import { useStudentSwitch } from '@/src/context/StudentSwitchContext';
import { useTranslation } from '@/src/contexts/TranslationContext';
import { Route, RouteType } from '@/src/types/route';
import React from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { NavigationProp } from '@/src/types/navigation';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';

export const CreatedRoutes = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { getEffectiveUserId, isViewingAsStudent, activeStudentName } = useStudentSwitch();
  const navigation = useNavigation<NavigationProp>();
  const [createdRoutes, setCreatedRoutes] = React.useState<Route[]>([]);
  
  // Use effective user ID (student if viewing as student, otherwise current user)
  const effectiveUserId = getEffectiveUserId();

  React.useEffect(() => {
    if (!effectiveUserId) return;
    
    const loadCreatedRoutes = async () => {
      console.log('🗺️ [CreatedRoutes] Loading created routes for user:', effectiveUserId);
      console.log('🗺️ [CreatedRoutes] Is viewing as student:', isViewingAsStudent);
      
      try {
        const { data: createdData, error: createdError } = await supabase
          .from('routes')
          .select('*')
          .eq('creator_id', effectiveUserId)
          .order('created_at', { ascending: false });

        if (createdError) throw createdError;

        console.log('🗺️ [CreatedRoutes] Loaded created routes:', createdData?.length || 0);
        setCreatedRoutes(createdData as Route[]);
      } catch (err) {
        console.error('❌ [CreatedRoutes] Error loading created routes:', err);
      }
    };
    loadCreatedRoutes();
  }, [effectiveUserId]);

  const onNavigateToRouteList = React.useCallback(() => {
    navigation.navigate('RouteList', {
      type: 'created',
      title: isViewingAsStudent 
        ? `${activeStudentName || 'Student'}'s Created Routes`
        : t('home.createdRoutes'),
      routes: createdRoutes,
    });
  }, [createdRoutes, navigation, t, isViewingAsStudent, activeStudentName]);

  return (
    <YStack space="$4">
      <SectionHeader
        title={isViewingAsStudent 
          ? `${activeStudentName || 'Student'}'s Created Routes`
          : t('home.createdRoutes')
        }
        variant="chevron"
        onAction={onNavigateToRouteList}
        actionLabel={t('common.seeAll')}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <XStack space="$4" paddingHorizontal="$4">
          {createdRoutes.slice(0, 3).map((route) => (
            <RouteCard key={route.id} route={route} />
          ))}
        </XStack>
      </ScrollView>
    </YStack>
  );
};
