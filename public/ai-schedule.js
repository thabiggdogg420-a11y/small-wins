(function(root){
'use strict';
const rules='One person uses one room, so activities cannot overlap. Keep every activity once, its full duration, fixed start (if any), required order and the window. Gaps are allowed. Use one line per activity: activity ID | start | end. Use 24-hour HH:MM times on the same day; no header, bullets or code fences. A task may start exactly when its predecessor ends.';
const tasks=[
  {title:'A craft morning that fits',start:'09:00',end:'11:30',activities:[
    {id:'setup',label:'Set up the room',minutes:20,fixed:'',after:[]},
    {id:'welcome',label:'Welcome',minutes:10,fixed:'09:30',after:['setup']},
    {id:'make',label:'Making session',minutes:45,fixed:'',after:['welcome']},
    {id:'break',label:'Break',minutes:15,fixed:'',after:['make']},
    {id:'pack',label:'Pack away',minutes:20,fixed:'',after:['break']}
  ],sample:'setup | 09:00 | 09:15\nwelcome | 09:20 | 09:30\nmake | 09:30 | 10:15\nbreak | 10:00 | 10:15\npack | 10:15 | 10:30'},
  {title:'A different workshop, a different order',start:'10:00',end:'12:00',activities:[
    {id:'setup',label:'Prepare materials',minutes:25,fixed:'',after:[]},
    {id:'demo',label:'Demonstration',minutes:20,fixed:'10:30',after:['setup']},
    {id:'break',label:'Break before practice',minutes:10,fixed:'',after:['demo']},
    {id:'practice',label:'Hands-on practice',minutes:40,fixed:'',after:['break']},
    {id:'pack',label:'Pack away',minutes:15,fixed:'',after:['practice']}
  ],sample:''}
];
function task(id){if(id!==0&&id!==1)throw Error('Unknown task.');return tasks[id];}
function time(text,end=false){if(text==='24:00'&&end)return 1440;if(typeof text!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(text))return null;return Number(text.slice(0,2))*60+Number(text.slice(3));}
function clock(n){return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');}
function specIssues(spec){
  const issues=[];if(!spec||!Array.isArray(spec.activities)||spec.activities.length<1||spec.activities.length>5)return ['Use one to five activities.'];
  const start=time(spec.start),end=time(spec.end,true);if(start===null||end===null||end<=start)issues.push('Use a same-day window with an end later than the start. Times must be HH:MM.');
  const seen=new Set();for(const a of spec.activities){
    if(!a||typeof a.id!=='string'||!/^[a-z0-9-]{1,20}$/.test(a.id)||seen.has(a.id)){issues.push('Every activity needs a unique simple ID.');continue;}seen.add(a.id);
    if(typeof a.label!=='string'||!a.label.trim()||a.label.length>100||/[\u0000-\u001f\u007f]/.test(a.label))issues.push(a.id+': use a short activity label without line breaks or control characters.');
    if(!Number.isInteger(a.minutes)||a.minutes<1||a.minutes>720)issues.push(a.id+': give a whole duration from 1 to 720 minutes.');
    if(typeof a.fixed!=='string'||(a.fixed!==''&&time(a.fixed)===null))issues.push(a.id+': fixed start must be blank or HH:MM.');
    if(!Array.isArray(a.after)||a.after.length>5||a.after.some(x=>typeof x!=='string')||new Set(a.after).size!==a.after.length)issues.push(a.id+': invalid required order.');
  }
  if(issues.length)return issues;
  for(const a of spec.activities){
    if(a.after.some(id=>!seen.has(id)))issues.push(a.id+': its earlier activity is missing. Clear that order or add the activity.');
    const fixed=a.fixed===''?null:time(a.fixed);if(fixed!==null&&(fixed<start||fixed+a.minutes>end))issues.push(a.id+': its fixed start and full duration cannot fit this window.');
  }
  const visiting=new Set(),done=new Set();function visit(id){if(visiting.has(id))return false;if(done.has(id))return true;visiting.add(id);for(const before of spec.activities.find(a=>a.id===id)?.after||[])if(seen.has(before)&&!visit(before))return false;visiting.delete(id);done.add(id);return true;}
  if(spec.activities.some(a=>!visit(a.id)))issues.push('The required order contains a cycle: activities cannot each wait for the other.');
  const total=spec.activities.reduce((n,a)=>n+a.minutes,0);if(start!==null&&end!==null&&total>end-start)issues.push('The required durations total '+total+' minutes, more than the '+(end-start)+'-minute window. Change the scope or window; do not silently shorten activities.');
  return issues;
}
function source(spec){return 'Fictional practice source. One person, one room.\nWindow: '+spec.start+'–'+spec.end+', all on the same day. Finish by '+spec.end+'.\n'+spec.activities.map(a=>a.id+': '+a.label+'; '+a.minutes+' minutes'+(a.fixed?'; starts exactly '+a.fixed:'')+(a.after.length?'; after '+a.after.join(', '):'')+'.').join('\n')+'\nNo activities overlap. Keep the listed order rules; empty time is allowed.';}
function prompt(id){return 'Make a feasible timetable from this fictional brief. Do not drop work, shorten durations or invent availability. If it cannot fit, explain the conflict instead of pretending it fits.\n\n'+source(task(id))+'\n\nOutput format and rules: '+rules;}
function parse(text){
  if(typeof text!=='string'||!text.trim())throw Error('Add a timetable draft first.');if(text.length>4000)throw Error('Keep this small timetable within 4,000 characters.');
  const lines=text.replace(/\r\n/g,'\n').trim().split('\n');if(lines.length>10)throw Error('Use at most ten lines; this task needs one line per activity.');
  return lines.map((line,i)=>{const cells=line.split('|').map(c=>c.trim());if(cells.length!==3||!cells[0]||time(cells[1])===null||time(cells[2],true)===null)throw Error('Line '+(i+1)+': use activity ID | HH:MM | HH:MM, without headings or extra words.');return {id:cells[0],start:cells[1],end:cells[2],from:time(cells[1]),to:time(cells[2],true)};});
}
function analyze(spec,text){
  const invalid=specIssues(spec);if(invalid.length)return {ok:false,rows:[],issues:invalid,gaps:[],total:0};
  let rows;try{rows=parse(text);}catch(e){return {ok:false,rows:[],issues:[e.message],gaps:[],total:0};}
  const issues=[],seen=new Map(),start=time(spec.start),end=time(spec.end,true);
  for(const row of rows){
    const a=spec.activities.find(a=>a.id===row.id);if(!a){issues.push('Unknown activity '+JSON.stringify(row.id)+'. Use only the source IDs.');continue;}
    if(seen.has(row.id))issues.push(row.id+' appears more than once.');else seen.set(row.id,row);
    if(row.to<=row.from)issues.push(row.id+': the end must be later than the start on the same day.');
    if(row.to-row.from!==a.minutes)issues.push(row.id+': needs '+a.minutes+' minutes; this draft gives it '+(row.to-row.from)+'.');
    if(row.from<start||row.to>end)issues.push(row.id+': outside the '+spec.start+'–'+spec.end+' window.');
    if(a.fixed&&row.start!==a.fixed)issues.push(row.id+': must start exactly '+a.fixed+', not '+row.start+'.');
  }
  for(const a of spec.activities){if(!seen.has(a.id)){issues.push('Missing activity '+a.id+'.');continue;}for(const prior of a.after){const p=seen.get(prior);if(p&&seen.get(a.id).from<p.to)issues.push(a.id+': must start after '+prior+' has finished.');}}
  for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++)if(rows[i].from<rows[j].to&&rows[j].from<rows[i].to)issues.push(rows[i].id+' overlaps '+rows[j].id+'. One person in one room cannot do both at once.');
  const sorted=rows.slice().sort((a,b)=>a.from-b.from),gaps=[];let cursor=start;for(const r of sorted){if(r.from>cursor)gaps.push({start:clock(cursor),end:r.start,minutes:r.from-cursor});cursor=Math.max(cursor,r.to);}if(cursor<end)gaps.push({start:clock(cursor),end:clock(end),minutes:end-cursor});
  return {ok:issues.length===0,rows,issues,gaps,total:spec.activities.reduce((n,a)=>n+a.minutes,0)};
}
function feedback(result){return result.ok?'This timetable satisfies every entered duration, fixed start, order rule and window, with no overlap. Other valid schedules may exist. These are local rule checks, not proof that a real event is feasible or that you learned independently.':result.issues.join('\n');}
function runSheet(spec,text,note){
  if(typeof note!=='string'||!note.trim()||note.length>2000)throw Error('Write a checking note within 2,000 characters before reviewing.');
  const result=analyze(spec,text);if(!result.ok)throw Error('Check and correct the current timetable before downloading a reviewed run sheet.');
  return ['LEARN4FREE — REVIEWED RUN SHEET',spec.title||'My small plan','Window: '+spec.start+'–'+spec.end+' on one unspecified day. One person, one room. No calendar date, time zone or booking is implied.','',...result.rows.slice().sort((a,b)=>a.from-b.from).map(r=>{const a=spec.activities.find(a=>a.id===r.id);return r.start+'–'+r.end+' | '+a.label+' ('+a.id+', '+a.minutes+' min)';}),'','UNALLOCATED TIME',...(result.gaps.length?result.gaps.map(g=>g.start+'–'+g.end+' | '+g.minutes+' min'):['None.']),'','SOURCE CONSTRAINTS',...spec.activities.map(a=>a.id+': '+a.minutes+' min; fixed start '+(a.fixed||'none')+'; after '+(a.after.join(', ')||'none')+'.'),'','MY CHECKING NOTE',note,'','Local checks passed for the constraints entered. Learner review, not independent verification. Actual durations, travel, availability, accessibility, date/time-zone effects and real-world use are not verified. Nothing has been sent, booked or added to a calendar.'].join('\n');
}
// Planner continuation is raw editable data, never a compiled plan, check or approval.
const draftFormat='learn4free-own-timetable-draft',draftVersion=1,draftBytes=32*1024;
const draftRowKeys=['label','minutes','fixed','after','start','end'];
function exactDraftKeys(value,keys,label){
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype||Object.keys(value).length!==keys.length||keys.some(k=>!Object.prototype.hasOwnProperty.call(value,k)))throw Error(label+': unexpected draft fields. Use this planner’s editable JSON draft.');
}
function draft(value){
  exactDraftKeys(value,['format','version','start','end','note','rows'],'File');
  if(value.format!==draftFormat||value.version!==draftVersion)throw Error('Use a supported version 1 own-timetable draft, not a lesson record or reviewed run sheet.');
  function text(value,max,label){if(typeof value!=='string'||value.length>max)throw Error(label+' must be text within '+max+' characters. Nothing was shortened or replaced.');return value;}
  text(value.start,5,'Window start');text(value.end,5,'Window end');text(value.note,2000,'Checking note');
  if(!Array.isArray(value.rows)||value.rows.length!==5||Object.keys(value.rows).length!==5)throw Error('A draft must keep exactly five ordered activity rows, including empty rows.');
  const rows=Array.from(value.rows,(row,i)=>{
    exactDraftKeys(row,draftRowKeys,'Activity '+(i+1));
    const result={};for(const key of draftRowKeys)result[key]=text(row[key],key==='label'?100:key==='minutes'?3:key==='after'?1:5,'Activity '+(i+1)+' '+key);
    if(result.after!==''&&(!/^[1-5]$/.test(result.after)||result.after===String(i+1)))throw Error('Activity '+(i+1)+' must follow a different row from 1 to 5, or leave that choice empty.');
    return result;
  });
  // Empty/invalid proposals and row holes must survive. Do not trim, compile or analyze.
  return {format:draftFormat,version:draftVersion,start:value.start,end:value.end,note:value.note,rows};
}
function serializeDraft(value){return JSON.stringify(draft(value),null,2);}
function parseDraft(text){
  if(typeof text!=='string'||text.length>draftBytes)throw Error('Choose a JSON draft no larger than 32 KiB.');
  // Reject duplicate property names (including escaped spellings), not just the last value.
  // Bound nesting to the only supported shape: file -> rows array -> row object.
  let value;try{
    const stack=[];
    for(let i=0;i<text.length;i++){
      if(text[i]==='"'){
        const start=i++;
        for(;i<text.length;i++){if(text[i]==='\\'){i++;continue;}if(text[i]==='"')break;}
        let next=i+1;while(/\s/.test(text[next]||'')&&next<text.length)next++;
        if(text[next]===':'&&stack.at(-1) instanceof Set){const key=JSON.parse(text.slice(start,i+1));if(stack.at(-1).has(key))throw Error('duplicate');stack.at(-1).add(key);}
      }else if(text[i]==='{'||text[i]==='['){stack.push(text[i]==='{'?new Set():null);if(stack.length>3)throw Error('nesting');}
      else if(text[i]==='}'||text[i]===']')stack.pop();
    }
    value=JSON.parse(text);
  }catch{throw Error('This file is not valid draft JSON (duplicate fields and nested extras are not supported). Your current work is unchanged.');}
  return draft(value);
}
const api={draftFormat,draftVersion,draftBytes,draft,serializeDraft,parseDraft,rules,tasks,task,time,clock,specIssues,source,prompt,parse,analyze,feedback,runSheet};if(typeof module!=='undefined')module.exports=api;root.ScheduleLesson=api;
})(typeof window==='undefined'?globalThis:window);
