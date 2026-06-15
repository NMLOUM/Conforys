import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COULEURS = {
  FAIBLE:   "#2E7D32",
  MOYEN:    "#F9A825",
  GRAVE:    "#EF6C00",
  CRITIQUE: "#C0392B",
};

const ORDRE = ["CRITIQUE", "GRAVE", "MOYEN", "FAIBLE"];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs shadow-sm">
      <p className="font-medium text-gray-700">{payload[0].name}</p>
      <p className="text-gray-500">{payload[0].value} incident(s)</p>
    </div>
  );
};

const CustomLegend = ({ payload }) => (
  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
    {payload.map((entry) => (
      <div key={entry.value} className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: entry.color }} />
        <span className="text-xs text-gray-500">{entry.value}</span>
      </div>
    ))}
  </div>
);

function GraviteChart({ data }) {
  const sorted = ORDRE
    .map((g) => data.find((d) => d.name === g))
    .filter(Boolean);

  if (!sorted.length) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-400">
        Aucune donnée
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={sorted}
          cx="50%"
          cy="45%"
          innerRadius={55}
          outerRadius={88}
          dataKey="value"
          nameKey="name"
          paddingAngle={2}
          strokeWidth={0}
        >
          {sorted.map((entry) => (
            <Cell key={entry.name} fill={COULEURS[entry.name] || "#9ca3af"} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend content={<CustomLegend />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default GraviteChart;
