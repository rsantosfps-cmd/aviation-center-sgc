// Gerador de PDF offline — Aviation Center Calibrações.
// Layout Letter seguro para impressão: margens internas, cabeçalhos de tabela
// repetidos e quebra de página controlada para evitar cortes/sobreposição.
(function(){
  const CP1252={
    '€':0x80,'‚':0x82,'ƒ':0x83,'„':0x84,'…':0x85,'†':0x86,'‡':0x87,'ˆ':0x88,'‰':0x89,
    'Š':0x8A,'‹':0x8B,'Œ':0x8C,'Ž':0x8E,'‘':0x91,'’':0x92,'“':0x93,'”':0x94,
    '•':0x95,'–':0x96,'—':0x97,'˜':0x98,'™':0x99,'š':0x9A,'›':0x9B,'œ':0x9C,
    'ž':0x9E,'Ÿ':0x9F,'º':0xBA,'ª':0xAA,'±':0xB1,'µ':0xB5,'≥':0xB3,'≤':0xB2,
    '²':0xB2,'³':0xB3,'°':0xB0,'¹':0xB9,'“':0x93,'”':0x94
  };
  function enc(s){const out=[];for(const ch of String(s??'')){const c=ch.charCodeAt(0);out.push(c<128||(c>=160&&c<=255)?c:(CP1252[ch]??63));}return new Uint8Array(out)}
  function esc(s){return String(s??'').replace(/≥/g,'>=').replace(/≤/g,'<=').replace(/±/g,'+/-').replace(/“|”/g,'"').replace(/–|—/g,'-').replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)')}
  function wrap(text,max){
    const out=[];
    for(const para of String(text??'').replace(/\r/g,'').split('\n')){
      if(!para){out.push('');continue}
      let line='';
      for(const word of para.split(/\s+/)){
        if(!line){line=word;continue}
        if((line+' '+word).length<=max)line+=' '+word;
        else{out.push(line);line=word}
      }
      if(line)out.push(line);
    }
    return out.length?out:[''];
  }
  function makePDF(pages){
    const objs=[];const add=o=>{objs.push(o);return objs.length};
    const catalog=add('');const pagesObj=add('');
    const font=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    const pageRefs=[];
    for(const page of pages){
      const c='q\n1 1 1 rg\n0 0 612 792 re f\n0 0 0 rg\n'+page.content+'\nQ';
      const stream=add(`<< /Length ${enc(c).length} >>\nstream\n${c}\nendstream`);
      const pref=add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${stream} 0 R >>`);
      pageRefs.push(pref);
    }
    objs[catalog-1]=`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
    objs[pagesObj-1]=`<< /Type /Pages /Kids [${pageRefs.map(x=>x+' 0 R').join(' ')}] /Count ${pageRefs.length} >>`;
    let out='%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';const offs=[0];
    for(let i=0;i<objs.length;i++){offs[i+1]=out.length;out+=(i+1)+' 0 obj\n'+objs[i]+'\nendobj\n'}
    const xref=out.length;out+='xref\n0 '+(objs.length+1)+'\n0000000000 65535 f \n';
    for(let i=1;i<offs.length;i++)out+=String(offs[i]).padStart(10,'0')+' 00000 n \n';
    out+=`trailer\n<< /Size ${objs.length+1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return new Blob([enc(out)],{type:'application/pdf'});
  }
  function pdfFromSession(s, reportFilter=null){
    const activeReports=Array.isArray(reportFilter)&&reportFilter.length ? reportFilter : (s.selectedReports||[]);
    const L=28,W=556,TOP=760,BOTTOM=34,FS=7;
    const pages=[];let ops='';let y=TOP;
    let reportTitle='LAUDO TÉCNICO';let reportMeta=null;
    const txt=(x,yy,t,size=7,bold=false)=>{ops+=`BT /F1 ${size} Tf ${x} ${yy} Td (${esc(t)}) Tj ET\n`};
    const rect=(x,yy,w,h,fill=false)=>{ops+=fill?`0.96 0.96 0.96 rg ${x} ${yy} ${w} ${h} re f 0 0 0 rg\n`:`${x} ${yy} ${w} ${h} re S\n`};
    const pageHeader=(title,rm,continuation=false)=>{
      reportTitle=title;reportMeta=rm||{};y=TOP;
      txt(L,y,continuation?`${title} — CONTINUAÇÃO`:title,continuation?9:13,true);y-=continuation?18:23;
      drawMeta(rm);y-=10;
    };
    const drawMeta=(rm)=>{
      const m=s.meta||{};const r=rm||{};
      const vals=[
        ['CLIENTE',m.cliente||''],['VALIDADE','2 anos'],['OS',m.os||''],['DATA',m.data||''],
        ['FABRICANTE',r.fabricante||''],['P/N',r.pn||''],['S/N',r.sn||''],['PREFIXO',m.prefixo||'']
      ];
      const cw=W/4,rh=23;
      for(let row=0;row<2;row++)for(let col=0;col<4;col++){
        const i=row*4+col,x=L+col*cw,yy=y-row*rh;rect(x,yy-rh,cw,rh);txt(x+4,yy-15,`${vals[i][0]}: ${vals[i][1]}`,6.6);
      }
      y-=rh*2;
      rect(L,y-18,W,18);txt(L+4,y-12,`TÉCNICO RESPONSÁVEL: ${r.tecnico||''}`,6.6);y-=18;
    };
    const ensure=(h,repeat=true)=>{
      if(y-h<BOTTOM){pages.push({content:ops});ops='';pageHeader(reportTitle,reportMeta,true);return true}
      return false;
    };
    // Títulos de seção ocupam uma faixa própria. Isso evita que a linha do título
    // atravesse o texto ou encoste no cabeçalho da tabela seguinte.
    const section=t=>{
      const titleH=24;
      ensure(titleH+28);
      txt(L+3,y-11,t,7.2,true);
      ops+=`${L} ${y-titleH} ${W} 0.8 re S\n`;
      y-=titleH;
    };
    const table=(headers,rows,widths,opts={})=>{
      const headerH=28,cellFS=6.2;
      const maxChars=w=>Math.max(8,Math.floor(w/(cellFS*0.52)));
      const rowHeight=cells=>{
        const lines=cells.map((v,i)=>wrap(v,maxChars(widths[i])));
        const lineCount=Math.max(...lines.map(a=>a.length));
        return Math.max(18,8+lineCount*7.2);
      };
      const totalHeight=headerH+rows.reduce((sum,r)=>sum+rowHeight(r),0)+5;
      // Tabelas curtas ficam inteiras na mesma página. Assim uma seção como
      // BARÔMETRO nunca começa no rodapé e continua cortada na página seguinte.
      const keepTogether=opts.keepTogether!==false && totalHeight <= (TOP-BOTTOM-70);
      if(keepTogether && y-totalHeight<BOTTOM){
        if(ops.trim()){pages.push({content:ops});ops='';}
        pageHeader(reportTitle,reportMeta,true);
      }
      const drawRow=(cells,isHeader)=>{
        const lines=cells.map((v,i)=>wrap(v,maxChars(widths[i])));
        const lineCount=Math.max(...lines.map(a=>a.length));
        const h=Math.max(isHeader?headerH:18,8+lineCount*7.2);
        if(y-h<BOTTOM){
          pages.push({content:ops});ops='';pageHeader(reportTitle,reportMeta,true);
          return drawRow(cells,isHeader);
        }
        let x=L;
        cells.forEach((v,i)=>{
          rect(x,y-h,widths[i],h,isHeader);
          const ls=lines[i].slice(0,Math.max(1,Math.floor((h-6)/7.2)));
          ls.forEach((ln,j)=>{txt(x+2,y-9-j*7.2,ln,cellFS,isHeader)});
          x+=widths[i];
        });
        y-=h;
      };
      drawRow(headers,true);
      rows.forEach(r=>drawRow(r,false));
      y-=5;
    };
    const finish=()=>{if(ops.trim())pages.push({content:ops});ops='';y=TOP};
    const rmFor=k=>s.reportMeta?.[k]||{fabricante:'',pn:'',sn:'',tecnico:''};
    const a=s.reports?.altimetro;
    if(activeReports.includes('altimetro')){
      pageHeader('LAUDO TÉCNICO DO ALTÍMETRO',rmFor('altimetro'));
      const f=ALT_FRICTION.map((x,i)=>[x,a.friction[i].sem||'',a.friction[i].com||'',FRICTION_TOL[i]]);
      section('TESTE DE ATRITO (pressão decrescente)');
      table(['ALTITUDE (PÉS)','VALOR SEM VIBRAÇÃO','VALOR COM VIBRAÇÃO','TOLERÂNCIA'],f,[118,145,170,123]);
      section('ERRO DE ESCALA (pressão decrescente)');
      const press=['31,018','29,921','29,385','28,856','28,335','27,821','26,817','25,842','23,978','22,225','20,577','19,029','17,577','16,216','14,942','13,75'];
      const sc=ALT_SCALE.map((x,i)=>[x,press[i],a.scale[i].lido||'',SCALE_TOL[i]]);
      table(['ALTITUDE','PRESSÃO EQUIVALENTE (POL HG)','VALOR LIDO','TOL. +/-'],sc,[92,178,156,130]);
      section('VAZAMENTO DE CAIXA');table(['PRESSÃO (IN HG)','ALTITUDE','VALOR LIDO','TOL. +/-'],[[a.leak.pressao,'18000',a.leak.lido||'','100']],[135,105,190,126]);
      section('ERRO DE ESCALA BARÔMETRO');table(['PRESSÃO','DIFERENÇA','VALOR LIDO'],a.baro.map(r=>[r.valor,r.diferenca,r.lido||'']),[240,150,166]);
      section('HISTERESE — ALTITUDE MÁXIMA DE OPERAÇÃO (pressão crescente)');
      table(['PONTO DE TESTE','VALOR DECRESCENTE','VALOR CRESCENTE','DIFERENÇA','TOLERÂNCIA'],[
        ['1º — 50% altitude máxima (10000 pés)',a.hyst[0].lidoDec||'',a.hyst[0].lidoCresc||'',a.hyst[0].dif||'','75'],
        ['2º — 40% altitude máxima (8000 pés)',a.hyst[1].lidoDec||'',a.hyst[1].lidoCresc||'',a.hyst[1].dif||'','75']
      ],[180,112,112,82,70]);finish();
    }
    if(activeReports.includes('integracao')){
      pageHeader('LAUDO TÉCNICO INTEGRAÇÃO DO TRANSPONDER E ALTITUDE ENCODER',rmFor('integracao'));
      table(['TESTE Nº','ALTITUDE (PÉS)','LEITURA DO ALTÍMETRO (PÉS)','LEITURA DO TRANSPONDER (PÉS)'],s.reports.integracao.map(r=>[r.teste,r.altitude,r.altimetro||'',r.transponder||'']),[62,100,190,204]);finish();
    }
    if(activeReports.includes('encoder')){
      pageHeader('LAUDO TÉCNICO DO ENCODER',rmFor('encoder'));
      table(['TESTE Nº','ALTITUDE DE REFERÊNCIA','PONTO DE TRANSIÇÃO NOMINAL','PONTO DE TRANSIÇÃO ATUAL'],s.reports.encoder.map(r=>[r.teste,r.altitude,r.nominal,r.atual||'']),[62,130,178,186]);finish();
    }
    if(activeReports.includes('transponder')){
      const t=s.reports.transponder;pageHeader('LAUDO TÉCNICO DO TRANSPONDER',rmFor('transponder'));
      section('RADIO FREQUÊNCIA DE RESPOSTA');table(['TESTE','VALOR REQUERIDO','VALOR ENCONTRADO'],t.radio.map(r=>[r[0],r[1],r[2]||'']),[245,190,121]);
      section('SUPRESSÃO — MODO 3/A');table(['TESTE','VALOR REQUERIDO','RESULTADO'],t.suppression.map(r=>[r[0],r[1],r[2]||'']),[190,245,121]);
      section('SENSIBILIDADE DO RECEPTOR');table(['TESTE','VALOR REQUERIDO','VALOR ENCONTRADO'],t.sensitivity.map(r=>[r[0],r[1],r[2]||'']),[205,230,121]);
      section('POTÊNCIA DE PICO DE SAÍDA DE RÁDIO FREQUÊNCIA');table(['TESTE','VALOR','VALOR ENCONTRADO'],t.power.map(r=>[r[0],r[1],r[2]||'']),[230,205,121]);
      section('OUTRAS MEDIÇÕES');wrap(t.other||'',105).forEach(ln=>{ensure(12);txt(L,y,ln,7);y-=9});finish();
      pageHeader('LAUDO TÉCNICO DO TRANSPONDER',rmFor('transponder'),true);
      section('PARÂMETROS — VALOR ENCONTRADO');table(['PARÂMETRO','VALOR REQUERIDO','VALOR ENCONTRADO (MODE A / MODE C)'],t.reception.map(r=>[r[0],r[1],`${r[2]||''} / ${r[3]||''}`]),[190,190,176]);
      section('SOMENTE PARA TRANSPONDER MODE S');table(['TESTE','VALOR / CRITÉRIO','VALOR ENCONTRADO'],t.modeS.map(r=>[r[0],r[1],r[2]||'']),[170,285,101]);
      wrap('OBS.: Inspeção e teste conforme RBAC 43 Apêndice “F”.',110).forEach(ln=>{ensure(12);txt(L,y,ln,7);y-=9});finish();
    }
    if(activeReports.includes('airdata')){
      const ad=s.reports.airdata;pageHeader('LAUDO TÉCNICO DO AIRDATA',rmFor('airdata'));
      section('TESTE #1 — ERRO DE ESCALA (pressão decrescente)');
      table(['PRESSÃO EQUIV. (POL HG)','ALTITUDE (PÉS)','VALOR LIDO (PÉS)','TOL. ESPECIF. (± PÉS)'],AIR_DATA_POINTS.map((p,i)=>[p[0],p[1],ad.rows[i]?.valor||'',p[2]]),[145,120,170,121]);
      section('TESTE #4 — VAZAMENTO DA LINHA');table(['PRESSÃO (IN HG)','ALTITUDE (PÉS)','VALOR LIDO (PÉS)','TOLERÂNCIA'],[['13.750','20.000',ad.leak||'','± 100']],[145,120,170,121]);
      wrap('Obs.: Calibração realizada na aeronave conforme RBAC 43 apêndice “E”.',110).forEach(ln=>{ensure(12);txt(L,y,ln,7);y-=9});finish();
    }
    if(s.observacoesAjustes&&String(s.observacoesAjustes).trim()){
      if(!pages.length){pageHeader('OBSERVAÇÕES / AJUSTES',rmFor(activeReports[0]||'altimetro'));}
      section('OBSERVAÇÕES / AJUSTES');wrap(s.observacoesAjustes,110).forEach(ln=>{ensure(12);txt(L,y,ln,7);y-=9});finish();
    }
    if(!pages.length)pageHeader('LAUDO TÉCNICO',rmFor('altimetro'));
    if(ops.trim())finish();
    return makePDF(pages);
  }
  window.AviationPDF={pdfFromSession};
})();
