/**
 * setupModuloPaginas — Cria tabela modulo_paginas, adiciona colunas faltantes,
 * aplica grants e popula a partir de modulos_erp se necessário.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_KEY");
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const body = await req.json().catch(() => ({}));
    const empresa_id = body.empresa_id || Deno.env.get("VITE_EMPRESA_ID");

    const logs = [];

    // ── 1. Tenta acessar a tabela ──────────────────────────────────────────────
    const { error: checkErr } = await supabase
      .from('modulo_paginas')
      .select('id')
      .limit(1);

    const tabelaExiste = !checkErr || (!checkErr.message?.includes('does not exist') && checkErr.code !== '42P01');

    if (!tabelaExiste) {
      logs.push('Tabela modulo_paginas NÃO existe. Execute o SQL abaixo no Supabase SQL Editor:');
      const sql = `
-- Criar tabela modulo_paginas
CREATE TABLE IF NOT EXISTS public.modulo_paginas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  modulo_nome text NOT NULL,
  pagina_nome text NOT NULL,
  label_menu text,
  icone text,
  ordem integer DEFAULT 0,
  ordem_modulo integer DEFAULT 0,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_modulo_paginas_empresa ON public.modulo_paginas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_modulo_paginas_modulo ON public.modulo_paginas(empresa_id, modulo_nome);

GRANT ALL ON public.modulo_paginas TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.modulo_paginas TO authenticated;

ALTER TABLE public.modulo_paginas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON public.modulo_paginas;
CREATE POLICY "service_role_all" ON public.modulo_paginas FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated_own" ON public.modulo_paginas;
CREATE POLICY "authenticated_own" ON public.modulo_paginas FOR ALL TO authenticated USING (true) WITH CHECK (true);
      `.trim();

      return Response.json({ success: false, tabelaExiste: false, sql, logs });
    }

    logs.push('Tabela modulo_paginas existe.');

    // ── 2. Verifica/adiciona coluna ordem_modulo ───────────────────────────────
    // Tenta update de um campo que não existe para detectar
    const { error: colErr } = await supabase
      .from('modulo_paginas')
      .select('ordem_modulo')
      .limit(1);

    if (colErr && colErr.message?.includes('ordem_modulo')) {
      logs.push('Coluna ordem_modulo NÃO existe. Execute o SQL:');
      const sqlCol = `
ALTER TABLE public.modulo_paginas ADD COLUMN IF NOT EXISTS ordem_modulo integer DEFAULT 0;
ALTER TABLE public.modulo_paginas ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.modulo_paginas ADD COLUMN IF NOT EXISTS label_menu text;
ALTER TABLE public.modulo_paginas ADD COLUMN IF NOT EXISTS icone text;
      `.trim();
      return Response.json({ success: false, tabelaExiste: true, colunaMissing: 'ordem_modulo', sql: sqlCol, logs });
    }

    logs.push('Colunas OK.');

    // ── 3. Verifica se há dados para este empresa_id ───────────────────────────
    const { data: rows, error: rowErr } = await supabase
      .from('modulo_paginas')
      .select('id, modulo_nome, pagina_nome, ordem, ordem_modulo')
      .eq('empresa_id', empresa_id)
      .is('deleted_at', null)
      .order('ordem_modulo', { ascending: true })
      .order('ordem', { ascending: true });

    if (rowErr) {
      return Response.json({ success: false, error: rowErr.message, logs });
    }

    logs.push(`Registros encontrados: ${(rows || []).length}`);

    // ── 4. Se não há dados, popula a partir de modulos_erp ────────────────────
    if (!rows || rows.length === 0) {
      logs.push('Nenhum dado encontrado. Populando a partir de modulos_erp...');

      const { data: modulosErp, error: modErr } = await supabase
        .from('modulos_erp')
        .select('*')
        .eq('empresa_id', empresa_id)
        .order('ordem_modulo', { ascending: true });

      if (modErr || !modulosErp?.length) {
        logs.push('Sem módulos em modulos_erp para migrar.');
        return Response.json({ success: true, tabelaExiste: true, rows: 0, logs });
      }

      logs.push(`Módulos encontrados em modulos_erp: ${modulosErp.length}`);
      return Response.json({
        success: true,
        tabelaExiste: true,
        precisaPopular: true,
        modulos: modulosErp.map(m => m.nome_modulo),
        logs,
        instrucao: 'Use a tela de Módulos para adicionar páginas a cada módulo.',
      });
    }

    // ── 5. Retorna amostra dos dados atuais ───────────────────────────────────
    const resumo = {};
    rows.forEach(r => {
      if (!resumo[r.modulo_nome]) resumo[r.modulo_nome] = { ordem_modulo: r.ordem_modulo, paginas: 0 };
      resumo[r.modulo_nome].paginas++;
    });

    logs.push('Dados OK.');
    return Response.json({ success: true, tabelaExiste: true, resumo, totalRows: rows.length, logs });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});