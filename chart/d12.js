// chart/d12.js — Câu 12: Phân phối số tiền khách hàng đã chi trả
(() => {
  // Lấy giá trị cột theo VN/EN
  const get = (r, vi, en) => r[vi] ?? r[en] ?? "";

  // Chuyển "Thành tiền" thành số an toàn
  function toNumber(x) {
    if (x == null) return 0;
    const s = String(x).replace(/[^\d.-]/g, "");
    const n = +s;
    return Number.isFinite(n) ? n : 0;
  }

  window.addEventListener("DOMContentLoaded", () => {
    const margin = { top: 10, right: 20, bottom: 40, left: 70 };
    const width  = 800, height = 500;

    const svg = d3.select("#chart12").append("svg")
      .attr("viewBox", [0, 0, width, height]);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const innerW = width  - margin.left - margin.right;
    const innerH = height - margin.top  - margin.bottom;

    d3.csv("data/sales.csv").then(rows => {
      const KH_COL_VI = "Mã khách hàng", KH_COL_EN = "Ma_khach_hang";
      const TIEN_VI   = "Thành tiền",     TIEN_EN   = "Thanh_tien";

      // 1) Tổng chi tiêu theo khách hàng
      const custSpend = d3.rollup(
        rows,
        v => d3.sum(v, r => toNumber(get(r, TIEN_VI, TIEN_EN))),
        r => get(r, KH_COL_VI, KH_COL_EN)
      );

      const spending = Array.from(custSpend.values()).filter(v => v > 0);
      if (spending.length === 0) return;

      // 2) Histogram: bin size 50,000 VND
      const binSize = 50_000;
      const maxVal  = d3.max(spending) || 1;
      const bins = d3.bin()
        .domain([0, maxVal])
        .thresholds(d3.range(0, maxVal + binSize, binSize))(spending);

      // 3) Scales
      const x = d3.scaleLinear()
        .domain([0, maxVal]).nice()
        .range([0, innerW]);

      const y = d3.scaleLinear()
        .domain([0, d3.max(bins, d => d.length) || 1]).nice()
        .range([innerH, 0]);

      // 4) Grid ngang (nhạt) theo Y
      g.append("g")
        .attr("class", "grid-y")
        .call(d3.axisLeft(y).tickSize(-innerW).tickFormat(""))
        .select(".domain").remove();

      // 5) Trục X: tick mỗi 200k, hiển thị dạng “k”
      const xticks = d3.range(0, maxVal + 200_000, 200_000);
      g.append("g")
        .attr("class", "axis axis-x")
        .attr("transform", `translate(0,${innerH})`)
        .call(d3.axisBottom(x).tickValues(xticks).tickFormat(d => `${d/1000}k`).tickSize(0))
        .select(".domain").remove();

      // 6) Trục Y
      g.append("g")
        .attr("class", "axis axis-y")
        .call(d3.axisLeft(y))
        .select(".domain").remove();

      // 7) Vẽ cột histogram
      const bars = g.selectAll("rect.bar")
        .data(bins)
        .join("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.x0))
        .attr("y", d => y(d.length))
        .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
        .attr("height", d => innerH - y(d.length))
        .attr("fill", d3.schemeTableau10[0]);

      // 8) Tooltip (#tooltip — position: fixed)
      const tip = d3.select("#tooltip");
      const fmtK = v => (v/1000).toLocaleString("vi-VN") + "k";

      if (!tip.empty()) {
        bars.on("mouseover", (ev, d) => {
            const from = fmtK(d.x0 || 0);
            const to   = fmtK(d.x1 || 0);
            const html =
              `<div style="font-weight:700;margin-bottom:4px;">Khoảng: ${from} – ${to}</div>` +
              `<div>Số khách hàng: ${d.length.toLocaleString("vi-VN")}</div>`;
            tip.html(html).style("opacity", 1);
          })
          .on("mousemove", ev => {
            tip.style("left", (ev.clientX + 14) + "px")
               .style("top",  (ev.clientY + 12) + "px");
          })
          .on("mouseout", () => tip.style("opacity", 0));
      } else {
        bars.append("title")
          .text(d => `Khoảng: ${fmtK(d.x0||0)} – ${fmtK(d.x1||0)}\nSố KH: ${d.length}`);
      }

      // 9) Nhãn số trên đầu cột (tuỳ chọn)
      g.selectAll("text.val")
        .data(bins)
        .join("text")
        .attr("class", "val")
        .attr("x", d => x(d.x0) + Math.max(0, x(d.x1) - x(d.x0) - 1)/2)
        .attr("y", d => y(d.length) - 4)
        .attr("text-anchor", "middle")
        .text(d => d.length ? d.length.toLocaleString("vi-VN") : "");
    });
  });
})();
