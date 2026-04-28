import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const PPCP_APP_ID = "69a2f4545268c38305d0e9f9";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Ler usuários do APP-PPCP via SDK com app_id diferente
    const ppcpResponse = await fetch(
      `https://api.base44.com/api/apps/${PPCP_APP_ID}/entities/User/`,
      {
        headers: {
          "app-id": PPCP_APP_ID,
          "api-key": Deno.env.get("BASE44_API_KEY") || "",
          "Content-Type": "application/json"
        }
      }
    );

    if (!ppcpResponse.ok) {
      const err = await ppcpResponse.text();
      return Response.json({ error: `Erro ao buscar usuários do PPCP: ${err}` }, { status: 500 });
    }

    const ppcpUsers = await ppcpResponse.json();

    // Ler ErpUsuarios existentes neste app
    const erpUsers = await base44.asServiceRole.entities.ErpUsuarios.list();
    const erpEmails = new Set(erpUsers.map(u => u.email?.toLowerCase()));

    let criados = 0;
    let ignorados = 0;

    for (const u of ppcpUsers) {
      if (!u.email) continue;
      if (erpEmails.has(u.email.toLowerCase())) {
        ignorados++;
        continue;
      }

      // Mapear role do PPCP para perfil ERP
      const perfilMap = {
        admin: "Administrador",
        ppcp: "PPCP",
        vendedor: "Comercial",
        logistica: "Logística",
        financeiro: "Financeiro",
        compras: "Compras",
        estoque: "Estoque"
      };
      const perfil = perfilMap[(u.role || "").toLowerCase()] || "PPCP";

      await base44.asServiceRole.entities.ErpUsuarios.create({
        nome: u.full_name || u.email,
        email: u.email,
        perfil: perfil,
        status: "Ativo",
        modulo_origem: "PPCP / FabricaFit",
        modulos_autorizados: ["PPCP"]
      });
      criados++;
    }

    return Response.json({
      criados,
      ignorados,
      total: ppcpUsers.length
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});