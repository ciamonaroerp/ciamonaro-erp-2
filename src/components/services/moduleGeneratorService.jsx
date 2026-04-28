import { sanitizeBySchema } from "./baseService";

/**
 * Compila um prompt com estrutura de dados em:
 * 1. JSON Schema (entidades)
 * 2. Service Scaffold
 * 3. Prompt otimizado para IA gerar o módulo
 */
export function compileModuleScaffold({ moduleName, menuPosition, prompt }) {
  // Parse tabelas do prompt (assume formato simples: "Tabela: NomeDaTabela")
  const tableMatches = prompt.match(/tabela[:\s]+([a-záéíóúãõç\w]+)/gi) || [];
  const tables = tableMatches.map((m) =>
    m.replace(/tabela[:\s]+/i, "").trim()
  );

  // Gera JSON Schema básico para cada tabela
  const entities = generateEntitiesSchema(tables, moduleName);

  // Gera Service Scaffold
  const service = generateServiceScaffold(moduleName, tables);

  // Compila prompt final para IA
  const aiPrompt = generateAIPrompt({
    moduleName,
    menuPosition,
    originalPrompt: prompt,
    tables,
    entities,
    service,
  });

  return {
    entities: JSON.stringify(entities, null, 2),
    service,
    aiPrompt,
  };
}

function generateEntitiesSchema(tables, moduleName) {
  const schemas = {};

  tables.forEach((table) => {
    const pascalCaseTable = table
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("");

    schemas[pascalCaseTable] = {
      name: pascalCaseTable,
      type: "object",
      properties: {
        empresa_id: {
          type: "string",
          description: "UUID da empresa (FK → empresas.id)",
        },
        // Placeholder para outras colunas
        descricao: {
          type: "string",
          description: "Descrição",
        },
        status: {
          type: "string",
          enum: ["Ativo", "Inativo"],
          default: "Ativo",
          description: "Status do registro",
        },
      },
      required: ["empresa_id"],
    };
  });

  return schemas;
}

function generateServiceScaffold(moduleName, tables) {
  const camelCaseModule = moduleName
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/^./, (c) => c.toUpperCase());

  const serviceName = `${camelCaseModule}Service`;

  let scaffold = `import { makeService } from "@/components/services/baseService";

// Define quais colunas são permitidas para cada tabela
const SCHEMA_COLUMNS = {
`;

  tables.forEach((table) => {
    const pascalCase = table
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("");
    scaffold += `  ${pascalCase}: ['empresa_id', 'descricao', 'status'],\n`;
  });

  scaffold += `};

// Cria serviços com sanitização automática
export const ${serviceName} = {
`;

  tables.forEach((table) => {
    const pascalCase = table
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("");

    const camelCase = pascalCase.charAt(0).toLowerCase() + pascalCase.slice(1);

    scaffold += `  ${camelCase}: makeService("${table}", SCHEMA_COLUMNS.${pascalCase}),\n`;
  });

  scaffold += `};
`;

  return scaffold;
}

function generateAIPrompt({ moduleName, menuPosition, originalPrompt, tables, entities, service }) {
  return `
TAREFA: Gerar módulo "${moduleName}" para CIAMONARO ERP

CONTEXTO DO MÓDULO:
- Nome: ${moduleName}
- Posição no menu: ${menuPosition}
- Tabelas: ${tables.join(", ")}

REQUISITOS DO USUÁRIO:
${originalPrompt}

ESTRUTURA GERADA (use como base):

1. ENTIDADES (JSON Schema):
${entities}

2. SERVICE SCAFFOLD:
${service}

INSTRUÇÕES PARA GERAR O MÓDULO:

1. Crie as entidades em entities/ (use os schemas acima como base, adapte conforme necessário)

2. Crie o serviço em components/services/ usando o scaffold fornecido

3. Crie a página principal em pages/${moduleName}Page.jsx com:
   - Listagem de registros
   - CRUD (criar, editar, deletar)
   - Filtros e busca
   - Integração com o serviço

4. Use sanitizeBySchema() para validar dados antes de enviar ao backend:
   \`\`\`js
   import { sanitizeBySchema } from "@/components/services/baseService";
   const payload = sanitizeBySchema(formData, COLUNAS_PERMITIDAS);
   \`\`\`

5. Adicione a rota em App.jsx (fora do pagesConfig loop):
   \`\`\`jsx
   <Route path="/${moduleName}Page" element={
     <LayoutWrapper currentPageName="${moduleName}Page">
       <${moduleName}Page />
     </LayoutWrapper>
   } />
   \`\`\`

6. Atualize o menu lateral (layout.js) adicionando no array STATIC_SECTIONS:
   \`\`\`js
   {
     name: "${moduleName}",
     page: "${moduleName}Page",
     icon: IconeQueAchar,
     modulo: "${moduleName}"
   }
   \`\`\`

DESIGN SYSTEM:
- Use componentes shadcn/ui (@/components/ui)
- Tailwind CSS para styling
- Responsivo (mobile + desktop)
- Paleta: azul principal #3B5CCC, cinzas neutros
- Icons: lucide-react

GARANTIAS:
- Todos os dados salvam no Supabase via edge function supabaseCRUD
- Cada tabela tem empresa_id para multi-tenant
- Validação de dados com sanitizeBySchema
- RLS ativado no Supabase (service role bypass via edge function)

`;
}