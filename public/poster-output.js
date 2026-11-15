(function(root){
'use strict';
// Only fixed markup and escaped literal display text enter the downloadable SVG.
// The SVG builder never reads check notes, source, HTML, URLs or user SVG.
const presets={paper:{label:'Paper · dark ink',background:'#fffdf5',ink:'#182a39',accent:'#bc431b'},night:{label:'Night · light ink',background:'#152b38',ink:'#ffffff',accent:'#ffcc78'}};
function fresh(){return {version:2,first:{text:'',preset:'paper',note:''},transfer:{text:'',preset:'paper',note:''}};}
function noteError(note){
 if(typeof note==='string'&&note.length>2000)return 'Keep your visual-check note within 2,000 text units for SVG review. Your full note is kept unchanged; shorten it yourself or keep it in progress JSON.';
 if(typeof note!=='string'||Array.from(note.replace(/\s/gu,'')).length<12||!/[\p{L}\p{N}]/u.test(note))return 'Write a short visual-check note: what you compared with the source, what you corrected, and any readability uncertainty. Use at least 12 non-space characters with words or numbers. This is a completeness check, not an assessment of your judgment.';
 if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u061c\u200b\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/u.test(note))return 'Replace hidden control or direction characters in your visual-check note. Your note is kept unchanged.';
 for(const c of note)if(c.length===1&&c.charCodeAt(0)>=0xd800&&c.charCodeAt(0)<=0xdfff)return 'Replace the incomplete Unicode character in your visual-check note. Your note is kept unchanged.';
 return '';
}
function escapeXML(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));}
function linesFor(d){
 if(!d||typeof d.text!=='string'||!Object.hasOwn(presets,d.preset))throw Error('Choose a supported layout and enter your own display text.');
 if(d.text.length>2000)throw Error('This simple poster supports at most 2,000 text units. Your full input is kept; shorten it yourself or keep it in progress JSON.');
 // XML 1.0 cannot represent these characters. Directional controls can conceal
 // literal meaning; joiners used by Unicode languages/emoji remain supported.
 if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u061c\u200b\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff\ufffe\uffff\t]/u.test(d.text))throw Error('Remove tabs, hidden direction/control characters or unsupported XML characters. Nothing was removed for you.');
 for(const c of d.text)if(c.length===1&&c.charCodeAt(0)>=0xd800&&c.charCodeAt(0)<=0xdfff)throw Error('One character is incomplete Unicode. Replace it in your display text; your input is kept.');
 const lines=d.text.replace(/\r\n?|\u2028|\u2029/g,'\n').split('\n');
 if(!lines[0].trim())throw Error('Write your headline on the first line. Blank first lines are not dropped.');
 if(lines.length>12)throw Error('Use at most 12 lines, including blank lines. Add fewer lines yourself; no lines were dropped.');
 if(lines.some(x=>Array.from(x).length>44))throw Error('Use at most 44 Unicode characters on each line. Add a line break or shorten the wording yourself; there is no automatic wrapping or truncation.');
 return lines;
}
function build(d){
 const lines=linesFor(d),p=presets[d.preset];
 const texts=lines.map((line,i)=>'<text x="64" y="'+(112+i*64)+'" xml:space="preserve" style="font-family:Arial, sans-serif;font-size:'+(i?30:42)+'px;font-weight:'+(i?400:700)+';font-style:normal;letter-spacing:0;word-spacing:0;white-space:pre;direction:ltr;unicode-bidi:plaintext;fill:'+p.ink+'">'+escapeXML(line)+'</text>').join('\n');
 return '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000" role="img" aria-labelledby="learn-poster-svg-title" aria-describedby="learn-poster-svg-description">\n<title id="learn-poster-svg-title">Poster</title>\n<desc id="learn-poster-svg-description">'+escapeXML(lines.join('\n'))+'</desc>\n<rect width="800" height="1000" fill="'+p.background+'"/>\n<rect x="64" y="40" width="112" height="8" fill="'+p.accent+'"/>\n'+texts+'\n</svg>';
}
function fits(svg,lineCount){
 if(!svg||typeof svg.querySelectorAll!=='function')return false;
 const texts=Array.from(svg.querySelectorAll('text'));if(texts.length!==lineCount)return false;
 try{return texts.every((node,i)=>{
  if(typeof node.getBBox!=='function'||typeof node.getComputedTextLength!=='function')return false;
  const b=node.getBBox(),length=node.getComputedTextLength(),y=112+i*64;
  if(![b.x,b.y,b.width,b.height,length].every(Number.isFinite))return false;
  if(!node.textContent.trim())return length>=0&&length<=672&&b.width>=0&&b.width<=672&&b.height>=0&&b.height<=64;
  if(!(b.width>0)||!(b.height>0))return false;
  return length>=0&&length<=672&&b.x>=48&&b.x+b.width<=752&&b.y>=y-52&&b.y+b.height<=y+12&&b.y+b.height<=952;
 });}catch{return false;}
}
const api={presets,fresh,noteError,escapeXML,linesFor,build,fits};if(typeof module!=='undefined')module.exports=api;root.PosterOutput=api;
})(typeof window==='undefined'?globalThis:window);
