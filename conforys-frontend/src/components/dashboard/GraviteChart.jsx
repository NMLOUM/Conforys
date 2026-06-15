import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

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

function GraviteChart({ data, selected, onSelect }) {
  const sorted = ORDRE.map((g) => data.find((d) => d.name === g)).filter(Boolean);

  if (!sorted.length) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-400">
        Aucune donnée
      </div>
    );
  }

  const handleClick = (_, index) => {
    const gravite = sorted[index]?.name;
    onSelect?.(selected === gravite ? null : gravite);
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={sorted}
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={80}
            dataKey="value"
            nameKey="name"
            paddingAngle={2}
            strokeWidth={0}
            onClick={handleClick}
            style={{ cursor: "pointer" }}
          >
            {sorted.map((entry) => (
              <Cell
                key={entry.name}
                fill={COULEURS[entry.name] || "#9ca3af"}
                opacity={selected && selected !== entry.name ? 0.3 : 1}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Légende cliquable */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 mt-1">
        {sorted.map((entry) => (
          <button
            key={entry.name}
            onClick={() => onSelect?.(selected === entry.name ? null : entry.name)}
            className={`flex items-center gap-1.5 text-xs transition-opacity ${
              selected && selected !== entry.name ? "opacity-30" : "opacity-100"
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: COULEURS[entry.name] }} />
            <span className="text-gray-600">{entry.name}</span>
            <span className="font-semibold text-gray-800">{entry.value}</span>
          </button>
        ))}
      </div>

      {selected && (
        <p className="text-center text-xs text-navy font-medium mt-2 cursor-pointer hover:underline"
           onClick={() => onSelect?.(null)}>
          ✕ Effacer le filtre
        </p>
      )}
    </div>
  );
}

export default GraviteChart;
