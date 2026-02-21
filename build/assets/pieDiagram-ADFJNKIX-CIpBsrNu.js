import{as as S,ak as W,aW as j,g as K,s as X,e as Z,f as q,E as H,D as J,_ as p,l as z,h as Q,S as Y,W as ee,a4 as te,aX as ae,m as re,K as ne,T as ie}from"./index-CTGzGgMl.js";import{p as se}from"./chunk-4BX2VUAB-z5aG-EwP.js";import{p as le}from"./treemap-GDKQZRPO-CpFUFCkM.js";import{d as I}from"./arc-BW3-Jz3z.js";import"./_baseUniq-BTt0XCjz.js";import"./_basePickBy-BP5KzX3q.js";import"./clone-Dzoz2g_q.js";function oe(e,a){return a<e?-1:a>e?1:a>=e?0:NaN}function ce(e){return e}function ue(){var e=ce,a=oe,f=null,x=S(0),s=S(W),o=S(0);function l(t){var n,c=(t=j(t)).length,d,y,m=0,u=new Array(c),i=new Array(c),v=+x.apply(this,arguments),w=Math.min(W,Math.max(-W,s.apply(this,arguments)-v)),h,C=Math.min(Math.abs(w)/c,o.apply(this,arguments)),$=C*(w<0?-1:1),g;for(n=0;n<c;++n)(g=i[u[n]=n]=+e(t[n],n,t))>0&&(m+=g);for(a!=null?u.sort(function(A,D){return a(i[A],i[D])}):f!=null&&u.sort(function(A,D){return f(t[A],t[D])}),n=0,y=m?(w-c*$)/m:0;n<c;++n,v=h)d=u[n],g=i[d],h=v+(g>0?g*y:0)+$,i[d]={data:t[d],index:n,value:g,startAngle:v,endAngle:h,padAngle:C};return i}return l.value=function(t){return arguments.length?(e=typeof t=="function"?t:S(+t),l):e},l.sortValues=function(t){return arguments.length?(a=t,f=null,l):a},l.sort=function(t){return arguments.length?(f=t,a=null,l):f},l.startAngle=function(t){return arguments.length?(x=typeof t=="function"?t:S(+t),l):x},l.endAngle=function(t){return arguments.length?(s=typeof t=="function"?t:S(+t),l):s},l.padAngle=function(t){return arguments.length?(o=typeof t=="function"?t:S(+t),l):o},l}var pe=ie.pie,F={sections:new Map,showData:!1},T=F.sections,G=F.showData,de=structuredClone(pe),ge=p(()=>structuredClone(de),"getConfig"),fe=p(()=>{T=new Map,G=F.showData,ne()},"clear"),he=p(({label:e,value:a})=>{if(a<0)throw new Error(`"${e}" has invalid value: ${a}. Negative values are not allowed in pie charts. All slice values must be >= 0.`);T.has(e)||(T.set(e,a),z.debug(`added new section: ${e}, with value: ${a}`))},"addSection"),me=p(()=>T,"getSections"),ve=p(e=>{G=e},"setShowData"),Se=p(()=>G,"getShowData"),L={getConfig:ge,clear:fe,setDiagramTitle:J,getDiagramTitle:H,setAccTitle:q,getAccTitle:Z,setAccDescription:X,getAccDescription:K,addSection:he,getSections:me,setShowData:ve,getShowData:Se},xe=p((e,a)=>{se(e,a),a.setShowData(e.showData),e.sections.map(a.addSection)},"populateDb"),ye={parse:p(async e=>{const a=await le("pie",e);z.debug(a),xe(a,L)},"parse")},we=p(e=>`
  .pieCircle{
    stroke: ${e.pieStrokeColor};
    stroke-width : ${e.pieStrokeWidth};
    opacity : ${e.pieOpacity};
  }
  .pieOuterCircle{
    stroke: ${e.pieOuterStrokeColor};
    stroke-width: ${e.pieOuterStrokeWidth};
    fill: none;
  }
  .pieTitleText {
    text-anchor: middle;
    font-size: ${e.pieTitleTextSize};
    fill: ${e.pieTitleTextColor};
    font-family: ${e.fontFamily};
  }
  .slice {
    font-family: ${e.fontFamily};
    fill: ${e.pieSectionTextColor};
    font-size:${e.pieSectionTextSize};
    // fill: white;
  }
  .legend text {
    fill: ${e.pieLegendTextColor};
    font-family: ${e.fontFamily};
    font-size: ${e.pieLegendTextSize};
  }
`,"getStyles"),Ae=we,De=p(e=>{const a=[...e.values()].reduce((s,o)=>s+o,0),f=[...e.entries()].map(([s,o])=>({label:s,value:o})).filter(s=>s.value/a*100>=1).sort((s,o)=>o.value-s.value);return ue().value(s=>s.value)(f)},"createPieArcs"),Ce=p((e,a,f,x)=>{z.debug(`rendering pie chart
`+e);const s=x.db,o=Q(),l=Y(s.getConfig(),o.pie),t=40,n=18,c=4,d=450,y=d,m=ee(a),u=m.append("g");u.attr("transform","translate("+y/2+","+d/2+")");const{themeVariables:i}=o;let[v]=te(i.pieOuterStrokeWidth);v??=2;const w=l.textPosition,h=Math.min(y,d)/2-t,C=I().innerRadius(0).outerRadius(h),$=I().innerRadius(h*w).outerRadius(h*w);u.append("circle").attr("cx",0).attr("cy",0).attr("r",h+v/2).attr("class","pieOuterCircle");const g=s.getSections(),A=De(g),D=[i.pie1,i.pie2,i.pie3,i.pie4,i.pie5,i.pie6,i.pie7,i.pie8,i.pie9,i.pie10,i.pie11,i.pie12];let E=0;g.forEach(r=>{E+=r});const N=A.filter(r=>(r.data.value/E*100).toFixed(0)!=="0"),k=ae(D);u.selectAll("mySlices").data(N).enter().append("path").attr("d",C).attr("fill",r=>k(r.data.label)).attr("class","pieCircle"),u.selectAll("mySlices").data(N).enter().append("text").text(r=>(r.data.value/E*100).toFixed(0)+"%").attr("transform",r=>"translate("+$.centroid(r)+")").style("text-anchor","middle").attr("class","slice"),u.append("text").text(s.getDiagramTitle()).attr("x",0).attr("y",-400/2).attr("class","pieTitleText");const O=[...g.entries()].map(([r,M])=>({label:r,value:M})),b=u.selectAll(".legend").data(O).enter().append("g").attr("class","legend").attr("transform",(r,M)=>{const R=n+c,B=R*O.length/2,V=12*n,U=M*R-B;return"translate("+V+","+U+")"});b.append("rect").attr("width",n).attr("height",n).style("fill",r=>k(r.label)).style("stroke",r=>k(r.label)),b.append("text").attr("x",n+c).attr("y",n-c).text(r=>s.getShowData()?`${r.label} [${r.value}]`:r.label);const _=Math.max(...b.selectAll("text").nodes().map(r=>r?.getBoundingClientRect().width??0)),P=y+t+n+c+_;m.attr("viewBox",`0 0 ${P} ${d}`),re(m,d,P,l.useMaxWidth)},"draw"),$e={draw:Ce},Fe={parser:ye,db:L,renderer:$e,styles:Ae};export{Fe as diagram};
