import { insertUserSchema, type User, type InsertUser, type Vehicle, type InsertVehicle, type Booking, type InsertBooking, type Review, type InsertReview } from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Vehicle operations
  createVehicle(vehicle: InsertVehicle & { providerId: number }): Promise<Vehicle>;
  getVehicle(id: number): Promise<Vehicle | undefined>;
  getVehiclesByCity(city: string | null): Promise<Vehicle[]>;
  getProviderVehicles(providerId: number): Promise<Vehicle[]>;
  updateVehicleAvailability(id: number, available: boolean): Promise<void>;

  // Booking operations
  createBooking(booking: InsertBooking & { customerId: number }): Promise<Booking>;
  getBooking(id: number): Promise<Booking | undefined>;
  getUserBookings(userId: number): Promise<Booking[]>;
  updateBookingStatus(id: number, status: Booking["status"]): Promise<void>;

  // Wallet operations
  updateWalletBalance(userId: number, newBalance: number): Promise<void>;

  // Review operations
  createReview(review: InsertReview): Promise<Review>;
  getVehicleReviews(vehicleId: number): Promise<Review[]>;

  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private vehicles: Map<number, Vehicle>;
  private bookings: Map<number, Booking>;
  private reviews: Map<number, Review>;
  sessionStore: session.Store;
  private currentUserId: number;
  private currentVehicleId: number;
  private currentBookingId: number;
  private currentReviewId: number;

  constructor() {
    this.users = new Map();
    this.vehicles = new Map();
    this.bookings = new Map();
    this.reviews = new Map();
    this.currentUserId = 1;
    this.currentVehicleId = 1;
    this.currentBookingId = 1;
    this.currentReviewId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = {
      ...insertUser,
      id,
      walletBalance: 0,
      isVerified: false,
    };
    this.users.set(id, user);
    return user;
  }

  async createVehicle(vehicle: InsertVehicle & { providerId: number }): Promise<Vehicle> {
    const id = this.currentVehicleId++;
    const newVehicle: Vehicle = {
      ...vehicle,
      id,
      available: true,
      createdAt: new Date(),
    };
    this.vehicles.set(id, newVehicle);
    return newVehicle;
  }

  async getVehicle(id: number): Promise<Vehicle | undefined> {
    return this.vehicles.get(id);
  }

  async getVehiclesByCity(city: string | null): Promise<Vehicle[]> {
    if (!city) {
      return Array.from(this.vehicles.values()).filter(
        (vehicle) => vehicle.available
      );
    }
    return Array.from(this.vehicles.values()).filter(
      (vehicle) => 
        vehicle.city.toLowerCase().includes(city.toLowerCase()) && 
        vehicle.available
    );
  }

  async getProviderVehicles(providerId: number): Promise<Vehicle[]> {
    return Array.from(this.vehicles.values()).filter(
      (vehicle) => vehicle.providerId === providerId
    );
  }

  async updateVehicleAvailability(id: number, available: boolean): Promise<void> {
    const vehicle = await this.getVehicle(id);
    if (vehicle) {
      this.vehicles.set(id, { ...vehicle, available });
    }
  }

  async createBooking(booking: InsertBooking & { 
    customerId: number, 
    totalCost?: number, 
    paymentStatus?: "pending" | "completed" | "refunded" 
  }): Promise<Booking> {
    const id = this.currentBookingId++;
    const newBooking: Booking = {
      ...booking,
      id,
      status: "pending",
      totalAmount: booking.totalCost || 0,
      paymentStatus: booking.paymentStatus || "pending",
    };
    this.bookings.set(id, newBooking);
    return newBooking;
  }

  async getBooking(id: number): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }

  async getUserBookings(userId: number): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(
      (booking) => booking.customerId === userId
    );
  }

  async updateBookingStatus(id: number, status: Booking["status"]): Promise<void> {
    const booking = await this.getBooking(id);
    if (booking) {
      this.bookings.set(id, { ...booking, status });
    }
  }

  async updateWalletBalance(userId: number, newBalance: number): Promise<void> {
    const user = await this.getUser(userId);
    if (user) {
      this.users.set(userId, { ...user, walletBalance: newBalance });
    }
  }

  async createReview(review: InsertReview): Promise<Review> {
    const id = this.currentReviewId++;
    const newReview: Review = {
      ...review,
      id,
      comment: review.comment || null,
      createdAt: new Date(),
    };
    this.reviews.set(id, newReview);
    return newReview;
  }

  async getVehicleReviews(vehicleId: number): Promise<Review[]> {
    const bookings = Array.from(this.bookings.values()).filter(
      (booking) => booking.vehicleId === vehicleId
    );
    const bookingIds = bookings.map((booking) => booking.id);

    return Array.from(this.reviews.values()).filter(
      (review) => bookingIds.includes(review.bookingId)
    );
  }
}

export const storage = new MemStorage();