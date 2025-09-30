import { createClient } from '@supabase/supabase-js';

// These are your public Supabase keys.
// Security is handled by Supabase Row Level Security (RLS) policies.
const supabaseUrl = 'https://bwwyovaeqnfqqxjmfkir.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3d3lvdmFlcW5mcXF4am1ma2lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNTU0NTUsImV4cCI6MjA3NDczMTQ1NX0.4Uav7prtONWCIYVEzxlc29f4mkJZJtuVC9gkMmjnYqg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
