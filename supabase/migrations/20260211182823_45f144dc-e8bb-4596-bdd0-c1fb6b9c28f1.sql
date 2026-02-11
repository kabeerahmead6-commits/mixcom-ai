
-- Plans table to store subscription plan details
CREATE TABLE public.plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  price_monthly INTEGER NOT NULL DEFAULT 0,
  price_yearly INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Allow everyone to read plans (public pricing page)
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active plans" ON public.plans FOR SELECT USING (is_active = true);

-- User subscriptions table
CREATE TABLE public.user_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL REFERENCES public.plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'pending')),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  amount_paid INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscriptions" ON public.user_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own subscriptions" ON public.user_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own subscriptions" ON public.user_subscriptions FOR UPDATE USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the 5 plans
INSERT INTO public.plans (name, slug, description, features, price_monthly, price_yearly, sort_order) VALUES
  ('Free', 'free', 'Get started with basic features', '["5 AI chats/day", "Basic image generation", "Community support"]'::jsonb, 0, 0, 1),
  ('Elite', 'elite', 'For power users who need more', '["50 AI chats/day", "HD image generation", "Priority support", "Video AI access"]'::jsonb, 14900, 149900, 2),
  ('Pro', 'pro', 'Professional-grade AI tools', '["Unlimited AI chats", "4K image generation", "Priority support", "Video AI", "API access"]'::jsonb, 29900, 299900, 3),
  ('Business', 'business', 'Scale your business with AI', '["Everything in Pro", "Team collaboration", "Custom models", "Dedicated support", "Analytics dashboard"]'::jsonb, 99900, 999900, 4),
  ('Enterprise', 'enterprise', 'Custom solutions for large teams', '["Everything in Business", "Unlimited everything", "SLA guarantee", "Custom integrations", "Account manager"]'::jsonb, 199900, 1999900, 5);
