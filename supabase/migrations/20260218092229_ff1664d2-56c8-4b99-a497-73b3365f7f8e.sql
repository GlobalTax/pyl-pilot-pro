
CREATE TABLE public.pyl_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE SET NULL,
  local_code text NOT NULL,
  year text NOT NULL,
  month text NOT NULL,
  filename text NOT NULL,
  content text NOT NULL,
  lines_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  source text NOT NULL DEFAULT 'excel',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(local_code, year, month)
);

ALTER TABLE public.pyl_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pyl_files" ON public.pyl_files FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can view all pyl_files" ON public.pyl_files FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can insert own pyl_files" ON public.pyl_files FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own pyl_files" ON public.pyl_files FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own pyl_files" ON public.pyl_files FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "Admins can do everything on pyl_files" ON public.pyl_files FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
