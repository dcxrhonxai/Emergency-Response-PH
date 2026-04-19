-- Drop existing unique constraint on user_id alone (if any) and add composite unique
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_key;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_user_id_product_id_key UNIQUE (user_id, product_id);