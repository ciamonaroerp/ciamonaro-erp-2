import { APP_VERSION, APP_ENV } from "@/config/version";

export default function SystemVersion() {
  return (
    <span style={{ fontSize: "11px", opacity: 0.5, letterSpacing: "0.02em" }}>
      ERP v{APP_VERSION} | {APP_ENV}
    </span>
  );
}