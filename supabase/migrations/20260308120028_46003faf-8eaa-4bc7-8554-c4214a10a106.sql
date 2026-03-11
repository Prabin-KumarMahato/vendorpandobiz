
-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Roles enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile + role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name) VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Vendors table
CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  vendor_name TEXT NOT NULL,
  category TEXT,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  location TEXT,
  products TEXT,
  gst_verified BOOLEAN DEFAULT false,
  website TEXT,
  notes TEXT,
  source_of_contact TEXT,
  quotation_link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view vendors" ON public.vendors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert vendors" ON public.vendors FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update vendors" ON public.vendors FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete vendors" ON public.vendors FOR DELETE TO authenticated USING (true);
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Requirements table
CREATE TABLE public.requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  product_category TEXT,
  description TEXT,
  quantity TEXT,
  location TEXT,
  attachment_urls TEXT[],
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view requirements" ON public.requirements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert requirements" ON public.requirements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update requirements" ON public.requirements FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete requirements" ON public.requirements FOR DELETE TO authenticated USING (true);
CREATE TRIGGER update_requirements_updated_at BEFORE UPDATE ON public.requirements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Vendor-Requirement linking with status tracking
CREATE TABLE public.vendor_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
  requirement_id UUID REFERENCES public.requirements(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'sent',
  sent_at TIMESTAMPTZ DEFAULT now(),
  viewed_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(vendor_id, requirement_id)
);
ALTER TABLE public.vendor_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view vendor_requirements" ON public.vendor_requirements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert vendor_requirements" ON public.vendor_requirements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update vendor_requirements" ON public.vendor_requirements FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete vendor_requirements" ON public.vendor_requirements FOR DELETE TO authenticated USING (true);
CREATE TRIGGER update_vendor_requirements_updated_at BEFORE UPDATE ON public.vendor_requirements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Quotations table
CREATE TABLE public.quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_requirement_id UUID REFERENCES public.vendor_requirements(id) ON DELETE CASCADE NOT NULL,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
  requirement_id UUID REFERENCES public.requirements(id) ON DELETE CASCADE NOT NULL,
  price NUMERIC,
  delivery_time TEXT,
  notes TEXT,
  file_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view quotations" ON public.quotations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert quotations" ON public.quotations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update quotations" ON public.quotations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete quotations" ON public.quotations FOR DELETE TO authenticated USING (true);
CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Messages sent log
CREATE TABLE public.messages_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE,
  requirement_id UUID REFERENCES public.requirements(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  message_content TEXT,
  status TEXT DEFAULT 'sent',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages_sent ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view messages" ON public.messages_sent FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert messages" ON public.messages_sent FOR INSERT TO authenticated WITH CHECK (true);

-- Storage bucket for requirement attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('requirement-files', 'requirement-files', true);
CREATE POLICY "Authenticated users can upload requirement files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'requirement-files');
CREATE POLICY "Anyone can view requirement files" ON storage.objects FOR SELECT USING (bucket_id = 'requirement-files');
CREATE POLICY "Authenticated users can delete requirement files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'requirement-files');

-- Storage bucket for quotation files
INSERT INTO storage.buckets (id, name, public) VALUES ('quotation-files', 'quotation-files', true);
CREATE POLICY "Authenticated users can upload quotation files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'quotation-files');
CREATE POLICY "Anyone can view quotation files" ON storage.objects FOR SELECT USING (bucket_id = 'quotation-files');
CREATE POLICY "Authenticated users can delete quotation files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'quotation-files');
