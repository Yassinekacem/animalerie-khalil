"use client";

import { getVilles, gouvernorats } from "@/lib/tunisia-locations";

export default function LocationSelects({ gouvernorat, ville, onChange, inputClass, required = false }: {
  gouvernorat: string;
  ville: string;
  onChange: (location: { gouvernorat: string; ville: string }) => void;
  inputClass: string;
  required?: boolean;
}) {
  return <>
    <label className="min-w-0 text-sm font-semibold text-gray-800">
      Gouvernorat {required ? "*" : "(facultatif)"}
      <select name="gouvernorat" required={required} value={gouvernorat} className={inputClass}
        onChange={event => onChange({ gouvernorat: event.target.value, ville: "" })}>
        <option value="">Sélectionnez un gouvernorat</option>
        {gouvernorats.map(value => <option key={value} value={value}>{value}</option>)}
      </select>
    </label>
    <label className="min-w-0 text-sm font-semibold text-gray-800">
      Ville {required ? "*" : "(facultatif)"}
      <select name="ville" required={required || Boolean(gouvernorat)} disabled={!gouvernorat}
        value={ville} className={inputClass} onChange={event => onChange({ gouvernorat, ville: event.target.value })}>
        <option value="">{gouvernorat ? "Sélectionnez une ville" : "Sélectionnez d’abord un gouvernorat"}</option>
        {getVilles(gouvernorat).map(value => <option key={value} value={value}>{value}</option>)}
      </select>
    </label>
  </>;
}
