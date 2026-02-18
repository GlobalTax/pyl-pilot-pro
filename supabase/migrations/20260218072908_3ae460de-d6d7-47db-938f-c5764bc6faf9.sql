
CREATE TABLE public.restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  address text,
  city text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, restaurant_id)
);

ALTER TABLE public.user_restaurants ENABLE ROW LEVEL SECURITY;

-- RLS restaurants
CREATE POLICY "Admins can do everything on restaurants"
  ON public.restaurants FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view assigned restaurants"
  ON public.restaurants FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_restaurants
    WHERE restaurant_id = restaurants.id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can insert restaurants"
  ON public.restaurants FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update assigned restaurants"
  ON public.restaurants FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_restaurants
    WHERE restaurant_id = restaurants.id AND user_id = auth.uid()
  ));

-- RLS user_restaurants
CREATE POLICY "Admins can manage all assignments"
  ON public.user_restaurants FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own assignments"
  ON public.user_restaurants FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own assignments"
  ON public.user_restaurants FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own assignments"
  ON public.user_restaurants FOR DELETE TO authenticated
  USING (user_id = auth.uid());
