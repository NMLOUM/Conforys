import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";

const TYPE_CONFIG = {
  ACCIDENT:                 { label: "Accident",          couleur: "#C0392B" },
  PRESQU_ACCIDENT:          { label: "Presque-accident",  couleur: "#EF6C00" },
  SITUATION_DANGEREUSE:     { label: "Sit. dangereuse",   couleur: "#F9A825" },
  INCIDENT_ENVIRONNEMENTAL: { label: "Environnemental",   couleur: "#1976D2" },
};

const TYPES = Object.keys(TYPE_CONFIG);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value || 0), 0);
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-xs shadow-sm min-w-36">
      <p className="font-semibold text-gray-700 mb-1.5">{label}</p>
      {payload.map((p) => p.value > 0 && (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm" style={{ background: p.fill }} />
            <span className="text-gray-500">{TYPE_CONFIG[p.dataKey]?.label || p.dataKey}</span>
          </div>
          <span className="font-medium text-gray-700">{p.value}</span>
        </div>
      ))}
      <div className="border-t border-gray-100 mt-1.5 pt-1.5 flex justify-between">
        <span className="text-gray-500">Total</span>
        <span className="font-semibold text-navy">{total}</span>
      </div>
    </div>
  );
};

const CustomLegend = () => (
  <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2">
    {TYPES.map((t) => (
      <div key={t} className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: TYPE_CONFIG[t].couleur }} />
        <span className="text-xs text-gray-500">{TYPE_CONFIG[t].label}</span>
      </div>
    ))}
  </div>
);

function EvolutionChart({ data }) {
  return (
    <>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barSize={14}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis
            dataKey="mois"
            tick={{ fontSize: 11, fill: "#9CA3AF" }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "#9CA3AF" }}
            axisLine={false} tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F8FAFC" }} />
          {TYPES.map((t) => (
            <Bar
              key={t}
              dataKey={t}
              stackId="a"
              fill={TYPE_CONFIG[t].couleur}
              radius={t === "INCIDENT_ENVIRONNEMENTAL" ? [3, 3, 0, 0] : [0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <CustomLegend />
    </>
  );
}

export default EvolutionChart;
