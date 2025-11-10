import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Modal,
  Animated,
  Pressable,
  View,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Share,
  Linking,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReanimatedAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { YStack, XStack, Text, Card, Progress, useTheme } from 'tamagui';
import { Button } from '../../components/Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '../../../hooks/useThemeColor';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../types/navigation';
import { supabase } from '../../lib/supabase';
import { Feather } from '@expo/vector-icons';
import { Database } from '../../lib/database.types';
import { Map } from './../Map';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Play } from '@tamagui/lucide-icons';
import Carousel from 'react-native-reanimated-carousel';
import { WebView } from 'react-native-webview';
import { ImageWithFallback } from './../ImageWithFallback';
import { ReviewSection } from './../ReviewSection';
import { CommentsSection } from './../CommentsSection';
import { AppAnalytics } from '../../utils/analytics';
import { Region } from '../../types/maps';
import { ReportDialog } from './../report/ReportDialog';
import {
  parseRecordingStats,
  isRecordedRoute,
  formatRecordingStatsDisplay,
} from '../../utils/routeUtils';
import { RouteExerciseList } from './../RouteExerciseList';
import { AddToPresetSheetModal } from './../AddToPresetSheet';
import { useModal } from '../../contexts/ModalContext';
import { IconButton } from './../IconButton';
import { useToast } from '../../contexts/ToastContext';
import { PIN_COLORS } from '../../styles/mapStyles';
import { CreateRouteSheet } from './../CreateRouteSheet';
import { UserProfileSheet } from './../UserProfileSheet';

import { getCarouselItems } from './utils';
import CarouselItem from './CarouselItem';

const { height, width } = Dimensions.get('window');

type DifficultyLevel = Database['public']['Enums']['difficulty_level'];
type RouteRow = Database['public']['Tables']['routes']['Row'];
type Json = Database['public']['Tables']['routes']['Row']['waypoint_details'];

type Review = {
  id: string;
  user_id: string;
  rating: number;
  content: string;
  difficulty: DifficultyLevel;
  visited_at: string;
  images: { url: string }[];
  user?: {
    full_name: string;
  };
};

interface WaypointDetail {
  lat: number;
  lng: number;
  title: string;
  description?: string;
}

interface Exercise {
  id: string;
  title: string;
  description?: string;
  duration?: string;
  has_quiz?: boolean;
  quiz_data?: any;
}

interface MediaAttachment {
  type: 'image' | 'video' | 'youtube';
  url: string;
  description?: string;
}

type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

interface RawWaypointDetail {
  lat?: number | string;
  lng?: number | string;
  title?: string;
  description?: string;
  [key: string]: JsonValue | undefined;
}

interface RawMediaAttachment {
  type?: 'image' | 'video' | 'youtube';
  url?: string;
  description?: string;
  [key: string]: JsonValue | undefined;
}

interface SupabaseRouteResponse
  extends Omit<RouteRow, 'waypoint_details' | 'media_attachments' | 'suggested_exercises'> {
  creator: {
    id: string;
    full_name: string;
  } | null;
  waypoint_details: RawWaypointDetail[];
  media_attachments: RawMediaAttachment[];
  suggested_exercises: any;
  reviews: { count: number }[];
  average_rating: { rating: number }[];
}

type RouteData = Omit<RouteRow, 'waypoint_details' | 'media_attachments'> & {
  waypoint_details: (WaypointDetail & Json)[];
  media_attachments: (MediaAttachment & Json)[];
  exercises?: Exercise[];
  creator?: {
    id: string;
    full_name: string;
  };
  reviews?: { count: number }[];
  average_rating?: { rating: number }[];
};

interface RouteDetailSheetProps {
  visible: boolean;
  onClose: () => void;
  routeId: string | null;
  onStartRoute?: (routeId: string) => void;
  onNavigateToProfile?: (userId: string) => void;
  onReopen?: () => void;
  nearbyRoutes?: Array<{ id: string; name: string; waypoint_details?: any[] }>;
  onRouteChange?: (routeId: string) => void;
}

export default function RouteDetailsCarousel({ routeData }: { routeData: any }) {
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  const carouselItems = React.useMemo(() => getCarouselItems(routeData), [routeData]);
  if (carouselItems.length === 0) return null;

  if (carouselItems.length === 1) {
    return (
      <View
        style={{
          height: height * 0.3,
          borderRadius: 12,
          overflow: 'hidden',
          marginBottom: 16,
        }}
      >
        <CarouselItem item={carouselItems[0]} />
      </View>
    );
  }

  return (
    <View
      style={{
        height: height * 0.3,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 16,
      }}
    >
      <Carousel
        loop
        width={width - 32}
        height={height * 0.3}
        data={carouselItems}
        renderItem={({ item }) => <CarouselItem item={item} />}
        onSnapToItem={setActiveMediaIndex}
      />
      {/* Pagination dots */}
      {carouselItems.length > 1 && (
        <XStack
          position="absolute"
          bottom={16}
          alignSelf="center"
          gap="$2"
          padding="$2"
          backgroundColor="transparent"
          borderRadius="$4"
        >
          {carouselItems.map((_, index) => (
            <View
              key={index}
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: index === activeMediaIndex ? 'white' : 'rgba(255,255,255,0.5)',
              }}
            />
          ))}
        </XStack>
      )}
    </View>
  );
}
