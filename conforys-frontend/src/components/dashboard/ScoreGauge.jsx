import { PieChart, Pie, Cell } from "recharts";

function couleurScore(score) {
  if (score >= 80) return "#2E7D32";
  if (score >= 50) return "#EF6C00";
  return "#C0392B";
}

function labelScore(score) {
  if (score >= 80) return "Bon";
  if (score >= 50) return "Moyen";
  return "Critique";
}

function ScoreGauge({ score = 0 }) {
  const couleur = couleurScore(score);
  const data = [
    { value: score },
    { value: 100 - score },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="relative">
        <PieChart width={160} height={90}>
          <Pie
            data={data}
            cx={75}
            cy={80}
            startAngle={180}
            endAngle={0}
            innerRadius={52}
            outerRadius={72}
            dataKey="value"
            strokeWidth={0}
            paddingAngle={1}
          >
            <Cell fill={couleur} />
            <Cell fill="#F1F5F9" />
          </Pie>
        </PieChart>
        {/* Valeur centrée sur la jauge */}
        <div className="absolute inset-0 flex items-end justify-center pb-1">
          <div className="text-center">
            <p className="text-2xl font-bold leading-none" style={{ color: couleur }}>
              {score}%
            </p>
          </div>
        </div>
      </div>
      <p className="text-xs font-semibold mt-1" style={{ color: couleur }}>
        {labelScore(score)}
      </p>
    </div>
  );
}

export default ScoreGauge;
