import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseAdmin = createClient(
  Deno.env.get('VITE_SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_KEY')
);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const sql = `
      CREATE TABLE IF NOT EXISTS crm_funis (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_id uuid,
        nome text NOT NULL,
        created_at timestamp DEFAULT now(),
        updated_at timestamp,
        deleted_at timestamp
      );
      CREATE INDEX IF NOT EXISTS idx_crm_funis_deleted_at ON crm_funis (deleted_at);

      CREATE TABLE IF NOT EXISTS crm_etapas (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_id uuid,
        funil_id uuid,
        nome text NOT NULL,
        ordem int NOT NULL,
        percentual int DEFAULT 0,
        created_at timestamp DEFAULT now(),
        updated_at timestamp,
        deleted_at timestamp
      );
      CREATE INDEX IF NOT EXISTS idx_crm_etapas_deleted_at ON crm_etapas (deleted_at);

      CREATE TABLE IF NOT EXISTS crm_oportunidades (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_id uuid,
        titulo text NOT NULL,
        cliente_nome text,
        cliente_id uuid,
        valor numeric,
        etapa_id uuid,
        funil_id uuid,
        responsavel_id text,
        responsavel_nome text,
        status text DEFAULT 'aberto',
        motivo_perda_id uuid,
        motivo_perda_nome text,
        motivo_ganho_id uuid,
        motivo_ganho_nome text,
        orcamento_id uuid,
        observacoes text,
        created_at timestamp DEFAULT now(),
        updated_at timestamp,
        deleted_at timestamp
      );
      CREATE INDEX IF NOT EXISTS idx_crm_oportunidades_deleted_at ON crm_oportunidades (deleted_at);
      CREATE INDEX IF NOT EXISTS idx_crm_oportunidades_responsavel ON crm_oportunidades (responsavel_id);

      CREATE TABLE IF NOT EXISTS crm_oportunidade_historico (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_id uuid,
        oportunidade_id uuid,
        acao text,
        descricao text,
        usuario_id text,
        usuario_nome text,
        created_at timestamp DEFAULT now(),
        deleted_at timestamp
      );
      CREATE INDEX IF NOT EXISTS idx_crm_hist_deleted_at ON crm_oportunidade_historico (deleted_at);

      CREATE TABLE IF NOT EXISTS crm_tarefas (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_id uuid,
        oportunidade_id uuid,
        titulo text,
        tipo text,
        data_execucao timestamp,
        status text DEFAULT 'pendente',
        responsavel_id text,
        responsavel_nome text,
        created_at timestamp DEFAULT now(),
        updated_at timestamp,
        deleted_at timestamp
      );
      CREATE INDEX IF NOT EXISTS idx_crm_tarefas_deleted_at ON crm_tarefas (deleted_at);

      CREATE TABLE IF NOT EXISTS crm_motivos_perda (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_id uuid,
        nome text NOT NULL,
        created_at timestamp DEFAULT now(),
        deleted_at timestamp
      );
      CREATE INDEX IF NOT EXISTS idx_crm_motivos_perda_deleted_at ON crm_motivos_perda (deleted_at);

      CREATE TABLE IF NOT EXISTS crm_motivos_ganho (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_id uuid,
        nome text NOT NULL,
        created_at timestamp DEFAULT now(),
        deleted_at timestamp
      );
      CREATE INDEX IF NOT EXISTS idx_crm_motivos_ganho_deleted_at ON crm_motivos_ganho (deleted_at);

      GRANT SELECT, INSERT, UPDATE ON crm_funis TO anon, authenticated, service_role;
      GRANT SELECT, INSERT, UPDATE ON crm_etapas TO anon, authenticated, service_role;
      GRANT SELECT, INSERT, UPDATE ON crm_oportunidades TO anon, authenticated, service_role;
      GRANT SELECT, INSERT, UPDATE ON crm_oportunidade_historico TO anon, authenticated, service_role;
      GRANT SELECT, INSERT, UPDATE ON crm_tarefas TO anon, authenticated, service_role;
      GRANT SELECT, INSERT, UPDATE ON crm_motivos_perda TO anon, authenticated, service_role;
      GRANT SELECT, INSERT, UPDATE ON crm_motivos_ganho TO anon, authenticated, service_role;
    `;

    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    const results = [];
    for (const stmt of statements) {
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql: stmt }).maybeSingle();
      if (error && !error.message?.includes('already exists')) {
        // Try direct query
        const { error: e2 } = await supabaseAdmin.from('_dummy_').select('1').limit(0);
        results.push({ stmt: stmt.substring(0, 50), note: error.message });
      } else {
        results.push({ stmt: stmt.substring(0, 50), ok: true });
      }
    }

    // Seed default data
    const empresaId = Deno.env.get('VITE_EMPRESA_ID');

    const { data: funilExist } = await supabaseAdmin
      .from('crm_funis')
      .select('id')
      .eq('empresa_id', empresaId)
      .is('deleted_at', null)
      .limit(1);

    if (!funilExist || funilExist.length === 0) {
      const { data: funil } = await supabaseAdmin
        .from('crm_funis')
        .insert({ empresa_id: empresaId, nome: 'Funil Principal' })
        .select('id')
        .single();

      if (funil) {
        const etapas = [
          { nome: 'Prospecção', ordem: 1, percentual: 10 },
          { nome: 'Qualificação', ordem: 2, percentual: 25 },
          { nome: 'Proposta', ordem: 3, percentual: 50 },
          { nome: 'Negociação', ordem: 4, percentual: 75 },
          { nome: 'Fechamento', ordem: 5, percentual: 90 },
        ];
        await supabaseAdmin.from('crm_etapas').insert(
          etapas.map(e => ({ ...e, empresa_id: empresaId, funil_id: funil.id }))
        );
      }

      // Seed motivos de perda
      await supabaseAdmin.from('crm_motivos_perda').insert([
        { empresa_id: empresaId, nome: 'Preço alto' },
        { empresa_id: empresaId, nome: 'Concorrência' },
        { empresa_id: empresaId, nome: 'Sem necessidade' },
        { empresa_id: empresaId, nome: 'Sem orçamento' },
        { empresa_id: empresaId, nome: 'Não respondeu' },
      ]);

      await supabaseAdmin.from('crm_motivos_ganho').insert([
        { empresa_id: empresaId, nome: 'Melhor preço' },
        { empresa_id: empresaId, nome: 'Qualidade do produto' },
        { empresa_id: empresaId, nome: 'Relacionamento' },
        { empresa_id: empresaId, nome: 'Prazo de entrega' },
      ]);
    }

    return Response.json({ success: true, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});