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

window.addEventListener("DOMContentLoaded", () => {
  const margin = { top: 10, right: 100, bottom: 30, left: 200 };
  const width = 800;
  const height = 500;

  let tooltip = d3.select("#tooltip");
  const fmtInt = d3.format(","); // 15,650

  const svg = d3
    .select("#chart1")
    .append("svg")
    .attr("viewBox", [0, 0, width, height]);

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  d3.csv("data/sales.csv").then((rows) => {
    // Chuẩn hoá & lấy thêm SL để tooltip
    const normalized = rows.map((d) => ({
      itemLabel:  `[${d.Ma_mat_hang}] ${d.Ten_mat_hang}`,
      groupLabel: `[${d.Ma_nhom_hang}] ${d.Ten_nhom_hang}`,
      value:      toNumber(d.Thanh_tien),
      qty:        toNumber(d.SL)
    }));

    // Gộp theo mặt hàng: tổng doanh số + tổng SL
    const map = d3.rollup(
      normalized,
      (v) => ({
        value: d3.sum(v, (x) => x.value),
        qty:   d3.sum(v, (x) => x.qty),
        groupLabel: v[0]?.groupLabel || "",
      }),
      (x) => x.itemLabel
    );

    const data = Array.from(map, ([itemLabel, obj]) => ({
      itemLabel,
      groupLabel: obj.groupLabel,
      value: obj.value,
      qty:   obj.qty,
    })).sort((a, b) => d3.descending(a.value, b.value));

    // Scales
    const y = d3
      .scaleBand()
      .domain(data.map((d) => d.itemLabel))
      .range([0, innerH])
      .padding(0.15);

    const x = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.value) || 1])
      .nice()
      .range([0, innerW]);

    // Màu
    const groups = Array.from(new Set(data.map((d) => d.groupLabel)));
    const color = d3.scaleOrdinal().domain(groups).range(d3.schemeTableau10);

    // Axes
    g.append("g")
      .attr("class", "axis axis-y")
      .call(d3.axisLeft(y).tickSize(0).tickPadding(5))
      .select(".domain").remove();

    g.append("g")
      .attr("class", "axis axis-x")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat((d) => d / 1e6 + "M"))
      .select(".domain").remove();

    // Grid dọc
    g.append("g")
      .attr("class", "grid-x")
      .attr("transform", `translate(0,${innerH})`)
      .call(
        d3.axisBottom(x)
          .ticks(5)
          .tickSize(-innerH)
          .tickFormat("")
      );

    // Bars + TOOLTIP events
    g.selectAll("rect.bar")
      .data(data)
      .join("rect")
      .attr("class", "bar")
      .attr("x", 0)
      .attr("y", (d) => y(d.itemLabel))
      .attr("height", y.bandwidth())
      .attr("width", (d) => x(d.value))
      .attr("fill", (d) => color(d.groupLabel))
      .on("mouseover", function (event, d) {
        tooltip
          .style("opacity", 1)
          .html(
            `Mặt hàng: <span style="font-weight:700">${d.itemLabel}</span><br>
            Nhóm hàng: ${d.groupLabel}<br>
            Doanh số bán: ${formatVNDtri(d.value)}<br>
            Số lượng bán: ${fmtInt(d.qty)} SKUs`
        );
      })

      .on("mousemove", function (event) {
        const [mx, my] = d3.pointer(event, document.body);
        tooltip.style("left", (mx + 12) + "px").style("top", (my + 12) + "px");
      })
      .on("mouseout", function () {
        tooltip.style("opacity", 0);
      });

    // Nhãn giá trị ở cuối thanh
    g.selectAll("text.val")
      .data(data)
      .join("text")
      .attr("class", "val")
      .attr("x", (d) => x(d.value) + 4)
      .attr("y", (d) => y(d.itemLabel) + y.bandwidth() / 2)
      .attr("alignment-baseline", "middle")
      .style("font-size", "8px")
      .style("font-weight", "bold")
      .text(d => formatVNDtri(d.value));

    // Legend
    const legend = d3.select("#legend1").attr("class", "legend");
    groups.forEach((gr) => {
      const item = legend.append("div").attr("class", "legend-item");
      item.append("div")
        .attr("class", "legend-color")
        .style("background", color(gr));
      item.append("span")
        .style("font-weight", "bold")
        .text(gr);
    });
  });
});
})(); 
