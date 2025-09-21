;(() => {
function formatVNDtri(v) {
  return d3.format(",.0f")(v / 1e6) + " triệu VND";
}
function toNumber(x) {
  if (x == null) return 0;
  const s = String(x).replace(/[^\d.-]/g, "");
  const n = +s;
  return Number.isFinite(n) ? n : 0;
}
function monthFrom(row) {
  const raw = row.Thoi_gian_tao_don;
  if (!raw) return null;
  let d = new Date(raw);
  if (isNaN(d)) {
    const p1 = d3.timeParse("%d/%m/%Y");
    const p2 = d3.timeParse("%Y-%m-%d");
    d = p1(raw) || p2(raw);
  }
  return d ? (d.getMonth() + 1) : null; // 1..12
}

window.addEventListener("DOMContentLoaded", () => {
  const margin = { top: 10, right: 40, bottom: 40, left: 60 };
  const width  = 800, height = 500;

  const svg = d3.select("#chart3").append("svg")
    .attr("viewBox", [0, 0, width, height]);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  // tooltip chung
  const tip   = d3.select("#tooltip");
  const fmtInt = d3.format(",");

  d3.csv("data/sales.csv").then(rows => {
    const pad2 = n => String(n).padStart(2, "0");
    const labelOf = m => `Tháng ${pad2(m)}`;

    // Tổng theo THÁNG: cả doanh thu và số lượng
    const roll = d3.rollup(
      rows,
      v => ({
        value: d3.sum(v, d => toNumber(d.Thanh_tien)),
        qty:   d3.sum(v, d => toNumber(d.SL))
      }),
      d => monthFrom(d)
    );

    const data = Array.from(roll, ([m, agg]) => ({
      m,
      label: labelOf(m),
      value: agg.value,
      qty:   agg.qty
    }))
    .filter(d => d.m != null)
    .sort((a,b) => d3.ascending(a.m, b.m)); // Tháng tăng dần

    // Scales
    const x = d3.scaleBand()
      .domain(data.map(d => d.label))
      .range([0, innerW])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, 800e6])   // tối đa 800M
      .range([innerH, 0]);

    // Màu: theo từng tháng
    const color = d3.scaleOrdinal()
      .domain(x.domain())
      .range(d3.schemeTableau10);

    // Trục X
    g.append("g")
      .attr("class", "axis axis-x")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x))
      .select(".domain").remove();

    // Trục Y (0..800M, bước 200M)
    const yTicks = [0, 200e6, 400e6, 600e6, 800e6];
    g.append("g")
      .attr("class", "axis axis-y")
      .call(d3.axisLeft(y).tickValues(yTicks).tickFormat(d => d/1e6 + "M"))
      .select(".domain").remove();

    // GRID NGANG theo Y
    g.append("g")
      .attr("class", "grid-y")
      .call(d3.axisLeft(y).tickValues(yTicks).tickSize(-innerW).tickFormat(""));

    // Cột + TOOLTIP
    g.selectAll("rect.bar")
      .data(data)
      .join("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.label))
      .attr("y", d => y(d.value))
      .attr("width", x.bandwidth())
      .attr("height", d => innerH - y(d.value))
      .attr("fill", d => color(d.label))
      .on("mouseover", (ev, d) => {
        tip.style("opacity", 1).html(
          `<div><span style="font-weight:700">${d.label}</span></div>
           <div>Doanh số bán: ${formatVNDtri(d.value)}</div>
           <div>Số lượng bán: ${fmtInt(d.qty)} SKUs</div>`
        );
      })
      .on("mousemove", (ev) => {
        // position: fixed => dùng clientX/clientY
        tip.style("left", (ev.clientX + 12) + "px")
           .style("top",  (ev.clientY + 12) + "px");
      })
      .on("mouseout", () => tip.style("opacity", 0));

    // Nhãn giá trị trên đầu cột
    g.selectAll("text.val")
      .data(data)
      .join("text")
      .attr("class", "val")
      .attr("x", d => x(d.label) + x.bandwidth()/2)
      .attr("y", d => y(d.value) - 4)
      .attr("text-anchor", "middle")
      .text(d => formatVNDtri(d.value))
      .style("font-weight", "bold");
  });
});
})();
