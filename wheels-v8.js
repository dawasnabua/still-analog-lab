/* Three-way + global grading. All interaction stays local. */
'use strict';
(()=>{
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
class StillWheels{
 constructor({root,getState,getDefaults,onChange}){
  Object.assign(this,{root,getState,getDefaults,onChange});this.tone='Shadow';this.drag=null;this.lastTap=null;
  this.names={Shadow:'Schatten',Mid:'Mitteltöne',High:'Lichter',Global:'Global'};
  const tabs=root.querySelector('.wheel-tabs');
  for(const[tone,label]of Object.entries(this.names)){const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.tone=tone;b.onclick=()=>{this.tone=tone;this.sync();};tabs.append(b);}
  this.wheel=root.querySelector('#gradingWheel');this.puck=root.querySelector('.wheel-puck');this.fields={};
  for(const[prop,label,min,max]of [['Hue','Farbton',0,360],['Sat','Stärke',0,100],['Lum','Luminanz',-100,100]]){
   const row=document.createElement('div');row.className='control';row.innerHTML=`<label for="wheel${prop}"><span>${label}</span><output id="wheel${prop}Value" for="wheel${prop}"></output></label><div class="slider-row"><input id="wheel${prop}" type="range" min="${min}" max="${max}" step="1" value="0"></div>`;
   root.querySelector('.wheel-numeric').append(row);const input=row.querySelector('input');this.fields[prop]=input;
   input.oninput=()=>this.onChange({[this.key(prop)]:Number(input.value)});
   bindStillSlider(input,{getDefault:()=>this.getDefaults()[this.key(prop)]??0});
  }
  this.wheel.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();this.wheel.focus({preventScroll:true});this.wheel.setPointerCapture(e.pointerId);this.drag={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};this.pick(e);});
  this.wheel.addEventListener('pointermove',e=>{if(this.drag?.id!==e.pointerId)return;e.preventDefault();if(Math.hypot(e.clientX-this.drag.x,e.clientY-this.drag.y)>6)this.drag.moved=true;this.pick(e);});
  this.wheel.addEventListener('pointerup',e=>{if(this.drag?.id!==e.pointerId)return;const g=this.drag;this.drag=null;if(this.wheel.hasPointerCapture(e.pointerId))this.wheel.releasePointerCapture(e.pointerId);if(!g.moved){const now=performance.now();if(this.lastTap&&this.lastTap.tone===this.tone&&now-this.lastTap.time<340&&Math.hypot(e.clientX-this.lastTap.x,e.clientY-this.lastTap.y)<36){this.lastTap=null;this.resetDefault();}else this.lastTap={tone:this.tone,time:now,x:e.clientX,y:e.clientY};}else this.lastTap=null;});
  for(const type of ['pointercancel','lostpointercapture'])this.wheel.addEventListener(type,()=>{this.drag=null;});
  this.wheel.addEventListener('dblclick',e=>{e.preventDefault();this.lastTap=null;this.resetDefault();});
  this.wheel.addEventListener('keydown',e=>{const s=this.getState(),step=e.shiftKey?10:1;let v=null;if(e.key==='ArrowLeft'||e.key==='ArrowRight')v={[this.key('Hue')]:((s[this.key('Hue')]||0)+(e.key==='ArrowLeft'?-step:step)+360)%360};if(e.key==='ArrowUp'||e.key==='ArrowDown')v={[this.key('Sat')]:clamp((s[this.key('Sat')]||0)+(e.key==='ArrowUp'?step:-step),0,100)};if(e.key==='Home')v={[this.key('Sat')]:0};if(e.key==='Escape'){e.preventDefault();this.resetDefault();return;}if(v){e.preventDefault();this.onChange(v);}});
  root.querySelector('#wheelNeutral').onclick=()=>this.onChange({[this.key('Hue')]:0,[this.key('Sat')]:0,[this.key('Lum')]:0});
  root.querySelector('#resetGrading').onclick=()=>{const v={gradingBalance:0};for(const tone of Object.keys(this.names))for(const prop of ['Hue','Sat','Lum'])v['wheel'+tone+prop]=0;this.onChange(v);};
  this.sync();
 }
 key(prop){return 'wheel'+this.tone+prop;}
 pick(e){const r=this.wheel.getBoundingClientRect(),radius=(r.width-10)*.45,dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,dist=Math.hypot(dx,dy);const sat=Math.round(clamp(dist/radius,0,1)*100),hue=dist<2?(this.getState()[this.key('Hue')]||0):Math.round((Math.atan2(dy,dx)*180/Math.PI+360)%360);this.onChange({[this.key('Hue')]:hue,[this.key('Sat')]:sat});}
 resetDefault(){const d=this.getDefaults();this.onChange({[this.key('Hue')]:d[this.key('Hue')]??0,[this.key('Sat')]:d[this.key('Sat')]??0});}
 sync(){const s=this.getState(),h=s[this.key('Hue')]||0,sat=s[this.key('Sat')]||0,lum=s[this.key('Lum')]||0,signature=this.tone+'|'+Object.keys(this.names).map(t=>['Hue','Sat','Lum'].map(p=>s['wheel'+t+p]||0).join(',')).join('|');if(signature===this.lastSignature)return;this.lastSignature=signature;for(const[prop,input]of Object.entries(this.fields)){const value=s[this.key(prop)]||0;input.value=value;this.root.querySelector('#wheel'+prop+'Value').textContent=value+(prop==='Hue'?'°':prop==='Sat'?' %':'');}for(const b of this.root.querySelectorAll('[data-tone]')){const active=b.dataset.tone===this.tone;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));const colored=(s['wheel'+b.dataset.tone+'Sat']||0)>0||(s['wheel'+b.dataset.tone+'Lum']||0)!==0;b.classList.toggle('has-grade',colored);}
  const radians=h*Math.PI/180,radius=sat/100*45;this.puck.style.left=(50+Math.cos(radians)*radius)+'%';this.puck.style.top=(50+Math.sin(radians)*radius)+'%';this.wheel.setAttribute('aria-label',`Farbrad ${this.names[this.tone]}. Farbton ${h} Grad, Stärke ${sat} Prozent, Luminanz ${lum}. Links/rechts: Farbton; hoch/runter: Stärke. Doppeltipp: Look-Standard.`);this.root.querySelector('#wheelToneName').textContent=this.names[this.tone];
 }
}
window.StillWheels=StillWheels;
})();
