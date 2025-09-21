;(() => {
  const fmtInt = d3.format(",.0f");                                 // 17,109
  const fmtPctShort = p => (p*100).toFixed(1).replace(".", ",") + "%"; // 54,4%

  window.addEventListener("DOMContentLoaded", () => {
    const margin = { top: 10, right: 100, bottom: 30, left: 160 };
    const width  = 800, height = 500;

    const svg = d3.select("#chart7").append("svg").attr("viewBox",[0,0,width,height]);
    const g   = svg.append("g").attr("transform",`translate(${margin.left},${margin.top})`);

    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    d3.csv("data/sales.csv").then(rows => {
      // 1) Đơn hàng -> tập nhóm xuất hiện trong đơn
      const orders = d3.rollup(
        rows,
        v => new Set(v.map(r => `[${r.Ma_nhom_hang}] ${r.Ten_nhom_hang}`)),
        r => r.Ma_don_hang
      );
      const totalOrders = orders.size;

      // Đếm số đơn chứa từng nhóm
      const countByGroup = new Map();
      for (const setOfGroups of orders.values()) {
        for (const gr of setOfGroups) {
          countByGroup.set(gr, (countByGroup.get(gr) || 0) + 1);
        }
      }

      // 2) Data + xác suất
      const data = Array.from(countByGroup, ([groupLabel, ordersCount]) => ({
        groupLabel,
        ordersCount,
        prob: ordersCount / totalOrders
      })).sort((a,b)=>d3.descending(a.prob,b.prob));

      // 3) Scales
      const y = d3.scaleBand().domain(data.map(d=>d.groupLabel)).range([0,innerH]).padding(0.22);

      const x = d3.scaleLinear().domain([0,0.59]).range([0,innerW]); // 0..59%
      const tickVals = d3.range(0,60,10).map(d=>d/100);               // 0,10,20,30,40,50%

      const color = d3.scaleOrdinal().domain(data.map(d=>d.groupLabel)).range(d3.schemeTableau10);

      // 4) Grid dọc CHỈ ở tick 0..50% (nhạt) + trục
      g.append("g")
        .attr("class","grid-x")
        .attr("transform",`translate(0,${innerH})`)
        .call(d3.axisBottom(x).tickValues(tickVals).tickSize(-innerH).tickFormat(""))
        .select(".domain").remove();

      g.append("g")
        .attr("class","axis axis-x")
        .attr("transform",`translate(0,${innerH})`)
        .call(d3.axisBottom(x).tickValues(tickVals).tickFormat(d3.format(".0%")))
        .select(".domain").remove();

      g.append("g")
        .attr("class","axis axis-y")
        .call(d3.axisLeft(y).tickSize(0).tickPadding(5))
        .select(".domain").remove();

      // 5) Bars
      const bars = g.selectAll("rect.bar")
        .data(data).join("rect")
        .attr("class","bar")
        .attr("x",0)
        .attr("y",d=>y(d.groupLabel))
        .attr("height",y.bandwidth())
        .attr("width",d=>x(d.prob))
        .attr("fill",d=>color(d.groupLabel));

      // 6) Nhãn % ngoài cột
      g.selectAll("text.val")
        .data(data).join("text")
        .attr("class","val")
        .attr("x",d=>x(d.prob)+6)
        .attr("y",d=>y(d.groupLabel)+y.bandwidth()/2)
        .attr("alignment-baseline","middle")
        .style("font-size","10px")
        .style("font-weight","bold")
        .text(d=>fmtPctShort(d.prob));

      // 7) Tooltip (position: fixed → clientX/clientY)
      const tip = d3.select("#tooltip");
      bars
        .on("mouseover", (ev,d)=>{
          tip.style("opacity",1)
             .html(
               `<div>Nhóm hàng: <span style="font-weight:700">${d.groupLabel}</span></div>
                <div>SL Đơn bán: ${fmtInt(d.ordersCount)}</div>
                <div>Xác suất bán: ${fmtPctShort(d.prob)}</div>`
             );
        })
        .on("mousemove", (ev)=>{
          tip.style("left",(ev.clientX+14)+"px").style("top",(ev.clientY+12)+"px");
        })
        .on("mouseout", ()=>tip.style("opacity",0));
    });
  });
})();
