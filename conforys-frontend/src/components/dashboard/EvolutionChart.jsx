import Chart from "react-apexcharts";

const TYPE_CONFIG = {
  ACCIDENT:                 { label: "Accident",          couleur: "#C0392B" },
  PRESQU_ACCIDENT:          { label: "Presque-accident",  couleur: "#EF6C00" },
  SITUATION_DANGEREUSE:     { label: "Sit. dangereuse",   couleur: "#F9A825" },
  INCIDENT_ENVIRONNEMENTAL: { label: "Environnemental",   couleur: "#1976D2" },
};

const TYPES = Object.keys(TYPE_CONFIG);

function EvolutionChart({ data }) {
  if (!data?.length) {
    return (
      <div className="flex items-center justify-center h-56 text-sm text-[#94A3B8]">
        Aucune donnée
      </div>
    );
  }

  const categories = data.map((d) => d.mois);

  const series = TYPES.map((t) => ({
    name: TYPE_CONFIG[t].label,
    data: data.map((d) => d[t] ?? 0),
  }));

  const colors = TYPES.map((t) => TYPE_CONFIG[t].couleur);

  const options = {
    chart: {
      type:    "area",
      stacked: true,
      toolbar: { show: false },
      animations: { enabled: false },
      zoom: { enabled: false },
    },
    colors,
    stroke: {
      curve: "smooth",
      width: 2,
    },
    fill: {
      type:    "solid",
      opacity: 0.12,
    },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks:  { show: false },
      labels: {
        style: { colors: "#9ca3af", fontSize: "11px" },
      },
    },
    yaxis: {
      labels: {
        style:     { colors: "#9ca3af", fontSize: "11px" },
        formatter: (v) => Math.round(v),
      },
      min: 0,
    },
    grid: {
      borderColor: "#f1f5f9",
      strokeDashArray: 4,
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
      padding: { left: 0, right: 0 },
    },
    dataLabels: { enabled: false },
    legend: {
      show:          true,
      position:      "bottom",
      horizontalAlign: "center",
      fontSize:      "11px",
      fontFamily:    "inherit",
      labels:        { colors: "#6b7280" },
      markers:       { width: 10, height: 10, radius: 2 },
      itemMargin:    { horizontal: 10 },
    },
    tooltip: {
      shared:    true,
      intersect: false,
      style:     { fontSize: "12px" },
      x:         { show: true },
      y: {
        formatter: (val) => `${val} incident${val > 1 ? "s" : ""}`,
      },
    },
    markers: {
      size:        0,
      hover:       { size: 4 },
    },
  };

  return (
    <Chart
      type="area"
      options={options}
      series={series}
      height={240}
    />
  );
}

export default EvolutionChart;
