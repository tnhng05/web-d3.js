;(() => {
function toNumber(x){ if(x==null) return 0; const s=String(x).replace(/[^\d.-]/g,""); const n=+s; return Number.isFinite(n)?n:0; }
function parseDate(raw){
  if(!raw) return null;
  let d=new Date(raw);
  if(isNaN(d)){
    const p1=d3.timeParse("%d/%m/%Y %H:%M:%S"), p2=d3.timeParse("%d/%m/%Y %H:%M"),
          p3=d3.timeParse("%d/%m/%Y"),         p4=d3.timeParse("%Y-%m-%d %H:%M:%S"),
          p5=d3.timeParse("%Y-%m-%d %H:%M"),    p6=d3.timeParse("%Y-%m-%d");
    d=p1(raw)||p2(raw)||p3(raw)||p4(raw)||p5(raw)||p6(raw);
  }
  return d && !isNaN(+d) ? d : null;
}
const pad2=n=>String(n).padStart(2,"0");
const fmtInt=d3.format(",");         // 5,422
const fmtVND=d3.format(",.0f");      // 779,431

window.addEventListener("DOMContentLoaded", () => {
  const margin={top:10,right:24,bottom:48,left:64};
  const width=800, height=500;

  const svg=d3.select("#chart6").append("svg").attr("viewBox",[0,0,width,height]);
  const g=svg.append("g").attr("transform",`translate(${margin.left},${margin.top})`);

  const innerW=width-margin.left-margin.right;
  const innerH=height-margin.top-margin.bottom;

  const tip=d3.select("#tooltip");

  d3.csv("data/sales.csv").then(rows=>{
    // 1) Tổng theo (ngày + giờ)
    const perHourInstance=d3.rollup(
      rows,
      v=>{
        const d=parseDate(v[0].Thoi_gian_tao_don);
        const hour=d? d.getHours():null;
        return {
          hour,
          revenue:d3.sum(v,r=>toNumber(r.Thanh_tien)),
          qty:    d3.sum(v,r=>toNumber(r.SL))
        };
      },
      r=>{
        const d=parseDate(r.Thoi_gian_tao_don);
        return d? d3.timeFormat("%Y-%m-%d %H")(d):"INVALID";
      }
    );

    // 2) Trung bình theo giờ 0..23
    const byHourAvg=d3.rollup(
      Array.from(perHourInstance.values()).filter(x=>x.hour!=null),
      v=>({ avgRevenue:d3.mean(v,x=>x.revenue), avgQty:d3.mean(v,x=>x.qty) }),
      x=>x.hour
    );

    // 3) Chuẩn hoá & sort tăng dần giờ
    const data=Array.from(byHourAvg,([h,agg])=>({
      hour:h,
      label:`${pad2(h)}:00-${pad2(h)}:59`,
      avgRevenue:agg.avgRevenue,
      avgQty:agg.avgQty
    })).sort((a,b)=>d3.ascending(a.hour,b.hour));

    // 4) Scales
    const x=d3.scaleBand().domain(data.map(d=>d.label)).range([0,innerW]).padding(0.2);

    // Y bước 100K
    const STEP=100_000;
    const maxVal=d3.max(data,d=>d.avgRevenue)||1;
    const ymax=Math.ceil(maxVal/STEP)*STEP;
    const yTicks=d3.range(0, ymax+STEP, STEP);
    const y=d3.scaleLinear().domain([0,ymax]).range([innerH,0]);

    // Màu theo khung giờ
    const palette=d3.schemeTableau10;
    const color=d3.scaleOrdinal().domain(x.domain()).range(
      Array.from({length:data.length},(_,i)=>palette[i%palette.length])
    );

    // 5) Axes + Grid (nhạt)
    const axX=g.append("g").attr("transform",`translate(0,${innerH})`)
      .call(d3.axisBottom(x).tickSize(0));
    axX.select(".domain").remove();
    axX.selectAll(".tick text").style("font-size","7px");

    const axY=g.append("g")
      .call(d3.axisLeft(y).tickValues(yTicks).tickFormat(d=>fmtInt(d/1000)+"K"));
    axY.select(".domain").remove();
    axY.selectAll("text").style("font-size","9px");

    g.append("g").attr("class","grid-y")
      .call(d3.axisLeft(y).tickValues(yTicks).tickSize(-innerW).tickFormat(""))
      .select(".domain").remove();

    // 6) Bar + Tooltip (dùng clientX/clientY cho tooltip fixed)
    g.selectAll("rect.bar")
      .data(data).join("rect")
      .attr("class","bar")
      .attr("x",d=>x(d.label))
      .attr("y",d=>y(d.avgRevenue))
      .attr("width",x.bandwidth())
      .attr("height",d=>innerH-y(d.avgRevenue))
      .attr("fill",d=>color(d.label))
      .on("mouseover",(ev,d)=>{
        tip.style("opacity",1).html(
          `<div>Khung giờ: <span style="font-weight:700">${d.label}</span></div>
           <div>Doanh số bán TB: <span style="font-weight:700">${fmtVND(d.avgRevenue)} VND</span></div>
           <div>Số lượng bán TB: <span style="font-weight:700">${fmtInt(Math.round(d.avgQty))} SKUs</span></div>`
        );
      })
      .on("mousemove",(ev)=>{
        tip.style("left",(ev.clientX+12)+"px").style("top",(ev.clientY+12)+"px");
      })
      .on("mouseout",()=>tip.style("opacity",0));

    // 7) Nhãn đỉnh cột
    g.selectAll("text.val")
      .data(data).join("text")
      .attr("class","val")
      .attr("x",d=>x(d.label)+x.bandwidth()/2)
      .attr("y",d=>y(d.avgRevenue)-4)
      .attr("text-anchor","middle")
      .style("font-size","7px")
      .style("font-weight","bold")
      .text(d=>`${fmtVND(d.avgRevenue)} VND`);
  });
});
})();
