/**
 * moduloPaginasCRUD — Gerencia vínculos entre módulos e páginas do menu
 * Ações: init_table | salvar_paginas | buscar_menu | validar_exclusao
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

// ─── Lista controlada de páginas válidas do sistema ────────────────────────────
const PAGINAS_VALIDAS = new Set([
  "Dashboard", "ModulosPage", "DeployManager",
  "ComercialPage", "ComercialOrcamentosPage",
  "CRMPage", "CRMDashboardPage", "CRMTarefasPage", "CRMRelatoriosPage", "CRMDetalhePage",
  "FinanceiroPage", "FinanceiroConfiguracoesPage", "FinanceiroCalculadoraFinanciamento", "MetasCustosPage",
  "ComprasPage",
  "EstoqueMpPage", "EstoquePaPage", "EstoqueControlePage",
  "PpcpPage", "LogisticaPage", "ProducaoPage", "QualidadePage", "EmbalagemPage",
  "FiscalPage", "HistoricoPrecosPage",
  "ClientesPage", "FornecedoresPage", "Transportadoras", "ModalidadeFrete",
  "ConfiguracaoTecidoPage", "ProdutoComercialPage", "CustoProdutoPage", "ServicosPage", "ConfiguracaoExtrasPage",
  "Usuarios", "InformacoesPage", "EmpresasConfigPage", "IntegracoesERP",
  "LogsAuditoria", "SistemaLogsPage", "SistemaAlertasPage",
  "DeployManagerV2", "DeployManagerSaaS",
]);

// ─── Configuração padrão de módulos para migração inicial ─────────────────────
const MODULOS_PADRAO = [
  { modulo: "Comercial", paginas: ["ComercialOrcamentosPage", "CRMDashboardPage", "CRMPage", "CRMTarefasPage"] },
  { modulo: "Financeiro", paginas: ["FinanceiroPage", "FinanceiroConfiguracoesPage", "FinanceiroCalculadoraFinanciamento", "MetasCustosPage"] },
  { modulo: "Compras", paginas: ["ComprasPage", "FornecedoresPage"] },
  { modulo: "Estoque MP", paginas: ["EstoqueMpPage", "EstoqueControlePage"] },
  { modulo: "Estoque PA", paginas: ["EstoquePaPage"] },
  { modulo: "PPCP", paginas: ["PpcpPage"] },
  { modulo: "Logística", paginas: ["LogisticaPage"] },
  { modulo: "Produção", paginas: ["ProducaoPage"] },
  { modulo: "Fiscal", paginas: ["FiscalPage"] },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_KEY");
    if (!supabaseUrl || !serviceKey) return Response.json({ error: 'Supabase não configurado' }, { status: 500 });

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const body = await req.json();
    const { action, empresa_id, modulo_nome, paginas } = body;

    // ─── INIT TABLE ────────────────────────────────────────────────────────────
    if (action === 'init_table') {
      const sqlCreate = `
        CREATE TABLE IF NOT EXISTS modulo_paginas (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          empresa_id uuid NOT NULL,
          modulo_nome text NOT NULL,
          pagina_nome text NOT NULL,
          label_menu text,
          ordem integer DEFAULT 0,
          ativo boolean DEFAULT true,
          created_at timestamptz DEFAULT now(),
          deleted_at timestamptz
        );
        CREATE INDEX IF NOT EXISTS idx_modulo_paginas_empresa ON modulo_paginas(empresa_id);
        CREATE INDEX IF NOT EXISTS idx_modulo_paginas_modulo ON modulo_paginas(modulo_nome);
        GRANT ALL ON modulo_paginas TO service_role;
        GRANT ALL ON modulo_paginas TO authenticated;
        ALTER TABLE modulo_paginas ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "service_role_all" ON modulo_paginas;
        CREATE POLICY "service_role_all" ON modulo_paginas FOR ALL TO service_role USING (true) WITH CHECK (true);
      `;

      try {
        await supabase.rpc('exec_sql', { sql: sqlCreate });
      } catch (_) {
        // RPC pode não existir — retorna SQL para execução manual
        return Response.json({
          success: false,
          message: 'Execute este SQL no Supabase SQL Editor e rode init_table novamente:',
          sql: sqlCreate.trim()
        });
      }

      // Verifica se tabela existe e está acessível
      const { error: checkErr } = await supabase.from('modulo_paginas').select('id').limit(1);
      if (checkErr) {
        return Response.json({ success: false, error: checkErr.message, sql: sqlCreate.trim() });
      }

      return Response.json({ success: true, message: 'Tabela modulo_paginas criada e permissões aplicadas.' });
    }

    // ─── SALVAR PÁGINAS DO MÓDULO ──────────────────────────────────────────────
    if (action === 'salvar_paginas') {
      if (!empresa_id || !modulo_nome || !Array.isArray(paginas)) {
        return Response.json({ error: 'empresa_id, modulo_nome e paginas são obrigatórios' }, { status: 400 });
      }

      // AJUSTE 3: Filtra apenas páginas válidas
      // AJUSTE 4: Remove duplicatas por pagina_nome
      const vistas = new Set();
      const paginasFiltradas = paginas
        .filter(p => {
          const nome = p.pagina_nome || p;
          return PAGINAS_VALIDAS.has(nome);
        })
        .filter(p => {
          const nome = p.pagina_nome || p;
          if (vistas.has(nome)) return false;
          vistas.add(nome);
          return true;
        });

      // Recupera ordem_modulo atual antes de deletar (para não perder a posição)
      const { data: registrosAtuais } = await supabase
        .from('modulo_paginas')
        .select('ordem_modulo')
        .eq('empresa_id', empresa_id)
        .eq('modulo_nome', modulo_nome)
        .is('deleted_at', null)
        .limit(1);
      const ordemModuloAtual = registrosAtuais?.[0]?.ordem_modulo ?? null;

      // Soft delete dos registros antigos (incluindo sentinelas)
      await supabase
        .from('modulo_paginas')
        .update({ deleted_at: new Date().toISOString() })
        .eq('empresa_id', empresa_id)
        .eq('modulo_nome', modulo_nome)
        .is('deleted_at', null);

      // Insere novos registros preservando ordem_modulo
      if (paginasFiltradas.length > 0) {
        const insertsCompletos = paginasFiltradas.map((pagina, index) => ({
          empresa_id,
          modulo_nome,
          pagina_nome: pagina.pagina_nome || pagina,
          label_menu: pagina.label_menu || null,
          ordem: index,
          ordem_modulo: ordemModuloAtual,
          ativo: true,
          created_at: new Date().toISOString()
        }));

        let { error: insertErr } = await supabase.from('modulo_paginas').insert(insertsCompletos);

        // Fallback: se colunas opcionais não existirem, insere sem elas
        if (insertErr && (insertErr.message.includes('label_menu') || insertErr.message.includes('icone'))) {
          const insertsBasicos = paginasFiltradas.map((pagina, index) => ({
            empresa_id,
            modulo_nome,
            pagina_nome: pagina.pagina_nome || pagina,
            ordem: index,
            ordem_modulo: ordemModuloAtual,
            ativo: true,
            created_at: new Date().toISOString()
          }));
          const { error: insertErr2 } = await supabase.from('modulo_paginas').insert(insertsBasicos);
          if (insertErr2) return Response.json({ error: insertErr2.message }, { status: 500 });
        } else if (insertErr) {
          return Response.json({ error: insertErr.message }, { status: 500 });
        }
      }

      return Response.json({ success: true, data: [], total_salvo: paginasFiltradas.length, error: null });
    }

    // ─── BUSCAR MENU (COM FALLBACK) ────────────────────────────────────────────
    if (action === 'buscar_menu') {
      if (!empresa_id) return Response.json({ success: true, data: null, error: null });

      const { data: rows, error } = await supabase
        .from('modulo_paginas')
        .select('*')
        .eq('empresa_id', empresa_id)
        .eq('ativo', true)
        .is('deleted_at', null)
        .neq('pagina_nome', '__ordem_sentinela__')
        .order('ordem_modulo', { ascending: true, nullsFirst: false })
        .order('ordem', { ascending: true });

      if (error) {
        // Tabela não existe, sem permissão ou coluna ausente → fallback para menu estático
        if (error.code === '42P01' || error.message.includes('does not exist') || error.message.includes('column') || error.message.includes('permission denied')) {
          return Response.json({ success: true, data: null, error: null });
        }
        return Response.json({ success: false, data: null, error: error.message });
      }

      const dados = rows || [];

      // Sem configuração → sinaliza usar menu estático
      if (!dados.length) {
        return Response.json({ success: true, data: null, error: null });
      }

      // Agrupa por módulo preservando a ordem de chegada (já ordenado por ordem_modulo, ordem)
      const menu = {};
      dados.forEach(item => {
        if (!menu[item.modulo_nome]) menu[item.modulo_nome] = [];
        menu[item.modulo_nome].push({
          pagina_nome: item.pagina_nome,
          label_menu: item.label_menu,
          icone: item.icone,
          ordem: item.ordem,
        });
      });

      return Response.json({ success: true, data: menu, error: null });
    }

    // ─── BUSCAR PÁGINAS DE UM MÓDULO ───────────────────────────────────────────
    if (action === 'buscar_paginas_modulo') {
      if (!empresa_id || !modulo_nome) {
        return Response.json({ success: true, data: [], error: null });
      }

      const { data: rows, error } = await supabase
        .from('modulo_paginas')
        .select('*')
        .eq('empresa_id', empresa_id)
        .eq('modulo_nome', modulo_nome)
        .is('deleted_at', null)
        .order('ordem', { ascending: true });

      if (error) {
        if (error.code === '42P01' || error.message.includes('does not exist') || error.message.includes('column')) {
          return Response.json({ success: true, data: [], error: null });
        }
        return Response.json({ success: false, data: [], error: error.message });
      }

      return Response.json({ success: true, data: rows || [], error: null });
    }

    // ─── POPULAR MÓDULOS PADRÃO (MIGRAÇÃO INICIAL) ────────────────────────────
    if (action === 'popular_padrao') {
      if (!empresa_id) return Response.json({ error: 'empresa_id obrigatório' }, { status: 400 });

      const resultados = [];
      for (const cfg of MODULOS_PADRAO) {
        // Só popula se o módulo ainda não tiver páginas configuradas
        const { data: existentes } = await supabase
          .from('modulo_paginas')
          .select('id')
          .eq('empresa_id', empresa_id)
          .eq('modulo_nome', cfg.modulo)
          .is('deleted_at', null)
          .limit(1);

        if (existentes && existentes.length > 0) {
          resultados.push({ modulo: cfg.modulo, status: 'já configurado, ignorado' });
          continue;
        }

        // Filtra páginas válidas e sem duplicatas
        const vistas = new Set();
        const paginasValidas = cfg.paginas.filter(p => {
          if (!PAGINAS_VALIDAS.has(p) || vistas.has(p)) return false;
          vistas.add(p);
          return true;
        });

        const inserts = paginasValidas.map((pagina_nome, index) => ({
          empresa_id,
          modulo_nome: cfg.modulo,
          pagina_nome,
          ordem: index,
          ativo: true,
          created_at: new Date().toISOString()
        }));

        if (inserts.length > 0) {
          const { error } = await supabase.from('modulo_paginas').insert(inserts);
          resultados.push({ modulo: cfg.modulo, status: error ? `erro: ${error.message}` : `${inserts.length} páginas inseridas` });
        }
      }

      return Response.json({ success: true, resultados });
    }

    // ─── SALVAR ORDEM DOS MÓDULOS ──────────────────────────────────────────────
    // Atualiza ordem_modulo na tabela modulo_paginas (todas as linhas do módulo)
    // Se o módulo não tem linhas, insere uma sentinela para guardar a ordem
    if (action === 'salvar_ordem_modulos') {
      const { modulos: listaOrdem } = body; // [{ modulo_nome, ordem }]
      if (!empresa_id || !Array.isArray(listaOrdem) || listaOrdem.length === 0) {
        return Response.json({ success: false, error: 'empresa_id e lista de módulos são obrigatórios' }, { status: 400 });
      }

      const erros = [];
      for (const item of listaOrdem) {
        // Verifica se já existem linhas para este módulo
        const { data: existentes } = await supabase
          .from('modulo_paginas')
          .select('id')
          .eq('empresa_id', empresa_id)
          .eq('modulo_nome', item.modulo_nome)
          .is('deleted_at', null)
          .limit(1);

        if (existentes && existentes.length > 0) {
          // Atualiza ordem_modulo nas linhas existentes
          const { error } = await supabase
            .from('modulo_paginas')
            .update({ ordem_modulo: item.ordem, updated_at: new Date().toISOString() })
            .eq('empresa_id', empresa_id)
            .eq('modulo_nome', item.modulo_nome)
            .is('deleted_at', null);
          if (error) erros.push(`${item.modulo_nome}: ${error.message}`);
        } else {
          // Insere sentinela para preservar a ordem mesmo sem páginas vinculadas
          const { error } = await supabase
            .from('modulo_paginas')
            .insert({
              empresa_id,
              modulo_nome: item.modulo_nome,
              pagina_nome: '__ordem_sentinela__',
              label_menu: null,
              ordem: 0,
              ordem_modulo: item.ordem,
              ativo: false,
              created_at: new Date().toISOString(),
            });
          if (error) erros.push(`${item.modulo_nome} (sentinela): ${error.message}`);
        }
      }

      if (erros.length > 0) {
        return Response.json({ success: false, error: erros.join('; ') });
      }
      return Response.json({ success: true });
    }

    // ─── BUSCAR MÓDULOS ORDENADOS (une modulos_erp + ordem de modulo_paginas) ──
    if (action === 'buscar_modulos_ordenados') {
      if (!empresa_id) return Response.json({ success: true, data: [] });

      // Busca módulos do modulos_erp
      const { data: modulosErp, error: modErr } = await supabase
        .from('modulos_erp')
        .select('*')
        .eq('empresa_id', empresa_id)
        .is('deleted_at', null);

      if (modErr) return Response.json({ success: false, error: modErr.message });

      // Busca a ordem de cada módulo em modulo_paginas (inclui sentinelas ativo=false)
      const { data: ordens } = await supabase
        .from('modulo_paginas')
        .select('modulo_nome, ordem_modulo')
        .eq('empresa_id', empresa_id)
        .is('deleted_at', null)
        .order('ordem_modulo', { ascending: true });

      // Monta mapa modulo_nome → menor ordem_modulo encontrado
      const ordemMap = {};
      (ordens || []).forEach(r => {
        if (ordemMap[r.modulo_nome] === undefined || r.ordem_modulo < ordemMap[r.modulo_nome]) {
          ordemMap[r.modulo_nome] = r.ordem_modulo;
        }
      });

      // Enriquece modulos_erp com a ordem e ordena
      const modulosComOrdem = (modulosErp || []).map(m => ({
        ...m,
        ordem_modulo: ordemMap[m.nome_modulo] ?? 999,
      })).sort((a, b) => a.ordem_modulo - b.ordem_modulo);

      return Response.json({ success: true, data: modulosComOrdem });
    }

    // ─── BUSCAR MENU COMPLETO (módulos + páginas para configuração de permissões) ─
    if (action === 'buscar_menu_completo') {
      if (!empresa_id) return Response.json({ success: true, data: [], error: null });

      const { data: rows, error } = await supabase
        .from('modulo_paginas')
        .select('modulo_nome, pagina_nome, label_menu, ordem, ordem_modulo')
        .eq('empresa_id', empresa_id)
        .eq('ativo', true)
        .is('deleted_at', null)
        .neq('pagina_nome', '__ordem_sentinela__')
        .order('ordem_modulo', { ascending: true, nullsFirst: false })
        .order('ordem', { ascending: true });

      if (error) {
        if (error.code === '42P01' || error.message.includes('does not exist') || error.message.includes('permission denied')) {
          return Response.json({ success: true, data: [], error: null });
        }
        return Response.json({ success: false, data: [], error: error.message });
      }

      // Agrupa por módulo mantendo ordem
      const modulosMap = {};
      const modulosOrdem = [];
      (rows || []).forEach(item => {
        if (!modulosMap[item.modulo_nome]) {
          modulosMap[item.modulo_nome] = [];
          modulosOrdem.push(item.modulo_nome);
        }
        modulosMap[item.modulo_nome].push({
          pagina_nome: item.pagina_nome,
          label_menu: item.label_menu || item.pagina_nome,
        });
      });

      const data = modulosOrdem.map(m => ({ modulo: m, paginas: modulosMap[m] }));
      return Response.json({ success: true, data, error: null });
    }

    // ─── BUSCAR VÍNCULOS DE TODAS AS PÁGINAS ──────────────────────────────────
    if (action === 'buscar_vinculos_paginas') {
      if (!empresa_id) return Response.json({ success: true, data: {}, error: null });

      const { data: rows, error } = await supabase
        .from('modulo_paginas')
        .select('pagina_nome, modulo_nome')
        .eq('empresa_id', empresa_id)
        .eq('ativo', true)
        .is('deleted_at', null);

      if (error) {
        if (error.code === '42P01' || error.message.includes('does not exist') || error.message.includes('permission denied')) {
          return Response.json({ success: true, data: {}, error: null });
        }
        return Response.json({ success: false, data: {}, error: error.message });
      }

      // Agrupa: { "CRMPage": ["COMERCIAL", "FINANCEIRO"], ... }
      const vinculos = {};
      (rows || []).forEach(row => {
        if (!vinculos[row.pagina_nome]) vinculos[row.pagina_nome] = [];
        if (!vinculos[row.pagina_nome].includes(row.modulo_nome)) {
          vinculos[row.pagina_nome].push(row.modulo_nome);
        }
      });

      return Response.json({ success: true, data: vinculos, error: null });
    }

    // ─── VERIFICAR PERMISSÃO NA TABELA ────────────────────────────────────────
    if (action === 'verificar_permissao') {
      const { data, error } = await supabase.from('modulo_paginas').select('id').limit(1);
      if (error) {
        return Response.json({ ok: false, error: error.message });
      }
      return Response.json({ ok: true });
    }

    // ─── VALIDAR EXCLUSÃO DE MÓDULO ────────────────────────────────────────────
    if (action === 'validar_exclusao') {
      if (!modulo_nome) return Response.json({ success: true, error: null });

      const { data: rows, error } = await supabase
        .from('modulo_paginas')
        .select('id')
        .eq('modulo_nome', modulo_nome)
        .is('deleted_at', null)
        .limit(1);

      if (error) {
        if (error.code === '42P01') return Response.json({ success: true, error: null });
        return Response.json({ success: false, error: error.message });
      }

      if (rows && rows.length > 0) {
        return Response.json({ success: false, error: 'O módulo possui páginas vinculadas. Remova-as antes de excluir.' });
      }

      return Response.json({ success: true, error: null });
    }

    // ─── VERIFICAR PERMISSÃO DE PÁGINA PARA USUÁRIO ────────────────────────────
    // Verifica se um usuário tem acesso a uma página específica
    if (action === 'verificar_acesso_pagina') {
      const { usuario_email, pagina_nome: paginaCheck } = body;
      if (!usuario_email || !paginaCheck) {
        return Response.json({ acesso: false, motivo: 'Parâmetros incompletos' });
      }

      // Busca usuário no Supabase
      const { data: usuarios } = await supabase
        .from('erp_usuarios')
        .select('perfil, setor, permissoes')
        .eq('email', usuario_email)
        .is('deleted_at', null)
        .limit(1);

      const usuario = usuarios?.[0];
      if (!usuario) return Response.json({ acesso: false, motivo: 'Usuário não encontrado' });

      // Admin ou setor administrativo → acesso total
      if (usuario.perfil === 'Administrador' || String(usuario.setor).toLowerCase() === 'administrativo') {
        return Response.json({ acesso: true, motivo: 'Administrador' });
      }

      // Verifica em permissoes (novo sistema granular)
      const permissoesUsuario = Array.isArray(usuario.permissoes) ? usuario.permissoes : [];
      const temAcesso = permissoesUsuario.some(p =>
        Array.isArray(p.paginas) && p.paginas.includes(paginaCheck)
      );

      return Response.json({ acesso: temAcesso, motivo: temAcesso ? 'Permissão concedida' : 'Sem permissão para esta página' });
    }

    return Response.json({ error: `Ação desconhecida: ${action}` }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});