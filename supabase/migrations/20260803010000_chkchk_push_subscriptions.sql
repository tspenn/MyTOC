-- Push subscriptions for Web Push notifications
CREATE TABLE IF NOT EXISTS public.chkchk_push_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subscription jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
);

CREATE UNIQUE INDEX IF NOT EXISTS chkchk_push_subs_user_endpoint
  ON public.chkchk_push_subscriptions (user_id, (subscription->>'endpoint'));

ALTER TABLE public.chkchk_push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own push subscriptions"
  ON public.chkchk_push_subscriptions
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Service role can read all subscriptions (for Edge Function to send notifications)
CREATE POLICY "service role reads all subscriptions"
  ON public.chkchk_push_subscriptions
  FOR SELECT TO service_role USING (true);
