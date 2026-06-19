import Chart from "react-apexcharts";

const COULEURS = {
  CRITIQUE: "#C0392B",
  GRAVE:    "#EF6C00",
  MOYEN:    "#F9A825",
  FAIBLE:   "#2E7D32",
};

const ORDRE = ["CRITIQUE", "GRAVE", "MOYEN", "FAIBLE"];

function GraviteChart({ data, selected, onSelect }) {
  const sorted = ORDRE.map((g) => data.find((d) => d.name === g)).filter(Boolean);

  if (!sorted.length) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-[#94A3B8]">
        Aucune donnée
      </div>
    );
  }

  const labels  = sorted.map((d) => d.name);
  const series  = sorted.map((d) => d.value);
  const colors  = sorted.map((d) => COULEURS[d.name] ?? "#9ca3af");
  const opacity = sorted.map((d) => (!selected || selected === d.name ? 1 : 0.25));

  const options = {
    chart: {
      type: "donut",
      animations: { enabled: false },
      toolbar: { show: false },
      events: {
        dataPointSelection: (_e, _ctx, config) => {
          const name = sorted[config.dataPointIndex]?.name;
          if (name) onSelect?.(selected === name ? null : name);
        },
      },
    },
    labels,
    colors,
    fill:   { opacity },
    stroke: { width: 0 },
    plotOptions: {
      pie: {
        donut: {
          size: "62%",
          labels: { show: false },
        },
        expandOnClick: false,
      },
    },
    dataLabels: { enabled: false },
    legend:     { show: false },
    tooltip: {
      custom: ({ seriesIndex }) => {
        const d = sorted[seriesIndex];
        return `<div style="padding:6px 10px;font-size:12px;background:#fff;border:1px solid #E2E8F0;border-radius:6px">
          <span style="font-weight:600;color:#374151">${d.name}</span><br/>
          <span style="color:#6b7280">${d.value} incident${d.value > 1 ? "s" : ""}</span>
        </div>`;
      },
    },
    states: {
      hover:  { filter: { type: "none" } },
      active: { filter: { type: "none" } },
    },
  };

  return (
    <div>
      <Chart type="donut" options={options} series={series} height={200} />

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
            <span className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ background: COULEURS[entry.name] }} />
            <span className="text-[#64748B]">{entry.name}</span>
            <span className="font-semibold text-[#1E293B]">{entry.value}</span>
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
