;(() => {
function parseDate(raw){
  if(!raw) return null;
  let d = new Date(raw);
  if(isNaN(d)){
    const p1 = d3.timeParse("%d/%m/%Y");
    const p2 = d3.timeParse("%Y-%m-%d");
    d = p1(raw) || p2(raw);
  }
  return d && !isNaN(+d) ? d : null;
}
const pad2      = n => String(n).padStart(2,"0");
const monthLab  = m => `Tháng ${pad2(m)}`;
const fmtPct1   = v => (v*100).toFixed(1).replace(".", ",") + "%"; // 48,7%
const fmtInt    = d3.format(",.0f");

window.addEventListener("DOMContentLoaded", () => {
  const margin = { top: 16, right: 24, bottom: 40, left: 56 };
  const width  = 800, height = 500;

  const svg = d3.select("#chart8").append("svg")
    .attr("viewBox", [0, 0, width, height]);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const innerW = width  - margin.left - margin.right;
  const innerH = height - margin.top  - margin.bottom;

  const tip = d3.select("#tooltip");

  d3.csv("data/sales.csv").then(rows => {
    // Chuẩn hoá: (tháng, groupLabel, orderId)
    const recs = rows.map(r => {
      const d = parseDate(r.Thoi_gian_tao_don);
      return {
        m: d ? (d.getMonth()+1) : null,
        groupLabel: `[${r.Ma_nhom_hang}] ${r.Ten_nhom_hang}`,
        orderId: r.Ma_don_hang ?? ""
      };
    }).filter(x => x.m != null && x.orderId);

    // Tổng đơn DISTINCT theo Tháng
    const totalByMonth = d3.rollup(
      recs,
      v => new Set(v.map(x => x.orderId)).size,
      x => x.m
    );

    // Đơn DISTINCT theo (Tháng, Nhóm)
    const ordersByMonthGroup = d3.rollup(
      recs,
      v => new Set(v.map(x => x.orderId)).size,
      x => x.m,
      x => x.groupLabel
    );

    // Domain tháng & nhãn
    const months = Array.from(new Set(recs.map(x => x.m))).sort(d3.ascending);
    const monthLabels = months.map(monthLab);

    // Domain nhóm
    const groups = Array.from(new Set(recs.map(x => x.groupLabel))).sort(d3.ascending);

    // Series theo nhóm
    const series = groups.map(gr => ({
      key: gr,
      values: months.map(m => {
        const orders = (ordersByMonthGroup.get(m)?.get(gr)) ?? 0;
        const total  = totalByMonth.get(m) ?? 0;
        const prob   = total > 0 ? orders/total : null;
        return { m, label: monthLab(m), orders, prob, key: gr };
      })
    }));

    // ---------- scales ----------
    const x = d3.scalePoint()
      .domain(monthLabels)
      .range([0, innerW])
      .padding(0.5);

    // Y: 20%..70%, bước 5%
    const y = d3.scaleLinear()
      .domain([0.20, 0.70])
      .range([innerH, 0]);

    const yTicks = d3.range(20, 71, 5).map(d => d/100);

    const color = d3.scaleOrdinal()
      .domain(groups)
      .range(d3.schemeTableau10);

    // ---------- axes & grids ----------
    // Trục X
    const axX = g.append("g")
      .attr("class", "axis axis-x")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x));
    axX.select(".domain").remove();

    // Grid dọc (theo từng tháng)
    g.append("g")
      .attr("class", "grid-x")
      .attr("transform", `translate(0,${innerH})`)
      .call(
        d3.axisBottom(x)
          .tickValues(monthLabels)
          .tickSize(-innerH)
          .tickFormat("")
      )
      .select(".domain").remove();

    // Trục Y (tick 5%)
    const axY = g.append("g")
      .attr("class", "axis axis-y")
      .call(d3.axisLeft(y).tickValues(yTicks).tickFormat(d3.format(".0%")));
    axY.select(".domain").remove();

    // ---------- draw ----------
    const line = d3.line()
      .defined(d => d.prob != null)
      .x(d => x(monthLab(d.m)))
      .y(d => y(d.prob));

    const grp = g.selectAll(".series")
      .data(series)
      .join("g")
      .attr("class", "series");

    // Line
    grp.append("path")
      .attr("fill", "none")
      .attr("stroke-width", 2)
      .attr("stroke", d => color(d.key))
      .attr("d", d => line(d.values));

    // Marker
    grp.selectAll("circle.pt")
      .data(d => d.values)
      .join("circle")
      .attr("class", "pt")
      .attr("r", 2)
      .attr("cx", d => x(d.label))
      .attr("cy", d => y(d.prob))
      .attr("fill", d => color(d.key))
      .style("cursor", "pointer")
      .on("mouseover", (ev, d) => {
        tip.style("opacity", 1)
           .html(
             `<div style="font-weight:700">
                ${d.label} | Nhóm hàng ${d.key}
              </div>
              <div>SL Đơn bán: ${fmtInt(d.orders)}</div>
              <div>Xác suất Bán: ${fmtPct1(d.prob)}</div>`
           );
      })
      .on("mousemove", (ev) => {
        // dùng clientX/clientY cho tooltip fixed
        tip.style("left", (ev.clientX + 14) + "px")
           .style("top",  (ev.clientY + 12) + "px");
      })
      .on("mouseout", () => tip.style("opacity", 0));

    // ---------- LEGEND (HTML #legend8) ----------
    const legend = d3.select("#legend8").attr("class","legend"); // dùng CSS .legend/.legend-item/.legend-color của bạn
    legend.selectAll(".legend-item")
      .data(groups)
      .join("div")
      .attr("class","legend-item")
      .each(function(gr){
        const row = d3.select(this);
        row.append("div").attr("class","legend-color").style("background", color(gr));
        row.append("span").text(gr);  // có thể rút gọn nếu cần
      });
  });
});
})();
