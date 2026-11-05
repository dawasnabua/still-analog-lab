/* STILL v8 pointwise + spatial color math. No dependencies, network or source mutation.
 * StillColorMath.pixel(r,g,b,state[,out]) -> RGB array in 0..255 (floats).
 * Inputs RGB 0..255; omitted controls = 0; omitted filmStrength = 100.
 * Includes exposure (raw /75 EV), old saturation/warmth/fade and new tonal/film/wheels.
 * Excludes amount mixing, optical bloom/halo/leak/vignette, motion, masks and grain.
 * StillColorMath.details(rgba,width,height,state) -> NEW Uint8ClampedArray.
 * Call after pointwise+optical effects, before motion/grain/amount blend. Alpha preserved.
 * Relative radii match GPU at each output size. No in-place neighborhood feedback.
 * wheel(hue,sat,lum) -> packed RGB chroma + luminance offset for GPU uniforms.
 */
'use strict';
(()=>{
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const n=(s,k)=>Number(s[k])||0;
function wheel(h,s,l){h=((Number(h)||0)%360+360)%360/60;const x=1-Math.abs(h%2-1);let c=h<1?[1,x,0]:h<2?[x,1,0]:h<3?[0,1,x]:h<4?[0,x,1]:h<5?[x,0,1]:[1,0,x];const y=c[0]*.2126+c[1]*.7152+c[2]*.0722;return [...c.map(v=>(v-y)*(Number(s)||0)/100*.22),(Number(l)||0)/100*.18];}
function pixel(r,g,b,s={},out=[]){
const exp=Math.pow(2,n(s,'exposure')/75);let c=[r/255*exp,g/255*exp,b/255*exp],l=c[0]*.2126+c[1]*.7152+c[2]*.0722;
const sat=1+n(s,'saturation')/100,w=n(s,'warmth')*(.3+.7*l)/255;
c=c.map((v,i)=>l+(v-l)*sat+w*[.65,.15,-.65][i]);
const tint=n(s,'tint')/50*.075;c=c.map((v,i)=>v+tint*[.45,-.55,.45][i]);
l=clamp(c[0]*.2126+c[1]*.7152+c[2]*.0722);const sh=1-smooth(.05,.65,l),hi=smooth(.35,.95,l),wh=smooth(.65,1,l),bl=1-smooth(0,.35,l);
const lift=n(s,'shadows')/100*.22*sh+n(s,'highlights')/100*.22*hi+n(s,'whites')/100*.16*wh+n(s,'blacks')/100*.16*bl;
c=c.map(v=>v+lift);const co=n(s,'contrast')/100,mc=n(s,'midContrast')/100;
c=c.map(v=>{v=(v-.5)*(1+co*.65)+.5;return v+mc*.65*(v-.5)*Math.max(0,1-Math.pow((v-.5)*2,2));});
l=c[0]*.2126+c[1]*.7152+c[2]*.0722;const chroma=Math.max(...c)-Math.min(...c),vib=n(s,'vibrance')/100*.65*(1-clamp(chroma));c=c.map(v=>l+(v-l)*(1+vib));
const stock=Math.round(n(s,'filmStock')),strength=clamp(s.filmStrength==null?1:n(s,'filmStrength')/100);if(stock>0&&stock<=5&&strength){
 const original=c.slice();c=c.map(v=>clamp(v));l=c[0]*.2126+c[1]*.7152+c[2]*.0722;
 if(stock===1)c=c.map((v,i)=>v+.10*v*(1-v)+[.018,.005,-.018][i]*(.35+.65*v)-.09*v*v*v);
 if(stock===2)c=c.map((v,i)=>l+(v-l)*.9+(v-.5)*.10+[ -.008,.003,.012][i]);
 if(stock===3)c=c.map((v,i)=>v+[ -.025,.012,.032][i]*(1-l)+[.038,.012,-.025][i]*l);
 if(stock===4)c=c.map((v,i)=>.04+v*.90+[.014,.003,-.012][i]);
 if(stock===5){const y=clamp(c[0]*.27+c[1]*.65+c[2]*.08);const z=.015+.97*(y+.20*(y-.5)*y*(1-y));c=[z,z,z];}
 c=c.map((v,i)=>mix(original[i],v,strength));
}
l=clamp(c[0]*.2126+c[1]*.7152+c[2]*.0722+n(s,'gradingBalance')/100*.22);
const weights=[1,1-smooth(.12,.60,l),0,smooth(.40,.88,l)];weights[2]=1-weights[1]-weights[3];
['Global','Shadow','Mid','High'].forEach((zone,j)=>{if(!n(s,'wheel'+zone+'Sat')&&!n(s,'wheel'+zone+'Lum'))return;const a=wheel(n(s,'wheel'+zone+'Hue'),n(s,'wheel'+zone+'Sat'),n(s,'wheel'+zone+'Lum'));c=c.map((v,i)=>v+(a[i]+a[3])*weights[j]);});
const f=n(s,'fade')/100;c=c.map((v,i)=>clamp(mix(v,[.48,.46,.43][i],f)));for(let i=0;i<3;i++)out[i]=c[i]*255;return out;
}
// Separable five-tap bilinear Gaussian; quantize each pass like WebGL RGBA8.
function blurred(src,w,h,r){let a=new Float32Array(src.length),b=new Float32Array(src.length);const offsets=[0,1.384615,-1.384615,3.230769,-3.230769],weights=[.227027,.316216,.316216,.070270,.070270];
 function pass(input,output,vertical){for(let y=0;y<h;y++)for(let x=0;x<w;x++){let sum=0;for(let k=0;k<5;k++){const q=(vertical?y:x)+offsets[k]*r,j=Math.floor(q),t=q-j,limit=(vertical?h:w)-1,p=clamp(j,0,limit),z=clamp(j+1,0,limit);sum+=mix(input[vertical?p*w+x:y*w+p],input[vertical?z*w+x:y*w+z],t)*weights[k];}output[y*w+x]=Math.round(clamp(sum)*255)/255;}}
 pass(src,a,false);pass(a,b,true);return b;
}
function details(data,w,h,s={}){const out=new Uint8ClampedArray(data),clarity=n(s,'clarity')/100,sharp=n(s,'sharpen')/100;if(!clarity&&!sharp)return out;const l=new Float32Array(w*h);for(let p=0;p<l.length;p++)l[p]=(data[p*4]*.2126+data[p*4+1]*.7152+data[p*4+2]*.0722)/255;
 // GPU blurs RGB rather than pre-quantized luma: compute channel passes for parity.
 const smoothL=(r)=>{const result=new Float32Array(l.length);for(let ch=0;ch<3;ch++){const c=new Float32Array(l.length);for(let p=0;p<c.length;p++)c[p]=data[p*4+ch]/255;const b=blurred(c,w,h,r);for(let p=0;p<c.length;p++)result[p]+=b[p]*[.2126,.7152,.0722][ch];}return result;};
 const med=clarity?smoothL(Math.max(w,h)*.008):null,fine=sharp?smoothL(Math.max(w,h)*.0008):null;for(let p=0;p<l.length;p++){const gate=smooth(.02,.18,l[p])*(1-smooth(.82,.98,l[p]));const d=(med?clamp(l[p]-med[p],-.12,.12)*clarity*1.5*gate:0)+(fine?(l[p]-fine[p])*sharp*1.25:0);for(let ch=0;ch<3;ch++)out[p*4+ch]=clamp(data[p*4+ch]/255+d)*255;}return out;}
window.StillColorMath=Object.freeze({pixel,details,wheel,version:8});
})();
