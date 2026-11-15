(function(root){
'use strict';
function number(value,name,max){if(typeof value!=='string'||!value.trim()||!/^\d+(?:\.\d+)?$/.test(value.trim()))throw Error(name+' must be a positive number.');const n=Number(value);if(!Number.isFinite(n)||n<=0||n>max)throw Error(name+' must be greater than zero and no more than '+max+'.');return n;}
function compare(input){
 const need=number(input.need,'Quantity needed',1000000);
 for(const key of ['need','aSize','bSize'])if((String(input[key]).trim().split('.')[1]||'').length>6)throw Error('Use quantities with at most six decimal places.');
 const needUnits=Math.round(need*1000000);
 const offers=['a','b'].map(k=>{const size=number(input[k+'Size'],'Pack size',1000000);const raw=number(input[k+'Price'],'Pack price',1000000);if(!/^\d+(?:\.\d{1,2})?$/.test(input[k+'Price'].trim()))throw Error('Use pack prices with at most two decimal places.');const cents=Math.round(raw*100);const sizeUnits=Math.round(size*1000000);let packs=Math.ceil(needUnits/sizeUnits);packs=Math.max(1,packs);const total=packs*cents;if(!Number.isSafeInteger(total)||total>10000000000)throw Error('This comparison is too large. Use smaller quantities.');return {size,cents,packs,unit:cents/100/size,total:total/100,left:Math.max(0,packs*size-need)};});
 return {need,offers,winner:offers[0].total===offers[1].total?'tie':offers[0].total<offers[1].total?'a':'b'};
}
function report(input,result,prediction,check){return 'Learn4Free · pack price comparison\nNot AI-generated or financial advice. Arithmetic only.\n\nSame product/quality, same unit: '+input.unit+'\nQuantity needed: '+result.need+'\n'+result.offers.map((o,i)=>'Offer '+(i?'B':'A')+': '+o.size+' '+input.unit+' per pack at '+(o.cents/100).toFixed(2)+'; '+o.packs+' whole packs = '+o.total.toFixed(2)+'; '+o.left.toFixed(3)+' units left over. Price per unit: '+o.unit.toFixed(4)).join('\n')+'\nLowest purchase cost: '+result.winner.toUpperCase()+'\nMy prediction: '+prediction+'\nMy check (self-reported, not verified): '+check+'\n\nAssumptions: one currency, same unit and product quality; prices include applicable tax; no delivery, discounts, deposits or other costs. Recheck actual shop prices. This is not a purchase or a savings claim.\nMethod: pack price ÷ pack size; round required quantity ÷ pack size UP to whole packs; multiply pack count by price.\n';}
const api={compare,report};if(typeof module!=='undefined')module.exports=api;else root.PackCost=api;
})(typeof window!=='undefined'?window:globalThis);
