// chart/d11.js — Câu 11: Phân phối mức độ mua lặp lại của khách hàng
(() => {
  // Lấy giá trị cột theo tiếng Việt / tiếng Anh
  const get = (r, vi, en) => r[vi] ?? r[en] ?? "";

  window.addEventListener("DOMContentLoaded", () => {
    const margin = { top: 10, right: 20, bottom: 40, left: 60 };
    const width  = 800, height = 500;

    const svg = d3.select("#chart11").append("svg")
      .attr("viewBox", [0, 0, width, height]);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const innerW = width  - margin.left - margin.right;
    const innerH = height - margin.top  - margin.bottom;

    d3.csv("data/sales.csv").then(rows => {
      // 1) Gom đơn hàng duy nhất theo KH
      const KH_COL = ["Mã khách hàng", "Ma_khach_hang"];
      const DH_COL = ["Mã đơn hàng", "Ma_don_hang"];

      const custToOrders = new Map(); // kh -> Set(ma_don)
      rows.forEach(r => {
        const kh = get(r, KH_COL[0], KH_COL[1]);
        const dh = get(r, DH_COL[0], DH_COL[1]);
        if (!kh || !dh) return;
        if (!custToOrders.has(kh)) custToOrders.set(kh, new Set());
        custToOrders.get(kh).add(dh);
      });

      // 2) Đếm số lần mua (số đơn) -> phân phối tần suất số KH
      const freq = new Map(); // repeatCount -> số KH
      custToOrders.forEach(setOrders => {
        const cnt = setOrders.size;
        freq.set(cnt, (freq.get(cnt) || 0) + 1);
      });

      const data = Array.from(freq, ([repeat, customers]) => ({
        repeat: +repeat,
        customers: +customers
      })).sort((a, b) => d3.ascending(a.repeat, b.repeat));

      // 3) Scales
      const x = d3.scaleBand()
        .domain(data.map(d => d.repeat))
        .range([0, innerW])
        .padding(0.2);

      const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.customers) || 1]).nice()
        .range([innerH, 0]);

      // 4) Grid ngang (nhạt) theo Y
      g.append("g")
        .attr("class", "grid-y")
        .call(d3.axisLeft(y).tickSize(-innerW).tickFormat(""))
        .select(".domain").remove();

      // 5) Trục
      g.append("g")
        .attr("class", "axis axis-x")
        .attr("transform", `translate(0,${innerH})`)
        .call(d3.axisBottom(x).tickSize(0))
        .select(".domain").remove();

      g.append("g")
        .attr("class", "axis axis-y")
        .call(d3.axisLeft(y).ticks(6))
        .select(".domain").remove();

      // 6) Vẽ bar
      const color = d3.schemeTableau10[0]; // 1 màu nhẹ
      const bars = g.selectAll("rect.bar")
        .data(data)
        .join("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.repeat))
        .attr("y", d => y(d.customers))
        .attr("width", x.bandwidth())
        .attr("height", d => innerH - y(d.customers))
        .attr("fill", color);

      // 7) Tooltip (#tooltip position:fixed)
      const tip = d3.select("#tooltip");
      if (!tip.empty()) {
        bars.on("mouseover", (ev, d) => {
            tip
              .style("opacity", 1)
              .html(
                `<div style="font-weight:700;margin-bottom:4px">Số lần mua: ${d.repeat}</div>` +
                `<div>Số khách hàng: ${d3.format(",")(d.customers)}</div>`
              );
          })
          .on("mousemove", ev => {
            tip.style("left", (ev.clientX + 14) + "px")
               .style("top",  (ev.clientY + 12) + "px");
          })
          .on("mouseout", () => tip.style("opacity", 0));
      } else {
        bars.append("title")
          .text(d => `Số lần mua: ${d.repeat}\nSố khách hàng: ${d.customers}`);
      }

      // 8) Nhãn số trên đầu cột
      g.selectAll("text.val")
        .data(data)
        .join("text")
        .attr("class", "val")
        .attr("x", d => x(d.repeat) + x.bandwidth() / 2)
        .attr("y", d => y(d.customers) - 4)
        .attr("text-anchor", "middle")
        .text(d => d3.format(",")(d.customers));
    });
  });
})();
