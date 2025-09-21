;(() => {
function toNumber(x) {
  if (x == null) return 0;
  const s = String(x).replace(/[^\d.-]/g, "");
  const n = +s;
  return Number.isFinite(n) ? n : 0;
}
// Nhãn rút gọn dạng "12,7 tr"
function fmtTr(v) {
  return (v / 1e6).toFixed(1).replace(".", ",") + " tr";
}
// Parse ngày linh hoạt (VN/ISO)
function parseDate(raw) {
  if (!raw) return null;
  let d = new Date(raw);
  if (isNaN(d)) {
    const p1 = d3.timeParse("%d/%m/%Y");
    const p2 = d3.timeParse("%Y-%m-%d");
    d = p1(raw) || p2(raw);
  }
  return d && !isNaN(+d) ? d : null;
}

window.addEventListener("DOMContentLoaded", () => {
  const margin = { top: 10, right: 20, bottom: 64, left: 60 };
  const width  = 800, height = 500;

  const svg = d3.select("#chart5").append("svg")
    .attr("viewBox", [0, 0, width, height]);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const innerW = width  - margin.left - margin.right;
  const innerH = height - margin.top  - margin.bottom;

  // tooltip dùng chung (HTML đã có <div id="tooltip">)
  const tip   = d3.select("#tooltip");
  const fmtInt = d3.format(",");

  d3.csv("data/sales.csv").then(rows => {
    // 1) Tổng theo NGÀY (để tính trung bình theo số ngày)
    const byDate = d3.rollup(
      rows,
      v => {
        const d = parseDate(v[0].Thoi_gian_tao_don);
        return {
          doanhThuNgay: d3.sum(v, x => toNumber(x.Thanh_tien)),
          qtyNgay:      d3.sum(v, x => toNumber(x.SL)),
          day:          d ? d.getDate() : null
        };
      },
      r => {
        const d = parseDate(r.Thoi_gian_tao_don);
        return d ? d3.timeFormat("%Y-%m-%d")(d) : "INVALID";
      }
    );

    // 2) Trung bình theo "Ngày XX"
    const byDay = d3.rollup(
      Array.from(byDate.values()).filter(x => x.day != null),
      v => ({
        avgRevenue: d3.mean(v, x => x.doanhThuNgay),
        avgQty:     d3.mean(v, x => x.qtyNgay)
      }),
      x => x.day  // 1..31
    );

    const pad2 = n => String(n).padStart(2, "0");
    const data = Array.from(byDay, ([day, agg]) => ({
      day,
      label: `Ngày ${pad2(day)}`,
      avgRevenue: agg.avgRevenue,
      avgQty:     agg.avgQty
    })).sort((a,b) => d3.ascending(a.day, b.day));

    // 3) Scales
    const x = d3.scaleBand()
      .domain(data.map(d => d.label))
      .range([0, innerW])
      .padding(0.15);

    const yTicks = [0, 5e6, 10e6, 15e6];
    const y = d3.scaleLinear()
      .domain([0, 15e6])
      .range([innerH, 0]);

    // Màu đủ cho 31 ngày (gộp nhiều palette có sẵn)
    const palette = []
      .concat(d3.schemeTableau10)
      .concat(d3.schemeSet3)
      .concat(d3.schemePastel1)
      .concat(d3.schemePastel2);
    const color = d3.scaleOrdinal()
      .domain(x.domain())
      .range(palette.slice(0, x.domain().length));

    // 4) Trục X — bỏ tick line, chia nhãn 2 dòng
    const axX = g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x).tickSize(0));
    axX.select(".domain").remove();

    axX.selectAll(".tick text")
      .style("font-size", "8px")
      .each(function (d) {
        const t = d3.select(this);
        const parts = String(d).split(" ");
        const first = parts[0] || "Ngày";
        const last  = (parts[1] || "").trim();
        t.text(null);
        t.append("tspan").text(first).attr("x", 0).attr("dy", "0.9em");
        t.append("tspan").text(last ).attr("x", 0).attr("dy", "1.1em");
      });

    // 5) Trục Y + grid ngang (nhạt theo CSS)
    const axY = g.append("g")
      .call(d3.axisLeft(y).tickValues(yTicks).tickFormat(d => d/1e6 + "M"));
    axY.select(".domain").remove();
    axY.selectAll("text").style("font-size","9px");

    g.append("g")
      .attr("class", "grid-y")
      .call(d3.axisLeft(y).tickValues(yTicks).tickSize(-innerW).tickFormat(""))
      .select(".domain").remove();

    // 6) Vẽ cột + TOOLTIP
    g.selectAll("rect.bar")
      .data(data)
      .join("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.label))
      .attr("y", d => y(d.avgRevenue))
      .attr("width", x.bandwidth())
      .attr("height", d => innerH - y(d.avgRevenue))
      .attr("fill", d => color(d.label))
      .on("mouseover", (ev, d) => {
        // tooltip dùng position:fixed → clientX/clientY
        tip.style("opacity", 1)
           .html(
             `<div><span style="font-weight:700">${d.label}</span></div>
              <div>Doanh số bán TB: ${fmtTr(d.avgRevenue)}</div>
              <div>SL bán TB: ${fmtInt(Math.round(d.avgQty))} SKUs</div>`
           );
      })
      .on("mousemove", (ev) => {
        tip.style("left", (ev.clientX + 12) + "px")
           .style("top",  (ev.clientY + 12) + "px");
      })
      .on("mouseout", () => tip.style("opacity", 0));

    // 7) Nhãn giá trị: NẰM DỌC, ở TRONG cột gần đỉnh
    g.selectAll("text.val")
      .data(data)
      .join("text")
      .attr("class", "val")
      .style("font-size", "8px")
      .attr("text-anchor", "middle")
      .attr("alignment-baseline", "hanging")
      .attr("x", d => x(d.label) + x.bandwidth()/2)
      .attr("y", d => y(d.avgRevenue) + 4) // +4px để không dính mép
      .attr("transform", d => {
        const cx = x(d.label) + x.bandwidth()/2;
        const cy = y(d.avgRevenue) + 4;
        return `rotate(-90, ${cx}, ${cy})`;
      })
      .text(d => fmtTr(d.avgRevenue))
      .style("font-weight", "bold");
  });
});
})();
