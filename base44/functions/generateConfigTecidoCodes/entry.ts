import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('VITE_SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_KEY')
);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { type, empresa_id, artigo_id, cor_tecido_id, linha_comercial_id } = payload;

    if (!type || !empresa_id) {
      return Response.json({ error: 'type e empresa_id são obrigatórios' }, { status: 400 });
    }

    // Calcula dígito verificador
    const calcularDigitoVerificador = (codigo) => {
      const soma = codigo.split('').reduce((acc, digit) => acc + parseInt(digit), 0);
      return (soma % 10).toString();
    };

    if (type === 'vinculo') {
      if (!artigo_id || !cor_tecido_id || !linha_comercial_id) {
        return Response.json({ error: 'artigo_id, cor_tecido_id e linha_comercial_id são obrigatórios para vínculo' }, { status: 400 });
      }

      // Busca os códigos das entidades diretamente no Supabase
      const [artigoRes, corRes, linhaRes] = await Promise.all([
        supabase.from('config_tecido_artigo').select('codigo_artigo').eq('id', artigo_id).eq('empresa_id', empresa_id).single(),
        supabase.from('config_tecido_cor').select('codigo_cor').eq('id', cor_tecido_id).eq('empresa_id', empresa_id).single(),
        supabase.from('config_tecido_linha_comercial').select('codigo_linha_comercial').eq('id', linha_comercial_id).eq('empresa_id', empresa_id).single(),
      ]);

      const codigoArtigo = artigoRes.data?.codigo_artigo;
      const codigoCor = corRes.data?.codigo_cor;
      const codigoLinha = linhaRes.data?.codigo_linha_comercial;

      if (!codigoArtigo || !codigoCor || !codigoLinha) {
        console.error('Erros ao buscar dados:', artigoRes.error, corRes.error, linhaRes.error);
        return Response.json({ error: 'Não foi possível recuperar os códigos das entidades relacionadas' }, { status: 400 });
      }

      // Verifica duplicata de combinação (artigo + cor + linha)
      const { data: existente } = await supabase
        .from('config_tecido_vinculos')
        .select('id, codigo_unico')
        .eq('empresa_id', empresa_id)
        .eq('artigo_id', artigo_id)
        .eq('cor_tecido_id', cor_tecido_id)
        .eq('linha_comercial_id', linha_comercial_id)
        .maybeSingle();

      // Se existente e não é edição do mesmo registro
      if (existente && existente.id !== payload.editing_id) {
        return Response.json({
          error: 'Esta combinação de Artigo + Cor + Linha Comercial já existe.',
          codigo_unico: null,
          duplicata: true,
          existente_id: existente.id,
          existente_codigo: existente.codigo_unico,
        }, { status: 409 });
      }

      const codigoGerado = codigoArtigo + codigoCor + codigoLinha;

      return Response.json({ codigo_unico: codigoGerado });
    } else {
      return Response.json({ error: 'Tipo inválido' }, { status: 400 });
    }
  } catch (error) {
    console.error('[generateConfigTecidoCodes] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});