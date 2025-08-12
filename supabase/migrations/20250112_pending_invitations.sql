-- Create pending invitations table
CREATE TABLE IF NOT EXISTS public.pending_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role user_role DEFAULT 'student',
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'expired')),
  metadata JSONB DEFAULT '{}',
  accepted_at TIMESTAMP,
  accepted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_pending_invitations_email ON public.pending_invitations(email);
CREATE INDEX idx_pending_invitations_invited_by ON public.pending_invitations(invited_by);
CREATE INDEX idx_pending_invitations_status ON public.pending_invitations(status);

-- Enable RLS
ALTER TABLE public.pending_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can see invitations they sent
CREATE POLICY "Users can view own invitations" ON public.pending_invitations
  FOR SELECT USING (auth.uid() = invited_by);

-- Users can see invitations sent to their email
CREATE POLICY "Users can view invitations to them" ON public.pending_invitations
  FOR SELECT USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Users can create invitations
CREATE POLICY "Users can create invitations" ON public.pending_invitations
  FOR INSERT WITH CHECK (auth.uid() = invited_by);

-- Users can update their own invitations
CREATE POLICY "Users can update own invitations" ON public.pending_invitations
  FOR UPDATE USING (auth.uid() = invited_by);

-- Create function to send invitation email using Supabase Auth
-- Note: This requires service role permissions, so we'll use a trigger instead
CREATE OR REPLACE FUNCTION public.send_user_invitation(
  user_email TEXT,
  user_role user_role DEFAULT 'student',
  supervisor_id UUID DEFAULT NULL,
  supervisor_name TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- For now, just create the pending invitation record
  -- The actual email sending should be handled by a serverless function
  -- or through Supabase Auth Admin API with proper service role
  
  INSERT INTO public.pending_invitations (email, role, invited_by, metadata)
  VALUES (
    LOWER(user_email),
    user_role,
    supervisor_id,
    jsonb_build_object(
      'supervisorName', supervisor_name,
      'invitedAt', NOW()
    )
  );
  
  result := jsonb_build_object(
    'success', true,
    'message', 'Invitation record created. Email will be sent shortly.'
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    result := jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically accept invitation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_invitation()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if there's a pending invitation for this email
  UPDATE public.pending_invitations
  SET 
    status = 'accepted',
    accepted_at = NOW(),
    accepted_by = NEW.id
  WHERE 
    email = LOWER(NEW.email)
    AND status = 'pending';
  
  -- Create supervisor relationship if invitation exists
  INSERT INTO public.student_supervisor_relationships (student_id, supervisor_id)
  SELECT 
    NEW.id,
    invited_by
  FROM public.pending_invitations
  WHERE 
    email = LOWER(NEW.email)
    AND status = 'accepted'
    AND invited_by IS NOT NULL
  ON CONFLICT DO NOTHING;
  
  -- Update user role if specified in invitation
  UPDATE public.profiles
  SET role = (
    SELECT role 
    FROM public.pending_invitations 
    WHERE email = LOWER(NEW.email) 
    AND status = 'accepted'
    LIMIT 1
  )
  WHERE id = NEW.id
  AND EXISTS (
    SELECT 1 
    FROM public.pending_invitations 
    WHERE email = LOWER(NEW.email) 
    AND status = 'accepted'
    AND role IS NOT NULL
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to handle invitation acceptance on user signup
CREATE TRIGGER on_auth_user_created_invitation
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_invitation();

-- Function to expire old invitations (run periodically)
CREATE OR REPLACE FUNCTION public.expire_old_invitations()
RETURNS void AS $$
BEGIN
  UPDATE public.pending_invitations
  SET status = 'expired'
  WHERE 
    status = 'pending'
    AND created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;