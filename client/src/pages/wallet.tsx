import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CreditCard } from "lucide-react";
import { motion } from "framer-motion";
import { loadStripe } from "@stripe/stripe-js";

// Initialize Stripe with your publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export default function WalletPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");

  const topUpMutation = useMutation({
    mutationFn: async (amount: number) => {
      // First create payment intent
      const paymentIntent = await apiRequest("POST", "/api/wallet/create-payment-intent", { amount });
      const { clientSecret } = await paymentIntent.json();

      // Initialize Stripe
      const stripe = await stripePromise;
      if (!stripe) throw new Error("Stripe failed to initialize");

      // Use Stripe's built-in payment UI instead of hardcoded values
      const { error: stripeError, paymentIntent: confirmedIntent } = await stripe.confirmCardPayment(
        clientSecret
        // In a real app, we would use Elements UI for secure payment handling
        // For testing, use Stripe test cards in their payment UI: 
        // https://stripe.com/docs/testing#cards
      );

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      // If payment successful, update wallet
      const res = await apiRequest("POST", "/api/wallet/topup", { amount });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Success",
        description: "Wallet topped up successfully",
      });
      setAmount("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Your Wallet</CardTitle>
                <CardDescription>
                  <motion.div
                    initial={{ scale: 1 }}
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 5 }}
                  >
                    Current Balance: ${user?.walletBalance}
                  </motion.div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    topUpMutation.mutate(parseInt(amount));
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder="Enter amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        min="1"
                        className="pl-8"
                      />
                      <CreditCard className="absolute left-2 top-2.5 h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={topUpMutation.isPending || !amount}
                    >
                      {topUpMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Add Money with Stripe
                    </Button>
                  </motion.div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}