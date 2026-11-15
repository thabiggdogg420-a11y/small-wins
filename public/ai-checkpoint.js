'use strict';
(function(root){
const limits={answer1:12000,costA1:20,costB1:20,finding:20,reason:1500,answer2:12000,'correction-check':1500,'own-prompt':3000,answer3:12000,costA3:20,costB3:20,help:20,'final-check':1500};
const enums={finding:['','error','agrees','unsure'],help:['','own','help']};
function fields(raw,keys=Object.keys(limits)){if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Missing lesson entries.');const clean={};for(const k of keys){if(typeof raw[k]!=='string'||raw[k].length>limits[k]||(enums[k]&&!enums[k].includes(raw[k])))throw Error('Invalid lesson entry: '+k);clean[k]=raw[k];}return clean;}
function parse(text){if(typeof text!=='string'||text.length>150000)throw Error('Checkpoint is too large.');let r;try{r=JSON.parse(text);}catch{throw Error('This is not valid checkpoint JSON.');}if(r?.format!=='learn4free-ai-pack-checkpoint'||r.version!==1)throw Error('Use a saved checkpoint for this lesson, not the final conversation record.');const data=fields(r.entries);if(typeof r.answerRevealed!=='boolean'||typeof r.usedHelp!=='boolean')throw Error('Missing attempt history.');let first=null;if(r.firstChangedAttempt!==null){first=fields(r.firstChangedAttempt,['own-prompt','answer3','costA3','costB3','help']);if(typeof r.firstChangedAttempt.usedHelp!=='boolean')throw Error('Invalid first-attempt history.');first.usedHelp=r.firstChangedAttempt.usedHelp;}
return {format:r.format,version:1,entries:data,firstChangedAttempt:first,answerRevealed:r.answerRevealed,usedHelp:r.usedHelp||r.answerRevealed||!!first};}
const api={limits,parse};if(typeof module!=='undefined')module.exports=api;else root.AICheckpoint=api;
})(typeof globalThis!=='undefined'?globalThis:this);
