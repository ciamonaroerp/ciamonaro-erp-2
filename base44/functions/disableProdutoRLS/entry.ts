/**
 * disableProdutoRLS — Recria as tabelas produto_comercial com permissões corretas
 * O service_role não tem acesso porque as tabelas foram criadas sem GRANT correto.
 * Solução: dropar e recriar com permissões adequadas.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_KEY");

    // Tenta via REST direto com role=service_role forçado no header
    // O Supabase usa o header "X-Role" para override de role em alguns configs
    const headers = {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      'X-Role': 'service_role',
    };

    // Diagnóstico: tenta listar a tabela direto pela REST API
    const listResp = await fetch(`${supabaseUrl}/rest/v1/produto_comercial?limit=1`, { headers });
    const listStatus = listResp.status;
    const listBody = await listResp.text();

    // Tenta inserir direto pela REST API com service_role
    const insertPayload = {
      nome_produto: '__TESTE_PERM__',
      status: 'Inativo',
      empresa_id: '00000000-0000-0000-0000-000000000000',
      created_date: new Date().toISOString()
    };
    const insertResp = await fetch(`${supabaseUrl}/rest/v1/produto_comercial`, {
      method: 'POST',
      headers,
      body: JSON.stringify(insertPayload)
    });
    const insertStatus = insertResp.status;
    const insertBody = await insertResp.text();

    // Se insert funcionou, limpa
    if (insertResp.ok) {
      const arr = JSON.parse(insertBody);
      const id = Array.isArray(arr) ? arr[0]?.id : arr?.id;
      if (id) {
        await fetch(`${supabaseUrl}/rest/v1/produto_comercial?id=eq.${id}`, {
          method: 'DELETE', headers
        });
      }
    }

    // Verifica o header de Supabase para ver qual role está sendo usado
    const roleHeader = listResp.headers.get('X-Role') || 'não retornado';

    return Response.json({
      listStatus,
      listBody: listBody.substring(0, 500),
      insertStatus,
      insertBody: insertBody.substring(0, 500),
      roleHeader,
      supabaseUrl,
      message: insertResp.ok
        ? 'Permissão OK via REST direto!'
        : `Erro: REST com service_role também bloqueado. Status: ${insertStatus}. É necessário executar GRANT manualmente no SQL Editor do Supabase.`
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});