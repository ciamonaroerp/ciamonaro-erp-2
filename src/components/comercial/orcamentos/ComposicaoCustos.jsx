import { Label } from "@/components/ui/label";

function fmtMoeda(v) {
  let n;
  if (typeof v === "number") {
    n = v;
  } else {
    n = parseFloat(String(v).replace(/\./g, "").replace(",", ".")) || 0;
  }
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseJsonb(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (typeof v === "string") { try { return JSON.parse(v); } catch { return []; } }
  return [];
}

export default function ComposicaoCustos({ item, grupo }) {
  if (!item) return null;

  // Para produto composto, soma custo_un de todos os índices do grupo
  const custoTecidos = Array.isArray(grupo) && grupo.length > 1
    ? grupo.reduce((acc, reg) => acc + (parseFloat(reg.custo_un) || 0), 0)
    : parseFloat(item?.custo_un) || 0;

  // custo_acabamento: usa o campo calculado se existir, senão deriva do JSONB de acabamentos
  let custAcabamento = parseFloat(item?.custo_acabamento) || 0;
  if (custAcabamento === 0) {
    const acabJsonb = parseJsonb(item?.acabamentos);
    custAcabamento = acabJsonb.reduce((acc, a) => acc + (parseFloat(a?.valor) || 0), 0);
  }

  // soma_itens_adicionais: usa o campo calculado se existir, senão deriva do JSONB
  let somaItensAdicionais = parseFloat(item?.soma_itens_adicionais) || 0;
  if (somaItensAdicionais === 0) {
    const adicionaisJsonb = parseJsonb(item?.itens_adicionais);
    somaItensAdicionais = adicionaisJsonb.reduce((acc, a) => acc + (parseFloat(a?.valor) || 0), 0);
  }

  // custo_personalizacao: usa o campo calculado se existir, senão deriva do JSONB de personalizacoes
  let valorPers2Digital = parseFloat(item?.custo_personalizacao) || 0;
  if (valorPers2Digital === 0) {
    const persJsonb = parseJsonb(item?.personalizacoes);
    valorPers2Digital = persJsonb.reduce((acc, p) => acc + (parseFloat(p?.valor) || 0), 0);
  }

  const valorPers1Operacional = parseFloat(item?.valor_personalizacao) || 0;

  // Filtra apenas custos > 0
  const custos = [
    { label: "Custo de Tecidos", valor: custoTecidos },
    { label: "Acabamentos", valor: custAcabamento },
    { label: "Itens Adicionais", valor: somaItensAdicionais },
    { label: "Valor da Personalização 1 - Operacional", valor: valorPers1Operacional },
    { label: "Valor da Personalização 2 - Digital", valor: valorPers2Digital },
  ].filter(c => c.valor > 0);

  // Se não há custos, exibe mensagem
  if (custos.length === 0) {
    return (
      <div className="border border-slate-200 rounded-lg p-4 space-y-2">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Composição de Custos
        </h3>
        <p className="text-xs text-slate-400">Nenhum custo adicional selecionado</p>
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-lg p-4 space-y-2">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
        Composição de Custos
      </h3>
      <div className="space-y-3 text-sm">
        {custos.map((custo, idx) => (
          <div key={idx} className="grid grid-cols-[1fr_auto] gap-4 items-center">
            <span className="text-slate-500">{custo.label}</span>
            <span className="font-medium font-mono text-right whitespace-nowrap w-[120px]">
              R$ {fmtMoeda(custo.valor)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}