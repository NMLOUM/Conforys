import Chart from "react-apexcharts";

const LABELS = {
  ACCIDENT:                 "Accident",
  PRESQU_ACCIDENT:          "Presque-accident",
  SITUATION_DANGEREUSE:     "Sit. dangereuse",
  INCIDENT_ENVIRONNEMENTAL: "Environnemental",
};

// Même palette que CONFIGS_TYPE dans IncidentsPage.jsx — une couleur distincte
// par type d'incident, cohérente dans toute l'app.
const COULEURS = {
  ACCIDENT:                 "#DC2626",
  PRESQU_ACCIDENT:          "#EA580C",
  SITUATION_DANGEREUSE:     "#CA8A04",
  INCIDENT_ENVIRONNEMENTAL: "#2E7D32",
};

function TypeChart({ data }) {
  if (!data?.length) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-[#94A3B8]">
        Aucune donnée
      </div>
    );
  }

  const categories = data.map((d) => LABELS[d.name] ?? d.name);
  const values      = data.map((d) => d.value);
  const colors      = data.map((d) => COULEURS[d.name] ?? "#94A3B8");
  // Marge au-dessus de la barre la plus haute pour que son étiquette de valeur
  // (positionnée au-dessus, dataLabels.position: "top") ne soit jamais coupée.
  const yMax = Math.max(1, Math.ceil(Math.max(...values, 1) * 1.3));

  const options = {
    chart: {
      type: "bar",
      toolbar: { show: false },
      animations: { enabled: false },
    },
    plotOptions: {
      bar: {
        horizontal:   false,
        borderRadius: 4,
        distributed:  true,
        columnWidth:  "45%",
        dataLabels:   { position: "top" },
      },
    },
    colors,
    dataLabels: {
      enabled: true,
      offsetY: -18,
      style: { fontSize: "12px", fontWeight: 600, colors: ["#1E293B"] },
      formatter: (v) => (v > 0 ? v : ""),
    },
    legend: { show: false },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks:  { show: false },
      labels: { style: { colors: "#6b7280", fontSize: "11px" } },
    },
    yaxis: {
      labels: { show: false },
      max: yMax,
    },
    grid: {
      show: false,
      padding: { top: 20, left: 8, right: 8 },
    },
    tooltip: {
      custom: ({ dataPointIndex, series }) => {
        const label = categories[dataPointIndex];
        const val   = series[0][dataPointIndex];
        return `<div style="padding:6px 10px;font-size:12px;background:#fff;border:1px solid #E2E8F0;border-radius:6px">
          <span style="font-weight:600;color:#374151">${label}</span><br/>
          <span style="color:#6b7280">${val} incident${val > 1 ? "s" : ""}</span>
        </div>`;
      },
    },
    states: {
      hover:  { filter: { type: "lighten", value: 0.08 } },
      active: { filter: { type: "none" } },
    },
  };

  return (
    <Chart
      type="bar"
      options={options}
      series={[{ name: "Incidents", data: values }]}
      height={200}
    />
  );
}

export default TypeChart;
