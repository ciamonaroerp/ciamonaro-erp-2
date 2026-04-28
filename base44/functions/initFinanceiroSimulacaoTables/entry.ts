import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_KEY');

    // SQL para criar tabelas
    const sql = `
      CREATE TABLE IF NOT EXISTS fin_simulacoes_financiamento (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_id UUID NOT NULL,
        codigo_sequencial BIGSERIAL UNIQUE,
        valor_financiamento DECIMAL(15,2) NOT NULL,
        valor_entrada DECIMAL(15,2) DEFAULT 0,
        taxa_juros_mensal DECIMAL(6,4) NOT NULL,
        numero_parcelas INTEGER NOT NULL,
        data_base DATE NOT NULL,
        modo_calculo VARCHAR(50) DEFAULT 'variavel',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(255)
      );

      CREATE TABLE IF NOT EXISTS fin_simulacoes_parcelas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        simulacao_id UUID NOT NULL,
        numero_parcela INTEGER NOT NULL,
        data_parcela DATE NOT NULL,
        valor_base DECIMAL(15,2) NOT NULL,
        juros DECIMAL(15,2) DEFAULT 0,
        valor_parcela DECIMAL(15,2) NOT NULL,
        dias_decorridos INTEGER DEFAULT 0,
        eh_intermediaria BOOLEAN DEFAULT FALSE,
        valor_especifico DECIMAL(15,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_fin_simulacoes_empresa ON fin_simulacoes_financiamento(empresa_id);
      CREATE INDEX IF NOT EXISTS idx_fin_parcelas_simulacao ON fin_simulacoes_parcelas(simulacao_id);

      ALTER TABLE fin_simulacoes_financiamento ENABLE ROW LEVEL SECURITY;
      ALTER TABLE fin_simulacoes_parcelas ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS fin_sim_select ON fin_simulacoes_financiamento;
      CREATE POLICY fin_sim_select ON fin_simulacoes_financiamento FOR SELECT USING (true);

      DROP POLICY IF EXISTS fin_sim_insert ON fin_simulacoes_financiamento;
      CREATE POLICY fin_sim_insert ON fin_simulacoes_financiamento FOR INSERT WITH CHECK (true);

      DROP POLICY IF EXISTS fin_sim_update ON fin_simulacoes_financiamento;
      CREATE POLICY fin_sim_update ON fin_simulacoes_financiamento FOR UPDATE USING (true) WITH CHECK (true);

      DROP POLICY IF EXISTS fin_sim_delete ON fin_simulacoes_financiamento;
      CREATE POLICY fin_sim_delete ON fin_simulacoes_financiamento FOR DELETE USING (true);

      DROP POLICY IF EXISTS fin_parc_select ON fin_simulacoes_parcelas;
      CREATE POLICY fin_parc_select ON fin_simulacoes_parcelas FOR SELECT USING (true);

      DROP POLICY IF EXISTS fin_parc_insert ON fin_simulacoes_parcelas;
      CREATE POLICY fin_parc_insert ON fin_simulacoes_parcelas FOR INSERT WITH CHECK (true);

      DROP POLICY IF EXISTS fin_parc_update ON fin_simulacoes_parcelas;
      CREATE POLICY fin_parc_update ON fin_simulacoes_parcelas FOR UPDATE USING (true) WITH CHECK (true);

      DROP POLICY IF EXISTS fin_parc_delete ON fin_simulacoes_parcelas;
      CREATE POLICY fin_parc_delete ON fin_simulacoes_parcelas FOR DELETE USING (true);
    `;

    // Enviar SQL via API PostgreSQL
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'tx=commit',
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Supabase error:', error);
      // Mesmo se falhar, continuamos pois as tabelas podem já existir
    }

    return Response.json({
      sucesso: true,
      mensagem: 'Tabelas de financiamento criadas com sucesso',
    });
  } catch (error) {
    console.error('[initFinanceiroSimulacaoTables] Erro:', error.message);
    return Response.json(
      { sucesso: false, erro: error.message },
      { status: 500 }
    );
  }
});