"use client";

interface Props {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
  helper?: string;
  fallbackLabel?: string; // e.g. "Your agent brand color is used if this is blank"
  allowClear?: boolean;
}

const PRESETS = [
  "#b8965a", // brand gold (default)
  "#0f172a", // navy
  "#0ea5e9", // sky blue
  "#10b981", // emerald
  "#ef4444", // red
  "#f59e0b", // amber
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#14b8a6", // teal
  "#dc2626", // brick
];

export default function BrandColorPicker({
  value,
  onChange,
  label = "Brand color",
  helper,
  fallbackLabel,
  allowClear = true,
}: Props) {
  const safeValue = value && /^#[0-9A-Fa-f]{6}$/.test(value) ? value : "#b8965a";

  return (
    <div>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      )}
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={safeValue}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-16 cursor-pointer rounded-md border border-gray-300 bg-white p-1"
          aria-label="Pick a brand color"
        />
        <input
          type="text"
          value={value || ""}
          onChange={(e) => {
            const v = e.target.value.trim();
            if (v === "" || /^#?[0-9a-fA-F]*$/.test(v)) {
              onChange(v.startsWith("#") || v === "" ? v : `#${v}`);
            }
          }}
          maxLength={7}
          placeholder={fallbackLabel ? "Use agent default" : "#b8965a"}
          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-mono text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
        />
        {allowClear && value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            Clear
          </button>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {PRESETS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            style={{ backgroundColor: c }}
            className={`h-7 w-7 rounded-md border transition-transform hover:scale-110 ${
              value?.toLowerCase() === c.toLowerCase()
                ? "border-gray-900 ring-2 ring-offset-1"
                : "border-gray-200"
            }`}
            aria-label={`Use ${c}`}
          />
        ))}
      </div>
      {helper && <p className="mt-1.5 text-xs text-gray-500">{helper}</p>}
      {fallbackLabel && !value && (
        <p className="mt-1 text-xs text-gray-400">{fallbackLabel}</p>
      )}
    </div>
  );
}
