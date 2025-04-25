import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { InsertReview } from "@shared/schema";

export function ReviewDialog({
  bookingId,
  isOpen,
  onClose,
}: {
  bookingId: number;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<FileList | null>(null);

  const reviewMutation = useMutation({
    mutationFn: async (data: InsertReview) => {
      const formData = new FormData();
      formData.append("bookingId", bookingId.toString());
      formData.append("rating", rating.toString());
      formData.append("comment", comment);

      if (photos) {
        Array.from(photos).forEach((photo) => {
          formData.append("photos", photo);
        });
      }

      const res = await fetch("/api/reviews", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to submit review");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/user"] });
      toast({
        title: "Review submitted",
        description: "Thank you for your feedback!",
      });
      onClose();
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Write a Review</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            reviewMutation.mutate({
              bookingId,
              rating,
              comment: comment || null,
            });
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium">Rating</label>
            <Input
              type="number"
              min="1"
              max="5"
              value={rating}
              onChange={(e) => setRating(parseInt(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Comment</label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience..."
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Photos</label>
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setPhotos(e.target.files)}
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={reviewMutation.isPending}
          >
            {reviewMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Submit Review
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}