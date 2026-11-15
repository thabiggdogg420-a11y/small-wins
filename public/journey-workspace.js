'use strict';
// Move the authoritative controls, never clone records or create another editor.
// Leaving the workspace restores exact original nodes for historical deep links.
function createJourneyWorkspace(o) {
 const nodes=['onboarding','project-pane','result-path-pane'];
 const homes={};
 for(const id of nodes){const node=o.element(id),anchor=o.anchor(id);node.before(anchor);homes[id]=anchor;}
 function place(id,target){const node=o.element(id);if(target){const parent=o.element(target);if(node.parentNode!==parent)parent.append(node);}else if(node.previousSibling!==homes[id])homes[id].after(node);}
 function sync(){
  const s=o.state(),route=o.route(),active=route==='journey',r=s.resultPath||{},first=r.phase!=='transfer';
  place('onboarding',active&&!s.started?'journey-setup-slot':null);
  place('project-pane',active?'journey-draft-slot':null);
  place('result-path-pane',active?'journey-check-slot':null);
  if(active){
   o.element('onboarding').hidden=!!s.started;
   o.element('project-pane').hidden=!s.started||!first;
   o.element('result-path-pane').hidden=!s.started;
   o.element('result-first').hidden=!first;
   o.element('result-transfer').hidden=first;
   // Action, expected result and checks stay beside the actual draft on this route.
   o.element('result-plan').hidden=false;
   o.element('result-reflect').hidden=false;
  }else{
   o.element('onboarding').hidden=!!s.started;
   o.element('project-pane').hidden=route!=='learn/project';
   o.element('result-path-pane').hidden=!s.started||route!=='learn';
   o.element('result-plan').hidden=r.firstView!=='plan';
   o.element('result-reflect').hidden=r.firstView!=='reflect';
  }
  o.element('journey-work-area').hidden=!s.started;
  o.element('journey-draft-slot').hidden=!s.started||!first;
  o.element('journey-work-area').dataset.phase=first?'first':'transfer';
  return {active,first,started:!!s.started};
 }
 return {sync};
}
if(typeof module!=='undefined')module.exports={createJourneyWorkspace};
