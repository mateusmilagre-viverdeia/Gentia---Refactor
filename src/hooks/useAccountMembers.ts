import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";

export interface AccountMemberOption {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: string;
}

export function useAccountMembers() {
  const { account } = useAccount();
  const [members, setMembers] = useState<AccountMemberOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!account?.id) {
      setMembers([]);
      setLoading(false);
      return;
    }

    const fetchMembers = async () => {
      setLoading(true);
      try {
        // 1. Buscar membros da conta
        const { data: membersData, error: membersError } = await supabase
          .from("account_members")
          .select("id, user_id, role")
          .eq("account_id", account.id)
          .eq("is_active", true);

        if (membersError) {
          console.error("Error fetching account members:", membersError);
          setMembers([]);
          return;
        }

        if (!membersData || membersData.length === 0) {
          setMembers([]);
          return;
        }

        // 2. Buscar profiles para esses user_ids
        const userIds = membersData.map((m) => m.user_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email")
          .in("id", userIds);

        if (profilesError) {
          console.error("Error fetching profiles:", profilesError);
          setMembers([]);
          return;
        }

        // 3. Combinar os dados
        const formattedMembers: AccountMemberOption[] = membersData.map((member) => {
          const profile = profilesData?.find((p) => p.id === member.user_id);
          const firstName = profile?.first_name || "";
          const lastName = profile?.last_name || "";
          const name = `${firstName} ${lastName}`.trim() || "Usuário sem nome";

          return {
            id: member.id,
            user_id: member.user_id,
            name,
            email: profile?.email || "",
            role: member.role,
          };
        });

        setMembers(formattedMembers);
      } catch (error) {
        console.error("Error fetching account members:", error);
        setMembers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [account?.id]);

  return { members, loading };
}
