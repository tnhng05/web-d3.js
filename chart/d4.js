;(() => {
function toNumber(x) {
  if (x == null) return 0;
  const s = String(x).replace(/[^\d.-]/g, "");
  const n = +s;
  return Number.isFinite(n) ? n : 0;
}

// 11,896,250 → "11,896,250"
const fmtVND = d3.format(",.0f");
const fmtInt = d3.format(",");

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

const weekdayOrder = [1,2,3,4,5,6,0]; // Thứ Hai..Chủ Nhật
const weekdayName  = (i) => ["Chủ Nhật","Thứ Hai","Thứ Ba","Thứ Tư","Thứ Năm","Thứ Sáu","Thứ Bảy"][i];

window.addEventListener("DOMContentLoaded", () => {
  const margin = { top: 10, right: 20, bottom: 40, left: 60 };
  const width  = 800, height = 500;

  const svg = d3.select("#chart4").append("svg")
    .attr("viewBox", [0, 0, width, height]);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const innerW = width  - margin.left - margin.right;
  const innerH = height - margin.top  - margin.bottom;

  // Tooltip chung
  const tip = d3.select("#tooltip");

  d3.csv("data/sales.csv").then(rows => {
    // 1) Tổng theo từng ngày
    const byDate = d3.rollup(
      rows,
      v => {
        const d = parseDate(v[0].Thoi_gian_tao_don);
        return {
          revenue: d3.sum(v, x => toNumber(x.Thanh_tien)),
          qty:     d3.sum(v, x => toNumber(x.SL)),
          weekday: d ? d.getDay() : null
        };
      },
      r => {
        const d = parseDate(r.Thoi_gian_tao_don);
        return d ? d3.timeFormat("%Y-%m-%d")(d) : "INVALID";
      }
    );

    // 2) Trung bình theo thứ
    const byWeekday = d3.rollup(
      Array.from(byDate.values()).filter(x => x.weekday != null),
      v => ({
        avgRevenue: d3.mean(v, x => x.revenue),
        avgQty:     d3.mean(v, x => x.qty)
      }),
      x => x.weekday
    );

    // 3) Chuẩn hoá + sắp xếp (Thứ Hai -> Chủ Nhật)
    const data = Array.from(byWeekday, ([w, agg]) => ({
      weekdayIdx: w,
      weekday:    weekdayName(w),
      avgRevenue: agg.avgRevenue,
      avgQty:     agg.avgQty
    })).sort((a,b) =>
      d3.ascending(weekdayOrder.indexOf(a.weekdayIdx), weekdayOrder.indexOf(b.weekdayIdx))
    );

    // 4) Scales
    const x = d3.scaleBand()
      .domain(data.map(d => d.weekday))
      .range([0, innerW])
      .padding(0.25);

    const yTicks = [0, 5e6, 10e6, 15e6];
    const y = d3.scaleLinear()
      .domain([0, 15e6])
      .range([innerH, 0]);

    // Màu theo thứ
    const color = d3.scaleOrdinal()
      .domain(x.domain())
      .range(d3.schemeTableau10);

    // 5) Trục + grid (nhạt theo CSS .grid-y)
    g.append("g")
      .attr("class", "axis axis-x")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x))
      .select(".domain").remove();

    g.append("g")
      .attr("class", "axis axis-y")
      .call(d3.axisLeft(y).tickValues(yTicks).tickFormat(d => d/1e6 + "M"))
      .select(".domain").remove();

    g.append("g")
      .attr("class", "grid-y")
      .call(d3.axisLeft(y).tickValues(yTicks).tickSize(-innerW).tickFormat(""));

    // 6) Vẽ cột + TOOLTIP (clientX/clientY vì #tooltip dùng position:fixed)
    g.selectAll("rect.bar")
      .data(data)
      .join("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.weekday))
      .attr("y", d => y(d.avgRevenue))
      .attr("width", x.bandwidth())
      .attr("height", d => innerH - y(d.avgRevenue))
      .attr("fill", d => color(d.weekday))
      .on("mouseover", (ev, d) => {
        tip.style("opacity", 1)
           .html(
             `<div><span style="font-weight:700">${d.weekday}</span></div>
              <div>Doanh số bán TB: ${fmtVND(d.avgRevenue)} VND</div>
              <div>SL bán TB: ${fmtInt(Math.round(d.avgQty))} SKUs</div>`
           );
      })
      .on("mousemove", (ev) => {
        tip.style("left", (ev.clientX + 12) + "px")
           .style("top",  (ev.clientY + 12) + "px");
      })
      .on("mouseout", () => tip.style("opacity", 0));

    // 7) Nhãn trên đầu cột
    g.selectAll("text.val")
      .data(data)
      .join("text")
      .attr("class", "val")
      .attr("x", d => x(d.weekday) + x.bandwidth()/2)
      .attr("y", d => y(d.avgRevenue) - 4)
      .attr("text-anchor", "middle")
      .text(d => fmtVND(d.avgRevenue) + " VNĐ")
      .style("font-weight", "bold");
  });
});
})();
