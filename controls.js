/* Direction-aware range gestures: vertical scroll, horizontal edit, double-tap reset. */
'use strict';
window.bindStillSlider=(slider,{getDefault,onReset=()=>{}})=>{
 let gesture=null,lastTap=null,blockNativeUntil=0,lastAllowed=slider.value;
 // Native range touch defaults may jump before scroll intent is known. Only our committed touch edits are accepted.
 slider.addEventListener('input',e=>{if(e.isTrusted&&(gesture?.type==='touch'||performance.now()<blockNativeUntil)){slider.value=lastAllowed;e.stopImmediatePropagation();}else lastAllowed=slider.value;},true);
 const emit=()=>{lastAllowed=slider.value;slider.dispatchEvent(new Event('input',{bubbles:true}));};
 const setAt=x=>{const r=slider.getBoundingClientRect(),pad=13,t=Math.max(0,Math.min(1,(x-r.left-pad)/Math.max(1,r.width-pad*2)));slider.value=Math.round(Number(slider.min)+t*(Number(slider.max)-Number(slider.min)));emit();};
 const reset=()=>{slider.value=getDefault();emit();const row=slider.closest('.control');row.classList.add('just-reset');setTimeout(()=>row.classList.remove('just-reset'),450);onReset();};
 slider.title='Doppeltipp: Standardwert des Looks';
 slider.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;lastAllowed=slider.value;blockNativeUntil=e.pointerType==='touch'?performance.now()+1200:0;e.preventDefault();slider.focus({preventScroll:true});
  gesture={id:e.pointerId,x:e.clientX,y:e.clientY,type:e.pointerType,mode:e.pointerType==='touch'?'pending':'horizontal',moved:false};
  slider.setPointerCapture(e.pointerId);if(e.pointerType!=='touch')setAt(e.clientX);
 });
 slider.addEventListener('pointermove',e=>{
  if(!gesture||gesture.id!==e.pointerId)return;const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
  if(Math.hypot(dx,dy)>7)gesture.moved=true;
  if(gesture.mode==='pending'){
   if(Math.max(Math.abs(dx),Math.abs(dy))<7)return;
   if(Math.abs(dy)>Math.abs(dx)){gesture.mode='vertical';lastTap=null;if(slider.hasPointerCapture(e.pointerId))slider.releasePointerCapture(e.pointerId);return;}
   gesture.mode='horizontal';
  }
  if(gesture.mode==='horizontal'){e.preventDefault();setAt(e.clientX);}
 });
 slider.addEventListener('pointerup',e=>{
  if(!gesture||gesture.id!==e.pointerId)return;const g=gesture;gesture=null;if(g.type==='touch')blockNativeUntil=performance.now()+350;
  if(slider.hasPointerCapture(e.pointerId))slider.releasePointerCapture(e.pointerId);
  if(g.mode==='vertical')return;e.preventDefault();
  if(!g.moved){const now=performance.now();if(lastTap&&now-lastTap.time<340&&Math.hypot(e.clientX-lastTap.x,e.clientY-lastTap.y)<42){lastTap=null;reset();}else{setAt(e.clientX);lastTap={time:now,x:e.clientX,y:e.clientY};}}
 });
 const cancel=e=>{if(gesture?.id===e.pointerId){gesture=null;lastTap=null;}};
 slider.addEventListener('pointercancel',cancel);slider.addEventListener('lostpointercapture',cancel);
 slider.addEventListener('dblclick',e=>{e.preventDefault();lastTap=null;reset();});
 slider.addEventListener('keydown',e=>{blockNativeUntil=0;if(e.key==='Escape'){e.preventDefault();reset();}});
};
