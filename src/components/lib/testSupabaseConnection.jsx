import { getSupabase } from "@/components/context/SupabaseAuthContext";

export async function testarSupabase() {
  const client = await getSupabase();
  const { data, error } = await client
    .from("erp_usuarios")
    .select("*")
    .limit(1);

  if (error) {
    console.error("Erro na conexão Supabase:", error);
  } else {
    console.log("Supabase conectado com sucesso:", data);
  }
}