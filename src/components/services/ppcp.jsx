import { apiRequest } from "./api";

export function listarOrdens() {
  return apiRequest("/ppcp/ordens");
}