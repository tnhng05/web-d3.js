// chart/d10.js — Câu 10: Xác suất bán hàng của Mặt hàng theo Nhóm hàng trong từng tháng
(() => {
  const pad2 = n => String(n).padStart(2, "0");
  const monthLabel = m => `T${pad2(m)}`;
  // 48,7% (1 chữ số, dấu phẩy)
  const fmtPct1Comma = v => (Math.round(v * 10) / 10).toString().replace(".", ",") + "%";

  // Lấy giá trị cột theo VN/EN
  const get = (r, vi, en) => r[vi] ?? r[en] ?? "";

  // Parse ngày: hỗ trợ dd/MM/yyyy, yyyy-MM-dd, yyyy-MM-dd HH:mm:ss
  function parseDateAny(raw) {
    if (!raw) return null;
    let d = new Date(raw);
    if (isNaN(d)) {
      const p1 = d3.timeParse("%d/%m/%Y");
      const p2 = d3.timeParse("%Y-%m-%d");
      const p3 = d3.timeParse("%Y-%m-%d %H:%M:%S");
      d = p1(raw) || p3(raw) || p2(raw);
    }
    return d && !isNaN(+d) ? d : null;
  }

  // rút gọn legend
  function shortLabel(s, n = 18) {
    s = String(s || "");
    return s.length <= n ? s : s.slice(0, n - 1) + "…";
  }

  // Domain Y theo nhóm (điểm phần trăm, KHÔNG chia cho 100)
  const Y_SPEC = {
    BOT: { min: 90, max: 110, step: 10 }, // Bột
    SET: { min:  5, max:  25, step:  5 }, // Set trà
    THO: { min: 10, max:  40, step:  5 }, // Trà hoa
    TMX: { min: 30, max:  50, step:  5 }, // Trà mix
    TTC: { min: 35, max:  75, step: 10 }, // Trà củ, quả sấy
  };

  // Thứ tự + nhãn nhóm
  const GROUP_META = [
    { code: "BOT", label: "[BOT] Bột" },
    { code: "SET", label: "[SET] Set trà" },
    { code: "THO", label: "[THO] Trà hoa" },
    { code: "TMX", label: "[TMX] Trà mix" },
    { code: "TTC", label: "[TTC] Trà củ, quả sấy" },
  ];

  window.addEventListener("DOMContentLoaded", () => {
    const host = d3.select("#chart10");
    const margin = { top: 24, right: 20, bottom: 56, left: 50 };
    const cellW = 360;                 // kích thước mỗi subplot (vùng vẽ)
    const cellH = 210;
    const nCols = 3;                   // 3 cột x 2 hàng
    const padX = 24, padY = 36;

    const nRows = Math.ceil(GROUP_META.length / nCols);
    const width  = nCols * cellW + (nCols - 1) * padX + margin.left + margin.right;
    const height = nRows * cellH + (nRows - 1) * padY + margin.top + margin.bottom;

    const svg   = host.append("svg").attr("viewBox", [0, 0, width, height]);
    const gRoot = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    d3.csv("data/sales.csv").then(rows => {
      // ---- 1) Chuẩn hoá field & tách tháng, mã/tên nhóm, mã/tên hàng, mã đơn ----
      const norm = rows.map(r => {
        const rawTime = get(r, "Thời gian tạo đơn", "Thoi_gian_tao_don");
        const d = parseDateAny(rawTime);
        const m = d ? d.getMonth() + 1 : null;
        return {
          m,
          orderId: get(r, "Mã đơn hàng", "Ma_don_hang"),
          gCode:   get(r, "Mã nhóm hàng", "Ma_nhom_hang"),
          gName:   get(r, "Tên nhóm hàng", "Ten_nhom_hang"),
          iCode:   get(r, "Mã mặt hàng", "Ma_mat_hang"),
          iName:   get(r, "Tên mặt hàng", "Ten_mat_hang"),
        };
      }).filter(d => d.m != null && d.gCode && d.iCode && d.orderId);

      // ---- 2) Đếm đơn hàng duy nhất theo (tháng, nhóm) ----
      const setMG = new Map(); // key = `${m}|${gCode}` -> Set(orderId)
      for (const d of norm) {
        const k = `${d.m}|${d.gCode}`;
        if (!setMG.has(k)) setMG.set(k, new Set());
        setMG.get(k).add(d.orderId);
      }

      // ---- 3) Đếm đơn hàng duy nhất theo (tháng, nhóm, mặt hàng) ----
      const setMGI = new Map(); // key = `${m}|${gCode}|${iCode}` -> Set(orderId)
      for (const d of norm) {
        const k = `${d.m}|${d.gCode}|${d.iCode}`;
        if (!setMGI.has(k)) setMGI.set(k, new Set());
        setMGI.get(k).add(d.orderId);
      }

      // ---- 4) Vẽ 5 subplot theo GROUP_META ----
      const tip = d3.select("#tooltip");

      GROUP_META.forEach((meta, idx) => {
        const code = meta.code;
        const months = d3.range(1, 13);

        // danh sách item của nhóm
        const itemSet = new Set(norm.filter(x => x.gCode === code).map(x => x.iCode));
        const items = Array.from(itemSet);

        // màu cho item (đủ dài)
        const color = d3.scaleOrdinal()
          .domain(items)
          .range(d3.schemeTableau10.concat(d3.schemeSet3));

        // series: mỗi item -> mảng điểm 12 tháng, giá trị pct (0..100)
        const series = items.map(iCode => {
          const iName = (norm.find(d => d.iCode === iCode) || {}).iName || "";
          const gName = (norm.find(d => d.gCode === code) || {}).gName || meta.label;

          const values = months.map(m => {
            const total = setMG.get(`${m}|${code}`)?.size || 0;
            const cnt   = setMGI.get(`${m}|${code}|${iCode}`)?.size || 0;
            const pct   = total > 0 ? (100 * cnt / total) : 0;  // 0..100
            return {
              m,
              label: monthLabel(m),
              pct,
              count: cnt,
              itemLabel: `[${iCode}] ${iName}`,
              groupLabel: `[${code}] ${gName}`
            };
          });
          return { key: iCode, values };
        });

        // --- panel placement ---
        const row = Math.floor(idx / nCols);
        const col = idx % nCols;
        const panel = gRoot.append("g")
          .attr("transform", `translate(${col * (cellW + padX)}, ${row * (cellH + padY)})`);

        // --- title panel ---
        panel.append("text")
          .attr("x", 0).attr("y", -8)
          .attr("font-weight", 700)
          .text(meta.label);

        const innerW = cellW;
        const innerH = cellH - 52;

        // --- scales ---
        const x = d3.scalePoint()
          .domain(months.map(monthLabel))
          .range([40, innerW - 10])
          .padding(0.5);

        const spec = Y_SPEC[code] || { min: 0, max: 100, step: 10 };
        const y = d3.scaleLinear()
          .domain([spec.min, spec.max])
          .range([innerH - 24, 8]);

        // --- grid dọc (nhạt) theo tháng ---
        panel.append("g")
          .attr("class", "grid-x")
          .attr("transform", `translate(0,${innerH - 24})`)
          .call(
            d3.axisBottom(x)
              .tickValues(x.domain())
              .tickSize(-(innerH - 24))
              .tickFormat(() => "")
          )
          .select(".domain").remove();

        // --- axis X ---
        panel.append("g")
          .attr("class", "axis axis-x")
          .attr("transform", `translate(0,${innerH - 24})`)
          .call(d3.axisBottom(x).tickValues(x.domain()))
          .select(".domain").remove();

        // --- axis Y (điểm %) ---
        const yTicks = d3.range(spec.min, spec.max + 0.0001, spec.step);
        panel.append("g")
          .attr("class", "axis axis-y")
          .attr("transform", "translate(40,0)")
          .call(d3.axisLeft(y).tickValues(yTicks).tickFormat(d => d + "%"))
          .select(".domain").remove();

        // --- line & marker ---
        const line = d3.line()
          .x(d => x(d.label))
          .y(d => y(d.pct))
          .curve(d3.curveMonotoneX);

        const markerR = 2; // nhỏ

        // --- draw series ---
        const sG = panel.append("g");
        series.forEach(s => {
          sG.append("path")
            .datum(s.values)
            .attr("fill", "none")
            .attr("stroke", color(s.key))
            .attr("stroke-width", 1.6)
            .attr("d", line);

          sG.selectAll(`circle.p-${s.key}`)
            .data(s.values)
            .join("circle")
            .attr("class", "pt")
            .attr("cx", d => x(d.label))
            .attr("cy", d => y(d.pct))
            .attr("r", markerR)
            .attr("fill", color(s.key))
            .on("mouseover", (ev, d) => {
              // Chỉ dòng đầu in đậm
              const html =
                `<div style="font-weight:700;margin-bottom:4px;">${d.label} | Mặt hàng ${d.itemLabel}</div>` +
                `<div>Nhóm hàng: ${d.groupLabel} | SL Đơn Bán: ${d.count.toLocaleString("vi-VN")}</div>` +
                `<div>Xác suất Bán / Nhóm hàng: ${fmtPct1Comma(d.pct)}</div>`;
              tip.html(html).style("opacity", 1);
            })
            .on("mousemove", ev => {
              tip.style("left", (ev.clientX + 14) + "px")
                 .style("top",  (ev.clientY + 12) + "px");
            })
            .on("mouseout", () => tip.style("opacity", 0));
        });

        // --- legend rút gọn — ngay dưới panel, tự xuống dòng ---
        let legY = innerH - 0;
        const leg = panel.append("g").attr("transform", `translate(0,${legY})`);

        const itemList = items.map(i => {
          const nm = (norm.find(d => d.iCode === i) || {}).iName || "";
          return { key: i, text: shortLabel(`[${i}] ${nm}`, 20) };
        });

        let curX = 0, curY = 0;
        const rowH = 16, gap = 10;

        itemList.forEach(li => {
          const estW = 10 + 4 + li.text.length * 6.2; // ước lượng chiều rộng
          if (curX + estW > innerW) { curX = 0; curY += rowH; }

          const g = leg.append("g").attr("transform", `translate(${curX},${curY})`);
          g.append("rect")
            .attr("width", 10).attr("height", 10).attr("y", -9).attr("rx", 2)
            .attr("fill", color(li.key));
          g.append("text")
            .attr("x", 14).attr("y", 0)
            .attr("font-size", 10)
            .text(li.text);

          curX += estW + gap;
        });
      }); // end GROUP_META
    });
  });
})();
