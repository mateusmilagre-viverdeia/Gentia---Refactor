-- ============================================================================
-- FIX DE SEGURANÇA 🟡 — policies das 9 tabelas em drift (estavam SEM policy)
-- ----------------------------------------------------------------------------
-- Essas tabelas foram reconstruídas na migração (drift do Lovable) com RLS
-- habilitado mas SEM nenhuma policy → ficavam acessíveis só via service_role
-- (seguras, porém o acesso legítimo do app/partners ficava bloqueado).
-- Criamos policies de LEITURA restritivas. Escrita continua via service_role
-- (edge functions), que ignora RLS. (Auditoria: docs/SECURITY_AUDIT.md §4.2)
--
-- Módulo franquias (EP Partners): cada partner enxerga apenas os próprios dados
-- (via ep_partners.user_id = auth.uid(), ou partner_id ligado a ele); super_admin
-- enxerga tudo. Tabelas de plataforma: catálogos de pricing legíveis por
-- autenticados; logs de WhatsApp só super_admin.
-- ============================================================================

-- Franquias / partners --------------------------------------------------------
create policy "ep_partners_select" on public.ep_partners for select to authenticated
  using (user_id = auth.uid() or public.is_super_admin(auth.uid()));

create policy "partner_client_grants_select" on public.partner_client_grants for select to authenticated
  using (public.is_super_admin(auth.uid()) or user_id = auth.uid()
         or partner_id in (select id from public.ep_partners where user_id = auth.uid()));

create policy "partner_licenses_select" on public.partner_licenses for select to authenticated
  using (public.is_super_admin(auth.uid())
         or partner_id in (select id from public.ep_partners where user_id = auth.uid()));

create policy "partner_royalties_select" on public.partner_royalties for select to authenticated
  using (public.is_super_admin(auth.uid())
         or partner_id in (select id from public.ep_partners where user_id = auth.uid()));

create policy "promo_code_redemptions_select" on public.promo_code_redemptions for select to authenticated
  using (public.is_super_admin(auth.uid()) or user_id = auth.uid()
         or partner_id in (select id from public.ep_partners where user_id = auth.uid()));

-- Plataforma: catálogos de pricing (não sensíveis — preços/planos públicos) ----
create policy "platform_subscription_plans_select" on public.platform_subscription_plans
  for select to authenticated using (true);

create policy "platform_seat_pricing_select" on public.platform_seat_pricing
  for select to authenticated using (true);

create policy "recruitment_package_features_select" on public.recruitment_package_features
  for select to authenticated using (true);

-- Logs internos: só super_admin ----------------------------------------------
create policy "whatsapp_message_logs_select" on public.whatsapp_message_logs for select to authenticated
  using (public.is_super_admin(auth.uid()));
