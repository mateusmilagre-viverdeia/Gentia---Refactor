import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useSuperAdmin() {
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSuperAdmin = async () => {
      if (!user?.id) {
        setIsSuperAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('is_super_admin', {
          _user_id: user.id
        });

        if (error) throw error;
        setIsSuperAdmin(data === true);
      } catch (err) {
        console.error('Error checking super admin status:', err);
        setIsSuperAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkSuperAdmin();
  }, [user?.id]);

  return { isSuperAdmin, loading };
}
