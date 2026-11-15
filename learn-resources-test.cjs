const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('public/learn-resources.js','utf8');
const calls=[],provider={value:'chatgpt'},elements={provider,'provider-note':{},'open-provider':{},'provider-help':{},'review-open-provider':{}},buttons=['chatgpt','claude','gemini'].map(id=>({dataset:{aiChoice:id},addEventListener(t,fn){this.click=fn;}}));
const providerContext={Handoff:require('./public/handoff.js'),$:id=>elements[id]};vm.createContext(providerContext);vm.runInContext(fs.readFileSync('public/handoff-ui.js','utf8').match(/function providerInfo\(\)\{[\s\S]*?\nfunction handoffContext/)[0].replace(/\nfunction handoffContext$/, ''),providerContext);
let html='';const section={className:'',setAttribute(){},set innerHTML(v){html=v;},querySelectorAll(){return buttons;}};
vm.runInNewContext(src,{document:{createElement:()=>section},screens:{learn:{append(){},querySelector:()=>({after:e=>calls.push('mounted')})}},$:id=>{assert.equal(id,'provider');return provider;},providerInfo:()=>{providerContext.providerInfo();calls.push('provider');},staleHandoff:()=>calls.push('stale'),appNavigate:r=>calls.push(r)});
for(const b of buttons){b.click();assert.equal(provider.value,b.dataset.aiChoice);assert.deepEqual(calls.slice(-3),['provider','stale','ai']);for(const id of ['open-provider','review-open-provider'])assert.equal(elements[id].href,providerContext.Handoff.providers[b.dataset.aiChoice].url);}
assert(!/fetch\(|XMLHttpRequest|localStorage|s\.artifact|s\.purpose|navigator\./.test(src));
for(const h of html.matchAll(/href="([^"]+)"/g)){const u=new URL(h[1]);assert.equal(u.protocol,'https:');assert(/(^|\.)(chatgpt\.com|openai\.com|claude\.com|claude\.ai|google\.com|gemini\.google|publicpolicy\.google)$/.test(u.hostname));}
for(const phrase of ['Start with available free access','Try the free route before considering Pro','Use the no-subscription route','No paid plan is needed','separate from developer API billing'])assert(html.includes(phrase),phrase);assert(!/US\$|A\$|billed upfront/.test(html),'no stale paid-plan price promotion');
assert(fs.readFileSync('public/index.html','utf8').includes('src="learn-resources.js"'));
console.log('PASS: official-resource links, free-route/limit disclosures, no automatic data transport, provider chooser invalidates preview before navigation (executed handlers).');
