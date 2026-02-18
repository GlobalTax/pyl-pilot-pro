
-- Create user_type enum
CREATE TYPE public.user_type AS ENUM ('nrro', 'franquiciado');

-- Add user_type column to profiles
ALTER TABLE public.profiles ADD COLUMN user_type public.user_type NOT NULL DEFAULT 'franquiciado';

-- Create security definer function to check user type
CREATE OR REPLACE FUNCTION public.get_user_type(_user_id uuid)
RETURNS public.user_type
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_type FROM public.profiles WHERE id = _user_id
$$;

-- Update restaurant SELECT policy: NRRO users can see ALL restaurants
DROP POLICY IF EXISTS "Users can view assigned restaurants" ON public.restaurants;
CREATE POLICY "Users can view assigned restaurants" ON public.restaurants
FOR SELECT USING (
  get_user_type(auth.uid()) = 'nrro'
  OR EXISTS (
    SELECT 1 FROM user_restaurants
    WHERE user_restaurants.restaurant_id = restaurants.id
    AND user_restaurants.user_id = auth.uid()
  )
);
