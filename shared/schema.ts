import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["provider", "customer"] }).notNull(),
  city: text("city").notNull(),
  walletBalance: integer("wallet_balance").notNull().default(0),
  isVerified: boolean("is_verified").notNull().default(false),
});

export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull(),
  make: text("make").notNull(),
  model: text("model").notNull(),
  year: integer("year").notNull(),
  price: integer("price").notNull(),
  city: text("city").notNull(),
  available: boolean("available").notNull().default(true),
  imageUrl: text("image_url").notNull(),
  type: text("type", { enum: ["car", "suv", "bike"] }).notNull(),
  fuelType: text("fuel_type", { enum: ["petrol", "diesel", "electric"] }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").notNull(),
  customerId: integer("customer_id").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: text("status", { enum: ["pending", "confirmed", "completed", "cancelled"] }).notNull(),
  totalAmount: integer("total_amount").notNull(),
  paymentStatus: text("payment_status", { enum: ["pending", "completed", "refunded"] }).notNull(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
  city: true,
});

export const insertVehicleSchema = createInsertSchema(vehicles).pick({
  make: true,
  model: true,
  year: true,
  price: true,
  city: true,
  imageUrl: true,
  type: true,
  fuelType: true,
});

export const insertBookingSchema = z.object({
  vehicleId: z.number(),
  startDate: z.string().transform(str => new Date(str)),
  endDate: z.string().transform(str => new Date(str))
});

export const insertReviewSchema = createInsertSchema(reviews).pick({
  bookingId: true,
  rating: true,
  comment: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type User = typeof users.$inferSelect;
export type Vehicle = typeof vehicles.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Review = typeof reviews.$inferSelect;