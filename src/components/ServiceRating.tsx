import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useServiceRatings } from '@/hooks/useServiceRatings';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface ServiceRatingProps {
  serviceId: string;
  serviceName: string;
  compact?: boolean;
}

export const ServiceRating = ({ serviceId, serviceName, compact = false }: ServiceRatingProps) => {
  const { averageRating, userRating, submitRating, loading } = useServiceRatings(serviceId);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedRating, setSelectedRating] = useState(userRating?.rating || 0);
  const [review, setReview] = useState(userRating?.review || '');
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = async () => {
    if (selectedRating > 0) {
      await submitRating(selectedRating, review || undefined);
      setIsOpen(false);
    }
  };

  const renderStars = (rating: number, interactive = false, size = 'h-4 w-4') => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${size} ${
              star <= (interactive ? hoverRating || selectedRating : rating)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted-foreground'
            } ${interactive ? 'cursor-pointer transition-colors' : ''}`}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            onClick={() => interactive && setSelectedRating(star)}
          />
        ))}
      </div>
    );
  };

  if (compact) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <button className="flex items-center gap-1 text-sm hover:underline">
            {averageRating ? (
              <>
                {renderStars(averageRating.average)}
                <span className="text-muted-foreground">
                  ({averageRating.count})
                </span>
              </>
            ) : (
              <span className="text-muted-foreground text-xs">Rate this service</span>
            )}
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate {serviceName}</DialogTitle>
            <DialogDescription>
              Share your experience with this emergency service
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm font-medium">Your Rating</span>
              {renderStars(selectedRating, true, 'h-8 w-8')}
            </div>
            <Textarea
              placeholder="Write a review (optional)"
              value={review}
              onChange={(e) => setReview(e.target.value)}
              className="min-h-[100px]"
            />
            <Button
              onClick={handleSubmit}
              disabled={selectedRating === 0 || loading}
              className="w-full"
            >
              {userRating ? 'Update Rating' : 'Submit Rating'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="space-y-2">
      {averageRating && (
        <div className="flex items-center gap-2">
          {renderStars(averageRating.average)}
          <span className="text-sm text-muted-foreground">
            {averageRating.average} ({averageRating.count} reviews)
          </span>
        </div>
      )}
    </div>
  );
};
