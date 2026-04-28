import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle } from 'lucide-react';

/**
 * Valida a combinação situacao_ie + inscricao_estadual.
 * Retorna mensagem de erro ou null.
 */
export function validateIE(situacao_ie, inscricao_estadual) {
  if (!situacao_ie) {
    return 'Selecione a Situação IE.';
  }
  if (situacao_ie === 'Contribuinte Ativo' && !inscricao_estadual?.trim()) {
    return 'Informe o número da Inscrição Estadual.';
  }
  return null;
}

/**
 * Componente reutilizável para campos IE (Inscrição Estadual + Situação IE)
 * com validação de contribuinte ativo.
 *
 * Props:
 *   formData     - objeto com inscricao_estadual e situacao_ie
 *   onChange     - fn(campo, valor)
 *   ieError      - string de erro (opcional)
 */
export default function IEValidationFields({ formData, onChange, ieError }) {
  const ieRequired = formData.situacao_ie === 'Contribuinte Ativo';

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="text-sm font-medium text-slate-900 block mb-1">
          Inscrição Estadual{ieRequired && <span className="text-red-500 ml-1">*</span>}
        </label>
        <Input
          value={formData.inscricao_estadual || ""}
          onChange={(e) => onChange('inscricao_estadual', e.target.value)}
          placeholder={ieRequired ? "Obrigatório — Contribuinte Ativo" : "000.000.000.000"}
          className={ieError ? 'border-red-500 focus-visible:ring-red-300' : ''}
        />
        {ieError && (
          <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
            <AlertCircle className="h-3 w-3 shrink-0" />
            {ieError}
          </p>
        )}
      </div>
      <div>
        <label className="text-sm font-medium text-slate-900 block mb-1">Situação IE <span className="text-red-500">*</span></label>
        <Select
          value={formData.situacao_ie || ""}
          onValueChange={(v) => onChange('situacao_ie', v)}
        >
          <SelectTrigger className="border-amber-400 text-amber-600">
            <SelectValue placeholder="⚠ Seleção Obrigatória" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Contribuinte Ativo">Contribuinte Ativo</SelectItem>
            <SelectItem value="Não Contribuinte">Não Contribuinte</SelectItem>
            <SelectItem value="Contribuinte Isento">Contribuinte Isento</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}