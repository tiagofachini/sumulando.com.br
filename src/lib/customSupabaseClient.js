import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://rjitzozuzonlnvczuvcy.supabase.co';
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqaXR6b3p1em9ubG52Y3p1dmN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NjAwNzksImV4cCI6MjA3NjAzNjA3OX0.0UAspkmlNEX3WchvOff8ROKaDiHSn4Y2YhxmCSE3pZo';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
