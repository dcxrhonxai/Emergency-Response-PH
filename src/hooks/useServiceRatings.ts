import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ServiceRating {
  id: string;
  service_id: string;
  user_id: string;
  rating: number;
  review: string | null;
  created_at: string;
  updated_at: string;
}

interface AverageRating {
  service_id: string;
  average: number;
  count: number;
}

export const useServiceRatings = (serviceId?: string) => {
  const [ratings, setRatings] = useState<ServiceRating[]>([]);
  const [userRating, setUserRating] = useState<ServiceRating | null>(null);
  const [averageRating, setAverageRating] = useState<AverageRating | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRatings = async () => {
    if (!serviceId) return;

    setLoading(true);
    try {
      // Fetch all ratings for this service
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('service_ratings')
        .select('*')
        .eq('service_id', serviceId)
        .order('created_at', { ascending: false });

      if (ratingsError) throw ratingsError;
      setRatings(ratingsData || []);

      // Calculate average
      if (ratingsData && ratingsData.length > 0) {
        const avg = ratingsData.reduce((sum, r) => sum + r.rating, 0) / ratingsData.length;
        setAverageRating({
          service_id: serviceId,
          average: Math.round(avg * 10) / 10,
          count: ratingsData.length,
        });
      } else {
        setAverageRating(null);
      }

      // Check if current user has rated
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const userRatingData = ratingsData?.find(r => r.user_id === user.id);
        setUserRating(userRatingData || null);
      }
    } catch (error) {
      console.error('Error fetching ratings:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitRating = async (rating: number, review?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !serviceId) {
        toast({
          title: 'Authentication Required',
          description: 'Please log in to rate services.',
          variant: 'destructive',
        });
        return;
      }

      if (userRating) {
        // Update existing rating
        const { error } = await supabase
          .from('service_ratings')
          .update({ rating, review, updated_at: new Date().toISOString() })
          .eq('id', userRating.id);

        if (error) throw error;
        toast({ title: 'Rating Updated', description: 'Your rating has been updated.' });
      } else {
        // Insert new rating
        const { error } = await supabase
          .from('service_ratings')
          .insert({
            service_id: serviceId,
            user_id: user.id,
            rating,
            review,
          });

        if (error) throw error;
        toast({ title: 'Rating Submitted', description: 'Thank you for your feedback!' });
      }

      await fetchRatings();
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit rating. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const deleteRating = async () => {
    if (!userRating) return;

    try {
      const { error } = await supabase
        .from('service_ratings')
        .delete()
        .eq('id', userRating.id);

      if (error) throw error;
      toast({ title: 'Rating Deleted', description: 'Your rating has been removed.' });
      await fetchRatings();
    } catch (error) {
      console.error('Error deleting rating:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete rating.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchRatings();
  }, [serviceId]);

  return {
    ratings,
    userRating,
    averageRating,
    loading,
    submitRating,
    deleteRating,
    refreshRatings: fetchRatings,
  };
};
