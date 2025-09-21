// chart/d2.js — Câu 2: Doanh số bán hàng theo Nhóm hàng
(() => {
  function formatVNDtri(v) { return d3.format(",.0f")(v / 1e6) + " triệu VND"; }
  function toNumber(x) {
    if (x == null) return 0;
    const n = +String(x).replace(/[^\d.-]/g, "");
    return Number.isFinite(n) ? n : 0;
  }

  window.addEventListener("DOMContentLoaded", () => {
    const margin = { top: 10, right: 80, bottom: 30, left: 160 };
    const width  = 800;
    const height = 500;

    const svg = d3.select("#chart2").append("svg")
      .attr("viewBox", [0, 0, width, height]);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const innerW = width  - margin.left - margin.right;
    const innerH = height - margin.top  - margin.bottom;

    // Tooltip (đồng bộ tên biến với chart 1)
    const tip    = d3.select("#tooltip");
    const fmtInt = d3.format(",");

    d3.csv("data/sales.csv").then(rows => {
      // 1) Tổng theo nhóm: doanh số + số lượng
      const grouped = d3.rollup(
        rows,
        v => ({
          value: d3.sum(v, d => toNumber(d.Thanh_tien)),
          qty:   d3.sum(v, d => toNumber(d.SL))
        }),
        d => `[${d.Ma_nhom_hang}] ${d.Ten_nhom_hang}`
      );

      // 2) Mảng dữ liệu + sort giảm dần
      const data = Array.from(grouped, ([groupLabel, agg]) => ({
        groupLabel, value: agg.value, qty: agg.qty
      })).sort((a, b) => d3.descending(a.value, b.value));

      // 3) Scales
      const y = d3.scaleBand()
        .domain(data.map(d => d.groupLabel))
        .range([0, innerH])
        .padding(0.2);

      const maxVal = d3.max(data, d => d.value) || 1;
      const x = d3.scaleLinear()
        .domain([0, maxVal]).nice()
        .range([0, innerW]);

      // Tick 500M: 0, 500M, 1000M, ...
      const step = 5e8;
      const tickVals = d3.range(0, Math.ceil(maxVal / step) * step + step, step);

      // Màu
      const color = d3.scaleOrdinal()
        .domain(data.map(d => d.groupLabel))
        .range(d3.schemeTableau10);

      // 4) Trục & grid
      g.append("g").attr("class", "axis axis-y")
        .call(d3.axisLeft(y).tickSize(0).tickPadding(5))
        .select(".domain").remove();

      g.append("g").attr("class", "axis axis-x")
        .attr("transform", `translate(0,${innerH})`)
        .call(d3.axisBottom(x).tickValues(tickVals).tickFormat(d => d / 1e6 + "M"))
        .select(".domain").remove();

      g.append("g").attr("class", "grid-x")
        .attr("transform", `translate(0,${innerH})`)
        .call(d3.axisBottom(x).tickValues(tickVals).tickSize(-innerH).tickFormat(""));

      // 5) Bars + TOOLTIP
      g.selectAll("rect.bar")
        .data(data)
        .join("rect")
        .attr("class", "bar")
        .attr("x", 0)
        .attr("y", d => y(d.groupLabel))
        .attr("height", y.bandwidth())
        .attr("width", d => x(d.value))
        .attr("fill", d => color(d.groupLabel))
        .on("mouseover", (ev, d) => {
          tip.style("opacity", 1).html(
            `<div><span>Nhóm hàng:&nbsp;</span><span style="font-weight:700">${d.groupLabel}</span></div>` +
            `<div>Doanh số bán:&nbsp; ${formatVNDtri(d.value)}</div>` +
            `<div>Số lượng bán:&nbsp; ${fmtInt(d.qty)} SKUs</div>`
          );
        })
        .on("mousemove", ev => {
          // Vì bạn đang để tooltip position: fixed; dùng clientX/Y là mượt nhất
          tip.style("left", (ev.clientX + 14) + "px")
             .style("top",  (ev.clientY + 12) + "px");
        })
        .on("mouseout", () => tip.style("opacity", 0));

      // 6) Nhãn giá trị
      g.selectAll("text.val")
        .data(data)
        .join("text")
        .attr("class", "val")
        .attr("x", d => x(d.value) + 4)
        .attr("y", d => y(d.groupLabel) + y.bandwidth() / 2)
        .attr("alignment-baseline", "middle")
        .style("font-size", "8px")
        .style("font-weight", "bold")
        .text(d => formatVNDtri(d.value));
    });
  });
})();
