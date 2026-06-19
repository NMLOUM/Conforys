import Chart from "react-apexcharts";

const LABELS = {
  ACCIDENT:                 "Accident",
  PRESQU_ACCIDENT:          "Presque-accident",
  SITUATION_DANGEREUSE:     "Sit. dangereuse",
  INCIDENT_ENVIRONNEMENTAL: "Environnemental",
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
  const values     = data.map((d) => d.value);

  // Dégradé navy : barre la plus longue → navy plein, les autres plus clairs
  const maxVal  = Math.max(...values, 1);
  const colors  = values.map((v) => {
    const ratio   = 0.45 + 0.55 * (v / maxVal);
    const channel = Math.round(13 * ratio);   // composante R du navy #0D2B4E
    return `rgba(${channel}, ${Math.round(43 * ratio)}, ${Math.round(78 * ratio)}, 1)`;
  });

  const options = {
    chart: {
      type: "bar",
      toolbar: { show: false },
      animations: { enabled: false },
    },
    plotOptions: {
      bar: {
        horizontal:   true,
        borderRadius: 4,
        distributed:  true,
        barHeight:    "55%",
      },
    },
    colors,
    dataLabels: { enabled: false },
    legend:     { show: false },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks:  { show: false },
      labels: {
        style:  { colors: "#9ca3af", fontSize: "11px" },
        formatter: (v) => (Number.isInteger(v) ? v : ""),
      },
    },
    yaxis: {
      labels: {
        style: { colors: "#6b7280", fontSize: "11px" },
        maxWidth: 120,
      },
    },
    grid: {
      borderColor:    "#f1f5f9",
      xaxis:          { lines: { show: true } },
      yaxis:          { lines: { show: false } },
      padding:        { left: 0, right: 8 },
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
