import Chart from "react-apexcharts";

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
  const label   = labelScore(score);

  const options = {
    chart: {
      type:    "radialBar",
      toolbar: { show: false },
      animations: { enabled: false },
      sparkline: { enabled: true },
    },
    plotOptions: {
      radialBar: {
        startAngle: -90,
        endAngle:    90,
        track: {
          background:  "#F1F5F9",
          strokeWidth: "100%",
          margin:       4,
        },
        dataLabels: {
          name: {
            show:     true,
            color:    "#9ca3af",
            fontSize: "11px",
            offsetY:  16,
            formatter: () => label,
          },
          value: {
            show:      true,
            color:     couleur,
            fontSize:  "26px",
            fontWeight: 700,
            offsetY:   -12,
            formatter: (v) => `${Math.round(v)}%`,
          },
        },
        hollow: {
          size: "58%",
        },
      },
    },
    colors:     [couleur],
    stroke:     { lineCap: "round" },
    labels:     [label],
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <Chart
        type="radialBar"
        options={options}
        series={[score]}
        height={130}
        width={160}
      />
    </div>
  );
}

export default ScoreGauge;
