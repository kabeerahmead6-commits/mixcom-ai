import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, Crown, Zap, Rocket, Building2, Star, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string;
  features: string[];
  price_monthly: number;
  price_yearly: number;
  currency: string;
  sort_order: number;
}

interface UserSubscription {
  id: string;
  plan_id: string;
  status: string;
  billing_cycle: string;
  expires_at: string | null;
}

const planIcons: Record<string, typeof Crown> = {
  free: Star,
  elite: Zap,
  pro: Crown,
  business: Rocket,
  enterprise: Building2,
};

const planColors: Record<string, string> = {
  free: "border-muted",
  elite: "border-blue-500/50",
  pro: "border-primary/50 ring-2 ring-primary/20",
  business: "border-orange-500/50",
  enterprise: "border-amber-500/50",
};

const Pricing = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => authSub.unsubscribe();
  }, []);

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    if (user) fetchSubscription();
  }, [user]);

  const fetchPlans = async () => {
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    if (data) setPlans(data.map(p => ({ ...p, features: p.features as unknown as string[] })));
    if (error) toast.error("Failed to load plans");
    setLoading(false);
  };

  const fetchSubscription = async () => {
    const { data } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) setSubscription(data);
  };

  const formatPrice = (paise: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(paise / 100);
  };

  const handleSubscribe = async (plan: Plan) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (plan.slug === "free") {
      setProcessing(plan.id);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-razorpay-order`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session?.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ plan_id: plan.id, billing_cycle: billingCycle }),
          }
        );
        const json = await res.json();
        if (json.free) {
          toast.success("Free plan activated!");
          fetchSubscription();
        } else {
          toast.error(json.error || "Failed");
        }
      } catch {
        toast.error("Failed to activate free plan");
      } finally {
        setProcessing(null);
      }
      return;
    }

    setProcessing(plan.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-razorpay-order`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ plan_id: plan.id, billing_cycle: billingCycle }),
        }
      );
      const order = await res.json();

      if (order.error) {
        toast.error(order.error);
        setProcessing(null);
        return;
      }

      // Load Razorpay checkout
      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "MiXCOM AI",
        description: `${order.plan_name} - ${billingCycle} subscription`,
        order_id: order.order_id,
        handler: async (response: any) => {
          // Verify payment
          const verifyRes = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-razorpay-payment`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${session?.access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan_id: plan.id,
                billing_cycle: billingCycle,
              }),
            }
          );
          const result = await verifyRes.json();
          if (result.success) {
            toast.success("Subscription activated successfully! 🎉");
            fetchSubscription();
          } else {
            toast.error(result.error || "Payment verification failed");
          }
        },
        prefill: {
          email: user.email,
        },
        theme: {
          color: "#7C3AED",
        },
        modal: {
          ondismiss: () => setProcessing(null),
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
      toast.error("Failed to initiate payment");
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading plans...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Razorpay script */}
      <script src="https://checkout.razorpay.com/v1/checkout.js" />

      <div className="max-w-7xl mx-auto px-4 py-12 space-y-10">
        {/* Header */}
        <div className="text-center space-y-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="absolute left-4 top-4">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h1 className="text-4xl font-bold gradient-text">Choose Your Plan</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Unlock the full power of MiXCOM AI with a plan that fits your needs
          </p>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                billingCycle === "monthly"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                billingCycle === "yearly"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Yearly
              <Badge variant="secondary" className="ml-2 text-xs">Save 17%</Badge>
            </button>
          </div>
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {plans.map((plan) => {
            const Icon = planIcons[plan.slug] || Star;
            const isCurrentPlan = subscription?.plan_id === plan.id;
            const price = billingCycle === "yearly" ? plan.price_yearly : plan.price_monthly;
            const isPro = plan.slug === "pro";

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col transition-all hover:shadow-lg ${planColors[plan.slug] || ""} ${
                  isPro ? "scale-[1.02] shadow-lg" : ""
                }`}
              >
                {isPro && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="gradient-bg text-primary-foreground px-3">Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto mb-2 p-3 rounded-xl bg-primary/10 w-fit">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <div className="text-center">
                    <span className="text-3xl font-bold">
                      {price === 0 ? "Free" : formatPrice(price)}
                    </span>
                    {price > 0 && (
                      <span className="text-muted-foreground text-sm">
                        /{billingCycle === "yearly" ? "year" : "month"}
                      </span>
                    )}
                  </div>
                  <ul className="space-y-2">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={isPro ? "default" : "outline"}
                    disabled={isCurrentPlan || processing === plan.id}
                    onClick={() => handleSubscribe(plan)}
                  >
                    {isCurrentPlan
                      ? "Current Plan"
                      : processing === plan.id
                      ? "Processing..."
                      : price === 0
                      ? "Get Started"
                      : "Subscribe"}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Current subscription info */}
        {subscription && (
          <Card className="max-w-md mx-auto">
            <CardContent className="p-6 text-center space-y-2">
              <p className="text-sm text-muted-foreground">Your current subscription</p>
              <p className="font-semibold">
                {plans.find((p) => p.id === subscription.plan_id)?.name || "Unknown"} Plan
              </p>
              <p className="text-xs text-muted-foreground">
                {subscription.billing_cycle} · Expires{" "}
                {subscription.expires_at
                  ? new Date(subscription.expires_at).toLocaleDateString()
                  : "Never"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Pricing;
