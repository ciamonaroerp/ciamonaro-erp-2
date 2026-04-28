import React from "react";

const fmt = (v) => v ? parseFloat(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "0,00";

const Section = ({ title, children }) => (
  <div className="mb-5">
    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 border-b border-slate-200 pb-1">{title}</h3>
    {children}
  </div>
);

const Field = ({ label, value }) => (
  <div>
    <span className="text-xs text-slate-500">{label}</span>
    <p className="text-sm font-medium text-slate-800 mt-0.5">{value || "—"}</p>
  </div>
);

export default function NFePreview({ data, readOnly }) {
  if (!data) return null;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-0 text-sm">

      <Section title="Identificação da Nota">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Número NF" value={data.numero} />
          <Field label="Série" value={data.serie} />
          <Field label="Data de Emissão" value={data.data_emissao} />
          <Field label="Data Saída/Entrada" value={data.data_entrada_saida} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <Field label="Chave DANFE" value={data.chave} />
          <Field label="Valor Total da NF" value={data.valor_total ? `R$ ${fmt(data.valor_total)}` : null} />
        </div>
      </Section>

      <Section title="Dados do Emitente">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="CNPJ" value={data.emitente_cnpj} />
          <Field label="Razão Social" value={data.emitente_nome} />
          <Field label="Endereço" value={data.emitente_endereco} />
        </div>
      </Section>

      <Section title="Dados do Destinatário">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="CNPJ / CPF" value={data.destinatario_documento} />
          <Field label="Razão Social" value={data.destinatario_nome} />
          <Field label="Endereço" value={data.destinatario_endereco} />
        </div>
      </Section>

      {data.itens?.length > 0 && (
        <Section title={`Itens da Nota (${data.itens.length})`}>
          <div className="space-y-2">
            {data.itens.map((it, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-lg p-3 text-xs">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm break-words">{it.descricao}</p>
                    <p className="text-slate-400 font-mono mt-0.5">Cód: {it.codigo} · NCM: {it.ncm}</p>
                  </div>
                  <span className="font-bold text-slate-800 whitespace-nowrap">R$ {fmt(it.valor_total)}</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-slate-600">
                  <div><span className="text-slate-400 block">CFOP</span>{it.cfop}</div>
                  <div><span className="text-slate-400 block">Qtd</span>{it.quantidade}</div>
                  <div><span className="text-slate-400 block">Un</span>{it.unidade}</div>
                  <div><span className="text-slate-400 block">Vl. Unit.</span>R$ {fmt(it.valor_unitario)}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Impostos">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="ICMS" value={`R$ ${fmt(data.impostos?.icms)}`} />
          <Field label="IPI" value={`R$ ${fmt(data.impostos?.ipi)}`} />
          <Field label="PIS" value={`R$ ${fmt(data.impostos?.pis)}`} />
          <Field label="COFINS" value={`R$ ${fmt(data.impostos?.cofins)}`} />
        </div>
      </Section>

      {data.duplicatas?.length > 0 && (
        <Section title="Condições de Pagamento">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-slate-200 rounded overflow-hidden">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Duplicata</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Vencimento</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-700">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.duplicatas.map((dup, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono">{dup.numero}</td>
                    <td className="px-3 py-2">{dup.vencimento}</td>
                    <td className="px-3 py-2 text-right font-semibold">R$ {fmt(dup.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  );
}