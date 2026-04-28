/**
 * supabaseCRUD — Proxy CRUD com service role
 * v3 — Otimizado: auditoria consolidada + geração de códigos internalizada
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { createClient } from 'npm:@supabase/supabase-js@2';

// ── Auditoria: 1 linha por operação ──────────────────────────────────────────
async function registrarAuditLog(supabase, { usuario_id, usuario_nome, usuario_email, empresa_id, modulo, tabela_afetada, tipo_operacao, registro_id, dados_anteriores, dados_novos, descricao }) {
  try {
    await supabase.from('audit_logs').insert({
      usuario_id: usuario_id || null,
      usuario_nome: usuario_nome || null,
      usuario_email: usuario_email || null,
      empresa_id: empresa_id || null,
      modulo: modulo || 'Sistema',
      acao: tipo_operacao,
      entidade: tabela_afetada,
      tabela_afetada: tabela_afetada || null,
      tipo_operacao: tipo_operacao || null,
      registro_id: registro_id || null,
      dados_anteriores: dados_anteriores ? JSON.stringify(dados_anteriores) : null,
      dados_novos: dados_novos ? JSON.stringify(dados_novos) : null,
      descricao: descricao || null,
      data_evento: new Date().toISOString()
    });
  } catch (err) {
    console.error('Erro ao registrar audit log:', err.message);
  }
}

// ── Sistema log ───────────────────────────────────────────────────────────────
async function registrarSistemaLog(supabase, { empresa_id, usuario_email, modulo, acao, mensagem_erro, dados_erro, nivel = 'ERROR' }) {
  try {
    await supabase.from('sistema_logs').insert({
      empresa_id: empresa_id || null,
      usuario_email: usuario_email || null,
      modulo: modulo || 'Sistema',
      acao: acao || null,
      mensagem_erro: mensagem_erro || null,
      dados_erro: dados_erro ? JSON.stringify(dados_erro) : null,
      nivel,
      created_at: new Date().toISOString()
    });
  } catch (logError) {
    console.error('[sistema_logs] Falha:', logError.message);
  }
}

// ── Geração de código de vínculo (internalizada — sem chamada HTTP aninhada) ──
function calcularDigitoVerificador(codigo) {
  const soma = codigo.split('').reduce((acc, digit) => acc + (parseInt(digit) || 0), 0);
  return (soma % 10).toString();
}

async function gerarCodigoVinculo(supabase, { empresa_id, artigo_id, cor_tecido_id, linha_comercial_id, editing_id }) {
  const [artigoRes, corRes, linhaRes] = await Promise.all([
    supabase.from('config_tecido_artigo').select('codigo_artigo').eq('id', artigo_id).eq('empresa_id', empresa_id).single(),
    supabase.from('config_tecido_cor').select('codigo_cor').eq('id', cor_tecido_id).eq('empresa_id', empresa_id).single(),
    supabase.from('config_tecido_linha_comercial').select('codigo_linha_comercial').eq('id', linha_comercial_id).eq('empresa_id', empresa_id).single(),
  ]);

  const codigoArtigo = artigoRes.data?.codigo_artigo;
  const codigoCor = corRes.data?.codigo_cor;
  const codigoLinha = linhaRes.data?.codigo_linha_comercial;

  if (!codigoArtigo || !codigoCor || !codigoLinha) {
    throw new Error('Não foi possível recuperar os códigos das entidades relacionadas');
  }

  // Verifica duplicata
  const { data: existente } = await supabase
    .from('config_tecido_vinculos')
    .select('id, codigo_unico')
    .eq('empresa_id', empresa_id)
    .eq('artigo_id', artigo_id)
    .eq('cor_tecido_id', cor_tecido_id)
    .eq('linha_comercial_id', linha_comercial_id)
    .maybeSingle();

  if (existente && existente.id !== editing_id) {
    throw new Error('Esta combinação de Artigo + Cor + Linha Comercial já existe.');
  }

  const codigoBase = codigoArtigo + codigoCor + codigoLinha;
  return `${codigoBase}-${calcularDigitoVerificador(codigoBase)}`;
}

// ── Geração de códigos para outras tabelas de tecido ─────────────────────────
async function gerarCodigoTecido(supabase, tipo, empresa_id) {
  const tabMap = {
    cor: { table: 'config_tecido_cor', campo: 'codigo_cor', prefix: 'C' },
    artigo: { table: 'config_tecido_artigo', campo: 'codigo_artigo', prefix: 'A' },
    linha: { table: 'config_tecido_linha_comercial', campo: 'codigo_linha_comercial', prefix: 'L' },
  };
  const cfg = tabMap[tipo];
  if (!cfg) return null;

  const { data } = await supabase
    .from(cfg.table)
    .select(cfg.campo)
    .eq('empresa_id', empresa_id);

  let proximo = 1;
  if (data && data.length > 0) {
    const nums = data
      .map(r => parseInt((r[cfg.campo] || '').replace(/\D/g, ''), 10))
      .filter(n => !isNaN(n));
    if (nums.length > 0) proximo = Math.max(...nums) + 1;
  }
  return `${cfg.prefix}${String(proximo).padStart(3, '0')}`;
}

// ── Utility: UUID validation ──────────────────────────────────────────────────
const isValidUUID = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || ''));

// ─────────────────────────────────────────────────────────────────────────────
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
    const { tabela, table, dados, data: bodyData, id, filtros } = body;
    // Normaliza action: aceita aliases INSERT/UPDATE/DELETE/SELECT
    const actionRaw = body.action || '';
    const action = actionRaw === 'INSERT' ? 'create'
      : actionRaw === 'UPDATE' ? 'update'
      : actionRaw === 'DELETE' ? 'delete'
      : actionRaw === 'SELECT' ? 'list'
      : actionRaw;
    // Sanitize empresa_id: empty string is not a valid UUID
    const empresa_id = body.empresa_id && body.empresa_id.trim() !== '' ? body.empresa_id : null;

    const tabelaFinal = tabela || table;
    const dadosFinal = dados || bodyData;

    // ─── INIT FORNECEDOR TIPOS ───────────────────────────────────────────────
    if (action === 'init_fornecedor_tipos') {
      await supabase.rpc('exec_sql', { sql: `
        create table if not exists fornecedor_tipos (
          id uuid primary key default gen_random_uuid(),
          nome text not null unique,
          created_at timestamp default now()
        );
        insert into fornecedor_tipos (nome) values ('Tecidos'),('Aviamentos') on conflict (nome) do nothing;
        alter table fornecedores add column if not exists tipo_id uuid references fornecedor_tipos(id);
        create index if not exists idx_fornecedor_tipo on fornecedores(tipo_id);
      `}).catch(() => null);
      // fallback: create via insert (se rpc não existir)
      const tiposPadrao = ['Tecidos', 'Aviamentos'];
      for (const nome of tiposPadrao) {
        await supabase.from('fornecedor_tipos').insert({ nome }).onConflict('nome').ignoreDuplicates();
      }
      return Response.json({ success: true });
    }

    // ─── VALIDATE NFE CNPJS ──────────────────────────────────────────────────
    if (action === 'validate_nfe_cnpjs') {
      const { emitente_cnpj, destinatario_cnpj } = body;
      const cnpjDestinatario = (destinatario_cnpj || '').replace(/\D/g, '');
      const cnpjEmitente = (emitente_cnpj || '').replace(/\D/g, '');

      let empresaOk = false;
      let fornecedorOk = false;

      if (cnpjDestinatario) {
        // Busca em empresas_config usando CNPJ normalizado
        const { data: empRows } = await supabase.from('empresas_config').select('id, cnpj').is('deleted_at', null);
        const matchEmp = (empRows || []).find(e => (e.cnpj || '').replace(/\D/g, '') === cnpjDestinatario);
        empresaOk = !!matchEmp;
      } else {
        empresaOk = true; // sem CNPJ destinatário, não bloqueia
      }

      if (cnpjEmitente) {
        const empId = body.empresa_id || empresa_id;
        const { data: fornRows } = await supabase
          .from('fornecedores')
          .select('id, documento')
          .eq('empresa_id', empId);
        const matchFor = (fornRows || []).find(f =>
          (f.documento || '').replace(/\D/g, '') === cnpjEmitente
        );
        fornecedorOk = !!matchFor;
      } else {
        fornecedorOk = true;
      }

      return Response.json({ empresaOk, fornecedorOk });
    }

    // ─── GET FORNECEDOR VINCULO FLAG ────────────────────────────────────────
    if (action === 'get_fornecedor_vinculo_flag') {
      const { cnpj } = body;
      const cnpjNorm = (cnpj || '').replace(/\D/g, '');
      const empId = body.empresa_id || empresa_id;

      const { data: fornRows } = await supabase
        .from('fornecedores')
        .select('tipo_id, documento')
        .eq('empresa_id', empId);

      const fornecedor = (fornRows || []).find(f => (f.documento || '').replace(/\D/g, '') === cnpjNorm);

      if (!fornecedor?.tipo_id) {
        return Response.json({ usa_vinculo: false });
      }

      const { data: tipoRow } = await supabase
        .from('fornecedor_tipos')
        .select('nome, usa_vinculo')
        .eq('id', fornecedor.tipo_id)
        .maybeSingle();

      // Verifica pelo nome do tipo contendo 'tecido' OU pelo flag usa_vinculo
      const isTecido = (tipoRow?.nome || '').toLowerCase().includes('tecido') || tipoRow?.usa_vinculo === true;
      return Response.json({ usa_vinculo: isTecido });
    }

    if (!action || !tabelaFinal) {
      return Response.json({ error: '"action" e "tabela" são obrigatórios' }, { status: 400 });
    }

    // ─── LIST ────────────────────────────────────────────────────────────────
     if (action === 'list') {
       // Tabelas globais (sem empresa_id)
       const TABELAS_GLOBAIS = ['fornecedor_tipos'];

       // Para fornecedor_tipos: usa REST API direta para garantir bypass de RLS
       if (tabelaFinal === 'fornecedor_tipos') {
         const resp = await fetch(`${supabaseUrl}/rest/v1/fornecedor_tipos?select=*&order=nome.asc`, {
           headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` }
         });
         if (!resp.ok) return Response.json({ data: [] });
         const rows = await resp.json();
         return Response.json({ data: Array.isArray(rows) ? rows : [] });
       }

       let query = supabase.from(tabelaFinal).select('*');
       if (empresa_id && tabelaFinal !== 'audit_logs' && !TABELAS_GLOBAIS.includes(tabelaFinal)) query = query.eq('empresa_id', empresa_id);
       if (filtros && typeof filtros === 'object') {
         for (const [k, v] of Object.entries(filtros)) query = query.eq(k, v);
       }
       // Regra 6: filtrar soft-deleted
       const TABELAS_COM_STATUS = ['config_vinculos'];
       if (TABELAS_COM_STATUS.includes(tabelaFinal)) {
         query = query.or('status.is.null,status.neq.inativo');
       }

       // Filtragem de busca no backend para otimizar desempenho
       const { searchTerm } = body;
       if (searchTerm && typeof searchTerm === 'string') {
         const term = searchTerm.toLowerCase();
         // Mapeia campos de busca por tabela
         const searchFields = {
           'config_tecido_cor': ['nome_cor', 'codigo_cor'],
           'config_tecido_artigo': ['nome_artigo', 'codigo_artigo'],
           'config_tecido_linha_comercial': ['nome_linha_comercial', 'codigo_linha_comercial'],
           'config_tecido_vinculos': ['codigo_unico']
         };

         const fields = searchFields[tabelaFinal];
         if (fields && fields.length > 0) {
           // Aplica filtro OR para múltiplos campos
           query = query.or(fields.map(f => `${f}.ilike.%${term}%`).join(','));
         }
       }

       // Ordena por código para config_acabamentos e config_personalizacao
       if (tabelaFinal === 'config_acabamentos') {
         query = query.is('deleted_at', null).order('codigo_acabamento', { ascending: true }).limit(5000);
       } else if (tabelaFinal === 'config_personalizacao') {
         query = query.is('deleted_at', null).order('codigo_personalizacao', { ascending: true }).limit(5000);
       } else {
       // Ordena por created_date para tabelas que usam created_date, created_at para as demais
       const TABELAS_CREATED_DATE = ['config_tecido_cor','config_tecido_artigo','config_tecido_linha_comercial','empresas_config','servicos','produto_comercial','config_dependencias','historico_precos_produto_erp'];
       const TABELAS_ORDER_NOME = ['fornecedor_tipos'];
       if (TABELAS_CREATED_DATE.includes(tabelaFinal)) {
         query = query.order('created_date', { ascending: false }).limit(5000);
       } else if (TABELAS_ORDER_NOME.includes(tabelaFinal)) {
         query = query.order('nome', { ascending: true }).limit(500);
       } else {
         const TABELAS_LIMIT_ALTO = ['tabela_precos_sync', 'custo_produto_cache', 'modulos_erp'];
         const limiteQuery = TABELAS_LIMIT_ALTO.includes(tabelaFinal) ? 10000 : 500;
         query = query.order('created_at', { ascending: false }).limit(limiteQuery);
       }
       }

       const { data: rawData, error } = await query;

      if (error) {
        // Tabela não existe → retorna vazio em vez de 500
        if (error.code === '42P01' || error.message.includes('relation') || error.message.includes('not found') || error.message.includes('does not exist') || error.code === 'PGRST116') {
          return Response.json({ data: [] });
        }
        // Erro de coluna order → tenta sem order
        if (error.message.includes('created_at') || error.message.includes('created_date')) {
          let q2 = supabase.from(tabelaFinal).select('*');
          if (empresa_id && tabelaFinal !== 'audit_logs') q2 = q2.eq('empresa_id', empresa_id);
          if (filtros && typeof filtros === 'object') {
            for (const [k, v] of Object.entries(filtros)) q2 = q2.eq(k, v);
          }
          const { data: d2, error: e2 } = await q2;
          if (e2) return Response.json({ data: [] });
          let filteredD2 = d2 || [];
          const TABELAS_COM_DELETED_AT2 = ['config_tecido_cor','config_tecido_artigo','config_tecido_linha_comercial','config_tecido_vinculos'];
          if (TABELAS_COM_DELETED_AT2.includes(tabelaFinal)) {
            filteredD2 = filteredD2.filter(r => !r.deleted_at);
          }
          return Response.json({ data: filteredD2 });
        }
        return Response.json({ data: [] });
      }

      // Filtragem JS pós-query para garantir exclusão de soft-deleted
      const TABELAS_COM_DELETED_AT = ['config_tecido_cor','config_tecido_artigo','config_tecido_linha_comercial','config_tecido_vinculos','config_acabamentos','config_personalizacao'];
      let data = rawData || [];
      if (TABELAS_COM_DELETED_AT.includes(tabelaFinal)) {
        data = data.filter(r => !r.deleted_at);
      }

      return Response.json({ data });
    }

    // ─── CREATE ──────────────────────────────────────────────────────────────
    if (action === 'create') {
      if (!dadosFinal) return Response.json({ error: '"dados" é obrigatório' }, { status: 400 });

      let payload = Array.isArray(dadosFinal) ? dadosFinal[0] : { ...dadosFinal };

      // Tabelas globais não precisam de empresa_id
      const TABELAS_GLOBAIS_CREATE = ['fornecedor_tipos'];
      if (TABELAS_GLOBAIS_CREATE.includes(tabelaFinal)) {
        const resp = await fetch(`${supabaseUrl}/rest/v1/fornecedor_tipos`, {
          method: 'POST',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(payload)
        });
        if (!resp.ok) {
          const errBody = await resp.json().catch(() => ({}));
          const errMsg = errBody?.message || errBody?.error || resp.statusText;
          if (resp.status === 409) return Response.json({ error: 'Tipo já existe com este nome.' });
          return Response.json({ error: errMsg });
        }
        const result = await resp.json();
        return Response.json({ data: Array.isArray(result) ? result[0] : result });
      }

      // Para empresas_config: normalizar CNPJ e verificar duplicidade no backend
      if (tabelaFinal === 'empresas_config' && payload.cnpj) {
        const cnpjNorm = payload.cnpj.replace(/\D/g, '');
        payload.cnpj = cnpjNorm;
        const { data: existente } = await supabase
          .from('empresas_config')
          .select('id')
          .eq('cnpj', cnpjNorm)
          .is('deleted_at', null)
          .maybeSingle();
        if (existente) {
          return Response.json({ error: 'Este CNPJ já está cadastrado no sistema.' }, { status: 409 });
        }
      }

      // Injeta empresa_id se necessário (exceto para tabelas que não possuem essa coluna)
      const TABELAS_SEM_EMPRESA_ID = ['crm_oportunidade_historico', 'crm_tarefas', 'crm_tarefas_historico'];
      const temEmpresaId = Object.prototype.hasOwnProperty.call(payload, 'empresa_id');
      if (!TABELAS_SEM_EMPRESA_ID.includes(tabelaFinal)) {
        if (!temEmpresaId && empresa_id) {
          payload.empresa_id = empresa_id;
        } else if (!temEmpresaId && !empresa_id) {
          const { data: eu } = await supabase.from('erp_usuarios').select('empresa_id').eq('email', user.email).maybeSingle();
          if (eu?.empresa_id) payload.empresa_id = eu.empresa_id;
        }
      }
      
      // Sanitiza responsavel_id se estiver sendo passado como MongoDB ID (invalido)
      if (payload.responsavel_id && !isValidUUID(payload.responsavel_id)) {
        payload.responsavel_id = null;
      }

      // ── Injeta usuario_id nas tabelas CRM (owner do registro) ──────────────
      const TABELAS_COM_USUARIO_ID = ['crm_oportunidades', 'crm_tarefas', 'crm_oportunidade_historico'];
      if (TABELAS_COM_USUARIO_ID.includes(tabelaFinal) && !payload.usuario_id) {
        const { data: erpU } = await supabase
          .from('erp_usuarios')
          .select('id')
          .eq('email', user.email)
          .is('deleted_at', null)
          .maybeSingle();
        if (erpU?.id) payload.usuario_id = erpU.id;
      }

      // ── Geração de códigos para tabelas de tecido (internalizada) ──
       const tabConfigTecido = ['config_tecido_cor', 'config_tecido_artigo', 'config_tecido_linha_comercial', 'config_tecido_vinculos'];
       if (tabConfigTecido.includes(tabelaFinal)) {
         try {
           if (tabelaFinal === 'config_tecido_vinculos' && !payload.codigo_unico) {
             payload.codigo_unico = await gerarCodigoVinculo(supabase, {
               empresa_id: payload.empresa_id,
               artigo_id: payload.artigo_id,
               cor_tecido_id: payload.cor_tecido_id,
               linha_comercial_id: payload.linha_comercial_id,
               editing_id: payload.editing_id,
             });
           } else if (tabelaFinal === 'config_tecido_cor' && !payload.codigo_cor) {
             payload.codigo_cor = await gerarCodigoTecido(supabase, 'cor', payload.empresa_id);
           } else if (tabelaFinal === 'config_tecido_artigo' && !payload.codigo_artigo) {
             payload.codigo_artigo = await gerarCodigoTecido(supabase, 'artigo', payload.empresa_id);
           } else if (tabelaFinal === 'config_tecido_linha_comercial' && !payload.codigo_linha_comercial) {
             payload.codigo_linha_comercial = await gerarCodigoTecido(supabase, 'linha', payload.empresa_id);
           }

           // ── Validação de unicidade no backend para vinculos ──
           if (tabelaFinal === 'config_tecido_vinculos') {
             const { data: duplicado } = await supabase
               .from('config_tecido_vinculos')
               .select('id, codigo_unico')
               .eq('empresa_id', payload.empresa_id)
               .eq('artigo_id', payload.artigo_id)
               .eq('cor_tecido_id', payload.cor_tecido_id)
               .eq('linha_comercial_id', payload.linha_comercial_id)
               .maybeSingle();

             if (duplicado) {
               throw new Error(`Vínculo duplicado: combinação Artigo + Cor + Linha já existe (${duplicado.codigo_unico})`);
             }
           }
         } catch (codeErr) {
           return Response.json({ error: codeErr.message }, { status: 409 });
         }
       }

      // Validação: impressao em config_personalizacao
      if (tabelaFinal === 'config_personalizacao' && payload.impressao) {
        const opcoesValidas = ["digital", "silkscreen"];
        const invalido = payload.impressao.some(v => !opcoesValidas.includes(v));
        if (invalido) return Response.json({ error: "Valor de impressão inválido" }, { status: 400 });
      }

      // Validação final: rejeita UUIDs claramente inválidos
      for (const [key, val] of Object.entries(payload)) {
        if (key.endsWith('_id') && val && typeof val === 'string' && !isValidUUID(val)) {
          return Response.json({ error: `Campo "${key}" contém UUID inválido: "${val}"` }, { status: 400 });
        }
      }

      const { data, error } = await supabase.from(tabelaFinal).insert(payload).select();

      if (error) {
        console.error('Insert error:', error);
        await registrarSistemaLog(supabase, { empresa_id: payload.empresa_id, usuario_email: user.email, modulo: tabelaFinal, acao: 'INSERT', mensagem_erro: error.message, dados_erro: { code: error.code, details: error.details } });
        return Response.json({ error: `Erro ao salvar dados: ${error.message}` }, { status: 500 });
      }

      const novoRegistro = Array.isArray(data) ? data[0] : data;

      // ── Atualiza estoque_saldo_atual ao inserir movimentação ──
      if (tabelaFinal === 'estoque_movimentacoes' && novoRegistro) {
        const { codigo_unico, quantidade, local_origem_id, local_destino_id, empresa_id: empId } = novoRegistro;
        const qtd = parseFloat(quantidade) || 0;

        const upserts = [];
        if (local_destino_id) {
          upserts.push({ empresa_id: empId, codigo_unico, local_id: local_destino_id, delta: qtd });
        }
        if (local_origem_id) {
          upserts.push({ empresa_id: empId, codigo_unico, local_id: local_origem_id, delta: -qtd });
        }

        for (const u of upserts) {
          // Busca saldo atual
          const { data: saldoRow } = await supabase
            .from('estoque_saldo_atual')
            .select('id, saldo')
            .eq('empresa_id', u.empresa_id)
            .eq('codigo_unico', u.codigo_unico)
            .eq('local_id', u.local_id)
            .maybeSingle();

          const novoSaldo = (parseFloat(saldoRow?.saldo) || 0) + u.delta;

          if (saldoRow?.id) {
            await supabase.from('estoque_saldo_atual')
              .update({ saldo: novoSaldo, updated_at: new Date().toISOString() })
              .eq('id', saldoRow.id);
          } else {
            await supabase.from('estoque_saldo_atual')
              .insert({ empresa_id: u.empresa_id, codigo_unico: u.codigo_unico, local_id: u.local_id, saldo: novoSaldo });
          }
        }
      }

      // Auditoria: 1 linha
      await registrarAuditLog(supabase, {
        usuario_id: user.id, usuario_nome: user.full_name, usuario_email: user.email,
        empresa_id: payload.empresa_id, modulo: 'Sistema', tabela_afetada: tabelaFinal,
        tipo_operacao: 'CREATE', registro_id: novoRegistro?.id,
        dados_novos: novoRegistro,
        descricao: `Criado novo registro em ${tabelaFinal}`
      });

      return Response.json({ data: novoRegistro });
    }

    // ─── UPDATE ──────────────────────────────────────────────────────────────
    if (action === 'update') {
      if (!id || !dadosFinal) return Response.json({ error: '"id" e "dados" são obrigatórios' }, { status: 400 });

      // Validação: impressao em config_personalizacao
      if (tabelaFinal === 'config_personalizacao' && dadosFinal.impressao) {
        const opcoesValidas = ["digital", "silkscreen"];
        const invalido = dadosFinal.impressao.some(v => !opcoesValidas.includes(v));
        if (invalido) return Response.json({ error: "Valor de impressão inválido" }, { status: 400 });
      }

      // Busca anterior e atualiza em paralelo
      const [{ data: registroAnterior }, updateResult] = await Promise.all([
        supabase.from(tabelaFinal).select('*').eq('id', id).maybeSingle(),
        supabase.from(tabelaFinal).update(dadosFinal).eq('id', id).select()
      ]);

      if (updateResult.error) {
        console.error('Update error:', updateResult.error.message);
        await registrarSistemaLog(supabase, { empresa_id, usuario_email: user.email, modulo: tabelaFinal, acao: 'UPDATE', mensagem_erro: updateResult.error.message, dados_erro: { code: updateResult.error.code } });
        return Response.json({ error: `Erro ao atualizar: ${updateResult.error.message}` }, { status: 500 });
      }

      const registroAtualizado = Array.isArray(updateResult.data) ? updateResult.data[0] : updateResult.data;

      // Auditoria: 1 linha com snapshot antes/depois
      await registrarAuditLog(supabase, {
        usuario_id: user.id, usuario_nome: user.full_name, usuario_email: user.email,
        empresa_id, modulo: 'Sistema', tabela_afetada: tabelaFinal,
        tipo_operacao: 'UPDATE', registro_id: id,
        dados_anteriores: registroAnterior || {},
        dados_novos: dadosFinal,
        descricao: `Registro atualizado em ${tabelaFinal}`
      });

      return Response.json({ data: registroAtualizado });
    }

    // ─── DELETE (SOFT DELETE COM BLOQUEIO) ──────────────────────────────────
    if (action === 'delete') {
      if (!id) return Response.json({ error: '"id" é obrigatório' }, { status: 400 });

      // Busca o registro para obter dados antes de bloquear
      const { data: registroAlvo } = await supabase.from(tabelaFinal).select('*').eq('id', id).maybeSingle();

      // Regra 4/5: Verificar uso antes de inativar
      let bloqueio = null;

      // Tabelas de cadastro base: verifica uso em config_vinculos
      if (['config_tecido_artigo','config_tecido_cor','config_tecido_linha_comercial'].includes(tabelaFinal) && registroAlvo) {
        const campoId = tabelaFinal === 'config_tecido_artigo' ? 'artigo_id'
          : tabelaFinal === 'config_tecido_cor' ? 'cor_tecido_id'
          : 'linha_comercial_id';
        const { data: usoVinculo } = await supabase.from('config_vinculos')
          .select('id, codigo_unico').eq(campoId, id).is('deleted_at', null).limit(1);
        if (usoVinculo && usoVinculo.length > 0) {
          bloqueio = `Este cadastro está em uso no Código Único "${usoVinculo[0].codigo_unico}" e não pode ser excluído.`;
        }
      }

      // config_vinculos: verifica uso em nota_fiscal_importada
      if (!bloqueio && tabelaFinal === 'config_vinculos' && registroAlvo?.codigo_unico) {
        try {
          const empId = registroAlvo.empresa_id || empresa_id;
          let nfeQuery = supabase.from('nota_fiscal_importada').select('id, itens');
          if (empId) nfeQuery = nfeQuery.eq('empresa_id', empId);
          const { data: todasNFe, error: nfeErr } = await nfeQuery;

          if (!nfeErr) {
            const emUso = (todasNFe || []).some(nfe => {
              let itens = nfe.itens;
              if (typeof itens === 'string') { try { itens = JSON.parse(itens); } catch { return false; } }
              if (!Array.isArray(itens)) return false;
              return itens.some(item => {
                if (!item) return false;
                let cu = item.codigo_unico;
                if (typeof cu === 'string' && cu.startsWith('{')) {
                  try { cu = JSON.parse(cu)?.codigo_unico || cu; } catch { /* noop */ }
                }
                return cu === registroAlvo.codigo_unico;
              });
            });
            if (emUso) {
              bloqueio = `O Código Único "${registroAlvo.codigo_unico}" já foi utilizado em nota fiscal e não pode ser excluído.`;
            }
          }
        } catch (_) { /* Se falhar a verificação, permite a exclusão */ }
      }

      if (bloqueio) {
        // Regra 7: Loga tentativa bloqueada
        await registrarSistemaLog(supabase, {
          empresa_id, usuario_email: user.email, modulo: tabelaFinal,
          acao: 'DELETE_BLOCKED', mensagem_erro: bloqueio,
          dados_erro: { id, codigo_unico: registroAlvo?.codigo_unico, motivo: bloqueio }, nivel: 'WARN'
        });
        return Response.json({ error: bloqueio, blocked: true }, { status: 409 });
      }

      // Soft delete usando status='inativo' (deleted_at pode ser resetado por trigger)
      const softDeleteData = { status: 'inativo' };
      // Tenta setar deleted_at também (pode ser ignorado por trigger)
      softDeleteData.deleted_at = new Date().toISOString();

      const { error } = await supabase.from(tabelaFinal).update(softDeleteData).eq('id', id);
      if (error) {
        console.error('Soft delete error:', JSON.stringify(error));
        await registrarSistemaLog(supabase, { empresa_id, usuario_email: user.email, modulo: tabelaFinal, acao: 'DELETE', mensagem_erro: error.message, dados_erro: { code: error.code } });
        return Response.json({ error: `Erro ao inativar: ${error.message}` }, { status: 500 });
      }

      await registrarAuditLog(supabase, {
        usuario_id: user.id, usuario_nome: user.full_name, usuario_email: user.email,
        empresa_id, modulo: 'Sistema', tabela_afetada: tabelaFinal,
        tipo_operacao: 'SOFT_DELETE', registro_id: id,
        descricao: `Registro inativado (soft delete) em ${tabelaFinal}`
      });

      return Response.json({ success: true });
    }


    // ─── UPDATE_WHERE (update by arbitrary filter fields) ──────────────────
    if (action === 'update_where') {
      const { where, data: updateData } = body;
      if (!where || !updateData) return Response.json({ error: '"where" e "data" são obrigatórios' }, { status: 400 });
      let q = supabase.from(tabelaFinal).update(updateData);
      for (const [k, v] of Object.entries(where)) q = q.eq(k, v);
      const { error: uwErr } = await q;
      if (uwErr) return Response.json({ error: uwErr.message }, { status: 500 });
      return Response.json({ success: true });
    }

    // ─── LIST AUDIT LOGS ─────────────────────────────────────────────────────
    if (action === 'list_audit_logs') {
      const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(500);
      if (error) throw new Error(error.message);
      return Response.json({ data: data || [] });
    }

    // ─── LIST USUARIOS ATIVOS ─────────────────────────────────────────────────
    if (action === 'list_usuarios_ativos') {
      const { data, error } = await supabase.from('erp_usuarios').select('id, nome, email').eq('status', 'Ativo').order('nome', { ascending: true });
      if (error) throw new Error(error.message);
      return Response.json({ data: data || [] });
    }

    return Response.json({ error: `Ação desconhecida: ${action}` }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});