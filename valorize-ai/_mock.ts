// Servidor de TESTE apenas (sem internet no sandbox): simula cotações.
import express from 'express';
import path from 'path';
import { grahamFairPrice, bazinCeilingPrice, upsidePct, valorizeScore, round } from './src/lib/valuation';
const app = express();
const D = '/home/claude/valorize/dist';
const base: any = {
  BBAS3:['Banco do Brasil',22.1,2.53,31.64,1.65,[0.28,2.09,1.89,2.19,1.65],'Financeiro / Bancos',7.5,0.9],
  TAEE11:['Taesa',35.8,3.4,22.1,3.01,[1.52,4.85,2.91,3.53,3.23],'Energia Elétrica',9.8,1.6],
  PETR4:['Petrobras PN',33.4,10.35,37.32,3.66,[3.25,15.17,7.34,7.93,3.28],'Petróleo',4.8,1.2],
  VALE3:['Vale',58.2,2.34,44.3,5.61,[6.8,7.58,6.08,5.35,7.51],'Mineração',7.2,1.4],
  ITUB4:['Itaú Unibanco',37.9,3.85,21.4,2.8,[1.25,1.8,2.45,3.2,2.8],'Financeiro / Bancos',8.2,1.5],
  BBSE3:['BB Seguridade',36.2,3.9,7.4,3.45,[2.15,3.2,3.45,3.5,3.45],'Seguros',9.5,4.5],
  CMIG4:['Cemig',11.6,2.15,13.4,1.35,[0.95,1.2,1.35,1.4,1.35],'Energia Elétrica',6.2,1.05],
  WEGE3:['WEG',44.5,1.6,6.9,0.75,[0.5,0.6,0.7,0.8,0.75],'Bens Industriais',30,8],
};
const stock = (t: string) => { const b = base[t]; if (!b) return null; const avg = b[5].reduce((a:number,c:number)=>a+c,0)/5;
  return { ticker:t, companyName:b[0], currentPrice:b[1], lpa:b[2], vpa:b[3], dividends:b[4], avgDividends5y:round(avg),
    dividendHistory5y:b[5].map((a:number,i:number)=>({year:2021+i,amount:a})), payoutConsistencyYears:5, pl:round(b[1]/b[2]), pvp:round(b[1]/b[3]),
    sector:{sectorName:b[6],avgPL:b[7],avgPVP:b[8],avgDY:7}, historicalData:[], dataQuality:{price:'live',fundamentals:'live',dividends:'live',history:t==='WEGE3'?'reference':'live'},
    warnings: t==='WEGE3'?['Histórico de proventos vindo da tabela de referência interna.']:[], lastUpdated:Date.now() }; };
app.get('/api/stock/radar',(req,res)=>{ const y=Number(req.query.minYield)||6; res.json(Object.keys(base).map(t=>{const d:any=stock(t);
  const g=grahamFairPrice(d.lpa,d.vpa), b12=bazinCeilingPrice(d.dividends,y), b5=bazinCeilingPrice(d.avgDividends5y,y);
  const sc=valorizeScore({price:d.currentPrice,lpa:d.lpa,vpa:d.vpa,dividends12m:d.dividends,avgDividends5y:d.avgDividends5y,dividendYears:d.dividendHistory5y.map((x:any)=>x.amount),sectorPL:d.sector.avgPL,sectorPVP:d.sector.avgPVP,minYield:y});
  return {ticker:t,name:d.companyName,sector:d.sector.sectorName,price:d.currentPrice,lpa:d.lpa,vpa:d.vpa,dividends12m:d.dividends,avgDividends5y:d.avgDividends5y,dy:round(d.dividends/d.currentPrice*100),pl:d.pl,pvp:d.pvp,
  grahamFair:round(g),grahamUpside:round(upsidePct(g,d.currentPrice),1),bazinCeiling12m:round(b12),bazinCeiling5y:round(b5),bazinUpside12m:round(upsidePct(b12,d.currentPrice),1),bazinUpside5y:round(upsidePct(b5,d.currentPrice),1),status:'AGUARDAR',score:sc.total,grade:sc.grade};}));});
app.get('/api/stock/search',(req,res)=>{res.json([{ticker:'KLBN11',name:'Klabin Units',sector:'Papel'},{ticker:'KLBN4',name:'Klabin PN',sector:'Papel'}]);});
base.KLBN11=['Klabin Units',21.4,1.9,13.1,1.35,[1.0,1.2,1.4,1.3,1.35],'Papel e Celulose',10,1.8];
app.get('/api/stock/:t',(req,res)=>{const d=stock(req.params.t.toUpperCase()); d?res.json(d):res.status(404).json({error:`Não encontramos cotação para ${req.params.t}. Confira o código ou tente novamente em instantes.`});});
app.use(express.static(D)); app.get('*',(_q,r)=>r.sendFile(path.join(D,'index.html')));
app.listen(4173,()=>console.log('mock on 4173'));
