import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertVehicleSchema, insertBookingSchema } from "@shared/schema";
import { insertReviewSchema } from "@shared/schema";
import Stripe from "stripe";

// In development mode, we'll use a mock Stripe implementation
let stripe: Stripe | null = null;

// Do not directly reference potential API keys
// In production, STRIPE_SECRET_KEY should be properly set in environment variables
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (stripeKey && stripeKey.length > 0) {
  try {
    // Only initialize if we have a valid key (don't log or print the key)
    stripe = new Stripe(stripeKey, {
      apiVersion: "2025-02-24.acacia",
    });
    console.log("Stripe initialized successfully");
  } catch (err) {
    console.error("Failed to initialize Stripe:", err);
  }
} else {
  console.warn("No Stripe key available. Payments will be simulated.");
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Wallet routes
  app.post("/api/wallet/create-payment-intent", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }

    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    try {
      if (stripe) {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount * 100, // Convert to cents
          currency: 'usd',
          automatic_payment_methods: {
            enabled: true,
          },
        });
        res.json({ clientSecret: paymentIntent.client_secret });
      } else {
        // Mock payment intent for development
        res.json({ clientSecret: "mock_payment_intent_" + Date.now() });
      }
    } catch (error) {
      console.error('Error creating payment intent:', error);
      res.status(500).json({ error: "Failed to create payment intent" });
    }
  });

  // Vehicle routes
  app.post("/api/vehicles", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "provider") {
      return res.status(403).send("Only providers can create listings");
    }

    try {
      console.log("Vehicle creation request:", req.body);
      const vehicleData = insertVehicleSchema.parse(req.body);
      const vehicle = await storage.createVehicle({
        ...vehicleData,
        providerId: req.user.id,
      });
      console.log("Vehicle created:", vehicle);
      res.status(201).json(vehicle);
    } catch (error: any) {
      console.error("Vehicle creation error:", error);
      res.status(400).json({ error: "Invalid vehicle data", details: error.message });
    }
  });

  app.get("/api/vehicles/city/:city", async (req, res) => {
    try {
      const city = req.params.city === "all" ? null : decodeURIComponent(req.params.city);
      // No need for type assertion anymore since the interface accepts string | null
      const vehicles = await storage.getVehiclesByCity(city);
      console.log(`Found ${vehicles.length} vehicles for city: ${city || 'all'}`);
      res.json(vehicles);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      res.status(500).json({ error: "Failed to fetch vehicles" });
    }
  });

  app.get("/api/vehicles/provider", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "provider") {
      return res.status(403).send("Unauthorized");
    }
    const vehicles = await storage.getProviderVehicles(req.user.id);
    res.json(vehicles);
  });

  // Booking routes
  app.post("/api/bookings", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "customer") {
      return res.status(403).send("Only customers can create bookings");
    }

    try {
      console.log("Booking request data:", req.body);
      const bookingData = insertBookingSchema.parse(req.body);
      console.log("Parsed booking data:", bookingData);
      
      const vehicle = await storage.getVehicle(bookingData.vehicleId);
      console.log("Found vehicle:", vehicle);

      if (!vehicle || !vehicle.available) {
        return res.status(400).json({ error: "Vehicle not available" });
      }

      // Calculate booking cost (assuming price per day)
      const startDate = new Date(bookingData.startDate);
      const endDate = new Date(bookingData.endDate);
      const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      const totalCost = vehicle.price * days;
      
      // Create the booking with payment info
      const booking = await storage.createBooking({
        ...bookingData,
        customerId: req.user.id,
        totalCost,
        paymentStatus: "completed", // Set payment as completed for now
      });

      // Mark vehicle as unavailable
      await storage.updateVehicleAvailability(bookingData.vehicleId, false);
      
      console.log(`Booking created successfully: ${JSON.stringify(booking)}`);
      res.status(201).json(booking);
    } catch (error) {
      console.error('Booking creation error:', error);
      res.status(400).json({ error: "Invalid booking data" });
    }
  });

  app.get("/api/bookings/user", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }
    const bookings = await storage.getUserBookings(req.user.id);
    res.json(bookings);
  });

  app.patch("/api/bookings/:id/status", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }

    const { status } = req.body;
    const booking = await storage.getBooking(parseInt(req.params.id));

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    await storage.updateBookingStatus(booking.id, status);
    if (status === "completed" || status === "cancelled") {
      await storage.updateVehicleAvailability(booking.vehicleId, true);
    }

    res.json({ success: true });
  });


  app.post("/api/wallet/topup", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }

    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    try {
      await storage.updateWalletBalance(req.user.id, req.user.walletBalance + amount);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to top up wallet" });
    }
  });

  // Review routes
  app.post("/api/reviews", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const reviewData = insertReviewSchema.parse(req.body);
      const booking = await storage.getBooking(reviewData.bookingId);

      if (!booking || booking.customerId !== req.user.id) {
        return res.status(403).json({ error: "Not authorized to review this booking" });
      }

      const review = await storage.createReview(reviewData);
      res.status(201).json(review);
    } catch (error) {
      res.status(400).json({ error: "Invalid review data" });
    }
  });

  app.get("/api/reviews/vehicle/:vehicleId", async (req, res) => {
    try {
      const vehicleId = parseInt(req.params.vehicleId);
      const reviews = await storage.getVehicleReviews(vehicleId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}