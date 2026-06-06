-- Recupere sessões DISC que estão presas no status 'in_progress' mesmo tendo as 32 respostas.
DO $$
DECLARE
    rec RECORD;
    v_raw_d INT; v_raw_i INT; v_raw_s INT; v_raw_c INT;
    v_norm_d NUMERIC; v_norm_i NUMERIC; v_norm_s NUMERIC; v_norm_c NUMERIC;
    v_primary CHAR(1); v_secondary CHAR(1);
    v_intensity TEXT; v_is_balanced BOOLEAN;
    v_max_norm NUMERIC; v_min_norm NUMERIC;
    v_third_norm NUMERIC; v_second_norm NUMERIC;
BEGIN
    -- Iterar sobre sessões in_progress com 32 respostas e sem resultados
    FOR rec IN 
        SELECT s.id 
        FROM public.disc_sessions s
        JOIN (
            SELECT session_id, count(*) as count 
            FROM public.disc_responses 
            GROUP BY session_id 
            HAVING count(*) = 32
        ) r ON r.session_id = s.id
        LEFT JOIN public.disc_results res ON res.session_id = s.id
        WHERE s.status = 'in_progress' AND res.id IS NULL
    LOOP
        -- 1. Calcular Scores Brutos (considerando inversão)
        SELECT 
            SUM(CASE WHEN q.dimension = 'D' THEN (CASE WHEN q.is_reverse_scored THEN 6 - r.score ELSE r.score END) ELSE 0 END),
            SUM(CASE WHEN q.dimension = 'I' THEN (CASE WHEN q.is_reverse_scored THEN 6 - r.score ELSE r.score END) ELSE 0 END),
            SUM(CASE WHEN q.dimension = 'S' THEN (CASE WHEN q.is_reverse_scored THEN 6 - r.score ELSE r.score END) ELSE 0 END),
            SUM(CASE WHEN q.dimension = 'C' THEN (CASE WHEN q.is_reverse_scored THEN 6 - r.score ELSE r.score END) ELSE 0 END)
        INTO v_raw_d, v_raw_i, v_raw_s, v_raw_c
        FROM public.disc_responses r
        JOIN public.disc_questions q ON q.id = r.question_id
        WHERE r.session_id = rec.id;

        -- 2. Normalizar ( (raw - 8) / 32 * 100 )
        v_norm_d := ROUND(((v_raw_d - 8)::NUMERIC / 32.0) * 100.0, 2);
        v_norm_i := ROUND(((v_raw_i - 8)::NUMERIC / 32.0) * 100.0, 2);
        v_norm_s := ROUND(((v_raw_s - 8)::NUMERIC / 32.0) * 100.0, 2);
        v_norm_c := ROUND(((v_raw_c - 8)::NUMERIC / 32.0) * 100.0, 2);

        -- 3. Identificar Perfil Primário
        v_max_norm := GREATEST(v_norm_d, v_norm_i, v_norm_s, v_norm_c);
        v_primary := CASE 
            WHEN v_norm_d = v_max_norm THEN 'D'
            WHEN v_norm_i = v_max_norm THEN 'I'
            WHEN v_norm_s = v_max_norm THEN 'S'
            ELSE 'C'
        END;

        -- 4. Identificar Perfil Secundário (diff >= 5 entre 2º e 3º maiores)
        SELECT s, d INTO v_second_norm, v_secondary FROM (
            SELECT s, d, row_number() OVER (ORDER BY s DESC) as rn FROM (
                SELECT v_norm_d as s, 'D'::CHAR(1) as d UNION ALL
                SELECT v_norm_i, 'I' UNION ALL
                SELECT v_norm_s, 'S' UNION ALL
                SELECT v_norm_c, 'C'
            ) t1
        ) t2 WHERE rn = 2;
        
        SELECT s INTO v_third_norm FROM (
            SELECT s, row_number() OVER (ORDER BY s DESC) as rn FROM (
                SELECT v_norm_d as s UNION ALL
                SELECT v_norm_i UNION ALL
                SELECT v_norm_s UNION ALL
                SELECT v_norm_c
            ) t3
        ) t4 WHERE rn = 3;

        IF (v_second_norm - v_third_norm < 5) THEN
            v_secondary := NULL;
        END IF;

        -- 5. Intensidade e Equilíbrio
        v_intensity := CASE 
            WHEN v_max_norm <= 40 THEN 'baixa'
            WHEN v_max_norm <= 70 THEN 'média'
            ELSE 'alta'
        END;

        v_min_norm := LEAST(v_norm_d, v_norm_i, v_norm_s, v_norm_c);
        v_is_balanced := (v_max_norm - v_min_norm <= 10);

        -- 6. Inserir Resultado
        INSERT INTO public.disc_results (
            session_id, d_score, i_score, s_score, c_score,
            d_normalized, i_normalized, s_normalized, c_normalized,
            primary_profile, secondary_profile, intensity, is_balanced
        ) VALUES (
            rec.id, v_raw_d, v_raw_i, v_raw_s, v_raw_c,
            v_norm_d, v_norm_i, v_norm_s, v_norm_c,
            v_primary, v_secondary, v_intensity, v_is_balanced
        );

        -- 7. Finalizar Sessão
        UPDATE public.disc_sessions 
        SET status = 'completed', completed_at = now() 
        WHERE id = rec.id;
        
    END LOOP;
END $$;