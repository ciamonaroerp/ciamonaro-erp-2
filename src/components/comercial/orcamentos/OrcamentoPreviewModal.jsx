import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Download, Printer } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function OrcamentoPreviewModal({ html, codigo, onClose }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    if (iframeRef.current && html) {
      const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow.document;
      doc.open();
      doc.write(html);
      doc.close();
    }
  }, [html]);

  const handleImprimir = () => {
    if (iframeRef.current) {
      iframeRef.current.contentWindow.print();
    }
  };

  const handleBaixarPDF = async () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const body = iframe.contentDocument?.body;
    if (!body) return;

    const canvas = await html2canvas(body, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = (canvas.height * pdfW) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);
    pdf.save(`Orcamento_${codigo || "documento"}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 shrink-0 shadow-sm">
        <span className="font-semibold text-slate-800 text-sm">
          Pré-visualização — Orçamento {codigo || ""}
        </span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-2" onClick={handleBaixarPDF}>
            <Download className="h-4 w-4" /> Baixar PDF
          </Button>
          <Button size="sm" variant="outline" className="gap-2" onClick={handleImprimir}>
            <Printer className="h-4 w-4" /> Imprimir
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose} className="gap-1 text-slate-500">
            <X className="h-4 w-4" /> Fechar
          </Button>
        </div>
      </div>

      {/* Preview iframe */}
      <div className="flex-1 overflow-auto bg-slate-100 p-6 flex justify-center">
        <div className="w-full max-w-4xl bg-white shadow-xl rounded-md overflow-hidden">
          <iframe
            ref={iframeRef}
            title="preview-orcamento"
            style={{ width: "100%", height: "100%", minHeight: "80vh", border: "none" }}
          />
        </div>
      </div>
    </div>
  );
}