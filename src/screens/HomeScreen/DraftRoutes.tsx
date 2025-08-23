import React, { useState, useEffect } from 'react';
import { YStack, XStack, Text, Card } from 'tamagui';
import { TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { SectionHeader } from '../../components/SectionHeader';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from '../../contexts/TranslationContext';

type DraftRoute = {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  waypoint_details: any[];
  drawing_mode?: string;
};

export function DraftRoutes() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const [drafts, setDrafts] = useState<DraftRoute[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadDrafts();
    }
  }, [user]);

  const loadDrafts = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('routes')
        .select('id, name, description, created_at, waypoint_details, drawing_mode')
        .eq('creator_id', user.id)
        .eq('is_draft', true)
        .eq('visibility', 'private')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setDrafts(data || []);
    } catch (error) {
      console.error('Error loading drafts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDraftPress = (draft: DraftRoute) => {
    // Navigate to RouteDetailScreen to view the draft
    navigation.navigate('RouteDetail', { routeId: draft.id });
  };

  const handleSeeAllDrafts = () => {
    navigation.navigate('RouteList', {
      title: 'Draft Routes',
      routes: [],
      type: 'drafts',
      activeFilter: { label: 'Drafts', type: 'drafts' }
    });
  };

  // Don't render anything if no user or no drafts
  if (!user || drafts.length === 0) {
    return null;
  }

  return (
    <YStack gap="$3" paddingHorizontal="$4">
      <SectionHeader
        title="Draft Routes"
        subtitle={`${drafts.length} draft${drafts.length !== 1 ? 's' : ''}`}
        variant="chevron"
        onAction={handleSeeAllDrafts}
        actionLabel={t('common.seeAll')}
        icon={<Feather name="edit-3" size={18} color="#666" />}
      />
      
      <YStack gap="$2">
        {drafts.slice(0, 3).map((draft) => (
          <TouchableOpacity
            key={draft.id}
            onPress={() => handleDraftPress(draft)}
            activeOpacity={0.7}
          >
            <Card
              backgroundColor="$backgroundStrong"
              bordered
              padding="$3"
              borderRadius="$4"
            >
              <XStack alignItems="center" justifyContent="space-between">
                <YStack flex={1} gap="$1">
                  <XStack alignItems="center" gap="$2">
                    <Feather name="edit-3" size={14} color="#FF9500" />
                    <Text fontSize="$4" fontWeight="600" color="$color">
                      {draft.name}
                    </Text>
                  </XStack>
                  
                  {draft.description && (
                    <Text fontSize="$3" color="$gray11" numberOfLines={1}>
                      {draft.description}
                    </Text>
                  )}
                  
                  <XStack alignItems="center" gap="$3">
                    <XStack alignItems="center" gap="$1">
                      <Feather name="map-pin" size={12} color="#666" />
                      <Text fontSize="$2" color="$gray9">
                        {draft.waypoint_details?.length || 0} waypoints
                      </Text>
                    </XStack>
                    
                    <XStack alignItems="center" gap="$1">
                      <Feather name="clock" size={12} color="#666" />
                      <Text fontSize="$2" color="$gray9">
                        {new Date(draft.created_at).toLocaleDateString()}
                      </Text>
                    </XStack>
                  </XStack>
                </YStack>
                
                <XStack alignItems="center" gap="$2">
                  <Text fontSize="$2" color="#FF9500" fontWeight="600">
                    DRAFT
                  </Text>
                  <Feather name="chevron-right" size={16} color="#666" />
                </XStack>
              </XStack>
            </Card>
          </TouchableOpacity>
        ))}
      </YStack>
    </YStack>
  );
}
