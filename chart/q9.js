;(() => {
function toNumber(x) {
  if (x == null) return 0;
  const n = +String(x).replace(/[^\d.-]/g, "");
  return Number.isFinite(n) ? n : 0;
}
const fmtInt = d3.format(",.0f");
const fmtPct0 = d3.format(".0%");             // 0.083 -> "8%"
const pctText = p => fmtPct0(p);              // nhãn rút gọn "8%"

window.addEventListener("DOMContentLoaded", () => {
  // layout các panel trong #chart9
  const host = d3.select("#chart9");
  const grid = host.append("div")
    .attr("class", "q9-grid")
    .style("display", "grid")
    .style("grid-template-columns", "repeat(auto-fit, minmax(320px, 1fr))")
    .style("gap", "16px");

  // style nhẹ cho panel (không đụng css chung của bạn)
  const style = document.createElement("style");
  style.textContent = `
    .q9-panel{ border:1px solid #ddd; border-radius:8px; padding:10px; }
    .q9-title{ font-weight:700; margin:0 0 6px 0; font-size:13px; }
    .q9-svg{ width:100%; height:auto; }
    .q9-axis text{ font-size:10px; font-weight:700 }
    .q9-grid-x line{ stroke:#ccc; stroke-opacity:.35; shape-rendering:crispEdges }
    .q9-grid-x path{ stroke-width:0 }
    .q9-bar{ rx:3px }
    .q9-val{ font-size:8px; font-weight:700 }
  `;
  document.head.appendChild(style);

  // cấu hình domain/trục theo nhóm
  const GROUP_CFG = {
    "[BOT] Bột":             { title: "[BOT] Bột",             max: 1.00, step: 0.20 },
    "[SET] Set trà":         { title: "[SET] Set trà",         max: 0.15, step: 0.05 },
    "[THO] Trà hoa":         { title: "[THO] Trà hoa",         max: 0.20, step: 0.05 },
    "[TMX] Trà mix":         { title: "[TMX] Trà mix",         max: 0.35, step: 0.10 },
    "[TTC] Trà củ, quả sấy": { title: "[TTC] Trà củ, quả sấy", max: 0.52, step: 0.10 },
  };

  d3.csv("data/sales.csv").then(rows => {
    // gom SL theo item & group
    const byItem = d3.rollups(
      rows,
      v => ({
        sl: d3.sum(v, d => toNumber(d.SL)),
        itemLabel: `[${v[0].Ma_mat_hang}] ${v[0].Ten_mat_hang}`,
        groupLabel: `[${v[0].Ma_nhom_hang}] ${v[0].Ten_nhom_hang}`,
      }),
      d => `${d.Ma_nhom_hang}|${d.Ten_nhom_hang}`,        // khóa group
      d => `${d.Ma_mat_hang}|${d.Ten_mat_hang}`           // khóa item
    );

    // build map: group -> [{itemLabel, groupLabel, sl}]
    const groupMap = new Map();
    for (const [gKey, items] of byItem) {
      const [maN, tenN] = gKey.split("|");
      const groupLabel = `[${maN}] ${tenN}`;
      const arr = items.map(([iKey, info]) => ({
        itemLabel: info.itemLabel,
        groupLabel,
        sl: info.sl
      }));
      groupMap.set(groupLabel, arr);
    }

    const tip = d3.select("#tooltip");

    // vẽ từng panel
    for (const [groupLabel, arr] of groupMap) {
      const cfg = GROUP_CFG[groupLabel];
      if (!cfg) continue; // chỉ vẽ 5 nhóm được chỉ định

      const totalSL = d3.sum(arr, d => d.sl) || 1;
      const data = arr.map(d => ({
        itemLabel: d.itemLabel,
        groupLabel: d.groupLabel,
        sl: d.sl,
        p: d.sl / totalSL
      }))
      .sort((a,b) => d3.descending(a.p, b.p));

      const panel = grid.append("div").attr("class", "q9-panel");
      panel.append("h4").attr("class","q9-title").text(`Xác suất bán hàng của Mặt hàng — ${cfg.title}`);

      // kích thước nội bộ 1 panel
      const margin = { top: 6, right: 48, bottom: 24, left: 160 };
      const W = 420, H = 220;
      const innerW = W - margin.left - margin.right;
      const innerH = H - margin.top - margin.bottom;

      const svg = panel.append("svg")
        .attr("class","q9-svg")
        .attr("viewBox", [0,0,W,H]);

      const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

      // scales
      const y = d3.scaleBand()
        .domain(data.map(d => d.itemLabel))
        .range([0, innerH])
        .padding(0.18);

      const x = d3.scaleLinear()
        .domain([0, cfg.max])
        .range([0, innerW]);

      const ticks = d3.range(0, cfg.max + 1e-9, cfg.step);

      // màu THEO TỪNG MẶT HÀNG trong panel
      const color = d3.scaleOrdinal()
        .domain(data.map(d => d.itemLabel))
        .range(d3.schemeTableau10.concat(d3.schemeSet3)); // đủ dài, tự lặp nếu cần

      // axes
      g.append("g")
        .attr("class","q9-axis")
        .call(d3.axisLeft(y).tickSize(0).tickPadding(5))
        .select(".domain").remove();

      g.append("g")
        .attr("class","q9-axis")
        .attr("transform", `translate(0,${innerH})`)
        .call(d3.axisBottom(x).tickValues(ticks).tickFormat(v => fmtPct0(v)).tickSize(0))
        .select(".domain").remove();

      // grid dọc chỉ ở tick
      g.append("g")
        .attr("class","q9-grid-x")
        .attr("transform", `translate(0,${innerH})`)
        .call(d3.axisBottom(x).tickValues(ticks).tickSize(-innerH).tickFormat(""));

      // bars (mỗi item 1 màu)
      g.selectAll(".q9-bar")
        .data(data)
        .join("rect")
        .attr("class","q9-bar")
        .attr("x", 0)
        .attr("y", d => y(d.itemLabel))
        .attr("height", y.bandwidth())
        .attr("width", d => x(d.p))
        .attr("fill", d => color(d.itemLabel))
        .on("mousemove", function (event, d) {
          tip
            .style("opacity", 1)
            .style("left", (event.clientX + 12) + "px")
            .style("top",  (event.clientY + 12) + "px")
            .html(
              `<div>Mặt hàng: <b>${d.itemLabel}</b></div>
               <div>Nhóm hàng: ${d.groupLabel}</div>
               <div>SL đơn bán: ${fmtInt(d.sl)}</div>
               <div>Xác suất Bán / Nhóm hàng: ${pctText(d.p)}</div>`
            );
        })
        .on("mouseleave", () => tip.style("opacity", 0));

      // value labels ngoài cột (rút gọn 8%)
      g.selectAll(".q9-val")
        .data(data)
        .join("text")
        .attr("class","q9-val")
        .attr("x", d => x(d.p) + 4)
        .attr("y", d => y(d.itemLabel) + y.bandwidth()/2)
        .attr("alignment-baseline","middle")
        .text(d => pctText(d.p));
    }
  });
});
})();
