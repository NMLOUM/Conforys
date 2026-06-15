function KpiCard({ label, value, sub, color = "text-navy", icon }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide leading-tight">
          {label}
        </p>
        {icon && (
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-50">
            {icon}
          </div>
        )}
      </div>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 -mt-1">{sub}</p>}
    </div>
  );
}

export default KpiCard;
