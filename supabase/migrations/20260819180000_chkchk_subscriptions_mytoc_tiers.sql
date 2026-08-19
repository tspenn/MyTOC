-- Allow MyTOC Solo/Team Command plan tiers on the shared subscriptions table
DO $$
DECLARE v_con text;
BEGIN
  SELECT conname INTO v_con
  FROM pg_constraint
  WHERE conrelid = 'public.chkchk_subscriptions'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%plan_tier%';
  IF v_con IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.chkchk_subscriptions DROP CONSTRAINT %I', v_con);
  END IF;
END $$;

ALTER TABLE public.chkchk_subscriptions
  ADD CONSTRAINT chkchk_subscriptions_plan_tier_check
  CHECK (
    plan_tier IS NULL OR plan_tier = ANY (ARRAY[
      'captain'::text, 'coach'::text, 'admin'::text, 'solo'::text, 'team'::text
    ])
  );
