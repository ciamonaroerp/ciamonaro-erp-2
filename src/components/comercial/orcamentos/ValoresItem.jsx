function fmtMoeda(v) {
  let n;
  if (typeof v === "number") {
    n = v;
  } else {
    n = parseFloat(String(v).replace(/\./g, "").replace(",", ".")) || 0;
  }
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ValoresItem({ item }) {
  if (!item) return null;

  const valorUnitario = fmtMoeda(item?.valor_unitario || 0);
  const subtotal = fmtMoeda(item?.subtotal || 0);

  return (
    <div className="border border-slate-200 rounded-lg p-4 space-y-3">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Valores</h3>
      <div className="grid grid-cols-[1fr_auto] gap-4 items-center text-sm">
        <span className="text-slate-500">Valor Unitário</span>
        <span className="font-medium font-mono text-right whitespace-nowrap w-[120px]">R$ {valorUnitario}</span>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-4 items-center text-sm font-semibold border-t pt-2">
        <span>Subtotal</span>
        <span className="text-blue-700 font-mono text-right whitespace-nowrap w-[120px]">R$ {subtotal}</span>
      </div>
    </div>
  );
}