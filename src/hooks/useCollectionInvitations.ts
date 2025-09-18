import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useStudentSwitch } from '../context/StudentSwitchContext';

export interface CollectionInvitation {
  id: string;
  preset_id: string;
  collection_name: string;
  invited_by_name: string;
  role: string;
  message?: string;
  created_at: string;
  expires_at: string;
}

export function useCollectionInvitations() {
  const { getEffectiveUserId } = useStudentSwitch();
  const [invitations, setInvitations] = useState<CollectionInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveUserId = getEffectiveUserId();

  const loadInvitations = useCallback(async () => {
    if (!effectiveUserId) return;

    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 [useCollectionInvitations] Loading invitations for user:', effectiveUserId);
      
      // Get pending invitations for the current user
      const { data, error: fetchError } = await supabase
        .from('collection_invitations')
        .select(`
          id,
          preset_id,
          role,
          message,
          created_at,
          expires_at,
          map_presets!inner(
            name
          ),
          invited_by:profiles!collection_invitations_invited_by_user_id_fkey(
            display_name,
            first_name,
            last_name
          )
        `)
        .eq('invited_user_id', effectiveUserId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString()) // Only non-expired invitations
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('❌ [useCollectionInvitations] Error loading invitations:', fetchError);
        throw fetchError;
      }

      const transformedInvitations: CollectionInvitation[] = (data || []).map(invitation => ({
        id: invitation.id,
        preset_id: invitation.preset_id,
        collection_name: invitation.map_presets.name,
        invited_by_name: invitation.invited_by?.display_name || 
                        invitation.invited_by?.first_name || 
                        'Unknown User',
        role: invitation.role,
        message: invitation.message,
        created_at: invitation.created_at,
        expires_at: invitation.expires_at,
      }));

      console.log('✅ [useCollectionInvitations] Loaded invitations:', transformedInvitations.length);
      setInvitations(transformedInvitations);
    } catch (err) {
      console.error('❌ [useCollectionInvitations] Error loading invitations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load invitations');
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId]);

  const refreshInvitations = useCallback(async () => {
    await loadInvitations();
  }, [loadInvitations]);

  // Load invitations when user changes
  useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);

  // Set up real-time subscription for invitation updates
  useEffect(() => {
    if (!effectiveUserId) return;

    const subscription = supabase
      .channel('collection_invitations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'collection_invitations',
          filter: `invited_user_id=eq.${effectiveUserId}`,
        },
        (payload) => {
          console.log('🔄 [useCollectionInvitations] Real-time update:', payload);
          // Refresh invitations when there are changes
          loadInvitations();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [effectiveUserId, loadInvitations]);

  return {
    invitations,
    loading,
    error,
    refreshInvitations,
  };
}
