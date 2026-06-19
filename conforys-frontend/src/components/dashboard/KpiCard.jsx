function KpiCard({ label, value, sub, subColor, valueColor = "#0D2B4E", accentColor = "#0D2B4E" }) {
  return (
    <div
      className="bg-white rounded-lg p-5 flex flex-col justify-between"
      style={{ minHeight: "108px", border: "1px solid #E2E8F0", borderLeft: `4px solid ${accentColor}` }}
    >
      <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">{label}</p>
      <p className="text-[34px] font-bold leading-none" style={{ color: valueColor }}>{value ?? "—"}</p>
      <p className={`text-[12px] ${subColor || "text-[#94A3B8]"}`}>{sub || " "}</p>
    </div>
  );
}

export default KpiCard;
