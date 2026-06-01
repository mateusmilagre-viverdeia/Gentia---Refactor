# Componentes arquivados — NÃO IMPORTAR

Estes componentes foram **substituídos** pelo fluxo unificado de entrevistas
em `/interview/:token` (cultural) e `/interview/technical/:token` (técnica),
que é a mesma página usada por:

- Link enviado por WhatsApp/Email para o candidato
- Modo simulação (botões "Simular entrevista" no painel de R&S)
- Candidatura pública via `/candidato/aplicar/:jobId` (agora redireciona aqui)

## Por que estão arquivados (e não deletados)

Eles contêm a versão antiga, monolítica (~1700 linhas cada), com voz feminina,
sem semantic_vad, sem watchdog, sem preflight, sem banner de integridade e com
copies desatualizados. Mantemos apenas para histórico de código e referência
futura — **não devem ser importados em produção nem em simulação**.

Arquivado em: 2026-05-22
Substituído por:
- `src/pages/public/CandidateInterviewPage.tsx`
- `src/pages/public/TechnicalInterviewPage.tsx`
- `src/components/culture-interview/public/*`
- `src/components/technical-interview/public/*`
