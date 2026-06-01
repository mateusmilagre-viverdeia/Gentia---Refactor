export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      access_requests: {
        Row: {
          created_at: string | null
          handled_at: string | null
          handled_by: string | null
          id: string
          reason: string | null
          requester_email: string
          requester_id: string
          requester_name: string
          status: string
          target_org_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          reason?: string | null
          requester_email: string
          requester_id: string
          requester_name: string
          status?: string
          target_org_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          reason?: string | null
          requester_email?: string
          requester_id?: string
          requester_name?: string
          status?: string
          target_org_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_requests_target_org_id_fkey"
            columns: ["target_org_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      account_demo_config: {
        Row: {
          account_id: string
          activated_at: string | null
          activated_by: string | null
          created_at: string
          deactivated_at: string | null
          deactivated_by: string | null
          demo_mode_active: boolean
          demo_records_count: number
          id: string
          last_clear_at: string | null
          last_seed_at: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          activated_at?: string | null
          activated_by?: string | null
          created_at?: string
          deactivated_at?: string | null
          deactivated_by?: string | null
          demo_mode_active?: boolean
          demo_records_count?: number
          id?: string
          last_clear_at?: string | null
          last_seed_at?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          activated_at?: string | null
          activated_by?: string | null
          created_at?: string
          deactivated_at?: string | null
          deactivated_by?: string | null
          demo_mode_active?: boolean
          demo_records_count?: number
          id?: string
          last_clear_at?: string | null
          last_seed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_demo_config_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      account_health_scores: {
        Row: {
          account_id: string
          adoption_score: number
          ai_consumption_score: number
          billing_score: number
          calculated_at: string
          created_at: string
          engagement_score: number
          health_status: string
          id: string
          indicators_detail: Json
          nps_score: number
          overall_score: number
          updated_at: string
          usage_score: number
        }
        Insert: {
          account_id: string
          adoption_score?: number
          ai_consumption_score?: number
          billing_score?: number
          calculated_at?: string
          created_at?: string
          engagement_score?: number
          health_status?: string
          id?: string
          indicators_detail?: Json
          nps_score?: number
          overall_score?: number
          updated_at?: string
          usage_score?: number
        }
        Update: {
          account_id?: string
          adoption_score?: number
          ai_consumption_score?: number
          billing_score?: number
          calculated_at?: string
          created_at?: string
          engagement_score?: number
          health_status?: string
          id?: string
          indicators_detail?: Json
          nps_score?: number
          overall_score?: number
          updated_at?: string
          usage_score?: number
        }
        Relationships: []
      }
      account_invites: {
        Row: {
          accepted: boolean | null
          account_id: string
          created_at: string | null
          email: string
          email_error: string | null
          email_sent_at: string | null
          expires_at: string | null
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["account_role"]
          status: string | null
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          token: string | null
        }
        Insert: {
          accepted?: boolean | null
          account_id: string
          created_at?: string | null
          email: string
          email_error?: string | null
          email_sent_at?: string | null
          expires_at?: string | null
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["account_role"]
          status?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          token?: string | null
        }
        Update: {
          accepted?: boolean | null
          account_id?: string
          created_at?: string | null
          email?: string
          email_error?: string | null
          email_sent_at?: string | null
          expires_at?: string | null
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["account_role"]
          status?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_invites_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      account_licensed_modules: {
        Row: {
          access_level: string
          account_id: string
          configured_by: string | null
          created_at: string | null
          id: string
          module_slug: string
          updated_at: string | null
        }
        Insert: {
          access_level?: string
          account_id: string
          configured_by?: string | null
          created_at?: string | null
          id?: string
          module_slug: string
          updated_at?: string | null
        }
        Update: {
          access_level?: string
          account_id?: string
          configured_by?: string | null
          created_at?: string | null
          id?: string
          module_slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_licensed_modules_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      account_members: {
        Row: {
          account_id: string
          created_at: string | null
          deactivated_at: string | null
          deactivated_by: string | null
          id: string
          is_active: boolean | null
          last_access_at: string | null
          role: Database["public"]["Enums"]["account_role"]
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string | null
          deactivated_at?: string | null
          deactivated_by?: string | null
          id?: string
          is_active?: boolean | null
          last_access_at?: string | null
          role?: Database["public"]["Enums"]["account_role"]
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string | null
          deactivated_at?: string | null
          deactivated_by?: string | null
          id?: string
          is_active?: boolean | null
          last_access_at?: string | null
          role?: Database["public"]["Enums"]["account_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_members_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      account_onboarding_progress: {
        Row: {
          account_id: string
          completed_at: string | null
          created_at: string
          dismissed_at: string | null
          dismissed_until: string | null
          id: string
          skipped_steps: string[] | null
          step_agent_done: boolean
          step_candidate_done: boolean
          step_careers_done: boolean
          step_client_done: boolean
          step_comms_done: boolean
          step_credits_done: boolean
          step_culture_done: boolean
          step_distribution_done: boolean
          step_job_done: boolean
          step_pipeline_done: boolean
          step_profile_done: boolean
          step_team_done: boolean
          updated_at: string
        }
        Insert: {
          account_id: string
          completed_at?: string | null
          created_at?: string
          dismissed_at?: string | null
          dismissed_until?: string | null
          id?: string
          skipped_steps?: string[] | null
          step_agent_done?: boolean
          step_candidate_done?: boolean
          step_careers_done?: boolean
          step_client_done?: boolean
          step_comms_done?: boolean
          step_credits_done?: boolean
          step_culture_done?: boolean
          step_distribution_done?: boolean
          step_job_done?: boolean
          step_pipeline_done?: boolean
          step_profile_done?: boolean
          step_team_done?: boolean
          updated_at?: string
        }
        Update: {
          account_id?: string
          completed_at?: string | null
          created_at?: string
          dismissed_at?: string | null
          dismissed_until?: string | null
          id?: string
          skipped_steps?: string[] | null
          step_agent_done?: boolean
          step_candidate_done?: boolean
          step_careers_done?: boolean
          step_client_done?: boolean
          step_comms_done?: boolean
          step_credits_done?: boolean
          step_culture_done?: boolean
          step_distribution_done?: boolean
          step_job_done?: boolean
          step_pipeline_done?: boolean
          step_profile_done?: boolean
          step_team_done?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      account_settings: {
        Row: {
          account_id: string
          created_at: string
          evaluator_optimization_tier: string
          id: string
          sla_meta_dias: number
          updated_at: string
          use_cv_intelligence_in_interviews: boolean
        }
        Insert: {
          account_id: string
          created_at?: string
          evaluator_optimization_tier?: string
          id?: string
          sla_meta_dias?: number
          updated_at?: string
          use_cv_intelligence_in_interviews?: boolean
        }
        Update: {
          account_id?: string
          created_at?: string
          evaluator_optimization_tier?: string
          id?: string
          sla_meta_dias?: number
          updated_at?: string
          use_cv_intelligence_in_interviews?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "account_settings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      action_plans: {
        Row: {
          account_id: string | null
          created_at: string | null
          deadline: string | null
          description: string | null
          id: string
          priority: string
          responsible: string
          status: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          priority?: string
          responsible: string
          status?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          priority?: string
          responsible?: string
          status?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_plans_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_grants: {
        Row: {
          created_at: string | null
          created_by: string
          expires_at: string
          id: string
          org_id: string | null
          reason: string
          revoked_at: string | null
          revoked_by: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          expires_at: string
          id?: string
          org_id?: string | null
          reason: string
          revoked_at?: string | null
          revoked_by?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          expires_at?: string
          id?: string
          org_id?: string | null
          reason?: string
          revoked_at?: string | null
          revoked_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_grants_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_billing_anomalies: {
        Row: {
          account_id: string
          auto_refund_amount: number | null
          billed_credits: number
          billed_minutes: number | null
          detected_at: string
          detection_source: string | null
          id: string
          notes: Json | null
          original_log_id: string | null
          ratio: number | null
          real_minutes: number | null
          reference_type: string | null
          refund_log_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          session_id: string | null
          session_type: string | null
          severity: string
          status: string
        }
        Insert: {
          account_id: string
          auto_refund_amount?: number | null
          billed_credits: number
          billed_minutes?: number | null
          detected_at?: string
          detection_source?: string | null
          id?: string
          notes?: Json | null
          original_log_id?: string | null
          ratio?: number | null
          real_minutes?: number | null
          reference_type?: string | null
          refund_log_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          session_id?: string | null
          session_type?: string | null
          severity: string
          status?: string
        }
        Update: {
          account_id?: string
          auto_refund_amount?: number | null
          billed_credits?: number
          billed_minutes?: number | null
          detected_at?: string
          detection_source?: string | null
          id?: string
          notes?: Json | null
          original_log_id?: string | null
          ratio?: number | null
          real_minutes?: number | null
          reference_type?: string | null
          refund_log_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          session_id?: string | null
          session_type?: string | null
          severity?: string
          status?: string
        }
        Relationships: []
      }
      ai_billing_audit_log: {
        Row: {
          ai_callers: number
          billed: number
          created_at: string
          exempt: number
          id: string
          scanned_at: string
          scope_snapshot: Json
          suspects: Json
          total_rs_functions: number
          triggered_by: string
          window_days: number
        }
        Insert: {
          ai_callers?: number
          billed?: number
          created_at?: string
          exempt?: number
          id?: string
          scanned_at?: string
          scope_snapshot?: Json
          suspects?: Json
          total_rs_functions?: number
          triggered_by?: string
          window_days?: number
        }
        Update: {
          ai_callers?: number
          billed?: number
          created_at?: string
          exempt?: number
          id?: string
          scanned_at?: string
          scope_snapshot?: Json
          suspects?: Json
          total_rs_functions?: number
          triggered_by?: string
          window_days?: number
        }
        Relationships: []
      }
      ai_billing_audit_report_20260524: {
        Row: {
          account_id: string | null
          action: string | null
          billed_credits: number | null
          billed_minutes: number | null
          fair_credits: number | null
          log_id: string
          ran_at: string
          ratio: number | null
          real_minutes: number | null
          refund_amount: number | null
          session_id: string | null
          session_type: string | null
          severity: string | null
        }
        Insert: {
          account_id?: string | null
          action?: string | null
          billed_credits?: number | null
          billed_minutes?: number | null
          fair_credits?: number | null
          log_id: string
          ran_at?: string
          ratio?: number | null
          real_minutes?: number | null
          refund_amount?: number | null
          session_id?: string | null
          session_type?: string | null
          severity?: string | null
        }
        Update: {
          account_id?: string | null
          action?: string | null
          billed_credits?: number | null
          billed_minutes?: number | null
          fair_credits?: number | null
          log_id?: string
          ran_at?: string
          ratio?: number | null
          real_minutes?: number | null
          refund_amount?: number | null
          session_id?: string | null
          session_type?: string | null
          severity?: string | null
        }
        Relationships: []
      }
      ai_billing_incidents: {
        Row: {
          account_id: string | null
          ai_calls_count: number
          correction_reference_id: string | null
          created_at: string
          credits_adjusted: number
          detected_at: string
          estimated_cost_brl: number
          function_name: string
          id: string
          metadata: Json | null
          notes: string | null
          notified_at: string | null
          status: string
          updated_at: string
          window_end: string
          window_start: string
        }
        Insert: {
          account_id?: string | null
          ai_calls_count?: number
          correction_reference_id?: string | null
          created_at?: string
          credits_adjusted?: number
          detected_at?: string
          estimated_cost_brl?: number
          function_name: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          notified_at?: string | null
          status?: string
          updated_at?: string
          window_end: string
          window_start: string
        }
        Update: {
          account_id?: string | null
          ai_calls_count?: number
          correction_reference_id?: string | null
          created_at?: string
          credits_adjusted?: number
          detected_at?: string
          estimated_cost_brl?: number
          function_name?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          notified_at?: string | null
          status?: string
          updated_at?: string
          window_end?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_billing_incidents_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_cost_baselines: {
        Row: {
          avg_cost_brl: number
          avg_tokens: number | null
          created_at: string
          function_name: string
          id: string
          notes: string | null
          period_end: string | null
          period_start: string | null
          updated_at: string
        }
        Insert: {
          avg_cost_brl: number
          avg_tokens?: number | null
          created_at?: string
          function_name: string
          id?: string
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
          updated_at?: string
        }
        Update: {
          avg_cost_brl?: number
          avg_tokens?: number | null
          created_at?: string
          function_name?: string
          id?: string
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_execution_logs: {
        Row: {
          account_id: string
          cached_tokens: number | null
          compression_ratio: number | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          estimated_cost: number | null
          function_name: string
          id: string
          input_summary: Json | null
          metadata: Json | null
          model: string | null
          operation: string
          optimization_version: string | null
          output_summary: Json | null
          quality_score: number | null
          status: string
          tokens_used: number | null
        }
        Insert: {
          account_id: string
          cached_tokens?: number | null
          compression_ratio?: number | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          estimated_cost?: number | null
          function_name: string
          id?: string
          input_summary?: Json | null
          metadata?: Json | null
          model?: string | null
          operation: string
          optimization_version?: string | null
          output_summary?: Json | null
          quality_score?: number | null
          status?: string
          tokens_used?: number | null
        }
        Update: {
          account_id?: string
          cached_tokens?: number | null
          compression_ratio?: number | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          estimated_cost?: number | null
          function_name?: string
          id?: string
          input_summary?: Json | null
          metadata?: Json | null
          model?: string | null
          operation?: string
          optimization_version?: string | null
          output_summary?: Json | null
          quality_score?: number | null
          status?: string
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_execution_logs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_prompts: {
        Row: {
          category: string
          created_at: string
          default_template: string
          description: string | null
          key: string
          label: string
          model: string | null
          template: string
          updated_at: string
          updated_by: string | null
          variables: Json
        }
        Insert: {
          category: string
          created_at?: string
          default_template: string
          description?: string | null
          key: string
          label: string
          model?: string | null
          template: string
          updated_at?: string
          updated_by?: string | null
          variables?: Json
        }
        Update: {
          category?: string
          created_at?: string
          default_template?: string
          description?: string | null
          key?: string
          label?: string
          model?: string | null
          template?: string
          updated_at?: string
          updated_by?: string | null
          variables?: Json
        }
        Relationships: []
      }
      announcements: {
        Row: {
          body: string
          created_at: string
          expires_at: string | null
          id: string
          org_id: string
          published_at: string
          published_by: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          expires_at?: string | null
          id?: string
          org_id: string
          published_at?: string
          published_by: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          org_id?: string
          published_at?: string
          published_by?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_invitations: {
        Row: {
          account_id: string
          assessment_type: string
          created_at: string | null
          expires_at: string | null
          id: string
          invited_by: string
          invited_user_id: string
          responded_at: string | null
          sent_at: string | null
          session_id: string | null
          status: string
          viewed_at: string | null
        }
        Insert: {
          account_id: string
          assessment_type: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invited_by: string
          invited_user_id: string
          responded_at?: string | null
          sent_at?: string | null
          session_id?: string | null
          status?: string
          viewed_at?: string | null
        }
        Update: {
          account_id?: string
          assessment_type?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invited_by?: string
          invited_user_id?: string
          responded_at?: string | null
          sent_at?: string | null
          session_id?: string | null
          status?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_invitations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_codes: {
        Row: {
          code_hash: string
          created_at: string | null
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string | null
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string | null
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          icon: string
          id: string
          name: string
          points: number
          requirement: Json | null
          tier: string
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          icon: string
          id?: string
          name: string
          points?: number
          requirement?: Json | null
          tier?: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          icon?: string
          id?: string
          name?: string
          points?: number
          requirement?: Json | null
          tier?: string
        }
        Relationships: []
      }
      behaviors_reference: {
        Row: {
          active: boolean | null
          created_at: string | null
          donts: string[]
          dos: string[]
          id: string
          value_aliases: string[] | null
          value_label: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          donts: string[]
          dos: string[]
          id?: string
          value_aliases?: string[] | null
          value_label: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          donts?: string[]
          dos?: string[]
          id?: string
          value_aliases?: string[] | null
          value_label?: string
        }
        Relationships: []
      }
      billing_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          org_id: string | null
          payload: Json | null
          stripe_event_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          org_id?: string | null
          payload?: Json | null
          stripe_event_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          org_id?: string | null
          payload?: Json | null
          stripe_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_invoices: {
        Row: {
          amount_due: number
          amount_paid: number
          created_at: string | null
          currency: string
          description: string | null
          hosted_invoice_url: string | null
          id: string
          invoice_pdf: string | null
          org_id: string
          period_end: string | null
          period_start: string | null
          related_invite_id: string | null
          status: string
          stripe_checkout_session_id: string | null
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount_due?: number
          amount_paid?: number
          created_at?: string | null
          currency?: string
          description?: string | null
          hosted_invoice_url?: string | null
          id?: string
          invoice_pdf?: string | null
          org_id: string
          period_end?: string | null
          period_start?: string | null
          related_invite_id?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          created_at?: string | null
          currency?: string
          description?: string | null
          hosted_invoice_url?: string | null
          id?: string
          invoice_pdf?: string | null
          org_id?: string
          period_end?: string | null
          period_start?: string | null
          related_invite_id?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_invoices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_invoices_related_invite_id_fkey"
            columns: ["related_invite_id"]
            isOneToOne: false
            referencedRelation: "account_invites"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_notifications: {
        Row: {
          created_at: string
          email_to: string
          id: string
          metadata: Json | null
          notification_type: string
          org_id: string
          sent_at: string
        }
        Insert: {
          created_at?: string
          email_to: string
          id?: string
          metadata?: Json | null
          notification_type: string
          org_id: string
          sent_at?: string
        }
        Update: {
          created_at?: string
          email_to?: string
          id?: string
          metadata?: Json | null
          notification_type?: string
          org_id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      birthday_messages: {
        Row: {
          account_id: string
          created_at: string
          from_user_id: string
          id: string
          message: string
          to_employee_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          from_user_id: string
          id?: string
          message: string
          to_employee_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          from_user_id?: string
          id?: string
          message?: string
          to_employee_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "birthday_messages_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "birthday_messages_to_employee_id_fkey"
            columns: ["to_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "birthday_messages_to_employee_id_fkey"
            columns: ["to_employee_id"]
            isOneToOne: false
            referencedRelation: "employees_public"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_cv_intelligence: {
        Row: {
          account_id: string
          candidate_id: string
          candidate_profile_id: string | null
          certifications: Json
          cost_usd: number
          created_at: string
          current_company: string | null
          current_position: string | null
          cv_hash: string | null
          cv_url: string | null
          education: Json
          email: string | null
          extraction_method: string
          full_name: string | null
          id: string
          languages: Json
          linkedin_url: string | null
          location: string | null
          parse_error: string | null
          parse_status: string
          parsed_at: string
          parser_version: string
          phone: string | null
          professional_summary: string | null
          raw_text: string | null
          seniority_level: string | null
          skills: Json
          tokens_used: number
          total_years_experience: number | null
          updated_at: string
          work_history: Json
        }
        Insert: {
          account_id: string
          candidate_id: string
          candidate_profile_id?: string | null
          certifications?: Json
          cost_usd?: number
          created_at?: string
          current_company?: string | null
          current_position?: string | null
          cv_hash?: string | null
          cv_url?: string | null
          education?: Json
          email?: string | null
          extraction_method?: string
          full_name?: string | null
          id?: string
          languages?: Json
          linkedin_url?: string | null
          location?: string | null
          parse_error?: string | null
          parse_status?: string
          parsed_at?: string
          parser_version?: string
          phone?: string | null
          professional_summary?: string | null
          raw_text?: string | null
          seniority_level?: string | null
          skills?: Json
          tokens_used?: number
          total_years_experience?: number | null
          updated_at?: string
          work_history?: Json
        }
        Update: {
          account_id?: string
          candidate_id?: string
          candidate_profile_id?: string | null
          certifications?: Json
          cost_usd?: number
          created_at?: string
          current_company?: string | null
          current_position?: string | null
          cv_hash?: string | null
          cv_url?: string | null
          education?: Json
          email?: string | null
          extraction_method?: string
          full_name?: string | null
          id?: string
          languages?: Json
          linkedin_url?: string | null
          location?: string | null
          parse_error?: string | null
          parse_status?: string
          parsed_at?: string
          parser_version?: string
          phone?: string | null
          professional_summary?: string | null
          raw_text?: string | null
          seniority_level?: string | null
          skills?: Json
          tokens_used?: number
          total_years_experience?: number | null
          updated_at?: string
          work_history?: Json
        }
        Relationships: [
          {
            foreignKeyName: "candidate_cv_intelligence_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_cv_intelligence_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: true
            referencedRelation: "recruitment_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_cv_intelligence_candidate_profile_id_fkey"
            columns: ["candidate_profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_cv_job_match: {
        Row: {
          account_id: string
          candidate_id: string
          cost_usd: number
          created_at: string
          credits_consumed: number
          cv_intelligence_id: string | null
          expires_at: string
          highlights: Json
          icp_version_used: string | null
          id: string
          interview_focus_points: Json
          job_id: string
          match_score: number | null
          model_used: string | null
          recommendation: string | null
          red_flags: Json
          skills_extra: Json
          skills_matched: Json
          skills_missing: Json
          summary: string | null
          triggered_by: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          candidate_id: string
          cost_usd?: number
          created_at?: string
          credits_consumed?: number
          cv_intelligence_id?: string | null
          expires_at?: string
          highlights?: Json
          icp_version_used?: string | null
          id?: string
          interview_focus_points?: Json
          job_id: string
          match_score?: number | null
          model_used?: string | null
          recommendation?: string | null
          red_flags?: Json
          skills_extra?: Json
          skills_matched?: Json
          skills_missing?: Json
          summary?: string | null
          triggered_by?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          candidate_id?: string
          cost_usd?: number
          created_at?: string
          credits_consumed?: number
          cv_intelligence_id?: string | null
          expires_at?: string
          highlights?: Json
          icp_version_used?: string | null
          id?: string
          interview_focus_points?: Json
          job_id?: string
          match_score?: number | null
          model_used?: string | null
          recommendation?: string | null
          red_flags?: Json
          skills_extra?: Json
          skills_matched?: Json
          skills_missing?: Json
          summary?: string | null
          triggered_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_cv_job_match_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_cv_job_match_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "recruitment_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_cv_job_match_cv_intelligence_id_fkey"
            columns: ["cv_intelligence_id"]
            isOneToOne: false
            referencedRelation: "candidate_cv_intelligence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_cv_job_match_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_disc_responses: {
        Row: {
          created_at: string
          id: string
          question_id: string
          score: number
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          question_id: string
          score: number
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          question_id?: string
          score?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_disc_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "disc_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_disc_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "candidate_disc_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_disc_results: {
        Row: {
          c_normalized: number
          c_score: number
          created_at: string
          d_normalized: number
          d_score: number
          i_normalized: number
          i_score: number
          id: string
          intensity: string
          is_balanced: boolean
          match_score: number | null
          primary_profile: string
          s_normalized: number
          s_score: number
          secondary_profile: string | null
          session_id: string
        }
        Insert: {
          c_normalized: number
          c_score: number
          created_at?: string
          d_normalized: number
          d_score: number
          i_normalized: number
          i_score: number
          id?: string
          intensity: string
          is_balanced?: boolean
          match_score?: number | null
          primary_profile: string
          s_normalized: number
          s_score: number
          secondary_profile?: string | null
          session_id: string
        }
        Update: {
          c_normalized?: number
          c_score?: number
          created_at?: string
          d_normalized?: number
          d_score?: number
          i_normalized?: number
          i_score?: number
          id?: string
          intensity?: string
          is_balanced?: boolean
          match_score?: number | null
          primary_profile?: string
          s_normalized?: number
          s_score?: number
          secondary_profile?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_disc_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "candidate_disc_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_disc_sessions: {
        Row: {
          account_id: string
          agent_id: string | null
          archived_at: string | null
          attempt_number: number
          candidate_id: string
          candidate_profile_id: string | null
          completed_at: string | null
          created_at: string
          expires_at: string
          id: string
          job_id: string
          reused_from_session_id: string | null
          started_at: string | null
          status: string
          token: string
        }
        Insert: {
          account_id: string
          agent_id?: string | null
          archived_at?: string | null
          attempt_number?: number
          candidate_id: string
          candidate_profile_id?: string | null
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          job_id: string
          reused_from_session_id?: string | null
          started_at?: string | null
          status?: string
          token: string
        }
        Update: {
          account_id?: string
          agent_id?: string | null
          archived_at?: string | null
          attempt_number?: number
          candidate_id?: string
          candidate_profile_id?: string | null
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          job_id?: string
          reused_from_session_id?: string | null
          started_at?: string | null
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_disc_sessions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_disc_sessions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "recruitment_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_disc_sessions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "recruitment_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_disc_sessions_candidate_profile_id_fkey"
            columns: ["candidate_profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_disc_sessions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_disc_sessions_reused_from_session_id_fkey"
            columns: ["reused_from_session_id"]
            isOneToOne: false
            referencedRelation: "candidate_disc_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_education: {
        Row: {
          candidate_profile_id: string
          course_name: string
          created_at: string
          degree_type: string
          id: string
        }
        Insert: {
          candidate_profile_id: string
          course_name: string
          created_at?: string
          degree_type: string
          id?: string
        }
        Update: {
          candidate_profile_id?: string
          course_name?: string
          created_at?: string
          degree_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_education_candidate_profile_id_fkey"
            columns: ["candidate_profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_embeddings: {
        Row: {
          account_id: string
          candidate_id: string
          content_hash: string
          content_text: string | null
          created_at: string
          embedding: string | null
          enriched_context: string | null
          enrichment_status: string | null
          id: string
          metadata: Json | null
          source_type: string
          updated_at: string
        }
        Insert: {
          account_id: string
          candidate_id: string
          content_hash: string
          content_text?: string | null
          created_at?: string
          embedding?: string | null
          enriched_context?: string | null
          enrichment_status?: string | null
          id?: string
          metadata?: Json | null
          source_type: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          candidate_id?: string
          content_hash?: string
          content_text?: string | null
          created_at?: string
          embedding?: string | null
          enriched_context?: string | null
          enrichment_status?: string | null
          id?: string
          metadata?: Json | null
          source_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_embeddings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_embeddings_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "recruitment_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_external_entries: {
        Row: {
          account_id: string
          candidate_id: string | null
          channel: string
          created_at: string
          error_message: string | null
          extracted_data: Json | null
          file_mime_type: string | null
          file_name: string | null
          file_url: string | null
          id: string
          processed_at: string | null
          processing_status: string
          raw_content: string | null
          received_at: string
          retry_count: number
          sender: string
          sender_name: string | null
          subject: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          candidate_id?: string | null
          channel: string
          created_at?: string
          error_message?: string | null
          extracted_data?: Json | null
          file_mime_type?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          processed_at?: string | null
          processing_status?: string
          raw_content?: string | null
          received_at?: string
          retry_count?: number
          sender: string
          sender_name?: string | null
          subject?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          candidate_id?: string | null
          channel?: string
          created_at?: string
          error_message?: string | null
          extracted_data?: Json | null
          file_mime_type?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          processed_at?: string | null
          processing_status?: string
          raw_content?: string | null
          received_at?: string
          retry_count?: number
          sender?: string
          sender_name?: string | null
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_external_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_external_entries_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "recruitment_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_marketplace_preferences: {
        Row: {
          allow_marketplace_sharing: boolean | null
          candidate_email: string
          created_at: string | null
          id: string
          opt_out_reason: string | null
          opted_out_at: string | null
          preferences_token: string | null
          token_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          allow_marketplace_sharing?: boolean | null
          candidate_email: string
          created_at?: string | null
          id?: string
          opt_out_reason?: string | null
          opted_out_at?: string | null
          preferences_token?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          allow_marketplace_sharing?: boolean | null
          candidate_email?: string
          created_at?: string | null
          id?: string
          opt_out_reason?: string | null
          opted_out_at?: string | null
          preferences_token?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      candidate_nps: {
        Row: {
          account_id: string
          alert_resolution_note: string | null
          alert_resolved: boolean
          alert_resolved_at: string | null
          alert_resolved_by: string | null
          answered_at: string | null
          application_id: string | null
          candidate_id: string
          category: string | null
          created_at: string
          exit_stage: string | null
          feedback_text: string | null
          id: string
          is_demo: boolean
          job_id: string | null
          response_token: string
          scheduled_for: string | null
          score: number | null
          send_channel: string | null
          send_error: string | null
          send_status: string
          sent_at: string | null
          trigger: string
          updated_at: string
        }
        Insert: {
          account_id: string
          alert_resolution_note?: string | null
          alert_resolved?: boolean
          alert_resolved_at?: string | null
          alert_resolved_by?: string | null
          answered_at?: string | null
          application_id?: string | null
          candidate_id: string
          category?: string | null
          created_at?: string
          exit_stage?: string | null
          feedback_text?: string | null
          id?: string
          is_demo?: boolean
          job_id?: string | null
          response_token?: string
          scheduled_for?: string | null
          score?: number | null
          send_channel?: string | null
          send_error?: string | null
          send_status?: string
          sent_at?: string | null
          trigger: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          alert_resolution_note?: string | null
          alert_resolved?: boolean
          alert_resolved_at?: string | null
          alert_resolved_by?: string | null
          answered_at?: string | null
          application_id?: string | null
          candidate_id?: string
          category?: string | null
          created_at?: string
          exit_stage?: string | null
          feedback_text?: string | null
          id?: string
          is_demo?: boolean
          job_id?: string | null
          response_token?: string
          scheduled_for?: string | null
          score?: number | null
          send_channel?: string | null
          send_error?: string | null
          send_status?: string
          sent_at?: string | null
          trigger?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_nps_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_nps_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "recruitment_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_nps_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "recruitment_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_nps_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_nudge_log: {
        Row: {
          account_id: string
          application_id: string | null
          candidate_id: string
          channel: string
          id: string
          job_id: string
          metadata: Json | null
          nudge_type: string
          sent_at: string
        }
        Insert: {
          account_id: string
          application_id?: string | null
          candidate_id: string
          channel?: string
          id?: string
          job_id: string
          metadata?: Json | null
          nudge_type?: string
          sent_at?: string
        }
        Update: {
          account_id?: string
          application_id?: string | null
          candidate_id?: string
          channel?: string
          id?: string
          job_id?: string
          metadata?: Json | null
          nudge_type?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_nudge_log_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_nudge_log_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "recruitment_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_nudge_log_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_process_history: {
        Row: {
          account_id: string
          candidate_id: string
          company_context: string | null
          created_at: string
          feedback_notes: string | null
          final_status: string
          id: string
          is_demo: boolean
          job_id: string | null
          job_title: string
          participated_at: string | null
          qualification_score: number | null
          rejection_reason: string | null
          was_shortlisted: boolean | null
        }
        Insert: {
          account_id: string
          candidate_id: string
          company_context?: string | null
          created_at?: string
          feedback_notes?: string | null
          final_status?: string
          id?: string
          is_demo?: boolean
          job_id?: string | null
          job_title: string
          participated_at?: string | null
          qualification_score?: number | null
          rejection_reason?: string | null
          was_shortlisted?: boolean | null
        }
        Update: {
          account_id?: string
          candidate_id?: string
          company_context?: string | null
          created_at?: string
          feedback_notes?: string | null
          final_status?: string
          id?: string
          is_demo?: boolean
          job_id?: string | null
          job_title?: string
          participated_at?: string | null
          qualification_score?: number | null
          rejection_reason?: string | null
          was_shortlisted?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_process_history_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_process_history_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "recruitment_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_process_history_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          city: string | null
          created_at: string
          cv_url: string | null
          first_name: string | null
          full_name: string
          gender: string | null
          id: string
          last_name: string | null
          linkedin_url: string | null
          other_social_urls: string | null
          phone: string | null
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string
          cv_url?: string | null
          first_name?: string | null
          full_name: string
          gender?: string | null
          id?: string
          last_name?: string | null
          linkedin_url?: string | null
          other_social_urls?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string
          cv_url?: string | null
          first_name?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          last_name?: string | null
          linkedin_url?: string | null
          other_social_urls?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      candidate_tracking_events: {
        Row: {
          account_id: string
          application_id: string | null
          campaign: string | null
          candidate_id: string
          created_at: string
          event_type: string
          id: string
          job_id: string | null
          medium: string | null
          metadata: Json | null
          source: string | null
        }
        Insert: {
          account_id: string
          application_id?: string | null
          campaign?: string | null
          candidate_id: string
          created_at?: string
          event_type: string
          id?: string
          job_id?: string | null
          medium?: string | null
          metadata?: Json | null
          source?: string | null
        }
        Update: {
          account_id?: string
          application_id?: string | null
          campaign?: string | null
          candidate_id?: string
          created_at?: string
          event_type?: string
          id?: string
          job_id?: string | null
          medium?: string | null
          metadata?: Json | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_tracking_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_tracking_events_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "recruitment_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_tracking_events_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "recruitment_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_tracking_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_work_history: {
        Row: {
          candidate_profile_id: string
          company: string
          created_at: string
          end_date: string | null
          id: string
          is_current: boolean
          position: string
          responsibilities: string | null
          start_date: string
        }
        Insert: {
          candidate_profile_id: string
          company: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_current?: boolean
          position: string
          responsibilities?: string | null
          start_date: string
        }
        Update: {
          candidate_profile_id?: string
          company?: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_current?: boolean
          position?: string
          responsibilities?: string | null
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_work_history_candidate_profile_id_fkey"
            columns: ["candidate_profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      careers_page_settings: {
        Row: {
          account_id: string
          apply_button_text: string | null
          careers_video_position: string
          careers_video_title: string | null
          careers_video_type: string | null
          careers_video_url: string | null
          cover_image_url: string | null
          created_at: string | null
          custom_categories: string[] | null
          description: string | null
          footer_text: string | null
          gallery_images: string[] | null
          headline: string | null
          id: string
          is_published: boolean | null
          job_alerts_enabled: boolean | null
          job_primary_color: string | null
          job_show_benefits: boolean | null
          job_show_company_section: boolean | null
          job_show_competencies: boolean | null
          job_show_desired_skills: boolean | null
          job_show_development: boolean | null
          job_show_gentia_branding: boolean | null
          job_show_indicators: boolean | null
          job_show_mission: boolean | null
          job_show_related_jobs: boolean | null
          job_show_required_skills: boolean | null
          job_show_responsibilities: boolean | null
          job_show_share_buttons: boolean | null
          job_use_custom_color: boolean | null
          job_video_url: string | null
          logo_url: string | null
          meta_description: string | null
          meta_title: string | null
          primary_color: string | null
          selling_sections_order: string[] | null
          show_about_section: boolean | null
          show_benefits_section: boolean | null
          show_careers_video_section: boolean
          show_challenges_section: boolean | null
          show_company_name: boolean | null
          show_cta_section: boolean | null
          show_department_filter: boolean | null
          show_fit_section: boolean | null
          show_gallery_section: boolean | null
          show_location_filter: boolean | null
          show_moment_section: boolean | null
          show_offerings_section: boolean | null
          show_opening_section: boolean | null
          show_social_links: boolean | null
          show_testimonials_section: boolean | null
          show_values_section: boolean | null
          talent_pool_enabled: boolean | null
          updated_at: string | null
          use_selling_content: boolean | null
        }
        Insert: {
          account_id: string
          apply_button_text?: string | null
          careers_video_position?: string
          careers_video_title?: string | null
          careers_video_type?: string | null
          careers_video_url?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          custom_categories?: string[] | null
          description?: string | null
          footer_text?: string | null
          gallery_images?: string[] | null
          headline?: string | null
          id?: string
          is_published?: boolean | null
          job_alerts_enabled?: boolean | null
          job_primary_color?: string | null
          job_show_benefits?: boolean | null
          job_show_company_section?: boolean | null
          job_show_competencies?: boolean | null
          job_show_desired_skills?: boolean | null
          job_show_development?: boolean | null
          job_show_gentia_branding?: boolean | null
          job_show_indicators?: boolean | null
          job_show_mission?: boolean | null
          job_show_related_jobs?: boolean | null
          job_show_required_skills?: boolean | null
          job_show_responsibilities?: boolean | null
          job_show_share_buttons?: boolean | null
          job_use_custom_color?: boolean | null
          job_video_url?: string | null
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          primary_color?: string | null
          selling_sections_order?: string[] | null
          show_about_section?: boolean | null
          show_benefits_section?: boolean | null
          show_careers_video_section?: boolean
          show_challenges_section?: boolean | null
          show_company_name?: boolean | null
          show_cta_section?: boolean | null
          show_department_filter?: boolean | null
          show_fit_section?: boolean | null
          show_gallery_section?: boolean | null
          show_location_filter?: boolean | null
          show_moment_section?: boolean | null
          show_offerings_section?: boolean | null
          show_opening_section?: boolean | null
          show_social_links?: boolean | null
          show_testimonials_section?: boolean | null
          show_values_section?: boolean | null
          talent_pool_enabled?: boolean | null
          updated_at?: string | null
          use_selling_content?: boolean | null
        }
        Update: {
          account_id?: string
          apply_button_text?: string | null
          careers_video_position?: string
          careers_video_title?: string | null
          careers_video_type?: string | null
          careers_video_url?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          custom_categories?: string[] | null
          description?: string | null
          footer_text?: string | null
          gallery_images?: string[] | null
          headline?: string | null
          id?: string
          is_published?: boolean | null
          job_alerts_enabled?: boolean | null
          job_primary_color?: string | null
          job_show_benefits?: boolean | null
          job_show_company_section?: boolean | null
          job_show_competencies?: boolean | null
          job_show_desired_skills?: boolean | null
          job_show_development?: boolean | null
          job_show_gentia_branding?: boolean | null
          job_show_indicators?: boolean | null
          job_show_mission?: boolean | null
          job_show_related_jobs?: boolean | null
          job_show_required_skills?: boolean | null
          job_show_responsibilities?: boolean | null
          job_show_share_buttons?: boolean | null
          job_use_custom_color?: boolean | null
          job_video_url?: string | null
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          primary_color?: string | null
          selling_sections_order?: string[] | null
          show_about_section?: boolean | null
          show_benefits_section?: boolean | null
          show_careers_video_section?: boolean
          show_challenges_section?: boolean | null
          show_company_name?: boolean | null
          show_cta_section?: boolean | null
          show_department_filter?: boolean | null
          show_fit_section?: boolean | null
          show_gallery_section?: boolean | null
          show_location_filter?: boolean | null
          show_moment_section?: boolean | null
          show_offerings_section?: boolean | null
          show_opening_section?: boolean | null
          show_social_links?: boolean | null
          show_testimonials_section?: boolean | null
          show_values_section?: boolean | null
          talent_pool_enabled?: boolean | null
          updated_at?: string | null
          use_selling_content?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "careers_page_settings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      checkpoint_actions: {
        Row: {
          account_id: string
          checkpoint_id: string
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          responsible: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          account_id: string
          checkpoint_id: string
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          responsible: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          checkpoint_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          responsible?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkpoint_actions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkpoint_actions_checkpoint_id_fkey"
            columns: ["checkpoint_id"]
            isOneToOne: false
            referencedRelation: "project_checkpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      chrome_extension_captures: {
        Row: {
          account_id: string
          candidate_id: string | null
          captured_at: string
          captured_by: string
          error_message: string | null
          id: string
          is_demo: boolean
          job_id: string | null
          processed_at: string | null
          processed_data: Json | null
          processing_status: string
          raw_data: Json
          source_url: string
        }
        Insert: {
          account_id: string
          candidate_id?: string | null
          captured_at?: string
          captured_by: string
          error_message?: string | null
          id?: string
          is_demo?: boolean
          job_id?: string | null
          processed_at?: string | null
          processed_data?: Json | null
          processing_status?: string
          raw_data: Json
          source_url: string
        }
        Update: {
          account_id?: string
          candidate_id?: string | null
          captured_at?: string
          captured_by?: string
          error_message?: string | null
          id?: string
          is_demo?: boolean
          job_id?: string | null
          processed_at?: string | null
          processed_data?: Json | null
          processing_status?: string
          raw_data?: Json
          source_url?: string
        }
        Relationships: []
      }
      client_career_pages: {
        Row: {
          account_id: string
          client_id: string
          company_description: string | null
          cover_image_url: string | null
          created_at: string
          custom_domain: string | null
          custom_domain_cname: string | null
          custom_domain_verified: boolean
          id: string
          is_active: boolean
          logo_url: string | null
          meta_description: string | null
          meta_title: string | null
          primary_color: string | null
          secondary_color: string | null
          slug: string
          total_applications: number
          total_views: number
          updated_at: string
        }
        Insert: {
          account_id: string
          client_id: string
          company_description?: string | null
          cover_image_url?: string | null
          created_at?: string
          custom_domain?: string | null
          custom_domain_cname?: string | null
          custom_domain_verified?: boolean
          id?: string
          is_active?: boolean
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slug: string
          total_applications?: number
          total_views?: number
          updated_at?: string
        }
        Update: {
          account_id?: string
          client_id?: string
          company_description?: string | null
          cover_image_url?: string | null
          created_at?: string
          custom_domain?: string | null
          custom_domain_cname?: string | null
          custom_domain_verified?: boolean
          id?: string
          is_active?: boolean
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string
          total_applications?: number
          total_views?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_career_pages_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_career_pages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clientes_consultoria"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_activity_log: {
        Row: {
          account_id: string
          cliente_id: string
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          job_id: string | null
          seen_at: string | null
          seen_by_client: boolean
        }
        Insert: {
          account_id: string
          cliente_id: string
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          job_id?: string | null
          seen_at?: string | null
          seen_by_client?: boolean
        }
        Update: {
          account_id?: string
          cliente_id?: string
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          job_id?: string | null
          seen_at?: string | null
          seen_by_client?: boolean
        }
        Relationships: []
      }
      clientes_consultoria: {
        Row: {
          account_id: string
          cnpj: string | null
          created_at: string
          fee_fixo: number | null
          fee_percentual: number | null
          id: string
          is_demo: boolean
          logo_url: string | null
          modelo_fee: string | null
          nome_fantasia: string | null
          observacoes: string | null
          porte: string | null
          prazo_entrega_dias: number | null
          prazo_garantia_dias: number | null
          razao_social: string
          responsavel_interno: string | null
          setor: string | null
          site: string | null
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          cnpj?: string | null
          created_at?: string
          fee_fixo?: number | null
          fee_percentual?: number | null
          id?: string
          is_demo?: boolean
          logo_url?: string | null
          modelo_fee?: string | null
          nome_fantasia?: string | null
          observacoes?: string | null
          porte?: string | null
          prazo_entrega_dias?: number | null
          prazo_garantia_dias?: number | null
          razao_social: string
          responsavel_interno?: string | null
          setor?: string | null
          site?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          cnpj?: string | null
          created_at?: string
          fee_fixo?: number | null
          fee_percentual?: number | null
          id?: string
          is_demo?: boolean
          logo_url?: string | null
          modelo_fee?: string | null
          nome_fantasia?: string | null
          observacoes?: string | null
          porte?: string | null
          prazo_entrega_dias?: number | null
          prazo_garantia_dias?: number | null
          razao_social?: string
          responsavel_interno?: string | null
          setor?: string | null
          site?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_consultoria_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes_contatos: {
        Row: {
          account_id: string
          cargo: string | null
          cliente_id: string
          created_at: string
          eh_contato_principal: boolean | null
          eh_decisor: boolean | null
          email: string | null
          id: string
          nome: string
          whatsapp: string | null
        }
        Insert: {
          account_id: string
          cargo?: string | null
          cliente_id: string
          created_at?: string
          eh_contato_principal?: boolean | null
          eh_decisor?: boolean | null
          email?: string | null
          id?: string
          nome: string
          whatsapp?: string | null
        }
        Update: {
          account_id?: string
          cargo?: string | null
          cliente_id?: string
          created_at?: string
          eh_contato_principal?: boolean | null
          eh_decisor?: boolean | null
          email?: string | null
          id?: string
          nome?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_contatos_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_contatos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes_consultoria"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_proposals: {
        Row: {
          accepted_at: string | null
          account_id: string
          ai_generated_content: string | null
          ai_model_used: string | null
          ai_prompt_input: Json | null
          cliente_id: string
          created_at: string
          created_by: string
          deliverables: Json
          generated_at: string | null
          id: string
          is_demo: boolean
          payment_terms: string | null
          pricing: Json
          public_token: string
          rejected_at: string | null
          rejection_reason: string | null
          scope_text: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["commercial_proposal_status"]
          title: string
          updated_at: string
          validity_date: string | null
          viewed_at: string | null
          viewed_count: number
        }
        Insert: {
          accepted_at?: string | null
          account_id: string
          ai_generated_content?: string | null
          ai_model_used?: string | null
          ai_prompt_input?: Json | null
          cliente_id: string
          created_at?: string
          created_by: string
          deliverables?: Json
          generated_at?: string | null
          id?: string
          is_demo?: boolean
          payment_terms?: string | null
          pricing?: Json
          public_token?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          scope_text?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["commercial_proposal_status"]
          title: string
          updated_at?: string
          validity_date?: string | null
          viewed_at?: string | null
          viewed_count?: number
        }
        Update: {
          accepted_at?: string | null
          account_id?: string
          ai_generated_content?: string | null
          ai_model_used?: string | null
          ai_prompt_input?: Json | null
          cliente_id?: string
          created_at?: string
          created_by?: string
          deliverables?: Json
          generated_at?: string | null
          id?: string
          is_demo?: boolean
          payment_terms?: string | null
          pricing?: Json
          public_token?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          scope_text?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["commercial_proposal_status"]
          title?: string
          updated_at?: string
          validity_date?: string | null
          viewed_at?: string | null
          viewed_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "commercial_proposals_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes_consultoria"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          account_type: string
          cnpj: string | null
          cnpj_digits: string | null
          created_at: string | null
          current_mission: string | null
          current_vision: string | null
          employees_count: number | null
          employer_linked_agency_id: string | null
          employer_linked_client_id: string | null
          facebook: string | null
          id: string
          instagram: string | null
          linkedin: string | null
          logo_url: string | null
          name: string
          revenue_last_12_months: number | null
          sector: string | null
          slug: string | null
          status: string | null
          twitter: string | null
          updated_at: string | null
          user_id: string
          website: string | null
          whatsapp: string | null
          youtube: string | null
        }
        Insert: {
          account_type?: string
          cnpj?: string | null
          cnpj_digits?: string | null
          created_at?: string | null
          current_mission?: string | null
          current_vision?: string | null
          employees_count?: number | null
          employer_linked_agency_id?: string | null
          employer_linked_client_id?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          logo_url?: string | null
          name: string
          revenue_last_12_months?: number | null
          sector?: string | null
          slug?: string | null
          status?: string | null
          twitter?: string | null
          updated_at?: string | null
          user_id: string
          website?: string | null
          whatsapp?: string | null
          youtube?: string | null
        }
        Update: {
          account_type?: string
          cnpj?: string | null
          cnpj_digits?: string | null
          created_at?: string | null
          current_mission?: string | null
          current_vision?: string | null
          employees_count?: number | null
          employer_linked_agency_id?: string | null
          employer_linked_client_id?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          logo_url?: string | null
          name?: string
          revenue_last_12_months?: number | null
          sector?: string | null
          slug?: string | null
          status?: string | null
          twitter?: string | null
          updated_at?: string | null
          user_id?: string
          website?: string | null
          whatsapp?: string | null
          youtube?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_employer_linked_agency_id_fkey"
            columns: ["employer_linked_agency_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_employer_linked_client_id_fkey"
            columns: ["employer_linked_client_id"]
            isOneToOne: false
            referencedRelation: "clientes_consultoria"
            referencedColumns: ["id"]
          },
        ]
      }
      company_gamification_stats: {
        Row: {
          account_id: string
          badges_earned: number | null
          created_at: string | null
          id: string
          last_activity_date: string | null
          level: number | null
          streak_days: number | null
          total_points: number | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          badges_earned?: number | null
          created_at?: string | null
          id?: string
          last_activity_date?: string | null
          level?: number | null
          streak_days?: number | null
          total_points?: number | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          badges_earned?: number | null
          created_at?: string | null
          id?: string
          last_activity_date?: string | null
          level?: number | null
          streak_days?: number | null
          total_points?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_gamification_stats_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_holidays: {
        Row: {
          account_id: string
          created_at: string
          created_by: string | null
          holiday_date: string
          id: string
          name: string
          notes: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          account_id: string
          created_at?: string
          created_by?: string | null
          holiday_date: string
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string
          created_by?: string | null
          holiday_date?: string
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      compensation_models: {
        Row: {
          account_id: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          settings: Json | null
          strategy_type: string | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          settings?: Json | null
          strategy_type?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          settings?: Json | null
          strategy_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compensation_models_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      consultancy_portal_settings: {
        Row: {
          account_id: string
          confidentiality_text: string | null
          consultancy_name: string | null
          created_at: string | null
          default_opening_message: string | null
          default_shortlist_validity_days: number | null
          id: string
          logo_url: string | null
          notify_candidate_approved: boolean | null
          notify_reminder_48h: boolean | null
          notify_shortlist_ready: boolean | null
          template_candidate_approved: string | null
          template_reminder_48h: string | null
          template_shortlist_ready: string | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          confidentiality_text?: string | null
          consultancy_name?: string | null
          created_at?: string | null
          default_opening_message?: string | null
          default_shortlist_validity_days?: number | null
          id?: string
          logo_url?: string | null
          notify_candidate_approved?: boolean | null
          notify_reminder_48h?: boolean | null
          notify_shortlist_ready?: boolean | null
          template_candidate_approved?: string | null
          template_reminder_48h?: string | null
          template_shortlist_ready?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          confidentiality_text?: string | null
          consultancy_name?: string | null
          created_at?: string | null
          default_opening_message?: string | null
          default_shortlist_validity_days?: number | null
          id?: string
          logo_url?: string | null
          notify_candidate_approved?: boolean | null
          notify_reminder_48h?: boolean | null
          notify_shortlist_ready?: boolean | null
          template_candidate_approved?: string | null
          template_reminder_48h?: string | null
          template_shortlist_ready?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultancy_portal_settings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      consultant_access_logs: {
        Row: {
          account_id: string
          action: string
          consultant_id: string
          created_at: string
          id: string
          ip_address: unknown
          metadata: Json | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          action: string
          consultant_id: string
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          action?: string
          consultant_id?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultant_access_logs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultant_access_logs_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "ep_consultants"
            referencedColumns: ["id"]
          },
        ]
      }
      consultant_assignments: {
        Row: {
          account_id: string
          active: boolean
          assigned_at: string
          assigned_by: string
          consultant_id: string
          id: string
        }
        Insert: {
          account_id: string
          active?: boolean
          assigned_at?: string
          assigned_by: string
          consultant_id: string
          id?: string
        }
        Update: {
          account_id?: string
          active?: boolean
          assigned_at?: string
          assigned_by?: string
          consultant_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultant_assignments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultant_assignments_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "ep_consultants"
            referencedColumns: ["id"]
          },
        ]
      }
      consultant_availability_blocks: {
        Row: {
          block_type: Database["public"]["Enums"]["availability_block_type"]
          consultant_id: string
          created_at: string
          created_by: string | null
          end_date: string
          hours_per_day: number | null
          id: string
          notes: string | null
          start_date: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          block_type?: Database["public"]["Enums"]["availability_block_type"]
          consultant_id: string
          created_at?: string
          created_by?: string | null
          end_date: string
          hours_per_day?: number | null
          id?: string
          notes?: string | null
          start_date: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          block_type?: Database["public"]["Enums"]["availability_block_type"]
          consultant_id?: string
          created_at?: string
          created_by?: string | null
          end_date?: string
          hours_per_day?: number | null
          id?: string
          notes?: string | null
          start_date?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultant_availability_blocks_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "ep_consultants"
            referencedColumns: ["id"]
          },
        ]
      }
      consultant_capacity_settings: {
        Row: {
          available_from: string
          consultant_id: string
          created_at: string
          id: string
          max_projects: number
          updated_at: string
          updated_by: string | null
          weekly_hours: number
        }
        Insert: {
          available_from?: string
          consultant_id: string
          created_at?: string
          id?: string
          max_projects?: number
          updated_at?: string
          updated_by?: string | null
          weekly_hours?: number
        }
        Update: {
          available_from?: string
          consultant_id?: string
          created_at?: string
          id?: string
          max_projects?: number
          updated_at?: string
          updated_by?: string | null
          weekly_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "consultant_capacity_settings_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: true
            referencedRelation: "ep_consultants"
            referencedColumns: ["id"]
          },
        ]
      }
      consultant_notes: {
        Row: {
          account_id: string
          author_id: string
          category: string | null
          content: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          account_id: string
          author_id: string
          category?: string | null
          content: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          author_id?: string
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultant_notes_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      consultant_notification_preferences: {
        Row: {
          checkpoint_reminder_days: number | null
          consultant_id: string
          created_at: string
          email_notifications: boolean | null
          id: string
          notify_overdue_actions: boolean | null
          notify_pending_actions: boolean | null
          notify_upcoming_checkpoints: boolean | null
          updated_at: string
        }
        Insert: {
          checkpoint_reminder_days?: number | null
          consultant_id: string
          created_at?: string
          email_notifications?: boolean | null
          id?: string
          notify_overdue_actions?: boolean | null
          notify_pending_actions?: boolean | null
          notify_upcoming_checkpoints?: boolean | null
          updated_at?: string
        }
        Update: {
          checkpoint_reminder_days?: number | null
          consultant_id?: string
          created_at?: string
          email_notifications?: boolean | null
          id?: string
          notify_overdue_actions?: boolean | null
          notify_pending_actions?: boolean | null
          notify_upcoming_checkpoints?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultant_notification_preferences_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: true
            referencedRelation: "ep_consultants"
            referencedColumns: ["id"]
          },
        ]
      }
      consultant_satisfaction_invites: {
        Row: {
          client_account_id: string
          completed_at: string | null
          consultant_user_id: string
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          source: string
          status: string
          template_id: string
          token: string
        }
        Insert: {
          client_account_id: string
          completed_at?: string | null
          consultant_user_id: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          source?: string
          status?: string
          template_id: string
          token?: string
        }
        Update: {
          client_account_id?: string
          completed_at?: string | null
          consultant_user_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          source?: string
          status?: string
          template_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultant_satisfaction_invites_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "consultant_satisfaction_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      consultant_satisfaction_questions: {
        Row: {
          created_at: string
          id: string
          is_required: boolean
          options: Json | null
          order_index: number
          question_text: string
          template_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean
          options?: Json | null
          order_index?: number
          question_text: string
          template_id: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean
          options?: Json | null
          order_index?: number
          question_text?: string
          template_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultant_satisfaction_questions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "consultant_satisfaction_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      consultant_satisfaction_responses: {
        Row: {
          created_at: string
          id: string
          invite_id: string
          question_id: string
          respondent_email: string | null
          respondent_name: string | null
          value_numeric: number | null
          value_options: Json | null
          value_text: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          invite_id: string
          question_id: string
          respondent_email?: string | null
          respondent_name?: string | null
          value_numeric?: number | null
          value_options?: Json | null
          value_text?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          invite_id?: string
          question_id?: string
          respondent_email?: string | null
          respondent_name?: string | null
          value_numeric?: number | null
          value_options?: Json | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultant_satisfaction_responses_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "consultant_satisfaction_invites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultant_satisfaction_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "consultant_satisfaction_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      consultant_satisfaction_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          recurrence_days: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          recurrence_days?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          recurrence_days?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      consultant_time_entries: {
        Row: {
          account_id: string
          billable: boolean | null
          category: string
          checkpoint_id: string | null
          consultant_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          duration_minutes: number
          end_time: string | null
          entry_date: string
          id: string
          start_time: string | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          billable?: boolean | null
          category: string
          checkpoint_id?: string | null
          consultant_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_minutes: number
          end_time?: string | null
          entry_date: string
          id?: string
          start_time?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          billable?: boolean | null
          category?: string
          checkpoint_id?: string | null
          consultant_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          end_time?: string | null
          entry_date?: string
          id?: string
          start_time?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultant_time_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultant_time_entries_checkpoint_id_fkey"
            columns: ["checkpoint_id"]
            isOneToOne: false
            referencedRelation: "project_checkpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultant_time_entries_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "ep_consultants"
            referencedColumns: ["id"]
          },
        ]
      }
      continuous_hiring_recommendations: {
        Row: {
          account_id: string
          candidate_id: string
          composite_score: number | null
          created_at: string
          id: string
          job_id: string
          recommendation_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          similarity_score: number | null
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          candidate_id: string
          composite_score?: number | null
          created_at?: string
          id?: string
          job_id: string
          recommendation_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          similarity_score?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          candidate_id?: string
          composite_score?: number | null
          created_at?: string
          id?: string
          job_id?: string
          recommendation_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          similarity_score?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "continuous_hiring_recommendations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "continuous_hiring_recommendations_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "recruitment_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "continuous_hiring_recommendations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          sort_order: number | null
          thumbnail: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          sort_order?: number | null
          thumbnail?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          sort_order?: number | null
          thumbnail?: string | null
          title?: string
        }
        Relationships: []
      }
      culture_code_files: {
        Row: {
          account_id: string
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          is_active: boolean | null
          updated_at: string | null
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "culture_code_files_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      culture_code_sessions: {
        Row: {
          account_id: string
          company_history: string | null
          created_at: string | null
          id: string
          slides: Json | null
          stage: string | null
          structure: Json | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          company_history?: string | null
          created_at?: string | null
          id?: string
          slides?: Json | null
          stage?: string | null
          structure?: Json | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          company_history?: string | null
          created_at?: string | null
          id?: string
          slides?: Json | null
          stage?: string | null
          structure?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "culture_code_sessions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      culture_code_shares: {
        Row: {
          account_id: string
          created_at: string | null
          created_by: string | null
          expires_at: string
          file_id: string
          id: string
          is_active: boolean | null
          token: string
          view_count: number | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          created_by?: string | null
          expires_at: string
          file_id: string
          id?: string
          is_active?: boolean | null
          token: string
          view_count?: number | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string
          file_id?: string
          id?: string
          is_active?: boolean | null
          token?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "culture_code_shares_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "culture_code_shares_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "culture_code_files"
            referencedColumns: ["id"]
          },
        ]
      }
      culture_code_templates: {
        Row: {
          created_at: string | null
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          title: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          title: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          title?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      culture_code_version_history: {
        Row: {
          created_at: string | null
          id: string
          session_id: string
          snapshot: Json
          variant: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          session_id: string
          snapshot: Json
          variant?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          session_id?: string
          snapshot?: Json
          variant?: string
        }
        Relationships: [
          {
            foreignKeyName: "culture_code_version_history_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "culture_code_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      culture_interview_behavioral_insights: {
        Row: {
          adaptability_score: number | null
          badges: string[] | null
          communication_score: number | null
          created_at: string
          cultural_convergences: Json | null
          dimension_details: Json | null
          disc_indicators: Json | null
          emotional_intelligence_score: number | null
          id: string
          leadership_score: number | null
          overall_behavioral_score: number | null
          results_orientation_score: number | null
          session_id: string
          structured_reasoning_score: number | null
          summary: string | null
        }
        Insert: {
          adaptability_score?: number | null
          badges?: string[] | null
          communication_score?: number | null
          created_at?: string
          cultural_convergences?: Json | null
          dimension_details?: Json | null
          disc_indicators?: Json | null
          emotional_intelligence_score?: number | null
          id?: string
          leadership_score?: number | null
          overall_behavioral_score?: number | null
          results_orientation_score?: number | null
          session_id: string
          structured_reasoning_score?: number | null
          summary?: string | null
        }
        Update: {
          adaptability_score?: number | null
          badges?: string[] | null
          communication_score?: number | null
          created_at?: string
          cultural_convergences?: Json | null
          dimension_details?: Json | null
          disc_indicators?: Json | null
          emotional_intelligence_score?: number | null
          id?: string
          leadership_score?: number | null
          overall_behavioral_score?: number | null
          results_orientation_score?: number | null
          session_id?: string
          structured_reasoning_score?: number | null
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "culture_interview_behavioral_insights_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "culture_interview_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "culture_interview_behavioral_insights_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "v_voice_interview_health_24h"
            referencedColumns: ["session_id"]
          },
        ]
      }
      culture_interview_criteria_evaluations: {
        Row: {
          alignment_level: string
          base_score: number | null
          confidence_level: string | null
          created_at: string | null
          criterion_id: string
          criterion_name: string
          evidence_count: number | null
          generic_response_detected: boolean | null
          id: string
          impact_percentage: number | null
          importance: string
          justification: string
          legacy_score: number | null
          minimum_score_percent: number | null
          negative_evidence: Json | null
          passed_minimum: boolean
          penalty_applied: number | null
          positive_evidence: Json | null
          questions_used: Json | null
          red_flags: Json | null
          score: number
          session_id: string
          weight: number
          weight_multiplier: number
        }
        Insert: {
          alignment_level: string
          base_score?: number | null
          confidence_level?: string | null
          created_at?: string | null
          criterion_id: string
          criterion_name: string
          evidence_count?: number | null
          generic_response_detected?: boolean | null
          id?: string
          impact_percentage?: number | null
          importance: string
          justification: string
          legacy_score?: number | null
          minimum_score_percent?: number | null
          negative_evidence?: Json | null
          passed_minimum?: boolean
          penalty_applied?: number | null
          positive_evidence?: Json | null
          questions_used?: Json | null
          red_flags?: Json | null
          score: number
          session_id: string
          weight?: number
          weight_multiplier?: number
        }
        Update: {
          alignment_level?: string
          base_score?: number | null
          confidence_level?: string | null
          created_at?: string | null
          criterion_id?: string
          criterion_name?: string
          evidence_count?: number | null
          generic_response_detected?: boolean | null
          id?: string
          impact_percentage?: number | null
          importance?: string
          justification?: string
          legacy_score?: number | null
          minimum_score_percent?: number | null
          negative_evidence?: Json | null
          passed_minimum?: boolean
          penalty_applied?: number | null
          positive_evidence?: Json | null
          questions_used?: Json | null
          red_flags?: Json | null
          score?: number
          session_id?: string
          weight?: number
          weight_multiplier?: number
        }
        Relationships: [
          {
            foreignKeyName: "culture_interview_criteria_evaluations_criterion_id_fkey"
            columns: ["criterion_id"]
            isOneToOne: false
            referencedRelation: "recruitment_agent_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "culture_interview_criteria_evaluations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "culture_interview_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "culture_interview_criteria_evaluations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_voice_interview_health_24h"
            referencedColumns: ["session_id"]
          },
        ]
      }
      culture_interview_responses: {
        Row: {
          ai_comment: string | null
          ai_question_spoken: string | null
          candidate_response: string | null
          created_at: string
          end_seconds: number | null
          follow_up_question: string | null
          follow_up_response: string | null
          id: string
          question_index: number
          question_text: string
          session_id: string
          start_seconds: number | null
          updated_at: string
          value_label: string | null
        }
        Insert: {
          ai_comment?: string | null
          ai_question_spoken?: string | null
          candidate_response?: string | null
          created_at?: string
          end_seconds?: number | null
          follow_up_question?: string | null
          follow_up_response?: string | null
          id?: string
          question_index: number
          question_text: string
          session_id: string
          start_seconds?: number | null
          updated_at?: string
          value_label?: string | null
        }
        Update: {
          ai_comment?: string | null
          ai_question_spoken?: string | null
          candidate_response?: string | null
          created_at?: string
          end_seconds?: number | null
          follow_up_question?: string | null
          follow_up_response?: string | null
          id?: string
          question_index?: number
          question_text?: string
          session_id?: string
          start_seconds?: number | null
          updated_at?: string
          value_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "culture_interview_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "culture_interview_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "culture_interview_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_voice_interview_health_24h"
            referencedColumns: ["session_id"]
          },
        ]
      }
      culture_interview_sessions: {
        Row: {
          abandoned_reason: string | null
          account_id: string
          agent_id: string | null
          ai_messages: Json
          aligned_responses: Json | null
          archived_at: string | null
          attempt_number: number
          audio_duration_seconds: number | null
          audio_status: string
          audio_storage_path: string | null
          audio_url: string | null
          avg_confidence_level: string | null
          can_resume: boolean
          candidate_id: string | null
          candidate_profile_id: string | null
          candidate_radar_data: Json | null
          company_radar_data: Json | null
          completed_at: string | null
          completed_naturally: boolean | null
          conductor_enabled: boolean
          conductor_state: Json
          connection_lost_at: string | null
          coverage_log: Json
          created_at: string
          credits_consumed_at: string | null
          credits_reverted_at: string | null
          current_followup_count: number
          current_question_index: number
          duration_seconds: number | null
          email_resend_count: number | null
          email_sent_at: string | null
          evaluated_in_shadow_mode: boolean | null
          evaluation_audit_trail: Json | null
          evidence_floor_passed: boolean | null
          expires_at: string | null
          id: string
          import_notes: string | null
          imported_by: string | null
          is_partial_evaluation: boolean
          is_test: boolean
          job_id: string
          last_activity_at: string | null
          last_premature_end_blocked_at: string | null
          legacy_recommendation: string | null
          legacy_score: number | null
          matching_analysis: string | null
          matching_score: number | null
          metadata: Json
          misaligned_responses: Json | null
          partial_transcript: string | null
          questions: Json
          questions_covered: number
          questions_total: number | null
          recommendation: string | null
          recorded_at: string | null
          recovery_attempted: boolean | null
          red_flags_count: number | null
          responses: Json
          resume_count: number
          resume_expires_at: string | null
          reused_from_session_id: string | null
          shadow_evaluation_diff: Json | null
          source: string
          started_at: string | null
          status: string
          strictness_profile_used: string | null
          token: string | null
          updated_at: string
          watchdog_processed_at: string | null
        }
        Insert: {
          abandoned_reason?: string | null
          account_id: string
          agent_id?: string | null
          ai_messages?: Json
          aligned_responses?: Json | null
          archived_at?: string | null
          attempt_number?: number
          audio_duration_seconds?: number | null
          audio_status?: string
          audio_storage_path?: string | null
          audio_url?: string | null
          avg_confidence_level?: string | null
          can_resume?: boolean
          candidate_id?: string | null
          candidate_profile_id?: string | null
          candidate_radar_data?: Json | null
          company_radar_data?: Json | null
          completed_at?: string | null
          completed_naturally?: boolean | null
          conductor_enabled?: boolean
          conductor_state?: Json
          connection_lost_at?: string | null
          coverage_log?: Json
          created_at?: string
          credits_consumed_at?: string | null
          credits_reverted_at?: string | null
          current_followup_count?: number
          current_question_index?: number
          duration_seconds?: number | null
          email_resend_count?: number | null
          email_sent_at?: string | null
          evaluated_in_shadow_mode?: boolean | null
          evaluation_audit_trail?: Json | null
          evidence_floor_passed?: boolean | null
          expires_at?: string | null
          id?: string
          import_notes?: string | null
          imported_by?: string | null
          is_partial_evaluation?: boolean
          is_test?: boolean
          job_id: string
          last_activity_at?: string | null
          last_premature_end_blocked_at?: string | null
          legacy_recommendation?: string | null
          legacy_score?: number | null
          matching_analysis?: string | null
          matching_score?: number | null
          metadata?: Json
          misaligned_responses?: Json | null
          partial_transcript?: string | null
          questions?: Json
          questions_covered?: number
          questions_total?: number | null
          recommendation?: string | null
          recorded_at?: string | null
          recovery_attempted?: boolean | null
          red_flags_count?: number | null
          responses?: Json
          resume_count?: number
          resume_expires_at?: string | null
          reused_from_session_id?: string | null
          shadow_evaluation_diff?: Json | null
          source?: string
          started_at?: string | null
          status?: string
          strictness_profile_used?: string | null
          token?: string | null
          updated_at?: string
          watchdog_processed_at?: string | null
        }
        Update: {
          abandoned_reason?: string | null
          account_id?: string
          agent_id?: string | null
          ai_messages?: Json
          aligned_responses?: Json | null
          archived_at?: string | null
          attempt_number?: number
          audio_duration_seconds?: number | null
          audio_status?: string
          audio_storage_path?: string | null
          audio_url?: string | null
          avg_confidence_level?: string | null
          can_resume?: boolean
          candidate_id?: string | null
          candidate_profile_id?: string | null
          candidate_radar_data?: Json | null
          company_radar_data?: Json | null
          completed_at?: string | null
          completed_naturally?: boolean | null
          conductor_enabled?: boolean
          conductor_state?: Json
          connection_lost_at?: string | null
          coverage_log?: Json
          created_at?: string
          credits_consumed_at?: string | null
          credits_reverted_at?: string | null
          current_followup_count?: number
          current_question_index?: number
          duration_seconds?: number | null
          email_resend_count?: number | null
          email_sent_at?: string | null
          evaluated_in_shadow_mode?: boolean | null
          evaluation_audit_trail?: Json | null
          evidence_floor_passed?: boolean | null
          expires_at?: string | null
          id?: string
          import_notes?: string | null
          imported_by?: string | null
          is_partial_evaluation?: boolean
          is_test?: boolean
          job_id?: string
          last_activity_at?: string | null
          last_premature_end_blocked_at?: string | null
          legacy_recommendation?: string | null
          legacy_score?: number | null
          matching_analysis?: string | null
          matching_score?: number | null
          metadata?: Json
          misaligned_responses?: Json | null
          partial_transcript?: string | null
          questions?: Json
          questions_covered?: number
          questions_total?: number | null
          recommendation?: string | null
          recorded_at?: string | null
          recovery_attempted?: boolean | null
          red_flags_count?: number | null
          responses?: Json
          resume_count?: number
          resume_expires_at?: string | null
          reused_from_session_id?: string | null
          shadow_evaluation_diff?: Json | null
          source?: string
          started_at?: string | null
          status?: string
          strictness_profile_used?: string | null
          token?: string | null
          updated_at?: string
          watchdog_processed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "culture_interview_sessions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "culture_interview_sessions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "recruitment_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "culture_interview_sessions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "recruitment_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "culture_interview_sessions_candidate_profile_id_fkey"
            columns: ["candidate_profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "culture_interview_sessions_reused_from_session_id_fkey"
            columns: ["reused_from_session_id"]
            isOneToOne: false
            referencedRelation: "culture_interview_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "culture_interview_sessions_reused_from_session_id_fkey"
            columns: ["reused_from_session_id"]
            isOneToOne: false
            referencedRelation: "v_voice_interview_health_24h"
            referencedColumns: ["session_id"]
          },
        ]
      }
      cv_match_cache: {
        Row: {
          account_id: string
          breakdown: Json
          created_at: string
          cv_hash: string
          estimated_cost: number | null
          expires_at: string
          id: string
          job_id: string
          match_score: number | null
          model_used: string | null
          recommendation: string | null
          tokens_used: number | null
        }
        Insert: {
          account_id: string
          breakdown?: Json
          created_at?: string
          cv_hash: string
          estimated_cost?: number | null
          expires_at?: string
          id?: string
          job_id: string
          match_score?: number | null
          model_used?: string | null
          recommendation?: string | null
          tokens_used?: number | null
        }
        Update: {
          account_id?: string
          breakdown?: Json
          created_at?: string
          cv_hash?: string
          estimated_cost?: number | null
          expires_at?: string
          id?: string
          job_id?: string
          match_score?: number | null
          model_used?: string | null
          recommendation?: string | null
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cv_match_cache_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cv_match_cache_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_answers: {
        Row: {
          answer_text: string
          created_at: string | null
          id: string
          is_suggestion: boolean | null
          question_number: number
          session_id: string
        }
        Insert: {
          answer_text: string
          created_at?: string | null
          id?: string
          is_suggestion?: boolean | null
          question_number: number
          session_id: string
        }
        Update: {
          answer_text?: string
          created_at?: string | null
          id?: string
          is_suggestion?: boolean | null
          question_number?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "decision_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_sessions: {
        Row: {
          account_id: string | null
          compiled_decision: Json | null
          created_at: string | null
          id: string
          stage: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          compiled_decision?: Json | null
          created_at?: string | null
          id?: string
          stage?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          compiled_decision?: Json | null
          created_at?: string | null
          id?: string
          stage?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_sessions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_version_history: {
        Row: {
          created_at: string | null
          id: string
          session_id: string
          snapshot: Json
          variant: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          session_id: string
          snapshot: Json
          variant?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          session_id?: string
          snapshot?: Json
          variant?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_version_history_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "decision_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      development_catalog: {
        Row: {
          active: boolean | null
          category: string
          category_icon: string | null
          category_label: string
          created_at: string | null
          id: string
          label: string
        }
        Insert: {
          active?: boolean | null
          category: string
          category_icon?: string | null
          category_label: string
          created_at?: string | null
          id?: string
          label: string
        }
        Update: {
          active?: boolean | null
          category?: string
          category_icon?: string | null
          category_label?: string
          created_at?: string | null
          id?: string
          label?: string
        }
        Relationships: []
      }
      development_selections: {
        Row: {
          category: string | null
          category_label: string | null
          created_at: string | null
          id: string
          item_id: string
          label: string | null
          phase: number
          session_id: string
        }
        Insert: {
          category?: string | null
          category_label?: string | null
          created_at?: string | null
          id?: string
          item_id: string
          label?: string | null
          phase: number
          session_id: string
        }
        Update: {
          category?: string | null
          category_label?: string | null
          created_at?: string | null
          id?: string
          item_id?: string
          label?: string | null
          phase?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "development_selections_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "development_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      development_sessions: {
        Row: {
          account_id: string | null
          created_at: string | null
          deleted_at: string | null
          id: string
          stage: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          stage?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          stage?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "development_sessions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      development_version_history: {
        Row: {
          created_at: string | null
          id: string
          session_id: string
          snapshot: Json
          variant: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          session_id: string
          snapshot: Json
          variant?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          session_id?: string
          snapshot?: Json
          variant?: string
        }
        Relationships: [
          {
            foreignKeyName: "development_version_history_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "development_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      disc_questions: {
        Row: {
          created_at: string | null
          dimension: string
          id: string
          is_active: boolean | null
          is_reverse_scored: boolean | null
          question_number: number
          question_text: string
        }
        Insert: {
          created_at?: string | null
          dimension: string
          id?: string
          is_active?: boolean | null
          is_reverse_scored?: boolean | null
          question_number: number
          question_text: string
        }
        Update: {
          created_at?: string | null
          dimension?: string
          id?: string
          is_active?: boolean | null
          is_reverse_scored?: boolean | null
          question_number?: number
          question_text?: string
        }
        Relationships: []
      }
      disc_responses: {
        Row: {
          created_at: string | null
          id: string
          question_id: string
          score: number
          session_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          question_id: string
          score: number
          session_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          question_id?: string
          score?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "disc_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "disc_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disc_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "disc_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      disc_results: {
        Row: {
          c_normalized: number
          c_score: number
          created_at: string | null
          d_normalized: number
          d_score: number
          i_normalized: number
          i_score: number
          id: string
          intensity: string
          is_balanced: boolean | null
          primary_profile: string
          s_normalized: number
          s_score: number
          secondary_profile: string | null
          session_id: string
        }
        Insert: {
          c_normalized: number
          c_score: number
          created_at?: string | null
          d_normalized: number
          d_score: number
          i_normalized: number
          i_score: number
          id?: string
          intensity: string
          is_balanced?: boolean | null
          primary_profile: string
          s_normalized: number
          s_score: number
          secondary_profile?: string | null
          session_id: string
        }
        Update: {
          c_normalized?: number
          c_score?: number
          created_at?: string | null
          d_normalized?: number
          d_score?: number
          i_normalized?: number
          i_score?: number
          id?: string
          intensity?: string
          is_balanced?: boolean | null
          primary_profile?: string
          s_normalized?: number
          s_score?: number
          secondary_profile?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "disc_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "disc_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      disc_sessions: {
        Row: {
          account_id: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          onboarding_process_id: string | null
          participant_email: string | null
          participant_name: string
          started_at: string | null
          status: string | null
          team_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          onboarding_process_id?: string | null
          participant_email?: string | null
          participant_name: string
          started_at?: string | null
          status?: string | null
          team_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          onboarding_process_id?: string | null
          participant_email?: string | null
          participant_name?: string
          started_at?: string | null
          status?: string | null
          team_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "disc_sessions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disc_sessions_onboarding_process_id_fkey"
            columns: ["onboarding_process_id"]
            isOneToOne: false
            referencedRelation: "onboarding_processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disc_sessions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "pulse_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      email_intake_config: {
        Row: {
          account_id: string
          created_at: string
          dedicated_email: string
          id: string
          is_active: boolean
          last_received_at: string | null
          slug: string
          total_received: number
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          dedicated_email: string
          id?: string
          is_active?: boolean
          last_received_at?: string | null
          slug: string
          total_received?: number
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          dedicated_email?: string
          id?: string
          is_active?: boolean
          last_received_at?: string | null
          slug?: string
          total_received?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_intake_config_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      employee_positions: {
        Row: {
          created_at: string | null
          current_salary: number | null
          effective_date: string | null
          id: string
          level_id: string
          notes: string | null
          profile_id: string
          progression_status: string | null
          range_position: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_salary?: number | null
          effective_date?: string | null
          id?: string
          level_id: string
          notes?: string | null
          profile_id: string
          progression_status?: string | null
          range_position?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_salary?: number | null
          effective_date?: string | null
          id?: string
          level_id?: string
          notes?: string | null
          profile_id?: string
          progression_status?: string | null
          range_position?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_positions_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "position_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_positions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_positions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_testimonials: {
        Row: {
          account_id: string
          created_at: string | null
          display_order: number | null
          employee_name: string
          employee_photo_url: string | null
          employee_role: string | null
          id: string
          is_active: boolean | null
          testimonial_text: string
          updated_at: string | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          display_order?: number | null
          employee_name: string
          employee_photo_url?: string | null
          employee_role?: string | null
          id?: string
          is_active?: boolean | null
          testimonial_text: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          display_order?: number | null
          employee_name?: string
          employee_photo_url?: string | null
          employee_role?: string | null
          id?: string
          is_active?: boolean | null
          testimonial_text?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_testimonials_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          account_id: string
          avatar_url: string | null
          birth_date: string | null
          created_at: string | null
          department: string | null
          email: string | null
          full_name: string
          hire_date: string | null
          id: string
          is_active: boolean | null
          job_title: string | null
          linkedin_url: string | null
          location: string | null
          phone: string | null
          profile_id: string | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name: string
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          job_title?: string | null
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          profile_id?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          job_title?: string | null
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          profile_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      energy_catalog: {
        Row: {
          active: boolean | null
          category: string
          category_icon: string | null
          category_label: string
          created_at: string | null
          id: string
          label: string
        }
        Insert: {
          active?: boolean | null
          category: string
          category_icon?: string | null
          category_label: string
          created_at?: string | null
          id?: string
          label: string
        }
        Update: {
          active?: boolean | null
          category?: string
          category_icon?: string | null
          category_label?: string
          created_at?: string | null
          id?: string
          label?: string
        }
        Relationships: []
      }
      energy_selections: {
        Row: {
          category: string | null
          category_label: string | null
          created_at: string | null
          id: string
          item_id: string
          label: string | null
          phase: number
          session_id: string
        }
        Insert: {
          category?: string | null
          category_label?: string | null
          created_at?: string | null
          id?: string
          item_id: string
          label?: string | null
          phase: number
          session_id: string
        }
        Update: {
          category?: string | null
          category_label?: string | null
          created_at?: string | null
          id?: string
          item_id?: string
          label?: string | null
          phase?: number
          session_id?: string
        }
        Relationships: []
      }
      energy_sessions: {
        Row: {
          account_id: string | null
          created_at: string | null
          deleted_at: string | null
          id: string
          stage: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          stage?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          stage?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "energy_sessions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      energy_version_history: {
        Row: {
          created_at: string | null
          id: string
          session_id: string
          snapshot: Json
          variant: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          session_id: string
          snapshot: Json
          variant?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          session_id?: string
          snapshot?: Json
          variant?: string
        }
        Relationships: [
          {
            foreignKeyName: "energy_version_history_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "energy_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ep_consultants: {
        Row: {
          active: boolean
          created_at: string
          created_by: string
          email: string
          id: string
          name: string
          phone: string | null
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by: string
          email: string
          id?: string
          name: string
          phone?: string | null
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ep_invites: {
        Row: {
          accepted: boolean | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          name: string
          role: string
        }
        Insert: {
          accepted?: boolean | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          name: string
          role: string
        }
        Update: {
          accepted?: boolean | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          name?: string
          role?: string
        }
        Relationships: []
      }
      ep_partner_users: {
        Row: {
          created_at: string | null
          id: string
          invited_by: string | null
          partner_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          invited_by?: string | null
          partner_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          invited_by?: string | null
          partner_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ep_partner_users_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "ep_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      ep_partners: {
        Row: {
          active: boolean | null
          company_name: string | null
          cpf_cnpj: string | null
          created_at: string | null
          created_by: string
          email: string
          id: string
          name: string
          notes: string | null
          own_project_grant_id: string | null
          phone: string | null
          promo_code: string
          user_id: string
        }
        Insert: {
          active?: boolean | null
          company_name?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          created_by: string
          email: string
          id?: string
          name: string
          notes?: string | null
          own_project_grant_id?: string | null
          phone?: string | null
          promo_code: string
          user_id: string
        }
        Update: {
          active?: boolean | null
          company_name?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          created_by?: string
          email?: string
          id?: string
          name?: string
          notes?: string | null
          own_project_grant_id?: string | null
          phone?: string | null
          promo_code?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ep_partners_own_project_grant_id_fkey"
            columns: ["own_project_grant_id"]
            isOneToOne: false
            referencedRelation: "partner_client_grants"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluator_tier_change_log: {
        Row: {
          account_id: string
          changed_by: string | null
          created_at: string
          id: string
          new_tier: string
          old_tier: string | null
          reason: string | null
        }
        Insert: {
          account_id: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_tier: string
          old_tier?: string | null
          reason?: string | null
        }
        Update: {
          account_id?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_tier?: string
          old_tier?: string | null
          reason?: string | null
        }
        Relationships: []
      }
      event_items: {
        Row: {
          created_at: string | null
          id: string
          item_text: string
          pillar_number: number
          session_id: string
          source: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_text: string
          pillar_number: number
          session_id: string
          source: string
        }
        Update: {
          created_at?: string | null
          id?: string
          item_text?: string
          pillar_number?: number
          session_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "event_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      event_sessions: {
        Row: {
          account_id: string | null
          created_at: string | null
          event_format: string | null
          id: string
          stage: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          event_format?: string | null
          id?: string
          stage?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          event_format?: string | null
          id?: string
          stage?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_sessions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      event_suggestions_catalog: {
        Row: {
          active: boolean | null
          created_at: string | null
          event_format: string | null
          id: string
          pillar_number: number
          suggestion_text: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          event_format?: string | null
          id?: string
          pillar_number: number
          suggestion_text: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          event_format?: string | null
          id?: string
          pillar_number?: number
          suggestion_text?: string
        }
        Relationships: []
      }
      event_version_history: {
        Row: {
          created_at: string | null
          id: string
          session_id: string
          snapshot: Json
          variant: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          session_id: string
          snapshot: Json
          variant?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          session_id?: string
          snapshot?: Json
          variant?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_version_history_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "event_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      evolution_actions: {
        Row: {
          action_type: string
          completed_at: string | null
          created_at: string
          description: string
          due_date: string | null
          evidence_description: string | null
          evidence_url: string | null
          id: string
          linked_project_id: string | null
          linked_project_name: string | null
          objective_id: string
          order_index: number | null
          responsible: string | null
          status: string
          updated_at: string
        }
        Insert: {
          action_type: string
          completed_at?: string | null
          created_at?: string
          description: string
          due_date?: string | null
          evidence_description?: string | null
          evidence_url?: string | null
          id?: string
          linked_project_id?: string | null
          linked_project_name?: string | null
          objective_id: string
          order_index?: number | null
          responsible?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          completed_at?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          evidence_description?: string | null
          evidence_url?: string | null
          id?: string
          linked_project_id?: string | null
          linked_project_name?: string | null
          objective_id?: string
          order_index?: number | null
          responsible?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evolution_actions_linked_project_id_fkey"
            columns: ["linked_project_id"]
            isOneToOne: false
            referencedRelation: "strategic_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evolution_actions_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "evolution_objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      evolution_checkins: {
        Row: {
          ai_generated_questions: Json | null
          blockers: string | null
          checkin_date: string
          checkin_type: string | null
          created_at: string
          created_by: string | null
          cycle_id: string
          id: string
          next_steps: string | null
          overall_progress: number | null
          perceived_evolution: string | null
          planned_vs_executed: string | null
          real_evidence: string | null
        }
        Insert: {
          ai_generated_questions?: Json | null
          blockers?: string | null
          checkin_date?: string
          checkin_type?: string | null
          created_at?: string
          created_by?: string | null
          cycle_id: string
          id?: string
          next_steps?: string | null
          overall_progress?: number | null
          perceived_evolution?: string | null
          planned_vs_executed?: string | null
          real_evidence?: string | null
        }
        Update: {
          ai_generated_questions?: Json | null
          blockers?: string | null
          checkin_date?: string
          checkin_type?: string | null
          created_at?: string
          created_by?: string | null
          cycle_id?: string
          id?: string
          next_steps?: string | null
          overall_progress?: number | null
          perceived_evolution?: string | null
          planned_vs_executed?: string | null
          real_evidence?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evolution_checkins_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "evolution_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      evolution_competencies: {
        Row: {
          competency_name: string
          competency_type: string
          created_at: string
          cycle_id: string
          development_deadline: string | null
          expected_impact: string
          has_competency: boolean | null
          id: string
          is_priority: boolean | null
          source: string | null
          source_reference_id: string | null
          strategic_justification: string
          success_indicators: string[] | null
        }
        Insert: {
          competency_name: string
          competency_type: string
          created_at?: string
          cycle_id: string
          development_deadline?: string | null
          expected_impact: string
          has_competency?: boolean | null
          id?: string
          is_priority?: boolean | null
          source?: string | null
          source_reference_id?: string | null
          strategic_justification: string
          success_indicators?: string[] | null
        }
        Update: {
          competency_name?: string
          competency_type?: string
          created_at?: string
          cycle_id?: string
          development_deadline?: string | null
          expected_impact?: string
          has_competency?: boolean | null
          id?: string
          is_priority?: boolean | null
          source?: string | null
          source_reference_id?: string | null
          strategic_justification?: string
          success_indicators?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "evolution_competencies_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "evolution_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      evolution_cycles: {
        Row: {
          account_id: string
          collaborator_id: string
          created_at: string
          created_by: string | null
          end_date: string
          id: string
          job_description_id: string | null
          leader_id: string | null
          notes: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          collaborator_id: string
          created_at?: string
          created_by?: string | null
          end_date: string
          id?: string
          job_description_id?: string | null
          leader_id?: string | null
          notes?: string | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          collaborator_id?: string
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          job_description_id?: string | null
          leader_id?: string | null
          notes?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evolution_cycles_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evolution_cycles_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evolution_cycles_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evolution_cycles_job_description_id_fkey"
            columns: ["job_description_id"]
            isOneToOne: false
            referencedRelation: "job_descriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evolution_cycles_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evolution_cycles_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      evolution_feedbacks: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          cycle_id: string
          feedback_type: string
          id: string
          translated_focus: string | null
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          cycle_id: string
          feedback_type: string
          id?: string
          translated_focus?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          cycle_id?: string
          feedback_type?: string
          id?: string
          translated_focus?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evolution_feedbacks_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "evolution_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      evolution_objectives: {
        Row: {
          competency_id: string | null
          created_at: string
          cycle_id: string
          id: string
          key_behaviors: string[]
          objective_text: string
          order_index: number | null
          progress_indicators: string[] | null
          status: string
          updated_at: string
        }
        Insert: {
          competency_id?: string | null
          created_at?: string
          cycle_id: string
          id?: string
          key_behaviors?: string[]
          objective_text: string
          order_index?: number | null
          progress_indicators?: string[] | null
          status?: string
          updated_at?: string
        }
        Update: {
          competency_id?: string | null
          created_at?: string
          cycle_id?: string
          id?: string
          key_behaviors?: string[]
          objective_text?: string
          order_index?: number | null
          progress_indicators?: string[] | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evolution_objectives_competency_id_fkey"
            columns: ["competency_id"]
            isOneToOne: false
            referencedRelation: "evolution_competencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evolution_objectives_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "evolution_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_llm_mapping: {
        Row: {
          avg_tokens_input: number | null
          avg_tokens_output: number | null
          created_at: string
          feature_key: string
          model_id: string
          notes: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          avg_tokens_input?: number | null
          avg_tokens_output?: number | null
          created_at?: string
          feature_key: string
          model_id: string
          notes?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          avg_tokens_input?: number | null
          avg_tokens_output?: number | null
          created_at?: string
          feature_key?: string
          model_id?: string
          notes?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      fees_historico: {
        Row: {
          account_id: string
          cliente_id: string | null
          created_at: string
          data_previsao: string | null
          data_recebimento: string | null
          forma_recebimento: string | null
          id: string
          is_demo: boolean
          numero_nota_fiscal: string | null
          observacoes: string | null
          status: string | null
          updated_at: string
          vaga_id: string | null
          valor_fee: number
        }
        Insert: {
          account_id: string
          cliente_id?: string | null
          created_at?: string
          data_previsao?: string | null
          data_recebimento?: string | null
          forma_recebimento?: string | null
          id?: string
          is_demo?: boolean
          numero_nota_fiscal?: string | null
          observacoes?: string | null
          status?: string | null
          updated_at?: string
          vaga_id?: string | null
          valor_fee: number
        }
        Update: {
          account_id?: string
          cliente_id?: string | null
          created_at?: string
          data_previsao?: string | null
          data_recebimento?: string | null
          forma_recebimento?: string | null
          id?: string
          is_demo?: boolean
          numero_nota_fiscal?: string | null
          observacoes?: string | null
          status?: string | null
          updated_at?: string
          vaga_id?: string | null
          valor_fee?: number
        }
        Relationships: [
          {
            foreignKeyName: "fees_historico_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fees_historico_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes_consultoria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fees_historico_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      garantias_reposicao: {
        Row: {
          account_id: string
          acionada_em: string | null
          candidato_id: string
          cliente_id: string | null
          concluida_em: string | null
          created_at: string
          data_contratacao: string
          data_desligamento: string | null
          garantia_expira_em: string
          id: string
          is_demo: boolean
          motivo_desligamento: string | null
          observacoes: string | null
          prazo_garantia_dias: number
          status: string | null
          updated_at: string
          vaga_original_id: string | null
          vaga_reposicao_id: string | null
        }
        Insert: {
          account_id: string
          acionada_em?: string | null
          candidato_id: string
          cliente_id?: string | null
          concluida_em?: string | null
          created_at?: string
          data_contratacao: string
          data_desligamento?: string | null
          garantia_expira_em: string
          id?: string
          is_demo?: boolean
          motivo_desligamento?: string | null
          observacoes?: string | null
          prazo_garantia_dias: number
          status?: string | null
          updated_at?: string
          vaga_original_id?: string | null
          vaga_reposicao_id?: string | null
        }
        Update: {
          account_id?: string
          acionada_em?: string | null
          candidato_id?: string
          cliente_id?: string | null
          concluida_em?: string | null
          created_at?: string
          data_contratacao?: string
          data_desligamento?: string | null
          garantia_expira_em?: string
          id?: string
          is_demo?: boolean
          motivo_desligamento?: string | null
          observacoes?: string | null
          prazo_garantia_dias?: number
          status?: string | null
          updated_at?: string
          vaga_original_id?: string | null
          vaga_reposicao_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "garantias_reposicao_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garantias_reposicao_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "recruitment_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garantias_reposicao_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes_consultoria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garantias_reposicao_vaga_original_id_fkey"
            columns: ["vaga_original_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garantias_reposicao_vaga_reposicao_id_fkey"
            columns: ["vaga_reposicao_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      hire_performance_reviews: {
        Row: {
          account_id: string
          application_id: string | null
          candidate_id: string
          created_at: string
          id: string
          job_id: string
          performance_score: number
          retention_status: Database["public"]["Enums"]["retention_status"]
          review_period: Database["public"]["Enums"]["review_period"]
          reviewed_at: string
          reviewed_by: string
          reviewer_notes: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          application_id?: string | null
          candidate_id: string
          created_at?: string
          id?: string
          job_id: string
          performance_score: number
          retention_status?: Database["public"]["Enums"]["retention_status"]
          review_period: Database["public"]["Enums"]["review_period"]
          reviewed_at?: string
          reviewed_by: string
          reviewer_notes?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          application_id?: string | null
          candidate_id?: string
          created_at?: string
          id?: string
          job_id?: string
          performance_score?: number
          retention_status?: Database["public"]["Enums"]["retention_status"]
          review_period?: Database["public"]["Enums"]["review_period"]
          reviewed_at?: string
          reviewed_by?: string
          reviewer_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hire_performance_reviews_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hire_performance_reviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "recruitment_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hire_performance_reviews_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "recruitment_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hire_performance_reviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      hiring_funnel_stages: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          funnel_id: string
          icon: string | null
          id: string
          is_required: boolean | null
          name: string
          position: number
          step_type: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          funnel_id: string
          icon?: string | null
          id?: string
          is_required?: boolean | null
          name: string
          position: number
          step_type?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          funnel_id?: string
          icon?: string | null
          id?: string
          is_required?: boolean | null
          name?: string
          position?: number
          step_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hiring_funnel_stages_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "hiring_funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      hiring_funnels: {
        Row: {
          account_id: string
          created_at: string
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hiring_funnels_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      hunting_contact_cache: {
        Row: {
          account_id: string
          cascade_log: Json
          created_at: string
          email: string | null
          email_confidence: string | null
          email_source: string | null
          expires_at: string
          id: string
          linkedin_url: string | null
          name_company_hash: string | null
          phone: string | null
          phone_is_whatsapp: boolean | null
          phone_source: string | null
          total_cost_credits: number
          updated_at: string
        }
        Insert: {
          account_id: string
          cascade_log?: Json
          created_at?: string
          email?: string | null
          email_confidence?: string | null
          email_source?: string | null
          expires_at?: string
          id?: string
          linkedin_url?: string | null
          name_company_hash?: string | null
          phone?: string | null
          phone_is_whatsapp?: boolean | null
          phone_source?: string | null
          total_cost_credits?: number
          updated_at?: string
        }
        Update: {
          account_id?: string
          cascade_log?: Json
          created_at?: string
          email?: string | null
          email_confidence?: string | null
          email_source?: string | null
          expires_at?: string
          id?: string
          linkedin_url?: string | null
          name_company_hash?: string | null
          phone?: string | null
          phone_is_whatsapp?: boolean | null
          phone_source?: string | null
          total_cost_credits?: number
          updated_at?: string
        }
        Relationships: []
      }
      hunting_daily_usage: {
        Row: {
          account_id: string
          cost_credits: number
          count: number
          created_at: string
          id: string
          provider: string
          updated_at: string
          usage_date: string
        }
        Insert: {
          account_id: string
          cost_credits?: number
          count?: number
          created_at?: string
          id?: string
          provider: string
          updated_at?: string
          usage_date?: string
        }
        Update: {
          account_id?: string
          cost_credits?: number
          count?: number
          created_at?: string
          id?: string
          provider?: string
          updated_at?: string
          usage_date?: string
        }
        Relationships: []
      }
      hunting_notifications: {
        Row: {
          account_id: string
          created_at: string | null
          id: string
          message: string | null
          read: boolean | null
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          id?: string
          message?: string | null
          read?: boolean | null
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          id?: string
          message?: string | null
          read?: boolean | null
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hunting_notifications_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      hunting_outreach_personas: {
        Row: {
          account_id: string
          created_at: string
          created_by: string | null
          example_messages: Json | null
          id: string
          name: string
          style_guidelines: string | null
          tone: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          created_by?: string | null
          example_messages?: Json | null
          id?: string
          name: string
          style_guidelines?: string | null
          tone?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          created_by?: string | null
          example_messages?: Json | null
          id?: string
          name?: string
          style_guidelines?: string | null
          tone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hunting_outreach_personas_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      hunting_provider_settings: {
        Row: {
          account_id: string
          created_at: string
          daily_firecrawl_limit: number
          enable_hunter: boolean
          enable_mailboxlayer: boolean
          enable_neverbounce: boolean
          enable_snov: boolean
          enable_twilio: boolean
          id: string
          mode: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          daily_firecrawl_limit?: number
          enable_hunter?: boolean
          enable_mailboxlayer?: boolean
          enable_neverbounce?: boolean
          enable_snov?: boolean
          enable_twilio?: boolean
          id?: string
          mode?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          daily_firecrawl_limit?: number
          enable_hunter?: boolean
          enable_mailboxlayer?: boolean
          enable_neverbounce?: boolean
          enable_snov?: boolean
          enable_twilio?: boolean
          id?: string
          mode?: string
          updated_at?: string
        }
        Relationships: []
      }
      hunting_search_templates: {
        Row: {
          account_id: string
          boolean_query: string
          category: string | null
          created_at: string
          created_by: string | null
          filters: Json | null
          id: string
          name: string
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          account_id: string
          boolean_query: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          filters?: Json | null
          id?: string
          name: string
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          account_id?: string
          boolean_query?: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          filters?: Json | null
          id?: string
          name?: string
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hunting_search_templates_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      hunting_talent_pool: {
        Row: {
          account_id: string
          candidate_name: string
          created_at: string | null
          extracted_data: Json | null
          id: string
          last_contacted_at: string | null
          notes: string | null
          skills: string[] | null
          source_result_ids: string[] | null
          source_url: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          candidate_name: string
          created_at?: string | null
          extracted_data?: Json | null
          id?: string
          last_contacted_at?: string | null
          notes?: string | null
          skills?: string[] | null
          source_result_ids?: string[] | null
          source_url?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          candidate_name?: string
          created_at?: string | null
          extracted_data?: Json | null
          id?: string
          last_contacted_at?: string | null
          notes?: string | null
          skills?: string[] | null
          source_result_ids?: string[] | null
          source_url?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hunting_talent_pool_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      impersonation_logs: {
        Row: {
          account_id: string
          ended_at: string | null
          id: string
          impersonated_user_id: string
          ip_address: string | null
          owner_id: string
          started_at: string
          user_agent: string | null
        }
        Insert: {
          account_id: string
          ended_at?: string | null
          id?: string
          impersonated_user_id: string
          ip_address?: string | null
          owner_id: string
          started_at?: string
          user_agent?: string | null
        }
        Update: {
          account_id?: string
          ended_at?: string | null
          id?: string
          impersonated_user_id?: string
          ip_address?: string | null
          owner_id?: string
          started_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "impersonation_logs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      implementation_plans: {
        Row: {
          account_id: string
          activated_at: string | null
          additional_info: string | null
          ai_plan: Json | null
          assessment_data: Json | null
          calculator_data: Json | null
          created_at: string
          created_by: string
          id: string
          mode: string
          project_duration: number | null
          selected_solutions: Json
          status: string
          steps: Json | null
          updated_at: string
        }
        Insert: {
          account_id: string
          activated_at?: string | null
          additional_info?: string | null
          ai_plan?: Json | null
          assessment_data?: Json | null
          calculator_data?: Json | null
          created_at?: string
          created_by: string
          id?: string
          mode?: string
          project_duration?: number | null
          selected_solutions?: Json
          status?: string
          steps?: Json | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          activated_at?: string | null
          additional_info?: string | null
          ai_plan?: Json | null
          assessment_data?: Json | null
          calculator_data?: Json | null
          created_at?: string
          created_by?: string
          id?: string
          mode?: string
          project_duration?: number | null
          selected_solutions?: Json
          status?: string
          steps?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "implementation_plans_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      indeed_feed_config: {
        Row: {
          account_id: string
          created_at: string
          feed_slug: string
          feed_url: string
          id: string
          indeed_publisher_id: string | null
          is_active: boolean
          last_generated_at: string | null
          last_submitted_to_indeed_at: string | null
          total_jobs_in_feed: number
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          feed_slug: string
          feed_url: string
          id?: string
          indeed_publisher_id?: string | null
          is_active?: boolean
          last_generated_at?: string | null
          last_submitted_to_indeed_at?: string | null
          total_jobs_in_feed?: number
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          feed_slug?: string
          feed_url?: string
          id?: string
          indeed_publisher_id?: string | null
          is_active?: boolean
          last_generated_at?: string | null
          last_submitted_to_indeed_at?: string | null
          total_jobs_in_feed?: number
          updated_at?: string
        }
        Relationships: []
      }
      indeed_submission_log: {
        Row: {
          account_id: string
          action: string
          created_at: string
          error_message: string | null
          feed_generated_at: string | null
          id: string
          job_id: string
          status: string
        }
        Insert: {
          account_id: string
          action: string
          created_at?: string
          error_message?: string | null
          feed_generated_at?: string | null
          id?: string
          job_id: string
          status?: string
        }
        Update: {
          account_id?: string
          action?: string
          created_at?: string
          error_message?: string | null
          feed_generated_at?: string | null
          id?: string
          job_id?: string
          status?: string
        }
        Relationships: []
      }
      indicators_version_history: {
        Row: {
          created_at: string | null
          id: string
          session_id: string
          snapshot: Json
          variant: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          session_id: string
          snapshot: Json
          variant?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          session_id?: string
          snapshot?: Json
          variant?: string
        }
        Relationships: [
          {
            foreignKeyName: "indicators_version_history_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "strategic_indicators"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_attempt_history: {
        Row: {
          account_id: string
          archived_at: string | null
          attempt_number: number
          candidate_id: string
          candidate_profile_id: string | null
          completed_at: string | null
          completed_naturally: boolean | null
          created_at: string | null
          id: string
          job_id: string
          original_session_id: string | null
          recommendation: string | null
          score: number | null
          session_type: string
          started_at: string | null
          status: string | null
          summary: Json | null
        }
        Insert: {
          account_id: string
          archived_at?: string | null
          attempt_number?: number
          candidate_id: string
          candidate_profile_id?: string | null
          completed_at?: string | null
          completed_naturally?: boolean | null
          created_at?: string | null
          id?: string
          job_id: string
          original_session_id?: string | null
          recommendation?: string | null
          score?: number | null
          session_type: string
          started_at?: string | null
          status?: string | null
          summary?: Json | null
        }
        Update: {
          account_id?: string
          archived_at?: string | null
          attempt_number?: number
          candidate_id?: string
          candidate_profile_id?: string | null
          completed_at?: string | null
          completed_naturally?: boolean | null
          created_at?: string | null
          id?: string
          job_id?: string
          original_session_id?: string | null
          recommendation?: string | null
          score?: number | null
          session_type?: string
          started_at?: string | null
          status?: string | null
          summary?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_attempt_history_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_attempt_history_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "recruitment_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_attempt_history_candidate_profile_id_fkey"
            columns: ["candidate_profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_attempt_history_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_token_usage: {
        Row: {
          account_id: string
          audio_input_cost_usd: number | null
          audio_input_seconds: number | null
          audio_input_tokens: number | null
          audio_output_cost_usd: number | null
          audio_output_seconds: number | null
          audio_output_tokens: number | null
          candidate_id: string | null
          created_at: string | null
          duration_seconds: number | null
          id: string
          job_id: string | null
          model_audio: string | null
          model_text: string | null
          session_id: string
          session_type: string
          text_cost_usd: number | null
          text_input_tokens: number | null
          text_output_tokens: number | null
          total_cost_usd: number | null
        }
        Insert: {
          account_id: string
          audio_input_cost_usd?: number | null
          audio_input_seconds?: number | null
          audio_input_tokens?: number | null
          audio_output_cost_usd?: number | null
          audio_output_seconds?: number | null
          audio_output_tokens?: number | null
          candidate_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          job_id?: string | null
          model_audio?: string | null
          model_text?: string | null
          session_id: string
          session_type: string
          text_cost_usd?: number | null
          text_input_tokens?: number | null
          text_output_tokens?: number | null
          total_cost_usd?: number | null
        }
        Update: {
          account_id?: string
          audio_input_cost_usd?: number | null
          audio_input_seconds?: number | null
          audio_input_tokens?: number | null
          audio_output_cost_usd?: number | null
          audio_output_seconds?: number | null
          audio_output_tokens?: number | null
          candidate_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          job_id?: string | null
          model_audio?: string | null
          model_text?: string | null
          session_id?: string
          session_type?: string
          text_cost_usd?: number | null
          text_input_tokens?: number | null
          text_output_tokens?: number | null
          total_cost_usd?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_token_usage_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_token_usage_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "recruitment_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_token_usage_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      intranet_posts: {
        Row: {
          account_id: string
          content: string | null
          created_at: string | null
          created_by: string | null
          department: string | null
          event_date: string | null
          expires_at: string | null
          id: string
          is_pinned: boolean | null
          media_url: string | null
          new_job_title: string | null
          post_type: string
          previous_job_title: string | null
          published_at: string | null
          related_employee_id: string | null
          related_event_id: string | null
          requires_confirmation: boolean | null
          title: string
        }
        Insert: {
          account_id: string
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          event_date?: string | null
          expires_at?: string | null
          id?: string
          is_pinned?: boolean | null
          media_url?: string | null
          new_job_title?: string | null
          post_type?: string
          previous_job_title?: string | null
          published_at?: string | null
          related_employee_id?: string | null
          related_event_id?: string | null
          requires_confirmation?: boolean | null
          title: string
        }
        Update: {
          account_id?: string
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          event_date?: string | null
          expires_at?: string | null
          id?: string
          is_pinned?: boolean | null
          media_url?: string | null
          new_job_title?: string | null
          post_type?: string
          previous_job_title?: string | null
          published_at?: string | null
          related_employee_id?: string | null
          related_event_id?: string | null
          requires_confirmation?: boolean | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "intranet_posts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intranet_posts_related_employee_id_fkey"
            columns: ["related_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intranet_posts_related_employee_id_fkey"
            columns: ["related_employee_id"]
            isOneToOne: false
            referencedRelation: "employees_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intranet_posts_related_event_id_fkey"
            columns: ["related_event_id"]
            isOneToOne: false
            referencedRelation: "org_events"
            referencedColumns: ["id"]
          },
        ]
      }
      job_alert_subscriptions: {
        Row: {
          account_id: string
          created_at: string | null
          departments: string[] | null
          email: string
          id: string
          is_active: boolean | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          departments?: string[] | null
          email: string
          id?: string
          is_active?: boolean | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          departments?: string[] | null
          email?: string
          id?: string
          is_active?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "job_alert_subscriptions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      job_benchmark_cache: {
        Row: {
          benchmark_data: Json
          created_at: string
          expires_at: string
          id: string
          industry: string
          job_title_normalized: string
          updated_at: string
        }
        Insert: {
          benchmark_data: Json
          created_at?: string
          expires_at?: string
          id?: string
          industry?: string
          job_title_normalized: string
          updated_at?: string
        }
        Update: {
          benchmark_data?: Json
          created_at?: string
          expires_at?: string
          id?: string
          industry?: string
          job_title_normalized?: string
          updated_at?: string
        }
        Relationships: []
      }
      job_descriptions: {
        Row: {
          account_id: string
          ai_suggestions: Json | null
          area: string | null
          behavioral_competencies: string[] | null
          benefits: string[] | null
          created_at: string
          custom_fields: Json | null
          desired_skills: string[] | null
          development: string[] | null
          id: string
          ideal_disc_profile: Json | null
          indicators: string[] | null
          mission: string | null
          org_node_id: string | null
          required_skills: string[] | null
          responsibilities: string[] | null
          status: string
          title: string
          updated_at: string
          wizard_step: number | null
        }
        Insert: {
          account_id: string
          ai_suggestions?: Json | null
          area?: string | null
          behavioral_competencies?: string[] | null
          benefits?: string[] | null
          created_at?: string
          custom_fields?: Json | null
          desired_skills?: string[] | null
          development?: string[] | null
          id?: string
          ideal_disc_profile?: Json | null
          indicators?: string[] | null
          mission?: string | null
          org_node_id?: string | null
          required_skills?: string[] | null
          responsibilities?: string[] | null
          status?: string
          title: string
          updated_at?: string
          wizard_step?: number | null
        }
        Update: {
          account_id?: string
          ai_suggestions?: Json | null
          area?: string | null
          behavioral_competencies?: string[] | null
          benefits?: string[] | null
          created_at?: string
          custom_fields?: Json | null
          desired_skills?: string[] | null
          development?: string[] | null
          id?: string
          ideal_disc_profile?: Json | null
          indicators?: string[] | null
          mission?: string | null
          org_node_id?: string | null
          required_skills?: string[] | null
          responsibilities?: string[] | null
          status?: string
          title?: string
          updated_at?: string
          wizard_step?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_descriptions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_descriptions_org_node_id_fkey"
            columns: ["org_node_id"]
            isOneToOne: false
            referencedRelation: "org_chart_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      job_distribution_channels: {
        Row: {
          account_id: string
          channel_name: string
          channel_type: string
          created_at: string | null
          credentials_id: string | null
          external_id: string | null
          feed_registered_at: string | null
          id: string
          is_enabled: boolean | null
          last_sync_at: string | null
          notes: string | null
          stats: Json | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          channel_name: string
          channel_type?: string
          created_at?: string | null
          credentials_id?: string | null
          external_id?: string | null
          feed_registered_at?: string | null
          id?: string
          is_enabled?: boolean | null
          last_sync_at?: string | null
          notes?: string | null
          stats?: Json | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          channel_name?: string
          channel_type?: string
          created_at?: string | null
          credentials_id?: string | null
          external_id?: string | null
          feed_registered_at?: string | null
          id?: string
          is_enabled?: boolean | null
          last_sync_at?: string | null
          notes?: string | null
          stats?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_distribution_channels_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_distribution_channels_credentials_id_fkey"
            columns: ["credentials_id"]
            isOneToOne: false
            referencedRelation: "job_distribution_credentials"
            referencedColumns: ["id"]
          },
        ]
      }
      job_distribution_credentials: {
        Row: {
          access_token_encrypted: string | null
          account_id: string
          channel_name: string
          client_id: string | null
          client_secret_encrypted: string | null
          created_at: string | null
          created_by: string | null
          credential_type: string
          error_message: string | null
          id: string
          last_validated_at: string | null
          organization_id: string | null
          refresh_token_encrypted: string | null
          scopes: string[] | null
          status: string | null
          token_expires_at: string | null
          updated_at: string | null
          webhook_url: string | null
        }
        Insert: {
          access_token_encrypted?: string | null
          account_id: string
          channel_name: string
          client_id?: string | null
          client_secret_encrypted?: string | null
          created_at?: string | null
          created_by?: string | null
          credential_type?: string
          error_message?: string | null
          id?: string
          last_validated_at?: string | null
          organization_id?: string | null
          refresh_token_encrypted?: string | null
          scopes?: string[] | null
          status?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          access_token_encrypted?: string | null
          account_id?: string
          channel_name?: string
          client_id?: string | null
          client_secret_encrypted?: string | null
          created_at?: string | null
          created_by?: string | null
          credential_type?: string
          error_message?: string | null
          id?: string
          last_validated_at?: string | null
          organization_id?: string | null
          refresh_token_encrypted?: string | null
          scopes?: string[] | null
          status?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_distribution_credentials_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      job_distribution_logs: {
        Row: {
          channel_name: string
          created_at: string | null
          distributed_at: string | null
          error_message: string | null
          external_posting_id: string | null
          id: string
          job_id: string
          metadata: Json | null
          removed_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          channel_name: string
          created_at?: string | null
          distributed_at?: string | null
          error_message?: string | null
          external_posting_id?: string | null
          id?: string
          job_id: string
          metadata?: Json | null
          removed_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          channel_name?: string
          created_at?: string | null
          distributed_at?: string | null
          error_message?: string | null
          external_posting_id?: string | null
          id?: string
          job_id?: string
          metadata?: Json | null
          removed_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_distribution_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_embeddings: {
        Row: {
          account_id: string
          content_hash: string
          content_text: string | null
          created_at: string
          embedding: string | null
          id: string
          job_id: string
          metadata: Json | null
          source_type: string
          updated_at: string
        }
        Insert: {
          account_id: string
          content_hash: string
          content_text?: string | null
          created_at?: string
          embedding?: string | null
          id?: string
          job_id: string
          metadata?: Json | null
          source_type: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          content_hash?: string
          content_text?: string | null
          created_at?: string
          embedding?: string | null
          id?: string
          job_id?: string
          metadata?: Json | null
          source_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_embeddings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_embeddings_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_families: {
        Row: {
          career_track: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          model_id: string
          name: string
        }
        Insert: {
          career_track?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          model_id: string
          name: string
        }
        Update: {
          career_track?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          model_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_families_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "compensation_models"
            referencedColumns: ["id"]
          },
        ]
      }
      job_icps: {
        Row: {
          account_id: string
          apollo_filters_json: Json | null
          approved_candidates_count: number | null
          communication_style: string | null
          company_size_ranges: string[] | null
          confidence_threshold: number | null
          created_at: string | null
          culture_traits_required: string[] | null
          deal_breakers: string[] | null
          excluded_current_titles: string[] | null
          experience_years_max: number | null
          experience_years_min: number | null
          generated_by: string | null
          id: string
          industry_preferences: string[] | null
          is_active: boolean | null
          job_id: string
          keywords: string[] | null
          last_calibrated_at: string | null
          learned_patterns: Json | null
          linkedin_boolean_query: string | null
          mandatory_skills: string[]
          min_hunting_score: number
          negative_keywords: string[] | null
          negative_trajectory_patterns: string[] | null
          nice_to_have: string[] | null
          openness_signals: string[] | null
          reference_companies: string[] | null
          role: string
          salary_range_max: number | null
          salary_range_min: number | null
          sales_navigator_url: string | null
          scoring_weights: Json | null
          search_keywords: string[] | null
          seniority: string
          target_companies: string[] | null
          target_locations: string[] | null
          target_sources: string[] | null
          target_title: string | null
          tenure_min_months: number | null
          tenure_penalty: string | null
          title_variations: string[] | null
          updated_at: string | null
          valued_previous_roles: string[] | null
          version: number | null
          work_context: string | null
        }
        Insert: {
          account_id: string
          apollo_filters_json?: Json | null
          approved_candidates_count?: number | null
          communication_style?: string | null
          company_size_ranges?: string[] | null
          confidence_threshold?: number | null
          created_at?: string | null
          culture_traits_required?: string[] | null
          deal_breakers?: string[] | null
          excluded_current_titles?: string[] | null
          experience_years_max?: number | null
          experience_years_min?: number | null
          generated_by?: string | null
          id?: string
          industry_preferences?: string[] | null
          is_active?: boolean | null
          job_id: string
          keywords?: string[] | null
          last_calibrated_at?: string | null
          learned_patterns?: Json | null
          linkedin_boolean_query?: string | null
          mandatory_skills?: string[]
          min_hunting_score?: number
          negative_keywords?: string[] | null
          negative_trajectory_patterns?: string[] | null
          nice_to_have?: string[] | null
          openness_signals?: string[] | null
          reference_companies?: string[] | null
          role: string
          salary_range_max?: number | null
          salary_range_min?: number | null
          sales_navigator_url?: string | null
          scoring_weights?: Json | null
          search_keywords?: string[] | null
          seniority: string
          target_companies?: string[] | null
          target_locations?: string[] | null
          target_sources?: string[] | null
          target_title?: string | null
          tenure_min_months?: number | null
          tenure_penalty?: string | null
          title_variations?: string[] | null
          updated_at?: string | null
          valued_previous_roles?: string[] | null
          version?: number | null
          work_context?: string | null
        }
        Update: {
          account_id?: string
          apollo_filters_json?: Json | null
          approved_candidates_count?: number | null
          communication_style?: string | null
          company_size_ranges?: string[] | null
          confidence_threshold?: number | null
          created_at?: string | null
          culture_traits_required?: string[] | null
          deal_breakers?: string[] | null
          excluded_current_titles?: string[] | null
          experience_years_max?: number | null
          experience_years_min?: number | null
          generated_by?: string | null
          id?: string
          industry_preferences?: string[] | null
          is_active?: boolean | null
          job_id?: string
          keywords?: string[] | null
          last_calibrated_at?: string | null
          learned_patterns?: Json | null
          linkedin_boolean_query?: string | null
          mandatory_skills?: string[]
          min_hunting_score?: number
          negative_keywords?: string[] | null
          negative_trajectory_patterns?: string[] | null
          nice_to_have?: string[] | null
          openness_signals?: string[] | null
          reference_companies?: string[] | null
          role?: string
          salary_range_max?: number | null
          salary_range_min?: number | null
          sales_navigator_url?: string | null
          scoring_weights?: Json | null
          search_keywords?: string[] | null
          seniority?: string
          target_companies?: string[] | null
          target_locations?: string[] | null
          target_sources?: string[] | null
          target_title?: string | null
          tenure_min_months?: number | null
          tenure_penalty?: string | null
          title_variations?: string[] | null
          updated_at?: string | null
          valued_previous_roles?: string[] | null
          version?: number | null
          work_context?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_icps_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_icps_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_progress: {
        Row: {
          account_id: string
          completed_at: string | null
          id: string
          journey_id: string
          progress_percentage: number | null
          skipped_at: string | null
          status: string
          step_id: string
          updated_at: string | null
        }
        Insert: {
          account_id: string
          completed_at?: string | null
          id?: string
          journey_id: string
          progress_percentage?: number | null
          skipped_at?: string | null
          status?: string
          step_id: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          completed_at?: string | null
          id?: string
          journey_id?: string
          progress_percentage?: number | null
          skipped_at?: string | null
          status?: string
          step_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journey_progress_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          course_id: string
          created_at: string | null
          duration_minutes: number | null
          id: string
          sort_order: number | null
          thumbnail: string | null
          title: string
          video_url: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          sort_order?: number | null
          thumbnail?: string | null
          title: string
          video_url: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          sort_order?: number | null
          thumbnail?: string | null
          title?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      level_outcomes: {
        Row: {
          connected_to: string | null
          created_at: string | null
          description: string
          id: string
          level_id: string
          measurement: string | null
          outcome_type: string
        }
        Insert: {
          connected_to?: string | null
          created_at?: string | null
          description: string
          id?: string
          level_id: string
          measurement?: string | null
          outcome_type: string
        }
        Update: {
          connected_to?: string | null
          created_at?: string | null
          description?: string
          id?: string
          level_id?: string
          measurement?: string | null
          outcome_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "level_outcomes_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "position_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      license_change_history: {
        Row: {
          account_id: string
          change_type: string
          changed_at: string | null
          changed_by: string
          id: string
          module_slug: string
          new_access_level: string
          notes: string | null
          previous_access_level: string | null
        }
        Insert: {
          account_id: string
          change_type: string
          changed_at?: string | null
          changed_by: string
          id?: string
          module_slug: string
          new_access_level: string
          notes?: string | null
          previous_access_level?: string | null
        }
        Update: {
          account_id?: string
          change_type?: string
          changed_at?: string | null
          changed_by?: string
          id?: string
          module_slug?: string
          new_access_level?: string
          notes?: string | null
          previous_access_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "license_change_history_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      license_template_modules: {
        Row: {
          access_level: string
          id: string
          module_slug: string
          template_id: string
        }
        Insert: {
          access_level?: string
          id?: string
          module_slug: string
          template_id: string
        }
        Update: {
          access_level?: string
          id?: string
          module_slug?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "license_template_modules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "license_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      license_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      license_usage_snapshots: {
        Row: {
          accounts_with_restrictions: number
          created_at: string
          disabled_count: number
          full_access_count: number
          id: string
          module_stats: Json | null
          snapshot_date: string
          total_accounts: number
          view_only_count: number
        }
        Insert: {
          accounts_with_restrictions?: number
          created_at?: string
          disabled_count?: number
          full_access_count?: number
          id?: string
          module_stats?: Json | null
          snapshot_date: string
          total_accounts?: number
          view_only_count?: number
        }
        Update: {
          accounts_with_restrictions?: number
          created_at?: string
          disabled_count?: number
          full_access_count?: number
          id?: string
          module_stats?: Json | null
          snapshot_date?: string
          total_accounts?: number
          view_only_count?: number
        }
        Relationships: []
      }
      llm_batch_jobs: {
        Row: {
          account_id: string
          completed_at: string | null
          completed_items: number
          created_at: string
          created_by: string | null
          error_message: string | null
          failed_items: number
          id: string
          input_payload: Json
          job_kind: string
          output_payload: Json
          provider: string
          provider_batch_id: string | null
          status: string
          submitted_at: string | null
          total_items: number
          updated_at: string
        }
        Insert: {
          account_id: string
          completed_at?: string | null
          completed_items?: number
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          failed_items?: number
          id?: string
          input_payload?: Json
          job_kind: string
          output_payload?: Json
          provider?: string
          provider_batch_id?: string | null
          status?: string
          submitted_at?: string | null
          total_items?: number
          updated_at?: string
        }
        Update: {
          account_id?: string
          completed_at?: string | null
          completed_items?: number
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          failed_items?: number
          id?: string
          input_payload?: Json
          job_kind?: string
          output_payload?: Json
          provider?: string
          provider_batch_id?: string | null
          status?: string
          submitted_at?: string | null
          total_items?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "llm_batch_jobs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      llm_cost_monthly_snapshots: {
        Row: {
          anomalies_count: number
          created_at: string
          id: string
          per_function: Json
          period_month: number
          period_year: number
          savings_pct: number
          savings_vs_baseline_brl: number
          top_accounts: Json
          total_cost_brl: number
          total_sessions: number
        }
        Insert: {
          anomalies_count?: number
          created_at?: string
          id?: string
          per_function?: Json
          period_month: number
          period_year: number
          savings_pct?: number
          savings_vs_baseline_brl?: number
          top_accounts?: Json
          total_cost_brl?: number
          total_sessions?: number
        }
        Update: {
          anomalies_count?: number
          created_at?: string
          id?: string
          per_function?: Json
          period_month?: number
          period_year?: number
          savings_pct?: number
          savings_vs_baseline_brl?: number
          top_accounts?: Json
          total_cost_brl?: number
          total_sessions?: number
        }
        Relationships: []
      }
      llm_pricing_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          current_value_usd: number
          delta_pct: number | null
          detected_at: string
          detected_value_usd: number
          field: string
          id: string
          model: string
          raw_excerpt: string | null
          source_url: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          current_value_usd: number
          delta_pct?: number | null
          detected_at?: string
          detected_value_usd: number
          field: string
          id?: string
          model: string
          raw_excerpt?: string | null
          source_url: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          current_value_usd?: number
          delta_pct?: number | null
          detected_at?: string
          detected_value_usd?: number
          field?: string
          id?: string
          model?: string
          raw_excerpt?: string | null
          source_url?: string
        }
        Relationships: []
      }
      market_research_model_config: {
        Row: {
          block_name: string
          fallback_model_id: string | null
          id: string
          max_tokens: number
          model_id: string
          provider: string
          temperature: number
          updated_at: string
        }
        Insert: {
          block_name: string
          fallback_model_id?: string | null
          id?: string
          max_tokens?: number
          model_id: string
          provider: string
          temperature?: number
          updated_at?: string
        }
        Update: {
          block_name?: string
          fallback_model_id?: string | null
          id?: string
          max_tokens?: number
          model_id?: string
          provider?: string
          temperature?: number
          updated_at?: string
        }
        Relationships: []
      }
      market_research_prompts: {
        Row: {
          block_name: string
          created_at: string
          id: string
          is_active: boolean
          system_prompt: string
          tool_schema: Json
          version: number
        }
        Insert: {
          block_name: string
          created_at?: string
          id?: string
          is_active?: boolean
          system_prompt: string
          tool_schema: Json
          version: number
        }
        Update: {
          block_name?: string
          created_at?: string
          id?: string
          is_active?: boolean
          system_prompt?: string
          tool_schema?: Json
          version?: number
        }
        Relationships: []
      }
      market_research_reports: {
        Row: {
          account_id: string
          ai_executions: Json
          area: string | null
          branding: Json
          briefing_notes: string | null
          citations: Json
          client_account_id: string | null
          compensation_block: Json | null
          competitive_block: Json | null
          competitors: Json
          created_at: string
          created_by: string
          credits_consumed: number
          diagnosis_block: Json | null
          error_message: string | null
          executive_summary: Json | null
          expires_at: string | null
          generation_completed_at: string | null
          generation_started_at: string | null
          id: string
          industry: string | null
          job_title: string
          last_viewed_at: string | null
          location: Json
          models_used: Json
          prompt_versions: Json
          public_password_hash: string | null
          public_slug: string | null
          reference_urls: Json
          required_skills: Json
          seniority: string
          status: string
          talent_intelligence_block: Json | null
          updated_at: string
          view_count: number
        }
        Insert: {
          account_id: string
          ai_executions?: Json
          area?: string | null
          branding?: Json
          briefing_notes?: string | null
          citations?: Json
          client_account_id?: string | null
          compensation_block?: Json | null
          competitive_block?: Json | null
          competitors?: Json
          created_at?: string
          created_by: string
          credits_consumed?: number
          diagnosis_block?: Json | null
          error_message?: string | null
          executive_summary?: Json | null
          expires_at?: string | null
          generation_completed_at?: string | null
          generation_started_at?: string | null
          id?: string
          industry?: string | null
          job_title: string
          last_viewed_at?: string | null
          location?: Json
          models_used?: Json
          prompt_versions?: Json
          public_password_hash?: string | null
          public_slug?: string | null
          reference_urls?: Json
          required_skills?: Json
          seniority: string
          status?: string
          talent_intelligence_block?: Json | null
          updated_at?: string
          view_count?: number
        }
        Update: {
          account_id?: string
          ai_executions?: Json
          area?: string | null
          branding?: Json
          briefing_notes?: string | null
          citations?: Json
          client_account_id?: string | null
          compensation_block?: Json | null
          competitive_block?: Json | null
          competitors?: Json
          created_at?: string
          created_by?: string
          credits_consumed?: number
          diagnosis_block?: Json | null
          error_message?: string | null
          executive_summary?: Json | null
          expires_at?: string | null
          generation_completed_at?: string | null
          generation_started_at?: string | null
          id?: string
          industry?: string | null
          job_title?: string
          last_viewed_at?: string | null
          location?: Json
          models_used?: Json
          prompt_versions?: Json
          public_password_hash?: string | null
          public_slug?: string | null
          reference_urls?: Json
          required_skills?: Json
          seniority?: string
          status?: string
          talent_intelligence_block?: Json | null
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "market_research_reports_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_research_reports_client_account_id_fkey"
            columns: ["client_account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_one_on_one_items: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          is_completed: boolean | null
          item_type: Database["public"]["Enums"]["meeting_item_type"]
          meeting_id: string
          order_index: number
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          item_type?: Database["public"]["Enums"]["meeting_item_type"]
          meeting_id: string
          order_index?: number
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          item_type?: Database["public"]["Enums"]["meeting_item_type"]
          meeting_id?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_one_on_one_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings_one_on_one"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_one_on_one_recurrence: {
        Row: {
          account_id: string
          collaborator_id: string
          created_at: string
          day_of_week: number | null
          frequency: Database["public"]["Enums"]["meeting_recurrence_frequency"]
          id: string
          is_active: boolean | null
          manager_id: string
          next_occurrence: string | null
          preferred_time: string | null
          template_id: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          collaborator_id: string
          created_at?: string
          day_of_week?: number | null
          frequency?: Database["public"]["Enums"]["meeting_recurrence_frequency"]
          id?: string
          is_active?: boolean | null
          manager_id: string
          next_occurrence?: string | null
          preferred_time?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          collaborator_id?: string
          created_at?: string
          day_of_week?: number | null
          frequency?: Database["public"]["Enums"]["meeting_recurrence_frequency"]
          id?: string
          is_active?: boolean | null
          manager_id?: string
          next_occurrence?: string | null
          preferred_time?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_one_on_one_recurrence_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_one_on_one_recurrence_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "meeting_one_on_one_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_one_on_one_templates: {
        Row: {
          account_id: string | null
          created_at: string
          description: string | null
          id: string
          is_default: boolean | null
          items: Json
          name: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          items?: Json
          name: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          items?: Json
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_one_on_one_templates_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings_one_on_one: {
        Row: {
          account_id: string
          collaborator_id: string
          completed_at: string | null
          created_at: string
          duration_minutes: number
          id: string
          manager_id: string
          notes: string | null
          recurrence_id: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["meeting_one_on_one_status"]
          template_id: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          collaborator_id: string
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          manager_id: string
          notes?: string | null
          recurrence_id?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["meeting_one_on_one_status"]
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          collaborator_id?: string
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          manager_id?: string
          notes?: string | null
          recurrence_id?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["meeting_one_on_one_status"]
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_one_on_one_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_one_on_one_recurrence_id_fkey"
            columns: ["recurrence_id"]
            isOneToOne: false
            referencedRelation: "meeting_one_on_one_recurrence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_one_on_one_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "meeting_one_on_one_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_sessions: {
        Row: {
          account_id: string | null
          analysis: Json | null
          answers: Json | null
          created_at: string | null
          id: string
          notes: string | null
          questionnaire_version: number | null
          segment: string | null
          stage: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          analysis?: Json | null
          answers?: Json | null
          created_at?: string | null
          id?: string
          notes?: string | null
          questionnaire_version?: number | null
          segment?: string | null
          stage?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          analysis?: Json | null
          answers?: Json | null
          created_at?: string | null
          id?: string
          notes?: string | null
          questionnaire_version?: number | null
          segment?: string | null
          stage?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_sessions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_version_history: {
        Row: {
          created_at: string | null
          id: string
          mission_statement: string
          session_id: string | null
          variant: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          mission_statement: string
          session_id?: string | null
          variant: string
        }
        Update: {
          created_at?: string | null
          id?: string
          mission_statement?: string
          session_id?: string | null
          variant?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_version_history_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mission_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      module_version_history: {
        Row: {
          account_id: string
          created_at: string
          created_by: string | null
          entity_id: string | null
          id: string
          label: string | null
          module_key: string
          snapshot: Json
          summary: Json
          trigger_type: string
        }
        Insert: {
          account_id: string
          created_at?: string
          created_by?: string | null
          entity_id?: string | null
          id?: string
          label?: string | null
          module_key: string
          snapshot: Json
          summary?: Json
          trigger_type?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          created_by?: string | null
          entity_id?: string | null
          id?: string
          label?: string | null
          module_key?: string
          snapshot?: Json
          summary?: Json
          trigger_type?: string
        }
        Relationships: []
      }
      modules: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_enabled: boolean
          id: string
          in_app_enabled: boolean
          notification_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          notification_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          notification_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_recipients: {
        Row: {
          archived_at: string | null
          created_at: string
          email_sent_at: string | null
          id: string
          notification_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          email_sent_at?: string | null
          id?: string
          notification_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          email_sent_at?: string | null
          id?: string
          notification_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_recipients_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          account_id: string | null
          created_at: string | null
          dedupe_key: string | null
          entity_id: string | null
          entity_type: string | null
          expires_at: string | null
          id: string
          link: string | null
          message: string | null
          org_id: string | null
          priority: string | null
          read_at: string | null
          target_url: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          dedupe_key?: string | null
          entity_id?: string | null
          entity_type?: string | null
          expires_at?: string | null
          id?: string
          link?: string | null
          message?: string | null
          org_id?: string | null
          priority?: string | null
          read_at?: string | null
          target_url?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          dedupe_key?: string | null
          entity_id?: string | null
          entity_type?: string | null
          expires_at?: string | null
          id?: string
          link?: string | null
          message?: string | null
          org_id?: string | null
          priority?: string | null
          read_at?: string | null
          target_url?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      offboarding_cases: {
        Row: {
          account_id: string
          created_at: string
          created_by: string | null
          department: string | null
          employee_email: string | null
          employee_name: string
          employee_user_id: string | null
          id: string
          last_day: string
          manager_id: string | null
          manager_name: string | null
          notes: string | null
          notice_date: string
          position: string | null
          status: string
          survey_responded_at: string | null
          survey_sent_at: string | null
          survey_status: string | null
          termination_type: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          employee_email?: string | null
          employee_name: string
          employee_user_id?: string | null
          id?: string
          last_day: string
          manager_id?: string | null
          manager_name?: string | null
          notes?: string | null
          notice_date: string
          position?: string | null
          status?: string
          survey_responded_at?: string | null
          survey_sent_at?: string | null
          survey_status?: string | null
          termination_type: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          employee_email?: string | null
          employee_name?: string
          employee_user_id?: string | null
          id?: string
          last_day?: string
          manager_id?: string | null
          manager_name?: string | null
          notes?: string | null
          notice_date?: string
          position?: string | null
          status?: string
          survey_responded_at?: string | null
          survey_sent_at?: string | null
          survey_status?: string | null
          termination_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offboarding_cases_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      offboarding_survey_responses: {
        Row: {
          additional_comments: string | null
          avoidability_score: number | null
          case_id: string
          compensation_rating: number | null
          created_at: string
          enps_score: number | null
          growth_rating: number | null
          id: string
          leadership_rating: number | null
          primary_reason: string | null
          responded_at: string
          secondary_reasons: string[] | null
          workload_rating: number | null
        }
        Insert: {
          additional_comments?: string | null
          avoidability_score?: number | null
          case_id: string
          compensation_rating?: number | null
          created_at?: string
          enps_score?: number | null
          growth_rating?: number | null
          id?: string
          leadership_rating?: number | null
          primary_reason?: string | null
          responded_at?: string
          secondary_reasons?: string[] | null
          workload_rating?: number | null
        }
        Update: {
          additional_comments?: string | null
          avoidability_score?: number | null
          case_id?: string
          compensation_rating?: number | null
          created_at?: string
          enps_score?: number | null
          growth_rating?: number | null
          id?: string
          leadership_rating?: number | null
          primary_reason?: string | null
          responded_at?: string
          secondary_reasons?: string[] | null
          workload_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "offboarding_survey_responses_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "offboarding_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      offboarding_survey_tokens: {
        Row: {
          case_id: string
          created_at: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          case_id: string
          created_at?: string
          expires_at: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offboarding_survey_tokens_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "offboarding_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      offboarding_tasks: {
        Row: {
          case_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          is_required: boolean | null
          order_index: number | null
          responsible_profile: string | null
          responsible_type: string
          responsible_user_id: string | null
          responsible_user_name: string | null
          status: string
          task_type: string | null
          title: string
          updated_at: string
          waive_reason: string | null
        }
        Insert: {
          case_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_required?: boolean | null
          order_index?: number | null
          responsible_profile?: string | null
          responsible_type: string
          responsible_user_id?: string | null
          responsible_user_name?: string | null
          status?: string
          task_type?: string | null
          title: string
          updated_at?: string
          waive_reason?: string | null
        }
        Update: {
          case_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_required?: boolean | null
          order_index?: number | null
          responsible_profile?: string | null
          responsible_type?: string
          responsible_user_id?: string | null
          responsible_user_name?: string | null
          status?: string
          task_type?: string | null
          title?: string
          updated_at?: string
          waive_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offboarding_tasks_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "offboarding_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      offboarding_template_tasks: {
        Row: {
          created_at: string
          description: string | null
          due_offset_days: number | null
          id: string
          is_required: boolean | null
          order_index: number | null
          responsible_profile: string | null
          responsible_type: string
          task_type: string | null
          template_id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_offset_days?: number | null
          id?: string
          is_required?: boolean | null
          order_index?: number | null
          responsible_profile?: string | null
          responsible_type: string
          task_type?: string | null
          template_id: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_offset_days?: number | null
          id?: string
          is_required?: boolean | null
          order_index?: number | null
          responsible_profile?: string | null
          responsible_type?: string
          task_type?: string | null
          template_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "offboarding_template_tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "offboarding_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      offboarding_templates: {
        Row: {
          account_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offboarding_templates_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      offline_interview_uploads: {
        Row: {
          account_id: string
          audio_path: string
          candidate_id: string | null
          created_at: string
          created_by: string
          culture_session_id: string | null
          error_message: string | null
          evaluation_types: string[]
          external_candidate_email: string | null
          external_candidate_name: string | null
          id: string
          job_id: string
          language: string
          notes: string | null
          recorded_at: string | null
          status: string
          technical_session_id: string | null
          transcription_text: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          audio_path: string
          candidate_id?: string | null
          created_at?: string
          created_by: string
          culture_session_id?: string | null
          error_message?: string | null
          evaluation_types?: string[]
          external_candidate_email?: string | null
          external_candidate_name?: string | null
          id?: string
          job_id: string
          language?: string
          notes?: string | null
          recorded_at?: string | null
          status?: string
          technical_session_id?: string | null
          transcription_text?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          audio_path?: string
          candidate_id?: string | null
          created_at?: string
          created_by?: string
          culture_session_id?: string | null
          error_message?: string | null
          evaluation_types?: string[]
          external_candidate_email?: string | null
          external_candidate_name?: string | null
          id?: string
          job_id?: string
          language?: string
          notes?: string | null
          recorded_at?: string | null
          status?: string
          technical_session_id?: string | null
          transcription_text?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      onboarding_alerts: {
        Row: {
          alert_type: Database["public"]["Enums"]["onboarding_alert_type"]
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          process_id: string
          related_checkpoint_id: string | null
          related_task_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["onboarding_alert_severity"]
          title: string
        }
        Insert: {
          alert_type: Database["public"]["Enums"]["onboarding_alert_type"]
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          process_id: string
          related_checkpoint_id?: string | null
          related_task_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["onboarding_alert_severity"]
          title: string
        }
        Update: {
          alert_type?: Database["public"]["Enums"]["onboarding_alert_type"]
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          process_id?: string
          related_checkpoint_id?: string | null
          related_task_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["onboarding_alert_severity"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_alerts_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "onboarding_processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_alerts_related_checkpoint_id_fkey"
            columns: ["related_checkpoint_id"]
            isOneToOne: false
            referencedRelation: "onboarding_checkpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_alerts_related_task_id_fkey"
            columns: ["related_task_id"]
            isOneToOne: false
            referencedRelation: "onboarding_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_checkpoint_responses: {
        Row: {
          additional_notes: string | null
          autonomy_score: number | null
          checkpoint_id: string
          created_at: string
          culture_adherence_score: number | null
          delivery_quality_score: number | null
          feeling_score: number | null
          id: string
          overall_score: number | null
          responded_at: string
          respondent_id: string | null
          respondent_name: string | null
          respondent_type: Database["public"]["Enums"]["onboarding_respondent_type"]
          role_clarity_score: number | null
          team_integration_score: number | null
          work_preparation_score: number | null
        }
        Insert: {
          additional_notes?: string | null
          autonomy_score?: number | null
          checkpoint_id: string
          created_at?: string
          culture_adherence_score?: number | null
          delivery_quality_score?: number | null
          feeling_score?: number | null
          id?: string
          overall_score?: number | null
          responded_at?: string
          respondent_id?: string | null
          respondent_name?: string | null
          respondent_type: Database["public"]["Enums"]["onboarding_respondent_type"]
          role_clarity_score?: number | null
          team_integration_score?: number | null
          work_preparation_score?: number | null
        }
        Update: {
          additional_notes?: string | null
          autonomy_score?: number | null
          checkpoint_id?: string
          created_at?: string
          culture_adherence_score?: number | null
          delivery_quality_score?: number | null
          feeling_score?: number | null
          id?: string
          overall_score?: number | null
          responded_at?: string
          respondent_id?: string | null
          respondent_name?: string | null
          respondent_type?: Database["public"]["Enums"]["onboarding_respondent_type"]
          role_clarity_score?: number | null
          team_integration_score?: number | null
          work_preparation_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_checkpoint_responses_checkpoint_id_fkey"
            columns: ["checkpoint_id"]
            isOneToOne: false
            referencedRelation: "onboarding_checkpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_checkpoints: {
        Row: {
          checkpoint_day: number
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          process_id: string
          scheduled_date: string
          status: Database["public"]["Enums"]["onboarding_checkpoint_status"]
          updated_at: string
        }
        Insert: {
          checkpoint_day: number
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          process_id: string
          scheduled_date: string
          status?: Database["public"]["Enums"]["onboarding_checkpoint_status"]
          updated_at?: string
        }
        Update: {
          checkpoint_day?: number
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          process_id?: string
          scheduled_date?: string
          status?: Database["public"]["Enums"]["onboarding_checkpoint_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_checkpoints_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "onboarding_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_competency_assessments: {
        Row: {
          add_to_evolution: boolean | null
          competency_name: string
          competency_type: string
          create_onboarding_task: boolean | null
          created_at: string | null
          has_competency: boolean | null
          id: string
          notes: string | null
          process_id: string
          updated_at: string | null
        }
        Insert: {
          add_to_evolution?: boolean | null
          competency_name: string
          competency_type: string
          create_onboarding_task?: boolean | null
          created_at?: string | null
          has_competency?: boolean | null
          id?: string
          notes?: string | null
          process_id: string
          updated_at?: string | null
        }
        Update: {
          add_to_evolution?: boolean | null
          competency_name?: string
          competency_type?: string
          create_onboarding_task?: boolean | null
          created_at?: string | null
          has_competency?: boolean | null
          id?: string
          notes?: string | null
          process_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_competency_assessments_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "onboarding_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_evaluations: {
        Row: {
          additional_notes: string | null
          areas_for_improvement: string | null
          autonomy_rating: number | null
          clarity_rating: number | null
          created_at: string
          culture_rating: number | null
          delivery_rating: number | null
          evaluated_at: string
          evaluator_id: string | null
          evaluator_name: string | null
          id: string
          integration_rating: number | null
          metrics_achieved: Json | null
          overall_rating: number | null
          process_id: string
          readiness_summary: string | null
          recommendation: Database["public"]["Enums"]["onboarding_recommendation"]
          strengths: string | null
        }
        Insert: {
          additional_notes?: string | null
          areas_for_improvement?: string | null
          autonomy_rating?: number | null
          clarity_rating?: number | null
          created_at?: string
          culture_rating?: number | null
          delivery_rating?: number | null
          evaluated_at?: string
          evaluator_id?: string | null
          evaluator_name?: string | null
          id?: string
          integration_rating?: number | null
          metrics_achieved?: Json | null
          overall_rating?: number | null
          process_id: string
          readiness_summary?: string | null
          recommendation: Database["public"]["Enums"]["onboarding_recommendation"]
          strengths?: string | null
        }
        Update: {
          additional_notes?: string | null
          areas_for_improvement?: string | null
          autonomy_rating?: number | null
          clarity_rating?: number | null
          created_at?: string
          culture_rating?: number | null
          delivery_rating?: number | null
          evaluated_at?: string
          evaluator_id?: string | null
          evaluator_name?: string | null
          id?: string
          integration_rating?: number | null
          metrics_achieved?: Json | null
          overall_rating?: number | null
          process_id?: string
          readiness_summary?: string | null
          recommendation?: Database["public"]["Enums"]["onboarding_recommendation"]
          strengths?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_evaluations_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: true
            referencedRelation: "onboarding_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_phases: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          name: string
          order_index: number
          process_id: string
          start_date: string | null
          status: Database["public"]["Enums"]["onboarding_phase_status"]
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          order_index?: number
          process_id: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["onboarding_phase_status"]
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          order_index?: number
          process_id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["onboarding_phase_status"]
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_phases_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "onboarding_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_processes: {
        Row: {
          created_at: string
          created_by: string | null
          employee_department: string | null
          employee_email: string | null
          employee_name: string
          employee_role: string | null
          end_date: string
          hr_responsible_id: string | null
          hr_responsible_name: string | null
          id: string
          job_description_id: string | null
          leader_id: string | null
          leader_name: string | null
          notes: string | null
          recruitment_candidate_id: string | null
          start_date: string
          status: Database["public"]["Enums"]["onboarding_status"]
          success_metrics: string[] | null
          template_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          employee_department?: string | null
          employee_email?: string | null
          employee_name: string
          employee_role?: string | null
          end_date: string
          hr_responsible_id?: string | null
          hr_responsible_name?: string | null
          id?: string
          job_description_id?: string | null
          leader_id?: string | null
          leader_name?: string | null
          notes?: string | null
          recruitment_candidate_id?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["onboarding_status"]
          success_metrics?: string[] | null
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          employee_department?: string | null
          employee_email?: string | null
          employee_name?: string
          employee_role?: string | null
          end_date?: string
          hr_responsible_id?: string | null
          hr_responsible_name?: string | null
          id?: string
          job_description_id?: string | null
          leader_id?: string | null
          leader_name?: string | null
          notes?: string | null
          recruitment_candidate_id?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["onboarding_status"]
          success_metrics?: string[] | null
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_processes_job_description_id_fkey"
            columns: ["job_description_id"]
            isOneToOne: false
            referencedRelation: "job_descriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_processes_recruitment_candidate_id_fkey"
            columns: ["recruitment_candidate_id"]
            isOneToOne: false
            referencedRelation: "recruitment_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_processes_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "onboarding_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_success_metrics: {
        Row: {
          achieved_value: string | null
          created_at: string
          evaluated_at: string | null
          id: string
          is_achieved: boolean | null
          metric_description: string | null
          metric_name: string
          process_id: string
          target_value: string | null
        }
        Insert: {
          achieved_value?: string | null
          created_at?: string
          evaluated_at?: string | null
          id?: string
          is_achieved?: boolean | null
          metric_description?: string | null
          metric_name: string
          process_id: string
          target_value?: string | null
        }
        Update: {
          achieved_value?: string | null
          created_at?: string
          evaluated_at?: string | null
          id?: string
          is_achieved?: boolean | null
          metric_description?: string | null
          metric_name?: string
          process_id?: string
          target_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_success_metrics_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "onboarding_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_tasks: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          is_required: boolean
          linked_assessment_id: string | null
          linked_assessment_type: string | null
          notes: string | null
          order_index: number
          phase_id: string
          process_id: string
          responsible_id: string | null
          responsible_name: string | null
          responsible_type: Database["public"]["Enums"]["onboarding_responsible_type"]
          status: Database["public"]["Enums"]["onboarding_task_status"]
          task_type: string | null
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_required?: boolean
          linked_assessment_id?: string | null
          linked_assessment_type?: string | null
          notes?: string | null
          order_index?: number
          phase_id: string
          process_id: string
          responsible_id?: string | null
          responsible_name?: string | null
          responsible_type?: Database["public"]["Enums"]["onboarding_responsible_type"]
          status?: Database["public"]["Enums"]["onboarding_task_status"]
          task_type?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_required?: boolean
          linked_assessment_id?: string | null
          linked_assessment_type?: string | null
          notes?: string | null
          order_index?: number
          phase_id?: string
          process_id?: string
          responsible_id?: string | null
          responsible_name?: string | null
          responsible_type?: Database["public"]["Enums"]["onboarding_responsible_type"]
          status?: Database["public"]["Enums"]["onboarding_task_status"]
          task_type?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_tasks_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "onboarding_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_tasks_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "onboarding_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_template_phases: {
        Row: {
          created_at: string
          description: string | null
          duration_days: number
          id: string
          name: string
          order_index: number
          template_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          name: string
          order_index?: number
          template_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          name?: string
          order_index?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_template_phases_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "onboarding_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_template_tasks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_required: boolean
          order_index: number
          phase_id: string
          responsible_type: Database["public"]["Enums"]["onboarding_responsible_type"]
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean
          order_index?: number
          phase_id: string
          responsible_type?: Database["public"]["Enums"]["onboarding_responsible_type"]
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean
          order_index?: number
          phase_id?: string
          responsible_type?: Database["public"]["Enums"]["onboarding_responsible_type"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_template_tasks_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "onboarding_template_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_templates: {
        Row: {
          created_at: string
          created_by: string | null
          default_duration_days: number
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          default_duration_days?: number
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          default_duration_days?: number
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      org_auto_recharge_settings: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          last_recharge_at: string | null
          last_recharge_invoice_id: string | null
          last_recharge_reason: string | null
          last_recharge_status: string | null
          org_id: string
          recharge_in_progress: boolean
          recharge_lock_until: string | null
          recharge_package_id: string | null
          threshold: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          last_recharge_at?: string | null
          last_recharge_invoice_id?: string | null
          last_recharge_reason?: string | null
          last_recharge_status?: string | null
          org_id: string
          recharge_in_progress?: boolean
          recharge_lock_until?: string | null
          recharge_package_id?: string | null
          threshold?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          last_recharge_at?: string | null
          last_recharge_invoice_id?: string | null
          last_recharge_reason?: string | null
          last_recharge_status?: string | null
          org_id?: string
          recharge_in_progress?: boolean
          recharge_lock_until?: string | null
          recharge_package_id?: string | null
          threshold?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_auto_recharge_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_auto_recharge_settings_recharge_package_id_fkey"
            columns: ["recharge_package_id"]
            isOneToOne: false
            referencedRelation: "recruitment_credit_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      org_billing: {
        Row: {
          blocked_at: string | null
          created_at: string | null
          current_period_end: string | null
          grace_until: string | null
          id: string
          org_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string | null
        }
        Insert: {
          blocked_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          grace_until?: string | null
          id?: string
          org_id: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
        }
        Update: {
          blocked_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          grace_until?: string | null
          id?: string
          org_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_billing_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      org_chart_connections: {
        Row: {
          chart_id: string
          color: string | null
          created_at: string
          id: string
          label: string | null
          line_style: string | null
          source_node_id: string
          target_node_id: string
        }
        Insert: {
          chart_id: string
          color?: string | null
          created_at?: string
          id?: string
          label?: string | null
          line_style?: string | null
          source_node_id: string
          target_node_id: string
        }
        Update: {
          chart_id?: string
          color?: string | null
          created_at?: string
          id?: string
          label?: string | null
          line_style?: string | null
          source_node_id?: string
          target_node_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_chart_connections_chart_id_fkey"
            columns: ["chart_id"]
            isOneToOne: false
            referencedRelation: "org_charts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_chart_connections_source_node_id_fkey"
            columns: ["source_node_id"]
            isOneToOne: false
            referencedRelation: "org_chart_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_chart_connections_target_node_id_fkey"
            columns: ["target_node_id"]
            isOneToOne: false
            referencedRelation: "org_chart_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      org_chart_nodes: {
        Row: {
          capacity_score: number | null
          chart_id: string
          color: string | null
          competency_gaps: string[] | null
          created_at: string
          height: number | null
          id: string
          key_competencies: string[] | null
          maturity_level: number | null
          node_type: string | null
          notes: string | null
          parent_id: string | null
          people: Json | null
          person_avatar: string | null
          person_name: string | null
          pos_x: number | null
          pos_y: number | null
          position: number
          roles: string[] | null
          tags: Json | null
          title: string
          vacancy_status: string | null
          width: number | null
        }
        Insert: {
          capacity_score?: number | null
          chart_id: string
          color?: string | null
          competency_gaps?: string[] | null
          created_at?: string
          height?: number | null
          id?: string
          key_competencies?: string[] | null
          maturity_level?: number | null
          node_type?: string | null
          notes?: string | null
          parent_id?: string | null
          people?: Json | null
          person_avatar?: string | null
          person_name?: string | null
          pos_x?: number | null
          pos_y?: number | null
          position?: number
          roles?: string[] | null
          tags?: Json | null
          title: string
          vacancy_status?: string | null
          width?: number | null
        }
        Update: {
          capacity_score?: number | null
          chart_id?: string
          color?: string | null
          competency_gaps?: string[] | null
          created_at?: string
          height?: number | null
          id?: string
          key_competencies?: string[] | null
          maturity_level?: number | null
          node_type?: string | null
          notes?: string | null
          parent_id?: string | null
          people?: Json | null
          person_avatar?: string | null
          person_name?: string | null
          pos_x?: number | null
          pos_y?: number | null
          position?: number
          roles?: string[] | null
          tags?: Json | null
          title?: string
          vacancy_status?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "org_chart_nodes_chart_id_fkey"
            columns: ["chart_id"]
            isOneToOne: false
            referencedRelation: "org_charts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_chart_nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "org_chart_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      org_charts: {
        Row: {
          account_id: string
          created_at: string
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_charts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      org_credit_subscriptions: {
        Row: {
          created_at: string
          credits_per_period: number
          current_period_end: string | null
          id: string
          org_id: string
          package_id: string | null
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits_per_period: number
          current_period_end?: string | null
          id?: string
          org_id: string
          package_id?: string | null
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits_per_period?: number
          current_period_end?: string | null
          id?: string
          org_id?: string
          package_id?: string | null
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_credit_subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_credit_subscriptions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "recruitment_credit_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      org_events: {
        Row: {
          account_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          event_date: string
          event_type: string
          id: string
          is_recurring: boolean | null
          recurrence_rule: string | null
          title: string
        }
        Insert: {
          account_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_date: string
          event_type?: string
          id?: string
          is_recurring?: boolean | null
          recurrence_rule?: string | null
          title: string
        }
        Update: {
          account_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_date?: string
          event_type?: string
          id?: string
          is_recurring?: boolean | null
          recurrence_rule?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      org_seat_grants: {
        Row: {
          created_at: string
          created_by: string | null
          free_seats: number
          id: string
          org_id: string
          pregrant_id: string | null
          source: string
          valid_until: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          free_seats?: number
          id?: string
          org_id: string
          pregrant_id?: string | null
          source?: string
          valid_until: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          free_seats?: number
          id?: string
          org_id?: string
          pregrant_id?: string | null
          source?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_seat_grants_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_seat_grants_pregrant_id_fkey"
            columns: ["pregrant_id"]
            isOneToOne: false
            referencedRelation: "pre_client_grants"
            referencedColumns: ["id"]
          },
        ]
      }
      org_seats: {
        Row: {
          current_seat_count: number | null
          id: string
          included_seats: number | null
          org_id: string
          paid_seats: number | null
          stripe_base_item_id: string | null
          stripe_seat_item_id: string | null
          updated_at: string | null
        }
        Insert: {
          current_seat_count?: number | null
          id?: string
          included_seats?: number | null
          org_id: string
          paid_seats?: number | null
          stripe_base_item_id?: string | null
          stripe_seat_item_id?: string | null
          updated_at?: string | null
        }
        Update: {
          current_seat_count?: number | null
          id?: string
          included_seats?: number | null
          org_id?: string
          paid_seats?: number | null
          stripe_base_item_id?: string | null
          stripe_seat_item_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_seats_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_api_keys: {
        Row: {
          account_id: string
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
        }
        Insert: {
          account_id: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
        }
        Update: {
          account_id?: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_api_keys_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_webhooks: {
        Row: {
          account_id: string
          active: boolean | null
          created_at: string | null
          events: string[]
          id: string
          last_triggered_at: string | null
          secret: string
          updated_at: string | null
          url: string
        }
        Insert: {
          account_id: string
          active?: boolean | null
          created_at?: string | null
          events?: string[]
          id?: string
          last_triggered_at?: string | null
          secret: string
          updated_at?: string | null
          url: string
        }
        Update: {
          account_id?: string
          active?: boolean | null
          created_at?: string | null
          events?: string[]
          id?: string
          last_triggered_at?: string | null
          secret?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_webhooks_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_client_grants: {
        Row: {
          expires_at: string
          granted_at: string | null
          granted_by: string
          id: string
          notes: string | null
          org_id: string | null
          partner_id: string
          promo_code_used: string | null
          revoked_at: string | null
          revoked_by: string | null
          user_id: string | null
        }
        Insert: {
          expires_at: string
          granted_at?: string | null
          granted_by: string
          id?: string
          notes?: string | null
          org_id?: string | null
          partner_id: string
          promo_code_used?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          user_id?: string | null
        }
        Update: {
          expires_at?: string
          granted_at?: string | null
          granted_by?: string
          id?: string
          notes?: string | null
          org_id?: string | null
          partner_id?: string
          promo_code_used?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_client_grants_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_client_grants_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "ep_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_direct_sales: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          ep_share_amount: number
          id: string
          notes: string | null
          org_id: string | null
          partner_id: string
          partner_share_amount: number
          partner_share_percentage: number | null
          sale_date: string
          status: string | null
          total_amount: number
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          ep_share_amount: number
          id?: string
          notes?: string | null
          org_id?: string | null
          partner_id: string
          partner_share_amount: number
          partner_share_percentage?: number | null
          sale_date?: string
          status?: string | null
          total_amount: number
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          ep_share_amount?: number
          id?: string
          notes?: string | null
          org_id?: string | null
          partner_id?: string
          partner_share_amount?: number
          partner_share_percentage?: number | null
          sale_date?: string
          status?: string | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "partner_direct_sales_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_direct_sales_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "ep_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_licenses: {
        Row: {
          active: boolean | null
          created_at: string | null
          created_by: string
          id: string
          notes: string | null
          partner_id: string
          total_seats: number
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          created_by: string
          id?: string
          notes?: string | null
          partner_id: string
          total_seats?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string
          id?: string
          notes?: string | null
          partner_id?: string
          total_seats?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_licenses_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "ep_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_royalties: {
        Row: {
          additional_seats: number
          base_plan_amount: number
          created_at: string | null
          grant_id: string
          id: string
          invoiced_at: string | null
          org_id: string | null
          paid_at: string | null
          partner_id: string
          period_end: string
          period_start: string
          royalty_amount: number
          royalty_percentage: number
          seat_amount: number
          status: string | null
          total_client_amount: number
        }
        Insert: {
          additional_seats?: number
          base_plan_amount?: number
          created_at?: string | null
          grant_id: string
          id?: string
          invoiced_at?: string | null
          org_id?: string | null
          paid_at?: string | null
          partner_id: string
          period_end: string
          period_start: string
          royalty_amount: number
          royalty_percentage?: number
          seat_amount?: number
          status?: string | null
          total_client_amount: number
        }
        Update: {
          additional_seats?: number
          base_plan_amount?: number
          created_at?: string | null
          grant_id?: string
          id?: string
          invoiced_at?: string | null
          org_id?: string | null
          paid_at?: string | null
          partner_id?: string
          period_end?: string
          period_start?: string
          royalty_amount?: number
          royalty_percentage?: number
          seat_amount?: number
          status?: string | null
          total_client_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "partner_royalties_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "partner_client_grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_royalties_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_royalties_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "ep_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      people_analyses: {
        Row: {
          account_id: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
          values_snapshot: Json
        }
        Insert: {
          account_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
          values_snapshot?: Json
        }
        Update: {
          account_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          values_snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "people_analyses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      people_analysis_members: {
        Row: {
          analysis_id: string
          created_at: string | null
          id: string
          name: string
          org_node_id: string | null
          position: number
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          analysis_id: string
          created_at?: string | null
          id?: string
          name: string
          org_node_id?: string | null
          position?: number
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          analysis_id?: string
          created_at?: string | null
          id?: string
          name?: string
          org_node_id?: string | null
          position?: number
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_analysis_members_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "people_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_analysis_members_org_node_id_fkey"
            columns: ["org_node_id"]
            isOneToOne: false
            referencedRelation: "org_chart_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_analysis_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "pulse_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_analysis_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_analysis_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      people_analysis_ratings: {
        Row: {
          created_at: string | null
          id: string
          member_id: string
          score: number
          value_label: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          member_id: string
          score: number
          value_label: string
        }
        Update: {
          created_at?: string | null
          id?: string
          member_id?: string
          score?: number
          value_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_analysis_ratings_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "people_analysis_members"
            referencedColumns: ["id"]
          },
        ]
      }
      people_analysis_version_history: {
        Row: {
          analysis_id: string
          created_at: string | null
          id: string
          snapshot: Json
          variant: string | null
        }
        Insert: {
          analysis_id: string
          created_at?: string | null
          id?: string
          snapshot: Json
          variant?: string | null
        }
        Update: {
          analysis_id?: string
          created_at?: string | null
          id?: string
          snapshot?: Json
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_analysis_version_history_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "people_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_assessment_points: {
        Row: {
          assessment_id: string
          created_at: string | null
          first_name: string
          id: string
          last_name: string
          notes: string | null
          updated_at: string | null
          x_position: number
          y_position: number
        }
        Insert: {
          assessment_id: string
          created_at?: string | null
          first_name: string
          id?: string
          last_name: string
          notes?: string | null
          updated_at?: string | null
          x_position: number
          y_position: number
        }
        Update: {
          assessment_id?: string
          created_at?: string | null
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          updated_at?: string | null
          x_position?: number
          y_position?: number
        }
        Relationships: [
          {
            foreignKeyName: "performance_assessment_points_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "performance_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_assessment_version_history: {
        Row: {
          assessment_id: string
          created_at: string | null
          id: string
          snapshot: Json
          variant: string | null
        }
        Insert: {
          assessment_id: string
          created_at?: string | null
          id?: string
          snapshot: Json
          variant?: string | null
        }
        Update: {
          assessment_id?: string
          created_at?: string | null
          id?: string
          snapshot?: Json
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_assessment_version_history_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "performance_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_assessments: {
        Row: {
          account_id: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_assessments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_templates: {
        Row: {
          account_id: string | null
          base_role: Database["public"]["Enums"]["account_role"] | null
          created_at: string | null
          description: string | null
          id: string
          is_system_default: boolean | null
          name: string
        }
        Insert: {
          account_id?: string | null
          base_role?: Database["public"]["Enums"]["account_role"] | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_system_default?: boolean | null
          name: string
        }
        Update: {
          account_id?: string | null
          base_role?: Database["public"]["Enums"]["account_role"] | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_system_default?: boolean | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_templates_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_ai_model_config: {
        Row: {
          category: string
          current_model: string
          default_model: string
          id: string
          is_locked: boolean
          service_key: string
          service_label: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category: string
          current_model: string
          default_model: string
          id?: string
          is_locked?: boolean
          service_key: string
          service_label: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          current_model?: string
          default_model?: string
          id?: string
          is_locked?: boolean
          service_key?: string
          service_label?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      platform_credit_config: {
        Row: {
          credit_value_brl: number
          id: string
          margin_percent: number
          updated_at: string
          updated_by: string | null
          usd_to_brl: number
        }
        Insert: {
          credit_value_brl?: number
          id?: string
          margin_percent?: number
          updated_at?: string
          updated_by?: string | null
          usd_to_brl?: number
        }
        Update: {
          credit_value_brl?: number
          id?: string
          margin_percent?: number
          updated_at?: string
          updated_by?: string | null
          usd_to_brl?: number
        }
        Relationships: []
      }
      platform_email_config: {
        Row: {
          from_email: string
          from_name: string
          id: string
          is_active: boolean
          provider: string
          reply_to: string | null
          resend_api_key: string | null
          resend_endpoint: string | null
          smtp_host: string | null
          smtp_password: string | null
          smtp_port: number | null
          smtp_secure: boolean | null
          smtp_user: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          from_email?: string
          from_name?: string
          id?: string
          is_active?: boolean
          provider?: string
          reply_to?: string | null
          resend_api_key?: string | null
          resend_endpoint?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean | null
          smtp_user?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          from_email?: string
          from_name?: string
          id?: string
          is_active?: boolean
          provider?: string
          reply_to?: string | null
          resend_api_key?: string | null
          resend_endpoint?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean | null
          smtp_user?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      platform_evaluation_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      platform_seat_pricing: {
        Row: {
          created_at: string | null
          id: string
          plan_id: string | null
          price_cents: number
          stripe_price_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          plan_id?: string | null
          price_cents: number
          stripe_price_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          plan_id?: string | null
          price_cents?: number
          stripe_price_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_seat_pricing_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: true
            referencedRelation: "platform_subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_stripe_config: {
        Row: {
          id: string
          price_org_base: string
          price_seat_additional: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          price_org_base?: string
          price_seat_additional?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          price_org_base?: string
          price_seat_additional?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      platform_subscription_plans: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          included_credits: Json | null
          included_seats: number
          is_active: boolean | null
          is_default: boolean | null
          name: string
          price_cents: number
          sort_order: number | null
          stripe_price_id: string | null
          stripe_product_id: string | null
          trial_days: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          included_credits?: Json | null
          included_seats?: number
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          price_cents: number
          sort_order?: number | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          trial_days?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          included_credits?: Json | null
          included_seats?: number
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          price_cents?: number
          sort_order?: number | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          trial_days?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      platform_whatsapp_config: {
        Row: {
          access_token: string
          id: string
          is_active: boolean
          phone_number_id: string
          template_completion_language: string | null
          template_completion_name: string | null
          template_cultural_language: string | null
          template_cultural_name: string | null
          template_disc_language: string | null
          template_disc_name: string | null
          template_rejection_language: string | null
          template_rejection_name: string | null
          template_technical_language: string | null
          template_technical_name: string | null
          updated_at: string
          updated_by: string | null
          waba_id: string | null
          webhook_verify_token: string
        }
        Insert: {
          access_token?: string
          id?: string
          is_active?: boolean
          phone_number_id?: string
          template_completion_language?: string | null
          template_completion_name?: string | null
          template_cultural_language?: string | null
          template_cultural_name?: string | null
          template_disc_language?: string | null
          template_disc_name?: string | null
          template_rejection_language?: string | null
          template_rejection_name?: string | null
          template_technical_language?: string | null
          template_technical_name?: string | null
          updated_at?: string
          updated_by?: string | null
          waba_id?: string | null
          webhook_verify_token?: string
        }
        Update: {
          access_token?: string
          id?: string
          is_active?: boolean
          phone_number_id?: string
          template_completion_language?: string | null
          template_completion_name?: string | null
          template_cultural_language?: string | null
          template_cultural_name?: string | null
          template_disc_language?: string | null
          template_disc_name?: string | null
          template_rejection_language?: string | null
          template_rejection_name?: string | null
          template_technical_language?: string | null
          template_technical_name?: string | null
          updated_at?: string
          updated_by?: string | null
          waba_id?: string | null
          webhook_verify_token?: string
        }
        Relationships: []
      }
      playbook_checklist_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_required: boolean
          milestone_id: string
          order_index: number
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean
          milestone_id: string
          order_index?: number
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean
          milestone_id?: string
          order_index?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "playbook_checklist_items_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "playbook_milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      playbook_guides: {
        Row: {
          content: string
          created_at: string
          id: string
          milestone_id: string | null
          order_index: number
          phase_id: string | null
          playbook_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          milestone_id?: string | null
          order_index?: number
          phase_id?: string | null
          playbook_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          milestone_id?: string | null
          order_index?: number
          phase_id?: string | null
          playbook_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "playbook_guides_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "playbook_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playbook_guides_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "playbook_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playbook_guides_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "project_playbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      playbook_milestones: {
        Row: {
          created_at: string
          description: string | null
          duration_days: number
          id: string
          milestone_name: string
          milestone_type: string
          order_index: number
          phase_id: string
          pillar: string | null
          relative_start_days: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          milestone_name: string
          milestone_type?: string
          order_index?: number
          phase_id: string
          pillar?: string | null
          relative_start_days?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          milestone_name?: string
          milestone_type?: string
          order_index?: number
          phase_id?: string
          pillar?: string | null
          relative_start_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "playbook_milestones_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "playbook_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      playbook_phases: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          duration_weeks: number
          id: string
          name: string
          order_index: number
          playbook_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          duration_weeks?: number
          id?: string
          name: string
          order_index?: number
          playbook_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          duration_weeks?: number
          id?: string
          name?: string
          order_index?: number
          playbook_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "playbook_phases_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "project_playbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_clientes_acesso: {
        Row: {
          account_id: string
          ativo: boolean | null
          cliente_id: string
          contato_id: string | null
          created_at: string
          email: string
          id: string
          senha_hash: string | null
          token_acesso: string | null
          ultimo_acesso: string | null
        }
        Insert: {
          account_id: string
          ativo?: boolean | null
          cliente_id: string
          contato_id?: string | null
          created_at?: string
          email: string
          id?: string
          senha_hash?: string | null
          token_acesso?: string | null
          ultimo_acesso?: string | null
        }
        Update: {
          account_id?: string
          ativo?: boolean | null
          cliente_id?: string
          contato_id?: string | null
          created_at?: string
          email?: string
          id?: string
          senha_hash?: string | null
          token_acesso?: string | null
          ultimo_acesso?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_clientes_acesso_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_clientes_acesso_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes_consultoria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_clientes_acesso_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "clientes_contatos"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_feedbacks: {
        Row: {
          account_id: string
          candidato_id: string | null
          cliente_id: string | null
          contato_id: string | null
          created_at: string
          decisao: string | null
          id: string
          motivo: string | null
          nota: number | null
          vaga_id: string | null
        }
        Insert: {
          account_id: string
          candidato_id?: string | null
          cliente_id?: string | null
          contato_id?: string | null
          created_at?: string
          decisao?: string | null
          id?: string
          motivo?: string | null
          nota?: number | null
          vaga_id?: string | null
        }
        Update: {
          account_id?: string
          candidato_id?: string | null
          cliente_id?: string | null
          contato_id?: string | null
          created_at?: string
          decisao?: string | null
          id?: string
          motivo?: string | null
          nota?: number | null
          vaga_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_feedbacks_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_feedbacks_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes_consultoria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_feedbacks_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "clientes_contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_feedbacks_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      position_levels: {
        Row: {
          autonomy_level: string | null
          code: string
          complexity_level: string | null
          created_at: string | null
          custom_criteria: Json | null
          decision_scope: string | null
          description: string | null
          id: string
          impact_level: string | null
          influence_degree: string | null
          level_order: number
          name: string
          position_id: string
        }
        Insert: {
          autonomy_level?: string | null
          code: string
          complexity_level?: string | null
          created_at?: string | null
          custom_criteria?: Json | null
          decision_scope?: string | null
          description?: string | null
          id?: string
          impact_level?: string | null
          influence_degree?: string | null
          level_order: number
          name: string
          position_id: string
        }
        Update: {
          autonomy_level?: string | null
          code?: string
          complexity_level?: string | null
          created_at?: string | null
          custom_criteria?: Json | null
          decision_scope?: string | null
          description?: string | null
          id?: string
          impact_level?: string | null
          influence_degree?: string | null
          level_order?: number
          name?: string
          position_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "position_levels_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          area: string | null
          business_problem: string | null
          code: string | null
          created_at: string | null
          critical_interfaces: string[] | null
          family_id: string
          id: string
          is_active: boolean | null
          job_description_id: string | null
          mission: string | null
          name: string
          org_node_id: string | null
          reports_to: string | null
          strategic_delivery: string | null
          strategic_value: string | null
          sub_area: string | null
          updated_at: string | null
        }
        Insert: {
          area?: string | null
          business_problem?: string | null
          code?: string | null
          created_at?: string | null
          critical_interfaces?: string[] | null
          family_id: string
          id?: string
          is_active?: boolean | null
          job_description_id?: string | null
          mission?: string | null
          name: string
          org_node_id?: string | null
          reports_to?: string | null
          strategic_delivery?: string | null
          strategic_value?: string | null
          sub_area?: string | null
          updated_at?: string | null
        }
        Update: {
          area?: string | null
          business_problem?: string | null
          code?: string | null
          created_at?: string | null
          critical_interfaces?: string[] | null
          family_id?: string
          id?: string
          is_active?: boolean | null
          job_description_id?: string | null
          mission?: string | null
          name?: string
          org_node_id?: string | null
          reports_to?: string | null
          strategic_delivery?: string | null
          strategic_value?: string | null
          sub_area?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "positions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "job_families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_job_description_id_fkey"
            columns: ["job_description_id"]
            isOneToOne: false
            referencedRelation: "job_descriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_org_node_id_fkey"
            columns: ["org_node_id"]
            isOneToOne: false
            referencedRelation: "org_chart_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_id: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "intranet_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_hire_checklist_items: {
        Row: {
          account_id: string
          checklist_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          description: string | null
          due_at: string | null
          id: string
          item_key: string
          metadata: Json
          responsible_type: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          account_id: string
          checklist_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          item_key: string
          metadata?: Json
          responsible_type?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          checklist_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          item_key?: string
          metadata?: Json
          responsible_type?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_hire_checklist_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_hire_checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "post_hire_checklists"
            referencedColumns: ["id"]
          },
        ]
      }
      post_hire_checklists: {
        Row: {
          account_id: string
          application_id: string
          candidate_id: string
          cliente_id: string | null
          created_at: string
          hired_at: string
          id: string
          job_id: string
          metadata: Json
          onboarding_process_id: string | null
          owner_user_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          application_id: string
          candidate_id: string
          cliente_id?: string | null
          created_at?: string
          hired_at?: string
          id?: string
          job_id: string
          metadata?: Json
          onboarding_process_id?: string | null
          owner_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          application_id?: string
          candidate_id?: string
          cliente_id?: string | null
          created_at?: string
          hired_at?: string
          id?: string
          job_id?: string
          metadata?: Json
          onboarding_process_id?: string | null
          owner_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_hire_checklists_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_hire_checklists_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "recruitment_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_hire_checklists_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "recruitment_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_hire_checklists_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes_consultoria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_hire_checklists_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_hire_checklists_onboarding_process_id_fkey"
            columns: ["onboarding_process_id"]
            isOneToOne: false
            referencedRelation: "onboarding_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "intranet_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_read_confirmations: {
        Row: {
          confirmed_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          confirmed_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          confirmed_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_read_confirmations_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "intranet_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      pre_client_grants: {
        Row: {
          claimed_at: string | null
          claimed_by: string | null
          claimed_org_id: string | null
          cnpj_digits: string
          created_at: string
          created_by: string
          expires_at: string
          free_seats: number
          grant_source: string
          id: string
          notes: string | null
          partner_id: string | null
          permission_template_id: string | null
          revoked_at: string | null
          revoked_by: string | null
          token: string
          updated_at: string
        }
        Insert: {
          claimed_at?: string | null
          claimed_by?: string | null
          claimed_org_id?: string | null
          cnpj_digits: string
          created_at?: string
          created_by: string
          expires_at: string
          free_seats?: number
          grant_source: string
          id?: string
          notes?: string | null
          partner_id?: string | null
          permission_template_id?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          token: string
          updated_at?: string
        }
        Update: {
          claimed_at?: string | null
          claimed_by?: string | null
          claimed_org_id?: string | null
          cnpj_digits?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          free_seats?: number
          grant_source?: string
          id?: string
          notes?: string | null
          partner_id?: string | null
          permission_template_id?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pre_client_grants_claimed_org_id_fkey"
            columns: ["claimed_org_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_client_grants_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "ep_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_client_grants_permission_template_id_fkey"
            columns: ["permission_template_id"]
            isOneToOne: false
            referencedRelation: "permission_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      process_roi_reports: {
        Row: {
          account_id: string
          client_id: string | null
          generated_at: string
          generated_by: string | null
          id: string
          job_id: string
          last_viewed_at: string | null
          public_token: string
          report_data: Json
          updated_at: string
          views: number
        }
        Insert: {
          account_id: string
          client_id?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          job_id: string
          last_viewed_at?: string | null
          public_token?: string
          report_data?: Json
          updated_at?: string
          views?: number
        }
        Update: {
          account_id?: string
          client_id?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          job_id?: string
          last_viewed_at?: string | null
          public_token?: string
          report_data?: Json
          updated_at?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "process_roi_reports_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_roi_reports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clientes_consultoria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_roi_reports_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_id: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      progression_criteria: {
        Row: {
          created_at: string | null
          criterion_type: string
          description: string
          from_level_id: string
          id: string
          minimum_value: string | null
          to_level_id: string
          weight: number | null
        }
        Insert: {
          created_at?: string | null
          criterion_type: string
          description: string
          from_level_id: string
          id?: string
          minimum_value?: string | null
          to_level_id: string
          weight?: number | null
        }
        Update: {
          created_at?: string | null
          criterion_type?: string
          description?: string
          from_level_id?: string
          id?: string
          minimum_value?: string | null
          to_level_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "progression_criteria_from_level_id_fkey"
            columns: ["from_level_id"]
            isOneToOne: false
            referencedRelation: "position_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progression_criteria_to_level_id_fkey"
            columns: ["to_level_id"]
            isOneToOne: false
            referencedRelation: "position_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      project_alerts: {
        Row: {
          account_id: string
          alert_type: string
          created_at: string
          dedupe_key: string
          description: string | null
          dismissed_at: string | null
          dismissed_by: string | null
          email_last_sent_at: string | null
          first_detected_at: string
          id: string
          last_detected_at: string
          metadata: Json
          resolved_at: string | null
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          account_id: string
          alert_type: string
          created_at?: string
          dedupe_key: string
          description?: string | null
          dismissed_at?: string | null
          dismissed_by?: string | null
          email_last_sent_at?: string | null
          first_detected_at?: string
          id?: string
          last_detected_at?: string
          metadata?: Json
          resolved_at?: string | null
          severity?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          alert_type?: string
          created_at?: string
          dedupe_key?: string
          description?: string | null
          dismissed_at?: string | null
          dismissed_by?: string | null
          email_last_sent_at?: string | null
          first_detected_at?: string
          id?: string
          last_detected_at?: string
          metadata?: Json
          resolved_at?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_checkpoints: {
        Row: {
          account_id: string
          checkpoint_date: string
          created_at: string
          created_by: string
          id: string
          milestone_id: string | null
          notes: string | null
          status: string
          summary: string | null
          topic: string
          updated_at: string
        }
        Insert: {
          account_id: string
          checkpoint_date: string
          created_at?: string
          created_by: string
          id?: string
          milestone_id?: string | null
          notes?: string | null
          status?: string
          summary?: string | null
          topic: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          checkpoint_date?: string
          created_at?: string
          created_by?: string
          id?: string
          milestone_id?: string | null
          notes?: string | null
          status?: string
          summary?: string | null
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_checkpoints_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_checkpoints_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "project_milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      project_comments: {
        Row: {
          account_id: string
          content: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          content: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          parent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          content?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_comments_company_fk"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_comments_parent_fk"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "project_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      project_documents: {
        Row: {
          account_id: string
          category: string
          created_at: string | null
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          is_active: boolean | null
          is_shared_with_client: boolean | null
          name: string
          parent_document_id: string | null
          updated_at: string | null
          uploaded_at: string | null
          uploaded_by: string | null
          version: number | null
        }
        Insert: {
          account_id: string
          category?: string
          created_at?: string | null
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_active?: boolean | null
          is_shared_with_client?: boolean | null
          name: string
          parent_document_id?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          version?: number | null
        }
        Update: {
          account_id?: string
          category?: string
          created_at?: string | null
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_active?: boolean | null
          is_shared_with_client?: boolean | null
          name?: string
          parent_document_id?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_documents_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "project_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      project_health_scores: {
        Row: {
          account_id: string
          action_score: number
          calculated_at: string
          completed_actions_count: number | null
          created_at: string
          days_since_last_activity: number | null
          engagement_score: number
          health_score: number
          health_status: string
          id: string
          last_activity_date: string | null
          last_checkpoint_date: string | null
          pending_actions_count: number | null
          progress_score: number
          updated_at: string
          velocity_score: number
        }
        Insert: {
          account_id: string
          action_score?: number
          calculated_at?: string
          completed_actions_count?: number | null
          created_at?: string
          days_since_last_activity?: number | null
          engagement_score?: number
          health_score?: number
          health_status?: string
          id?: string
          last_activity_date?: string | null
          last_checkpoint_date?: string | null
          pending_actions_count?: number | null
          progress_score?: number
          updated_at?: string
          velocity_score?: number
        }
        Update: {
          account_id?: string
          action_score?: number
          calculated_at?: string
          completed_actions_count?: number | null
          created_at?: string
          days_since_last_activity?: number | null
          engagement_score?: number
          health_score?: number
          health_status?: string
          id?: string
          last_activity_date?: string | null
          last_checkpoint_date?: string | null
          pending_actions_count?: number | null
          progress_score?: number
          updated_at?: string
          velocity_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_health_scores_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestones: {
        Row: {
          account_id: string
          actual_end: string | null
          actual_start: string | null
          checklist_progress: Json | null
          created_at: string
          created_by: string | null
          depends_on: string[] | null
          description: string | null
          id: string
          milestone_name: string
          milestone_type: string
          order_index: number
          pillar: string | null
          planned_end: string | null
          planned_start: string | null
          playbook_milestone_id: string | null
          progress_percentage: number | null
          responsible: string | null
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          actual_end?: string | null
          actual_start?: string | null
          checklist_progress?: Json | null
          created_at?: string
          created_by?: string | null
          depends_on?: string[] | null
          description?: string | null
          id?: string
          milestone_name: string
          milestone_type?: string
          order_index?: number
          pillar?: string | null
          planned_end?: string | null
          planned_start?: string | null
          playbook_milestone_id?: string | null
          progress_percentage?: number | null
          responsible?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          actual_end?: string | null
          actual_start?: string | null
          checklist_progress?: Json | null
          created_at?: string
          created_by?: string | null
          depends_on?: string[] | null
          description?: string | null
          id?: string
          milestone_name?: string
          milestone_type?: string
          order_index?: number
          pillar?: string | null
          planned_end?: string | null
          planned_start?: string | null
          playbook_milestone_id?: string | null
          progress_percentage?: number | null
          responsible?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_milestones_playbook_milestone_id_fkey"
            columns: ["playbook_milestone_id"]
            isOneToOne: false
            referencedRelation: "playbook_milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      project_playbook_applications: {
        Row: {
          account_id: string
          applied_at: string
          applied_by: string | null
          id: string
          notes: string | null
          playbook_id: string
          start_date: string
        }
        Insert: {
          account_id: string
          applied_at?: string
          applied_by?: string | null
          id?: string
          notes?: string | null
          playbook_id: string
          start_date: string
        }
        Update: {
          account_id?: string
          applied_at?: string
          applied_by?: string | null
          id?: string
          notes?: string | null
          playbook_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_playbook_applications_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_playbook_applications_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "project_playbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      project_playbooks: {
        Row: {
          category: string
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          estimated_duration_weeks: number
          icon: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          updated_at: string
        }
        Insert: {
          category?: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_duration_weeks?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          category?: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_duration_weeks?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_recommendations: {
        Row: {
          accepted_at: string | null
          account_id: string
          category: Database["public"]["Enums"]["recommendation_category"]
          completed_at: string | null
          completion_notes: string | null
          created_at: string
          created_by: string
          description: string
          dismissed_at: string | null
          dismissed_reason: string | null
          expected_impact: string | null
          expires_at: string | null
          id: string
          metadata: Json | null
          priority: Database["public"]["Enums"]["recommendation_priority"]
          rationale: string | null
          status: Database["public"]["Enums"]["recommendation_status"]
          suggested_tools: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          account_id: string
          category: Database["public"]["Enums"]["recommendation_category"]
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string
          created_by?: string
          description: string
          dismissed_at?: string | null
          dismissed_reason?: string | null
          expected_impact?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          priority?: Database["public"]["Enums"]["recommendation_priority"]
          rationale?: string | null
          status?: Database["public"]["Enums"]["recommendation_status"]
          suggested_tools?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          account_id?: string
          category?: Database["public"]["Enums"]["recommendation_category"]
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string
          created_by?: string
          description?: string
          dismissed_at?: string | null
          dismissed_reason?: string | null
          expected_impact?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          priority?: Database["public"]["Enums"]["recommendation_priority"]
          rationale?: string | null
          status?: Database["public"]["Enums"]["recommendation_status"]
          suggested_tools?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_recommendations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      project_resource_requirements: {
        Row: {
          account_id: string
          confidence: number | null
          created_at: string
          created_by: string | null
          estimated_hours: number
          id: string
          notes: string | null
          priority: number
          updated_at: string
          updated_by: string | null
          week_start: string
        }
        Insert: {
          account_id: string
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          estimated_hours?: number
          id?: string
          notes?: string | null
          priority?: number
          updated_at?: string
          updated_by?: string | null
          week_start: string
        }
        Update: {
          account_id?: string
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          estimated_hours?: number
          id?: string
          notes?: string | null
          priority?: number
          updated_at?: string
          updated_by?: string | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_resource_requirements_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      projects_version_history: {
        Row: {
          account_id: string
          created_at: string | null
          id: string
          snapshot: Json
          variant: string
        }
        Insert: {
          account_id: string
          created_at?: string | null
          id?: string
          snapshot: Json
          variant?: string
        }
        Update: {
          account_id?: string
          created_at?: string | null
          id?: string
          snapshot?: Json
          variant?: string
        }
        Relationships: []
      }
      promo_code_redemptions: {
        Row: {
          grant_id: string | null
          id: string
          org_id: string | null
          partner_id: string
          promo_code: string
          redeemed_at: string | null
          user_id: string
        }
        Insert: {
          grant_id?: string | null
          id?: string
          org_id?: string | null
          partner_id: string
          promo_code: string
          redeemed_at?: string | null
          user_id: string
        }
        Update: {
          grant_id?: string | null
          id?: string
          org_id?: string | null
          partner_id?: string
          promo_code?: string
          redeemed_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_redemptions_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "partner_client_grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_redemptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_redemptions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "ep_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_admin_actions: {
        Row: {
          account_id: string
          created_at: string | null
          created_by_user_id: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          related_driver_id: string | null
          related_pillar_id: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          created_by_user_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          related_driver_id?: string | null
          related_pillar_id?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          created_by_user_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          related_driver_id?: string | null
          related_pillar_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pulse_admin_actions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_admin_actions_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_admin_actions_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_admin_actions_related_driver_id_fkey"
            columns: ["related_driver_id"]
            isOneToOne: false
            referencedRelation: "pulse_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_admin_actions_related_pillar_id_fkey"
            columns: ["related_pillar_id"]
            isOneToOne: false
            referencedRelation: "pulse_pillars"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_alerts: {
        Row: {
          account_id: string
          alert_type: string
          created_at: string | null
          description: string | null
          id: string
          is_read: boolean | null
          is_resolved: boolean | null
          metric_value: number | null
          related_driver_id: string | null
          related_pillar_id: string | null
          related_team_id: string | null
          related_user_id: string | null
          resolved_at: string | null
          resolved_by_user_id: string | null
          severity: string | null
          threshold_value: number | null
          title: string
        }
        Insert: {
          account_id: string
          alert_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_read?: boolean | null
          is_resolved?: boolean | null
          metric_value?: number | null
          related_driver_id?: string | null
          related_pillar_id?: string | null
          related_team_id?: string | null
          related_user_id?: string | null
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          severity?: string | null
          threshold_value?: number | null
          title: string
        }
        Update: {
          account_id?: string
          alert_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_read?: boolean | null
          is_resolved?: boolean | null
          metric_value?: number | null
          related_driver_id?: string | null
          related_pillar_id?: string | null
          related_team_id?: string | null
          related_user_id?: string | null
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          severity?: string | null
          threshold_value?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_alerts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_alerts_related_driver_id_fkey"
            columns: ["related_driver_id"]
            isOneToOne: false
            referencedRelation: "pulse_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_alerts_related_pillar_id_fkey"
            columns: ["related_pillar_id"]
            isOneToOne: false
            referencedRelation: "pulse_pillars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_alerts_related_team_id_fkey"
            columns: ["related_team_id"]
            isOneToOne: false
            referencedRelation: "pulse_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_alerts_resolved_by_user_id_fkey"
            columns: ["resolved_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_alerts_resolved_by_user_id_fkey"
            columns: ["resolved_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_badges: {
        Row: {
          account_id: string | null
          category: string | null
          created_at: string | null
          criteria: Json
          description: string | null
          icon_emoji: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          key: string
          name: string
          points_reward: number | null
          sort_order: number | null
          tier: string | null
        }
        Insert: {
          account_id?: string | null
          category?: string | null
          created_at?: string | null
          criteria?: Json
          description?: string | null
          icon_emoji: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          key: string
          name: string
          points_reward?: number | null
          sort_order?: number | null
          tier?: string | null
        }
        Update: {
          account_id?: string | null
          category?: string | null
          created_at?: string | null
          criteria?: Json
          description?: string | null
          icon_emoji?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          key?: string
          name?: string
          points_reward?: number | null
          sort_order?: number | null
          tier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pulse_badges_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_company_values: {
        Row: {
          account_id: string
          created_at: string | null
          description: string | null
          donts: string[] | null
          dos: string[] | null
          emoji: string | null
          id: string
          is_active: boolean | null
          key: string
          name: string
          sort_order: number | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          description?: string | null
          donts?: string[] | null
          dos?: string[] | null
          emoji?: string | null
          id?: string
          is_active?: boolean | null
          key: string
          name: string
          sort_order?: number | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          description?: string | null
          donts?: string[] | null
          dos?: string[] | null
          emoji?: string | null
          id?: string
          is_active?: boolean | null
          key?: string
          name?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pulse_company_values_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_culture_metrics_daily: {
        Row: {
          account_id: string
          by_pillar: Json
          by_value: Json
          created_at: string | null
          date: string
          id: string
          overall_score: number
          respondent_count: number
          response_count: number
          updated_at: string | null
        }
        Insert: {
          account_id: string
          by_pillar?: Json
          by_value?: Json
          created_at?: string | null
          date: string
          id?: string
          overall_score?: number
          respondent_count?: number
          response_count?: number
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          by_pillar?: Json
          by_value?: Json
          created_at?: string | null
          date?: string
          id?: string
          overall_score?: number
          respondent_count?: number
          response_count?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pulse_culture_metrics_daily_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_culture_questions: {
        Row: {
          account_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          pillar_type: string
          question_text: string
          reference_text: string | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          pillar_type: string
          question_text: string
          reference_text?: string | null
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          pillar_type?: string
          question_text?: string
          reference_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pulse_culture_questions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_daily_assignment_items: {
        Row: {
          assignment_id: string
          created_at: string | null
          culture_pillar: string | null
          culture_question_id: string | null
          id: string
          is_culture_question: boolean | null
          order_index: number
          question_id: string | null
        }
        Insert: {
          assignment_id: string
          created_at?: string | null
          culture_pillar?: string | null
          culture_question_id?: string | null
          id?: string
          is_culture_question?: boolean | null
          order_index: number
          question_id?: string | null
        }
        Update: {
          assignment_id?: string
          created_at?: string | null
          culture_pillar?: string | null
          culture_question_id?: string | null
          id?: string
          is_culture_question?: boolean | null
          order_index?: number
          question_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_culture_question"
            columns: ["culture_question_id"]
            isOneToOne: false
            referencedRelation: "pulse_culture_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_daily_assignment_items_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "pulse_daily_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_daily_assignment_items_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "pulse_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_daily_assignments: {
        Row: {
          account_id: string
          created_at: string | null
          date: string
          generated_by: string | null
          id: string
          notes: string | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          date: string
          generated_by?: string | null
          id?: string
          notes?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          date?: string
          generated_by?: string | null
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pulse_daily_assignments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_drivers: {
        Row: {
          account_id: string | null
          created_at: string | null
          default_emoji_set_id: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_anonymous: boolean | null
          is_default: boolean | null
          key: string
          name: string
          sort_order: number | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          default_emoji_set_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_anonymous?: boolean | null
          is_default?: boolean | null
          key: string
          name: string
          sort_order?: number | null
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          default_emoji_set_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_anonymous?: boolean | null
          is_default?: boolean | null
          key?: string
          name?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pulse_drivers_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_drivers_default_emoji_set_id_fkey"
            columns: ["default_emoji_set_id"]
            isOneToOne: false
            referencedRelation: "pulse_emoji_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_emoji_sets: {
        Row: {
          account_id: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          options: Json
          type: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          options: Json
          type: string
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          options?: Json
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_emoji_sets_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_gamification_points_log: {
        Row: {
          account_id: string
          created_at: string | null
          event_key: string
          id: string
          meta: Json | null
          points_delta: number
          team_id: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string | null
          event_key: string
          id?: string
          meta?: Json | null
          points_delta: number
          team_id?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string | null
          event_key?: string
          id?: string
          meta?: Json | null
          points_delta?: number
          team_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_gamification_points_log_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_gamification_points_log_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "pulse_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_gamification_points_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_gamification_points_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_gamification_rules: {
        Row: {
          account_id: string | null
          created_at: string | null
          description: string | null
          event_key: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          points: number
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          description?: string | null
          event_key: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          points?: number
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          description?: string | null
          event_key?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          points?: number
        }
        Relationships: [
          {
            foreignKeyName: "pulse_gamification_rules_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_levels: {
        Row: {
          account_id: string | null
          created_at: string | null
          description: string | null
          icon_emoji: string | null
          id: string
          is_default: boolean | null
          level_number: number
          min_points: number
          name: string
          perks: Json | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          description?: string | null
          icon_emoji?: string | null
          id?: string
          is_default?: boolean | null
          level_number: number
          min_points?: number
          name: string
          perks?: Json | null
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          description?: string | null
          icon_emoji?: string | null
          id?: string
          is_default?: boolean | null
          level_number?: number
          min_points?: number
          name?: string
          perks?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "pulse_levels_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_metrics_daily: {
        Row: {
          account_id: string
          by_driver: Json | null
          by_pillar: Json | null
          by_team: Json | null
          created_at: string | null
          date: string
          engagement_score_avg: number | null
          id: string
          non_participation_count: number | null
          participation_rate: number | null
          responded_users: number | null
          total_users: number | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          by_driver?: Json | null
          by_pillar?: Json | null
          by_team?: Json | null
          created_at?: string | null
          date: string
          engagement_score_avg?: number | null
          id?: string
          non_participation_count?: number | null
          participation_rate?: number | null
          responded_users?: number | null
          total_users?: number | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          by_driver?: Json | null
          by_pillar?: Json | null
          by_team?: Json | null
          created_at?: string | null
          date?: string
          engagement_score_avg?: number | null
          id?: string
          non_participation_count?: number | null
          participation_rate?: number | null
          responded_users?: number | null
          total_users?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pulse_metrics_daily_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_notification_channels: {
        Row: {
          account_id: string
          channel_type: string
          config: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          webhook_url: string | null
        }
        Insert: {
          account_id: string
          channel_type: string
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          account_id?: string
          channel_type?: string
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pulse_notification_channels_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_notification_deliveries: {
        Row: {
          account_id: string
          channel_id: string | null
          channel_name: string | null
          channel_type: string
          created_at: string
          duration_ms: number | null
          error_message: string | null
          event: string
          http_status: number | null
          id: string
          payload: Json | null
          response_body: string | null
          status: string
        }
        Insert: {
          account_id: string
          channel_id?: string | null
          channel_name?: string | null
          channel_type: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          event: string
          http_status?: number | null
          id?: string
          payload?: Json | null
          response_body?: string | null
          status: string
        }
        Update: {
          account_id?: string
          channel_id?: string | null
          channel_name?: string | null
          channel_type?: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          event?: string
          http_status?: number | null
          id?: string
          payload?: Json | null
          response_body?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_notification_deliveries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_notification_deliveries_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "pulse_notification_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_pillar_driver_map: {
        Row: {
          account_id: string | null
          created_at: string | null
          driver_id: string
          id: string
          is_default: boolean | null
          pillar_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          driver_id: string
          id?: string
          is_default?: boolean | null
          pillar_id: string
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          driver_id?: string
          id?: string
          is_default?: boolean | null
          pillar_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_pillar_driver_map_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_pillar_driver_map_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "pulse_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_pillar_driver_map_pillar_id_fkey"
            columns: ["pillar_id"]
            isOneToOne: false
            referencedRelation: "pulse_pillars"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_pillars: {
        Row: {
          account_id: string | null
          color: string | null
          created_at: string | null
          description: string | null
          emoji: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          key: string
          name: string
          sort_order: number | null
        }
        Insert: {
          account_id?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          emoji?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          key: string
          name: string
          sort_order?: number | null
        }
        Update: {
          account_id?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          emoji?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          key?: string
          name?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pulse_pillars_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_question_history: {
        Row: {
          account_id: string
          created_at: string | null
          id: string
          question_id: string
          used_date: string
        }
        Insert: {
          account_id: string
          created_at?: string | null
          id?: string
          question_id: string
          used_date: string
        }
        Update: {
          account_id?: string
          created_at?: string | null
          id?: string
          question_id?: string
          used_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_question_history_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_question_history_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "pulse_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_questions: {
        Row: {
          account_id: string | null
          ai_generated: boolean | null
          answer_type: string | null
          created_at: string | null
          created_by_user_id: string | null
          driver_id: string | null
          emoji_set_id: string | null
          id: string
          is_active: boolean | null
          is_anonymous: boolean | null
          max_repeat_per_month: number | null
          multi_select_source: string | null
          question_text: string
          slot_category: string | null
          tags: Json | null
          time_reference: string | null
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          account_id?: string | null
          ai_generated?: boolean | null
          answer_type?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          driver_id?: string | null
          emoji_set_id?: string | null
          id?: string
          is_active?: boolean | null
          is_anonymous?: boolean | null
          max_repeat_per_month?: number | null
          multi_select_source?: string | null
          question_text: string
          slot_category?: string | null
          tags?: Json | null
          time_reference?: string | null
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          account_id?: string | null
          ai_generated?: boolean | null
          answer_type?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          driver_id?: string | null
          emoji_set_id?: string | null
          id?: string
          is_active?: boolean | null
          is_anonymous?: boolean | null
          max_repeat_per_month?: number | null
          multi_select_source?: string | null
          question_text?: string
          slot_category?: string | null
          tags?: Json | null
          time_reference?: string | null
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pulse_questions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_questions_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_questions_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_questions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "pulse_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_questions_emoji_set_id_fkey"
            columns: ["emoji_set_id"]
            isOneToOne: false
            referencedRelation: "pulse_emoji_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_responses: {
        Row: {
          account_id: string
          assignment_id: string | null
          created_at: string | null
          culture_question_id: string | null
          date: string
          id: string
          is_anonymous: boolean | null
          multi_select_values: Json | null
          numeric_score: number | null
          question_id: string | null
          raw_emoji: string | null
          respondent_leader_user_id: string | null
          respondent_team_id: string | null
          respondent_user_id: string | null
        }
        Insert: {
          account_id: string
          assignment_id?: string | null
          created_at?: string | null
          culture_question_id?: string | null
          date?: string
          id?: string
          is_anonymous?: boolean | null
          multi_select_values?: Json | null
          numeric_score?: number | null
          question_id?: string | null
          raw_emoji?: string | null
          respondent_leader_user_id?: string | null
          respondent_team_id?: string | null
          respondent_user_id?: string | null
        }
        Update: {
          account_id?: string
          assignment_id?: string | null
          created_at?: string | null
          culture_question_id?: string | null
          date?: string
          id?: string
          is_anonymous?: boolean | null
          multi_select_values?: Json | null
          numeric_score?: number | null
          question_id?: string | null
          raw_emoji?: string | null
          respondent_leader_user_id?: string | null
          respondent_team_id?: string | null
          respondent_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pulse_responses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_responses_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "pulse_daily_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_responses_culture_question_id_fkey"
            columns: ["culture_question_id"]
            isOneToOne: false
            referencedRelation: "pulse_culture_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "pulse_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_responses_respondent_leader_user_id_fkey"
            columns: ["respondent_leader_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_responses_respondent_leader_user_id_fkey"
            columns: ["respondent_leader_user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_responses_respondent_team_id_fkey"
            columns: ["respondent_team_id"]
            isOneToOne: false
            referencedRelation: "pulse_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_responses_respondent_user_id_fkey"
            columns: ["respondent_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_responses_respondent_user_id_fkey"
            columns: ["respondent_user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_schedule_rules: {
        Row: {
          account_id: string
          anonymity_threshold: number | null
          anonymous_driver_keys: Json | null
          created_at: string | null
          culture_max_repeat_block_days: number
          culture_questions_count: number | null
          culture_rotation_enabled: boolean
          culture_rotation_next_pillar: string | null
          daily_questions_count: number | null
          end_date: string | null
          id: string
          is_active: boolean | null
          is_recurring: boolean | null
          max_repeat_block_days: number | null
          must_include_driver_keys: Json | null
          prefer_driver_keys: Json | null
          rotation_pool_driver_keys: Json | null
          send_days: number[] | null
          send_time: string | null
          slot_a_driver_keys: Json | null
          slot_b_driver_keys: Json | null
          slot_c_driver_keys: Json | null
          start_date: string | null
          timezone: string | null
          updated_at: string | null
          weekdays_only: boolean | null
          weekly_driver_targets: Json | null
        }
        Insert: {
          account_id: string
          anonymity_threshold?: number | null
          anonymous_driver_keys?: Json | null
          created_at?: string | null
          culture_max_repeat_block_days?: number
          culture_questions_count?: number | null
          culture_rotation_enabled?: boolean
          culture_rotation_next_pillar?: string | null
          daily_questions_count?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          is_recurring?: boolean | null
          max_repeat_block_days?: number | null
          must_include_driver_keys?: Json | null
          prefer_driver_keys?: Json | null
          rotation_pool_driver_keys?: Json | null
          send_days?: number[] | null
          send_time?: string | null
          slot_a_driver_keys?: Json | null
          slot_b_driver_keys?: Json | null
          slot_c_driver_keys?: Json | null
          start_date?: string | null
          timezone?: string | null
          updated_at?: string | null
          weekdays_only?: boolean | null
          weekly_driver_targets?: Json | null
        }
        Update: {
          account_id?: string
          anonymity_threshold?: number | null
          anonymous_driver_keys?: Json | null
          created_at?: string | null
          culture_max_repeat_block_days?: number
          culture_questions_count?: number | null
          culture_rotation_enabled?: boolean
          culture_rotation_next_pillar?: string | null
          daily_questions_count?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          is_recurring?: boolean | null
          max_repeat_block_days?: number | null
          must_include_driver_keys?: Json | null
          prefer_driver_keys?: Json | null
          rotation_pool_driver_keys?: Json | null
          send_days?: number[] | null
          send_time?: string | null
          slot_a_driver_keys?: Json | null
          slot_b_driver_keys?: Json | null
          slot_c_driver_keys?: Json | null
          start_date?: string | null
          timezone?: string | null
          updated_at?: string | null
          weekdays_only?: boolean | null
          weekly_driver_targets?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "pulse_schedule_rules_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_surveys: {
        Row: {
          account_id: string
          all_teams: boolean | null
          block_repeat_days: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          frequency: string
          id: string
          questions_per_day: number | null
          selected_driver_keys: string[]
          selected_question_ids: string[] | null
          selected_team_ids: string[] | null
          send_days: number[] | null
          send_time: string | null
          start_date: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          account_id: string
          all_teams?: boolean | null
          block_repeat_days?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          frequency?: string
          id?: string
          questions_per_day?: number | null
          selected_driver_keys?: string[]
          selected_question_ids?: string[] | null
          selected_team_ids?: string[] | null
          send_days?: number[] | null
          send_time?: string | null
          start_date?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          all_teams?: boolean | null
          block_repeat_days?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          frequency?: string
          id?: string
          questions_per_day?: number | null
          selected_driver_keys?: string[]
          selected_question_ids?: string[] | null
          selected_team_ids?: string[] | null
          send_days?: number[] | null
          send_time?: string | null
          start_date?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pulse_surveys_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_teams: {
        Row: {
          account_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          leader_user_id: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          leader_user_id?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          leader_user_id?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pulse_teams_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_teams_leader_user_id_fkey"
            columns: ["leader_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_teams_leader_user_id_fkey"
            columns: ["leader_user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_user_badges: {
        Row: {
          account_id: string
          badge_id: string
          id: string
          notified: boolean | null
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          badge_id: string
          id?: string
          notified?: boolean | null
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          badge_id?: string
          id?: string
          notified?: boolean | null
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_user_badges_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "pulse_badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_user_profiles: {
        Row: {
          account_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          job_title: string | null
          manager_id: string | null
          org_node_id: string | null
          role: Database["public"]["Enums"]["pulse_user_role"] | null
          team_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          job_title?: string | null
          manager_id?: string | null
          org_node_id?: string | null
          role?: Database["public"]["Enums"]["pulse_user_role"] | null
          team_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          job_title?: string | null
          manager_id?: string | null
          org_node_id?: string | null
          role?: Database["public"]["Enums"]["pulse_user_role"] | null
          team_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_user_profiles_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_user_profiles_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_user_profiles_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_user_profiles_org_node_id_fkey"
            columns: ["org_node_id"]
            isOneToOne: false
            referencedRelation: "org_chart_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_user_profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "pulse_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_user_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_user_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_user_progress: {
        Row: {
          account_id: string
          created_at: string | null
          current_level: number | null
          id: string
          total_points: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string | null
          current_level?: number | null
          id?: string
          total_points?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string | null
          current_level?: number | null
          id?: string
          total_points?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_user_progress_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_user_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_user_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_user_streaks: {
        Row: {
          account_id: string
          created_at: string | null
          current_streak: number | null
          id: string
          last_response_date: string | null
          longest_streak: number | null
          total_responses: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_response_date?: string | null
          longest_streak?: number | null
          total_responses?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_response_date?: string | null
          longest_streak?: number | null
          total_responses?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_user_streaks_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_user_streaks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_user_streaks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_weekly_driver_counts: {
        Row: {
          account_id: string
          created_at: string | null
          driver_key: string
          id: string
          target_count: number | null
          updated_at: string | null
          usage_count: number | null
          week_start: string
        }
        Insert: {
          account_id: string
          created_at?: string | null
          driver_key: string
          id?: string
          target_count?: number | null
          updated_at?: string | null
          usage_count?: number | null
          week_start: string
        }
        Update: {
          account_id?: string
          created_at?: string | null
          driver_key?: string
          id?: string
          target_count?: number | null
          updated_at?: string | null
          usage_count?: number | null
          week_start?: string
        }
        Relationships: []
      }
      qa_questions: {
        Row: {
          created_at: string | null
          dimension: string
          event_description: string
          event_number: number
          id: string
          is_active: boolean | null
          question_text: string
          scale_high_label: string
          scale_low_label: string
        }
        Insert: {
          created_at?: string | null
          dimension: string
          event_description: string
          event_number: number
          id?: string
          is_active?: boolean | null
          question_text: string
          scale_high_label: string
          scale_low_label: string
        }
        Update: {
          created_at?: string | null
          dimension?: string
          event_description?: string
          event_number?: number
          id?: string
          is_active?: boolean | null
          question_text?: string
          scale_high_label?: string
          scale_low_label?: string
        }
        Relationships: []
      }
      qa_responses: {
        Row: {
          created_at: string | null
          id: string
          question_id: string
          score: number
          session_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          question_id: string
          score: number
          session_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          question_id?: string
          score?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qa_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "qa_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "qa_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_results: {
        Row: {
          a_score: number
          c_score: number
          created_at: string | null
          d_score: number
          id: string
          profile: string
          profile_level: string
          qa_total: number
          r_score: number
          session_id: string
        }
        Insert: {
          a_score: number
          c_score: number
          created_at?: string | null
          d_score: number
          id?: string
          profile: string
          profile_level: string
          qa_total: number
          r_score: number
          session_id: string
        }
        Update: {
          a_score?: number
          c_score?: number
          created_at?: string | null
          d_score?: number
          id?: string
          profile?: string
          profile_level?: string
          qa_total?: number
          r_score?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qa_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "qa_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_sessions: {
        Row: {
          account_id: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          onboarding_process_id: string | null
          participant_email: string | null
          participant_name: string
          started_at: string | null
          status: string | null
          team_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          onboarding_process_id?: string | null
          participant_email?: string | null
          participant_name: string
          started_at?: string | null
          status?: string | null
          team_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          onboarding_process_id?: string | null
          participant_email?: string | null
          participant_name?: string
          started_at?: string | null
          status?: string | null
          team_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qa_sessions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_sessions_onboarding_process_id_fkey"
            columns: ["onboarding_process_id"]
            isOneToOne: false
            referencedRelation: "onboarding_processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_sessions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "pulse_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_tracking: {
        Row: {
          call_count: number
          call_date: string
          created_at: string | null
          function_name: string
          id: string
          user_id: string
        }
        Insert: {
          call_count?: number
          call_date?: string
          created_at?: string | null
          function_name: string
          id?: string
          user_id: string
        }
        Update: {
          call_count?: number
          call_date?: string
          created_at?: string | null
          function_name?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      recommendation_feedback: {
        Row: {
          comment: string | null
          created_at: string
          created_by: string
          feedback_type: Database["public"]["Enums"]["recommendation_feedback_type"]
          id: string
          recommendation_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          created_by: string
          feedback_type: Database["public"]["Enums"]["recommendation_feedback_type"]
          id?: string
          recommendation_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          created_by?: string
          feedback_type?: Database["public"]["Enums"]["recommendation_feedback_type"]
          id?: string
          recommendation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_feedback_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "project_recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_generation_log: {
        Row: {
          account_id: string
          context: string | null
          error_message: string | null
          generated_at: string
          id: string
          recommendations_count: number
          success: boolean
        }
        Insert: {
          account_id: string
          context?: string | null
          error_message?: string | null
          generated_at?: string
          id?: string
          recommendations_count?: number
          success?: boolean
        }
        Update: {
          account_id?: string
          context?: string | null
          error_message?: string | null
          generated_at?: string
          id?: string
          recommendations_count?: number
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_generation_log_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      recruiter_copilot_messages: {
        Row: {
          content: string | null
          created_at: string
          credits_consumed: number | null
          id: string
          model: string | null
          model_used: string | null
          role: string
          sources: Json | null
          thread_id: string
          tier: string | null
          tokens_in: number | null
          tokens_out: number | null
          tool_call_id: string | null
          tool_calls: Json | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          credits_consumed?: number | null
          id?: string
          model?: string | null
          model_used?: string | null
          role: string
          sources?: Json | null
          thread_id: string
          tier?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
          tool_call_id?: string | null
          tool_calls?: Json | null
        }
        Update: {
          content?: string | null
          created_at?: string
          credits_consumed?: number | null
          id?: string
          model?: string | null
          model_used?: string | null
          role?: string
          sources?: Json | null
          thread_id?: string
          tier?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
          tool_call_id?: string | null
          tool_calls?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "recruiter_copilot_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "recruiter_copilot_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      recruiter_copilot_threads: {
        Row: {
          account_id: string
          candidate_id: string | null
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          job_id: string | null
          scope: string
          title: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          candidate_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          job_id?: string | null
          scope: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          candidate_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          job_id?: string | null
          scope?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruiter_copilot_threads_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_activities: {
        Row: {
          account_id: string
          activity_type: string
          application_id: string | null
          candidate_id: string
          created_at: string | null
          description: string
          id: string
          job_id: string | null
          metadata: Json | null
          performed_by: string | null
        }
        Insert: {
          account_id: string
          activity_type: string
          application_id?: string | null
          candidate_id: string
          created_at?: string | null
          description: string
          id?: string
          job_id?: string | null
          metadata?: Json | null
          performed_by?: string | null
        }
        Update: {
          account_id?: string
          activity_type?: string
          application_id?: string | null
          candidate_id?: string
          created_at?: string | null
          description?: string
          id?: string
          job_id?: string | null
          metadata?: Json | null
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_activities_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_activities_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "recruitment_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_activities_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_activities_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_activities_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_agent_criteria: {
        Row: {
          agent_id: string
          color: string | null
          created_at: string
          description: string | null
          excellence_description: string | null
          id: string
          importance: string
          minimum_score: number | null
          name: string
          warning_signs_description: string | null
          weight: number | null
        }
        Insert: {
          agent_id: string
          color?: string | null
          created_at?: string
          description?: string | null
          excellence_description?: string | null
          id?: string
          importance?: string
          minimum_score?: number | null
          name: string
          warning_signs_description?: string | null
          weight?: number | null
        }
        Update: {
          agent_id?: string
          color?: string | null
          created_at?: string
          description?: string | null
          excellence_description?: string | null
          id?: string
          importance?: string
          minimum_score?: number | null
          name?: string
          warning_signs_description?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_agent_criteria_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "recruitment_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_agent_prompts: {
        Row: {
          agent_id: string
          content: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          prompt_type: string
          updated_at: string
          version: number
        }
        Insert: {
          agent_id: string
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          prompt_type: string
          updated_at?: string
          version?: number
        }
        Update: {
          agent_id?: string
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          prompt_type?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_agent_prompts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "recruitment_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_agent_questions: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          position: number
          question_text: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          position?: number
          question_text: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          position?: number
          question_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_agent_questions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "recruitment_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_agents: {
        Row: {
          account_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          language: string
          last_values_sync_at: string | null
          minimum_score: number | null
          name: string
          settings: Json | null
          strictness_profile: string
          type: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          language?: string
          last_values_sync_at?: string | null
          minimum_score?: number | null
          name: string
          settings?: Json | null
          strictness_profile?: string
          type?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          language?: string
          last_values_sync_at?: string | null
          minimum_score?: number | null
          name?: string
          settings?: Json | null
          strictness_profile?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_agents_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_applications: {
        Row: {
          account_id: string | null
          applied_at: string | null
          assigned_to: string | null
          campaign: string | null
          candidate_id: string | null
          cover_letter: string | null
          do_not_reapproach: boolean
          evaluation_status: string | null
          form_responses: Json | null
          id: string
          inherited_from_job_id: string | null
          is_demo: boolean
          job_id: string | null
          landing_page: string | null
          medium: string | null
          referrer_url: string | null
          resume_url: string | null
          score: number | null
          source: string | null
          stage_id: string | null
          status: string | null
          tags: string[] | null
          update_source: string | null
          updated_at: string | null
          updated_by: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          account_id?: string | null
          applied_at?: string | null
          assigned_to?: string | null
          campaign?: string | null
          candidate_id?: string | null
          cover_letter?: string | null
          do_not_reapproach?: boolean
          evaluation_status?: string | null
          form_responses?: Json | null
          id?: string
          inherited_from_job_id?: string | null
          is_demo?: boolean
          job_id?: string | null
          landing_page?: string | null
          medium?: string | null
          referrer_url?: string | null
          resume_url?: string | null
          score?: number | null
          source?: string | null
          stage_id?: string | null
          status?: string | null
          tags?: string[] | null
          update_source?: string | null
          updated_at?: string | null
          updated_by?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          account_id?: string | null
          applied_at?: string | null
          assigned_to?: string | null
          campaign?: string | null
          candidate_id?: string | null
          cover_letter?: string | null
          do_not_reapproach?: boolean
          evaluation_status?: string | null
          form_responses?: Json | null
          id?: string
          inherited_from_job_id?: string | null
          is_demo?: boolean
          job_id?: string | null
          landing_page?: string | null
          medium?: string | null
          referrer_url?: string | null
          resume_url?: string | null
          score?: number | null
          source?: string | null
          stage_id?: string | null
          status?: string | null
          tags?: string[] | null
          update_source?: string | null
          updated_at?: string | null
          updated_by?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_applications_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "recruitment_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_applications_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "hiring_funnel_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_applications_history: {
        Row: {
          account_id: string
          application_id: string
          candidate_id: string | null
          change_source: string | null
          changed_by: string | null
          changed_fields: string[] | null
          created_at: string
          full_new_row: Json | null
          full_old_row: Json | null
          id: string
          job_id: string | null
          new_stage_id: string | null
          new_status: string | null
          new_step_type: string | null
          old_stage_id: string | null
          old_status: string | null
          old_step_type: string | null
        }
        Insert: {
          account_id: string
          application_id: string
          candidate_id?: string | null
          change_source?: string | null
          changed_by?: string | null
          changed_fields?: string[] | null
          created_at?: string
          full_new_row?: Json | null
          full_old_row?: Json | null
          id?: string
          job_id?: string | null
          new_stage_id?: string | null
          new_status?: string | null
          new_step_type?: string | null
          old_stage_id?: string | null
          old_status?: string | null
          old_step_type?: string | null
        }
        Update: {
          account_id?: string
          application_id?: string
          candidate_id?: string | null
          change_source?: string | null
          changed_by?: string | null
          changed_fields?: string[] | null
          created_at?: string
          full_new_row?: Json | null
          full_old_row?: Json | null
          id?: string
          job_id?: string | null
          new_stage_id?: string | null
          new_status?: string | null
          new_step_type?: string | null
          old_stage_id?: string | null
          old_status?: string | null
          old_step_type?: string | null
        }
        Relationships: []
      }
      recruitment_auto_recharge_attempts: {
        Row: {
          amount_charged: number | null
          created_at: string
          credits_added: number | null
          error_message: string | null
          id: string
          invoice_id: string | null
          org_id: string
          reason: string | null
          status: string
          triggered_by: string | null
        }
        Insert: {
          amount_charged?: number | null
          created_at?: string
          credits_added?: number | null
          error_message?: string | null
          id?: string
          invoice_id?: string | null
          org_id: string
          reason?: string | null
          status: string
          triggered_by?: string | null
        }
        Update: {
          amount_charged?: number | null
          created_at?: string
          credits_added?: number | null
          error_message?: string | null
          id?: string
          invoice_id?: string | null
          org_id?: string
          reason?: string | null
          status?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_auto_recharge_attempts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_candidate_contact_exceptions: {
        Row: {
          account_id: string
          allow_contact: boolean
          candidate_id: string
          created_at: string
          created_by: string | null
          id: string
          job_id: string
          note: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          account_id: string
          allow_contact?: boolean
          candidate_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          job_id: string
          note?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          account_id?: string
          allow_contact?: boolean
          candidate_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          job_id?: string
          note?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      recruitment_candidate_contact_prefs: {
        Row: {
          account_id: string
          candidate_id: string
          consent_at: string | null
          consent_channel: string | null
          consent_job_id: string | null
          consent_message: string | null
          consent_source: string | null
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          opt_out_all: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          account_id: string
          candidate_id: string
          consent_at?: string | null
          consent_channel?: string | null
          consent_job_id?: string | null
          consent_message?: string | null
          consent_source?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          opt_out_all?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          account_id?: string
          candidate_id?: string
          consent_at?: string | null
          consent_channel?: string | null
          consent_job_id?: string | null
          consent_message?: string | null
          consent_source?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          opt_out_all?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_candidate_contact_prefs_consent_job_id_fkey"
            columns: ["consent_job_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_candidates: {
        Row: {
          account_id: string | null
          avatar_url: string | null
          created_at: string | null
          email: string
          first_name: string
          first_touch_at: string | null
          first_touch_campaign: string | null
          first_touch_medium: string | null
          first_touch_source: string | null
          id: string
          is_demo: boolean
          is_test: boolean
          last_name: string
          last_touch_at: string | null
          last_touch_campaign: string | null
          last_touch_medium: string | null
          last_touch_source: string | null
          linkedin_url: string | null
          notes: string | null
          phone: string | null
          source: string | null
          stage: string | null
          status: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email: string
          first_name: string
          first_touch_at?: string | null
          first_touch_campaign?: string | null
          first_touch_medium?: string | null
          first_touch_source?: string | null
          id?: string
          is_demo?: boolean
          is_test?: boolean
          last_name: string
          last_touch_at?: string | null
          last_touch_campaign?: string | null
          last_touch_medium?: string | null
          last_touch_source?: string | null
          linkedin_url?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          stage?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          first_name?: string
          first_touch_at?: string | null
          first_touch_campaign?: string | null
          first_touch_medium?: string | null
          first_touch_source?: string | null
          id?: string
          is_demo?: boolean
          is_test?: boolean
          last_name?: string
          last_touch_at?: string | null
          last_touch_campaign?: string | null
          last_touch_medium?: string | null
          last_touch_source?: string | null
          linkedin_url?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          stage?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_candidates_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_communication_alerts: {
        Row: {
          account_id: string
          created_at: string
          description: string
          id: string
          resolved_at: string | null
          resolved_by: string | null
          rule_id: string
          severity: string
          stats_snapshot: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          description: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          rule_id: string
          severity: string
          stats_snapshot?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          description?: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          rule_id?: string
          severity?: string
          stats_snapshot?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_communication_alerts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_communications_log: {
        Row: {
          account_id: string
          application_id: string | null
          body: string | null
          candidate_id: string | null
          channel: string
          created_at: string
          error_code: string | null
          error_message: string | null
          id: string
          job_id: string | null
          message_type: string
          metadata: Json
          provider: string | null
          provider_message_id: string | null
          recipient: string
          session_id: string | null
          status: string
          subject: string | null
        }
        Insert: {
          account_id: string
          application_id?: string | null
          body?: string | null
          candidate_id?: string | null
          channel: string
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          job_id?: string | null
          message_type: string
          metadata?: Json
          provider?: string | null
          provider_message_id?: string | null
          recipient: string
          session_id?: string | null
          status?: string
          subject?: string | null
        }
        Update: {
          account_id?: string
          application_id?: string | null
          body?: string | null
          candidate_id?: string | null
          channel?: string
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          job_id?: string | null
          message_type?: string
          metadata?: Json
          provider?: string | null
          provider_message_id?: string | null
          recipient?: string
          session_id?: string | null
          status?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_communications_log_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_communications_log_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "recruitment_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_communications_log_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "recruitment_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_communications_log_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_communications_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "candidate_disc_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_credit_costs: {
        Row: {
          created_at: string
          credit_type: string
          credits_per_use: number
          description: string | null
          feature_key: string
          id: string
          is_active: boolean | null
          usage_unit: string
        }
        Insert: {
          created_at?: string
          credit_type: string
          credits_per_use: number
          description?: string | null
          feature_key: string
          id?: string
          is_active?: boolean | null
          usage_unit?: string
        }
        Update: {
          created_at?: string
          credit_type?: string
          credits_per_use?: number
          description?: string | null
          feature_key?: string
          id?: string
          is_active?: boolean | null
          usage_unit?: string
        }
        Relationships: []
      }
      recruitment_credit_packages: {
        Row: {
          billing_interval: string | null
          bonus_percent: number | null
          created_at: string
          credit_type: string
          credits: number
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          is_popular: boolean | null
          name: string
          price_cents: number
          price_per_credit_cents: number | null
          stripe_price_id: string | null
          stripe_product_id: string | null
          updated_at: string
        }
        Insert: {
          billing_interval?: string | null
          bonus_percent?: number | null
          created_at?: string
          credit_type: string
          credits: number
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name: string
          price_cents: number
          price_per_credit_cents?: number | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Update: {
          billing_interval?: string | null
          bonus_percent?: number | null
          created_at?: string
          credit_type?: string
          credits?: number
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name?: string
          price_cents?: number
          price_per_credit_cents?: number | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      recruitment_cross_match_suggestions: {
        Row: {
          account_id: string
          created_at: string
          id: string
          imported_at: string | null
          imported_to_job_id: string | null
          match_score: number | null
          nota_recrutador: string | null
          reasoning: string | null
          rejeitado_motivo: string | null
          source_candidate_id: string | null
          source_job_id: string | null
          source_result_id: string | null
          status: string
          suggested_job_id: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          imported_at?: string | null
          imported_to_job_id?: string | null
          match_score?: number | null
          nota_recrutador?: string | null
          reasoning?: string | null
          rejeitado_motivo?: string | null
          source_candidate_id?: string | null
          source_job_id?: string | null
          source_result_id?: string | null
          status?: string
          suggested_job_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          imported_at?: string | null
          imported_to_job_id?: string | null
          match_score?: number | null
          nota_recrutador?: string | null
          reasoning?: string | null
          rejeitado_motivo?: string | null
          source_candidate_id?: string | null
          source_job_id?: string | null
          source_result_id?: string | null
          status?: string
          suggested_job_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_cross_match_suggestions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_cross_match_suggestions_imported_to_job_id_fkey"
            columns: ["imported_to_job_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_cross_match_suggestions_source_candidate_id_fkey"
            columns: ["source_candidate_id"]
            isOneToOne: false
            referencedRelation: "recruitment_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_cross_match_suggestions_source_job_id_fkey"
            columns: ["source_job_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_cross_match_suggestions_source_result_id_fkey"
            columns: ["source_result_id"]
            isOneToOne: false
            referencedRelation: "recruitment_hunting_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_cross_match_suggestions_suggested_job_id_fkey"
            columns: ["suggested_job_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_decision_log: {
        Row: {
          account_id: string
          application_id: string | null
          candidate_id: string | null
          created_at: string
          decision: string
          decision_type: string
          id: string
          input_data: Json
          job_id: string | null
          justification: string | null
          output_data: Json
          processing_time_ms: number | null
          score: number | null
          step_type: string | null
          threshold: number | null
          triggered_by: string
        }
        Insert: {
          account_id: string
          application_id?: string | null
          candidate_id?: string | null
          created_at?: string
          decision: string
          decision_type: string
          id?: string
          input_data?: Json
          job_id?: string | null
          justification?: string | null
          output_data?: Json
          processing_time_ms?: number | null
          score?: number | null
          step_type?: string | null
          threshold?: number | null
          triggered_by?: string
        }
        Update: {
          account_id?: string
          application_id?: string | null
          candidate_id?: string | null
          created_at?: string
          decision?: string
          decision_type?: string
          id?: string
          input_data?: Json
          job_id?: string | null
          justification?: string | null
          output_data?: Json
          processing_time_ms?: number | null
          score?: number | null
          step_type?: string | null
          threshold?: number | null
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_decision_log_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_decision_log_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "recruitment_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_decision_log_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "recruitment_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_decision_log_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_disc_profiles: {
        Row: {
          created_at: string
          eliminator_c: number | null
          eliminator_d: number | null
          eliminator_i: number | null
          eliminator_s: number | null
          id: string
          job_id: string
          min_match_score: number
          primary_profile: string
          secondary_profile: string | null
          target_c: number | null
          target_d: number | null
          target_i: number | null
          target_s: number | null
          tolerance: number | null
          updated_at: string
          use_advanced_mode: boolean | null
          weight_c: number
          weight_d: number
          weight_i: number
          weight_s: number
        }
        Insert: {
          created_at?: string
          eliminator_c?: number | null
          eliminator_d?: number | null
          eliminator_i?: number | null
          eliminator_s?: number | null
          id?: string
          job_id: string
          min_match_score?: number
          primary_profile: string
          secondary_profile?: string | null
          target_c?: number | null
          target_d?: number | null
          target_i?: number | null
          target_s?: number | null
          tolerance?: number | null
          updated_at?: string
          use_advanced_mode?: boolean | null
          weight_c?: number
          weight_d?: number
          weight_i?: number
          weight_s?: number
        }
        Update: {
          created_at?: string
          eliminator_c?: number | null
          eliminator_d?: number | null
          eliminator_i?: number | null
          eliminator_s?: number | null
          id?: string
          job_id?: string
          min_match_score?: number
          primary_profile?: string
          secondary_profile?: string | null
          target_c?: number | null
          target_d?: number | null
          target_i?: number | null
          target_s?: number | null
          tolerance?: number | null
          updated_at?: string
          use_advanced_mode?: boolean | null
          weight_c?: number
          weight_d?: number
          weight_i?: number
          weight_s?: number
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_disc_profiles_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_email_log: {
        Row: {
          account_id: string
          candidate_id: string | null
          created_at: string | null
          email_type: string
          error_message: string | null
          id: string
          job_id: string | null
          metadata: Json | null
          sent_to: string
          session_id: string | null
          status: string | null
          subject: string | null
        }
        Insert: {
          account_id: string
          candidate_id?: string | null
          created_at?: string | null
          email_type: string
          error_message?: string | null
          id?: string
          job_id?: string | null
          metadata?: Json | null
          sent_to: string
          session_id?: string | null
          status?: string | null
          subject?: string | null
        }
        Update: {
          account_id?: string
          candidate_id?: string | null
          created_at?: string | null
          email_type?: string
          error_message?: string | null
          id?: string
          job_id?: string | null
          metadata?: Json | null
          sent_to?: string
          session_id?: string | null
          status?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_email_log_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_email_log_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "recruitment_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_email_log_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_email_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "culture_interview_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_email_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_voice_interview_health_24h"
            referencedColumns: ["session_id"]
          },
        ]
      }
      recruitment_email_templates: {
        Row: {
          account_id: string
          body: string
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          subject: string
          type: string
          updated_at: string | null
        }
        Insert: {
          account_id: string
          body: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          subject: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          body?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          subject?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_email_templates_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_enriched_profiles: {
        Row: {
          candidate_id: string
          company_industry: string | null
          company_location: string | null
          company_size: string | null
          created_at: string | null
          current_company: string | null
          current_title: string | null
          enriched_at: string | null
          expires_at: string | null
          github_url: string | null
          id: string
          linkedin_url: string | null
          personal_email: string | null
          phone_numbers: string[] | null
          provider: string
          raw_response: Json | null
          seniority: string | null
          twitter_url: string | null
          updated_at: string | null
          work_email: string | null
        }
        Insert: {
          candidate_id: string
          company_industry?: string | null
          company_location?: string | null
          company_size?: string | null
          created_at?: string | null
          current_company?: string | null
          current_title?: string | null
          enriched_at?: string | null
          expires_at?: string | null
          github_url?: string | null
          id?: string
          linkedin_url?: string | null
          personal_email?: string | null
          phone_numbers?: string[] | null
          provider: string
          raw_response?: Json | null
          seniority?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          work_email?: string | null
        }
        Update: {
          candidate_id?: string
          company_industry?: string | null
          company_location?: string | null
          company_size?: string | null
          created_at?: string | null
          current_company?: string | null
          current_title?: string | null
          enriched_at?: string | null
          expires_at?: string | null
          github_url?: string | null
          id?: string
          linkedin_url?: string | null
          personal_email?: string | null
          phone_numbers?: string[] | null
          provider?: string
          raw_response?: Json | null
          seniority?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          work_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_enriched_profiles_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "recruitment_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_evaluation_scores: {
        Row: {
          comment: string | null
          created_at: string
          criterion_id: string
          evaluation_id: string
          id: string
          score: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          criterion_id: string
          evaluation_id: string
          id?: string
          score: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          criterion_id?: string
          evaluation_id?: string
          id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_evaluation_scores_criterion_id_fkey"
            columns: ["criterion_id"]
            isOneToOne: false
            referencedRelation: "recruitment_scorecard_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_evaluation_scores_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "recruitment_evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_evaluations: {
        Row: {
          application_id: string
          created_at: string
          evaluator_id: string
          id: string
          notes: string | null
          overall_score: number | null
          recommendation: string | null
          stage: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          evaluator_id: string
          id?: string
          notes?: string | null
          overall_score?: number | null
          recommendation?: string | null
          stage: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          evaluator_id?: string
          id?: string
          notes?: string | null
          overall_score?: number | null
          recommendation?: string | null
          stage?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_evaluations_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "recruitment_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_evaluations_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "recruitment_scorecard_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_goals: {
        Row: {
          account_id: string
          alert_deviation_threshold: number | null
          created_at: string | null
          created_by: string | null
          goal_applications: number | null
          goal_conversion_rate: number | null
          goal_fill_rate: number | null
          goal_hires: number | null
          goal_time_to_hire: number | null
          id: string
          notes: string | null
          period_end: string
          period_start: string
          period_type: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          alert_deviation_threshold?: number | null
          created_at?: string | null
          created_by?: string | null
          goal_applications?: number | null
          goal_conversion_rate?: number | null
          goal_fill_rate?: number | null
          goal_hires?: number | null
          goal_time_to_hire?: number | null
          id?: string
          notes?: string | null
          period_end: string
          period_start: string
          period_type: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          alert_deviation_threshold?: number | null
          created_at?: string | null
          created_by?: string | null
          goal_applications?: number | null
          goal_conversion_rate?: number | null
          goal_fill_rate?: number | null
          goal_hires?: number | null
          goal_time_to_hire?: number | null
          id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          period_type?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_goals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_headcount_plan: {
        Row: {
          account_id: string
          created_at: string
          id: string
          month: number
          notes: string | null
          planned_hires: number
          updated_at: string
          year: number
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          month: number
          notes?: string | null
          planned_hires?: number
          updated_at?: string
          year: number
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          month?: number
          notes?: string | null
          planned_hires?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      recruitment_hunting_approaches: {
        Row: {
          account_id: string
          approved_at: string | null
          approved_by: string | null
          channel: string
          conversation_id: string | null
          created_at: string
          created_by: string
          error_message: string | null
          follow_up_count: number | null
          generation_model: string | null
          hunting_result_id: string
          icp_id: string | null
          id: string
          last_follow_up_at: string | null
          last_follow_up_message: string | null
          message_generated: string
          message_sent: string | null
          phone_number: string | null
          response_classification: string | null
          response_received_at: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          account_id: string
          approved_at?: string | null
          approved_by?: string | null
          channel?: string
          conversation_id?: string | null
          created_at?: string
          created_by: string
          error_message?: string | null
          follow_up_count?: number | null
          generation_model?: string | null
          hunting_result_id: string
          icp_id?: string | null
          id?: string
          last_follow_up_at?: string | null
          last_follow_up_message?: string | null
          message_generated: string
          message_sent?: string | null
          phone_number?: string | null
          response_classification?: string | null
          response_received_at?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          account_id?: string
          approved_at?: string | null
          approved_by?: string | null
          channel?: string
          conversation_id?: string | null
          created_at?: string
          created_by?: string
          error_message?: string | null
          follow_up_count?: number | null
          generation_model?: string | null
          hunting_result_id?: string
          icp_id?: string | null
          id?: string
          last_follow_up_at?: string | null
          last_follow_up_message?: string | null
          message_generated?: string
          message_sent?: string | null
          phone_number?: string | null
          response_classification?: string | null
          response_received_at?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_hunting_approaches_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_hunting_approaches_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "recruitment_outreach_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_hunting_approaches_hunting_result_id_fkey"
            columns: ["hunting_result_id"]
            isOneToOne: false
            referencedRelation: "recruitment_hunting_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_hunting_approaches_icp_id_fkey"
            columns: ["icp_id"]
            isOneToOne: false
            referencedRelation: "job_icps"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_hunting_email_validation_log: {
        Row: {
          account_id: string | null
          created_at: string
          credits_used: number | null
          email: string
          hunting_result_id: string | null
          id: string
          provider: string
          raw_response: Json | null
          result: string | null
          score: number | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          credits_used?: number | null
          email: string
          hunting_result_id?: string | null
          id?: string
          provider?: string
          raw_response?: Json | null
          result?: string | null
          score?: number | null
        }
        Update: {
          account_id?: string | null
          created_at?: string
          credits_used?: number | null
          email?: string
          hunting_result_id?: string | null
          id?: string
          provider?: string
          raw_response?: Json | null
          result?: string | null
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_hunting_email_validation_log_hunting_result_id_fkey"
            columns: ["hunting_result_id"]
            isOneToOne: false
            referencedRelation: "recruitment_hunting_results"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_hunting_icp_suggestions: {
        Row: {
          account_id: string
          created_at: string
          evidence: Json | null
          field_path: string | null
          id: string
          job_id: string
          rationale: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          suggested_value: Json | null
          suggestion_type: string
        }
        Insert: {
          account_id: string
          created_at?: string
          evidence?: Json | null
          field_path?: string | null
          id?: string
          job_id: string
          rationale?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          suggested_value?: Json | null
          suggestion_type: string
        }
        Update: {
          account_id?: string
          created_at?: string
          evidence?: Json | null
          field_path?: string | null
          id?: string
          job_id?: string
          rationale?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          suggested_value?: Json | null
          suggestion_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_hunting_icp_suggestions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_hunting_intent_signals: {
        Row: {
          account_id: string
          detected_at: string
          evidence: Json | null
          hunting_result_id: string
          id: string
          signal_strength: number
          signal_type: string
          source: string | null
        }
        Insert: {
          account_id: string
          detected_at?: string
          evidence?: Json | null
          hunting_result_id: string
          id?: string
          signal_strength?: number
          signal_type: string
          source?: string | null
        }
        Update: {
          account_id?: string
          detected_at?: string
          evidence?: Json | null
          hunting_result_id?: string
          id?: string
          signal_strength?: number
          signal_type?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_hunting_intent_signals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_hunting_intent_signals_hunting_result_id_fkey"
            columns: ["hunting_result_id"]
            isOneToOne: false
            referencedRelation: "recruitment_hunting_results"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_hunting_rejection_patterns: {
        Row: {
          account_id: string
          created_at: string
          hunting_result_id: string | null
          id: string
          job_id: string | null
          profile_signals: Json | null
          reason_category: string
          reason_detail: string | null
          rejected_by: string | null
        }
        Insert: {
          account_id: string
          created_at?: string
          hunting_result_id?: string | null
          id?: string
          job_id?: string | null
          profile_signals?: Json | null
          reason_category: string
          reason_detail?: string | null
          rejected_by?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string
          hunting_result_id?: string | null
          id?: string
          job_id?: string | null
          profile_signals?: Json | null
          reason_category?: string
          reason_detail?: string | null
          rejected_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_hunting_rejection_patterns_hunting_result_id_fkey"
            columns: ["hunting_result_id"]
            isOneToOne: false
            referencedRelation: "recruitment_hunting_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_hunting_rejection_patterns_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_hunting_results: {
        Row: {
          ai_insights: Json | null
          autonomous: boolean
          completeness_score: number | null
          created_at: string | null
          discovery_cascade: Json | null
          discovery_cost_credits: number
          email_validated_at: string | null
          email_validation_provider: string | null
          email_validation_score: number | null
          email_validation_status: string | null
          extracted_data: Json | null
          final_score_llm: number | null
          id: string
          imported_as_candidate_id: string | null
          intent_detected_at: string | null
          intent_score: number | null
          intent_signals: Json | null
          is_low_quality: boolean | null
          last_refreshed_at: string | null
          llm_evaluated_at: string | null
          llm_justification: string | null
          llm_red_flags: Json | null
          llm_tier: string | null
          match_reasoning: string | null
          match_score: number | null
          pipeline_stage: string | null
          qualified: boolean | null
          recruiter_notes: string | null
          rejection_reason: string | null
          rejection_signals: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          score_breakdown: Json | null
          score_source: string | null
          search_id: string
          source: string
          source_url: string | null
          stage_changed_at: string | null
          status: string | null
          tags: string[] | null
        }
        Insert: {
          ai_insights?: Json | null
          autonomous?: boolean
          completeness_score?: number | null
          created_at?: string | null
          discovery_cascade?: Json | null
          discovery_cost_credits?: number
          email_validated_at?: string | null
          email_validation_provider?: string | null
          email_validation_score?: number | null
          email_validation_status?: string | null
          extracted_data?: Json | null
          final_score_llm?: number | null
          id?: string
          imported_as_candidate_id?: string | null
          intent_detected_at?: string | null
          intent_score?: number | null
          intent_signals?: Json | null
          is_low_quality?: boolean | null
          last_refreshed_at?: string | null
          llm_evaluated_at?: string | null
          llm_justification?: string | null
          llm_red_flags?: Json | null
          llm_tier?: string | null
          match_reasoning?: string | null
          match_score?: number | null
          pipeline_stage?: string | null
          qualified?: boolean | null
          recruiter_notes?: string | null
          rejection_reason?: string | null
          rejection_signals?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          score_breakdown?: Json | null
          score_source?: string | null
          search_id: string
          source: string
          source_url?: string | null
          stage_changed_at?: string | null
          status?: string | null
          tags?: string[] | null
        }
        Update: {
          ai_insights?: Json | null
          autonomous?: boolean
          completeness_score?: number | null
          created_at?: string | null
          discovery_cascade?: Json | null
          discovery_cost_credits?: number
          email_validated_at?: string | null
          email_validation_provider?: string | null
          email_validation_score?: number | null
          email_validation_status?: string | null
          extracted_data?: Json | null
          final_score_llm?: number | null
          id?: string
          imported_as_candidate_id?: string | null
          intent_detected_at?: string | null
          intent_score?: number | null
          intent_signals?: Json | null
          is_low_quality?: boolean | null
          last_refreshed_at?: string | null
          llm_evaluated_at?: string | null
          llm_justification?: string | null
          llm_red_flags?: Json | null
          llm_tier?: string | null
          match_reasoning?: string | null
          match_score?: number | null
          pipeline_stage?: string | null
          qualified?: boolean | null
          recruiter_notes?: string | null
          rejection_reason?: string | null
          rejection_signals?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          score_breakdown?: Json | null
          score_source?: string | null
          search_id?: string
          source?: string
          source_url?: string | null
          stage_changed_at?: string | null
          status?: string | null
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_hunting_results_imported_as_candidate_id_fkey"
            columns: ["imported_as_candidate_id"]
            isOneToOne: false
            referencedRelation: "recruitment_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_hunting_results_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "recruitment_hunting_searches"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_hunting_search_attempts: {
        Row: {
          account_id: string
          completed_at: string | null
          criteria_relaxed: Json | null
          id: string
          notes: string | null
          qualified_count: number | null
          results_count: number | null
          round_number: number
          search_id: string
          started_at: string
          strategy: string
        }
        Insert: {
          account_id: string
          completed_at?: string | null
          criteria_relaxed?: Json | null
          id?: string
          notes?: string | null
          qualified_count?: number | null
          results_count?: number | null
          round_number?: number
          search_id: string
          started_at?: string
          strategy: string
        }
        Update: {
          account_id?: string
          completed_at?: string | null
          criteria_relaxed?: Json | null
          id?: string
          notes?: string | null
          qualified_count?: number | null
          results_count?: number | null
          round_number?: number
          search_id?: string
          started_at?: string
          strategy?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_hunting_search_attempts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_hunting_search_attempts_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "recruitment_hunting_searches"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_hunting_searches: {
        Row: {
          account_id: string
          autonomous: boolean
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          desired_count: number | null
          error_message: string | null
          evaboot_job_id: string | null
          evaboot_status: string | null
          filters: Json | null
          icp_id: string | null
          id: string
          job_description_snapshot: Json | null
          job_id: string | null
          last_recurring_run: string | null
          min_score: number | null
          qualified_count: number | null
          query: string
          recurring_active: boolean | null
          recurring_schedule: string | null
          results_count: number | null
          search_rounds: number | null
          sources: string[] | null
          status: string | null
        }
        Insert: {
          account_id: string
          autonomous?: boolean
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          desired_count?: number | null
          error_message?: string | null
          evaboot_job_id?: string | null
          evaboot_status?: string | null
          filters?: Json | null
          icp_id?: string | null
          id?: string
          job_description_snapshot?: Json | null
          job_id?: string | null
          last_recurring_run?: string | null
          min_score?: number | null
          qualified_count?: number | null
          query: string
          recurring_active?: boolean | null
          recurring_schedule?: string | null
          results_count?: number | null
          search_rounds?: number | null
          sources?: string[] | null
          status?: string | null
        }
        Update: {
          account_id?: string
          autonomous?: boolean
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          desired_count?: number | null
          error_message?: string | null
          evaboot_job_id?: string | null
          evaboot_status?: string | null
          filters?: Json | null
          icp_id?: string | null
          id?: string
          job_description_snapshot?: Json | null
          job_id?: string | null
          last_recurring_run?: string | null
          min_score?: number | null
          qualified_count?: number | null
          query?: string
          recurring_active?: boolean | null
          recurring_schedule?: string | null
          results_count?: number | null
          search_rounds?: number | null
          sources?: string[] | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_hunting_searches_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_hunting_searches_icp_id_fkey"
            columns: ["icp_id"]
            isOneToOne: false
            referencedRelation: "job_icps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_hunting_searches_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_interviews: {
        Row: {
          access_token: string | null
          account_id: string | null
          agent_id: string | null
          application_id: string | null
          candidate_id: string | null
          completed_at: string | null
          created_at: string | null
          criteria_evaluations: Json | null
          duration_seconds: number | null
          evaluation_status: string | null
          id: string
          job_id: string | null
          overall_score: number | null
          sent_at: string | null
          started_at: string | null
          status: string | null
          transcript: Json | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          account_id?: string | null
          agent_id?: string | null
          application_id?: string | null
          candidate_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          criteria_evaluations?: Json | null
          duration_seconds?: number | null
          evaluation_status?: string | null
          id?: string
          job_id?: string | null
          overall_score?: number | null
          sent_at?: string | null
          started_at?: string | null
          status?: string | null
          transcript?: Json | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          account_id?: string | null
          agent_id?: string | null
          application_id?: string | null
          candidate_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          criteria_evaluations?: Json | null
          duration_seconds?: number | null
          evaluation_status?: string | null
          id?: string
          job_id?: string | null
          overall_score?: number | null
          sent_at?: string | null
          started_at?: string | null
          status?: string | null
          transcript?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_interviews_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_interviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "recruitment_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_interviews_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "recruitment_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_interviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_job_notes: {
        Row: {
          account_id: string
          author_id: string | null
          content: string
          created_at: string
          id: string
          job_id: string
          metadata: Json | null
          note_type: string
        }
        Insert: {
          account_id: string
          author_id?: string | null
          content: string
          created_at?: string
          id?: string
          job_id: string
          metadata?: Json | null
          note_type?: string
        }
        Update: {
          account_id?: string
          author_id?: string | null
          content?: string
          created_at?: string
          id?: string
          job_id?: string
          metadata?: Json | null
          note_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_job_notes_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_job_notes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_job_workflow_config: {
        Row: {
          account_id: string
          created_at: string | null
          id: string
          job_id: string
          updated_at: string | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          id?: string
          job_id: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          id?: string
          job_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_job_workflow_config_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_job_workflow_config_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_job_workflow_steps: {
        Row: {
          account_id: string
          agent_id: string | null
          created_at: string
          id: string
          is_active: boolean
          job_id: string
          position: number
          step_type: string
          threshold_config: Json
          updated_at: string
        }
        Insert: {
          account_id: string
          agent_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          job_id: string
          position?: number
          step_type: string
          threshold_config?: Json
          updated_at?: string
        }
        Update: {
          account_id?: string
          agent_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          job_id?: string
          position?: number
          step_type?: string
          threshold_config?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rjws_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rjws_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "recruitment_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rjws_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_jobs: {
        Row: {
          account_id: string | null
          additional_info: string | null
          agent_id: string | null
          attractiveness_breakdown: Json | null
          attractiveness_calculated_at: string | null
          attractiveness_score: number | null
          attractiveness_suggestions: string[] | null
          autopilot_enabled: boolean
          autopilot_min_candidates: number | null
          autopilot_min_score: number | null
          autopilot_triggered_at: string | null
          budget_max: number | null
          budget_min: number | null
          cliente_id: string | null
          created_at: string | null
          data_abertura_cliente: string | null
          data_contratacao: string | null
          data_limite_entrega: string | null
          department: string | null
          description: string | null
          em_garantia: boolean | null
          employment_type: string | null
          fee_acordado: number | null
          funnel_id: string | null
          garantia_expira_em: string | null
          hide_salary: boolean | null
          id: string
          is_demo: boolean
          is_public: boolean | null
          job_description_id: string | null
          location: string | null
          min_hunting_score: number | null
          prazo_entrega_dias: number | null
          published_at: string | null
          reposicao_da_vaga_id: string | null
          roi_report_scheduled_at: string | null
          salario_contratado: number | null
          seniority_target: string | null
          sla_status: string | null
          status: string | null
          title: string
          updated_at: string | null
          work_modality: string | null
          work_regime: string | null
        }
        Insert: {
          account_id?: string | null
          additional_info?: string | null
          agent_id?: string | null
          attractiveness_breakdown?: Json | null
          attractiveness_calculated_at?: string | null
          attractiveness_score?: number | null
          attractiveness_suggestions?: string[] | null
          autopilot_enabled?: boolean
          autopilot_min_candidates?: number | null
          autopilot_min_score?: number | null
          autopilot_triggered_at?: string | null
          budget_max?: number | null
          budget_min?: number | null
          cliente_id?: string | null
          created_at?: string | null
          data_abertura_cliente?: string | null
          data_contratacao?: string | null
          data_limite_entrega?: string | null
          department?: string | null
          description?: string | null
          em_garantia?: boolean | null
          employment_type?: string | null
          fee_acordado?: number | null
          funnel_id?: string | null
          garantia_expira_em?: string | null
          hide_salary?: boolean | null
          id?: string
          is_demo?: boolean
          is_public?: boolean | null
          job_description_id?: string | null
          location?: string | null
          min_hunting_score?: number | null
          prazo_entrega_dias?: number | null
          published_at?: string | null
          reposicao_da_vaga_id?: string | null
          roi_report_scheduled_at?: string | null
          salario_contratado?: number | null
          seniority_target?: string | null
          sla_status?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          work_modality?: string | null
          work_regime?: string | null
        }
        Update: {
          account_id?: string | null
          additional_info?: string | null
          agent_id?: string | null
          attractiveness_breakdown?: Json | null
          attractiveness_calculated_at?: string | null
          attractiveness_score?: number | null
          attractiveness_suggestions?: string[] | null
          autopilot_enabled?: boolean
          autopilot_min_candidates?: number | null
          autopilot_min_score?: number | null
          autopilot_triggered_at?: string | null
          budget_max?: number | null
          budget_min?: number | null
          cliente_id?: string | null
          created_at?: string | null
          data_abertura_cliente?: string | null
          data_contratacao?: string | null
          data_limite_entrega?: string | null
          department?: string | null
          description?: string | null
          em_garantia?: boolean | null
          employment_type?: string | null
          fee_acordado?: number | null
          funnel_id?: string | null
          garantia_expira_em?: string | null
          hide_salary?: boolean | null
          id?: string
          is_demo?: boolean
          is_public?: boolean | null
          job_description_id?: string | null
          location?: string | null
          min_hunting_score?: number | null
          prazo_entrega_dias?: number | null
          published_at?: string | null
          reposicao_da_vaga_id?: string | null
          roi_report_scheduled_at?: string | null
          salario_contratado?: number | null
          seniority_target?: string | null
          sla_status?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          work_modality?: string | null
          work_regime?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_jobs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_jobs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "recruitment_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_jobs_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes_consultoria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_jobs_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "hiring_funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_jobs_job_description_id_fkey"
            columns: ["job_description_id"]
            isOneToOne: false
            referencedRelation: "job_descriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_jobs_reposicao_da_vaga_id_fkey"
            columns: ["reposicao_da_vaga_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_message_templates: {
        Row: {
          account_id: string
          body: string
          channel: string
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          message_type: string
          name: string
          reminder_day: number | null
          subject: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          body: string
          channel: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          message_type: string
          name: string
          reminder_day?: number | null
          subject?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          body?: string
          channel?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          message_type?: string
          name?: string
          reminder_day?: number | null
          subject?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      recruitment_metric_alerts: {
        Row: {
          account_id: string
          alert_type: string
          created_at: string | null
          email_sent: boolean | null
          email_sent_at: string | null
          emails_sent_to: string[] | null
          id: string
          is_resolved: boolean | null
          metric_value: number
          resolved_at: string | null
          severity: string | null
          threshold_value: number
        }
        Insert: {
          account_id: string
          alert_type: string
          created_at?: string | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          emails_sent_to?: string[] | null
          id?: string
          is_resolved?: boolean | null
          metric_value: number
          resolved_at?: string | null
          severity?: string | null
          threshold_value: number
        }
        Update: {
          account_id?: string
          alert_type?: string
          created_at?: string | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          emails_sent_to?: string[] | null
          id?: string
          is_resolved?: boolean | null
          metric_value?: number
          resolved_at?: string | null
          severity?: string | null
          threshold_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_metric_alerts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_metric_thresholds: {
        Row: {
          account_id: string
          alert_conversion_rate: boolean | null
          alert_rejection_rate: boolean | null
          alert_stagnant_pipeline: boolean | null
          alert_time_to_hire: boolean | null
          created_at: string | null
          email_enabled: boolean | null
          email_frequency: string | null
          id: string
          last_alert_at: string | null
          last_check_at: string | null
          max_rejection_rate: number | null
          max_stagnant_days: number | null
          max_time_to_hire_days: number | null
          min_conversion_rate: number | null
          notify_emails: string[] | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          alert_conversion_rate?: boolean | null
          alert_rejection_rate?: boolean | null
          alert_stagnant_pipeline?: boolean | null
          alert_time_to_hire?: boolean | null
          created_at?: string | null
          email_enabled?: boolean | null
          email_frequency?: string | null
          id?: string
          last_alert_at?: string | null
          last_check_at?: string | null
          max_rejection_rate?: number | null
          max_stagnant_days?: number | null
          max_time_to_hire_days?: number | null
          min_conversion_rate?: number | null
          notify_emails?: string[] | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          alert_conversion_rate?: boolean | null
          alert_rejection_rate?: boolean | null
          alert_stagnant_pipeline?: boolean | null
          alert_time_to_hire?: boolean | null
          created_at?: string | null
          email_enabled?: boolean | null
          email_frequency?: string | null
          id?: string
          last_alert_at?: string | null
          last_check_at?: string | null
          max_rejection_rate?: number | null
          max_stagnant_days?: number | null
          max_time_to_hire_days?: number | null
          min_conversion_rate?: number | null
          notify_emails?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_metric_thresholds_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_notes: {
        Row: {
          account_id: string
          application_id: string | null
          candidate_id: string
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_private: boolean | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          application_id?: string | null
          candidate_id: string
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_private?: boolean | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          application_id?: string | null
          candidate_id?: string
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_private?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_notes_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_notes_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "recruitment_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_notification_settings: {
        Row: {
          account_id: string
          created_at: string | null
          digest_day: number | null
          digest_mode: string | null
          id: string
          notify_final_evaluation: boolean | null
          notify_final_evaluation_email: boolean | null
          notify_interview_reminders: boolean | null
          notify_interview_reminders_email: boolean | null
          notify_new_applications: boolean | null
          notify_new_applications_email: boolean | null
          notify_owner_only: boolean | null
          notify_pending_evaluations: boolean | null
          notify_pending_evaluations_email: boolean | null
          notify_stale_candidates: boolean | null
          notify_stale_candidates_email: boolean | null
          notify_stale_jobs: boolean | null
          notify_stale_jobs_email: boolean | null
          pending_evaluation_days: number | null
          preferred_hour: number | null
          stale_candidate_days: number | null
          stale_job_days: number | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          digest_day?: number | null
          digest_mode?: string | null
          id?: string
          notify_final_evaluation?: boolean | null
          notify_final_evaluation_email?: boolean | null
          notify_interview_reminders?: boolean | null
          notify_interview_reminders_email?: boolean | null
          notify_new_applications?: boolean | null
          notify_new_applications_email?: boolean | null
          notify_owner_only?: boolean | null
          notify_pending_evaluations?: boolean | null
          notify_pending_evaluations_email?: boolean | null
          notify_stale_candidates?: boolean | null
          notify_stale_candidates_email?: boolean | null
          notify_stale_jobs?: boolean | null
          notify_stale_jobs_email?: boolean | null
          pending_evaluation_days?: number | null
          preferred_hour?: number | null
          stale_candidate_days?: number | null
          stale_job_days?: number | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          digest_day?: number | null
          digest_mode?: string | null
          id?: string
          notify_final_evaluation?: boolean | null
          notify_final_evaluation_email?: boolean | null
          notify_interview_reminders?: boolean | null
          notify_interview_reminders_email?: boolean | null
          notify_new_applications?: boolean | null
          notify_new_applications_email?: boolean | null
          notify_owner_only?: boolean | null
          notify_pending_evaluations?: boolean | null
          notify_pending_evaluations_email?: boolean | null
          notify_stale_candidates?: boolean | null
          notify_stale_candidates_email?: boolean | null
          notify_stale_jobs?: boolean | null
          notify_stale_jobs_email?: boolean | null
          pending_evaluation_days?: number | null
          preferred_hour?: number | null
          stale_candidate_days?: number | null
          stale_job_days?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_notification_settings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_outreach_campaigns: {
        Row: {
          ab_group_id: string | null
          ab_variant: string | null
          account_id: string
          ai_persona: string | null
          auto_reply_enabled: boolean | null
          body_html_template: string | null
          channel: string
          completed_at: string | null
          contacts_queued: number | null
          contacts_sent: number | null
          converted_count: number | null
          created_at: string | null
          created_by: string | null
          daily_send_limit: number | null
          description: string | null
          follow_up_templates: Json | null
          from_email: string | null
          from_name: string | null
          id: string
          initial_message_template: string
          interested_count: number | null
          job_id: string | null
          max_auto_replies: number | null
          max_contacts: number | null
          name: string
          reply_delay_minutes: number | null
          responses_received: number | null
          sequence_steps: Json
          started_at: string | null
          status: string | null
          subject_template: string | null
          target_filters: Json | null
          target_source: string
          updated_at: string | null
        }
        Insert: {
          ab_group_id?: string | null
          ab_variant?: string | null
          account_id: string
          ai_persona?: string | null
          auto_reply_enabled?: boolean | null
          body_html_template?: string | null
          channel?: string
          completed_at?: string | null
          contacts_queued?: number | null
          contacts_sent?: number | null
          converted_count?: number | null
          created_at?: string | null
          created_by?: string | null
          daily_send_limit?: number | null
          description?: string | null
          follow_up_templates?: Json | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          initial_message_template: string
          interested_count?: number | null
          job_id?: string | null
          max_auto_replies?: number | null
          max_contacts?: number | null
          name: string
          reply_delay_minutes?: number | null
          responses_received?: number | null
          sequence_steps?: Json
          started_at?: string | null
          status?: string | null
          subject_template?: string | null
          target_filters?: Json | null
          target_source?: string
          updated_at?: string | null
        }
        Update: {
          ab_group_id?: string | null
          ab_variant?: string | null
          account_id?: string
          ai_persona?: string | null
          auto_reply_enabled?: boolean | null
          body_html_template?: string | null
          channel?: string
          completed_at?: string | null
          contacts_queued?: number | null
          contacts_sent?: number | null
          converted_count?: number | null
          created_at?: string | null
          created_by?: string | null
          daily_send_limit?: number | null
          description?: string | null
          follow_up_templates?: Json | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          initial_message_template?: string
          interested_count?: number | null
          job_id?: string | null
          max_auto_replies?: number | null
          max_contacts?: number | null
          name?: string
          reply_delay_minutes?: number | null
          responses_received?: number | null
          sequence_steps?: Json
          started_at?: string | null
          status?: string | null
          subject_template?: string | null
          target_filters?: Json | null
          target_source?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_outreach_campaigns_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_outreach_campaigns_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_outreach_conversations: {
        Row: {
          account_id: string
          ai_context: Json | null
          ai_replies_count: number | null
          campaign_id: string
          candidate_email: string | null
          candidate_id: string | null
          channel: string
          contact_email: string | null
          contact_name: string
          contact_phone: string
          converted_at: string | null
          created_at: string | null
          current_step: number
          hunting_result_id: string | null
          id: string
          interest_reason: string | null
          interest_score: number | null
          last_message_at: string | null
          last_response_at: string | null
          last_unread_at: string | null
          messages: Json | null
          next_followup_at: string | null
          opened_at: string | null
          opted_out_at: string | null
          reactivation_context: Json | null
          reply_token: string | null
          responded_at: string | null
          response_classification: string | null
          status: string | null
          talent_pool_id: string | null
          template_used: string | null
          unread_count: number
          updated_at: string | null
          variant: string | null
        }
        Insert: {
          account_id: string
          ai_context?: Json | null
          ai_replies_count?: number | null
          campaign_id: string
          candidate_email?: string | null
          candidate_id?: string | null
          channel?: string
          contact_email?: string | null
          contact_name: string
          contact_phone: string
          converted_at?: string | null
          created_at?: string | null
          current_step?: number
          hunting_result_id?: string | null
          id?: string
          interest_reason?: string | null
          interest_score?: number | null
          last_message_at?: string | null
          last_response_at?: string | null
          last_unread_at?: string | null
          messages?: Json | null
          next_followup_at?: string | null
          opened_at?: string | null
          opted_out_at?: string | null
          reactivation_context?: Json | null
          reply_token?: string | null
          responded_at?: string | null
          response_classification?: string | null
          status?: string | null
          talent_pool_id?: string | null
          template_used?: string | null
          unread_count?: number
          updated_at?: string | null
          variant?: string | null
        }
        Update: {
          account_id?: string
          ai_context?: Json | null
          ai_replies_count?: number | null
          campaign_id?: string
          candidate_email?: string | null
          candidate_id?: string | null
          channel?: string
          contact_email?: string | null
          contact_name?: string
          contact_phone?: string
          converted_at?: string | null
          created_at?: string | null
          current_step?: number
          hunting_result_id?: string | null
          id?: string
          interest_reason?: string | null
          interest_score?: number | null
          last_message_at?: string | null
          last_response_at?: string | null
          last_unread_at?: string | null
          messages?: Json | null
          next_followup_at?: string | null
          opened_at?: string | null
          opted_out_at?: string | null
          reactivation_context?: Json | null
          reply_token?: string | null
          responded_at?: string | null
          response_classification?: string | null
          status?: string | null
          talent_pool_id?: string | null
          template_used?: string | null
          unread_count?: number
          updated_at?: string | null
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_outreach_conversations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_outreach_conversations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "recruitment_outreach_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_outreach_conversations_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "recruitment_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_outreach_conversations_hunting_result_id_fkey"
            columns: ["hunting_result_id"]
            isOneToOne: false
            referencedRelation: "recruitment_hunting_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_outreach_conversations_talent_pool_id_fkey"
            columns: ["talent_pool_id"]
            isOneToOne: false
            referencedRelation: "talent_pool"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_outreach_queue: {
        Row: {
          account_id: string
          attempts: number | null
          channel: string
          conversation_id: string
          created_at: string | null
          error_message: string | null
          id: string
          max_attempts: number | null
          message_content: string
          message_type: string
          processed_at: string | null
          scheduled_for: string | null
          status: string | null
          zapi_message_id: string | null
        }
        Insert: {
          account_id: string
          attempts?: number | null
          channel?: string
          conversation_id: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          max_attempts?: number | null
          message_content: string
          message_type?: string
          processed_at?: string | null
          scheduled_for?: string | null
          status?: string | null
          zapi_message_id?: string | null
        }
        Update: {
          account_id?: string
          attempts?: number | null
          channel?: string
          conversation_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          max_attempts?: number | null
          message_content?: string
          message_type?: string
          processed_at?: string | null
          scheduled_for?: string | null
          status?: string | null
          zapi_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_outreach_queue_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_outreach_queue_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "recruitment_outreach_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_package_features: {
        Row: {
          created_at: string
          feature_key: string
          id: string
          package_id: string
        }
        Insert: {
          created_at?: string
          feature_key: string
          id?: string
          package_id: string
        }
        Update: {
          created_at?: string
          feature_key?: string
          id?: string
          package_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_package_features_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "recruitment_credit_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_proposal_templates: {
        Row: {
          account_id: string
          content: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          language: string | null
          name: string
          type: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          account_id: string
          content: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          language?: string | null
          name: string
          type?: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          account_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          language?: string | null
          name?: string
          type?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_proposal_templates_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_proposals: {
        Row: {
          account_id: string
          additional_notes: string | null
          application_id: string
          approved_at: string | null
          approved_by: string | null
          benefits: Json | null
          created_at: string
          currency: string | null
          custom_clauses: string[] | null
          final_content: string | null
          generated_by: string | null
          generated_content: string | null
          id: string
          metadata: Json | null
          responded_at: string | null
          response_notes: string | null
          response_type: string | null
          salary_offered: number | null
          sent_at: string | null
          sent_via: string | null
          start_date: string | null
          status: string
          template_id: string | null
          updated_at: string
          valid_until: string | null
          version: number | null
          viewed_at: string | null
        }
        Insert: {
          account_id: string
          additional_notes?: string | null
          application_id: string
          approved_at?: string | null
          approved_by?: string | null
          benefits?: Json | null
          created_at?: string
          currency?: string | null
          custom_clauses?: string[] | null
          final_content?: string | null
          generated_by?: string | null
          generated_content?: string | null
          id?: string
          metadata?: Json | null
          responded_at?: string | null
          response_notes?: string | null
          response_type?: string | null
          salary_offered?: number | null
          sent_at?: string | null
          sent_via?: string | null
          start_date?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
          valid_until?: string | null
          version?: number | null
          viewed_at?: string | null
        }
        Update: {
          account_id?: string
          additional_notes?: string | null
          application_id?: string
          approved_at?: string | null
          approved_by?: string | null
          benefits?: Json | null
          created_at?: string
          currency?: string | null
          custom_clauses?: string[] | null
          final_content?: string | null
          generated_by?: string | null
          generated_content?: string | null
          id?: string
          metadata?: Json | null
          responded_at?: string | null
          response_notes?: string | null
          response_type?: string | null
          salary_offered?: number | null
          sent_at?: string | null
          sent_via?: string | null
          start_date?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
          valid_until?: string | null
          version?: number | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_proposals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_proposals_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "recruitment_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_proposals_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "recruitment_proposal_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_scheduled_notifications: {
        Row: {
          account_id: string
          application_id: string
          candidate_id: string
          created_at: string | null
          id: string
          job_id: string
          next_step_type: string | null
          notification_type: string
          payload: Json | null
          processed_at: string | null
          scheduled_for: string
          status: string | null
        }
        Insert: {
          account_id: string
          application_id: string
          candidate_id: string
          created_at?: string | null
          id?: string
          job_id: string
          next_step_type?: string | null
          notification_type: string
          payload?: Json | null
          processed_at?: string | null
          scheduled_for: string
          status?: string | null
        }
        Update: {
          account_id?: string
          application_id?: string
          candidate_id?: string
          created_at?: string | null
          id?: string
          job_id?: string
          next_step_type?: string | null
          notification_type?: string
          payload?: Json | null
          processed_at?: string | null
          scheduled_for?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_scheduled_notifications_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_scheduled_notifications_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "recruitment_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_scheduled_notifications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "recruitment_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_scheduled_notifications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_scorecard_criteria: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          order_index: number
          template_id: string
          weight: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          order_index?: number
          template_id: string
          weight?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          order_index?: number
          template_id?: string
          weight?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_scorecard_criteria_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "recruitment_scorecard_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_scorecard_templates: {
        Row: {
          account_id: string
          created_at: string
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          stage: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          stage?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          stage?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_scorecard_templates_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_screening_results: {
        Row: {
          account_id: string
          application_id: string
          candidate_id: string
          completed_at: string | null
          created_at: string | null
          id: string
          job_id: string
          passed: boolean
          questions: Json
        }
        Insert: {
          account_id: string
          application_id: string
          candidate_id: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          job_id: string
          passed?: boolean
          questions?: Json
        }
        Update: {
          account_id?: string
          application_id?: string
          candidate_id?: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          job_id?: string
          passed?: boolean
          questions?: Json
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_screening_results_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_screening_results_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "recruitment_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_screening_results_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "recruitment_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_screening_results_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_shortlist_items: {
        Row: {
          added_by: string | null
          created_at: string
          hunting_result_id: string
          id: string
          notes: string | null
          position: number
          shortlist_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          hunting_result_id: string
          id?: string
          notes?: string | null
          position?: number
          shortlist_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          hunting_result_id?: string
          id?: string
          notes?: string | null
          position?: number
          shortlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_shortlist_items_hunting_result_id_fkey"
            columns: ["hunting_result_id"]
            isOneToOne: false
            referencedRelation: "recruitment_hunting_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_shortlist_items_shortlist_id_fkey"
            columns: ["shortlist_id"]
            isOneToOne: false
            referencedRelation: "recruitment_shortlists"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_shortlists: {
        Row: {
          account_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          job_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          job_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          job_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_shortlists_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_shortlists_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_source_spend: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          id: string
          month: number
          notes: string | null
          source: string
          updated_at: string
          year: number
        }
        Insert: {
          account_id: string
          amount?: number
          created_at?: string
          id?: string
          month: number
          notes?: string | null
          source: string
          updated_at?: string
          year: number
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          id?: string
          month?: number
          notes?: string | null
          source?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      recruitment_usage_credits: {
        Row: {
          account_id: string
          balance: number
          created_at: string
          credit_type: string
          id: string
          last_purchase_at: string | null
          last_reset_at: string | null
          monthly_included: number
          monthly_used: number
          total_purchased: number
          total_used: number
          updated_at: string
        }
        Insert: {
          account_id: string
          balance?: number
          created_at?: string
          credit_type: string
          id?: string
          last_purchase_at?: string | null
          last_reset_at?: string | null
          monthly_included?: number
          monthly_used?: number
          total_purchased?: number
          total_used?: number
          updated_at?: string
        }
        Update: {
          account_id?: string
          balance?: number
          created_at?: string
          credit_type?: string
          id?: string
          last_purchase_at?: string | null
          last_reset_at?: string | null
          monthly_included?: number
          monthly_used?: number
          total_purchased?: number
          total_used?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_usage_credits_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_usage_log: {
        Row: {
          account_id: string
          amount: number
          balance_after: number
          balance_before: number
          created_at: string
          created_by: string | null
          credit_type: string
          description: string | null
          id: string
          metadata: Json | null
          operation: string
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          account_id: string
          amount: number
          balance_after: number
          balance_before: number
          created_at?: string
          created_by?: string | null
          credit_type: string
          description?: string | null
          id?: string
          metadata?: Json | null
          operation: string
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          account_id?: string
          amount?: number
          balance_after?: number
          balance_before?: number
          created_at?: string
          created_by?: string | null
          credit_type?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          operation?: string
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_usage_log_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_whatsapp_config: {
        Row: {
          access_token: string
          account_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          phone_number_id: string
          updated_at: string | null
          waba_id: string | null
        }
        Insert: {
          access_token: string
          account_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          phone_number_id: string
          updated_at?: string | null
          waba_id?: string | null
        }
        Update: {
          access_token?: string
          account_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          phone_number_id?: string
          updated_at?: string | null
          waba_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_whatsapp_config_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_allocation_history: {
        Row: {
          created_at: string
          created_by: string | null
          horizon_weeks: number
          id: string
          label: string | null
          snapshot: Json
          week_start: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          horizon_weeks?: number
          id?: string
          label?: string | null
          snapshot: Json
          week_start: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          horizon_weeks?: number
          id?: string
          label?: string | null
          snapshot?: Json
          week_start?: string
        }
        Relationships: []
      }
      ritual_items: {
        Row: {
          created_at: string | null
          id: string
          item_text: string
          pillar_number: number
          session_id: string
          source: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_text: string
          pillar_number: number
          session_id: string
          source: string
        }
        Update: {
          created_at?: string | null
          id?: string
          item_text?: string
          pillar_number?: number
          session_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "ritual_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ritual_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ritual_sessions: {
        Row: {
          account_id: string | null
          ai_final_recommendations: Json | null
          ai_management_recommendations: Json | null
          approved_rituals: Json | null
          created_at: string | null
          id: string
          management_rituals: Json | null
          stage: number
          updated_at: string | null
          user_id: string
          work_model: string | null
        }
        Insert: {
          account_id?: string | null
          ai_final_recommendations?: Json | null
          ai_management_recommendations?: Json | null
          approved_rituals?: Json | null
          created_at?: string | null
          id?: string
          management_rituals?: Json | null
          stage?: number
          updated_at?: string | null
          user_id: string
          work_model?: string | null
        }
        Update: {
          account_id?: string | null
          ai_final_recommendations?: Json | null
          ai_management_recommendations?: Json | null
          approved_rituals?: Json | null
          created_at?: string | null
          id?: string
          management_rituals?: Json | null
          stage?: number
          updated_at?: string | null
          user_id?: string
          work_model?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ritual_sessions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ritual_suggestions_catalog: {
        Row: {
          active: boolean | null
          complexity: string | null
          created_at: string | null
          duration: string | null
          format: string | null
          id: string
          pillar_number: number
          sort_order: number | null
          suggestion_text: string
          work_model_tags: string[] | null
        }
        Insert: {
          active?: boolean | null
          complexity?: string | null
          created_at?: string | null
          duration?: string | null
          format?: string | null
          id?: string
          pillar_number: number
          sort_order?: number | null
          suggestion_text: string
          work_model_tags?: string[] | null
        }
        Update: {
          active?: boolean | null
          complexity?: string | null
          created_at?: string | null
          duration?: string | null
          format?: string | null
          id?: string
          pillar_number?: number
          sort_order?: number | null
          suggestion_text?: string
          work_model_tags?: string[] | null
        }
        Relationships: []
      }
      ritual_version_history: {
        Row: {
          created_at: string | null
          id: string
          session_id: string
          snapshot: Json
          variant: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          session_id: string
          snapshot: Json
          variant?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          session_id?: string
          snapshot?: Json
          variant?: string
        }
        Relationships: [
          {
            foreignKeyName: "ritual_version_history_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ritual_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      roip_answers: {
        Row: {
          answer_value: number
          created_at: string
          id: string
          question_id: number
          roip_assessment_id: string
          updated_at: string
        }
        Insert: {
          answer_value: number
          created_at?: string
          id?: string
          question_id: number
          roip_assessment_id: string
          updated_at?: string
        }
        Update: {
          answer_value?: number
          created_at?: string
          id?: string
          question_id?: number
          roip_assessment_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roip_answers_roip_assessment_id_fkey"
            columns: ["roip_assessment_id"]
            isOneToOne: false
            referencedRelation: "roip_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      roip_assessments: {
        Row: {
          account_id: string | null
          company_name: string
          company_segment: string
          company_size: string
          completed: boolean
          created_at: string
          current_step: number
          id: string
          is_default: boolean | null
          overall_score: number | null
          period_month: number | null
          period_year: number | null
          roip_simulation_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          company_name?: string
          company_segment?: string
          company_size?: string
          completed?: boolean
          created_at?: string
          current_step?: number
          id?: string
          is_default?: boolean | null
          overall_score?: number | null
          period_month?: number | null
          period_year?: number | null
          roip_simulation_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          company_name?: string
          company_segment?: string
          company_size?: string
          completed?: boolean
          created_at?: string
          current_step?: number
          id?: string
          is_default?: boolean | null
          overall_score?: number | null
          period_month?: number | null
          period_year?: number | null
          roip_simulation_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roip_assessments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roip_assessments_roip_simulation_id_fkey"
            columns: ["roip_simulation_id"]
            isOneToOne: false
            referencedRelation: "roip_simulations"
            referencedColumns: ["id"]
          },
        ]
      }
      roip_results: {
        Row: {
          ai_analysis: Json | null
          created_at: string
          id: string
          overall_score: number
          pdf_url: string | null
          pillar_scores: Json
          roip_assessment_id: string
          updated_at: string
        }
        Insert: {
          ai_analysis?: Json | null
          created_at?: string
          id?: string
          overall_score: number
          pdf_url?: string | null
          pillar_scores: Json
          roip_assessment_id: string
          updated_at?: string
        }
        Update: {
          ai_analysis?: Json | null
          created_at?: string
          id?: string
          overall_score?: number
          pdf_url?: string | null
          pillar_scores?: Json
          roip_assessment_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roip_results_roip_assessment_id_fkey"
            columns: ["roip_assessment_id"]
            isOneToOne: true
            referencedRelation: "roip_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      roip_simulations: {
        Row: {
          account_id: string | null
          created_at: string
          dados_simulacao: Json
          id: string
          nome_empresa: string
          resultados_calculadora: Json
          user_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          dados_simulacao: Json
          id?: string
          nome_empresa: string
          resultados_calculadora: Json
          user_id: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          dados_simulacao?: Json
          id?: string
          nome_empresa?: string
          resultados_calculadora?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roip_simulations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_history: {
        Row: {
          approved_by: string | null
          change_type: string
          created_at: string | null
          effective_date: string
          employee_position_id: string
          id: string
          new_salary: number | null
          previous_salary: number | null
          reason: string | null
        }
        Insert: {
          approved_by?: string | null
          change_type: string
          created_at?: string | null
          effective_date: string
          employee_position_id: string
          id?: string
          new_salary?: number | null
          previous_salary?: number | null
          reason?: string | null
        }
        Update: {
          approved_by?: string | null
          change_type?: string
          created_at?: string | null
          effective_date?: string
          employee_position_id?: string
          id?: string
          new_salary?: number | null
          previous_salary?: number | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_history_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_history_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_history_employee_position_id_fkey"
            columns: ["employee_position_id"]
            isOneToOne: false
            referencedRelation: "employee_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_ranges: {
        Row: {
          created_at: string | null
          currency: string | null
          effective_date: string | null
          id: string
          level_id: string
          market_reference: Json | null
          maximum: number
          midpoint: number
          minimum: number
          periodicity: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          effective_date?: string | null
          id?: string
          level_id: string
          market_reference?: Json | null
          maximum: number
          midpoint: number
          minimum: number
          periodicity?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          effective_date?: string | null
          id?: string
          level_id?: string
          market_reference?: Json | null
          maximum?: number
          midpoint?: number
          minimum?: number
          periodicity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_ranges_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "position_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_demo_logs: {
        Row: {
          account_id: string
          blocks_completed: number[] | null
          blocks_skipped: number[] | null
          conducted_by: string
          created_at: string
          duration_seconds: number | null
          id: string
          next_step: string | null
          notes: string | null
          outcome: string | null
          prospect_company: string | null
          prospect_name: string | null
          prospect_pain: string[] | null
        }
        Insert: {
          account_id: string
          blocks_completed?: number[] | null
          blocks_skipped?: number[] | null
          conducted_by: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          next_step?: string | null
          notes?: string | null
          outcome?: string | null
          prospect_company?: string | null
          prospect_name?: string | null
          prospect_pain?: string[] | null
        }
        Update: {
          account_id?: string
          blocks_completed?: number[] | null
          blocks_skipped?: number[] | null
          conducted_by?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          next_step?: string | null
          notes?: string | null
          outcome?: string | null
          prospect_company?: string | null
          prospect_name?: string | null
          prospect_pain?: string[] | null
        }
        Relationships: []
      }
      selling_company_sessions: {
        Row: {
          account_id: string
          created_at: string
          id: string
          responses: Json
          stage: string
          status: string
          updated_at: string
          user_id: string
          wizard_step: number
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          responses?: Json
          stage?: string
          status?: string
          updated_at?: string
          user_id: string
          wizard_step?: number
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          responses?: Json
          stage?: string
          status?: string
          updated_at?: string
          user_id?: string
          wizard_step?: number
        }
        Relationships: [
          {
            foreignKeyName: "selling_company_sessions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      selling_company_versions: {
        Row: {
          approved: boolean
          content: string
          created_at: string
          id: string
          model_used: string | null
          prompt_used: string | null
          session_id: string
        }
        Insert: {
          approved?: boolean
          content: string
          created_at?: string
          id?: string
          model_used?: string | null
          prompt_used?: string | null
          session_id: string
        }
        Update: {
          approved?: boolean
          content?: string
          created_at?: string
          id?: string
          model_used?: string | null
          prompt_used?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "selling_company_versions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "selling_company_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_talent_pool: {
        Row: {
          available_until: string | null
          candidate_id: string | null
          candidate_profile_id: string | null
          created_at: string | null
          cultural_radar_data: Json | null
          cultural_score: number | null
          disc_primary: string | null
          disc_scores: Json | null
          disc_secondary: string | null
          embedding: string | null
          experience_years: number | null
          id: string
          last_viewed_at: string | null
          location_city: string | null
          location_state: string | null
          notification_sent_at: string | null
          opted_out: boolean | null
          opted_out_at: string | null
          remote_preference: string | null
          salary_range: string | null
          seniority_level: string | null
          skills: string[] | null
          source_account_id: string
          unlock_count: number | null
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          available_until?: string | null
          candidate_id?: string | null
          candidate_profile_id?: string | null
          created_at?: string | null
          cultural_radar_data?: Json | null
          cultural_score?: number | null
          disc_primary?: string | null
          disc_scores?: Json | null
          disc_secondary?: string | null
          embedding?: string | null
          experience_years?: number | null
          id?: string
          last_viewed_at?: string | null
          location_city?: string | null
          location_state?: string | null
          notification_sent_at?: string | null
          opted_out?: boolean | null
          opted_out_at?: string | null
          remote_preference?: string | null
          salary_range?: string | null
          seniority_level?: string | null
          skills?: string[] | null
          source_account_id: string
          unlock_count?: number | null
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          available_until?: string | null
          candidate_id?: string | null
          candidate_profile_id?: string | null
          created_at?: string | null
          cultural_radar_data?: Json | null
          cultural_score?: number | null
          disc_primary?: string | null
          disc_scores?: Json | null
          disc_secondary?: string | null
          embedding?: string | null
          experience_years?: number | null
          id?: string
          last_viewed_at?: string | null
          location_city?: string | null
          location_state?: string | null
          notification_sent_at?: string | null
          opted_out?: boolean | null
          opted_out_at?: string | null
          remote_preference?: string | null
          salary_range?: string | null
          seniority_level?: string | null
          skills?: string[] | null
          source_account_id?: string
          unlock_count?: number | null
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_talent_pool_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: true
            referencedRelation: "recruitment_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_talent_pool_candidate_profile_id_fkey"
            columns: ["candidate_profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_talent_pool_source_account_id_fkey"
            columns: ["source_account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      shortlist_relatorios: {
        Row: {
          account_id: string
          cliente_id: string | null
          conteudo_json: Json | null
          created_at: string
          id: string
          pdf_url: string | null
          titulo: string | null
          token_publico: string | null
          updated_at: string
          vaga_id: string | null
          visualizacoes: number | null
        }
        Insert: {
          account_id: string
          cliente_id?: string | null
          conteudo_json?: Json | null
          created_at?: string
          id?: string
          pdf_url?: string | null
          titulo?: string | null
          token_publico?: string | null
          updated_at?: string
          vaga_id?: string | null
          visualizacoes?: number | null
        }
        Update: {
          account_id?: string
          cliente_id?: string | null
          conteudo_json?: Json | null
          created_at?: string
          id?: string
          pdf_url?: string | null
          titulo?: string | null
          token_publico?: string | null
          updated_at?: string
          vaga_id?: string | null
          visualizacoes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shortlist_relatorios_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shortlist_relatorios_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes_consultoria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shortlist_relatorios_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_alertas: {
        Row: {
          account_id: string
          created_at: string
          dias_restantes: number | null
          id: string
          resolucao_nota: string | null
          responsavel_user_id: string | null
          status: string | null
          tipo_alerta: string
          updated_at: string
          vaga_id: string | null
        }
        Insert: {
          account_id: string
          created_at?: string
          dias_restantes?: number | null
          id?: string
          resolucao_nota?: string | null
          responsavel_user_id?: string | null
          status?: string | null
          tipo_alerta: string
          updated_at?: string
          vaga_id?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string
          dias_restantes?: number | null
          id?: string
          resolucao_nota?: string | null
          responsavel_user_id?: string | null
          status?: string | null
          tipo_alerta?: string
          updated_at?: string
          vaga_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sla_alertas_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_alertas_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      strategic_indicators: {
        Row: {
          account_id: string | null
          created_at: string
          final_selection: Json | null
          id: string
          segment: string
          selected_step1: Json | null
          stage: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          final_selection?: Json | null
          id?: string
          segment: string
          selected_step1?: Json | null
          stage?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          final_selection?: Json | null
          id?: string
          segment?: string
          selected_step1?: Json | null
          stage?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategic_indicators_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      strategic_projects: {
        Row: {
          account_id: string | null
          created_at: string | null
          description: string | null
          id: string
          importance: string | null
          involved_members: string[] | null
          is_custom: boolean | null
          linked_indicator: string[] | null
          perspective: string
          project_name: string
          responsible: string | null
          segment: string | null
          start_quarter: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          importance?: string | null
          involved_members?: string[] | null
          is_custom?: boolean | null
          linked_indicator?: string[] | null
          perspective: string
          project_name: string
          responsible?: string | null
          segment?: string | null
          start_quarter?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          importance?: string | null
          involved_members?: string[] | null
          is_custom?: boolean | null
          linked_indicator?: string[] | null
          perspective?: string
          project_name?: string
          responsible?: string | null
          segment?: string | null
          start_quarter?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategic_projects_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      success_patterns: {
        Row: {
          conditions: Json
          confidence: number
          created_at: string
          id: string
          is_active: boolean
          last_calculated_at: string | null
          outcomes: Json
          pattern_name: string
          pattern_type: string
          sample_size: number
          updated_at: string
        }
        Insert: {
          conditions?: Json
          confidence?: number
          created_at?: string
          id?: string
          is_active?: boolean
          last_calculated_at?: string | null
          outcomes?: Json
          pattern_name: string
          pattern_type: string
          sample_size?: number
          updated_at?: string
        }
        Update: {
          conditions?: Json
          confidence?: number
          created_at?: string
          id?: string
          is_active?: boolean
          last_calculated_at?: string | null
          outcomes?: Json
          pattern_name?: string
          pattern_type?: string
          sample_size?: number
          updated_at?: string
        }
        Relationships: []
      }
      support_ticket_messages: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          id: string
          is_internal: boolean | null
          ticket_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          ticket_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          account_id: string
          assigned_to: string | null
          category: string | null
          closed_at: string | null
          conversation_context: Json | null
          created_at: string | null
          created_by: string
          description: string | null
          first_response_at: string | null
          id: string
          page_context: string | null
          priority: string | null
          rated_at: string | null
          resolved_at: string | null
          satisfaction_comment: string | null
          satisfaction_rating: number | null
          sla_due_at: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          account_id: string
          assigned_to?: string | null
          category?: string | null
          closed_at?: string | null
          conversation_context?: Json | null
          created_at?: string | null
          created_by: string
          description?: string | null
          first_response_at?: string | null
          id?: string
          page_context?: string | null
          priority?: string | null
          rated_at?: string | null
          resolved_at?: string | null
          satisfaction_comment?: string | null
          satisfaction_rating?: number | null
          sla_due_at?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          assigned_to?: string | null
          category?: string | null
          closed_at?: string | null
          conversation_context?: Json | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          first_response_at?: string | null
          id?: string
          page_context?: string | null
          priority?: string | null
          rated_at?: string | null
          resolved_at?: string | null
          satisfaction_comment?: string | null
          satisfaction_rating?: number | null
          sla_due_at?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      survey_answers: {
        Row: {
          answer_options: Json | null
          answer_scale: number | null
          answer_text: string | null
          created_at: string | null
          id: string
          question_id: string
          response_id: string
        }
        Insert: {
          answer_options?: Json | null
          answer_scale?: number | null
          answer_text?: string | null
          created_at?: string | null
          id?: string
          question_id: string
          response_id: string
        }
        Update: {
          answer_options?: Json | null
          answer_scale?: number | null
          answer_text?: string | null
          created_at?: string | null
          id?: string
          question_id?: string
          response_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "survey_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_answers_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "survey_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_benchmarks: {
        Row: {
          average_value: number
          benchmark_type: string
          bottom_quartile: number | null
          created_at: string | null
          id: string
          max_value: number | null
          metric_label: string | null
          metric_name: string
          min_value: number | null
          sector: string | null
          source: string | null
          top_quartile: number | null
          updated_at: string | null
        }
        Insert: {
          average_value: number
          benchmark_type: string
          bottom_quartile?: number | null
          created_at?: string | null
          id?: string
          max_value?: number | null
          metric_label?: string | null
          metric_name: string
          min_value?: number | null
          sector?: string | null
          source?: string | null
          top_quartile?: number | null
          updated_at?: string | null
        }
        Update: {
          average_value?: number
          benchmark_type?: string
          bottom_quartile?: number | null
          created_at?: string | null
          id?: string
          max_value?: number | null
          metric_label?: string | null
          metric_name?: string
          min_value?: number | null
          sector?: string | null
          source?: string | null
          top_quartile?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      survey_invitations: {
        Row: {
          id: string
          reminder_count: number | null
          responded_at: string | null
          sent_at: string | null
          status: string | null
          survey_id: string
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          id?: string
          reminder_count?: number | null
          responded_at?: string | null
          sent_at?: string | null
          status?: string | null
          survey_id: string
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          id?: string
          reminder_count?: number | null
          responded_at?: string | null
          sent_at?: string | null
          status?: string | null
          survey_id?: string
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_invitations_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_questions: {
        Row: {
          created_at: string | null
          id: string
          options: Json | null
          position: number
          question_text: string
          question_type: string
          required: boolean | null
          survey_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          options?: Json | null
          position: number
          question_text: string
          question_type: string
          required?: boolean | null
          survey_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          options?: Json | null
          position?: number
          question_text?: string
          question_type?: string
          required?: boolean | null
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          created_at: string | null
          id: string
          is_anonymous: boolean | null
          respondent_id: string | null
          submitted_at: string | null
          survey_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          respondent_id?: string | null
          submitted_at?: string | null
          survey_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          respondent_id?: string | null
          submitted_at?: string | null
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_schedules: {
        Row: {
          created_at: string | null
          created_survey_id: string | null
          id: string
          scheduled_end_date: string
          scheduled_start_date: string
          status: string | null
          survey_id: string
        }
        Insert: {
          created_at?: string | null
          created_survey_id?: string | null
          id?: string
          scheduled_end_date: string
          scheduled_start_date: string
          status?: string | null
          survey_id: string
        }
        Update: {
          created_at?: string | null
          created_survey_id?: string | null
          id?: string
          scheduled_end_date?: string
          scheduled_start_date?: string
          status?: string | null
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_schedules_created_survey_id_fkey"
            columns: ["created_survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_schedules_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_template_questions: {
        Row: {
          created_at: string | null
          id: string
          options: Json | null
          position: number
          question_text: string
          question_type: string
          required: boolean | null
          template_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          options?: Json | null
          position: number
          question_text: string
          question_type: string
          required?: boolean | null
          template_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          options?: Json | null
          position?: number
          question_text?: string
          question_type?: string
          required?: boolean | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_template_questions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "survey_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_templates: {
        Row: {
          account_id: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_templates_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          account_id: string
          category: string | null
          created_at: string | null
          created_by: string
          custom_recurrence_dates: Json | null
          description: string | null
          end_date: string
          id: string
          is_anonymous: boolean | null
          is_recurring: boolean | null
          parent_survey_id: string | null
          recurrence_count: number | null
          recurrence_end_date: string | null
          recurrence_pattern: string | null
          reminder_days_before: number[] | null
          reminder_enabled: boolean | null
          reminder_sent_dates: string[] | null
          start_date: string
          status: string | null
          template_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          account_id: string
          category?: string | null
          created_at?: string | null
          created_by: string
          custom_recurrence_dates?: Json | null
          description?: string | null
          end_date: string
          id?: string
          is_anonymous?: boolean | null
          is_recurring?: boolean | null
          parent_survey_id?: string | null
          recurrence_count?: number | null
          recurrence_end_date?: string | null
          recurrence_pattern?: string | null
          reminder_days_before?: number[] | null
          reminder_enabled?: boolean | null
          reminder_sent_dates?: string[] | null
          start_date: string
          status?: string | null
          template_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          category?: string | null
          created_at?: string | null
          created_by?: string
          custom_recurrence_dates?: Json | null
          description?: string | null
          end_date?: string
          id?: string
          is_anonymous?: boolean | null
          is_recurring?: boolean | null
          parent_survey_id?: string | null
          recurrence_count?: number | null
          recurrence_end_date?: string | null
          recurrence_pattern?: string | null
          reminder_days_before?: number[] | null
          reminder_enabled?: boolean | null
          reminder_sent_dates?: string[] | null
          start_date?: string
          status?: string | null
          template_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "surveys_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_parent_survey_id_fkey"
            columns: ["parent_survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "survey_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_bank_matches: {
        Row: {
          account_id: string
          candidate_id: string
          created_at: string
          id: string
          job_id: string
          match_reasoning: string | null
          similarity_score: number
          source_history_ids: string[] | null
          status: string
        }
        Insert: {
          account_id: string
          candidate_id: string
          created_at?: string
          id?: string
          job_id: string
          match_reasoning?: string | null
          similarity_score?: number
          source_history_ids?: string[] | null
          status?: string
        }
        Update: {
          account_id?: string
          candidate_id?: string
          created_at?: string
          id?: string
          job_id?: string
          match_reasoning?: string | null
          similarity_score?: number
          source_history_ids?: string[] | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "talent_bank_matches_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_bank_matches_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "recruitment_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_bank_matches_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_pool: {
        Row: {
          account_id: string
          areas_of_interest: string[] | null
          created_at: string | null
          email: string
          id: string
          linkedin_url: string | null
          message: string | null
          name: string
          phone: string | null
          resume_url: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          areas_of_interest?: string[] | null
          created_at?: string | null
          email: string
          id?: string
          linkedin_url?: string | null
          message?: string | null
          name: string
          phone?: string | null
          resume_url?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          areas_of_interest?: string[] | null
          created_at?: string | null
          email?: string
          id?: string
          linkedin_url?: string | null
          message?: string | null
          name?: string
          phone?: string | null
          resume_url?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "talent_pool_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_pool_unlocks: {
        Row: {
          buyer_account_id: string
          buyer_user_id: string
          contact_initiated: boolean | null
          contacted_at: string | null
          created_at: string | null
          credits_charged: number
          hired: boolean | null
          hired_at: string | null
          id: string
          interview_scheduled: boolean | null
          notes: string | null
          revealed_data: Json
          status: string | null
          talent_pool_id: string
          updated_at: string | null
        }
        Insert: {
          buyer_account_id: string
          buyer_user_id: string
          contact_initiated?: boolean | null
          contacted_at?: string | null
          created_at?: string | null
          credits_charged?: number
          hired?: boolean | null
          hired_at?: string | null
          id?: string
          interview_scheduled?: boolean | null
          notes?: string | null
          revealed_data?: Json
          status?: string | null
          talent_pool_id: string
          updated_at?: string | null
        }
        Update: {
          buyer_account_id?: string
          buyer_user_id?: string
          contact_initiated?: boolean | null
          contacted_at?: string | null
          created_at?: string | null
          credits_charged?: number
          hired?: boolean | null
          hired_at?: string | null
          id?: string
          interview_scheduled?: boolean | null
          notes?: string | null
          revealed_data?: Json
          status?: string | null
          talent_pool_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "talent_pool_unlocks_buyer_account_id_fkey"
            columns: ["buyer_account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_pool_unlocks_talent_pool_id_fkey"
            columns: ["talent_pool_id"]
            isOneToOne: false
            referencedRelation: "shared_talent_pool"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_pool_views: {
        Row: {
          id: string
          session_id: string | null
          talent_pool_id: string
          viewed_at: string
          viewer_account_id: string
          viewer_user_id: string | null
        }
        Insert: {
          id?: string
          session_id?: string | null
          talent_pool_id: string
          viewed_at?: string
          viewer_account_id: string
          viewer_user_id?: string | null
        }
        Update: {
          id?: string
          session_id?: string | null
          talent_pool_id?: string
          viewed_at?: string
          viewer_account_id?: string
          viewer_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "talent_pool_views_talent_pool_id_fkey"
            columns: ["talent_pool_id"]
            isOneToOne: false
            referencedRelation: "shared_talent_pool"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_pool_views_viewer_account_id_fkey"
            columns: ["viewer_account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      team_maturity_ai_analyses: {
        Row: {
          analysis: Json
          analysis_type: string
          assessment_id: string
          created_at: string | null
          id: string
          point_id: string | null
          position_snapshot: Json | null
        }
        Insert: {
          analysis: Json
          analysis_type: string
          assessment_id: string
          created_at?: string | null
          id?: string
          point_id?: string | null
          position_snapshot?: Json | null
        }
        Update: {
          analysis?: Json
          analysis_type?: string
          assessment_id?: string
          created_at?: string | null
          id?: string
          point_id?: string | null
          position_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "team_maturity_ai_analyses_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "team_maturity_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_maturity_ai_analyses_point_id_fkey"
            columns: ["point_id"]
            isOneToOne: false
            referencedRelation: "team_maturity_points"
            referencedColumns: ["id"]
          },
        ]
      }
      team_maturity_assessments: {
        Row: {
          account_id: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_maturity_assessments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      team_maturity_points: {
        Row: {
          assessment_id: string
          created_at: string | null
          first_name: string
          id: string
          last_name: string
          notes: string | null
          updated_at: string | null
          x_position: number
          y_position: number
        }
        Insert: {
          assessment_id: string
          created_at?: string | null
          first_name: string
          id?: string
          last_name: string
          notes?: string | null
          updated_at?: string | null
          x_position: number
          y_position: number
        }
        Update: {
          assessment_id?: string
          created_at?: string | null
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          updated_at?: string | null
          x_position?: number
          y_position?: number
        }
        Relationships: [
          {
            foreignKeyName: "team_maturity_points_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "team_maturity_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      team_maturity_version_history: {
        Row: {
          assessment_id: string
          created_at: string | null
          id: string
          snapshot: Json
          variant: string | null
        }
        Insert: {
          assessment_id: string
          created_at?: string | null
          id?: string
          snapshot: Json
          variant?: string | null
        }
        Update: {
          assessment_id?: string
          created_at?: string | null
          id?: string
          snapshot?: Json
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_maturity_version_history_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "team_maturity_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      technical_interview_responses: {
        Row: {
          ai_analysis: string | null
          candidate_response: string | null
          ceiling_detected: boolean | null
          ceiling_signal: string | null
          created_at: string | null
          evidence_count: number | null
          id: string
          is_followup: boolean | null
          keyword_coverage: number | null
          max_level_passed: number | null
          max_level_reached: number | null
          parent_response_id: string | null
          question_index: number | null
          question_level: number | null
          question_text: string
          response_quality: string | null
          scenario_handled: boolean | null
          score: number | null
          seniority_assessed: string | null
          session_id: string
          skill_name: string
          skill_type: string | null
        }
        Insert: {
          ai_analysis?: string | null
          candidate_response?: string | null
          ceiling_detected?: boolean | null
          ceiling_signal?: string | null
          created_at?: string | null
          evidence_count?: number | null
          id?: string
          is_followup?: boolean | null
          keyword_coverage?: number | null
          max_level_passed?: number | null
          max_level_reached?: number | null
          parent_response_id?: string | null
          question_index?: number | null
          question_level?: number | null
          question_text: string
          response_quality?: string | null
          scenario_handled?: boolean | null
          score?: number | null
          seniority_assessed?: string | null
          session_id: string
          skill_name: string
          skill_type?: string | null
        }
        Update: {
          ai_analysis?: string | null
          candidate_response?: string | null
          ceiling_detected?: boolean | null
          ceiling_signal?: string | null
          created_at?: string | null
          evidence_count?: number | null
          id?: string
          is_followup?: boolean | null
          keyword_coverage?: number | null
          max_level_passed?: number | null
          max_level_reached?: number | null
          parent_response_id?: string | null
          question_index?: number | null
          question_level?: number | null
          question_text?: string
          response_quality?: string | null
          scenario_handled?: boolean | null
          score?: number | null
          seniority_assessed?: string | null
          session_id?: string
          skill_name?: string
          skill_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "technical_interview_responses_parent_response_id_fkey"
            columns: ["parent_response_id"]
            isOneToOne: false
            referencedRelation: "technical_interview_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_interview_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "technical_interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      technical_interview_resume_intelligence: {
        Row: {
          candidate_id: string
          created_at: string
          experience_years: number | null
          exploration_points: string[] | null
          id: string
          predictive_score: number | null
          professional_summary: string | null
          raw_profile_data: Json | null
          session_id: string
          skills_found: string[] | null
          skills_match: Json | null
          source: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          experience_years?: number | null
          exploration_points?: string[] | null
          id?: string
          predictive_score?: number | null
          professional_summary?: string | null
          raw_profile_data?: Json | null
          session_id: string
          skills_found?: string[] | null
          skills_match?: Json | null
          source?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          experience_years?: number | null
          exploration_points?: string[] | null
          id?: string
          predictive_score?: number | null
          professional_summary?: string | null
          raw_profile_data?: Json | null
          session_id?: string
          skills_found?: string[] | null
          skills_match?: Json | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "technical_interview_resume_intelligence_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "recruitment_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_interview_resume_intelligence_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "technical_interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      technical_interview_sessions: {
        Row: {
          abandoned_reason: string | null
          account_id: string
          agent_id: string | null
          ai_messages: Json | null
          archived_at: string | null
          attempt_number: number
          audio_duration_seconds: number | null
          audio_status: string
          audio_storage_path: string | null
          audio_url: string | null
          candidate_id: string | null
          candidate_profile_id: string | null
          completed_at: string | null
          completed_naturally: boolean | null
          conductor_enabled: boolean
          conductor_state: Json
          created_at: string | null
          credits_consumed_at: string | null
          credits_reverted_at: string | null
          current_followup_count: number
          current_question_index: number
          duration_seconds: number | null
          evaluation_audit_trail: Json | null
          evaluation_summary: string | null
          evaluation_version: string | null
          expires_at: string | null
          gaps: Json | null
          id: string
          import_notes: string | null
          imported_by: string | null
          is_partial_evaluation: boolean
          is_test: boolean
          job_description_context: Json | null
          job_id: string
          last_activity_at: string | null
          metadata: Json
          overall_score: number | null
          partial_transcript: string | null
          questions: Json | null
          recommendation: string | null
          recorded_at: string | null
          resume_count: number
          seniority_target: string | null
          skill_levels: Json | null
          skill_scores: Json | null
          source: string
          started_at: string | null
          status: string
          strengths: Json | null
          token: string | null
          transcript: string | null
          updated_at: string | null
          watchdog_processed_at: string | null
        }
        Insert: {
          abandoned_reason?: string | null
          account_id: string
          agent_id?: string | null
          ai_messages?: Json | null
          archived_at?: string | null
          attempt_number?: number
          audio_duration_seconds?: number | null
          audio_status?: string
          audio_storage_path?: string | null
          audio_url?: string | null
          candidate_id?: string | null
          candidate_profile_id?: string | null
          completed_at?: string | null
          completed_naturally?: boolean | null
          conductor_enabled?: boolean
          conductor_state?: Json
          created_at?: string | null
          credits_consumed_at?: string | null
          credits_reverted_at?: string | null
          current_followup_count?: number
          current_question_index?: number
          duration_seconds?: number | null
          evaluation_audit_trail?: Json | null
          evaluation_summary?: string | null
          evaluation_version?: string | null
          expires_at?: string | null
          gaps?: Json | null
          id?: string
          import_notes?: string | null
          imported_by?: string | null
          is_partial_evaluation?: boolean
          is_test?: boolean
          job_description_context?: Json | null
          job_id: string
          last_activity_at?: string | null
          metadata?: Json
          overall_score?: number | null
          partial_transcript?: string | null
          questions?: Json | null
          recommendation?: string | null
          recorded_at?: string | null
          resume_count?: number
          seniority_target?: string | null
          skill_levels?: Json | null
          skill_scores?: Json | null
          source?: string
          started_at?: string | null
          status?: string
          strengths?: Json | null
          token?: string | null
          transcript?: string | null
          updated_at?: string | null
          watchdog_processed_at?: string | null
        }
        Update: {
          abandoned_reason?: string | null
          account_id?: string
          agent_id?: string | null
          ai_messages?: Json | null
          archived_at?: string | null
          attempt_number?: number
          audio_duration_seconds?: number | null
          audio_status?: string
          audio_storage_path?: string | null
          audio_url?: string | null
          candidate_id?: string | null
          candidate_profile_id?: string | null
          completed_at?: string | null
          completed_naturally?: boolean | null
          conductor_enabled?: boolean
          conductor_state?: Json
          created_at?: string | null
          credits_consumed_at?: string | null
          credits_reverted_at?: string | null
          current_followup_count?: number
          current_question_index?: number
          duration_seconds?: number | null
          evaluation_audit_trail?: Json | null
          evaluation_summary?: string | null
          evaluation_version?: string | null
          expires_at?: string | null
          gaps?: Json | null
          id?: string
          import_notes?: string | null
          imported_by?: string | null
          is_partial_evaluation?: boolean
          is_test?: boolean
          job_description_context?: Json | null
          job_id?: string
          last_activity_at?: string | null
          metadata?: Json
          overall_score?: number | null
          partial_transcript?: string | null
          questions?: Json | null
          recommendation?: string | null
          recorded_at?: string | null
          resume_count?: number
          seniority_target?: string | null
          skill_levels?: Json | null
          skill_scores?: Json | null
          source?: string
          started_at?: string | null
          status?: string
          strengths?: Json | null
          token?: string | null
          transcript?: string | null
          updated_at?: string | null
          watchdog_processed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "technical_interview_sessions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_interview_sessions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "recruitment_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_interview_sessions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "recruitment_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_interview_sessions_candidate_profile_id_fkey"
            columns: ["candidate_profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_interview_sessions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      technical_question_bank: {
        Row: {
          account_id: string
          agent_id: string | null
          avg_score: number | null
          created_at: string | null
          excellent_answer_example: string | null
          expected_keywords: Json | null
          followup_if_excellent: string | null
          followup_if_incorrect: string | null
          followup_if_superficial: string | null
          id: string
          is_active: boolean | null
          is_mandatory: boolean | null
          level: number | null
          question_text: string
          question_type: string | null
          skill_category: string | null
          skill_name: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          account_id: string
          agent_id?: string | null
          avg_score?: number | null
          created_at?: string | null
          excellent_answer_example?: string | null
          expected_keywords?: Json | null
          followup_if_excellent?: string | null
          followup_if_incorrect?: string | null
          followup_if_superficial?: string | null
          id?: string
          is_active?: boolean | null
          is_mandatory?: boolean | null
          level?: number | null
          question_text: string
          question_type?: string | null
          skill_category?: string | null
          skill_name: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          account_id?: string
          agent_id?: string | null
          avg_score?: number | null
          created_at?: string | null
          excellent_answer_example?: string | null
          expected_keywords?: Json | null
          followup_if_excellent?: string | null
          followup_if_incorrect?: string | null
          followup_if_superficial?: string | null
          id?: string
          is_active?: boolean | null
          is_mandatory?: boolean | null
          level?: number | null
          question_text?: string
          question_type?: string | null
          skill_category?: string | null
          skill_name?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "technical_question_bank_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_question_bank_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "recruitment_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      template_permissions: {
        Row: {
          can_create: boolean | null
          can_delete: boolean | null
          can_edit: boolean | null
          can_view: boolean | null
          created_at: string | null
          id: string
          module_slug: string
          template_id: string
        }
        Insert: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          module_slug: string
          template_id: string
        }
        Update: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          module_slug?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_permissions_module_slug_fkey"
            columns: ["module_slug"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "template_permissions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "permission_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      unique_ability_activities: {
        Row: {
          analysis_id: string
          created_at: string | null
          id: string
          name: string
          position: number
          skill_score: number | null
          value_score: number | null
        }
        Insert: {
          analysis_id: string
          created_at?: string | null
          id?: string
          name: string
          position?: number
          skill_score?: number | null
          value_score?: number | null
        }
        Update: {
          analysis_id?: string
          created_at?: string | null
          id?: string
          name?: string
          position?: number
          skill_score?: number | null
          value_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "unique_ability_activities_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "unique_ability_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      unique_ability_analyses: {
        Row: {
          account_id: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unique_ability_analyses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      unique_ability_version_history: {
        Row: {
          analysis_id: string
          created_at: string | null
          id: string
          snapshot: Json
          variant: string | null
        }
        Insert: {
          analysis_id: string
          created_at?: string | null
          id?: string
          snapshot: Json
          variant?: string | null
        }
        Update: {
          analysis_id?: string
          created_at?: string | null
          id?: string
          snapshot?: Json
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unique_ability_version_history_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "unique_ability_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          account_id: string | null
          badge_id: string
          earned_at: string | null
          id: string
          seen: boolean | null
          seen_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          badge_id: string
          earned_at?: string | null
          id?: string
          seen?: boolean | null
          seen_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          badge_id?: string
          earned_at?: string | null
          id?: string
          seen?: boolean | null
          seen_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          account_member_id: string
          can_create: boolean | null
          can_delete: boolean | null
          can_edit: boolean | null
          can_view: boolean | null
          created_at: string | null
          id: string
          module_slug: string
          updated_at: string | null
        }
        Insert: {
          account_member_id: string
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          module_slug: string
          updated_at?: string | null
        }
        Update: {
          account_member_id?: string
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          module_slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_account_member_id_fkey"
            columns: ["account_member_id"]
            isOneToOne: false
            referencedRelation: "account_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_module_slug_fkey"
            columns: ["module_slug"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["slug"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      values_behaviors_options: {
        Row: {
          created_at: string | null
          donts: string[] | null
          dos: string[] | null
          id: string
          session_id: string | null
          value_label: string
        }
        Insert: {
          created_at?: string | null
          donts?: string[] | null
          dos?: string[] | null
          id?: string
          session_id?: string | null
          value_label: string
        }
        Update: {
          created_at?: string | null
          donts?: string[] | null
          dos?: string[] | null
          id?: string
          session_id?: string | null
          value_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "values_behaviors_options_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "values_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      values_behaviors_selections: {
        Row: {
          created_at: string | null
          do_selected: string[] | null
          dont_selected: string[] | null
          id: string
          session_id: string | null
          value_label: string
        }
        Insert: {
          created_at?: string | null
          do_selected?: string[] | null
          dont_selected?: string[] | null
          id?: string
          session_id?: string | null
          value_label: string
        }
        Update: {
          created_at?: string | null
          do_selected?: string[] | null
          dont_selected?: string[] | null
          id?: string
          session_id?: string | null
          value_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "values_behaviors_selections_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "values_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      values_catalog: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          label: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          label: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          label?: string
        }
        Relationships: []
      }
      values_company_info: {
        Row: {
          company_name: string
          created_at: string | null
          id: string
          session_id: string | null
          user_name: string
        }
        Insert: {
          company_name: string
          created_at?: string | null
          id?: string
          session_id?: string | null
          user_name: string
        }
        Update: {
          company_name?: string
          created_at?: string | null
          id?: string
          session_id?: string | null
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "values_company_info_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "values_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      values_final_check: {
        Row: {
          created_at: string | null
          id: string
          passed: boolean | null
          percent_resolved: number
          session_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          passed?: boolean | null
          percent_resolved: number
          session_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          passed?: boolean | null
          percent_resolved?: number
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "values_final_check_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "values_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      values_open_answers: {
        Row: {
          created_at: string | null
          expectations: string | null
          id: string
          intolerable: string | null
          session_id: string | null
        }
        Insert: {
          created_at?: string | null
          expectations?: string | null
          id?: string
          intolerable?: string | null
          session_id?: string | null
        }
        Update: {
          created_at?: string | null
          expectations?: string | null
          id?: string
          intolerable?: string | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "values_open_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "values_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      values_questions_catalog: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          question_text: string
          stage_number: number
          value_label: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          question_text: string
          stage_number: number
          value_label?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          question_text?: string
          stage_number?: number
          value_label?: string | null
        }
        Relationships: []
      }
      values_questions_items: {
        Row: {
          created_at: string | null
          id: string
          position: number | null
          question_text: string
          requires_thinking_time: boolean
          session_id: string | null
          source: string | null
          stage_number: number
          value_label: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          position?: number | null
          question_text: string
          requires_thinking_time?: boolean
          session_id?: string | null
          source?: string | null
          stage_number: number
          value_label?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          position?: number | null
          question_text?: string
          requires_thinking_time?: boolean
          session_id?: string | null
          source?: string | null
          stage_number?: number
          value_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "values_questions_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "values_questions_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      values_questions_sessions: {
        Row: {
          account_id: string | null
          created_at: string | null
          id: string
          stage: number | null
          updated_at: string | null
          user_id: string
          working_values: Json | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          id?: string
          stage?: number | null
          updated_at?: string | null
          user_id: string
          working_values?: Json | null
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          id?: string
          stage?: number | null
          updated_at?: string | null
          user_id?: string
          working_values?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "values_questions_sessions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      values_questions_version_history: {
        Row: {
          created_at: string | null
          id: string
          session_id: string | null
          snapshot: Json
          variant: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          session_id?: string | null
          snapshot: Json
          variant?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          session_id?: string | null
          snapshot?: Json
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "values_questions_version_history_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "values_questions_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      values_ratings: {
        Row: {
          created_at: string | null
          id: string
          score: number
          session_id: string | null
          valid: boolean | null
          value_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          score: number
          session_id?: string | null
          valid?: boolean | null
          value_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          score?: number
          session_id?: string | null
          valid?: boolean | null
          value_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "values_ratings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "values_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "values_ratings_value_id_fkey"
            columns: ["value_id"]
            isOneToOne: false
            referencedRelation: "values_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      values_selections: {
        Row: {
          created_at: string | null
          id: string
          phase: number
          position: number | null
          session_id: string | null
          value_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          phase: number
          position?: number | null
          session_id?: string | null
          value_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          phase?: number
          position?: number | null
          session_id?: string | null
          value_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "values_selections_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "values_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "values_selections_value_id_fkey"
            columns: ["value_id"]
            isOneToOne: false
            referencedRelation: "values_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      values_sessions: {
        Row: {
          account_id: string | null
          created_at: string | null
          id: string
          stage: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          id?: string
          stage?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          id?: string
          stage?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "values_sessions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      values_version_history: {
        Row: {
          created_at: string | null
          id: string
          session_id: string
          snapshot: Json
          variant: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          session_id: string
          snapshot: Json
          variant?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          session_id?: string
          snapshot?: Json
          variant?: string
        }
        Relationships: [
          {
            foreignKeyName: "values_version_history_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "values_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      vision_sessions: {
        Row: {
          account_id: string | null
          analysis: Json | null
          answers: Json | null
          created_at: string | null
          final_vision: string | null
          id: string
          notes: string | null
          selected_vision_type: string | null
          stage: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          analysis?: Json | null
          answers?: Json | null
          created_at?: string | null
          final_vision?: string | null
          id?: string
          notes?: string | null
          selected_vision_type?: string | null
          stage?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          analysis?: Json | null
          answers?: Json | null
          created_at?: string | null
          final_vision?: string | null
          id?: string
          notes?: string | null
          selected_vision_type?: string | null
          stage?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vision_sessions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      vision_version_history: {
        Row: {
          created_at: string | null
          id: string
          session_id: string | null
          variant: string
          vision_inspirational: string | null
          vision_measurable: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          session_id?: string | null
          variant: string
          vision_inspirational?: string | null
          vision_measurable?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          session_id?: string | null
          variant?: string
          vision_inspirational?: string | null
          vision_measurable?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vision_version_history_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "vision_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_interview_anomalies: {
        Row: {
          account_id: string
          agent_id: string | null
          ai_classification: string | null
          ai_reasoning: string | null
          candidate_id: string | null
          candidate_profile_id: string | null
          created_at: string
          description: string
          id: string
          job_id: string | null
          metrics: Json
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          rule_code: string
          session_id: string
          session_type: string
          severity: string
          suggestion: string | null
        }
        Insert: {
          account_id: string
          agent_id?: string | null
          ai_classification?: string | null
          ai_reasoning?: string | null
          candidate_id?: string | null
          candidate_profile_id?: string | null
          created_at?: string
          description: string
          id?: string
          job_id?: string | null
          metrics?: Json
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          rule_code: string
          session_id: string
          session_type: string
          severity: string
          suggestion?: string | null
        }
        Update: {
          account_id?: string
          agent_id?: string | null
          ai_classification?: string | null
          ai_reasoning?: string | null
          candidate_id?: string | null
          candidate_profile_id?: string | null
          created_at?: string
          description?: string
          id?: string
          job_id?: string | null
          metrics?: Json
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          rule_code?: string
          session_id?: string
          session_type?: string
          severity?: string
          suggestion?: string | null
        }
        Relationships: []
      }
      voice_interview_events: {
        Row: {
          account_id: string
          client_ts: string
          created_at: string
          event_type: string
          id: string
          payload: Json
          session_id: string
          session_type: string
        }
        Insert: {
          account_id: string
          client_ts?: string
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          session_id: string
          session_type: string
        }
        Update: {
          account_id?: string
          client_ts?: string
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          session_id?: string
          session_type?: string
        }
        Relationships: []
      }
      voice_interview_simulations: {
        Row: {
          account_id: string
          adherence_score: number | null
          agent_id: string | null
          completed_at: string | null
          coverage_map: Json
          created_at: string
          deviations: Json
          duration_ms: number | null
          error_message: string | null
          id: string
          job_id: string
          persona: string
          questions_covered: number
          questions_total: number
          status: string
          transcript: Json
          triggered_by: string
          turns_count: number
        }
        Insert: {
          account_id: string
          adherence_score?: number | null
          agent_id?: string | null
          completed_at?: string | null
          coverage_map?: Json
          created_at?: string
          deviations?: Json
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          job_id: string
          persona?: string
          questions_covered?: number
          questions_total?: number
          status?: string
          transcript?: Json
          triggered_by: string
          turns_count?: number
        }
        Update: {
          account_id?: string
          adherence_score?: number | null
          agent_id?: string | null
          completed_at?: string | null
          coverage_map?: Json
          created_at?: string
          deviations?: Json
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          job_id?: string
          persona?: string
          questions_covered?: number
          questions_total?: number
          status?: string
          transcript?: Json
          triggered_by?: string
          turns_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "voice_interview_simulations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "recruitment_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_message_logs: {
        Row: {
          created_at: string
          direction: string
          error_code: string | null
          error_message: string | null
          id: string
          meta_payload: Json | null
          sent_by: string | null
          status: string
          template_language: string | null
          template_name: string | null
          to_phone: string
          updated_at: string
          wamid: string | null
        }
        Insert: {
          created_at?: string
          direction?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          meta_payload?: Json | null
          sent_by?: string | null
          status?: string
          template_language?: string | null
          template_name?: string | null
          to_phone: string
          updated_at?: string
          wamid?: string | null
        }
        Update: {
          created_at?: string
          direction?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          meta_payload?: Json | null
          sent_by?: string | null
          status?: string
          template_language?: string | null
          template_name?: string | null
          to_phone?: string
          updated_at?: string
          wamid?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      employees_public: {
        Row: {
          account_id: string | null
          avatar_url: string | null
          birth_date: string | null
          department: string | null
          email: string | null
          full_name: string | null
          hire_date: string | null
          id: string | null
          job_title: string | null
          linkedin_url: string | null
          location: string | null
          phone: string | null
        }
        Insert: {
          account_id?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          department?: string | null
          email?: string | null
          full_name?: string | null
          hire_date?: string | null
          id?: string | null
          job_title?: string | null
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
        }
        Update: {
          account_id?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          department?: string | null
          email?: string | null
          full_name?: string | null
          hire_date?: string | null
          id?: string | null
          job_title?: string | null
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles_public: {
        Row: {
          account_id: string | null
          created_at: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_responses_aggregated: {
        Row: {
          account_id: string | null
          avg_score: number | null
          first_date: string | null
          last_date: string | null
          question_id: string | null
          respondent_team_id: string | null
          response_count: number | null
          team_name: string | null
          week_start: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pulse_responses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "pulse_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_responses_respondent_team_id_fkey"
            columns: ["respondent_team_id"]
            isOneToOne: false
            referencedRelation: "pulse_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      v_voice_interview_health_24h: {
        Row: {
          abandoned_reason: string | null
          account_id: string | null
          completed_at: string | null
          coverage_pct: number | null
          events_pipeline_warnings: number | null
          events_response_saved: number | null
          events_transcription_received: number | null
          health_label: string | null
          last_activity_at: string | null
          questions_covered: number | null
          questions_total: number | null
          responses_distinct_timestamps: number | null
          responses_total: number | null
          session_id: string | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          abandoned_reason?: string | null
          account_id?: string | null
          completed_at?: string | null
          coverage_pct?: never
          events_pipeline_warnings?: never
          events_response_saved?: never
          events_transcription_received?: never
          health_label?: never
          last_activity_at?: string | null
          questions_covered?: never
          questions_total?: never
          responses_distinct_timestamps?: never
          responses_total?: never
          session_id?: string | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          abandoned_reason?: string | null
          account_id?: string | null
          completed_at?: string | null
          coverage_pct?: never
          events_pipeline_warnings?: never
          events_response_saved?: never
          events_transcription_received?: never
          health_label?: never
          last_activity_at?: string | null
          questions_covered?: never
          questions_total?: never
          responses_distinct_timestamps?: never
          responses_total?: never
          session_id?: string | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "culture_interview_sessions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_credits: {
        Args: {
          p_account_id: string
          p_amount: number
          p_credit_type: string
          p_description?: string
          p_metadata?: Json
          p_operation?: string
          p_user_id?: string
        }
        Returns: Json
      }
      admin_candidates_by_account: {
        Args: { _limit?: number }
        Returns: {
          account_id: string
          account_name: string
          last_candidate_at: string
          new_30d: number
          total_applications: number
          total_candidates: number
        }[]
      }
      admin_candidates_overview: {
        Args: { _from?: string; _to?: string }
        Returns: Json
      }
      admin_candidates_timeseries: {
        Args: { _days?: number }
        Returns: {
          candidates: number
          day: string
        }[]
      }
      admin_voice_interview_by_account: {
        Args: { p_end: string; p_start: string; p_type: string }
        Returns: {
          account_id: string
          account_name: string
          avg_duration_seconds: number
          completed: number
          last_activity_at: string
          qualified: number
          total: number
        }[]
      }
      admin_voice_interview_daily: {
        Args: { p_end: string; p_start: string; p_type: string }
        Returns: {
          completed: number
          day: string
          total: number
        }[]
      }
      admin_voice_interview_detail: {
        Args: { p_session_id: string; p_type: string }
        Returns: Json
      }
      admin_voice_interview_kpis: {
        Args: { p_end: string; p_start: string; p_type: string }
        Returns: Json
      }
      admin_voice_interview_recent: {
        Args: {
          p_account_id?: string
          p_end: string
          p_limit?: number
          p_start: string
          p_type: string
        }
        Returns: {
          account_id: string
          account_name: string
          candidate_id: string
          candidate_name: string
          created_at: string
          duration_seconds: number
          id: string
          job_id: string
          job_title: string
          recommendation: string
          score: number
          status: string
        }[]
      }
      assign_candidate_role: { Args: { p_user_id: string }; Returns: boolean }
      assign_ep_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: boolean
      }
      audit_overbilled_interviews: {
        Args: { p_dry_run?: boolean; p_since?: string }
        Returns: {
          account_id: string
          action: string
          billed_credits: number
          billed_minutes: number
          fair_credits: number
          log_id: string
          ratio: number
          real_minutes: number
          refund_amount: number
          session_id: string
          session_type: string
          severity: string
        }[]
      }
      calculate_partner_royalties: {
        Args: {
          p_partner_id: string
          p_period_end: string
          p_period_start: string
        }
        Returns: {
          base_amount: number
          grant_id: string
          org_id: string
          org_name: string
          royalty_amount: number
          seat_amount: number
          seats: number
          total_amount: number
        }[]
      }
      can_access_account: {
        Args: { target_account_id: string }
        Returns: boolean
      }
      can_edit_client_project: {
        Args: { _account_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_account: {
        Args: { _account_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_checkpoints: {
        Args: { _account_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_client_licenses: {
        Args: { p_account_id: string; p_user_id: string }
        Returns: boolean
      }
      can_manage_consultants: { Args: { _user_id: string }; Returns: boolean }
      can_view_checkpoints: {
        Args: { _account_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_consultant_notes: {
        Args: { _account_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_subordinate: {
        Args: { p_account_id: string; p_target_id: string; p_viewer_id: string }
        Returns: boolean
      }
      can_view_team_responses: {
        Args: { _account_id: string; _team_id: string; _user_id: string }
        Returns: boolean
      }
      check_and_increment_rate_limit: {
        Args: {
          p_daily_limit?: number
          p_function_name: string
          p_user_id: string
        }
        Returns: boolean
      }
      check_credits:
        | {
            Args: {
              p_account_id: string
              p_credit_type: string
              p_required?: number
            }
            Returns: Json
          }
        | {
            Args: {
              p_account_id: string
              p_credit_type: string
              p_required?: number
            }
            Returns: Json
          }
      check_org_access: { Args: { p_org_id: string }; Returns: boolean }
      check_recommendation_rate_limit: {
        Args: { p_account_id: string; p_hours_limit?: number }
        Returns: boolean
      }
      compute_hunting_completeness: { Args: { d: Json }; Returns: number }
      consume_credits: {
        Args: {
          p_account_id: string
          p_amount: number
          p_credit_type: string
          p_description?: string
          p_reference_id?: string
          p_reference_type?: string
          p_user_id?: string
        }
        Returns: Json
      }
      create_consultant_notification: {
        Args: {
          p_account_id: string
          p_consultant_user_id: string
          p_entity_id?: string
          p_entity_type?: string
          p_message: string
          p_priority?: string
          p_target_url?: string
          p_title: string
          p_type: string
        }
        Returns: string
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      expire_overdue_commercial_proposals: { Args: never; Returns: number }
      extract_candidate_skills: {
        Args: { p_candidate_id: string }
        Returns: string[]
      }
      generate_client_career_slug: {
        Args: { _client_name: string }
        Returns: string
      }
      generate_intake_slug: { Args: { p_account_id: string }; Returns: string }
      generate_license_snapshot: { Args: never; Returns: undefined }
      generate_outreach_reply_token: { Args: never; Returns: string }
      get_account_anonymity_threshold: {
        Args: { _account_id: string }
        Returns: number
      }
      get_account_role: {
        Args: { _account_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["account_role"]
      }
      get_all_companies_progress: {
        Args: never
        Returns: {
          company_created_at: string
          company_id: string
          company_name: string
          company_slug: string
          decision_stage: number
          development_stage: number
          energy_stage: number
          event_stage: number
          indicators_stage: number
          last_activity: string
          member_count: number
          mission_stage: number
          ritual_stage: number
          values_stage: number
          vision_stage: number
        }[]
      }
      get_all_subordinates: {
        Args: { p_account_id: string; p_manager_id: string }
        Returns: string[]
      }
      get_auth_email: { Args: never; Returns: string }
      get_company_decision_detail: {
        Args: { _company_id: string }
        Returns: Json
      }
      get_company_details: { Args: { _company_id: string }; Returns: Json }
      get_company_development_detail: {
        Args: { _company_id: string }
        Returns: Json
      }
      get_company_energy_detail: {
        Args: { _company_id: string }
        Returns: Json
      }
      get_company_event_detail: { Args: { _company_id: string }; Returns: Json }
      get_company_indicators_detail: {
        Args: { _company_id: string }
        Returns: Json
      }
      get_company_projects_detail: {
        Args: { _company_id: string }
        Returns: Json
      }
      get_company_ritual_detail: {
        Args: { _company_id: string }
        Returns: Json
      }
      get_company_values_detail: {
        Args: { _company_id: string }
        Returns: Json
      }
      get_default_permissions_for_role: {
        Args: { p_role: Database["public"]["Enums"]["account_role"] }
        Returns: {
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          module_slug: string
        }[]
      }
      get_disc_full_results: {
        Args: { p_session_ids: string[] }
        Returns: {
          c_normalized: number
          c_score: number
          d_normalized: number
          d_score: number
          i_normalized: number
          i_score: number
          intensity: string
          is_balanced: boolean
          match_score: number
          primary_profile: string
          s_normalized: number
          s_score: number
          secondary_profile: string
          session_id: string
        }[]
      }
      get_disc_match_scores: {
        Args: { p_session_ids: string[] }
        Returns: {
          match_score: number
          session_id: string
        }[]
      }
      get_ep_partner_user_role: {
        Args: { _partner_id: string; _user_id: string }
        Returns: string
      }
      get_leader_team_ids: {
        Args: { _account_id: string; _user_id: string }
        Returns: string[]
      }
      get_module_access_level: {
        Args: { p_account_id: string; p_module_slug: string }
        Returns: string
      }
      get_nps_context: { Args: { p_token: string }; Returns: Json }
      get_org_billing_status: { Args: { p_org_id: string }; Returns: Json }
      get_partner_used_seats: {
        Args: { p_partner_id: string }
        Returns: number
      }
      get_portal_activity_by_token: {
        Args: { p_limit?: number; p_token: string }
        Returns: {
          cliente_id: string
          created_at: string
          event_data: Json
          event_type: string
          id: string
          job_id: string
          seen_by_client: boolean
        }[]
      }
      get_portal_funnel_counts: {
        Args: { p_job_id: string; p_token: string }
        Returns: Json
      }
      get_public_job: { Args: { p_job_id: string }; Returns: Json }
      get_pulse_user_role: {
        Args: { _account_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["pulse_user_role"]
      }
      get_remaining_calls: {
        Args: {
          p_daily_limit?: number
          p_function_name: string
          p_user_id: string
        }
        Returns: number
      }
      get_roi_report_by_token: {
        Args: { _public_token: string }
        Returns: {
          account_id: string
          client_id: string
          generated_at: string
          generated_by: string
          id: string
          job_id: string
          last_viewed_at: string
          public_token: string
          report_data: Json
          updated_at: string
          views: number
        }[]
      }
      get_team_size: { Args: { _team_id: string }; Returns: number }
      get_user_account_id: { Args: { _user_id: string }; Returns: string }
      get_user_partner_id: { Args: { _user_id: string }; Returns: string }
      get_user_permissions_matrix: {
        Args: { p_user_id: string }
        Returns: {
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          is_custom: boolean
          module_category: string
          module_name: string
          module_slug: string
        }[]
      }
      has_partner_access: { Args: { p_user_id: string }; Returns: boolean }
      has_permission: {
        Args: { p_action?: string; p_module_slug: string; p_user_id: string }
        Returns: boolean
      }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      has_valid_grant: {
        Args: { p_org_id?: string; p_user_id?: string }
        Returns: boolean
      }
      increment_career_page_applications: {
        Args: { _page_id: string }
        Returns: undefined
      }
      increment_career_page_views: {
        Args: { _slug: string }
        Returns: undefined
      }
      increment_roi_report_view: {
        Args: { _public_token: string }
        Returns: undefined
      }
      increment_share_view_count: {
        Args: { share_token: string }
        Returns: undefined
      }
      increment_unlock_count: {
        Args: { pool_entry_id: string }
        Returns: undefined
      }
      initialize_org_credits: {
        Args: { p_account_id: string }
        Returns: undefined
      }
      is_account_admin_or_owner: {
        Args: { _account_id: string; _user_id: string }
        Returns: boolean
      }
      is_account_in_demo: { Args: { _account_id: string }; Returns: boolean }
      is_account_member: {
        Args: { _account_id: string; _user_id: string }
        Returns: boolean
      }
      is_candidate: { Args: { p_user_id: string }; Returns: boolean }
      is_candidate_user_for_company: {
        Args: { profile_user_id: string }
        Returns: boolean
      }
      is_company_member_for_candidate: {
        Args: { candidate_profile_id: string }
        Returns: boolean
      }
      is_consultant_for_account: {
        Args: { _account_id: string; _user_id: string }
        Returns: boolean
      }
      is_ep_consultant: { Args: { _user_id: string }; Returns: boolean }
      is_ep_partner_user: {
        Args: { _partner_id: string; _user_id: string }
        Returns: boolean
      }
      is_head_cs: { Args: { _user_id: string }; Returns: boolean }
      is_pulse_admin: {
        Args: { _account_id: string; _user_id: string }
        Returns: boolean
      }
      is_pulse_admin_or_leader: {
        Args: { _account_id: string; _user_id: string }
        Returns: boolean
      }
      is_pulse_leader: {
        Args: { _account_id: string; _user_id: string }
        Returns: boolean
      }
      is_pulse_team_member: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      is_satisfaction_admin: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      log_consultant_access: {
        Args: {
          p_account_id: string
          p_action: string
          p_metadata?: Json
          p_resource_id?: string
          p_resource_type: string
        }
        Returns: string
      }
      mark_commercial_proposal_response: {
        Args: { _action: string; _reason?: string; _token: string }
        Returns: Json
      }
      mark_portal_events_seen: {
        Args: { p_event_ids: string[]; p_token: string }
        Returns: number
      }
      match_candidates_for_job: {
        Args: {
          match_count?: number
          match_threshold?: number
          p_account_id: string
          p_job_id: string
        }
        Returns: {
          candidate_id: string
          similarity: number
        }[]
      }
      match_jobs_for_candidate: {
        Args: {
          match_count?: number
          match_threshold?: number
          p_account_id: string
          p_candidate_id: string
        }
        Returns: {
          job_id: string
          similarity: number
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      process_one_on_one_recurrences: { Args: never; Returns: undefined }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      redeem_partner_promo_code: {
        Args: { p_org_id?: string; p_promo_code: string; p_user_id: string }
        Returns: Json
      }
      refund_credits: {
        Args: {
          p_account_id: string
          p_amount: number
          p_credit_type: string
          p_description: string
          p_metadata?: Json
          p_reference_id: string
          p_reference_type: string
        }
        Returns: Json
      }
      remove_ep_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: boolean
      }
      search_similar_candidates: {
        Args: {
          match_count?: number
          match_threshold?: number
          p_account_id: string
          query_embedding: string
        }
        Returns: {
          candidate_id: string
          similarity: number
          source_type: string
        }[]
      }
      search_similar_jobs: {
        Args: {
          match_count?: number
          match_threshold?: number
          p_account_id: string
          query_embedding: string
        }
        Returns: {
          job_id: string
          similarity: number
          source_type: string
        }[]
      }
      submit_nps_response: {
        Args: { p_feedback?: string; p_score: number; p_token: string }
        Returns: Json
      }
      unaccent: { Args: { "": string }; Returns: string }
      update_member_last_access: {
        Args: { p_account_id: string; p_user_id: string }
        Returns: undefined
      }
      user_has_account_access: {
        Args: { p_account_id: string }
        Returns: boolean
      }
      user_has_role_in_account: {
        Args: { p_account_id: string; p_roles: string[] }
        Returns: boolean
      }
    }
    Enums: {
      account_role:
        | "owner"
        | "admin"
        | "admin_rh"
        | "leader"
        | "member"
        | "viewer"
      app_role:
        | "super_admin"
        | "admin"
        | "user"
        | "head_cs"
        | "ep_consultant"
        | "candidate"
        | "ep_partner"
      availability_block_type:
        | "vacation"
        | "holiday"
        | "training"
        | "sick"
        | "offsite"
        | "other"
      commercial_proposal_status:
        | "draft"
        | "sent"
        | "viewed"
        | "accepted"
        | "rejected"
        | "expired"
      meeting_item_type: "topic" | "action" | "feedback" | "blocker"
      meeting_one_on_one_status:
        | "draft"
        | "scheduled"
        | "completed"
        | "cancelled"
      meeting_recurrence_frequency: "weekly" | "biweekly" | "monthly"
      onboarding_alert_severity: "low" | "medium" | "high" | "critical"
      onboarding_alert_type:
        | "task_delayed"
        | "checkpoint_at_risk"
        | "low_evaluation_score"
        | "missing_leader_feedback"
        | "onboarding_not_closed"
        | "checkpoint_pending"
      onboarding_checkpoint_status:
        | "pending"
        | "completed"
        | "at_risk"
        | "attention"
      onboarding_phase_status: "pending" | "in_progress" | "completed"
      onboarding_recommendation:
        | "efetivado"
        | "estender_onboarding"
        | "desligamento"
        | "aprovado"
        | "aprovado_ressalvas"
        | "replanejar"
        | "nao_aprovado"
      onboarding_respondent_type: "employee" | "leader"
      onboarding_responsible_type: "rh" | "leader" | "employee" | "ti" | "buddy"
      onboarding_status: "draft" | "active" | "completed" | "cancelled"
      onboarding_task_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "skipped"
      pulse_user_role: "admin_rh" | "leader" | "employee"
      recommendation_category:
        | "health_improvement"
        | "next_action"
        | "risk_mitigation"
        | "quick_win"
        | "best_practice"
      recommendation_feedback_type:
        | "helpful"
        | "not_helpful"
        | "implemented"
        | "incorrect"
      recommendation_priority: "high" | "medium" | "low"
      recommendation_status: "pending" | "accepted" | "dismissed" | "completed"
      retention_status: "active" | "voluntary_exit" | "involuntary_exit"
      review_period: "30_days" | "90_days" | "6_months" | "12_months"
      values_phase: "phase_1" | "phase_2" | "phase_3"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_role: [
        "owner",
        "admin",
        "admin_rh",
        "leader",
        "member",
        "viewer",
      ],
      app_role: [
        "super_admin",
        "admin",
        "user",
        "head_cs",
        "ep_consultant",
        "candidate",
        "ep_partner",
      ],
      availability_block_type: [
        "vacation",
        "holiday",
        "training",
        "sick",
        "offsite",
        "other",
      ],
      commercial_proposal_status: [
        "draft",
        "sent",
        "viewed",
        "accepted",
        "rejected",
        "expired",
      ],
      meeting_item_type: ["topic", "action", "feedback", "blocker"],
      meeting_one_on_one_status: [
        "draft",
        "scheduled",
        "completed",
        "cancelled",
      ],
      meeting_recurrence_frequency: ["weekly", "biweekly", "monthly"],
      onboarding_alert_severity: ["low", "medium", "high", "critical"],
      onboarding_alert_type: [
        "task_delayed",
        "checkpoint_at_risk",
        "low_evaluation_score",
        "missing_leader_feedback",
        "onboarding_not_closed",
        "checkpoint_pending",
      ],
      onboarding_checkpoint_status: [
        "pending",
        "completed",
        "at_risk",
        "attention",
      ],
      onboarding_phase_status: ["pending", "in_progress", "completed"],
      onboarding_recommendation: [
        "efetivado",
        "estender_onboarding",
        "desligamento",
        "aprovado",
        "aprovado_ressalvas",
        "replanejar",
        "nao_aprovado",
      ],
      onboarding_respondent_type: ["employee", "leader"],
      onboarding_responsible_type: ["rh", "leader", "employee", "ti", "buddy"],
      onboarding_status: ["draft", "active", "completed", "cancelled"],
      onboarding_task_status: [
        "pending",
        "in_progress",
        "completed",
        "skipped",
      ],
      pulse_user_role: ["admin_rh", "leader", "employee"],
      recommendation_category: [
        "health_improvement",
        "next_action",
        "risk_mitigation",
        "quick_win",
        "best_practice",
      ],
      recommendation_feedback_type: [
        "helpful",
        "not_helpful",
        "implemented",
        "incorrect",
      ],
      recommendation_priority: ["high", "medium", "low"],
      recommendation_status: ["pending", "accepted", "dismissed", "completed"],
      retention_status: ["active", "voluntary_exit", "involuntary_exit"],
      review_period: ["30_days", "90_days", "6_months", "12_months"],
      values_phase: ["phase_1", "phase_2", "phase_3"],
    },
  },
} as const
