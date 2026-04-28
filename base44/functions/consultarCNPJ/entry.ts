import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Função para consultar Inscrição Estadual em BrasilAPI
async function consultarInscricaoEstadual(cnpj, estado) {
  try {
    const res = await fetch(`https://api.brasil.io/api/v1/cnpj/${cnpj}/?format=json`);
    if (res.ok) {
      const data = await res.json();
      return {
        inscricao_estadual: data.inscricao_estadual || '',
        situacao_ie: data.situacao_ie || 'Não Contribuinte'
      };
    }
  } catch (_) {}
  
  // Fallback: retorna campo vazio para preenchimento manual
  return {
    inscricao_estadual: '',
    situacao_ie: 'Não Contribuinte'
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cnpj } = await req.json();

    if (!cnpj) {
      return Response.json({ error: 'CNPJ is required' }, { status: 400 });
    }

    // Remover formatação e validar
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) {
      return Response.json({ error: 'Invalid CNPJ format' }, { status: 400 });
    }

    let companyData = null;
    let estado = '';

    // Tentar BrasilAPI primeiro (mais completa)
    try {
      const res = await fetch(`https://api.cnpja.com/office/${cnpjLimpo}`);
      if (res.ok) {
        const data = await res.json();
        estado = data.address?.state || '';
        companyData = {
          nome_transportadora: data.company?.name || data.alias || '',
          nome_fantasia: data.alias || '',
          cnpj: cnpjLimpo,
          endereco: data.address?.street || '',
          numero: data.address?.number || '',
          bairro: data.address?.district || '',
          cidade: data.address?.city || '',
          estado: estado,
          cep: data.address?.zip?.replace(/\D/g, '') || '',
          email: data.emails?.length > 0 ? data.emails[0] : '',
          telefone: data.phones?.length > 0 ? data.phones[0] : '',
          situacao_cadastral: data.status || 'Ativo',
          data_abertura: data.founded_at || '',
          atividade_principal: data.activity?.title || '',
        };
      }
    } catch (_) {
      // Fallback para ReceitaWS
    }

    // Se BrasilAPI não funcionou, tentar ReceitaWS
    if (!companyData) {
      const receita = await fetch(`https://www.receitaws.com.br/v1/cnpj/${cnpjLimpo}`);
      if (receita.ok) {
        const data = await receita.json();
        
        if (data.status === 'OK') {
          estado = data.uf || '';
          companyData = {
            nome_transportadora: data.nome || '',
            nome_fantasia: data.nome_fantasia || '',
            cnpj: cnpjLimpo,
            endereco: data.logradouro || '',
            numero: data.numero || '',
            bairro: data.bairro || '',
            cidade: data.municipio || '',
            estado: estado,
            cep: data.cep?.replace(/\D/g, '') || '',
            email: data.email || '',
            telefone: data.telefone || '',
            situacao_cadastral: data.situacao || 'Ativo',
            data_abertura: data.abertura || '',
            atividade_principal: data.atividade_principal?.text || '',
          };
        }
      }
    }

    if (!companyData) {
      return Response.json({
        success: false,
        error: 'CNPJ not found in public databases',
        dados: { cnpj: cnpjLimpo }
      }, { status: 404 });
    }

    // Consultar Inscrição Estadual
    const ieData = await consultarInscricaoEstadual(cnpjLimpo, estado);

    return Response.json({
      success: true,
      dados: {
        ...companyData,
        ...ieData
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});