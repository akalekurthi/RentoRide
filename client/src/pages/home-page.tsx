import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Vehicle } from "@shared/schema";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type FilterOptions = {
  vehicleType: string;
  fuelType: string;
  priceRange: [number, number];
  sortBy: string;
};

export default function HomePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [city, setCity] = useState(user?.city || "all");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    vehicleType: "all",
    fuelType: "all",
    priceRange: [0, 1000],
    sortBy: "price-asc",
  });

  const { data: vehicles, isLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles/city", city],
    queryFn: async () => {
      const res = await fetch(`/api/vehicles/city/${encodeURIComponent(city || "all")}`);
      if (!res.ok) throw new Error("Failed to fetch vehicles");
      return res.json();
    },
  });

  const bookingMutation = useMutation({
    mutationFn: async ({
      vehicleId,
      startDate,
      endDate,
    }: {
      vehicleId: number;
      startDate: Date;
      endDate: Date;
    }) => {
      const res = await apiRequest("POST", "/api/bookings", {
        vehicleId,
        startDate,
        endDate,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Booking successful",
        description: "Check your dashboard for booking details",
      });
    },
  });

  const handleBook = (vehicleId: number) => {
    if (!startDate || !endDate) {
      toast({
        title: "Please select dates",
        description: "You need to select a start and end date",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in to book a vehicle",
        variant: "destructive",
      });
      return;
    }

    // Validate that end date is after start date
    if (endDate <= startDate) {
      toast({
        title: "Invalid date range",
        description: "End date must be after start date",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Processing booking",
      description: "Please wait while we process your booking",
    });

    console.log("Booking vehicle:", vehicleId, "from", startDate.toISOString(), "to", endDate.toISOString());

    bookingMutation.mutate({
      vehicleId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
  };

  const filteredVehicles = vehicles?.filter((vehicle) => {
    if (filters.vehicleType !== "all" && vehicle.type !== filters.vehicleType) return false;
    if (filters.fuelType !== "all" && vehicle.fuelType !== filters.fuelType) return false;
    if (vehicle.price < filters.priceRange[0] || vehicle.price > filters.priceRange[1]) return false;
    return true;
  });

  const sortedVehicles = filteredVehicles?.sort((a, b) => {
    switch (filters.sortBy) {
      case "price-asc":
        return a.price - b.price;
      case "price-desc":
        return b.price - a.price;
      case "newest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      default:
        return 0;
    }
  });

  return (
    <div className="min-h-screen">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">Find Your Perfect Rental Car</h1>
            <p className="text-lg text-muted-foreground">
              Search available cars in your city
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex gap-4">
              <Input
                placeholder="Enter city..."
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="flex-1"
              />
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[140px]">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "MMM d") : "Start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[140px]">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "MMM d") : "End date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      disabled={(date) => date < (startDate || new Date())}
                    />
                  </PopoverContent>
                </Popover>

                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {showFilters && (
              <Card>
                <CardContent className="pt-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Vehicle Type</label>
                      <Select
                        value={filters.vehicleType}
                        onValueChange={(value) =>
                          setFilters({ ...filters, vehicleType: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="car">Car</SelectItem>
                          <SelectItem value="suv">SUV</SelectItem>
                          <SelectItem value="bike">Bike</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Fuel Type</label>
                      <Select
                        value={filters.fuelType}
                        onValueChange={(value) =>
                          setFilters({ ...filters, fuelType: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select fuel type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="petrol">Petrol</SelectItem>
                          <SelectItem value="diesel">Diesel</SelectItem>
                          <SelectItem value="electric">Electric</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Price Range</label>
                      <Slider
                        value={filters.priceRange}
                        onValueChange={(value) =>
                          setFilters({ ...filters, priceRange: value as [number, number] })
                        }
                        min={0}
                        max={1000}
                        step={50}
                      />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>${filters.priceRange[0]}</span>
                        <span>${filters.priceRange[1]}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Sort By</label>
                      <Select
                        value={filters.sortBy}
                        onValueChange={(value) =>
                          setFilters({ ...filters, sortBy: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select sorting" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="price-asc">Price: Low to High</SelectItem>
                          <SelectItem value="price-desc">Price: High to Low</SelectItem>
                          <SelectItem value="newest">Newest First</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : sortedVehicles?.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>No vehicles available{city ? ` in ${city}` : ""}.</p>
              {user?.role === "provider" && (
                <p className="mt-2">
                  As a provider, you can{" "}
                  <a href="/listing" className="text-primary hover:underline">
                    list your vehicle
                  </a>{" "}
                  for rental.
                </p>
              )}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {sortedVehicles?.map((vehicle) => (
                <Card key={vehicle.id}>
                  <CardHeader>
                    <CardTitle>
                      {vehicle.make} {vehicle.model}
                    </CardTitle>
                    <CardDescription>
                      {vehicle.year} • {vehicle.fuelType}
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
                  <CardFooter className="flex justify-between items-center">
                    <div className="text-2xl font-bold">
                      ${vehicle.price}/day
                    </div>
                    <Button
                      onClick={() => handleBook(vehicle.id)}
                      disabled={
                        bookingMutation.isPending || !startDate || !endDate
                      }
                    >
                      {bookingMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Book Now
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}