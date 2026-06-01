ALTER TABLE ritual_sessions ADD COLUMN work_model TEXT;

ALTER TABLE ritual_suggestions_catalog ADD COLUMN work_model_tags TEXT[];

-- Tag existing pillar 1 (Artefatos) suggestions as presencial since they are physical artifacts
UPDATE ritual_suggestions_catalog SET work_model_tags = ARRAY['presencial', 'hibrido'] WHERE pillar_number = 1 AND work_model_tags IS NULL;

-- Insert new remote/hybrid artifact suggestions
INSERT INTO ritual_suggestions_catalog (pillar_number, suggestion_text, active, duration, complexity, format, work_model_tags) VALUES
(1, 'Emojis personalizados dos valores da empresa no Slack/Discord', true, 'rapido', 'facil', 'assincrono', ARRAY['remoto', 'hibrido']),
(1, 'Canal #cultura com posts semanais sobre valores e conquistas', true, 'rapido', 'facil', 'assincrono', ARRAY['remoto', 'hibrido']),
(1, 'Bot de reconhecimento cultural no Slack/Discord para celebrar comportamentos alinhados', true, 'medio', 'complexo', 'assincrono', ARRAY['remoto', 'hibrido']),
(1, 'Wallpaper virtual com missão/visão para videochamadas', true, 'rapido', 'facil', 'assincrono', ARRAY['remoto', 'hibrido']),
(1, 'Playlist colaborativa no Spotify que reflita a cultura da empresa', true, 'rapido', 'facil', 'assincrono', ARRAY['remoto', 'hibrido']),
(1, 'Newsletter digital semanal de cultura com destaques e reconhecimentos', true, 'medio', 'facil', 'assincrono', ARRAY['remoto', 'hibrido']),
(1, 'Stickers e GIFs personalizados dos valores para uso em chats', true, 'rapido', 'facil', 'assincrono', ARRAY['remoto', 'hibrido']),
(1, 'Onboarding kit digital com materiais da cultura (vídeos, PDFs, quizzes)', true, 'medio', 'complexo', 'assincrono', ARRAY['remoto', 'hibrido']),
(1, 'Canal #wins para celebrar conquistas culturais e reconhecer colegas', true, 'rapido', 'facil', 'assincrono', ARRAY['remoto', 'hibrido']),
(1, 'Template de assinatura de e-mail com valor do mês em destaque', true, 'rapido', 'facil', 'assincrono', ARRAY['remoto', 'hibrido']);