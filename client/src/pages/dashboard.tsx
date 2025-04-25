import { useQuery } from "@tanstack/react-query";
import { Vehicle, Booking } from "@shared/schema";
import { Header } from "@/components/header";
import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { VerifiedBadge } from "@/components/verified-badge"; // Assumed component
import { ReviewDialog } from "@/components/review-dialog"; // Assumed component
import { DashboardCharts } from "@/components/dashboard-charts";

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reviewBookingId, setReviewBookingId] = useState<number | null>(null);

  const { data: bookings, isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings/user"],
  });

  const { data: vehicles, isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles/provider"],
    enabled: user?.role === "provider",
  });

  const updateBookingMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: number;
      status: Booking["status"];
    }) => {
      await apiRequest("PATCH", `/api/bookings/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/user"] });
      toast({
        title: "Booking updated",
        description: "The booking status has been updated",
      });
    },
  });

  if (bookingsLoading || vehiclesLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      {user?.role === "provider" && (
        <div className="mb-8">
          <DashboardCharts />
        </div>
      )}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground mt-2">
                {user?.role === "provider"
                  ? "Manage your vehicle listings and bookings"
                  : "View your rental bookings"}
              </p>
            </div>
            {user?.role === "provider" && user.isVerified && (
              <VerifiedBadge />
            )}
          </div>

          {user?.role === "provider" && vehicles && vehicles.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">Your Vehicles</h2>
              <div className="grid gap-6 md:grid-cols-2">
                {vehicles.map((vehicle) => (
                  <Card key={vehicle.id}>
                    <CardHeader>
                      <CardTitle>
                        {vehicle.make} {vehicle.model}
                      </CardTitle>
                      <CardDescription>
                        {vehicle.year} • ${vehicle.price}/day
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="aspect-video rounded-lg overflow-hidden">
                        <img
                          src={vehicle.imageUrl}
                          alt={`${vehicle.make} ${vehicle.model}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </CardContent>
                    <CardFooter>
                      <div
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          vehicle.available
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {vehicle.available ? "Available" : "Booked"}
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {bookings && bookings.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">
                {user?.role === "provider" ? "Bookings" : "Your Rentals"}
              </h2>
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <Card key={booking.id}>
                    <CardHeader>
                      <CardTitle>
                        Booking #{booking.id}
                      </CardTitle>
                      <CardDescription>
                        {format(new Date(booking.startDate), "MMM d, yyyy")} -{" "}
                        {format(new Date(booking.endDate), "MMM d, yyyy")}
                      </CardDescription>
                    </CardHeader>
                    <CardFooter className="flex justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            booking.status === "confirmed"
                              ? "bg-green-100 text-green-800"
                              : booking.status === "cancelled"
                              ? "bg-red-100 text-red-800"
                              : booking.status === "completed"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {booking.status.charAt(0).toUpperCase() +
                            booking.status.slice(1)}
                        </div>
                        <div
                          className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            booking.paymentStatus === "completed"
                              ? "bg-green-100 text-green-800"
                              : booking.paymentStatus === "refunded"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          Payment: {booking.paymentStatus}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {user?.role === "customer" &&
                          booking.status === "completed" && (
                            <Button
                              variant="outline"
                              onClick={() => setReviewBookingId(booking.id)}
                            >
                              Write Review
                            </Button>
                          )}

                        {user?.role === "provider" &&
                          booking.status === "pending" && (
                            <Select
                              onValueChange={(value) =>
                                updateBookingMutation.mutate({
                                  id: booking.id,
                                  status: value as Booking["status"],
                                })
                              }
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Update status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="confirmed">
                                  Confirm
                                </SelectItem>
                                <SelectItem value="cancelled">
                                  Cancel
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          )}
          {bookings && bookings.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              No bookings found
            </div>
          )}
        </div>
      </main>

      <ReviewDialog
        bookingId={reviewBookingId!}
        isOpen={reviewBookingId !== null}
        onClose={() => setReviewBookingId(null)}
      />
    </div>
  );
}