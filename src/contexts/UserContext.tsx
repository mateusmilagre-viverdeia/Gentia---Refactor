import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { createLogger } from '@/lib/logger';

const log = createLogger('UserContext');

interface User {
  firstName: string;
  lastName: string;
  email: string;
  role: "Admin" | "Membro";
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
  loading: boolean;
  reloadProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: authUser, session } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    if (!authUser) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', authUser.id)
        .single();

      if (profile) {
        setUser({
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          email: profile.email || authUser.email || '',
          role: "Admin",
        });
      }
    } catch (error) {
      log.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [authUser?.id]);

  return (
    <UserContext.Provider value={{ 
      user, 
      setUser, 
      isAuthenticated: !!session, 
      loading,
      reloadProfile: loadProfile 
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
