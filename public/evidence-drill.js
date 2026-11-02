(function(root){'use strict';
const rounds=[
{title:'Check a confident summary',notes:['The repair afternoon is planned for Saturday.','Lee will check whether the library room is available.','2 p.m. is a proposed start time, not confirmed.','Sam can bring two tool kits.','No booking deadline has been agreed.'],claims:[
{text:'Lee has booked the library.',verdict:'unsupported',line:'2',why:'Checking availability is not a completed booking. Repair: Lee will check whether the room is available.'},
{text:'Sam can bring two tool kits.',verdict:'supported',line:'4',why:'Line 4 directly supports both the quantity and “can bring”. Do not turn an offer into a completed delivery.'},
{text:'The event will definitely start at 2 p.m.',verdict:'unsupported',line:'3',why:'“Proposed” is not “confirmed”. Repair: 2 p.m. is proposed; the start time is not confirmed.'}]},
{title:'Transfer: new notes, same skill',notes:['A seed swap is being considered for Sunday.','No venue has been chosen.','Alex offered six packets of seeds.','A start time has not been discussed.'],claims:[
{text:'Alex offered six packets of seeds.',verdict:'supported',line:'3',why:'The notes support an offer of six packets, not a promise that they have arrived.'},
{text:'The seed swap starts at noon.',verdict:'unsupported',line:'4',why:'There is no agreed time. Repair: The start time is unknown.'},
{text:'A venue has already been selected.',verdict:'unsupported',line:'2',why:'Line 2 explicitly says no venue has been chosen. Repair: The venue has not been chosen.'}]}
];
function check(round,index,answer){const q=rounds[round]?.claims[index];if(!q)return {ok:false,message:'Choose a valid exercise.'};if(!answer||!['supported','unsupported'].includes(answer.verdict)||!answer.line)return {ok:false,message:'Choose a verdict and the most relevant source line before checking.'};const verdict=answer.verdict===q.verdict,line=answer.line===q.line;return {ok:verdict&&line,message:verdict&&line?'Yes — your verdict and evidence match. '+q.why:!verdict?'Look again: does the source actually say the claim happened, or is it only proposed, offered or unknown? Compare the exact words, then retry.':'Your verdict fits, but that line is not the direct evidence. Find the line about this specific person, time or venue, then retry.'};}
const api={rounds,check};if(typeof module!=='undefined')module.exports=api;root.EvidenceDrill=api;
})(typeof window==='undefined'?globalThis:window);
