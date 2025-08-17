import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type RelationshipReview = Database['public']['Tables']['relationship_reviews']['Row'] & {
  reviewer_profile?: {
    full_name: string;
    role: string;
  };
};

type UserRating = {
  averageRating: number;
  reviewCount: number;
  canReview: boolean;
  alreadyReviewed: boolean;
};

export class RelationshipReviewService {
  /**
   * Get all reviews for a specific user profile
   */
  static async getReviewsForUser(userId: string): Promise<RelationshipReview[]> {
    const { data, error } = await supabase
      .from('relationship_reviews')
      .select(`
        *,
        reviewer_profile:profiles!reviewer_id(full_name, role)
      `)
      .or(`student_id.eq.${userId},supervisor_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user reviews:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get user's average rating and review count
   */
  static async getUserRating(userId: string, userRole: string): Promise<UserRating> {
    try {
      // Check if current user can review this profile user
      const currentUser = (await supabase.auth.getUser()).data.user;
      let canReview = false;
      let alreadyReviewed = false;

      if (currentUser && currentUser.id !== userId) {
        // Check if they have a relationship
        const { data: relationship } = await supabase
          .from('supervisor_student_relationships')
          .select('*')
          .or(`and(student_id.eq.${currentUser.id},supervisor_id.eq.${userId}),and(student_id.eq.${userId},supervisor_id.eq.${currentUser.id})`)
          .single();

        canReview = !!relationship;

        if (canReview) {
          // Check if already reviewed
          const { data: existingReview } = await supabase
            .from('relationship_reviews')
            .select('id')
            .eq('reviewer_id', currentUser.id)
            .or(`and(student_id.eq.${userId},supervisor_id.eq.${currentUser.id}),and(student_id.eq.${currentUser.id},supervisor_id.eq.${userId})`)
            .single();

          alreadyReviewed = !!existingReview;
        }
      }

      // Get average rating based on role
      let averageRating = 0;
      let reviewCount = 0;

      if (userRole === 'student') {
        const { data } = await supabase
          .from('relationship_reviews')
          .select('rating')
          .eq('student_id', userId)
          .eq('review_type', 'supervisor_reviews_student');

        if (data && data.length > 0) {
          averageRating = data.reduce((sum, review) => sum + review.rating, 0) / data.length;
          reviewCount = data.length;
        }
      } else if (userRole === 'instructor' || userRole === 'supervisor') {
        const { data } = await supabase
          .from('relationship_reviews')
          .select('rating')
          .eq('supervisor_id', userId)
          .eq('review_type', 'student_reviews_supervisor');

        if (data && data.length > 0) {
          averageRating = data.reduce((sum, review) => sum + review.rating, 0) / data.length;
          reviewCount = data.length;
        }
      }

      return {
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        reviewCount,
        canReview: canReview && !alreadyReviewed,
        alreadyReviewed,
      };
    } catch (error) {
      console.error('Error getting user rating:', error);
      return {
        averageRating: 0,
        reviewCount: 0,
        canReview: false,
        alreadyReviewed: false,
      };
    }
  }

  /**
   * Submit a new relationship review
   */
  static async submitReview(
    profileUserId: string,
    profileUserRole: string,
    rating: number,
    content: string,
    isAnonymous: boolean = false
  ): Promise<void> {
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Determine review type and relationship IDs
    const reviewType = profileUserRole === 'student' 
      ? 'supervisor_reviews_student' 
      : 'student_reviews_supervisor';
    
    const studentId = profileUserRole === 'student' ? profileUserId : currentUser.id;
    const supervisorId = profileUserRole === 'student' ? currentUser.id : profileUserId;

    const { error } = await supabase
      .from('relationship_reviews')
      .insert({
        student_id: studentId,
        supervisor_id: supervisorId,
        reviewer_id: currentUser.id,
        rating,
        content,
        review_type: reviewType,
        is_anonymous: isAnonymous,
      });

    if (error) {
      console.error('Error submitting relationship review:', error);
      throw error;
    }
  }

  /**
   * Get top rated users by role (for featuring)
   */
  static async getTopRatedUsers(role: string, limit: number = 10) {
    const reviewTypeCondition = role === 'student' 
      ? 'supervisor_reviews_student'
      : 'student_reviews_supervisor';

    const userIdField = role === 'student' ? 'student_id' : 'supervisor_id';

    const { data, error } = await supabase.rpc('get_top_rated_users', {
      target_role: role,
      review_type: reviewTypeCondition,
      user_id_field: userIdField,
      result_limit: limit
    });

    if (error) {
      console.error('Error fetching top rated users:', error);
      return [];
    }

    return data || [];
  }
}
