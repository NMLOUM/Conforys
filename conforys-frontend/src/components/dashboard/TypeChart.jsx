import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const LABELS = {
  ACCIDENT:                 "Accident",
  PRESQU_ACCIDENT:          "Presque-accident",
  SITUATION_DANGEREUSE:     "Sit. dangereuse",
  INCIDENT_ENVIRONNEMENTAL: "Environnemental",
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs shadow-sm">
      <p className="font-medium text-gray-700">{LABELS[label] || label}</p>
      <p className="text-gray-500">{payload[0].value} incident(s)</p>
    </div>
  );
};

function TypeChart({ data }) {
  const formatted = data.map((d) => ({ ...d, label: LABELS[d.name] || d.name }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={formatted}
        layout="vertical"
        margin={{ top: 0, right: 24, left: 8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fontSize: 11, fill: "#6b7280" }}
          axisLine={false}
          tickLine={false}
          width={112}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22}>
          {formatted.map((_, i) => (
            <Cell key={i} fill="#0D2B4E" fillOpacity={1 - i * 0.15} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default TypeChart;
