const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/debug-helper-Bjcha6DC.js","assets/vanilla-Das_YOyF.js"])))=>i.map(i=>d[i]);
import{c as Ii}from"./vanilla-Das_YOyF.js";const Ni="modulepreload",Di=function(s){return"/"+s},Ia={},ja=function(e,t,a){let i=Promise.resolve();if(t&&t.length>0){let m=function(h){return Promise.all(h.map(b=>Promise.resolve(b).then(w=>({status:"fulfilled",value:w}),w=>({status:"rejected",reason:w}))))};document.getElementsByTagName("link");const r=document.querySelector("meta[property=csp-nonce]"),n=r?.nonce||r?.getAttribute("nonce");i=m(t.map(h=>{if(h=Di(h),h in Ia)return;Ia[h]=!0;const b=h.endsWith(".css"),w=b?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${h}"]${w}`))return;const T=document.createElement("link");if(T.rel=b?"stylesheet":Ni,b||(T.as="script"),T.crossOrigin="",T.href=h,n&&T.setAttribute("nonce",n),document.head.appendChild(T),b)return new Promise((R,_)=>{T.addEventListener("load",R),T.addEventListener("error",()=>_(new Error(`Unable to preload CSS for ${h}`)))})}))}function o(r){const n=new Event("vite:preloadError",{cancelable:!0});if(n.payload=r,window.dispatchEvent(n),!n.defaultPrevented)throw r}return i.then(r=>{for(const n of r||[])n.status==="rejected"&&o(n.reason);return e().catch(o)})},j=Ii((s,e)=>({auth:{isAuthenticated:!1,isChecking:!0,cookie:null,method:null,error:null},connection:{api:{connected:!1,message:"Initializing..."},data:{loaded:!1,message:"Loading..."},websocket:{connected:!1,message:"Not required"},formula:{initialized:!1,message:"Loading..."}},ui:{isLoading:!0,loadingMessage:"Initializing RAD Monitor",showAuthPrompt:!1,mainContentVisible:!1,error:null,activeModal:null,growlMessages:[]},data:{events:[],filteredEvents:[],stats:{critical:0,warning:0,normal:0,increased:0},lastUpdate:null},filters:{search:"",status:"all",radTypes:[]},actions:{checkAuth:async()=>{s(a=>({auth:{...a.auth,isChecking:!0,error:null}}));const t=Date.now();try{let a=null,i=null;if(window.CentralizedAuth&&(a=window.CentralizedAuth.getStatus(),console.log("🔍 CentralizedAuth status:",a),a.hasAuth&&!a.expired&&(i=window.CentralizedAuth.getCookie(),console.log("🔑 Got cookie from CentralizedAuth"))),!i){console.log("⚠️ No cookie from CentralizedAuth, checking other sources...");const m=["elastic_cookie","elasticCookie","rad_monitor_auth"];for(const h of m){const b=localStorage.getItem(h);if(b)try{const w=JSON.parse(b);if(w.cookie){i=w.cookie;break}}catch{if(b.startsWith("sid=")||b.startsWith("Fe26.2")){i=b;break}}}}if(i){console.log("✅ Found stored cookie, authenticating...");const m=Date.now()-t;return m<300&&await new Promise(h=>setTimeout(h,300-m)),s(h=>({auth:{...h.auth,isAuthenticated:!0,cookie:i,method:"stored",isChecking:!1},ui:{...h.ui,showAuthPrompt:!1}})),console.log("🔐 Auth state updated: authenticated=true, showAuthPrompt=false"),!0}const r=new URLSearchParams(window.location.search).get("sid");if(r){const m=`sid=${r}`;window.CentralizedAuth?await window.CentralizedAuth.setCookie(m,{source:"url"}):localStorage.setItem("elastic_cookie",m),window.history.replaceState({},document.title,window.location.pathname);const h=Date.now()-t;return h<300&&await new Promise(b=>setTimeout(b,300-h)),s(b=>({auth:{...b.auth,isAuthenticated:!0,cookie:m,method:"url",isChecking:!1},ui:{...b.ui,showAuthPrompt:!1}})),!0}const n=Date.now()-t;return n<300&&await new Promise(m=>setTimeout(m,300-n)),console.log("⚠️ No authentication found, showing auth prompt"),s(m=>({auth:{...m.auth,isAuthenticated:!1,isChecking:!1},ui:{...m.ui,showAuthPrompt:!0,isLoading:!1}})),!1}catch(a){const i=Date.now()-t;return i<300&&await new Promise(o=>setTimeout(o,300-i)),s(o=>({auth:{...o.auth,error:a.message,isChecking:!1},ui:{...o.ui,showAuthPrompt:!0,isLoading:!1}})),!1}},setCookie:async t=>{const a=t.startsWith("sid=")?t:`sid=${t}`;window.CentralizedAuth?await window.CentralizedAuth.setCookie(a,{source:"manual"}):localStorage.setItem("elastic_cookie",a),s(i=>({auth:{...i.auth,isAuthenticated:!0,cookie:a,method:"manual",error:null},ui:{...i.ui,showAuthPrompt:!1}}))},clearAuth:()=>{window.CentralizedAuth?window.CentralizedAuth.clearAuth():localStorage.removeItem("elastic_cookie"),s(t=>({auth:{isAuthenticated:!1,isChecking:!1,cookie:null,method:null,error:null},ui:{...t.ui,showAuthPrompt:!0,mainContentVisible:!1}}))},updateConnection:(t,a)=>{s(i=>({connection:{...i.connection,[t]:{...i.connection[t],...a}}}))},setLoading:(t,a)=>{s(i=>({ui:{...i.ui,isLoading:t,loadingMessage:a||i.ui.loadingMessage}}))},setError:t=>{s(a=>({ui:{...a.ui,error:t}}))},showAuthPrompt:()=>{s(t=>({ui:{...t.ui,showAuthPrompt:!0,isLoading:!1}}))},hideAuthPrompt:()=>{s(t=>({ui:{...t.ui,showAuthPrompt:!1}}))},showMainContent:()=>{s(t=>({ui:{...t.ui,isLoading:!1,mainContentVisible:!0,showAuthPrompt:!1}}))},hideMainContent:()=>{s(t=>({ui:{...t.ui,mainContentVisible:!1}}))},showModal:t=>{s(a=>({ui:{...a.ui,activeModal:t}}))},hideModal:()=>{s(t=>({ui:{...t.ui,activeModal:null}}))},showGrowl:(t,a="info",i=3e3)=>{const o=Date.now(),r={id:o,message:t,type:a,duration:i};s(n=>({ui:{...n.ui,growlMessages:[...n.ui.growlMessages,r]}})),setTimeout(()=>{e().actions.removeGrowl(o)},i)},removeGrowl:t=>{s(a=>({ui:{...a.ui,growlMessages:a.ui.growlMessages.filter(i=>i.id!==t)}}))},setData:t=>{const a=t.reduce((i,o)=>{const r=o.status.toLowerCase();return i[r]!==void 0&&i[r]++,i},{critical:0,warning:0,normal:0,increased:0});s(i=>({data:{...i.data,events:t,stats:a,lastUpdate:new Date().toISOString()}})),e().actions.applyFilters()},setFilter:(t,a)=>{s(i=>({filters:{...i.filters,[t]:a}})),e().actions.applyFilters()},applyFilters:()=>{const{events:t}=e().data,{search:a,status:i,radTypes:o}=e().filters;let r=t;if(i!=="all"&&(r=r.filter(n=>n.status.toLowerCase()===i)),a){const n=a.toLowerCase();r=r.filter(m=>m.name.toLowerCase().includes(n)||m.radType?.toLowerCase().includes(n))}o.length>0&&(r=r.filter(n=>o.includes(n.radType))),s(n=>({data:{...n.data,filteredEvents:r}}))},initialize:async()=>{try{return console.log("🚀 Initializing RAD Monitor with Antares components..."),e().actions.setLoading(!0,"Initializing RAD Monitor..."),e().actions.setLoading(!0,"Checking authentication..."),await e().actions.checkAuth()?(e().actions.setLoading(!0,"Connecting to API..."),e().actions.updateConnection("api",{connected:!0,message:"Connected"}),e().actions.setLoading(!0,"Loading data..."),e().actions.updateConnection("data",{loaded:!0,message:"Ready"}),e().actions.setLoading(!0,"Loading formula builder..."),e().actions.updateConnection("formula",{initialized:!0,message:"Ready"}),setTimeout(()=>{e().actions.showMainContent(),e().actions.showGrowl("RAD Monitor ready!","success"),console.log("✅ RAD Monitor ready!")},500),!0):(console.log("⚠️ Not authenticated, showing auth prompt"),!1)}catch(t){return console.error("❌ Initialization failed:",t),e().actions.setError(t.message),e().actions.showGrowl(t.message,"error"),e().actions.showAuthPrompt(),!1}}}})),de=()=>j.getState().actions,Oi=s=>j.subscribe(s);window.appStore=j;console.log("📦 App store initialized with Zustand + Antares integration");const we={colors:{background:{primary:"#1e2836",secondary:"#2a3b52"},text:{primary:"rgb(222, 222, 222)",secondary:"rgba(222, 222, 222, 0.9)",accent:"#ff6900"},border:{primary:"rgba(222, 222, 222, 0.3)",secondary:"rgba(222, 222, 222, 0.2)"}}};/*! @license DOMPurify 3.2.6 | (c) Cure53 and other contributors | Released under the Apache license 2.0 and Mozilla Public License 2.0 | github.com/cure53/DOMPurify/blob/3.2.6/LICENSE */const{entries:Qa,setPrototypeOf:Na,isFrozen:Mi,getPrototypeOf:Fi,getOwnPropertyDescriptor:Pi}=Object;let{freeze:Z,seal:oe,create:Ka}=Object,{apply:Xt,construct:Jt}=typeof Reflect<"u"&&Reflect;Z||(Z=function(e){return e});oe||(oe=function(e){return e});Xt||(Xt=function(e,t,a){return e.apply(t,a)});Jt||(Jt=function(e,t){return new e(...t)});const ft=ee(Array.prototype.forEach),$i=ee(Array.prototype.lastIndexOf),Da=ee(Array.prototype.pop),Qe=ee(Array.prototype.push),zi=ee(Array.prototype.splice),bt=ee(String.prototype.toLowerCase),Ht=ee(String.prototype.toString),Oa=ee(String.prototype.match),Ke=ee(String.prototype.replace),Ui=ee(String.prototype.indexOf),Bi=ee(String.prototype.trim),ue=ee(Object.prototype.hasOwnProperty),J=ee(RegExp.prototype.test),Ye=Hi(TypeError);function ee(s){return function(e){e instanceof RegExp&&(e.lastIndex=0);for(var t=arguments.length,a=new Array(t>1?t-1:0),i=1;i<t;i++)a[i-1]=arguments[i];return Xt(s,e,a)}}function Hi(s){return function(){for(var e=arguments.length,t=new Array(e),a=0;a<e;a++)t[a]=arguments[a];return Jt(s,t)}}function I(s,e){let t=arguments.length>2&&arguments[2]!==void 0?arguments[2]:bt;Na&&Na(s,null);let a=e.length;for(;a--;){let i=e[a];if(typeof i=="string"){const o=t(i);o!==i&&(Mi(e)||(e[a]=o),i=o)}s[i]=!0}return s}function qi(s){for(let e=0;e<s.length;e++)ue(s,e)||(s[e]=null);return s}function xe(s){const e=Ka(null);for(const[t,a]of Qa(s))ue(s,t)&&(Array.isArray(a)?e[t]=qi(a):a&&typeof a=="object"&&a.constructor===Object?e[t]=xe(a):e[t]=a);return e}function Xe(s,e){for(;s!==null;){const a=Pi(s,e);if(a){if(a.get)return ee(a.get);if(typeof a.value=="function")return ee(a.value)}s=Fi(s)}function t(){return null}return t}const Ma=Z(["a","abbr","acronym","address","area","article","aside","audio","b","bdi","bdo","big","blink","blockquote","body","br","button","canvas","caption","center","cite","code","col","colgroup","content","data","datalist","dd","decorator","del","details","dfn","dialog","dir","div","dl","dt","element","em","fieldset","figcaption","figure","font","footer","form","h1","h2","h3","h4","h5","h6","head","header","hgroup","hr","html","i","img","input","ins","kbd","label","legend","li","main","map","mark","marquee","menu","menuitem","meter","nav","nobr","ol","optgroup","option","output","p","picture","pre","progress","q","rp","rt","ruby","s","samp","section","select","shadow","small","source","spacer","span","strike","strong","style","sub","summary","sup","table","tbody","td","template","textarea","tfoot","th","thead","time","tr","track","tt","u","ul","var","video","wbr"]),qt=Z(["svg","a","altglyph","altglyphdef","altglyphitem","animatecolor","animatemotion","animatetransform","circle","clippath","defs","desc","ellipse","filter","font","g","glyph","glyphref","hkern","image","line","lineargradient","marker","mask","metadata","mpath","path","pattern","polygon","polyline","radialgradient","rect","stop","style","switch","symbol","text","textpath","title","tref","tspan","view","vkern"]),Vt=Z(["feBlend","feColorMatrix","feComponentTransfer","feComposite","feConvolveMatrix","feDiffuseLighting","feDisplacementMap","feDistantLight","feDropShadow","feFlood","feFuncA","feFuncB","feFuncG","feFuncR","feGaussianBlur","feImage","feMerge","feMergeNode","feMorphology","feOffset","fePointLight","feSpecularLighting","feSpotLight","feTile","feTurbulence"]),Vi=Z(["animate","color-profile","cursor","discard","font-face","font-face-format","font-face-name","font-face-src","font-face-uri","foreignobject","hatch","hatchpath","mesh","meshgradient","meshpatch","meshrow","missing-glyph","script","set","solidcolor","unknown","use"]),Gt=Z(["math","menclose","merror","mfenced","mfrac","mglyph","mi","mlabeledtr","mmultiscripts","mn","mo","mover","mpadded","mphantom","mroot","mrow","ms","mspace","msqrt","mstyle","msub","msup","msubsup","mtable","mtd","mtext","mtr","munder","munderover","mprescripts"]),Gi=Z(["maction","maligngroup","malignmark","mlongdiv","mscarries","mscarry","msgroup","mstack","msline","msrow","semantics","annotation","annotation-xml","mprescripts","none"]),Fa=Z(["#text"]),Pa=Z(["accept","action","align","alt","autocapitalize","autocomplete","autopictureinpicture","autoplay","background","bgcolor","border","capture","cellpadding","cellspacing","checked","cite","class","clear","color","cols","colspan","controls","controlslist","coords","crossorigin","datetime","decoding","default","dir","disabled","disablepictureinpicture","disableremoteplayback","download","draggable","enctype","enterkeyhint","face","for","headers","height","hidden","high","href","hreflang","id","inputmode","integrity","ismap","kind","label","lang","list","loading","loop","low","max","maxlength","media","method","min","minlength","multiple","muted","name","nonce","noshade","novalidate","nowrap","open","optimum","pattern","placeholder","playsinline","popover","popovertarget","popovertargetaction","poster","preload","pubdate","radiogroup","readonly","rel","required","rev","reversed","role","rows","rowspan","spellcheck","scope","selected","shape","size","sizes","span","srclang","start","src","srcset","step","style","summary","tabindex","title","translate","type","usemap","valign","value","width","wrap","xmlns","slot"]),Wt=Z(["accent-height","accumulate","additive","alignment-baseline","amplitude","ascent","attributename","attributetype","azimuth","basefrequency","baseline-shift","begin","bias","by","class","clip","clippathunits","clip-path","clip-rule","color","color-interpolation","color-interpolation-filters","color-profile","color-rendering","cx","cy","d","dx","dy","diffuseconstant","direction","display","divisor","dur","edgemode","elevation","end","exponent","fill","fill-opacity","fill-rule","filter","filterunits","flood-color","flood-opacity","font-family","font-size","font-size-adjust","font-stretch","font-style","font-variant","font-weight","fx","fy","g1","g2","glyph-name","glyphref","gradientunits","gradienttransform","height","href","id","image-rendering","in","in2","intercept","k","k1","k2","k3","k4","kerning","keypoints","keysplines","keytimes","lang","lengthadjust","letter-spacing","kernelmatrix","kernelunitlength","lighting-color","local","marker-end","marker-mid","marker-start","markerheight","markerunits","markerwidth","maskcontentunits","maskunits","max","mask","media","method","mode","min","name","numoctaves","offset","operator","opacity","order","orient","orientation","origin","overflow","paint-order","path","pathlength","patterncontentunits","patterntransform","patternunits","points","preservealpha","preserveaspectratio","primitiveunits","r","rx","ry","radius","refx","refy","repeatcount","repeatdur","restart","result","rotate","scale","seed","shape-rendering","slope","specularconstant","specularexponent","spreadmethod","startoffset","stddeviation","stitchtiles","stop-color","stop-opacity","stroke-dasharray","stroke-dashoffset","stroke-linecap","stroke-linejoin","stroke-miterlimit","stroke-opacity","stroke","stroke-width","style","surfacescale","systemlanguage","tabindex","tablevalues","targetx","targety","transform","transform-origin","text-anchor","text-decoration","text-rendering","textlength","type","u1","u2","unicode","values","viewbox","visibility","version","vert-adv-y","vert-origin-x","vert-origin-y","width","word-spacing","wrap","writing-mode","xchannelselector","ychannelselector","x","x1","x2","xmlns","y","y1","y2","z","zoomandpan"]),$a=Z(["accent","accentunder","align","bevelled","close","columnsalign","columnlines","columnspan","denomalign","depth","dir","display","displaystyle","encoding","fence","frame","height","href","id","largeop","length","linethickness","lspace","lquote","mathbackground","mathcolor","mathsize","mathvariant","maxsize","minsize","movablelimits","notation","numalign","open","rowalign","rowlines","rowspacing","rowspan","rspace","rquote","scriptlevel","scriptminsize","scriptsizemultiplier","selection","separator","separators","stretchy","subscriptshift","supscriptshift","symmetric","voffset","width","xmlns"]),gt=Z(["xlink:href","xml:id","xlink:title","xml:space","xmlns:xlink"]),Wi=oe(/\{\{[\w\W]*|[\w\W]*\}\}/gm),ji=oe(/<%[\w\W]*|[\w\W]*%>/gm),Qi=oe(/\$\{[\w\W]*/gm),Ki=oe(/^data-[\-\w.\u00B7-\uFFFF]+$/),Yi=oe(/^aria-[\-\w]+$/),Ya=oe(/^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i),Xi=oe(/^(?:\w+script|data):/i),Ji=oe(/[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g),Xa=oe(/^html$/i),Zi=oe(/^[a-z][.\w]*(-[.\w]+)+$/i);var za=Object.freeze({__proto__:null,ARIA_ATTR:Yi,ATTR_WHITESPACE:Ji,CUSTOM_ELEMENT:Zi,DATA_ATTR:Ki,DOCTYPE_NAME:Xa,ERB_EXPR:ji,IS_ALLOWED_URI:Ya,IS_SCRIPT_OR_DATA:Xi,MUSTACHE_EXPR:Wi,TMPLIT_EXPR:Qi});const Je={element:1,text:3,progressingInstruction:7,comment:8,document:9},es=function(){return typeof window>"u"?null:window},ts=function(e,t){if(typeof e!="object"||typeof e.createPolicy!="function")return null;let a=null;const i="data-tt-policy-suffix";t&&t.hasAttribute(i)&&(a=t.getAttribute(i));const o="dompurify"+(a?"#"+a:"");try{return e.createPolicy(o,{createHTML(r){return r},createScriptURL(r){return r}})}catch{return console.warn("TrustedTypes policy "+o+" could not be created."),null}},Ua=function(){return{afterSanitizeAttributes:[],afterSanitizeElements:[],afterSanitizeShadowDOM:[],beforeSanitizeAttributes:[],beforeSanitizeElements:[],beforeSanitizeShadowDOM:[],uponSanitizeAttribute:[],uponSanitizeElement:[],uponSanitizeShadowNode:[]}};function Ja(){let s=arguments.length>0&&arguments[0]!==void 0?arguments[0]:es();const e=S=>Ja(S);if(e.version="3.2.6",e.removed=[],!s||!s.document||s.document.nodeType!==Je.document||!s.Element)return e.isSupported=!1,e;let{document:t}=s;const a=t,i=a.currentScript,{DocumentFragment:o,HTMLTemplateElement:r,Node:n,Element:m,NodeFilter:h,NamedNodeMap:b=s.NamedNodeMap||s.MozNamedAttrMap,HTMLFormElement:w,DOMParser:T,trustedTypes:R}=s,_=m.prototype,O=Xe(_,"cloneNode"),me=Xe(_,"remove"),re=Xe(_,"nextSibling"),N=Xe(_,"childNodes"),ne=Xe(_,"parentNode");if(typeof r=="function"){const S=t.createElement("template");S.content&&S.content.ownerDocument&&(t=S.content.ownerDocument)}let $,l="";const{implementation:u,createNodeIterator:d,createDocumentFragment:p,getElementsByTagName:f}=t,{importNode:y}=a;let x=Ua();e.isSupported=typeof Qa=="function"&&typeof ne=="function"&&u&&u.createHTMLDocument!==void 0;const{MUSTACHE_EXPR:U,ERB_EXPR:Q,TMPLIT_EXPR:G,DATA_ATTR:X,ARIA_ATTR:pe,IS_SCRIPT_OR_DATA:qe,ATTR_WHITESPACE:fe,CUSTOM_ELEMENT:Ie}=za;let{IS_ALLOWED_URI:nt}=za,B=null;const ge=I({},[...Ma,...qt,...Vt,...Gt,...Fa]);let W=null;const ca=I({},[...Pa,...Wt,...$a,...gt]);let z=Object.seal(Ka(null,{tagNameCheck:{writable:!0,configurable:!1,enumerable:!0,value:null},attributeNameCheck:{writable:!0,configurable:!1,enumerable:!0,value:null},allowCustomizedBuiltInElements:{writable:!0,configurable:!1,enumerable:!0,value:!1}})),Ve=null,It=null,ua=!0,Nt=!0,da=!1,ha=!0,Ne=!1,lt=!0,ke=!1,Dt=!1,Ot=!1,De=!1,ct=!1,ut=!1,ma=!0,pa=!1;const Ci="user-content-";let Mt=!0,Ge=!1,Oe={},Me=null;const fa=I({},["annotation-xml","audio","colgroup","desc","foreignobject","head","iframe","math","mi","mn","mo","ms","mtext","noembed","noframes","noscript","plaintext","script","style","svg","template","thead","title","video","xmp"]);let ga=null;const ya=I({},["audio","video","img","source","image","track"]);let Ft=null;const va=I({},["alt","class","for","id","label","name","pattern","placeholder","role","summary","title","value","style","xmlns"]),dt="http://www.w3.org/1998/Math/MathML",ht="http://www.w3.org/2000/svg",ye="http://www.w3.org/1999/xhtml";let Fe=ye,Pt=!1,$t=null;const Si=I({},[dt,ht,ye],Ht);let mt=I({},["mi","mo","mn","ms","mtext"]),pt=I({},["annotation-xml"]);const Ai=I({},["title","style","font","a","script"]);let We=null;const Ti=["application/xhtml+xml","text/html"],ki="text/html";let V=null,Pe=null;const Ri=t.createElement("form"),ba=function(c){return c instanceof RegExp||c instanceof Function},zt=function(){let c=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{};if(!(Pe&&Pe===c)){if((!c||typeof c!="object")&&(c={}),c=xe(c),We=Ti.indexOf(c.PARSER_MEDIA_TYPE)===-1?ki:c.PARSER_MEDIA_TYPE,V=We==="application/xhtml+xml"?Ht:bt,B=ue(c,"ALLOWED_TAGS")?I({},c.ALLOWED_TAGS,V):ge,W=ue(c,"ALLOWED_ATTR")?I({},c.ALLOWED_ATTR,V):ca,$t=ue(c,"ALLOWED_NAMESPACES")?I({},c.ALLOWED_NAMESPACES,Ht):Si,Ft=ue(c,"ADD_URI_SAFE_ATTR")?I(xe(va),c.ADD_URI_SAFE_ATTR,V):va,ga=ue(c,"ADD_DATA_URI_TAGS")?I(xe(ya),c.ADD_DATA_URI_TAGS,V):ya,Me=ue(c,"FORBID_CONTENTS")?I({},c.FORBID_CONTENTS,V):fa,Ve=ue(c,"FORBID_TAGS")?I({},c.FORBID_TAGS,V):xe({}),It=ue(c,"FORBID_ATTR")?I({},c.FORBID_ATTR,V):xe({}),Oe=ue(c,"USE_PROFILES")?c.USE_PROFILES:!1,ua=c.ALLOW_ARIA_ATTR!==!1,Nt=c.ALLOW_DATA_ATTR!==!1,da=c.ALLOW_UNKNOWN_PROTOCOLS||!1,ha=c.ALLOW_SELF_CLOSE_IN_ATTR!==!1,Ne=c.SAFE_FOR_TEMPLATES||!1,lt=c.SAFE_FOR_XML!==!1,ke=c.WHOLE_DOCUMENT||!1,De=c.RETURN_DOM||!1,ct=c.RETURN_DOM_FRAGMENT||!1,ut=c.RETURN_TRUSTED_TYPE||!1,Ot=c.FORCE_BODY||!1,ma=c.SANITIZE_DOM!==!1,pa=c.SANITIZE_NAMED_PROPS||!1,Mt=c.KEEP_CONTENT!==!1,Ge=c.IN_PLACE||!1,nt=c.ALLOWED_URI_REGEXP||Ya,Fe=c.NAMESPACE||ye,mt=c.MATHML_TEXT_INTEGRATION_POINTS||mt,pt=c.HTML_INTEGRATION_POINTS||pt,z=c.CUSTOM_ELEMENT_HANDLING||{},c.CUSTOM_ELEMENT_HANDLING&&ba(c.CUSTOM_ELEMENT_HANDLING.tagNameCheck)&&(z.tagNameCheck=c.CUSTOM_ELEMENT_HANDLING.tagNameCheck),c.CUSTOM_ELEMENT_HANDLING&&ba(c.CUSTOM_ELEMENT_HANDLING.attributeNameCheck)&&(z.attributeNameCheck=c.CUSTOM_ELEMENT_HANDLING.attributeNameCheck),c.CUSTOM_ELEMENT_HANDLING&&typeof c.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements=="boolean"&&(z.allowCustomizedBuiltInElements=c.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements),Ne&&(Nt=!1),ct&&(De=!0),Oe&&(B=I({},Fa),W=[],Oe.html===!0&&(I(B,Ma),I(W,Pa)),Oe.svg===!0&&(I(B,qt),I(W,Wt),I(W,gt)),Oe.svgFilters===!0&&(I(B,Vt),I(W,Wt),I(W,gt)),Oe.mathMl===!0&&(I(B,Gt),I(W,$a),I(W,gt))),c.ADD_TAGS&&(B===ge&&(B=xe(B)),I(B,c.ADD_TAGS,V)),c.ADD_ATTR&&(W===ca&&(W=xe(W)),I(W,c.ADD_ATTR,V)),c.ADD_URI_SAFE_ATTR&&I(Ft,c.ADD_URI_SAFE_ATTR,V),c.FORBID_CONTENTS&&(Me===fa&&(Me=xe(Me)),I(Me,c.FORBID_CONTENTS,V)),Mt&&(B["#text"]=!0),ke&&I(B,["html","head","body"]),B.table&&(I(B,["tbody"]),delete Ve.tbody),c.TRUSTED_TYPES_POLICY){if(typeof c.TRUSTED_TYPES_POLICY.createHTML!="function")throw Ye('TRUSTED_TYPES_POLICY configuration option must provide a "createHTML" hook.');if(typeof c.TRUSTED_TYPES_POLICY.createScriptURL!="function")throw Ye('TRUSTED_TYPES_POLICY configuration option must provide a "createScriptURL" hook.');$=c.TRUSTED_TYPES_POLICY,l=$.createHTML("")}else $===void 0&&($=ts(R,i)),$!==null&&typeof l=="string"&&(l=$.createHTML(""));Z&&Z(c),Pe=c}},wa=I({},[...qt,...Vt,...Vi]),Ea=I({},[...Gt,...Gi]),_i=function(c){let g=ne(c);(!g||!g.tagName)&&(g={namespaceURI:Fe,tagName:"template"});const C=bt(c.tagName),F=bt(g.tagName);return $t[c.namespaceURI]?c.namespaceURI===ht?g.namespaceURI===ye?C==="svg":g.namespaceURI===dt?C==="svg"&&(F==="annotation-xml"||mt[F]):!!wa[C]:c.namespaceURI===dt?g.namespaceURI===ye?C==="math":g.namespaceURI===ht?C==="math"&&pt[F]:!!Ea[C]:c.namespaceURI===ye?g.namespaceURI===ht&&!pt[F]||g.namespaceURI===dt&&!mt[F]?!1:!Ea[C]&&(Ai[C]||!wa[C]):!!(We==="application/xhtml+xml"&&$t[c.namespaceURI]):!1},he=function(c){Qe(e.removed,{element:c});try{ne(c).removeChild(c)}catch{me(c)}},$e=function(c,g){try{Qe(e.removed,{attribute:g.getAttributeNode(c),from:g})}catch{Qe(e.removed,{attribute:null,from:g})}if(g.removeAttribute(c),c==="is")if(De||ct)try{he(g)}catch{}else try{g.setAttribute(c,"")}catch{}},xa=function(c){let g=null,C=null;if(Ot)c="<remove></remove>"+c;else{const q=Oa(c,/^[\r\n\t ]+/);C=q&&q[0]}We==="application/xhtml+xml"&&Fe===ye&&(c='<html xmlns="http://www.w3.org/1999/xhtml"><head></head><body>'+c+"</body></html>");const F=$?$.createHTML(c):c;if(Fe===ye)try{g=new T().parseFromString(F,We)}catch{}if(!g||!g.documentElement){g=u.createDocument(Fe,"template",null);try{g.documentElement.innerHTML=Pt?l:F}catch{}}const K=g.body||g.documentElement;return c&&C&&K.insertBefore(t.createTextNode(C),K.childNodes[0]||null),Fe===ye?f.call(g,ke?"html":"body")[0]:ke?g.documentElement:K},Ca=function(c){return d.call(c.ownerDocument||c,c,h.SHOW_ELEMENT|h.SHOW_COMMENT|h.SHOW_TEXT|h.SHOW_PROCESSING_INSTRUCTION|h.SHOW_CDATA_SECTION,null)},Ut=function(c){return c instanceof w&&(typeof c.nodeName!="string"||typeof c.textContent!="string"||typeof c.removeChild!="function"||!(c.attributes instanceof b)||typeof c.removeAttribute!="function"||typeof c.setAttribute!="function"||typeof c.namespaceURI!="string"||typeof c.insertBefore!="function"||typeof c.hasChildNodes!="function")},Sa=function(c){return typeof n=="function"&&c instanceof n};function ve(S,c,g){ft(S,C=>{C.call(e,c,g,Pe)})}const Aa=function(c){let g=null;if(ve(x.beforeSanitizeElements,c,null),Ut(c))return he(c),!0;const C=V(c.nodeName);if(ve(x.uponSanitizeElement,c,{tagName:C,allowedTags:B}),lt&&c.hasChildNodes()&&!Sa(c.firstElementChild)&&J(/<[/\w!]/g,c.innerHTML)&&J(/<[/\w!]/g,c.textContent)||c.nodeType===Je.progressingInstruction||lt&&c.nodeType===Je.comment&&J(/<[/\w]/g,c.data))return he(c),!0;if(!B[C]||Ve[C]){if(!Ve[C]&&ka(C)&&(z.tagNameCheck instanceof RegExp&&J(z.tagNameCheck,C)||z.tagNameCheck instanceof Function&&z.tagNameCheck(C)))return!1;if(Mt&&!Me[C]){const F=ne(c)||c.parentNode,K=N(c)||c.childNodes;if(K&&F){const q=K.length;for(let te=q-1;te>=0;--te){const be=O(K[te],!0);be.__removalCount=(c.__removalCount||0)+1,F.insertBefore(be,re(c))}}}return he(c),!0}return c instanceof m&&!_i(c)||(C==="noscript"||C==="noembed"||C==="noframes")&&J(/<\/no(script|embed|frames)/i,c.innerHTML)?(he(c),!0):(Ne&&c.nodeType===Je.text&&(g=c.textContent,ft([U,Q,G],F=>{g=Ke(g,F," ")}),c.textContent!==g&&(Qe(e.removed,{element:c.cloneNode()}),c.textContent=g)),ve(x.afterSanitizeElements,c,null),!1)},Ta=function(c,g,C){if(ma&&(g==="id"||g==="name")&&(C in t||C in Ri))return!1;if(!(Nt&&!It[g]&&J(X,g))){if(!(ua&&J(pe,g))){if(!W[g]||It[g]){if(!(ka(c)&&(z.tagNameCheck instanceof RegExp&&J(z.tagNameCheck,c)||z.tagNameCheck instanceof Function&&z.tagNameCheck(c))&&(z.attributeNameCheck instanceof RegExp&&J(z.attributeNameCheck,g)||z.attributeNameCheck instanceof Function&&z.attributeNameCheck(g))||g==="is"&&z.allowCustomizedBuiltInElements&&(z.tagNameCheck instanceof RegExp&&J(z.tagNameCheck,C)||z.tagNameCheck instanceof Function&&z.tagNameCheck(C))))return!1}else if(!Ft[g]){if(!J(nt,Ke(C,fe,""))){if(!((g==="src"||g==="xlink:href"||g==="href")&&c!=="script"&&Ui(C,"data:")===0&&ga[c])){if(!(da&&!J(qe,Ke(C,fe,"")))){if(C)return!1}}}}}}return!0},ka=function(c){return c!=="annotation-xml"&&Oa(c,Ie)},Ra=function(c){ve(x.beforeSanitizeAttributes,c,null);const{attributes:g}=c;if(!g||Ut(c))return;const C={attrName:"",attrValue:"",keepAttr:!0,allowedAttributes:W,forceKeepAttr:void 0};let F=g.length;for(;F--;){const K=g[F],{name:q,namespaceURI:te,value:be}=K,je=V(q),Bt=be;let Y=q==="value"?Bt:Bi(Bt);if(C.attrName=je,C.attrValue=Y,C.keepAttr=!0,C.forceKeepAttr=void 0,ve(x.uponSanitizeAttribute,c,C),Y=C.attrValue,pa&&(je==="id"||je==="name")&&($e(q,c),Y=Ci+Y),lt&&J(/((--!?|])>)|<\/(style|title)/i,Y)){$e(q,c);continue}if(C.forceKeepAttr)continue;if(!C.keepAttr){$e(q,c);continue}if(!ha&&J(/\/>/i,Y)){$e(q,c);continue}Ne&&ft([U,Q,G],La=>{Y=Ke(Y,La," ")});const _a=V(c.nodeName);if(!Ta(_a,je,Y)){$e(q,c);continue}if($&&typeof R=="object"&&typeof R.getAttributeType=="function"&&!te)switch(R.getAttributeType(_a,je)){case"TrustedHTML":{Y=$.createHTML(Y);break}case"TrustedScriptURL":{Y=$.createScriptURL(Y);break}}if(Y!==Bt)try{te?c.setAttributeNS(te,q,Y):c.setAttribute(q,Y),Ut(c)?he(c):Da(e.removed)}catch{$e(q,c)}}ve(x.afterSanitizeAttributes,c,null)},Li=function S(c){let g=null;const C=Ca(c);for(ve(x.beforeSanitizeShadowDOM,c,null);g=C.nextNode();)ve(x.uponSanitizeShadowNode,g,null),Aa(g),Ra(g),g.content instanceof o&&S(g.content);ve(x.afterSanitizeShadowDOM,c,null)};return e.sanitize=function(S){let c=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},g=null,C=null,F=null,K=null;if(Pt=!S,Pt&&(S="<!-->"),typeof S!="string"&&!Sa(S))if(typeof S.toString=="function"){if(S=S.toString(),typeof S!="string")throw Ye("dirty is not a string, aborting")}else throw Ye("toString is not a function");if(!e.isSupported)return S;if(Dt||zt(c),e.removed=[],typeof S=="string"&&(Ge=!1),Ge){if(S.nodeName){const be=V(S.nodeName);if(!B[be]||Ve[be])throw Ye("root node is forbidden and cannot be sanitized in-place")}}else if(S instanceof n)g=xa("<!---->"),C=g.ownerDocument.importNode(S,!0),C.nodeType===Je.element&&C.nodeName==="BODY"||C.nodeName==="HTML"?g=C:g.appendChild(C);else{if(!De&&!Ne&&!ke&&S.indexOf("<")===-1)return $&&ut?$.createHTML(S):S;if(g=xa(S),!g)return De?null:ut?l:""}g&&Ot&&he(g.firstChild);const q=Ca(Ge?S:g);for(;F=q.nextNode();)Aa(F),Ra(F),F.content instanceof o&&Li(F.content);if(Ge)return S;if(De){if(ct)for(K=p.call(g.ownerDocument);g.firstChild;)K.appendChild(g.firstChild);else K=g;return(W.shadowroot||W.shadowrootmode)&&(K=y.call(a,K,!0)),K}let te=ke?g.outerHTML:g.innerHTML;return ke&&B["!doctype"]&&g.ownerDocument&&g.ownerDocument.doctype&&g.ownerDocument.doctype.name&&J(Xa,g.ownerDocument.doctype.name)&&(te="<!DOCTYPE "+g.ownerDocument.doctype.name+`>
`+te),Ne&&ft([U,Q,G],be=>{te=Ke(te,be," ")}),$&&ut?$.createHTML(te):te},e.setConfig=function(){let S=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{};zt(S),Dt=!0},e.clearConfig=function(){Pe=null,Dt=!1},e.isValidAttribute=function(S,c,g){Pe||zt({});const C=V(S),F=V(c);return Ta(C,F,g)},e.addHook=function(S,c){typeof c=="function"&&Qe(x[S],c)},e.removeHook=function(S,c){if(c!==void 0){const g=$i(x[S],c);return g===-1?void 0:zi(x[S],g,1)[0]}return Da(x[S])},e.removeHooks=function(S){x[S]=[]},e.removeAllHooks=function(){x=Ua()},e}var k=Ja();class as{constructor(){this.overlay=null,this.unsubscribe=null,this.init()}init(){this.createOverlay(),this.addStyles(),this.subscribeToStore(),this.show()}createOverlay(){this.overlay=document.createElement("div"),this.overlay.id="loadingOverlay",this.overlay.className="loading-overlay",document.body.appendChild(this.overlay)}subscribeToStore(){this.unsubscribe=j.subscribe(e=>{e.ui.isLoading?(this.updateContent(e),this.show()):this.hide()})}updateContent(e){const{loadingMessage:t}=e.ui,{connection:a}=e,{auth:i}=e;this.overlay.innerHTML=k.sanitize(`
      <div class="loading-content">
        <div class="loading-card">
          <div class="loading-animation">
            <div class="loading-ring"></div>
            <div class="loading-icon">📊</div>
          </div>

          <h2 class="loading-title">${t}</h2>

          <div class="loading-status">
            ${this.renderStatusItem("api","API Connection",a.api)}
            ${this.renderStatusItem("auth","Authentication",{connected:i.isAuthenticated,message:i.isChecking?"Checking...":i.isAuthenticated?"Authenticated":"Not authenticated"})}
            ${this.renderStatusItem("data","Data Service",a.data)}
            ${this.renderStatusItem("formula","Formula Builder",a.formula)}
          </div>

          ${e.ui.error?`
            <div class="loading-error">
              <span class="error-icon">⚠️</span>
              <span class="error-message">${e.ui.error}</span>
            </div>
          `:""}
        </div>
      </div>
    `)}renderStatusItem(e,t,a){const i=a.connected||a.loaded||a.initialized;return`
      <div class="status-item ${i?"success":""}">
        <span class="status-icon">${i?"✅":"⏳"}</span>
        <span class="status-label">${t}</span>
        <span class="status-state">${a.message}</span>
      </div>
    `}show(){this.overlay&&(this.overlay.style.display="flex")}hide(){this.overlay&&(this.overlay.classList.add("fade-out"),setTimeout(()=>{this.overlay&&(this.overlay.style.display="none",this.overlay.classList.remove("fade-out"))},300))}addStyles(){if(document.getElementById("loadingOverlayStyles"))return;const e=document.createElement("style");e.id="loadingOverlayStyles",e.textContent=`
      .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: ${we.colors.background.primary};
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
        transition: opacity 0.3s ease;
      }

      .loading-overlay.fade-out {
        opacity: 0;
      }

      .loading-content {
        text-align: center;
        max-width: 450px;
        width: 90%;
      }

      .loading-card {
        background: ${we.colors.background.secondary};
        border: 1px solid ${we.colors.border.primary};
        border-radius: 16px;
        padding: 48px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
      }

      .loading-animation {
        position: relative;
        width: 80px;
        height: 80px;
        margin: 0 auto 32px;
      }

      .loading-ring {
        position: absolute;
        width: 100%;
        height: 100%;
        border: 3px solid ${we.colors.border.secondary};
        border-top-color: ${we.colors.text.accent};
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      .loading-icon {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 32px;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      .loading-title {
        color: ${we.colors.text.primary};
        font-size: 24px;
        margin: 0 0 32px 0;
        font-weight: 500;
      }

      .loading-status {
        display: flex;
        flex-direction: column;
        gap: 16px;
        text-align: left;
      }

      .status-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        background: ${we.colors.background.primary};
        border-radius: 8px;
        transition: all 0.3s ease;
      }

      .status-item.success {
        background: rgba(76, 175, 80, 0.1);
        border: 1px solid rgba(76, 175, 80, 0.3);
      }

      .status-icon {
        font-size: 20px;
        width: 24px;
        text-align: center;
        flex-shrink: 0;
      }

      .status-label {
        flex: 1;
        color: ${we.colors.text.primary};
        font-weight: 500;
      }

      .status-state {
        color: ${we.colors.text.secondary};
        font-size: 14px;
      }

      .loading-error {
        margin-top: 24px;
        padding: 16px;
        background: rgba(244, 67, 54, 0.1);
        border: 1px solid rgba(244, 67, 54, 0.3);
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 12px;
        color: #f44336;
      }

      .error-icon {
        font-size: 24px;
        flex-shrink: 0;
      }

      .error-message {
        flex: 1;
        text-align: left;
      }
    `,document.head.appendChild(e)}destroy(){this.unsubscribe&&this.unsubscribe(),this.overlay&&this.overlay.remove()}}const is=new as;window.loadingOverlay=is;class ss{constructor(){this.overlay=null,this.unsubscribe=null,this.isSubmitting=!1,this.init()}init(){this.createOverlay(),this.addStyles(),this.subscribeToStore(),this.addEventListeners()}createOverlay(){this.overlay=document.createElement("div"),this.overlay.id="authOverlay",this.overlay.className="auth-overlay",this.overlay.style.display="none",this.overlay.style.opacity="0",this.overlay.style.transition="opacity 0.2s ease-in-out",document.body.appendChild(this.overlay)}subscribeToStore(){this.unsubscribe=j.subscribe(t=>{t.ui.showAuthPrompt?(this.updateContent(t),this.show()):this.hide()});const e=j.getState();e.ui.showAuthPrompt?(this.updateContent(e),this.show()):this.hide()}updateContent(e){const{error:t}=e.auth;this.overlay.innerHTML=k.sanitize(`
      <div class="ux-modal__dialog ux-modal__dialog--medium">
        <div class="ux-modal__content">
          <div class="ux-modal__header">
            <h2 class="ux-text ux-text--heading-2">Authentication Required</h2>
          </div>

          <div class="ux-modal__body">
            <p class="ux-text ux-text--body-1" style="text-align: center; margin-bottom: 24px; color: #666;">
              Connect your Kibana session to view RAD traffic data
            </p>

            ${t?`
              <div class="ux-alert ux-alert--error" style="margin-bottom: 24px;">
                <span class="ux-icon ux-icon--error"></span>
                <div class="ux-alert__content">${t}</div>
              </div>
            `:""}

            <div class="ux-card" style="margin-bottom: 24px;">
              <div class="ux-card__body">
                <h3 class="ux-text ux-text--heading-4" style="margin-bottom: 16px;">Quick Setup</h3>
                <div class="setup-steps">
                  <div class="setup-step">
                    <span class="step-badge">1</span>
                    <span class="ux-text ux-text--body-2">Open Kibana in another tab</span>
                  </div>
                  <div class="setup-step">
                    <span class="step-badge">2</span>
                    <span class="ux-text ux-text--body-2">Open DevTools (F12) → Application → Cookies</span>
                  </div>
                  <div class="setup-step">
                    <span class="step-badge">3</span>
                    <span class="ux-text ux-text--body-2">Find and copy the "sid" cookie value</span>
                  </div>
                  <div class="setup-step">
                    <span class="step-badge">4</span>
                    <span class="ux-text ux-text--body-2">Paste it below</span>
                  </div>
                </div>
              </div>
            </div>

            <form class="auth-form">
              <div style="display: flex; gap: 12px;">
                <input
                  type="text"
                  id="cookieInput"
                  class="ux-text-input"
                  placeholder="Paste your sid cookie value here..."
                  style="flex: 1; padding: 12px 16px; font-size: 16px;"
                  ${this.isSubmitting?"disabled":""}
                />
                <button
                  type="submit"
                  class="ux-button ux-button--primary"
                  ${this.isSubmitting?"disabled":""}
                  style="padding: 12px 24px;"
                >
                  ${this.isSubmitting?'<span class="ux-spinner ux-spinner--small"></span>':"Connect"}
                </button>
              </div>
            </form>
          </div>

          <div class="ux-modal__footer" style="justify-content: center;">
            <a href="/kibana-cookie-sync.html" class="ux-button ux-button--tertiary">
              Use Cookie Sync Tool →
            </a>
          </div>
        </div>
      </div>
    `)}addEventListeners(){this.overlay.addEventListener("submit",e=>{e.target.classList.contains("auth-form")&&(e.preventDefault(),this.handleSubmit(e))}),this.overlay.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.id==="cookieInput"){e.preventDefault();const t=e.target.closest(".auth-form");t&&this.handleSubmit({target:t})}})}async handleSubmit(e){e.preventDefault();const a=this.overlay.querySelector("#cookieInput")?.value.trim();if(!a){this.showError("Please enter a cookie value");return}this.isSubmitting=!0,this.updateContent(j.getState());try{j.getState().actions.setCookie(a);const i=a.startsWith("sid=")?a:`sid=${a}`;console.log("🔐 Testing authentication with cookie: present");const o=await fetch("/api/v1/auth/status",{method:"GET",headers:{Cookie:i,"X-Elastic-Cookie":i},credentials:"include"});if(o.ok){const r=await o.json();if(console.log("📡 Auth status response:",r),r.authenticated)console.log("✅ Authentication successful: Cookie is valid"),localStorage.setItem("elastic_cookie",i),setTimeout(()=>{window.location.reload()},500);else throw new Error("Cookie not authenticated - please check your cookie value")}else{const r=await o.json().catch(()=>({}));throw new Error(r.detail||"Invalid cookie or connection failed")}}catch(i){console.error("Auth submission error:",i),this.showError(i.message),this.isSubmitting=!1,this.updateContent(j.getState())}}showError(e){const t=j.getState();j.setState({...t,auth:{...t.auth,error:e}})}show(){console.log("🔓 AuthOverlay.show() called"),this.overlay&&(this.overlay.style.display="flex",this.overlay.offsetHeight,this.overlay.style.opacity="1",setTimeout(()=>{const e=this.overlay.querySelector("#cookieInput");e&&!this.isSubmitting&&e.focus()},100))}hide(){console.log("🔒 AuthOverlay.hide() called"),this.overlay&&(this.overlay.style.opacity="0",setTimeout(()=>{this.overlay.style.display="none",this.isSubmitting=!1},200))}addStyles(){if(document.getElementById("authOverlayStyles"))return;const e=document.createElement("style");e.id="authOverlayStyles",e.textContent=`
      .auth-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(2px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      }

      /* Custom styles for authentication specific needs */
      .setup-steps {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .setup-step {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .step-badge {
        width: 24px;
        height: 24px;
        background: var(--gd-color-brand-primary, #ff6900);
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
        flex-shrink: 0;
      }

      /* UXCore text input styles */
      .ux-text-input {
        background: white;
        border: 1px solid var(--gd-color-border-primary, #d4d4d4);
        border-radius: 0.25rem;
        padding: 0.5rem 1rem;
        font-size: 1rem;
        color: var(--gd-color-text-primary, #111);
        transition: all 0.2s ease-in-out;
      }

      .ux-text-input:focus {
        outline: none;
        border-color: var(--gd-color-brand-primary, #ff6900);
        box-shadow: 0 0 0 2px rgba(255, 105, 0, 0.2);
      }

      .ux-text-input:disabled {
        background-color: var(--gd-color-background-secondary, #f5f5f5);
        color: var(--gd-color-text-secondary, #666);
        cursor: not-allowed;
      }

      /* Override modal dialog positioning for overlay */
      .auth-overlay .ux-modal__dialog {
        position: relative;
        margin: 0;
      }

      /* Clean form styling */
      .auth-form {
        margin: 0;
      }
    `,document.head.appendChild(e)}destroy(){this.unsubscribe&&this.unsubscribe(),this.overlay&&this.overlay.remove()}}const os=new ss;window.authOverlay=os;class rs{constructor(){this.keyPromise=this.getOrCreateKey()}async getOrCreateKey(){const e="RadMonitorCrypto",t="keys";return new Promise((a,i)=>{const o=indexedDB.open(e,1);o.onerror=()=>i(o.error),o.onupgradeneeded=r=>{const n=r.target.result;n.objectStoreNames.contains(t)||n.createObjectStore(t)},o.onsuccess=async r=>{const n=r.target.result;try{const b=n.transaction([t],"readonly").objectStore(t).get("encryptionKey");b.onsuccess=async()=>{let w=b.result;if(w)a(w);else{w=await crypto.subtle.generateKey({name:"AES-GCM",length:256},!0,["encrypt","decrypt"]);const _=n.transaction([t],"readwrite").objectStore(t).put(w,"encryptionKey");_.onsuccess=()=>{a(w)},_.onerror=()=>{i(_.error)}}},b.onerror=()=>i(b.error)}catch(m){i(m)}}})}async encrypt(e){try{const t=await this.keyPromise,i=new TextEncoder().encode(JSON.stringify(e)),o=crypto.getRandomValues(new Uint8Array(12)),r=await crypto.subtle.encrypt({name:"AES-GCM",iv:o},t,i),n=new Uint8Array(o.length+r.byteLength);return n.set(o,0),n.set(new Uint8Array(r),o.length),btoa(String.fromCharCode(...n))}catch(t){throw console.error("Encryption failed:",t),t}}async decrypt(e){try{const t=await this.keyPromise,a=Uint8Array.from(atob(e),h=>h.charCodeAt(0)),i=a.slice(0,12),o=a.slice(12),r=await crypto.subtle.decrypt({name:"AES-GCM",iv:i},t,o),m=new TextDecoder().decode(r);return JSON.parse(m)}catch(t){throw console.error("Decryption failed:",t),t}}}const Ct=new rs;let A=null,tt=[],wt=null,Et=!1,He=ns();function ns(){const s=window.location.hostname;return s.includes("github.io")||s.includes("githubusercontent.com")?"production":s==="localhost"||s==="127.0.0.1"?"development":"unknown"}function st(){return He==="production"}function Ue(){return He==="development"}const Za={get:"/api/v1/config/settings",update:"/api/v1/config/settings",validate:"/api/v1/config/validate",export:"/api/v1/config/export",environment:"/api/v1/config/environment"};function ei(){const s=A?.server?.url||A?.api?.url,e=window.FASTAPI_URL||window.API_URL,t=window.location.hostname==="localhost"?"http://localhost:8000":window.location.origin;return s||e||t}function Tt(){return ei()}function kt(){return A?.elasticsearch?.url||A?.elasticsearchUrl||window.ELASTICSEARCH_URL||"https://usieventho-prod-usw2.es.us-west-2.aws.found.io:9243"}function sa(){return A?.kibana?.url||A?.kibanaUrl||window.KIBANA_URL||"https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243"}async function ti(s,e={}){const t=`${ei()}${s}`,a={"Content-Type":"application/json",...e.headers};if(window.CentralizedAuth&&window.CentralizedAuth.getCookie){const i=window.CentralizedAuth.getCookie();i&&(a["X-Elastic-Cookie"]=i)}try{const i=await fetch(t,{...e,headers:a});if(!i.ok)throw new Error(`API request failed: ${i.status} ${i.statusText}`);return await i.json()}catch(i){throw i.name==="TypeError"&&i.message.includes("Failed to fetch")?console.debug(`Config API connection error (${s})`):console.debug(`Config API error (${s}):`,i.message),i}}async function ai(){if(Et)return A;try{return console.log(`🔧 Loading configuration for ${He} environment...`),st()?await ls():await cs(),Et=!0,console.log("(✓)Configuration loaded successfully:",A),it("initialized",A),A}catch(s){return console.error("(✗) Failed to load configuration:",s),us(),Et=!0,it("initialized",A),A}}async function ls(){try{const e=await fetch("./config/production.json");if(e.ok){const t=await e.json();console.log("📦 Loaded production configuration"),A={...Be(),...t},A.server?.url==="${API_URL}"&&(A.server.url=window.PRODUCTION_API_URL||window.location.origin),t.elasticsearch?.preConfiguredCookie&&t.dashboard?.autoLoadCookie&&await ds(t.elasticsearch.preConfiguredCookie),Te();return}}catch{console.warn("⚠️ Production config not found, using defaults with production overrides")}A={...Be(),environment:"production",baseUrl:window.location.origin+window.location.pathname.replace(/\/$/,""),server:{type:"fastapi",url:window.PRODUCTION_API_URL||window.location.origin},corsProxy:{enabled:!1},features:{fastapi:!0,localServer:!1,corsProxy:!1,websocket:!0,formulaBuilder:!0,authentication:!0},elasticsearch:{directConnection:!1,url:kt(),kibanaUrl:sa(),path:"/api/console/proxy?path=traffic-*/_search&method=POST",corsRequired:!1}},Te()}async function cs(){const s=Be();try{const e=await oa();if(e){A={...s,...e},console.log("📡 Loaded configuration from backend"),Te();return}}catch{console.warn("⚠️ Backend config not available, using defaults")}A={...s,environment:"development",features:{fastapi:!0,localServer:!0,corsProxy:!0}},Te()}function us(){console.log("🆘 Loading fallback configuration"),A={...Be(),environment:He,features:{fastapi:Ue(),localServer:Ue(),corsProxy:Ue()}},Te()}async function ds(s){if(!s||s===""||s==="undefined"){console.log("🔐 No pre-configured cookie available");return}try{if(console.log("🔐 Setting up pre-configured authentication..."),window.CentralizedAuth)await window.CentralizedAuth.setCookie(s.trim(),{source:"github-secrets",skipValidation:!0});else{const e={cookie:s.trim(),expires:new Date(Date.now()+864e5).toISOString(),saved:new Date().toISOString(),source:"github-secrets"};localStorage.setItem("elasticCookie",JSON.stringify(e))}A.elasticCookie=s.trim(),A.dashboard=A.dashboard||{},A.dashboard.autoAuthenticated=!0,console.log("(✓)Pre-configured authentication ready"),window.Dashboard&&window.Dashboard.onCookieReady?.()}catch(e){console.warn("⚠️ Failed to set up pre-configured cookie:",e.message)}}async function oa(){if(!Ue())throw new Error("Backend loading only available in development");try{const s=await ti(Za.get);return{baselineStart:s.processing?.baseline_start||s.baselineStart,baselineEnd:s.processing?.baseline_end||s.baselineEnd,currentTimeRange:s.processing?.current_time_range||s.currentTimeRange,highVolumeThreshold:s.processing?.high_volume_threshold||s.highVolumeThreshold,mediumVolumeThreshold:s.processing?.medium_volume_threshold||s.mediumVolumeThreshold,criticalThreshold:s.processing?.critical_threshold||s.criticalThreshold,warningThreshold:s.processing?.warning_threshold||s.warningThreshold,minDailyVolume:s.processing?.min_daily_volume||s.minDailyVolume,autoRefreshEnabled:s.dashboard?.enable_websocket??s.autoRefreshEnabled,autoRefreshInterval:s.dashboard?.refresh_interval*1e3||s.autoRefreshInterval,theme:s.dashboard?.theme||s.theme,maxEventsDisplay:s.dashboard?.max_events_display||s.maxEventsDisplay,elasticCookie:s.elasticsearch?.cookie||s.elasticCookie,kibanaUrl:s.kibana?.url||s.kibanaUrl,elasticsearchUrl:s.elasticsearch?.url||s.elasticsearchUrl,corsProxyPort:s.cors_proxy?.port||s.corsProxyPort,debug:s.debug,appName:s.app_name||s.appName,rad_types:s.rad_types||s.rad_types}}catch(s){throw console.debug("Backend config load failed:",s.message),s}}async function ii(s=A){try{return await ti(Za.update,{method:"POST",body:JSON.stringify(s)}),it("saved",s),!0}catch{return!1}}function Be(){return{baselineStart:"2025-06-01",baselineEnd:"2025-06-09",currentTimeRange:"now-12h",highVolumeThreshold:1e3,mediumVolumeThreshold:100,criticalThreshold:-80,warningThreshold:-50,minDailyVolume:100,autoRefreshEnabled:!0,autoRefreshInterval:3e5,theme:"light",maxEventsDisplay:200,elasticCookie:null,kibanaUrl:sa(),elasticsearchUrl:kt(),elasticsearchPath:"/traffic-*/_search",corsProxyPort:8e3,debug:!1,appName:"RAD Monitor",minEventDate:"2025-05-19T04:00:00.000Z",queryEventPattern:"pandc.vnext.recommendations.feed.feed*",queryAggSize:500,rad_types:{venture_feed:{pattern:"pandc.vnext.recommendations.feed.feed*",display_name:"Venture Feed",enabled:!0,color:"#4CAF50",description:"Venture recommendations feed"},venture_metrics:{pattern:"pandc.vnext.recommendations.metricsevolved*",display_name:"Venture Metrics",enabled:!0,color:"#9C27B0",description:"Venture metrics evolved events"},cart_recommendations:{pattern:"pandc.vnext.recommendations.cart*",display_name:"Cart Recommendations",enabled:!1,color:"#2196F3",description:"Shopping cart recommendations"},product_recommendations:{pattern:"pandc.vnext.recommendations.product*",display_name:"Product Recommendations",enabled:!1,color:"#FF9800",description:"Product page recommendations"}}}}function Te(s=A){localStorage.setItem("radMonitorConfig",JSON.stringify(s))}function si(){if(!Et){console.warn("⚠️ Config requested before initialization - returning defaults");const s=Be();return st()?{...s,environment:"production",corsProxy:{enabled:!0,url:window.NETLIFY_PROXY_URL||window.PROXY_URL||"https://regal-youtiao-09c777.netlify.app/.netlify/functions/proxy"},features:{fastapi:!1,localServer:!1,corsProxy:!0}}:s}return{...A}}async function Rt(s,e={saveToBackend:!0,saveToLocalStorage:!0}){const t={...A};A={...A,...s};const a=ra(A);if(!a.valid)throw A=t,new Error(`Invalid configuration: ${a.errors.join(", ")}`);if(e.saveToLocalStorage&&Te(),e.saveToBackend&&!await ii()&&e.revertOnFailure!==!1)throw A=t,Te(),new Error("Failed to save configuration to backend");return it("updated",A,t),A}function hs(s,e=void 0){return A||ai(),A?.[s]??e}async function oi(s,e,t={}){return Rt({[s]:e},t)}function ra(s){const e=[];return(!s.baselineStart||!s.baselineEnd)&&e.push("Baseline dates are required"),new Date(s.baselineStart)>=new Date(s.baselineEnd)&&e.push("Baseline end date must be after start date"),s.highVolumeThreshold<1&&e.push("High volume threshold must be at least 1"),s.mediumVolumeThreshold<1&&e.push("Medium volume threshold must be at least 1"),s.mediumVolumeThreshold>=s.highVolumeThreshold&&e.push("Medium volume threshold must be less than high volume threshold"),s.criticalThreshold>=s.warningThreshold&&e.push("Critical threshold must be less than warning threshold"),(s.criticalThreshold>0||s.warningThreshold>0)&&e.push("Score thresholds must be negative"),[/^now-\d+[hdw]$/,/^inspection_time$/,/^-\d+[hd]-\d+[hd]$/].some(a=>a.test(s.currentTimeRange))||e.push("Invalid time range format"),{valid:e.length===0,errors:e}}function ms(){const s=JSON.stringify(A,null,2),e="data:application/json;charset=utf-8,"+encodeURIComponent(s),t=`rad-monitor-config-${new Date().toISOString().split("T")[0]}.json`,a=document.createElement("a");a.setAttribute("href",e),a.setAttribute("download",t),a.click()}function ps(){return new Promise((s,e)=>{const t=document.createElement("input");t.type="file",t.accept=".json",t.onchange=async a=>{const i=a.target.files[0];if(!i){e(new Error("No file selected"));return}const o=new FileReader;o.onload=async r=>{try{const n=JSON.parse(r.target.result),m=ra(n);if(!m.valid){e(new Error(`Invalid configuration: ${m.errors.join(", ")}`));return}await Rt(n),s(n)}catch(n){e(new Error(`Failed to import configuration: ${n.message}`))}},o.readAsText(i)},t.click()})}function fs(s){if(typeof s!="function")throw new Error("Listener must be a function");return tt.push(s),()=>{const e=tt.indexOf(s);e>-1&&tt.splice(e,1)}}function it(s,e,t=null){tt.forEach(a=>{try{a({event:s,newConfig:e,oldConfig:t})}catch(i){console.error("Error in config listener:",i)}})}function gs(s=6e4){ri(),wt=setInterval(async()=>{try{const e=await oa();e&&JSON.stringify(e)!==JSON.stringify(A)&&(A=e,Te(),it("synced",A))}catch{console.debug("Auto-sync skipped due to backend unavailability")}},s)}function ri(){wt&&(clearInterval(wt),wt=null)}async function ys(){const s=Be();return await Rt(s),s}function vs(s){return{elasticsearch:{url:A.elasticsearchUrl,cookie:A.elasticCookie,indexPattern:"traffic-*",timeout:3e4},kibana:{url:A.kibanaUrl,discoverPath:"/app/discover#/"},dashboard:{refreshInterval:A.autoRefreshInterval,maxEvents:A.maxEventsDisplay,theme:A.theme},processing:{baselineStart:A.baselineStart,baselineEnd:A.baselineEnd,currentTimeRange:A.currentTimeRange,highVolumeThreshold:A.highVolumeThreshold,mediumVolumeThreshold:A.mediumVolumeThreshold,criticalThreshold:A.criticalThreshold,warningThreshold:A.warningThreshold}}[s]||{}}function bs(){return st()&&A?.elasticsearch?.corsRequired}function ws(){return{title:"CORS Setup Required for GitHub Pages",message:"To connect to Elasticsearch from this static site, you need to:",steps:["1. Install a CORS browser extension:","   • Chrome: 'CORS Unblock' or 'CORS Unlocker'","   • Firefox: 'CORS Everywhere'","   • Safari: 'CORS Unblock'","","2. Enable the extension for this site","3. Refresh the page and enter your Elasticsearch cookie","","Alternative: Use the dashboard from your local development environment"],note:"This is required because GitHub Pages is a static hosting service and cannot proxy requests to Elasticsearch."}}function Es(){return{environment:He,isProduction:st(),isDevelopment:Ue(),hostname:window.location.hostname,origin:window.location.origin}}function xs(s){const t={"6h":"now-6h","12h":"now-12h","24h":"now-24h","3d":"now-3d",inspection:"inspection_time"}[s];if(t){oi("currentTimeRange",t);const a=document.getElementById("currentTimeRange");a&&(a.value=t)}}function Cs(){const s=(e,t)=>{const a=document.getElementById(e);return a?a.value:t};return{baselineStart:s("baselineStart","2025-06-01"),baselineEnd:s("baselineEnd","2025-06-09"),currentTimeRange:s("currentTimeRange","now-12h"),highVolumeThreshold:parseInt(s("highVolumeThreshold","1000")),mediumVolumeThreshold:parseInt(s("mediumVolumeThreshold","100"))}}function Ss(s=null){const e=s||si(),t=(a,i)=>{const o=document.getElementById(a);o&&(o.value=i)};t("baselineStart",e.baselineStart),t("baselineEnd",e.baselineEnd),t("currentTimeRange",e.currentTimeRange),t("highVolumeThreshold",e.highVolumeThreshold),t("mediumVolumeThreshold",e.mediumVolumeThreshold)}const H={initialize:ai,getConfig:si,updateConfig:Rt,get:hs,set:oi,validateConfig:ra,exportConfig:ms,importConfig:ps,subscribe:fs,startAutoSync:gs,stopAutoSync:ri,resetToDefaults:ys,getComponentConfig:vs,loadFromBackend:oa,saveToBackend:ii,shouldShowCorsInstructions:bs,getCorsInstructions:ws,getEnvironmentInfo:Es,isProduction:st,isDevelopment:Ue,setPresetTimeRange:xs,getCurrentConfigFromDOM:Cs,loadConfigurationIntoDOM:Ss,getApiUrl:Tt,getElasticsearchUrl:kt,getKibanaUrl:sa,_debug:{config:()=>A,listeners:()=>tt,environment:()=>He}},na=(()=>{const s="rad_monitor_auth",t="/config/shared-cookie.json",a=["elasticCookie","elastic_cookie"];function i(d){if(!d||typeof d!="string")throw new Error("Invalid input: must be a non-empty string");const p=d.trim();try{const f=JSON.parse(p);if(f.cookie)return f.cookie;if(f.data&&f.data.cookie)return f.data.cookie;if(f.elasticCookie)return f.elasticCookie;if(f.elastic_cookie)return f.elastic_cookie;throw new Error("JSON input does not contain a cookie field")}catch{let y=p;if((y.startsWith('"')&&y.endsWith('"')||y.startsWith("'")&&y.endsWith("'"))&&(y=y.slice(1,-1)),!y.startsWith("Fe26.2")&&!y.startsWith("sid="))throw new Error('Invalid cookie format. Cookie should start with "Fe26.2**" or "sid=Fe26.2**"');return y}}let o=null,r=null;async function n(){return await m(),o=await O(),ne()&&(!o||o.expired)&&await re(),N(),o}async function m(){for(const d of a)try{const p=localStorage.getItem(d);if(p){let f,y;try{f=JSON.parse(p),f.cookie&&f.expires&&(y=f.cookie)}catch(x){if(p.startsWith("Fe26.2")||p.startsWith("sid="))y=p,f={cookie:y,expires:new Date(Date.now()+864e5).toISOString()};else throw x}if(y)if(new Date(f.expires)>new Date){console.log(`🔄 Migrating legacy cookie from ${d}`);const U={cookie:f.cookie,createdAt:f.saved||new Date().toISOString(),expiresAt:f.expires,source:`migrated-from-${d}`,validated:!1};await me(U),localStorage.removeItem(d),console.log(`✅ Successfully migrated cookie from ${d}`)}else localStorage.removeItem(d),console.log(`🗑️ Removed expired legacy cookie from ${d}`)}}catch(p){console.warn(`Failed to migrate legacy key ${d}:`,p),localStorage.removeItem(d)}}function h(){return!o||o.expired?null:o.cookie}async function b(d,p={}){let f;try{f=i(d)}catch(x){throw new Error(`Cookie parsing failed: ${x.message}`)}const y={cookie:f,createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+864e5).toISOString(),source:p.source||"user-input",validated:!1};if(!p.skipValidation){if(!await _(f))throw new Error("Could not verify cookie with the server - please check server is running and cookie is valid");y.validated=!0,y.validatedAt=new Date().toISOString()}return o=y,await me(y),window.dispatchEvent(new CustomEvent("authUpdated",{detail:{hasAuth:!0,source:y.source}})),y}function w(){o=null,localStorage.removeItem(s);for(const d of a)localStorage.removeItem(d);r&&(clearInterval(r),r=null),window.dispatchEvent(new CustomEvent("authCleared"))}function T(){w()}function R(){if(!o)return{hasAuth:!1,expired:!0,needsAuth:!0};const d=new Date,p=new Date(o.expiresAt),f=new Date(o.createdAt),y=d-f,x=d>=p;return{hasAuth:!0,expired:x,needsAuth:x,source:o.source,ageMinutes:Math.floor(y/1e3/60),remainingMinutes:x?0:Math.floor((p-d)/1e3/60),validated:o.validated}}async function _(d){try{const p=window.location.hostname==="localhost";let f;if(p){const y=Tt();f=await fetch(`${y}/api/v1/auth/status`,{method:"GET",headers:{"X-Elastic-Cookie":d.startsWith("sid=")?d:`sid=${d}`}})}else{const y=window.PROXY_URL||window.NETLIFY_PROXY_URL||"https://regal-youtiao-09c777.netlify.app/.netlify/functions/proxy";f=await fetch(y,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({cookie:d,query:{size:0,query:{match_all:{}}}})})}return f.status===401?(console.error("(✗) Cookie validation failed: Server returned 401 Unauthorized"),!1):f.ok?p&&!(await f.json()).authenticated?(console.error("(✗) Cookie validation failed: Auth status shows not authenticated"),!1):(console.log("(✓)Cookie validated successfully"),!0):(console.error(`(✗) Cookie validation failed: Server returned ${f.status} ${f.statusText}`),!1)}catch(p){return console.error("(✗) Cookie validation error:",p.message),!1}}async function O(){try{const d=localStorage.getItem(s);if(!d)return null;let p;if(/^[A-Za-z0-9+/]+=*$/.test(d)&&d.length>100)try{p=await Ct.decrypt(d)}catch{console.warn("Failed to decrypt, trying plain text"),p=JSON.parse(d)}else p=JSON.parse(d);const f=new Date,y=new Date(p.expiresAt);return p.expired=f>=y,p}catch(d){return console.error("Failed to load auth from storage:",d),null}}async function me(d){try{const p=await Ct.encrypt(d);localStorage.setItem(s,p)}catch(p){console.error("Failed to save auth to storage:",p);try{localStorage.setItem(s,JSON.stringify(d)),console.warn("Saved auth without encryption as fallback")}catch(f){console.error("Failed to save auth even without encryption:",f)}}}async function re(){try{const d=await fetch(t);if(!d.ok)return;const p=await d.json();p.cookie&&p.expiresAt&&new Date(p.expiresAt)>new Date&&(await b(p.cookie,{source:"shared-config",skipValidation:!0}),console.log("📦 Loaded shared cookie from config"))}catch{console.debug("No shared cookie available")}}function N(){r=setInterval(()=>{const d=R();d.expired?window.dispatchEvent(new CustomEvent("authExpired")):d.remainingMinutes<30&&window.dispatchEvent(new CustomEvent("authExpiring",{detail:{remainingMinutes:d.remainingMinutes}}))},5*60*1e3)}function ne(){return window.location.hostname.includes("github.io")}function $(){return!o||o.expired?null:{cookie:o.cookie,expiresAt:o.expiresAt,exportedAt:new Date().toISOString()}}async function l(d){if(!d||!d.cookie)throw new Error("Invalid auth data");return b(d.cookie,{source:"imported"})}function u(){const d=h();return d?d.startsWith("Fe26.2")?`sid=${d}`:d:null}return{init:n,getCookie:h,getCookieForRequest:u,setCookie:b,deleteCookie:T,clearAuth:w,getStatus:R,exportAuth:$,importAuth:l,migrateLegacyKeys:m,parseCookieInput:i}})();window.CentralizedAuth=na;class As{constructor(){this.authStatus=null,this.authCheckPromise=null}async checkAuth(){if(this.authCheckPromise)return this.authCheckPromise;this.authCheckPromise=this._performAuthCheck();const e=await this.authCheckPromise;return this.authCheckPromise=null,e}async _performAuthCheck(){try{if(window.CentralizedAuth&&await window.CentralizedAuth.getCookie())return this.authStatus={authenticated:!0,method:"centralized",source:"CentralizedAuth"},this.authStatus;let e=null;window.CentralizedAuth?e=window.CentralizedAuth.getCookie():e=localStorage.getItem("elastic_cookie");const t={Accept:"application/json"};e&&(t["X-Elastic-Cookie"]=e,t.Cookie=e);const a=await fetch("/api/v1/auth/status",{credentials:"include",headers:t});if(a.ok){const o=await a.json();return o.authenticated&&e?this.authStatus={...o,cookie:e}:this.authStatus=o,this.authStatus}const i=this._getLegacyCookie();return i?(this.authStatus={authenticated:!0,method:"legacy",temporary:!0,cookie:i},this.authStatus):(this.authStatus={authenticated:!1},this.authStatus)}catch(e){const t=this._getLegacyCookie();return this.authStatus={authenticated:!!t,method:"legacy",error:e.message,cookie:t},this.authStatus}}_getLegacyCookie(){if(window.CentralizedAuth)return window.CentralizedAuth.getCookie();try{const e=localStorage.getItem("elasticCookie");if(e){const t=JSON.parse(e);if(t.expires&&new Date(t.expires)>new Date)return t.cookie}}catch{}return window.ELASTIC_COOKIE||null}async requireAuth(){const e=await this.checkAuth();if(e.authenticated)return console.log("(✓)Using existing authentication"),e;console.log("⚠️ No valid authentication found, prompting user...");const t=await this.promptForCookie();if(t){await this.setLegacyCookie(t);const a=await this.checkAuth();if(a.authenticated)return console.log("(✓)Authentication successful with new cookie"),a}throw new Error("Authentication required - no valid cookie provided")}async promptForCookie(){if(window.appStore){const{showAuthPrompt:t}=window.appStore.getState().actions;return t(),null}return prompt(`Enter your Elastic authentication cookie:

1. Open Kibana in another tab
2. Open Developer Tools (F12)
3. Go to Network tab
4. Find any request and copy the Cookie header
`)?.trim()||null}async setLegacyCookie(e){if(!e)return!1;if(window.CentralizedAuth)return await window.CentralizedAuth.setCookie(e),this.authStatus=null,!0;if(window.CentralizedAuth)await window.CentralizedAuth.setCookie(e);else{const t={cookie:e.trim(),expires:new Date(Date.now()+864e5).toISOString(),saved:new Date().toISOString()};localStorage.setItem("elasticCookie",JSON.stringify(t))}return this.authStatus=null,!0}async clearAuth(){window.CentralizedAuth?await window.CentralizedAuth.clearAuth():localStorage.removeItem("elasticCookie"),this.authStatus=null;try{await fetch("/api/v1/auth/logout",{method:"POST",credentials:"include"})}catch{}}getStatus(){return this.authStatus||{authenticated:!1}}}const Ae=new As;class Ts{constructor(){this.baseUrl="/api/v1",this.cache=new Map,this.cacheTimeout=5*60*1e3,this.metrics={requests:0,errors:0,cacheHits:0}}async request(e,t={}){const a=await Ae.checkAuth();if(!t.allowAnonymous&&!a.authenticated)throw console.log("⚠️ Request blocked - no authentication"),new Error("Authentication required");const i=`${this.baseUrl}${e}`,o=t.retry??3;let r;for(let n=0;n<o;n++)try{const m={credentials:"include",headers:{"Content-Type":"application/json",Accept:"application/json",...t.headers},...t};let h=null;if(window.CentralizedAuth&&window.CentralizedAuth.getCookie)h=window.CentralizedAuth.getCookie();else if(a.cookie)h=a.cookie;else if(h=localStorage.getItem("elastic_cookie"),!h)try{const T=localStorage.getItem("elasticCookie");if(T){const R=JSON.parse(T);R.cookie&&(h=R.cookie)}}catch{}h&&(h.startsWith("sid=")||(h=`sid=${h}`),m.headers["X-Elastic-Cookie"]=h,console.log("🍪 Using authentication cookie for request")),t.body&&typeof t.body=="object"&&(m.body=JSON.stringify(t.body));const b=new AbortController,w=setTimeout(()=>b.abort(),t.timeout||3e4);try{this.metrics.requests++;const T=await fetch(i,{...m,signal:b.signal});if(clearTimeout(w),!T.ok){const R=await T.json().catch(()=>({})),_=new Error(R.message||`HTTP ${T.status}`);throw _.status=T.status,_}return await T.json()}catch(T){if(clearTimeout(w),r=T,T.status===401||n===o-1)throw T.status===401&&console.log("⚠️ Authentication failed - cookie may be invalid"),T;const R=Math.pow(2,n)*1e3;console.log(`🔄 Retry ${n+1}/${o} after ${R}ms...`),await new Promise(_=>setTimeout(_,R))}}catch(m){if(this.metrics.errors++,r=m,console.warn(`(✗) Request failed (attempt ${n+1}/${o}):`,m.message),m.status===401||m.status===403||n===o-1)throw m}throw r||new Error("Request failed after all retries")}async get(e,t={}){const a=`GET:${e}`;if(!t.skipCache){const o=this.cache.get(a);if(o&&Date.now()-o.timestamp<this.cacheTimeout)return this.metrics.cacheHits++,o.data}const i=await this.request(e,{method:"GET",...t});return this.cache.set(a,{data:i,timestamp:Date.now()}),i}async post(e,t,a={}){return this.request(e,{method:"POST",body:t,...a})}async fetchDashboardData(e={}){try{const t=e.timeRange||"now-12h",a=e.filters||{},i={size:0,query:{bool:{must:[{range:{"@timestamp":{gte:t,lte:"now"}}},{query_string:{query:"pandc.vnext.recommendations.*"}}]}},aggs:{events:{terms:{field:"event_id.keyword",size:100},aggs:{current:{filter:{range:{"@timestamp":{gte:t,lte:"now"}}}},baseline:{filter:{range:{"@timestamp":{gte:"2025-06-01",lte:"2025-06-09"}}}}}}}},o=await this.post("/dashboard/query",{query:i,force_refresh:!1});return{success:!0,data:o.data,stats:o.stats,metadata:o.metadata}}catch(t){return{success:!1,error:t.message,fallback:this.getCachedDashboardData()}}}getCachedDashboardData(){return this.cache.get("GET:/dashboard/data")?.data||null}async updateConfig(e){return this.post("/config/update",e)}async getConfig(){return this.get("/config")}clearCache(){this.cache.clear()}getMetrics(){return{...this.metrics,cacheSize:this.cache.size,cacheHitRate:this.metrics.cacheHits/this.metrics.requests*100}}async testConnection(){console.log("🔌 Testing API connection...");try{if(!(await Ae.checkAuth()).authenticated)return console.log("⚠️ Not authenticated"),!1;const a=`${window.location.hostname==="localhost"?Tt():""}/health`,i=await fetch(a,{credentials:"include",headers:{Accept:"application/json"}});if(!i.ok)return console.error(`(✗) API connection failed: HTTP ${i.status}`),!1;const o=await i.json(),r=o.status==="healthy"||o.status==="degraded";return r?o.elasticsearch_status==="disconnected"&&console.warn("⚠️ Elasticsearch is disconnected"):console.log("(✗) API connection failed:",o.message),{success:r,message:o.message}}catch(e){return console.error("(✗) Connection test error:",e),!1}}}const at=new Ts;class ni{constructor(){this.events={}}on(e,t){return this.events[e]||(this.events[e]=[]),this.events[e].push(t),()=>this.off(e,t)}off(e,t){this.events[e]&&(this.events[e]=this.events[e].filter(a=>a!==t))}emit(e,...t){this.events[e]&&this.events[e].forEach(a=>{try{a(...t)}catch(i){console.error(`Error in event listener for ${e}:`,i)}})}removeAllListeners(){this.events={}}}const E={NUMBER:"NUMBER",STRING:"STRING",FIELD:"FIELD",BOOLEAN:"BOOLEAN",FUNCTION:"FUNCTION",PLUS:"PLUS",MINUS:"MINUS",MULTIPLY:"MULTIPLY",DIVIDE:"DIVIDE",MODULO:"MODULO",POWER:"POWER",EQUALS:"EQUALS",NOT_EQUALS:"NOT_EQUALS",GREATER:"GREATER",LESS:"LESS",GREATER_EQUALS:"GREATER_EQUALS",LESS_EQUALS:"LESS_EQUALS",AND:"AND",OR:"OR",NOT:"NOT",LPAREN:"LPAREN",RPAREN:"RPAREN",COMMA:"COMMA",COLON:"COLON",EOF:"EOF",SHIFT:"SHIFT",KQL:"KQL"},Ba={[E.OR]:1,[E.AND]:2,[E.EQUALS]:3,[E.NOT_EQUALS]:3,[E.GREATER]:4,[E.LESS]:4,[E.GREATER_EQUALS]:4,[E.LESS_EQUALS]:4,[E.PLUS]:5,[E.MINUS]:5,[E.MULTIPLY]:6,[E.DIVIDE]:6,[E.MODULO]:6,[E.POWER]:7,[E.NOT]:8,UNARY:9},L={FUNCTION_CALL:"FunctionCall",BINARY_OP:"BinaryOp",UNARY_OP:"UnaryOp",FIELD_REF:"FieldRef",LITERAL:"Literal"};class D{constructor(e,t,a,i){this.type=e,this.value=t,this.position=a,this.length=i}}class ot{constructor(e,t,a){this.type=e,this.position=t,this.length=a}}class ks extends ot{constructor(e,t,a,i,o){super(L.FUNCTION_CALL,i,o),this.name=e,this.args=t,this.namedArgs=a}}class Rs extends ot{constructor(e,t,a,i,o){super(L.BINARY_OP,i,o),this.operator=e,this.left=t,this.right=a}}class _s extends ot{constructor(e,t,a,i){super(L.UNARY_OP,a,i),this.operator=e,this.operand=t}}class Ls extends ot{constructor(e,t,a){super(L.FIELD_REF,t,a),this.field=e}}class jt extends ot{constructor(e,t,a,i){super(L.LITERAL,a,i),this.value=e,this.dataType=t}}class Is{constructor(e){this.input=e,this.position=0,this.tokens=[]}tokenize(){for(;this.position<this.input.length&&(this.skipWhitespace(),!(this.position>=this.input.length));){const e=this.readNextToken();e&&this.tokens.push(e)}return this.tokens.push(new D(E.EOF,null,this.position,0)),this.tokens}skipWhitespace(){for(;this.position<this.input.length&&/\s/.test(this.input[this.position]);)this.position++}readNextToken(){const e=this.position,t=this.input[this.position];if(/\d/.test(t)||t==="."&&/\d/.test(this.input[this.position+1]))return this.readNumber();if(t==='"'||t==="'")return this.readString();if(/[a-zA-Z_]/.test(t))return this.readIdentifier();switch(t){case"+":return this.position++,new D(E.PLUS,"+",e,1);case"-":return this.position++,new D(E.MINUS,"-",e,1);case"*":return this.position++,new D(E.MULTIPLY,"*",e,1);case"/":return this.position++,new D(E.DIVIDE,"/",e,1);case"%":return this.position++,new D(E.MODULO,"%",e,1);case"^":return this.position++,new D(E.POWER,"^",e,1);case"(":return this.position++,new D(E.LPAREN,"(",e,1);case")":return this.position++,new D(E.RPAREN,")",e,1);case",":return this.position++,new D(E.COMMA,",",e,1);case":":return this.position++,new D(E.COLON,":",e,1);case"=":return this.position++,this.input[this.position]==="="?(this.position++,new D(E.EQUALS,"==",e,2)):new D(E.EQUALS,"=",e,1);case"!":return this.position++,this.input[this.position]==="="?(this.position++,new D(E.NOT_EQUALS,"!=",e,2)):new D(E.NOT,"!",e,1);case">":return this.position++,this.input[this.position]==="="?(this.position++,new D(E.GREATER_EQUALS,">=",e,2)):new D(E.GREATER,">",e,1);case"<":return this.position++,this.input[this.position]==="="?(this.position++,new D(E.LESS_EQUALS,"<=",e,2)):new D(E.LESS,"<",e,1);default:throw new Error(`Unexpected character '${t}' at position ${this.position}`)}}readNumber(){const e=this.position;let t=!1;for(;this.position<this.input.length;){const i=this.input[this.position];if(/\d/.test(i))this.position++;else if(i==="."&&!t)t=!0,this.position++;else break}const a=this.input.substring(e,this.position);return new D(E.NUMBER,parseFloat(a),e,this.position-e)}readString(){const e=this.position,t=this.input[this.position];this.position++;let a="",i=!1;for(;this.position<this.input.length;){const o=this.input[this.position];if(i){switch(o){case"n":a+=`
`;break;case"t":a+="	";break;case"r":a+="\r";break;case"\\":a+="\\";break;case t:a+=t;break;default:a+=o}i=!1}else if(o==="\\")i=!0;else{if(o===t)return this.position++,new D(E.STRING,a,e,this.position-e);a+=o}this.position++}throw new Error(`Unterminated string starting at position ${e}`)}readIdentifier(){const e=this.position;for(;this.position<this.input.length&&/[a-zA-Z0-9_.]/.test(this.input[this.position]);)this.position++;const t=this.input.substring(e,this.position);switch(t.toLowerCase()){case"and":return new D(E.AND,"AND",e,this.position-e);case"or":return new D(E.OR,"OR",e,this.position-e);case"not":return new D(E.NOT,"NOT",e,this.position-e);case"true":return new D(E.BOOLEAN,!0,e,this.position-e);case"false":return new D(E.BOOLEAN,!1,e,this.position-e);case"shift":return new D(E.SHIFT,"shift",e,this.position-e);case"kql":return new D(E.KQL,"kql",e,this.position-e);default:return this.skipWhitespace(),this.position<this.input.length&&this.input[this.position]==="("?new D(E.FUNCTION,t,e,this.position-e):new D(E.FIELD,t,e,this.position-e)}}}class rt{constructor(){this.tokens=[],this.position=0,this.errors=[],this.cache=new Map,this.maxCacheSize=1e3}parse(e){const t=this.cache.get(e);if(t)return t;try{this.errors=[],this.position=0;const a=new Is(e);this.tokens=a.tokenize();const i=this.parseExpression();if(!this.isAtEnd()){const o=this.currentToken();throw new Error(`Unexpected token '${o.value}' at position ${o.position}`)}return this.addToCache(e,i),{success:!0,ast:i,errors:this.errors}}catch(a){return{success:!1,ast:null,errors:[...this.errors,{message:a.message,position:this.currentToken()?.position||0}]}}}parseExpression(e=0){let t=this.parsePrimary();for(;!this.isAtEnd();){const a=this.currentToken(),i=this.getBinaryPrecedence(a.type);if(i===null||i<e)break;this.advance();const o=this.parseExpression(i+1);t=new Rs(a.value,t,o,t.position,o.position+o.length-t.position)}return t}parsePrimary(){const e=this.currentToken();if(e.type===E.MINUS||e.type===E.NOT){this.advance();const t=this.parseExpression(Ba.UNARY);return new _s(e.value,t,e.position,t.position+t.length-e.position)}if(e.type===E.LPAREN){this.advance();const t=this.parseExpression();return this.consume(E.RPAREN,"Expected ')' after expression"),t}if(e.type===E.FUNCTION)return this.parseFunctionCall();if(e.type===E.FIELD)return this.advance(),new Ls(e.value,e.position,e.length);if(e.type===E.NUMBER)return this.advance(),new jt(e.value,"number",e.position,e.length);if(e.type===E.STRING)return this.advance(),new jt(e.value,"string",e.position,e.length);if(e.type===E.BOOLEAN)return this.advance(),new jt(e.value,"boolean",e.position,e.length);throw new Error(`Unexpected token '${e.value}' at position ${e.position}`)}parseFunctionCall(){const e=this.currentToken(),t=e.value,a=e.position;this.advance(),this.consume(E.LPAREN,`Expected '(' after function name '${t}'`);const i=[],o={};for(;!this.check(E.RPAREN)&&!this.isAtEnd();){const n=this.currentToken().type;if((n===E.FIELD||n===E.KQL||n===E.SHIFT)&&(this.checkNext(E.EQUALS)||this.checkNext(E.COLON))){const b=this.currentToken().value.toLowerCase();this.advance(),this.advance();const w=this.parseExpression();o[b]=w}else i.push(this.parseExpression());this.check(E.RPAREN)||this.consume(E.COMMA,"Expected ',' between arguments")}const r=this.consume(E.RPAREN,"Expected ')' after arguments");return new ks(t,i,o,a,r.position+r.length-a)}currentToken(){return this.tokens[this.position]}previousToken(){return this.tokens[this.position-1]}isAtEnd(){return this.currentToken().type===E.EOF}advance(){return this.isAtEnd()||this.position++,this.previousToken()}check(e){return this.isAtEnd()?!1:this.currentToken().type===e}checkNext(e){return this.position+1>=this.tokens.length?!1:this.tokens[this.position+1].type===e}consume(e,t){if(this.check(e))return this.advance();const a=this.currentToken();throw new Error(`${t} at position ${a.position}`)}getBinaryPrecedence(e){return Ba[e]||null}addToCache(e,t){if(this.cache.size>=this.maxCacheSize){const a=this.cache.keys().next().value;this.cache.delete(a)}this.cache.set(e,t)}}const Zt=new Set(["average","count","last_value","max","median","min","percentile","percentile_rank","standard_deviation","sum","unique_count"]),xt=new Set(["counter_rate","cumulative_sum","differences","moving_average","normalize_by_unit","overall_average","overall_max","overall_min","overall_sum"]),li=new Set(["abs","add","cbrt","ceil","clamp","cube","defaults","divide","exp","fix","floor","log","mod","multiply","pick_max","pick_min","pow","round","sqrt","square","subtract"]),ci=new Set(["eq","gt","gte","ifelse","lt","lte"]),ui=new Set(["interval","now","time_range"]),Re={average:{category:"elasticsearch",description:"Returns the average of a field",examples:["average(price)","average(price, kql='location:UK')"],icon:"aggregate"},count:{category:"elasticsearch",description:"Total number of documents or field values",examples:["count()","count(products.id)","count(kql='price > 500')"],icon:"aggregate"},last_value:{category:"elasticsearch",description:"Returns the value from the last document",examples:["last_value(server.status)",`last_value(server.status, kql='server.name="A"')`],icon:"aggregate"},max:{category:"elasticsearch",description:"Returns the maximum value of a field",examples:["max(price)","max(price, kql='location:UK')"],icon:"aggregate"},median:{category:"elasticsearch",description:"Returns the median value of a field",examples:["median(price)","median(price, kql='location:UK')"],icon:"aggregate"},min:{category:"elasticsearch",description:"Returns the minimum value of a field",examples:["min(price)","min(price, kql='location:UK')"],icon:"aggregate"},percentile:{category:"elasticsearch",description:"Returns the specified percentile of values",examples:["percentile(bytes, percentile=95)","percentile(response_time, percentile=99)"],icon:"aggregate"},percentile_rank:{category:"elasticsearch",description:"Returns the percentage of values below a certain value",examples:["percentile_rank(bytes, value=100)","percentile_rank(score, value=80)"],icon:"aggregate"},standard_deviation:{category:"elasticsearch",description:"Returns the amount of variation of the field",examples:["standard_deviation(price)","square(standard_deviation(price, kql='location:UK'))"],icon:"aggregate"},sum:{category:"elasticsearch",description:"Returns the sum of a field",examples:["sum(price)","sum(price, kql='location:UK')"],icon:"aggregate"},unique_count:{category:"elasticsearch",description:"Calculates the number of unique values",examples:["unique_count(product.name)","unique_count(user.id, kql='status:active')"],icon:"aggregate"},counter_rate:{category:"column",description:"Calculates the rate of an ever-increasing counter",examples:["counter_rate(max(network.bytes))","counter_rate(max(cpu.ticks))"],icon:"timeseries"},cumulative_sum:{category:"column",description:"Calculates the cumulative sum over time",examples:["cumulative_sum(sum(bytes))","cumulative_sum(count())"],icon:"timeseries"},differences:{category:"column",description:"Calculates the difference to the last value",examples:["differences(sum(bytes))","differences(average(cpu))"],icon:"timeseries"},moving_average:{category:"column",description:"Calculates the moving average over time",examples:["moving_average(sum(bytes), window=5)","moving_average(average(response_time), window=10)"],icon:"timeseries"},normalize_by_unit:{category:"column",description:"Normalizes counts to a specific time interval",examples:["normalize_by_unit(sum(bytes), unit='s')","normalize_by_unit(count(), unit='m')"],icon:"timeseries"},overall_average:{category:"column",description:"Calculates the average for all data points in a series",examples:["overall_average(sum(bytes))","sum(bytes) - overall_average(sum(bytes))"],icon:"timeseries"},overall_max:{category:"column",description:"Calculates the maximum for all data points in a series",examples:["overall_max(sum(bytes))","(sum(bytes) - overall_min(sum(bytes))) / (overall_max(sum(bytes)) - overall_min(sum(bytes)))"],icon:"timeseries"},overall_min:{category:"column",description:"Calculates the minimum for all data points in a series",examples:["overall_min(sum(bytes))","sum(bytes) - overall_min(sum(bytes))"],icon:"timeseries"},overall_sum:{category:"column",description:"Calculates the sum for all data points in a series",examples:["overall_sum(sum(bytes))","sum(bytes) / overall_sum(sum(bytes))"],icon:"timeseries"},abs:{category:"math",description:"Calculates absolute value",examples:["abs(average(altitude))","abs(differences(sum(bytes)))"],icon:"math"},add:{category:"math",description:"Adds two numbers",examples:["add(sum(price), sum(tax))","add(count(), 5)"],icon:"math"},cbrt:{category:"math",description:"Cube root of value",examples:["cbrt(last_value(volume))","cbrt(sum(bytes))"],icon:"math"},ceil:{category:"math",description:"Rounds up to nearest integer",examples:["ceil(sum(price))","ceil(average(score))"],icon:"math"},clamp:{category:"math",description:"Limits value between min and max",examples:["clamp(average(bytes), percentile(bytes, percentile=5), percentile(bytes, percentile=95))"],icon:"math"},cube:{category:"math",description:"Calculates the cube of a number",examples:["cube(last_value(length))","cube(average(size))"],icon:"math"},defaults:{category:"math",description:"Returns default value when null",examples:["defaults(average(bytes), -1)","defaults(sum(revenue), 0)"],icon:"math"},divide:{category:"math",description:"Divides first number by second",examples:["divide(sum(profit), sum(revenue))","sum(bytes) / count()"],icon:"math"},exp:{category:"math",description:"Raises e to the nth power",examples:["exp(last_value(rate))","exp(average(factor))"],icon:"math"},fix:{category:"math",description:"Rounds towards zero",examples:["fix(sum(profit))","fix(average(score))"],icon:"math"},floor:{category:"math",description:"Rounds down to nearest integer",examples:["floor(sum(price))","floor(average(rating))"],icon:"math"},log:{category:"math",description:"Logarithm with optional base",examples:["log(sum(bytes))","log(sum(bytes), 2)"],icon:"math"},mod:{category:"math",description:"Remainder after division",examples:["mod(sum(price), 1000)","mod(count(), 10)"],icon:"math"},multiply:{category:"math",description:"Multiplies two numbers",examples:["multiply(sum(price), 1.2)","sum(bytes) * last_value(factor)"],icon:"math"},pick_max:{category:"math",description:"Returns maximum of two numbers",examples:["pick_max(average(bytes), average(memory))","pick_max(sum(a), sum(b))"],icon:"math"},pick_min:{category:"math",description:"Returns minimum of two numbers",examples:["pick_min(average(bytes), average(memory))","pick_min(sum(a), sum(b))"],icon:"math"},pow:{category:"math",description:"Raises value to a power",examples:["pow(last_value(length), 3)","pow(average(size), 2)"],icon:"math"},round:{category:"math",description:"Rounds to decimal places",examples:["round(sum(bytes))","round(average(price), 2)"],icon:"math"},sqrt:{category:"math",description:"Square root of value",examples:["sqrt(last_value(area))","sqrt(sum(variance))"],icon:"math"},square:{category:"math",description:"Raises value to 2nd power",examples:["square(last_value(length))","square(standard_deviation(price))"],icon:"math"},subtract:{category:"math",description:"Subtracts second from first",examples:["subtract(max(bytes), min(bytes))","sum(revenue) - sum(costs)"],icon:"math"},eq:{category:"comparison",description:"Equality comparison",examples:["eq(sum(bytes), 1000000)","average(bytes) == average(memory)"],icon:"compare"},gt:{category:"comparison",description:"Greater than comparison",examples:["gt(average(bytes), 1000)","average(bytes) > average(memory)"],icon:"compare"},gte:{category:"comparison",description:"Greater than or equal comparison",examples:["gte(average(bytes), 1000)","average(bytes) >= average(memory)"],icon:"compare"},ifelse:{category:"comparison",description:"Conditional value return",examples:["ifelse(count() > 100, sum(revenue), 0)","ifelse(average(cpu) > 80, 'High', 'Normal')"],icon:"compare"},lt:{category:"comparison",description:"Less than comparison",examples:["lt(average(bytes), 1000)","average(bytes) < average(memory)"],icon:"compare"},lte:{category:"comparison",description:"Less than or equal comparison",examples:["lte(average(bytes), 1000)","average(bytes) <= average(memory)"],icon:"compare"},interval:{category:"context",description:"Date histogram interval in milliseconds",examples:["sum(bytes) / interval()","count() * (60000 / interval())"],icon:"context"},now:{category:"context",description:"Current time in milliseconds",examples:["now() - last_value(start_time)","now() - 86400000"],icon:"context"},time_range:{category:"context",description:"Selected time range in milliseconds",examples:["time_range()","(sum(bytes) / time_range()) * 86400000"],icon:"context"}},_e={"Error Rate":{formula:"count(kql='response.status_code >= 400') / count()",description:"Calculate the percentage of errors",category:"metrics"},"Week over Week":{formula:"sum(revenue) / sum(revenue, shift='1w')",description:"Compare current week to previous week",category:"timeseries"},"Percent of Total":{formula:"sum(sales) / overall_sum(sum(sales))",description:"Calculate percentage of total for each group",category:"metrics"},"Moving Average":{formula:"moving_average(average(response_time), window=10)",description:"Smooth out fluctuations with moving average",category:"timeseries"},"Rate of Change":{formula:"differences(sum(total)) / sum(total, shift='1d')",description:"Calculate day-over-day rate of change",category:"timeseries"},"Conversion Rate":{formula:"count(kql='event.type:purchase') / count(kql='event.type:view')",description:"Calculate conversion from views to purchases",category:"metrics"},"Average Session Duration":{formula:"average(session.duration) / 60000",description:"Convert milliseconds to minutes",category:"metrics"},"Percentile Range":{formula:"percentile(response_time, percentile=95) - percentile(response_time, percentile=5)",description:"Calculate range between 5th and 95th percentile",category:"metrics"},"Cumulative Total":{formula:"cumulative_sum(sum(revenue))",description:"Running total over time",category:"timeseries"},"Outlier Detection":{formula:"ifelse(abs(average(value) - overall_average(average(value))) > 2 * standard_deviation(value), 1, 0)",description:"Flag values more than 2 standard deviations from mean",category:"analytics"},"Traffic Drop Detection":{formula:"((count() - count(shift='1d')) / count(shift='1d')) * -100",description:"Detect traffic drops compared to yesterday (RAD Monitor)",category:"rad-monitoring"},"Spike Alert":{formula:"ifelse(count() > (average(count(), shift='7d') * 1.5), 1, 0)",description:"Alert when traffic spikes 50% above 7-day average",category:"rad-monitoring"},"Comparison to Baseline":{formula:"(count() - average(count(), shift='7d')) / average(count(), shift='7d') * 100",description:"Compare current traffic to 7-day baseline percentage",category:"rad-monitoring"},"Critical Traffic Drop":{formula:"ifelse((count() / count(shift='1d')) < 0.2, 1, 0)",description:"Flag when traffic drops more than 80% (Critical)",category:"rad-monitoring"},"Warning Traffic Drop":{formula:"ifelse((count() / count(shift='1d')) < 0.5 && (count() / count(shift='1d')) >= 0.2, 1, 0)",description:"Flag when traffic drops 50-80% ⚠",category:"rad-monitoring"},"Hourly Traffic Pattern":{formula:"count() / average(count(), shift='1w')",description:"Compare current hour to same hour last week",category:"rad-monitoring"},"Business Impact Score":{formula:"((count(shift='1d') - count()) / count(shift='1d')) * unique_count(user.id)",description:"Calculate business impact based on traffic drop and unique users",category:"rad-monitoring"},"Weekend Traffic Adjustment":{formula:'count() * ifelse(date_histogram_interval("day_of_week") >= 6, 1.43, 1)',description:"Adjust traffic expectations for weekends (30% lower baseline)",category:"rad-monitoring"},"Multi-RAD Comparison":{formula:"count(kql='rad_type:A') / count(kql='rad_type:B')",description:"Compare traffic between different RAD types",category:"rad-monitoring"},"Traffic Recovery Rate":{formula:"(count() - min(count(), shift='1h')) / (count(shift='1d') - min(count(), shift='1h'))",description:"Measure how quickly traffic is recovering from a drop",category:"rad-monitoring"},"Traffic Drop Alert":{formula:'ifelse(count() < count(shift="1d") * 0.5, "CRITICAL", "NORMAL")',description:"Alert when traffic drops by 50% compared to yesterday",category:"rad-monitoring"},"Baseline Deviation":{formula:"(count() - overall_average(count())) / overall_average(count()) * 100",description:"Percentage deviation from average baseline",category:"rad-monitoring"}},Ze={elasticsearch:{name:"Elasticsearch",description:"Aggregation functions that run on raw documents",functions:Array.from(Zt)},column:{name:"Column Calculations",description:"Window functions that operate on entire columns",functions:Array.from(xt)},math:{name:"Math",description:"Mathematical operations on numbers",functions:Array.from(li)},comparison:{name:"Comparison",description:"Compare values and conditional logic",functions:Array.from(ci)},context:{name:"Context",description:"Access Kibana context like time range",functions:Array.from(ui)}},P={ERROR:"error",WARNING:"warning",INFO:"info"},Ns={maxFormulaLength:1e4,maxNestingDepth:20,maxFunctionCalls:100,maxStringLength:1e3,maxArraySize:1e3,forbiddenPatterns:[/eval\s*\(/,/Function\s*\(/,/setTimeout/,/setInterval/,/import\s*\(/,/require\s*\(/],maxQueryComplexity:50,maxTimeRange:365*24*60*60*1e3},v={NUMBER:"number",STRING:"string",BOOLEAN:"boolean",DATE:"date",ANY:"any"},Qt=new Map([["sum",{args:[{name:"field",type:v.STRING}],returns:v.NUMBER}],["average",{args:[{name:"field",type:v.STRING}],returns:v.NUMBER}],["count",{args:[{name:"field",type:v.STRING,optional:!0}],returns:v.NUMBER}],["max",{args:[{name:"field",type:v.STRING}],returns:v.NUMBER}],["min",{args:[{name:"field",type:v.STRING}],returns:v.NUMBER}],["unique_count",{args:[{name:"field",type:v.STRING}],returns:v.NUMBER}],["percentile",{args:[{name:"field",type:v.STRING},{name:"percentile",type:v.NUMBER,optional:!0}],returns:v.NUMBER}],["round",{args:[{name:"value",type:v.NUMBER},{name:"decimals",type:v.NUMBER,optional:!0}],returns:v.NUMBER}],["abs",{args:[{name:"value",type:v.NUMBER}],returns:v.NUMBER}],["sqrt",{args:[{name:"value",type:v.NUMBER}],returns:v.NUMBER}],["pow",{args:[{name:"value",type:v.NUMBER},{name:"exponent",type:v.NUMBER}],returns:v.NUMBER}],["gt",{args:[{name:"left",type:v.NUMBER},{name:"right",type:v.NUMBER}],returns:v.BOOLEAN}],["lt",{args:[{name:"left",type:v.NUMBER},{name:"right",type:v.NUMBER}],returns:v.BOOLEAN}],["ifelse",{args:[{name:"condition",type:v.BOOLEAN},{name:"truthy",type:v.ANY},{name:"falsy",type:v.ANY}],returns:v.ANY}],["moving_average",{args:[{name:"metric",type:v.NUMBER},{name:"window",type:v.NUMBER,optional:!0}],returns:v.NUMBER}],["cumulative_sum",{args:[{name:"metric",type:v.NUMBER}],returns:v.NUMBER}],["differences",{args:[{name:"metric",type:v.NUMBER}],returns:v.NUMBER}],["interval",{args:[],returns:v.NUMBER}],["now",{args:[],returns:v.NUMBER}],["time_range",{args:[],returns:v.NUMBER}]]);class _t{constructor(e={}){this.config={...Ns,...e},this.validationCache=new Map,this.fieldSchema=e.fieldSchema||new Map,this.customFunctions=e.customFunctions||new Map}async validate(e,t={}){const a=performance.now(),i=[];try{i.push(...this.validateSecurity(e)),i.push(...this.validateSyntax(e)),i.push(...await this.validateTypes(e,t)),i.push(...this.validatePerformance(e)),t.dataView&&i.push(...this.validateDataView(e,t.dataView));const o=performance.now()-a;return{valid:!i.some(r=>r.severity===P.ERROR),results:i,validationTime:o,complexity:this.calculateComplexity(e)}}catch(o){return{valid:!1,results:[{severity:P.ERROR,message:`Validation error: ${o.message}`,position:0}],validationTime:performance.now()-a}}}validateSecurity(e){const t=[],a=this.getFormulaLength(e);a>this.config.maxFormulaLength&&t.push({severity:P.ERROR,message:`Formula too long: ${a} characters (max: ${this.config.maxFormulaLength})`,position:0});const i=this.getMaxDepth(e);i>this.config.maxNestingDepth&&t.push({severity:P.ERROR,message:`Formula too deeply nested: depth ${i} (max: ${this.config.maxNestingDepth})`,position:0});const o=this.countFunctionCalls(e);return o>this.config.maxFunctionCalls&&t.push({severity:P.ERROR,message:`Too many function calls: ${o} (max: ${this.config.maxFunctionCalls})`,position:0}),this.walkAST(e,r=>{if(r.type===L.LITERAL&&r.dataType==="string")for(const n of this.config.forbiddenPatterns)n.test(r.value)&&t.push({severity:P.ERROR,message:"Forbidden pattern detected in string literal",position:r.position})}),t}validateSyntax(e){const t=[];return this.walkAST(e,(a,i)=>{switch(a.type){case L.FUNCTION_CALL:t.push(...this.validateFunctionCall(a));break;case L.BINARY_OP:t.push(...this.validateBinaryOp(a));break;case L.UNARY_OP:t.push(...this.validateUnaryOp(a));break;case L.FIELD_REF:t.push(...this.validateFieldRef(a));break}}),t}async validateTypes(e,t){const a=[],i=new Map;return await this.inferTypes(e,i,t),this.walkAST(e,o=>{switch(i.get(o),o.type){case L.BINARY_OP:const r=i.get(o.left),n=i.get(o.right);this.areTypesCompatible(o.operator,r,n)||a.push({severity:P.ERROR,message:`Type mismatch: cannot apply '${o.operator}' to ${r} and ${n}`,position:o.position});break;case L.FUNCTION_CALL:const m=Qt.get(o.name)||this.customFunctions.get(o.name);if(m)for(let h=0;h<o.args.length;h++){const b=m.args[h]?.type,w=i.get(o.args[h]);o.args[h].type===L.FIELD_REF&&b===v.STRING||b&&b!==v.ANY&&w!==b&&w!==v.ANY&&a.push({severity:P.ERROR,message:`Type mismatch in function '${o.name}' argument ${h+1}: expected ${b}, got ${w}`,position:o.args[h].position})}break}}),a}validatePerformance(e){const t=[],a=this.analyzePerformance(e);return a.complexity>this.config.maxQueryComplexity&&t.push({severity:P.WARNING,message:`Formula may be slow: complexity score ${a.complexity} (recommended max: ${this.config.maxQueryComplexity})`,position:0}),a.aggregationCount>10&&t.push({severity:P.WARNING,message:`Many aggregations (${a.aggregationCount}) may impact performance`,position:0}),a.hasTimeRange&&a.estimatedTimeRange>this.config.maxTimeRange&&t.push({severity:P.WARNING,message:"Large time range may impact performance",position:0}),a.duplicateSubexpressions.length>0&&t.push({severity:P.INFO,message:"Consider extracting common subexpressions for better performance",position:0,suggestions:a.duplicateSubexpressions}),t}validateDataView(e,t){const a=[],i=new Set(t.fields.map(o=>o.name));return this.walkAST(e,o=>{if(o.type===L.FIELD_REF&&(i.has(o.field)||a.push({severity:P.ERROR,message:`Field '${o.field}' not found in data view`,position:o.position,suggestions:this.getSimilarFields(o.field,i)})),o.type===L.FUNCTION_CALL&&o.namedArgs.kql){const r=this.validateKQL(o.namedArgs.kql,i);a.push(...r)}}),a}validateFunctionCall(e){const t=[],a=Qt.get(e.name)||this.customFunctions.get(e.name);if(!a)return t.push({severity:P.ERROR,message:`Unknown function '${e.name}'`,position:e.position,suggestions:this.getSimilarFunctions(e.name)}),t;const i=a.args.filter(n=>!n.optional).length,o=a.args.length;e.args.length<i&&t.push({severity:P.ERROR,message:`Function '${e.name}' requires at least ${i} arguments, got ${e.args.length}`,position:e.position}),e.args.length>o&&Object.keys(e.namedArgs).length===0&&t.push({severity:P.ERROR,message:`Function '${e.name}' accepts at most ${o} arguments, got ${e.args.length}`,position:e.position});const r=new Set(a.args.map(n=>n.name));for(const n of Object.keys(e.namedArgs))r.has(n)||t.push({severity:P.ERROR,message:`Unknown argument '${n}' for function '${e.name}'`,position:e.position,suggestions:Array.from(r)});return t}validateBinaryOp(e){const t=[];return["+","-","*","/","%","^",">","<",">=","<=","==","!=","AND","OR"].includes(e.operator)||t.push({severity:P.ERROR,message:`Invalid operator '${e.operator}'`,position:e.position}),t}validateUnaryOp(e){const t=[];return["-","!","NOT"].includes(e.operator)||t.push({severity:P.ERROR,message:`Invalid unary operator '${e.operator}'`,position:e.position}),t}validateFieldRef(e){const t=[];return e.field.includes(" ")&&t.push({severity:P.WARNING,message:"Field name contains spaces. Did you mean to quote it?",position:e.position}),t}validateKQL(e,t){const a=[];if(e.type!==L.LITERAL||e.dataType!=="string")return a.push({severity:P.ERROR,message:"KQL parameter must be a string literal",position:e.position}),a;try{const i=/(\w+(?:\.\w+)*)\s*:/g;let o;for(;(o=i.exec(e.value))!==null;){const r=o[1];t.has(r)||a.push({severity:P.WARNING,message:`Field '${r}' in KQL filter not found in data view`,position:e.position+o.index})}}catch(i){a.push({severity:P.ERROR,message:`Invalid KQL syntax: ${i.message}`,position:e.position})}return a}async inferTypes(e,t,a){if(!e)return v.ANY;switch(e.type){case L.LITERAL:return t.set(e,e.dataType),e.dataType;case L.FIELD_REF:const i=this.getFieldType(e.field,a);return t.set(e,i),i;case L.FUNCTION_CALL:const o=Qt.get(e.name)||this.customFunctions.get(e.name);if(o){for(let w=0;w<e.args.length;w++)await this.inferTypes(e.args[w],t,a);return t.set(e,o.returns),o.returns}return t.set(e,v.ANY),v.ANY;case L.BINARY_OP:const r=await this.inferTypes(e.left,t,a),n=await this.inferTypes(e.right,t,a),m=this.inferBinaryOpType(e.operator,r,n);return t.set(e,m),m;case L.UNARY_OP:const h=await this.inferTypes(e.operand,t,a),b=e.operator==="!"||e.operator==="NOT"?v.BOOLEAN:h;return t.set(e,b),b;default:return t.set(e,v.ANY),v.ANY}}getFieldType(e,t){if(t?.dataView?.fields){const a=t.dataView.fields.find(i=>i.name===e);if(a)return a.type==="number"?v.NUMBER:a.type==="string"?v.STRING:a.type==="boolean"?v.BOOLEAN:a.type==="date"?v.DATE:v.ANY}return v.STRING}inferBinaryOpType(e,t,a){return["+","-","*","/","%","^"].includes(e)?v.NUMBER:[">","<",">=","<=","==","!="].includes(e)||["AND","OR"].includes(e)?v.BOOLEAN:v.ANY}areTypesCompatible(e,t,a){return["+","-","*","/","%","^"].includes(e)?t===v.NUMBER&&a===v.NUMBER:[">","<",">=","<="].includes(e)?t===a&&t===v.NUMBER:["==","!="].includes(e)?t===a||t===v.ANY||a===v.ANY:["AND","OR"].includes(e)?t===v.BOOLEAN&&a===v.BOOLEAN:!0}analyzePerformance(e){const t={complexity:0,aggregationCount:0,hasTimeRange:!1,estimatedTimeRange:0,duplicateSubexpressions:[]},a=new Map;this.walkAST(e,i=>{i.type===L.FUNCTION_CALL&&Zt.has(i.name)&&(t.aggregationCount++,t.complexity+=5),i.type===L.FUNCTION_CALL&&xt.has(i.name)&&(t.hasTimeRange=!0,t.complexity+=10);const o=this.hashNode(i);a.has(o)?a.get(o).count++:a.set(o,{node:i,count:1}),i.type===L.BINARY_OP&&(t.complexity+=1)});for(const[i,o]of a)o.count>2&&this.getNodeComplexity(o.node)>5&&t.duplicateSubexpressions.push({expression:this.nodeToString(o.node),count:o.count});return t}walkAST(e,t,a=null){switch(t(e,a),e.type){case L.FUNCTION_CALL:for(const i of e.args)this.walkAST(i,t,e);for(const i of Object.values(e.namedArgs))this.walkAST(i,t,e);break;case L.BINARY_OP:this.walkAST(e.left,t,e),this.walkAST(e.right,t,e);break;case L.UNARY_OP:this.walkAST(e.operand,t,e);break}}getMaxDepth(e,t=0){if(!e)return t;let a=t;switch(e.type){case L.FUNCTION_CALL:const i=t+1;for(const o of e.args)a=Math.max(a,this.getMaxDepth(o,i));for(const o of Object.values(e.namedArgs))a=Math.max(a,this.getMaxDepth(o,i));break;case L.BINARY_OP:a=Math.max(a,this.getMaxDepth(e.left,t),this.getMaxDepth(e.right,t));break;case L.UNARY_OP:a=Math.max(a,this.getMaxDepth(e.operand,t));break;case L.FIELD_REF:case L.LITERAL:a=t;break}return a}countFunctionCalls(e){let t=0;return this.walkAST(e,a=>{a.type===L.FUNCTION_CALL&&t++}),t}getFormulaLength(e){return JSON.stringify(e).length}calculateComplexity(e){let t=0;return this.walkAST(e,a=>{switch(a.type){case L.FUNCTION_CALL:t+=5,xt.has(a.name)&&(t+=5);break;case L.BINARY_OP:t+=1;break;case L.UNARY_OP:t+=1;break}}),t}getNodeComplexity(e){let t=0;return this.walkAST(e,()=>t++),t}hashNode(e){return JSON.stringify({type:e.type,operator:e.operator,name:e.name,field:e.field,value:e.value})}nodeToString(e){switch(e.type){case L.LITERAL:return e.dataType==="string"?`'${e.value}'`:String(e.value);case L.FIELD_REF:return e.field;case L.FUNCTION_CALL:const t=e.args.map(a=>this.nodeToString(a)).join(", ");return`${e.name}(${t})`;case L.BINARY_OP:return`${this.nodeToString(e.left)} ${e.operator} ${this.nodeToString(e.right)}`;case L.UNARY_OP:return`${e.operator}${this.nodeToString(e.operand)}`;default:return""}}getSimilarFunctions(e){const t=[...Zt,...li,...ci,...xt,...ui,...this.customFunctions.keys()];return this.findSimilar(e,t)}getSimilarFields(e,t){return this.findSimilar(e,Array.from(t))}findSimilar(e,t,a=3){return t.map(o=>({candidate:o,distance:this.levenshteinDistance(e.toLowerCase(),o.toLowerCase())})).sort((o,r)=>o.distance-r.distance).slice(0,a).filter(o=>o.distance<Math.max(3,e.length/2)).map(o=>o.candidate)}levenshteinDistance(e,t){const a=[];for(let i=0;i<=t.length;i++)a[i]=[i];for(let i=0;i<=e.length;i++)a[0][i]=i;for(let i=1;i<=t.length;i++)for(let o=1;o<=e.length;o++)t.charAt(i-1)===e.charAt(o-1)?a[i][o]=a[i-1][o-1]:a[i][o]=Math.min(a[i-1][o-1]+1,a[i][o-1]+1,a[i-1][o]+1);return a[t.length][e.length]}}const M={AVERAGE:"average",COUNT:"count",LAST_VALUE:"last_value",MAX:"max",MEDIAN:"median",MIN:"min",PERCENTILE:"percentile",PERCENTILE_RANK:"percentile_rank",STANDARD_DEVIATION:"standard_deviation",SUM:"sum",UNIQUE_COUNT:"unique_count",COUNTER_RATE:"counter_rate",CUMULATIVE_SUM:"cumulative_sum",DIFFERENCES:"differences",MOVING_AVERAGE:"moving_average",NORMALIZE_BY_UNIT:"normalize_by_unit",OVERALL_AVERAGE:"overall_average",OVERALL_MAX:"overall_max",OVERALL_MIN:"overall_min",OVERALL_SUM:"overall_sum"},yt={FUNCTION_CALL:"FunctionCall",BINARY_OPERATION:"BinaryOperation"};class Ds{constructor(){this.aggregations={},this.bucketCounter=0,this.timeRange=null,this.filters=[]}buildQuery(e,t={}){return this.reset(),this.timeRange=t.timeRange,this.filters=t.filters||[],this.processNode(e),this.constructElasticsearchQuery(t)}reset(){this.aggregations={},this.bucketCounter=0}processNode(e){switch(e.type){case yt.FUNCTION_CALL:return this.processFunctionCall(e);case yt.BINARY_OPERATION:this.processNode(e.left),this.processNode(e.right);break}}processFunctionCall(e){const{name:t,arguments:a,namedArguments:i}=e;if(this.isElasticsearchFunction(t))return this.createElasticsearchAggregation(t,a,i);this.isTimeSeriesFunction(t)&&a[0]&&a[0].type===yt.FUNCTION_CALL&&this.processNode(a[0]),a.forEach(o=>{o.type===yt.FUNCTION_CALL&&this.processNode(o)})}createElasticsearchAggregation(e,t,a){const i=`${this.bucketCounter++}-bucket`;switch(e){case M.COUNT:return this.createCountAggregation(i,t[0],a);case M.AVERAGE:return this.createAvgAggregation(i,t[0],a);case M.SUM:return this.createSumAggregation(i,t[0],a);case M.MAX:return this.createMaxAggregation(i,t[0],a);case M.MIN:return this.createMinAggregation(i,t[0],a);case M.PERCENTILE:return this.createPercentileAggregation(i,t[0],a)}return i}createCountAggregation(e,t,a){const i={};return a.kql?i.filter={bool:{must:[],filter:[this.parseKQLFilter(a.kql.value)],should:[],must_not:[]}}:t&&(i.value_count={field:t.field||t.value}),this.aggregations[e]=i,e}createAvgAggregation(e,t,a){const i={avg:{field:t.field||t.value}};return a.kql?this.aggregations[e]={filter:{bool:{must:[],filter:[this.parseKQLFilter(a.kql.value)],should:[],must_not:[]}},aggs:{filtered_avg:i}}:this.aggregations[e]=i,e}createSumAggregation(e,t,a){const i={sum:{field:t.field||t.value}};return a.kql?this.aggregations[e]={filter:{bool:{must:[],filter:[this.parseKQLFilter(a.kql.value)],should:[],must_not:[]}},aggs:{filtered_sum:i}}:this.aggregations[e]=i,e}createMaxAggregation(e,t,a){const i={max:{field:t.field||t.value}};return a.kql?this.aggregations[e]={filter:{bool:{must:[],filter:[this.parseKQLFilter(a.kql.value)],should:[],must_not:[]}},aggs:{filtered_max:i}}:this.aggregations[e]=i,e}createMinAggregation(e,t,a){const i={min:{field:t.field||t.value}};return a.kql?this.aggregations[e]={filter:{bool:{must:[],filter:[this.parseKQLFilter(a.kql.value)],should:[],must_not:[]}},aggs:{filtered_min:i}}:this.aggregations[e]=i,e}createPercentileAggregation(e,t,a){const i=a.percentile?a.percentile.value:50,o={percentiles:{field:t.field||t.value,percents:[i]}};return a.kql?this.aggregations[e]={filter:{bool:{must:[],filter:[this.parseKQLFilter(a.kql.value)],should:[],must_not:[]}},aggs:{filtered_percentile:o}}:this.aggregations[e]=o,e}parseKQLFilter(e){if(e.includes("@timestamp")){if(e.includes(">=")&&e.includes("<")){const a=e.match(/@timestamp\s*>=\s*"([^"]+)".*@timestamp\s*<\s*"([^"]+)"/);if(a)return{bool:{filter:[{bool:{should:[{range:{"@timestamp":{gte:a[1],time_zone:"America/Los_Angeles"}}}],minimum_should_match:1}},{bool:{should:[{range:{"@timestamp":{lt:a[2],time_zone:"America/Los_Angeles"}}}],minimum_should_match:1}}]}}}else if(e.includes(">=")){const a=e.match(/@timestamp\s*>=\s*"?([^"\s]+)"?/);if(a)return{bool:{should:[{range:{"@timestamp":{gte:a[1],time_zone:"America/Los_Angeles"}}}],minimum_should_match:1}}}}const t=e.match(/(\w+):\s*"?([^"\s]+)"?/);return t?{match:{[t[1]]:t[2]}}:{query_string:{query:e}}}constructElasticsearchQuery(e){const t={index:e.index||"traffic-*",body:{size:0,query:{bool:{must:[],filter:[...this.filters],should:[],must_not:[]}},aggs:this.aggregations}};return this.timeRange&&t.body.query.bool.filter.push({range:{"@timestamp":{gte:this.timeRange.from,lte:this.timeRange.to,format:"strict_date_optional_time"}}}),e.additionalFilters&&t.body.query.bool.filter.push(...e.additionalFilters),t.body.runtime_mappings={},t.body.fields=[{field:"@timestamp",format:"date_time"}],t}isElasticsearchFunction(e){return[M.COUNT,M.AVERAGE,M.SUM,M.MAX,M.MIN,M.MEDIAN,M.PERCENTILE,M.PERCENTILE_RANK,M.STANDARD_DEVIATION,M.UNIQUE_COUNT,M.LAST_VALUE].includes(e)}isTimeSeriesFunction(e){return[M.MOVING_AVERAGE,M.CUMULATIVE_SUM,M.DIFFERENCES,M.COUNTER_RATE,M.NORMALIZE_BY_UNIT,M.OVERALL_AVERAGE,M.OVERALL_MAX,M.OVERALL_MIN,M.OVERALL_SUM].includes(e)}}const Kt="radMonitorState";class Os extends ni{constructor(){super();const e=this.loadPersistedState();this.state={data:[],stats:{critical:0,warning:0,normal:0,increased:0,total:0},filters:e.filters||{},clientFilters:{status:e.clientFilters?.status||"all",search:e.clientFilters?.search||"",radTypes:e.clientFilters?.radTypes||[]},timeRange:e.timeRange||"now-12h",loading:!1,error:null,lastUpdate:null},this.refreshInterval=null,this.formulaParser=new rt,this.formulaValidator=new _t({fieldSchema:new Map}),this.queryBuilder=new Ds}loadPersistedState(){try{const e=localStorage.getItem(Kt);if(e){const t=JSON.parse(e);if(t.filters&&typeof t.filters=="object")return t}}catch(e){console.warn("Failed to load persisted state:",e)}return{}}persistState(){try{const e={filters:this.state.filters,clientFilters:this.state.clientFilters,timeRange:this.state.timeRange,savedAt:new Date().toISOString()};localStorage.setItem(Kt,JSON.stringify(e))}catch(e){console.warn("Failed to persist state:",e)}}async initialize(){try{return await this.loadData(),this.startAutoRefresh(5*60*1e3),!0}catch(e){return console.error("Failed to initialize data service:",e),this.state.error=e.message,!1}}async loadData(e={}){this.setState({loading:!0,error:null});try{const t=await at.fetchDashboardData({timeRange:e.timeRange||this.state.timeRange,filters:this.state.filters});if(!t.success){if(t.error&&(t.error.includes("Authentication")||t.error.includes("authentication")))return this.setState({data:[],stats:{critical:0,warning:0,normal:0,increased:0,total:0},loading:!1,error:"Authentication required - click TEST CONNECTION to set cookie"}),console.log("⚠️ Authentication required for data loading"),!1;if(t.error&&(t.error.includes("Invalid or expired")||t.error.includes("cookie")))return this.setState({data:[],stats:{critical:0,warning:0,normal:0,increased:0,total:0},loading:!1,error:"Cookie expired - click TEST CONNECTION to update"}),console.log("⚠️ Cookie expired or invalid"),!1;throw new Error(t.error||"Failed to load data")}console.log("📊 Dashboard data received:",t);const a=t.data||[],i=t.stats||this.calculateStats(a);return this.setState({data:a,stats:i,lastUpdate:new Date().toISOString(),loading:!1,error:null}),console.log("📊 State updated with",a.length,"events"),this.emit("dataUpdated",this.state),!0}catch(t){console.error("Failed to load data:",t);const a=at.getCachedDashboardData();return a?(this.setState({data:a.data||[],stats:a.stats||this.calculateStats(a.data),error:"Using cached data: "+t.message,loading:!1}),this.emit("dataUpdated",this.state)):(this.setState({loading:!1,error:t.message}),this.emit("error",t)),!1}}applyFilters(e){this.setState({clientFilters:{...this.state.clientFilters,...e}}),this.persistState(),this.emit("filtersChanged",this.state.clientFilters)}async updateTimeRange(e){return this.setState({timeRange:e}),this.persistState(),this.loadData({timeRange:e})}getFilteredData(){let e=[...this.state.data];if(this.state.clientFilters.status!=="all"&&(e=e.filter(t=>t.status.toLowerCase()===this.state.clientFilters.status)),this.state.clientFilters.search){const t=this.state.clientFilters.search.toLowerCase();e=e.filter(a=>a.name.toLowerCase().includes(t)||a.id.toLowerCase().includes(t))}return this.state.clientFilters.radTypes.length>0&&(e=e.filter(t=>this.state.clientFilters.radTypes.includes(t.radType||t.rad_type))),e}async refresh(){return this.loadData({force:!0})}startAutoRefresh(e=5*60*1e3){this.stopAutoRefresh(),this.refreshInterval=setInterval(()=>{this.loadData()},e)}stopAutoRefresh(){this.refreshInterval&&(clearInterval(this.refreshInterval),this.refreshInterval=null)}setState(e){this.state={...this.state,...e},this.emit("stateChanged",this.state)}calculateStats(e){const t={critical:0,warning:0,normal:0,increased:0,total:e.length};return e.forEach(a=>{const i=a.status.toLowerCase();t[i]!==void 0&&t[i]++}),t}getState(){return this.state}clearPersistedState(){try{localStorage.removeItem(Kt),this.setState({filters:{},clientFilters:{status:"all",search:"",radTypes:[]},timeRange:"now-12h"})}catch(e){console.warn("Failed to clear persisted state:",e)}}destroy(){this.stopAutoRefresh(),this.removeAllListeners()}async executeFormulaQuery(e,t={}){this.setState({loading:!0,error:null});try{const a=this.formulaParser.parse(e);if(!a.success)throw new Error(a.errors.map(m=>m.message).join(", "));const i={dataView:t.context?.dataView,timeRange:t.timeRange||this.state.timeRange},o=await this.formulaValidator.validate(a.ast,i);if(!o.valid){const m=o.results.filter(h=>h.severity==="error").map(h=>h.message).join(", ");throw new Error(m)}const r=this.queryBuilder.buildQuery(a.ast,{timeRange:this.parseTimeRange(t.timeRange||this.state.timeRange),filters:t.filters||this.state.filters,index:"traffic-*"}),n=await at.post("/dashboard/formula-query",{formula:e,query:r,time_range:t.timeRange||this.state.timeRange,filters:t.filters||this.state.filters});if(!n.success)throw new Error(n.error||"Query failed");return this.setState({data:n.data||[],stats:n.stats||this.calculateStats(n.data),lastUpdate:new Date().toISOString(),loading:!1,error:null}),this.emit("dataUpdated",this.state),{success:!0,data:n.data,stats:n.stats,metadata:n.metadata}}catch(a){return this.setState({loading:!1,error:a.message}),this.emit("error",a),{success:!1,error:a.message}}}async validateFormula(e,t={}){try{const a=this.formulaParser.parse(e);if(!a.success)return{valid:!1,errors:a.errors,warnings:[]};const i=await this.formulaValidator.validate(a.ast,t);return{valid:i.valid,errors:i.results.filter(o=>o.severity==="error"),warnings:i.results.filter(o=>o.severity==="warning"),complexity:i.complexity}}catch(a){return{valid:!1,errors:[{message:a.message,position:0}],warnings:[]}}}updateFieldSchema(e){const t=new Map;e.forEach(a=>{t.set(a.name,{type:a.type,aggregatable:a.aggregatable})}),this.formulaValidator.fieldSchema=t}parseTimeRange(e){const t=new Date;let a=new Date(t),i=t;if(e.startsWith("now-")){const o=e.match(/now-(\d+)([hdwM])/);if(o){const[,r,n]=o,m={h:"Hours",d:"Date",w:"Date",M:"Month"},h={h:1,d:1,w:7,M:1};m[n]&&a[`set${m[n]}`](a[`get${m[n]}`]()-parseInt(r)*h[n])}}return{from:a.toISOString(),to:i.toISOString()}}}const ie=new Os;class Ms{constructor(){this.statuses={api:{connected:!1,message:"Initializing..."},auth:{authenticated:!1,message:"Checking..."},data:{loaded:!1,message:"Loading..."},formulaBuilder:{initialized:!1,message:"Loading..."},websocket:{connected:!1,message:"Not required"}},this.elements={mainStatus:null,statusDot:null,statusText:null,refreshStatus:null,formulaStatus:null,apiStatus:null,quickBaseline:null,loadingOverlay:null,loadingItems:{}},this.requiredSystems=["api","auth","data"],this.isFullyLoaded=!1,this.initializeElements(),this.setupEventListeners(),this.showLoadingState()}initializeElements(){this.elements.mainStatus=document.getElementById("connectionStatus"),this.elements.statusDot=document.querySelector(".status-dot"),this.elements.statusText=document.querySelector(".status-text"),this.elements.refreshStatus=document.getElementById("refreshStatus"),this.elements.formulaStatus=document.getElementById("formulaStatus"),this.elements.apiStatus=document.getElementById("apiStatus"),this.elements.quickBaseline=document.getElementById("quickBaseline"),this.elements.loadingOverlay=document.getElementById("loadingOverlay"),this.elements.loadingItems={api:document.getElementById("loadingAPI"),auth:document.getElementById("loadingAuth"),data:document.getElementById("loadingData"),formula:document.getElementById("loadingFormula")},this.elements.loadingMessage=document.getElementById("loadingMessage")}setupEventListeners(){this.eventHandlers={"api:connected":e=>this.updateAPIStatus(!0,e.detail?.message),"api:disconnected":e=>this.updateAPIStatus(!1,e.detail?.message),"auth:success":e=>this.updateAuthStatus(!0,e.detail?.message),"auth:failed":e=>this.updateAuthStatus(!1,e.detail?.message),"data:loaded":e=>this.updateDataStatus(!0,e.detail?.message),"data:error":e=>this.updateDataStatus(!1,e.detail?.message),"websocket:connected":()=>this.updateWebSocketStatus(!0),"websocket:disconnected":()=>this.updateWebSocketStatus(!1),"formula:initialized":()=>this.updateFormulaStatus(!0),"formula:error":e=>this.updateFormulaStatus(!1,e.detail?.message)},Object.entries(this.eventHandlers).forEach(([e,t])=>{window.addEventListener(e,t)})}updateOverallStatus(){try{const e=this.statuses.api.connected&&(this.statuses.websocket.connected||!this.isWebSocketRequired()),t=e?"#4CAF50":this.statuses.api.connected?"#FF9800":"#f44336",a=e?"Connected":this.statuses.api.connected?"Partial Connection":"Disconnected";this.elements.statusDot&&(this.elements.statusDot.style.backgroundColor=t),this.elements.statusText&&(this.elements.statusText.textContent=a),this.elements.mainStatus&&(this.elements.mainStatus.className=e?"status-connected":this.statuses.api.connected?"status-partial":"status-disconnected")}catch(e){console.error("Error updating overall status:",e),console.error("Statuses:",this.statuses)}}updateAPIStatus(e,t){try{this.statuses.api.connected=e,this.statuses.api.message=t||(e?"API Connected":"API Disconnected"),this.elements.apiStatus&&(this.elements.apiStatus.textContent=this.statuses.api.message,this.elements.apiStatus.className=e?"status-success":"status-error"),this.updateLoadingItem("api",e,this.statuses.api.message),this.updateOverallStatus(),this.checkAllSystemsReady()}catch(a){console.error("Error updating API status:",a),console.error("Stack trace:",a.stack)}}updateAuthStatus(e,t){this.statuses.auth.authenticated=e,this.statuses.auth.message=t||(e?"Authenticated":"Not authenticated"),this.updateLoadingItem("auth",e,this.statuses.auth.message),j.getState().auth.isAuthenticated!==e&&console.log("🔄 Syncing auth status with app store:",e),this.checkAllSystemsReady()}updateDataStatus(e,t){this.statuses.data.loaded=e,this.statuses.data.message=t||(e?"Configuration loaded":"Loading configuration..."),this.elements.dataStatus&&(this.elements.dataStatus.textContent=this.statuses.data.message,this.elements.dataStatus.className=e?"status-success":"status-value"),this.updateLoadingItem("data",e,this.statuses.data.message),this.checkAllSystemsReady()}updateWebSocketStatus(e,t){this.statuses.websocket.connected=e,this.statuses.websocket.message=t||(e?"WebSocket Connected":"WebSocket Disconnected"),this.updateOverallStatus()}updateFormulaStatus(e,t){this.statuses.formulaBuilder.initialized=e,this.statuses.formulaBuilder.message=t||(e?"Formula builder ready":"Formula builder not initialized"),this.elements.formulaStatus&&(this.elements.formulaStatus.textContent=this.statuses.formulaBuilder.message,this.elements.formulaStatus.style.color=e?"#4CAF50":"#f44336"),this.updateLoadingItem("formula",e,this.statuses.formulaBuilder.message)}updateRefreshStatus(e,t=!1){this.elements.refreshStatus&&(this.elements.refreshStatus.textContent=e,this.elements.refreshStatus.className=`refresh-status ${t?"error":""}`)}updateBaselineStatus(e){this.elements.quickBaseline&&(this.elements.quickBaseline.textContent=e||"Not set")}showDetailedStatus(){const e={"API Connection":this.statuses.api,WebSocket:this.statuses.websocket,Elasticsearch:this.statuses.elasticsearch,"Formula Builder":this.statuses.formulaBuilder};let t=`Connection Status Details:

`;for(const[a,i]of Object.entries(e)){const o=i.connected||i.initialized?"✅":"(✗)";t+=`${o} ${a}: ${i.message}
`}return console.log(t),e}isWebSocketRequired(){return window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1"}showLoadingState(){document.body.classList.add("loading"),this.elements.loadingOverlay&&this.elements.loadingOverlay.classList.remove("hidden");const e=document.getElementById("mainAppContent");e&&(e.classList.remove("authenticated"),e.style.display="none")}hideLoadingState(){document.body.classList.remove("loading"),this.elements.loadingOverlay&&this.elements.loadingOverlay.classList.add("hidden"),this.isFullyLoaded=!0;const e=document.getElementById("mainAppContent");e&&(e.style.display="block",e.offsetHeight,e.classList.add("authenticated")),document.querySelectorAll(".action-button").forEach(a=>{a.disabled=!1}),this.updateLoadingMessage("All systems ready",!1)}updateLoadingItem(e,t,a){const i=this.elements.loadingItems[e];if(i){const o=i.querySelector(".loading-icon"),r=i.querySelector(".loading-text");t?(i.classList.add("success"),o.textContent="✅"):(i.classList.add("error"),o.textContent="(✗)"),r&&a&&(r.textContent=a)}}checkAllSystemsReady(){const e=this.requiredSystems.every(t=>{switch(t){case"api":return this.statuses.api.connected;case"auth":return this.statuses.auth.authenticated;case"data":return this.statuses.data.loaded;default:return!0}});return e&&!this.isFullyLoaded&&setTimeout(()=>this.hideLoadingState(),500),e}updateLoadingMessage(e,t=!1){this.elements.loadingMessage&&(this.elements.loadingMessage.textContent=e,this.elements.loadingMessage.classList.toggle("error",t))}async testAllConnections(){this.updateRefreshStatus("Testing connections...",!1);try{if(window.unifiedAPI){const e=await window.unifiedAPI.checkHealth();this.updateAPIStatus(e.healthy,e.message)}return this.updateRefreshStatus("Connection test complete",!1),this.statuses}catch(e){return this.updateRefreshStatus("Connection test failed",!0),console.error("Connection test error:",e),this.statuses}}cleanup(){console.log("🧹 ConnectionStatusManager: Cleaning up event listeners..."),this.eventHandlers&&(Object.entries(this.eventHandlers).forEach(([e,t])=>{window.removeEventListener(e,t)}),this.eventHandlers={}),this.elements={},console.log("✅ ConnectionStatusManager: All event listeners cleaned up")}}const ce=new Ms;window.ConnectionStatusManager=ce;class la{constructor(){this.isInitialized=!1,this.isAuthenticating=!1,this.authRetries=0,this.maxAuthRetries=1,this.components={table:null,cards:null,filters:null},this.currentFilters={search:"",radType:""},this.currentTimeRange="1h",this.refreshInterval=null,this.performanceStats={apiCalls:0,averageResponseTime:0,lastUpdateTime:null},this.eventHandlers={auth:null,data:null,error:null}}updateConnectionStatus(e,t){window.updateConnectionStatus&&window.updateConnectionStatus(e,t);const a=document.querySelector(".status-dot"),i=document.querySelector(".status-text");a&&i&&(a.style.backgroundColor=e?"var(--gd-color-success)":"var(--gd-color-error)",i.textContent=t||(e?"Connected":"Disconnected"))}async init(){if(this.isInitialized){console.log("⚠️ Dashboard already initialized, skipping...");return}try{console.log("🚀 Initializing RAD Monitor Dashboard...");try{ce.updateAPIStatus(!0,"Connected")}catch(t){console.error("Error updating API status:",t),console.error("Stack trace:",t.stack)}let e;try{e=await Ae.checkAuth(),e.authenticated?(console.log("(✓)Authentication:",e.method),ce.updateAuthStatus(!0,`Authenticated via ${e.method}`),window.dispatchEvent(new CustomEvent("auth:success",{detail:{message:`Authenticated via ${e.method}`}}))):(console.log("⚠️ Not authenticated yet"),ce.updateAuthStatus(!1,"Not authenticated"),window.dispatchEvent(new CustomEvent("auth:failed",{detail:{message:"Not authenticated"}})))}catch(t){console.error("⚠️ Auth check failed:",t.message),console.error("Stack trace:",t.stack),e={authenticated:!1},ce.updateAuthStatus(!1,t.message),window.dispatchEvent(new CustomEvent("auth:failed",{detail:{message:t.message}}))}try{await ie.initialize(),console.log("(✓)Data service ready"),ce.updateDataStatus(!0,"Data service ready"),window.dispatchEvent(new CustomEvent("data:loaded",{detail:{message:"Configuration and data service ready"}}))}catch(t){if(console.error("Data service initialization error:",t),console.error("Stack trace:",t.stack),ce.updateDataStatus(!1,t.message),window.dispatchEvent(new CustomEvent("data:error",{detail:{message:t.message}})),e.authenticated)throw t;console.log("💡 Set cookie to enable data loading");try{ce.showAuthPromptOnOverlay()}catch(a){console.error("Error showing auth prompt:",a),console.error("Stack trace:",a.stack),this.showAuthPrompt()}}try{this.setupComponents(),console.log("(✓)UI components ready")}catch(t){throw console.error("Error setting up UI components:",t),console.error("Stack trace:",t.stack),new Error(`Failed to setup UI components: ${t.message}`)}try{this.setupEventListeners(),console.log("(✓)Event listeners attached")}catch(t){throw console.error("Error setting up event listeners:",t),console.error("Stack trace:",t.stack),new Error(`Failed to setup event listeners: ${t.message}`)}return this.isInitialized=!0,console.log("🎉 Dashboard ready!"),!0}catch(e){console.error("(✗) Dashboard initialization failed:",e),console.error("Stack trace:",e.stack);try{ce.updateLoadingMessage(`Initialization failed: ${e.message}`,!0),ce.isFullyLoaded||ce.showAuthPromptOnOverlay()}catch(t){console.error("Error updating overlay:",t)}return this.showError(e.message),!1}}setupComponents(){try{document.querySelector("#tableBody")||console.warn("Table body element not found, creating placeholder"),this.components.table=new Fs("#tableBody"),this.components.cards=new Ps({critical:"#criticalCount",warning:"#warningCount",normal:"#normalCount",increased:"#increasedCount"}),this.components.filters=new $s({statusButtons:".filter-btn",searchInput:"#searchInput",radTypeButtons:"#radTypeButtons"})}catch(e){throw console.error("Error in setupComponents:",e),console.error("Stack trace:",e.stack),e}}setupEventListeners(){ie.on("dataUpdated",e=>this.handleDataUpdate(e)),ie.on("stateChanged",e=>this.handleStateChange(e)),ie.on("error",e=>this.handleError(e)),this.components.filters.on("filterChanged",e=>{ie.applyFilters(e),this.updateTable()}),document.getElementById("refreshBtn")?.addEventListener("click",()=>{this.refresh()})}handleDataUpdate(e){this.components.cards.update(e.stats),this.updateTable(),this.updateTimestamp(),this.clearError()}handleStateChange(e){this.setLoading(e.loading),e.error&&this.showError(e.error)}updateTable(){const e=ie.getFilteredData();this.components.table.render(e),this.updateResultsCount(e.length,ie.getState().data.length)}async refresh(){await ie.refresh()}updateTimestamp(){const e=document.querySelector(".timestamp");e&&(e.textContent=`Last updated: ${new Date().toLocaleString()}`)}updateResultsCount(e,t){const a=document.getElementById("resultsInfo");a&&(e<t?a.textContent=`Showing ${e} of ${t} events`:a.textContent=`${t} events`)}setLoading(e){const t=document.getElementById("loadingIndicator");t&&(t.style.display=e?"flex":"none");const a=document.getElementById("refreshBtn");a&&(a.disabled=e,a.textContent=e?"REFRESHING...":"REFRESH NOW")}showError(e){const t=document.getElementById("refreshStatus");t&&(t.innerHTML=k.sanitize(`<span style="color: #d32f2f;">(✗) ${e}</span>`))}clearError(){const e=document.getElementById("refreshStatus");e&&(e.textContent="Ready")}showAuthPrompt(){if(window.appStore){const{showAuthPrompt:e}=window.appStore.getState().actions;e()}this.showError("Authentication required")}handleError(e){console.error("Dashboard error:",e),this.showError(e.message||"An error occurred")}async testApiConnection(){if(this.isAuthenticating)return console.log("⏳ Authentication already in progress..."),!1;try{console.log("🔍 Testing API connection...");const e=await Ae.checkAuth();if(console.log("Auth status:",e),!e.authenticated){if(this.authRetries>=this.maxAuthRetries)return console.log("⚠️ Max authentication attempts reached"),this.updateConnectionStatus(!1,"Authentication required"),!1;console.log("⚠️ Not authenticated, prompting for cookie..."),this.isAuthenticating=!0,this.authRetries++;try{await Ae.requireAuth(),this.isAuthenticating=!1,this.authRetries=0}catch(i){return console.log("(✗) Authentication failed:",i.message),this.isAuthenticating=!1,this.updateConnectionStatus(!1,"Authentication failed"),!1}}const t=await at.testConnection();return t.success||t===!0?(console.log("(✓)API connection successful"),this.updateConnectionStatus(!0,"Connected to Elasticsearch"),window.dispatchEvent(new CustomEvent("connection:success",{detail:{message:"Connection successful"}})),this.isInitialized&&await this.refresh(),!0):(console.log("(✗) API connection failed"),this.updateConnectionStatus(!1,"Connection test failed - but data may still load"),window.dispatchEvent(new CustomEvent("connection:failed",{detail:{message:"Connection test failed"}})),!1)}catch(e){if(console.error("(✗) Connection test error:",e),e.message?.includes("auth")&&this.authRetries<this.maxAuthRetries){console.log("⚠️ Authentication required, prompting for cookie..."),this.isAuthenticating=!0,this.authRetries++;try{return await Ae.requireAuth(),this.isAuthenticating=!1,this.authRetries=0,await this.testApiConnection()}catch(t){console.log("(✗) Authentication failed:",t.message),this.isAuthenticating=!1}}return this.updateConnectionStatus(!1,"Connection error"),!1}}async setCookieForRealtime(){this.authRetries=0,this.isAuthenticating=!1;try{const e=await Ae.promptForCookie();e&&(await Ae.setLegacyCookie(e),console.log("(✓)Cookie saved successfully"),await this.testApiConnection()&&await this.refresh())}catch(e){console.error("(✗) Failed to set cookie:",e)}}showApiSetupInstructions(){const t=window.location.hostname==="localhost"?`
            <h3>🔧 Local Development Setup</h3>
            <p>To enable real-time data updates:</p>
            <ol>
                <li>Make sure the unified server is running on port 8000</li>
                <li>Get your Elasticsearch cookie from Kibana</li>
                <li>Click "Set Cookie" and paste it</li>
            </ol>
        `:`
            <h3>🌐 Production Setup (GitHub Pages)</h3>
            <p>To enable real-time data updates:</p>
            <ol>
                <li>Install a CORS browser extension</li>
                <li>Enable the extension for this site</li>
                <li>Get your Elasticsearch cookie from Kibana</li>
                <li>Click "Enable Real-time" and paste it</li>
            </ol>
        `;alert(t)}showPerformanceStats(){const e=at.getMetrics(),t=ie.getState(),a=`
📊 Performance Statistics
========================
API Metrics:
- Total Requests: ${e.requests}
- Failed Requests: ${e.errors}
- Success Rate: ${e.requests>0?((e.requests-e.errors)/e.requests*100).toFixed(1):0}%
- Cache Hits: ${e.cacheHits}
- Cache Hit Rate: ${e.cacheHitRate?.toFixed(1)||0}%

Data Status:
- Events Loaded: ${t.data.length}
- Last Update: ${t.lastUpdate||"Never"}
- Current Error: ${t.error||"None"}
        `;console.log(a),alert(a)}destroy(){console.log("🧹 Dashboard: Cleaning up resources..."),this.refreshInterval&&(clearInterval(this.refreshInterval),this.refreshInterval=null),window.resourceManager&&window.resourceManager.clearInterval(this.refreshInterval),this.components.table&&(this.components.table.destroy(),this.components.table=null),this.components.filters&&this.components.filters.removeAllListeners(),this.eventHandlers={auth:null,data:null,error:null},this.isInitialized=!1,console.log("✅ Dashboard: All resources cleaned up")}}class Fs{constructor(e){this.tbody=document.querySelector(e),this.renderFrame=null}render(e){this.tbody&&(this.renderFrame&&cancelAnimationFrame(this.renderFrame),this.renderFrame=requestAnimationFrame(()=>{const t=document.createDocumentFragment();this.tbody.innerHTML="",e.forEach(a=>{const i=this.createRow(a);t.appendChild(i)}),this.tbody.appendChild(t),this.renderFrame=null}))}createRow(e){const t=document.createElement("tr");return t.dataset.eventId=e.id,t.dataset.radType=e.radType||e.rad_type,t.innerHTML=k.sanitize(`
            <td>
                <a href="${e.kibanaUrl||e.kibana_url}" target="_blank" class="event-link">
                    <span class="event-name">${e.name}</span>
                </a>
            </td>
            <td>
                <span class="rad-type-badge" style="background: ${e.radColor||e.rad_color}">
                    ${e.radDisplayName||e.rad_display_name}
                </span>
            </td>
            <td>
                <span class="badge ${e.status.toLowerCase()}">
                    ${e.status}
                </span>
            </td>
            <td class="number">
                <span class="score ${e.score<0?"negative":"positive"}">
                    ${e.score>0?"+":""}${e.score}%
                </span>
            </td>
            <td class="number">${e.current.toLocaleString()}</td>
            <td class="number">${e.baseline.toLocaleString()}</td>
            <td>
                <span class="impact ${e.impactClass||e.impact_class}">
                    ${e.impact}
                </span>
            </td>
        `),t}destroy(){this.renderFrame&&(cancelAnimationFrame(this.renderFrame),this.renderFrame=null),window.resourceManager&&window.resourceManager.cancelAnimationFrame(this.renderFrame)}}class Ps{constructor(e){this.elements={},Object.entries(e).forEach(([t,a])=>{this.elements[t]=document.querySelector(a)})}update(e){Object.entries(e).forEach(([t,a])=>{this.elements[t]&&(this.elements[t].textContent=a)})}}class $s extends ni{constructor(e){super(),this.setupStatusFilter(e.statusButtons),this.setupSearchFilter(e.searchInput),this.setupRadTypeFilter(e.radTypeButtons)}setupStatusFilter(e){const t=document.querySelectorAll(e);t.forEach(a=>{a.addEventListener("click",()=>{t.forEach(i=>i.classList.remove("active")),a.classList.add("active"),this.emit("filterChanged",{status:a.dataset.filter})})})}setupSearchFilter(e){const t=document.querySelector(e);if(t){let a;t.addEventListener("input",i=>{clearTimeout(a),a=setTimeout(()=>{this.emit("filterChanged",{search:i.target.value})},300)})}}setupRadTypeFilter(e){const t=document.querySelector(e);t&&t.addEventListener("click",a=>{if(a.target.classList.contains("rad-filter-btn")){a.target.classList.toggle("active");const i=Array.from(t.querySelectorAll(".rad-filter-btn.active")).map(o=>o.dataset.radType);this.emit("filterChanged",{radTypes:i})}})}}const se=new la;se.testApiConnection=se.testApiConnection.bind(se);se.setCookieForRealtime=se.setCookieForRealtime.bind(se);se.showApiSetupInstructions=se.showApiSetupInstructions.bind(se);se.showPerformanceStats=se.showPerformanceStats.bind(se);function zs(s){if(!s)return{gte:"now-12h"};if(s==="inspection_time")return{gte:"now-24h",lte:"now-8h"};const e=s.match(/^-(\d+)([hd])-(\d+)([hd])$/);if(e){const a=parseInt(e[1]),i=e[2],o=parseInt(e[3]),r=e[4];return{gte:`now-${o}${r}`,lte:`now-${a}${i}`}}return s.match(/^now-(\d+)([hd])$/)?{gte:s}:{gte:"now-12h"}}function di(s){if(!s)return{type:"relative",hours:12,gte:"now-12h"};if(s==="inspection_time")return{type:"inspection",hours:16,gte:"now-24h",lte:"now-8h",label:"Inspection Time (8-24h ago)"};const e=s.match(/^-(\d+)([hd])-(\d+)([hd])$/);if(e){const a=parseInt(e[1]),i=e[2],o=parseInt(e[3]),r=e[4],n=i==="h"?a:a*24;return{type:"custom",hours:(r==="h"?o:o*24)-n,gte:`now-${o}${r}`,lte:`now-${a}${i}`}}const t=s.match(/^now-(\d+)([hd])$/);if(t){const a=parseInt(t[1]);return{type:"relative",hours:t[2]==="h"?a:a*24,gte:s}}return{type:"relative",hours:12,gte:"now-12h"}}function Us(s){if(!s)return!1;if(s==="inspection_time"||s.match(/^now-(\d+)([hd])$/))return!0;const t=s.match(/^-(\d+)([hd])-(\d+)([hd])$/);if(t){const a=parseInt(t[1]),i=t[2],o=parseInt(t[3]),r=t[4],n=i==="h"?a:a*24,m=r==="h"?o:o*24;return n<m}return!1}function Bs(s){const e=di(s);return e.type==="inspection"?e.label:e.type==="custom"?`${e.gte} → ${e.lte} (${e.hours}h window)`:`${e.gte} (${e.hours}h window)`}function hi(){return[{label:"6h",value:"now-6h"},{label:"12h",value:"now-12h"},{label:"24h",value:"now-24h"},{label:"3d",value:"now-3d"},{label:"Inspection Time",value:"inspection_time"}]}function Hs(s){return hi().some(t=>t.value===s)}const Le={parseTimeRange:di,parseTimeRangeToFilter:zs,validateTimeRange:Us,formatTimeRange:Bs,getPresets:hi,validatePresetRange:Hs},ea={currentConfig:null,async init(){typeof API<"u"&&API.initialize&&await API.initialize()},async loadConfig(){const s=document.getElementById("configEditorStatus"),e=document.getElementById("configEditorFields");try{s.textContent="Loading configuration...",this.currentConfig=await H.getConfig(),e.innerHTML=k.sanitize(this.buildEditorFields(this.currentConfig)),s.textContent="(✓) Configuration loaded",s.style.color="#28a745",console.log("Config loaded:",this.currentConfig),this.updateQueryPreview(),this.attachEventListeners()}catch(t){s.textContent="(✗)Error loading config: "+t.message,s.style.color="#dc3545",console.error("Error loading config:",t)}},buildEditorFields(s){let e='<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">';e+="<div>",e+='<div class="config-section">',e+='<h5 style="margin: 0 0 8px 0; font-size: 13px; color: #555;">⏰ Time Range</h5>',e+=this.createCompactField("Current Range","timeRange.current",s.currentTimeRange||"now-12h","text"),e+='<div style="margin: 5px 0; display: flex; gap: 5px; flex-wrap: wrap;">',e+=`<button class="ux-button ux-button--tertiary" onclick="ConfigEditor.setTimeRange('now-6h')" style="flex: 1; min-width: 40px; padding: 4px 8px; font-size: 11px;">6H</button>`,e+=`<button class="ux-button ux-button--tertiary" onclick="ConfigEditor.setTimeRange('now-12h')" style="flex: 1; min-width: 40px; padding: 4px 8px; font-size: 11px;">12H</button>`,e+=`<button class="ux-button ux-button--tertiary" onclick="ConfigEditor.setTimeRange('now-24h')" style="flex: 1; min-width: 40px; padding: 4px 8px; font-size: 11px;">24H</button>`,e+=`<button class="ux-button ux-button--tertiary" onclick="ConfigEditor.setTimeRange('now-3d')" style="flex: 1; min-width: 40px; padding: 4px 8px; font-size: 11px;">3D</button>`,e+="</div>",e+="</div>",e+='<div class="config-section" style="margin-top: 12px;">',e+='<h5 style="margin: 0 0 8px 0; font-size: 13px; color: #555;">📊 Baseline Period</h5>',e+=this.createCompactField("Start Date","timeRange.baselineStart",s.baselineStart||"2025-06-01","date"),e+=this.createCompactField("End Date","timeRange.baselineEnd",s.baselineEnd||"2025-06-09","date"),e+="</div>",e+='<div class="config-section" style="margin-top: 12px;">',e+='<h5 style="margin: 0 0 8px 0; font-size: 13px; color: #555;">📈 Volume Thresholds</h5>',e+='<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">',e+=this.createCompactField("High","processing.highVolumeThreshold",s.highVolumeThreshold||1e3,"number","events/day"),e+=this.createCompactField("Medium","processing.mediumVolumeThreshold",s.mediumVolumeThreshold||100,"number","events/day"),e+="</div>",e+=this.createCompactField("Min Daily Volume","processing.minDailyVolume",s.minDailyVolume||100,"number"),e+="</div>",e+="</div>",e+="<div>",e+='<div class="config-section">',e+='<h5 style="margin: 0 0 8px 0; font-size: 13px; color: #555;">🚨 Alert Thresholds</h5>',e+='<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">',e+=this.createCompactField("Critical","processing.criticalThreshold",s.criticalThreshold||-80,"number","%"),e+=this.createCompactField("Warning","processing.warningThreshold",s.warningThreshold||-50,"number","%"),e+="</div>",e+="</div>",e+='<div class="config-section" style="margin-top: 12px;">',e+='<h5 style="margin: 0 0 8px 0; font-size: 13px; color: #555;">🎨 Dashboard</h5>',e+=this.createCompactField("Theme","dashboard.theme",s.theme||"light","select",["light","dark","auto"]),e+=this.createCompactField("Auto Refresh","dashboard.autoRefreshEnabled",s.autoRefreshEnabled!==!1,"select",["true","false"]),e+='<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">',e+=this.createCompactField("Refresh (s)","dashboard.refreshInterval",Math.floor((s.autoRefreshInterval||3e5)/1e3),"number"),e+=this.createCompactField("Max Events","dashboard.maxEventsDisplay",s.maxEventsDisplay||200,"number"),e+="</div>",e+="</div>",e+='<div class="config-section" style="margin-top: 12px;">',e+='<h5 style="margin: 0 0 8px 0; font-size: 13px; color: #555;">🔍 Elasticsearch/Kibana</h5>',e+=this.createCompactField("Server URL","elasticsearch.url",s.elasticsearchUrl||s.kibanaUrl||"","text"),e+=this.createCompactField("Index Pattern","elasticsearch.indexPattern",s.indexPattern||"traffic-*","text"),e+=this.createCompactField("Auth Cookie","elasticsearch.cookie",s.elasticCookie||"","text","","password"),e+="</div>",e+="</div>",e+="</div>",e+='<div class="config-section" style="margin-top: 12px; border-top: 1px solid #eee; padding-top: 12px;">',e+='<h5 style="margin: 0 0 8px 0; font-size: 13px; color: #555;">🎯 Query Configuration</h5>',e+='<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">',e+="<div>",e+=this.createCompactField("Event ID Pattern","query.eventPattern",s.queryEventPattern||"pandc.vnext.recommendations.feed.feed*","text"),e+="</div>",e+="<div>",e+=this.createCompactField("Aggregation Size","query.aggSize",s.queryAggSize||500,"number"),e+="</div>",e+="</div>",e+="</div>",e+='<div class="config-section" style="margin-top: 12px; border-top: 1px solid #eee; padding-top: 12px;">',e+='<h5 style="margin: 0 0 8px 0; font-size: 13px; color: #555;">🔍 Query Preview</h5>',e+='<div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">',e+='<span style="font-size: 11px; color: #666;">Live preview of the Elasticsearch query</span>',e+='<button onclick="ConfigEditor.copyQuery(event)" style="padding: 2px 8px; font-size: 11px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 3px; cursor: pointer;">📋 Copy</button>',e+="</div>",e+='<pre id="queryPreview" style="background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 11px; overflow-x: auto; max-height: 300px; overflow-y: auto; margin: 0;"></pre>',e+="</div>",e+='<div class="config-section" style="margin-top: 12px; border-top: 1px solid #eee; padding-top: 12px;">',e+='<h5 style="margin: 0 0 8px 0; font-size: 13px; color: #555;">📅 Advanced Settings</h5>',e+='<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">',e+="<div>";const t=s.minEventDate?new Date(s.minEventDate).toISOString().slice(0,16):"2025-05-19T04:00";return e+=this.createCompactField("Min Event Date","search.minEventDate",t,"datetime-local"),e+=this.createCompactField("CORS Proxy Port","cors.proxyPort",s.corsProxyPort||8e3,"number"),e+="</div>",e+="<div>",e+=this.createCompactField("App Name","app.name",s.appName||"RAD Monitor","text"),e+=this.createCompactField("Debug Mode","app.debug",s.debug||!1,"select",["false","true"]),e+="</div>",e+="</div>",e+="</div>",e},createField(s,e,t,a="text",i=[]){const o="config_"+e.replace(/\./g,"_");let r='<div class="config-field" style="margin-bottom: 10px;">';return r+=`<label for="${o}" style="display: block; font-size: 12px; margin-bottom: 3px;">${s}:</label>`,a==="select"?(r+=`<select id="${o}" data-path="${e}" class="config-input" style="width: 100%; padding: 5px;">`,i.forEach(n=>{r+=`<option value="${n}" ${t===n?"selected":""}>${n}</option>`}),r+="</select>"):r+=`<input type="${a}" id="${o}" data-path="${e}" value="${t}" class="config-input" style="width: 100%; padding: 5px;">`,r+="</div>",r},createCompactField(s,e,t,a="text",i="",o=null){const r="config_"+e.replace(/\./g,"_");let n='<div class="config-field-compact" style="margin-bottom: 6px;">';if(a==="select")n+=`<label for="${r}" style="display: block; font-size: 11px; margin-bottom: 2px; color: #666;">${s}:</label>`,n+=`<select id="${r}" data-path="${e}" class="config-input" style="width: 100%; padding: 4px; font-size: 12px;">`,i.forEach(m=>{n+=`<option value="${m}" ${t===m?"selected":""}>${m}</option>`}),n+="</select>";else{const m=typeof i=="string"?i:"";n+=`<label for="${r}" style="display: block; font-size: 11px; margin-bottom: 2px; color: #666;">${s}${m?" ("+m+")":""}:</label>`,n+=`<input type="${o||a}" id="${r}" data-path="${e}" value="${t}" class="config-input" style="width: 100%; padding: 4px; font-size: 12px;">`}return n+="</div>",n},setTimeRange(s){const e=document.getElementById("config_timeRange_current");e&&(e.value=s,document.querySelectorAll(".preset-button").forEach(a=>{a.textContent===s.replace("now-","").toUpperCase()?a.classList.add("active"):a.classList.remove("active")}))},mapToConfigKey(s,e){const t={"timeRange.current":"currentTimeRange","timeRange.baselineStart":"baselineStart","timeRange.baselineEnd":"baselineEnd","processing.criticalThreshold":"criticalThreshold","processing.warningThreshold":"warningThreshold","processing.minDailyVolume":"minDailyVolume","processing.highVolumeThreshold":"highVolumeThreshold","processing.mediumVolumeThreshold":"mediumVolumeThreshold","dashboard.refreshInterval":"autoRefreshInterval","dashboard.autoRefreshEnabled":"autoRefreshEnabled","dashboard.maxEventsDisplay":"maxEventsDisplay","dashboard.theme":"theme","dashboard.consoleChartWidth":"consoleChartWidth","dashboard.consoleTopResults":"consoleTopResults","elasticsearch.indexPattern":"indexPattern","elasticsearch.timeout":"elasticsearchTimeout","elasticsearch.url":"elasticsearchUrl","elasticsearch.cookie":"elasticCookie","search.minEventDate":"minEventDate","cors.proxyPort":"corsProxyPort","app.name":"appName","app.debug":"debug","query.eventPattern":"queryEventPattern","query.aggSize":"queryAggSize"},a=`${s}.${e}`;return t[a]||null},async saveConfig(){const s=document.getElementById("configEditorStatus");try{s.textContent="Saving configuration...",s.style.color="#666";const e={};if(document.querySelectorAll("#configEditorFields .config-input").forEach(a=>{const i=a.dataset.path;let o=a.value;a.type==="number"?o=parseInt(o,10):a.type==="select"&&(i==="app.debug"||i==="dashboard.autoRefreshEnabled")?o=o==="true":a.type==="datetime-local"&&(o=o?new Date(o).toISOString():"");const r=i.split(".");if(r.length===2){const[n,m]=r,h=this.mapToConfigKey(n,m);h&&(h==="autoRefreshInterval"&&(o=o*1e3),h==="elasticsearchUrl"?(e.elasticsearchUrl=o,e.kibanaUrl=o):e[h]=o)}}),await H.updateConfig(e,{saveToBackend:!1,saveToLocalStorage:!0}),e.elasticCookie){s.textContent="(✓) Cookie saved! Testing connection...",s.style.color="#17a2b8";const a={cookie:e.elasticCookie,expires:new Date(Date.now()+24*60*60*1e3).toISOString(),saved:new Date().toISOString()};window.CentralizedAuth?await window.CentralizedAuth.setCookie(cookieValue):localStorage.setItem("elasticCookie",JSON.stringify(a));try{const{unifiedAPI:i}=await ja(async()=>{const{unifiedAPI:r}=await Promise.resolve().then(()=>Qs);return{unifiedAPI:r}},void 0);(await i.getAuthenticationDetails()).valid?await i.checkHealth()?(s.textContent="(✓) Configuration saved & connection verified!",s.style.color="#28a745",typeof Dashboard<"u"&&Dashboard.refresh&&setTimeout(()=>{s.textContent="Refreshing dashboard...",Dashboard.refresh(),setTimeout(()=>{s.textContent=""},3e3)},1e3)):(s.textContent="⚠️ Cookie saved but connection test failed",s.style.color="#ffc107"):(s.textContent="⚠️ Cookie saved but authentication invalid",s.style.color="#ffc107")}catch(i){s.textContent=`⚠️ Cookie saved. Connection test: ${i.message}`,s.style.color="#ffc107"}}else s.textContent="(✓) Configuration saved successfully!",s.style.color="#28a745",typeof Dashboard<"u"&&Dashboard.refresh&&setTimeout(()=>{s.textContent="Refreshing dashboard...",Dashboard.refresh(),setTimeout(()=>{s.textContent=""},3e3)},1e3)}catch(e){s.textContent="(✗)Error saving config: "+e.message,s.style.color="#dc3545",console.error("Error saving config:",e)}},async resetToDefaults(){const s=document.getElementById("configEditorStatus");if(confirm("Are you sure you want to reset all settings to defaults? This cannot be undone."))try{s.textContent="Resetting to defaults...",s.style.color="#666",await H.resetToDefaults(),await this.loadConfig(),s.textContent="(✓) Reset to defaults complete!",s.style.color="#28a745"}catch(e){s.textContent="(✗)Error resetting config: "+e.message,s.style.color="#dc3545",console.error("Error resetting config:",e)}},generateQuery(){const s=R=>{const _=document.getElementById(R);return _?_.value:""},e=s("config_timeRange_current")||"now-12h",t=s("config_timeRange_baselineStart")||"2025-06-01",a=s("config_timeRange_baselineEnd")||"2025-06-09",i=s("config_search_minEventDate"),o=s("config_elasticsearch_indexPattern")||"traffic-*",r=s("config_query_eventPattern")||"pandc.vnext.recommendations.feed.feed*",n=parseInt(s("config_query_aggSize")||"500",10),m="dashboard.godaddy.com",h="detail.event.data.traffic.eid.keyword",b=i?new Date(i).toISOString():"2025-05-19T04:00:00.000Z",w=Le.parseTimeRangeToFilter(e);return{index:o,body:{aggs:{events:{terms:{field:h,size:n,order:{_count:"desc"}},aggs:{baseline:{filter:{range:{"@timestamp":{gte:t,lt:a}}}},current:{filter:{range:{"@timestamp":w}}}}}},size:0,query:{bool:{filter:[{wildcard:{[h]:{value:r}}},{match_phrase:{"detail.global.page.host":m}},{range:{"@timestamp":{gte:b,lte:"now"}}}]}}}}},updateQueryPreview(){const s=document.getElementById("queryPreview");if(s)try{const e=this.generateQuery();s.textContent=JSON.stringify(e,null,2)}catch(e){s.textContent=`Error generating query: ${e.message}`}},attachEventListeners(){const s=document.querySelectorAll("#configEditorFields .config-input");let e;const t=()=>{clearTimeout(e),e=setTimeout(()=>{this.updateQueryPreview()},300)};s.forEach(a=>{a.addEventListener("input",t),a.addEventListener("change",t)}),setTimeout(()=>{document.querySelectorAll(".preset-button").forEach(i=>{i.addEventListener("click",()=>{setTimeout(t,100)})})},100)},async copyQuery(s){const e=document.getElementById("queryPreview");if(e)try{await navigator.clipboard.writeText(e.textContent);const t=s?s.target:document.querySelector('[onclick*="copyQuery"]');if(t){const a=t.textContent;t.textContent="(✓) Copied!",t.style.background="#4CAF50",t.style.color="white",setTimeout(()=>{t.textContent=a,t.style.background="#f0f0f0",t.style.color=""},2e3)}}catch(t){console.error("Failed to copy:",t)}}};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>ea.init()):ea.init();function mi(s,e){if(!e||typeof e!="object")return"unknown";for(const[t,a]of Object.entries(e))if(a.enabled&&a.pattern){const i="^"+a.pattern.replace(/[.+?^${}()|[\]\\]/g,"\\$&").replace(/\*/g,".*")+"$";if(new RegExp(i).test(s))return t}return"unknown"}function pi(s,e,t){if(e!=="unknown"&&t[e]?.pattern){const a=t[e].pattern,i=a.substring(0,a.indexOf("*"));return s.replace(i,"")}return s.replace("pandc.vnext.recommendations.feed.","")}function qs(s,e){const t=Date.now(),a=s.length,i=[];typeof DataLayer<"u"&&DataLayer.logAction&&DataLayer.logAction("DATA_PROCESSING_START",{bucketCount:a,timeRange:e.currentTimeRange,thresholds:{high:e.highVolumeThreshold,medium:e.mediumVolumeThreshold}});const o=new Date(e.baselineStart),r=new Date(e.baselineEnd),n=Math.ceil((r-o)/(1e3*60*60*24)),h=Le.parseTimeRange(e.currentTimeRange).hours;let b=0,w=0;for(const R of s){const _=R.key,O=R.baseline?.doc_count||0,me=R.current?.doc_count||0,re=O/n/24*h;if(re===0){w++;continue}const N=O/n;if(N<e.mediumVolumeThreshold){b++;continue}let ne=fi(me,re),$=gi(ne);const l=mi(_,e.rad_types),u=pi(_,l,e.rad_types);i.push({event_id:_,displayName:u,current:me,baseline12h:Math.round(re),baseline_period:Math.round(re),score:ne,status:$,dailyAvg:Math.round(N),rad_type:l})}i.sort((R,_)=>R.score-_.score);const T=Date.now()-t;if(typeof DataLayer<"u"&&DataLayer.logAction){const R=yi(i);DataLayer.logAction("DATA_PROCESSING_COMPLETE",{duration:T,inputBuckets:a,outputResults:i.length,skippedLowVolume:b,skippedNoBaseline:w,processingRate:a>0?Math.round(a/(T/1e3)):0,stats:R,performanceMetrics:{avgProcessingTimePerBucket:a>0?(T/a).toFixed(2):0,processingEfficiency:a>0?(i.length/a*100).toFixed(1):0}}),T>100&&DataLayer.logAction("DATA_PROCESSING_PERFORMANCE_WARNING",{duration:T,bucketCount:a,threshold:100,message:"Data processing exceeded 100ms"})}return i}function fi(s,e){if(arguments.length===2&&typeof s=="number"){const m=s;if(e===0)return 0;const h=(m-e)/e*100;return Math.round(h)}const t=s,{current:a,baseline_period:i,daily_avg:o,highVolumeThreshold:r}=t;if(i===0)return 0;const n=a/i;return o>=r?n<.5?Math.round((1-n)*-100):Math.round((n-1)*100):n<.3?Math.round((1-n)*-100):Math.round((n-1)*100)}function gi(s){return s<=-80?"CRITICAL":s<=-50?"WARNING":s>0?"INCREASED":"NORMAL"}function Vs(s,e){return e>=1e3?s<=-80?"CRITICAL":s<=-50?"WARNING":s>0?"INCREASED":"NORMAL":s<=-80?"CRITICAL":s<=-30?"WARNING":s>0?"INCREASED":"NORMAL"}function Gs(s,e){const t=Math.abs(s-e);return t<50?{type:"normal",message:"Normal variance"}:s<e?{type:"loss",message:`Lost ~${t.toLocaleString()} impressions`}:{type:"gain",message:`Gained ~${t.toLocaleString()} impressions`}}function yi(s){const e={critical:0,warning:0,normal:0,increased:0};for(const t of s){const a=t.status.toLowerCase();a in e&&e[a]++}return e}const ze={processData:qs,calculateScore:fi,determineStatus:gi,getStatus:Vs,calculateImpact:Gs,getSummaryStats:yi,determineRadType:mi,getDisplayName:pi};class Ws{constructor(){this.isLocalDev=window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1",this.isProduction=window.location.hostname.includes("github.io")||window.location.hostname.includes("github.com");const e=window.ConfigService?.getConfig()||{};if(this.baseUrl=Tt(),this.apiV1=`${this.baseUrl}/api/v1`,e.features?.websocket&&this.baseUrl){const t=this.baseUrl.startsWith("https")?"wss":"ws",a=this.baseUrl.replace(/^https?:\/\//,"");this.wsUrl=`${t}://${a}/ws`}else this.wsUrl=null;this.useProxy=!1,this.websocket=null,this.wsHandlers=new Map,this.wsReconnectInterval=null,this.wsState="disconnected",this.cache=new Map,this.CACHE_TTL=5*60*1e3,this.MAX_CACHE_SIZE=50,this.metrics={requests:0,errors:0,totalTime:0}}async getElasticCookie(){if(window.CentralizedAuth){const t=window.CentralizedAuth.getCookie();if(t)return t}const e=localStorage.getItem("elasticCookie");if(e)try{let t;if(/^[A-Za-z0-9+/]+=*$/.test(e)&&e.length>100)try{t=await Ct.decrypt(e)}catch{t=JSON.parse(e)}else t=JSON.parse(e);if(t.expires&&new Date(t.expires)>new Date)return t.cookie}catch{}return window.ELASTIC_COOKIE?window.ELASTIC_COOKIE:null}async saveElasticCookie(e){if(!e||!e.trim())return!1;if(window.CentralizedAuth)try{return await window.CentralizedAuth.setCookie(e,{source:"api-client"}),!0}catch(a){return console.error("Failed to save cookie via CentralizedAuth:",a),!1}const t={cookie:e.trim(),expires:new Date(Date.now()+24*60*60*1e3).toISOString(),saved:new Date().toISOString()};try{const a=await Ct.encrypt(t);localStorage.setItem("elasticCookie",a)}catch(a){console.error("Failed to encrypt cookie:",a),localStorage.setItem("elasticCookie",JSON.stringify(t))}return!0}async getAuthenticationDetails(){const e=await this.getElasticCookie();return e?{valid:!0,method:this.isLocalDev?"unified-server":"direct",cookie:e}:{valid:!1,method:null,cookie:null,message:"No authentication cookie found"}}async promptForCookie(e="API access"){const t=prompt(`Enter your Elastic authentication cookie for ${e}:

1. Open Kibana in another tab
2. Open Developer Tools (F12)
3. Go to Network tab
4. Refresh the page
5. Find any request to Kibana
6. Copy the 'Cookie' header value
7. Paste it below

Look for: sid=xxxxx`);return t&&await this.saveElasticCookie(t)?t.trim():null}async request(e,t={}){const a=Date.now(),i=`req_${Date.now()}_${Math.random().toString(36).substr(2,9)}`;try{t.headers={"Content-Type":"application/json",...t.headers};const o=new AbortController,r=setTimeout(()=>o.abort(),t.timeout||3e4);try{const n=await fetch(e,{...t,signal:o.signal});clearTimeout(r);const m=Date.now()-a;if(this.metrics.requests++,this.metrics.totalTime+=m,!n.ok){const b=await n.json().catch(()=>({}));throw new Error(b.detail||`HTTP ${n.status}: ${n.statusText}`)}const h=await n.json();return console.log(`(✓)API Request → ${t.method||"GET"} ${e} | ${m}ms`,{requestId:i,status:n.status}),{success:!0,data:h,duration:m,requestId:i}}catch(n){throw clearTimeout(r),n}}catch(o){const r=Date.now()-a;return this.metrics.errors++,console.error(`(✗) API Request Failed → ${t.method||"GET"} ${e} | ${r}ms`,{requestId:i,error:o.message}),{success:!1,error:o.message,duration:r,requestId:i}}}async get(e,t={}){return this.request(`${this.apiV1}${e}`,{method:"GET",...t})}async post(e,t,a={}){return this.request(`${this.apiV1}${e}`,{method:"POST",body:JSON.stringify(t),...a})}buildQuery(e){const t=H.getConfig(),a=t.rad_types||{};let i=Object.entries(a).filter(([n,m])=>m.enabled&&m.pattern).map(([n,m])=>m.pattern.trim()).filter(n=>n.length>0);i.length===0&&(console.warn("No valid RAD patterns found, using default pattern"),i=["pandc.vnext.recommendations.feed.feed*"]),console.log("🔍 Query patterns:",i);const o=Le.parseTimeRangeToFilter(e.currentTimeRange);return{size:0,aggs:{events:{terms:{field:"detail.event.data.traffic.eid.keyword",order:{_key:"asc"},size:t.queryAggSize||500},aggs:{baseline:{filter:{range:{"@timestamp":{gte:e.baselineStart,lt:e.baselineEnd}}}},current:{filter:{range:{"@timestamp":o}}}}}},query:{bool:{filter:[i.length===1?{wildcard:{"detail.event.data.traffic.eid.keyword":{value:i[0]}}}:{bool:{should:i.map(n=>({wildcard:{"detail.event.data.traffic.eid.keyword":{value:n}}})),minimum_should_match:1}},{match_phrase:{"detail.global.page.host":"dashboard.godaddy.com"}},{range:{"@timestamp":{gte:t.minEventDate||"2025-05-19T04:00:00.000Z",lte:"now"}}}]}}}}async executeQuery(e,t=!1){const a=await this.getAuthenticationDetails();if(!a.valid)return{success:!1,error:"No authentication available. Please set your cookie."};const i=JSON.stringify(e);if(!t&&this.cache.has(i)){const r=this.cache.get(i);if(Date.now()-r.timestamp<this.CACHE_TTL)return console.log("📦 Using cached query result"),{success:!0,data:r.data,cached:!0}}let o;if(this.useProxy){const r=H.getConfig(),n=r.corsProxy?.url;if(!n)return{success:!1,error:"Proxy service not configured for production mode"};const m=kt(),h=r.elasticsearch?.path||"/api/console/proxy?path=traffic-*/_search&method=POST",b={esUrl:m,esPath:h,cookie:a.cookie,query:e};if(o=await this.request(n,{method:"POST",body:JSON.stringify(b),headers:{"Content-Type":"application/json"}}),!o.success&&o.error&&o.error.includes("CORS")){console.log("🔄 Proxy failed, trying direct Elasticsearch connection...");try{const w=await fetch(`${m}${h}`,{method:"POST",headers:{"Content-Type":"application/json",Cookie:a.cookie},body:JSON.stringify(e)});if(w.ok){const T=await w.json();T.error||(console.log("(✓)Direct Elasticsearch connection successful!"),o={success:!0,data:T,method:"direct-elasticsearch-fallback"})}}catch(w){console.log("⚠️ Direct connection also failed:",w.message)}}}else o=await this.request(`${this.apiV1}/kibana/proxy`,{method:"POST",body:JSON.stringify({query:e,force_refresh:t}),headers:{"Content-Type":"application/json","X-Elastic-Cookie":a.cookie}});if(o.success){if(this.cache.size>=this.MAX_CACHE_SIZE){const r=this.cache.keys().next().value;this.cache.delete(r)}this.cache.set(i,{data:o.data,timestamp:Date.now()})}return o}async fetchTrafficData(e){const t=this.buildQuery(e);return await this.executeQuery(t)}async checkHealth(){if(this.useProxy){const t=await this.getAuthenticationDetails();return{healthy:t.valid,mode:"production-proxy",authenticated:t.valid,message:t.valid?"Proxy authentication ready":"No authentication cookie"}}const e=await this.request(`${this.baseUrl}/health`);return e.success?e.data:{healthy:!1,error:e.error}}async getDashboardConfig(){return await this.get("/dashboard/config")}async updateDashboardConfig(e){return await this.post("/dashboard/config",e)}async getDashboardStats(){return await this.get("/dashboard/stats")}async getMetrics(){return await this.get("/metrics")}async connectWebSocket(){return!this.wsUrl||!this.isLocalDev?!1:this.websocket?.readyState===WebSocket.OPEN?!0:new Promise(e=>{try{this.websocket=new WebSocket(this.wsUrl),this.websocket.onopen=()=>{console.log("🔌 WebSocket connected"),this.wsState="connected",this.clearReconnectInterval(),this.websocket.send(JSON.stringify({type:"ping"})),e(!0)},this.websocket.onmessage=t=>{try{const a=JSON.parse(t.data);this.handleWebSocketMessage(a)}catch(a){console.error("Error parsing WebSocket message:",a)}},this.websocket.onerror=t=>{console.error("WebSocket error:",t),this.wsState="error",e(!1)},this.websocket.onclose=()=>{console.log("🔌 WebSocket disconnected"),this.wsState="disconnected",this.scheduleReconnect()}}catch(t){console.error("Failed to create WebSocket:",t),e(!1)}})}disconnectWebSocket(){this.websocket&&(this.websocket.close(),this.websocket=null),this.clearReconnectInterval(),this.wsState="disconnected"}handleWebSocketMessage(e){(this.wsHandlers.get(e.type)||[]).forEach(a=>{try{a(e.data)}catch(i){console.error(`Error in ${e.type} handler:`,i)}})}on(e,t){this.wsHandlers.has(e)||this.wsHandlers.set(e,[]),this.wsHandlers.get(e).push(t)}off(e,t){const a=this.wsHandlers.get(e);if(a){const i=a.indexOf(t);i>-1&&a.splice(i,1)}}scheduleReconnect(){this.wsReconnectInterval||(this.wsReconnectInterval=setInterval(()=>{console.log("Attempting WebSocket reconnection..."),this.connectWebSocket()},5e3))}clearReconnectInterval(){this.wsReconnectInterval&&(clearInterval(this.wsReconnectInterval),this.wsReconnectInterval=null)}clearCache(){this.cache.clear(),console.log("🧹 Cache cleared")}getClientMetrics(){return{...this.metrics,avgResponseTime:this.metrics.requests>0?Math.round(this.metrics.totalTime/this.metrics.requests):0,successRate:this.metrics.requests>0?Math.round((this.metrics.requests-this.metrics.errors)/this.metrics.requests*100):100,cacheSize:this.cache.size,websocketState:this.wsState}}async checkCorsProxy(){try{return(await fetch(`${this.baseUrl}/health`,{method:"GET",signal:AbortSignal.timeout(1e3)})).ok}catch{return!1}}async testAuthentication(){try{const e=await this.checkHealth();return e.healthy&&e.authenticated?{success:!0,method:this.isProduction?"production-proxy":"local-server",message:"Authentication validated successfully"}:{success:!1,error:e.message||"Authentication failed"}}catch(e){return{success:!1,error:e.message}}}async initialize(){console.log("🚀 Initializing Unified API Client");const e=await this.checkHealth();return console.log("Health check:",e),e.healthy?window.dispatchEvent(new CustomEvent("api:connected",{detail:{message:"API connected successfully"}})):window.dispatchEvent(new CustomEvent("api:disconnected",{detail:{message:e.message||"API connection failed"}})),this.isLocalDev&&await this.connectWebSocket(),e.healthy!==!1}cleanup(){console.log("🧹 UnifiedAPIClient: Cleaning up resources..."),this.disconnectWebSocket(),this.clearCache(),this.wsHandlers.clear(),this.metrics={requests:0,errors:0,totalTime:0},console.log("✅ UnifiedAPIClient: All resources cleaned up")}}const js=new Ws;class vi{constructor(){this.client=js,this.initialized=!1,this._initPromise=null}async initialize(){return this._initPromise?this._initPromise:this.initialized?Promise.resolve():(this._initPromise=this._doInitialize(),this._initPromise)}async _doInitialize(){try{const e=await this.client.initialize();return this.initialized=!0,console.log(`🚀 API Interface initialized (${this.client.isLocalDev?"local":"production"} mode)`),e}catch(e){return console.error("Failed to initialize API:",e),this.initialized=!0,!1}}async fetchTrafficData(e){return this.initialized||await this.initialize(),this.client.fetchTrafficData(e)}async updateConfiguration(e){return this.initialized||await this.initialize(),this.client.updateDashboardConfig(e)}async getAuthenticationDetails(){return this.initialized||await this.initialize(),this.client.getAuthenticationDetails()}async checkHealth(){return this.initialized||await this.initialize(),this.client.checkHealth()}async executeQuery(e){return this.initialized||await this.initialize(),this.client.executeQuery(e)}async trafficAnalysis(e,t={}){this.initialized||await this.initialize();try{const a={baselineStart:e.baseline_start,baselineEnd:e.baseline_end,currentTimeRange:e.current_time_range||e.comparison_start&&e.comparison_end?`${e.comparison_start}/${e.comparison_end}`:"now-12h"};if(e.comparison_start&&e.comparison_end){const i=new Date(e.baseline_end)-new Date(e.baseline_start),o=new Date(e.comparison_end)-new Date(e.comparison_start),r=i/o,n=await this.client.fetchTrafficData(a);return n.success&&n.data&&(n.data.metadata={baseline_duration_ms:i,comparison_duration_ms:o,normalization_factor:r,comparison_method:e.time_comparison_strategy||"linear_scale"}),n}return await this.client.fetchTrafficData(a)}catch(a){return console.error("Traffic analysis failed:",a),{success:!1,error:{message:a.message}}}}async timeSeries(e,t={}){this.initialized||await this.initialize();const a=this._buildTimeSeriesQuery(e);return await this.executeQuery(a)}async errorAnalysis(e,t={}){this.initialized||await this.initialize();const a=this._buildErrorAnalysisQuery(e);return await this.executeQuery(a)}async healthCheck(e={}){return this.initialized||await this.initialize(),await this.checkHealth()}async getCurrentTrafficData(e="12h",t={}){const a=new Date,i=new Date(a);i.setDate(i.getDate()-8),i.setHours(a.getHours(),a.getMinutes(),0,0);const o=new Date(i);o.setDate(o.getDate()-8);const r={baseline_start:o.toISOString(),baseline_end:i.toISOString(),current_time_range:e};return this.trafficAnalysis(r,t)}async getInspectionTimeData(e={}){return this.getCurrentTrafficData("inspection_time",e)}_buildTimeSeriesQuery(e){return{size:0,query:{range:{"@timestamp":{gte:e.time_range.start,lte:e.time_range.end}}},aggs:{time_series:{date_histogram:{field:"@timestamp",interval:e.interval||"1h"}}}}}_buildErrorAnalysisQuery(e){return{size:0,query:{bool:{filter:[{range:{"@timestamp":{gte:e.time_range.start,lte:e.time_range.end}}},{exists:{field:"error"}}]}},aggs:{errors:{terms:{field:"error.type",size:100}}}}}getMode(){return this.client.isLocalDev?"unified-local":"unified-production"}cleanup(){this.client.cleanup(),this.initialized=!1,this._initPromise=null}async promptForCookie(e){return this.client.promptForCookie(e)}on(e,t){this.client.on(e,t)}off(e,t){this.client.off(e,t)}getMetrics(){return this.client.getClientMetrics()}clearCache(){this.client.clearCache()}}const Ce=new vi,Qs=Object.freeze(Object.defineProperty({__proto__:null,UnifiedAPI:vi,unifiedAPI:Ce},Symbol.toStringTag,{value:"Module"})),bi=(()=>{const s={activeQueries:new Map,responseCache:new Map,parsedCache:new Map,lastProcessedResults:null},e={responseCache:50,parsedCache:50,activeQueries:20};function t(l,u){if(l.size>=u){const d=l.keys().next().value;l.delete(d)}}const a={queryDurations:[],maxQueryHistory:100,slowestQueryLastHour:null,cacheHits:0,cacheMisses:0,failedQueries:0,lastCorsHealthCheck:null,corsProxyStatus:"unknown"},i={stateChange:[],searchComplete:[],error:[],actionTriggered:[]},o={enabled:!0,collapsed:!0,verbosity:"normal",colors:{action:"#03A9F4",prevState:"#9E9E9E",actionDetails:"#4CAF50",nextState:"#FF6B6B",error:"#F44336",time:"#666666"}},r={quiet:["DASHBOARD_INIT_START","DASHBOARD_INIT_COMPLETE","DASHBOARD_REFRESH_START","DASHBOARD_REFRESH_COMPLETE","DASHBOARD_REFRESH_ERROR","QUERY_EXECUTE_SUCCESS","QUERY_EXECUTE_ERROR","PERFORMANCE_WARNING"],normal:["DASHBOARD_INIT_START","DASHBOARD_INIT_COMPLETE","DASHBOARD_REFRESH_START","DASHBOARD_REFRESH_COMPLETE","DASHBOARD_REFRESH_ERROR","FETCH_AND_PARSE_START","FETCH_AND_PARSE_COMPLETE","FETCH_AND_PARSE_ERROR","QUERY_EXECUTE_START","QUERY_EXECUTE_SUCCESS","QUERY_EXECUTE_ERROR","PERFORMANCE_WARNING","CLEAR_CACHE"],verbose:null},n={base(){return{size:0,query:{bool:{filter:[]}},aggs:{}}},timeRange(l,u,d,p){return l.query.bool.filter.push({range:{[u]:{gte:d,lte:p}}}),l},term(l,u,d){const p={};return p[u]=d,l.query.bool.filter.push({term:p}),l},matchPhrase(l,u,d){const p={};return p[u]=d,l.query.bool.filter.push({match_phrase:p}),l},wildcard(l,u,d){const p={};return p[u]={value:d},l.query.bool.filter.push({wildcard:p}),l},multiWildcard(l,u,d){const p=d.map(f=>{const y={};return y[u]={value:f},{wildcard:y}});return l.query.bool.filter.push({bool:{should:p,minimum_should_match:1}}),l},termsAgg(l,u,d,p=500){return l.aggs[u]={terms:{field:d,size:p,order:{_key:"asc"}}},l},dateHistogram(l,u,d,p){return l.aggs[u]={date_histogram:{field:d,calendar_interval:p,min_doc_count:0}},l},filterAgg(l,u,d){return l.aggs[u]={filter:d},l},addSubAgg(l,u,d,p){if(!l.aggs[u])throw new Error(`Parent aggregation '${u}' not found`);return l.aggs[u].aggs||(l.aggs[u].aggs={}),l.aggs[u].aggs[d]=p,l}},m={trafficAnalysis(l){const u=H.getConfig(),d="detail.event.data.traffic.eid.keyword",p="dashboard.godaddy.com",f=u.minEventDate||"2025-05-19T04:00:00.000Z",y=u.rad_types||{};let x=[];for(const[G,X]of Object.entries(y))X.enabled&&X.pattern&&X.pattern.trim().length>0&&x.push(X.pattern.trim());if(x.length===0){const G=u.queryEventPattern||"pandc.vnext.recommendations.feed.feed*";x=[G],console.log("📡 Using default pattern:",G)}console.log("📡 DataLayer query patterns:",x);const U={size:0,query:{bool:{filter:[{range:{"@timestamp":{gte:f,lte:"now"}}},{match_phrase:{"detail.global.page.host":p}}]}},aggs:{events:{terms:{field:d,size:500,order:{_key:"asc"}},aggs:{baseline:{filter:{range:{"@timestamp":{gte:l.baselineStart,lt:l.baselineEnd}}}},current:{filter:{range:{"@timestamp":Le.parseTimeRangeToFilter(l.currentTimeRange)}}}}}}};if(x.length===1)U.query.bool.filter.push({wildcard:{[d]:{value:x[0]}}});else{const G=x.map(X=>({wildcard:{[d]:{value:X}}}));U.query.bool.filter.push({bool:{should:G,minimum_should_match:1}})}console.log("📡 Generated query structure:",JSON.stringify(U,null,2)),n.termsAgg(U,"events",d),n.addSubAgg(U,"events","baseline",{filter:{range:{"@timestamp":{gte:l.baselineStart,lt:l.baselineEnd}}}});const Q=Le.parseTimeRangeToFilter(l.currentTimeRange);return n.addSubAgg(U,"events","current",{filter:{range:{"@timestamp":Q}}}),U},timeSeries(l){const u=n.base();return n.timeRange(u,"@timestamp",l.startTime,l.endTime),n.dateHistogram(u,"timeline","@timestamp",l.interval||"1h"),l.groupBy&&n.addSubAgg(u,"timeline","groups",{terms:{field:l.groupBy,size:l.groupSize||10}}),u},errorAnalysis(l){const u=n.base();return n.timeRange(u,"@timestamp",l.startTime,l.endTime),n.termsAgg(u,"error_types","error.type.keyword"),n.termsAgg(u,"error_codes","response.status_code"),u},health(l={}){const u=n.base();return u.size=1,n.timeRange(u,"@timestamp","now-1h","now"),u}},h={parseAggregations(l){if(!l.aggregations)return null;const u={};for(const[d,p]of Object.entries(l.aggregations))u[d]=this.parseAggregation(p);return u},parseAggregation(l){return l.buckets&&Array.isArray(l.buckets)?{type:"terms",buckets:l.buckets.map(u=>({key:u.key,doc_count:u.doc_count,sub_aggs:this.parseSubAggregations(u)}))}:l.buckets&&l.buckets.length>0&&l.buckets[0].key_as_string?{type:"date_histogram",buckets:l.buckets.map(u=>({key:u.key,timestamp:u.key_as_string,doc_count:u.doc_count,sub_aggs:this.parseSubAggregations(u)}))}:l.doc_count!==void 0?{type:"filter",doc_count:l.doc_count,sub_aggs:this.parseSubAggregations(l)}:{type:"generic",data:l}},parseSubAggregations(l){const u={};for(const[d,p]of Object.entries(l))d!=="key"&&d!=="doc_count"&&d!=="key_as_string"&&(u[d]=this.parseAggregation(p));return Object.keys(u).length>0?u:null},parseHits(l){return!l.hits||!l.hits.hits?[]:l.hits.hits.map(u=>({id:u._id,source:u._source,score:u._score,index:u._index}))},parseError(l){return l.error?{type:l.error.type,reason:l.error.reason,details:l.error.root_cause||[]}:null}},b={toTimeSeries(l,u={}){const d=[];for(const[p,f]of Object.entries(l))if(f.type==="date_histogram"){const y={name:p,data:f.buckets.map(x=>({timestamp:x.timestamp,value:x.doc_count,sub_metrics:this.extractSubMetrics(x.sub_aggs)}))};d.push(y)}return d},extractMetrics(l){const u={};for(const[d,p]of Object.entries(l))p.type==="terms"&&(u[d]=p.buckets.map(f=>({key:f.key,value:f.doc_count,metrics:this.extractSubMetrics(f.sub_aggs)})));return u},extractSubMetrics(l){if(!l)return{};const u={};for(const[d,p]of Object.entries(l))p.type==="filter"?u[d]=p.doc_count:p.type==="terms"&&(u[d]=p.buckets.reduce((f,y)=>f+y.doc_count,0));return u},transformTrafficData(l,u){const d=l.events;if(!d||d.type!=="terms")return[];const p=d.buckets.map(f=>({key:f.key,doc_count:f.doc_count,baseline:{doc_count:f.sub_aggs?.baseline?.doc_count||0},current:{doc_count:f.sub_aggs?.current?.doc_count||0}}));if(typeof ze<"u"&&ze.processData){const f={...u,rad_types:u.rad_types||H.getConfig().rad_types};return ze.processData(p,f)}return p.map(f=>{const y=f.baseline.doc_count,x=f.current.doc_count,U=new Date(u.baselineStart),Q=new Date(u.baselineEnd),G=Math.ceil((Q-U)/(1e3*60*60*24)),X=Le.parseTimeRange(u.currentTimeRange).hours||12,pe=y/G/24*X,qe=y/G;if(qe<u.mediumVolumeThreshold)return null;let fe=0;if(pe>0){const ge=x/pe;qe>=u.highVolumeThreshold?fe=ge<.5?Math.round((1-ge)*-100):Math.round((ge-1)*100):fe=ge<.3?Math.round((1-ge)*-100):Math.round((ge-1)*100)}let Ie="NORMAL";fe<=-80?Ie="CRITICAL":fe<=-50?Ie="WARNING":fe>0&&(Ie="INCREASED");const nt=u.rad_types||H.getConfig().rad_types,B=typeof ze<"u"&&ze.determineRadType?ze.determineRadType(f.key,nt):"unknown";return{event_id:f.key,displayName:f.key.replace("pandc.vnext.recommendations.feed.",""),current:x,baseline12h:Math.round(pe),baseline_period:Math.round(pe),baseline_count:y,score:fe,status:Ie,dailyAvg:Math.round(qe),rad_type:B}}).filter(f=>f!==null)}},w={async execute(l,u,d={}){const p=this.getCacheKey(l,u);if(!d.forceRefresh&&s.responseCache.has(p)){const y=s.responseCache.get(p);if(Date.now()-y.timestamp<(d.cacheTimeout||3e5))return a.cacheHits++,N("QUERY_CACHE_HIT",{queryId:l,cacheKey:p}),y.data}a.cacheMisses++;const f=this.extractQueryDetails(u);N("QUERY_EXECUTE_START",{queryId:l,queryType:f.type,timeRange:f.timeRange,filters:f.filters,aggregations:f.aggregations}),s.activeQueries.set(l,{query:u,startTime:Date.now(),status:"executing"});try{const y=await this.sendQuery(u),x=Date.now()-s.activeQueries.get(l).startTime;a.queryDurations.push({queryId:l,duration:x,timestamp:Date.now(),queryType:u.aggs?Object.keys(u.aggs)[0]:"unknown"}),a.queryDurations.length>a.maxQueryHistory&&a.queryDurations.shift();const U=Date.now()-36e5,Q=a.queryDurations.filter(X=>X.timestamp>U);Q.length>0&&(a.slowestQueryLastHour=Q.reduce((X,pe)=>pe.duration>X.duration?pe:X)),x>5e3&&N("PERFORMANCE_WARNING",{queryId:l,duration:x,queryType:u.aggs?Object.keys(u.aggs)[0]:"unknown",message:`Query exceeded 5 seconds (${x}ms)`});const G=this.extractResultSummary(y,f);return N("QUERY_EXECUTE_SUCCESS",{queryId:l,duration:x,hits:G.hits,buckets:G.buckets,aggregations:G.aggregations,dataSize:G.dataSize}),t(s.responseCache,e.responseCache),s.responseCache.set(p,{data:y,timestamp:Date.now()}),s.activeQueries.set(l,{query:u,startTime:s.activeQueries.get(l).startTime,endTime:Date.now(),status:"completed"}),y}catch(y){const x=Date.now()-s.activeQueries.get(l).startTime;throw a.failedQueries++,N("QUERY_EXECUTE_ERROR",{queryId:l,duration:x,error:y.message}),s.activeQueries.set(l,{query:u,startTime:s.activeQueries.get(l).startTime,endTime:Date.now(),status:"error",error:y.message}),y}},async sendQuery(l){try{if(console.log("📤 Sending query to Elasticsearch:",JSON.stringify(l,null,2)),!Ce||!Ce.initialized){if(!Ce)throw new Error("UnifiedAPI not available");await Ce.initialize()}const u=await Ce.executeQuery(l);if(!u||!u.success)throw new Error(u?.error||"Query execution failed");return u.data}catch(u){throw console.error("sendQuery failed:",u),u.message.includes("authentication")||u.message.includes("cookie")?new Error("Authentication required - please set your cookie"):u.message.includes("CORS")||u.message.includes("proxy")?new Error("CORS proxy required for localhost - please start the proxy server"):new Error(`Query failed: ${u.message}`)}},getCacheKey(l,u){return`${l}_${JSON.stringify(u)}`},extractQueryDetails(l){const u={type:"unknown",timeRange:"not specified",filters:[],aggregations:[]};return l.aggs&&(u.aggregations=Object.keys(l.aggs),u.type=u.aggregations[0]||"aggregation"),l.query?.bool?.filter&&l.query.bool.filter.forEach(d=>{if(d.range?.["@timestamp"]){const p=d.range["@timestamp"];u.timeRange=`${p.gte||"earliest"} to ${p.lte||p.lt||"now"}`}else if(d.wildcard){const p=Object.keys(d.wildcard)[0],f=d.wildcard[p].value||d.wildcard[p];u.filters.push(`${p}: ${f}`)}else if(d.term){const p=Object.keys(d.term)[0];u.filters.push(`${p}: ${d.term[p]}`)}}),u},extractResultSummary(l,u){const d={hits:l.hits?.total?.value||0,buckets:0,aggregations:[],dataSize:"unknown"};l.aggregations&&(d.aggregations=Object.keys(l.aggregations),Object.values(l.aggregations).forEach(y=>{y.buckets&&Array.isArray(y.buckets)&&(d.buckets+=y.buckets.length)}));const p=JSON.stringify(l),f=Math.round(p.length/1024);return d.dataSize=f<1024?`${f}KB`:`${Math.round(f/1024*10)/10}MB`,d}};function T(l,u){i[l]?(i[l].push(u),N("ADD_EVENT_LISTENER",{event:l,listenerCount:i[l].length,callbackName:u.name||"anonymous"})):console.warn(`Unknown event type: ${l}`)}function R(l,u){if(i[l]){const d=i[l].indexOf(u);d>-1&&(i[l].splice(d,1),N("REMOVE_EVENT_LISTENER",{event:l,listenerCount:i[l].length,callbackName:u.name||"anonymous"}))}}function _(l,u){i[l]&&Array.isArray(i[l])?(N(`EVENT_EMIT_${l.toUpperCase()}`,{event:l,listenerCount:i[l].length,dataKeys:u&&typeof u=="object"?Object.keys(u):[]}),i[l].forEach((d,p)=>{try{typeof d=="function"?d(u):console.warn(`Invalid callback at index ${p} for event '${l}':`,d)}catch(f){console.error(`Error in listener ${p} for event '${l}':`,f),N("EVENT_LISTENER_ERROR",{event:l,listenerIndex:p,error:f.message,callbackType:typeof d})}})):i[l]&&console.warn(`Event '${l}' listeners is not an array:`,i[l])}function O(l){N("UPDATE_APP_CONFIG",{config:l,keys:Object.keys(l)})}async function me(l,u={}){try{if(l==="health"){if(typeof Ce<"u"&&Ce.checkHealth){const y=await Ce.checkHealth();return _("searchComplete",{searchType:"health",data:y.data||{status:y.healthy!==!1?"ok":"error"}}),y}const d=m.health(u),f={success:!0,data:await w.execute(l,d)};return _("searchComplete",{searchType:"health",data:{status:"ok",timestamp:new Date().toISOString()}}),f}return await re(l,{type:l,params:u})}catch(d){throw _("error",{searchType:l,error:d.message}),d}}async function re(l,u,d={}){N("FETCH_AND_PARSE_START",{queryId:l,queryType:u.type,params:u.params});try{const p=m[u.type](u.params);N("QUERY_BUILD_COMPLETE",{queryId:l,queryType:u.type});const f=await w.execute(l,p,d);N("RESPONSE_PARSE_START",{queryId:l});let y=null;try{if(y={aggregations:h.parseAggregations(f),hits:h.parseHits(f),error:h.parseError(f)},y.error)throw N("ELASTICSEARCH_ERROR_DETECTED",{queryId:l,errorType:y.error.type,errorReason:y.error.reason}),new Error(`Elasticsearch error: ${y.error.reason}`);N("RESPONSE_PARSE_COMPLETE",{queryId:l,hasAggregations:!!y.aggregations,hitCount:y.hits.length,aggregationKeys:y.aggregations?Object.keys(y.aggregations):[]})}catch(Q){throw N("RESPONSE_PARSE_ERROR",{queryId:l,error:Q.message,responseType:typeof f,hasResponse:!!f}),new Error(`Response parsing failed: ${Q.message}`)}N("DATA_TRANSFORM_START",{queryId:l,transformType:u.type});let x=null;try{switch(u.type){case"trafficAnalysis":x=b.transformTrafficData(y.aggregations,u.params);break;case"timeSeries":x=b.toTimeSeries(y.aggregations,u.params);break;default:x=b.extractMetrics(y.aggregations)}N("DATA_TRANSFORM_COMPLETE",{queryId:l,recordCount:Array.isArray(x)?x.length:0,hasData:!!x})}catch(Q){throw N("DATA_TRANSFORM_ERROR",{queryId:l,transformType:u.type,error:Q.message,aggregationsAvailable:!!y.aggregations}),new Error(`Data transformation failed: ${Q.message}`)}const U=w.getCacheKey(l,p);return t(s.parsedCache,e.parsedCache),s.parsedCache.set(U,{parsed:y,transformed:x,timestamp:Date.now()}),N("PARSED_DATA_CACHED",{queryId:l,cacheKey:U}),_("searchComplete",{searchType:l,data:x,parsed:y,raw:f,queryConfig:u}),u.type==="trafficAnalysis"&&x&&(s.lastProcessedResults=x),N("FETCH_AND_PARSE_COMPLETE",{queryId:l,totalDuration:Date.now()-(s.activeQueries.get(l)?.startTime||Date.now())}),{raw:f,parsed:y,transformed:x,queryId:l}}catch(p){throw N("FETCH_AND_PARSE_ERROR",{queryId:l,error:p.message,stack:p.stack}),_("error",{searchType:l,error:p.message,queryConfig:u}),p}}function N(l,u,d={}){if(!o.enabled)return;if(o.verbosity!=="verbose"){const x=r[o.verbosity];if(x&&!x.includes(l))return}const p=new Date().toLocaleTimeString("en-US",{hour12:!1,hour:"2-digit",minute:"2-digit",second:"2-digit",fractionalSecondDigits:3});if(o.verbosity==="quiet"&&o.collapsed){console.log(`%c→ %c${l} %c@ ${p}`,"color: #666;",`color: ${o.colors.action};`,`color: ${o.colors.time}; font-size: 0.9em;`);return}const f=$();l!=="DASHBOARD_INIT_START"&&console.log(`%c action %c${l} %c@ ${p}`,"color: #666; font-weight: normal;",`color: ${o.colors.action}; font-weight: bold;`,`color: ${o.colors.time}; font-weight: normal;`),o.collapsed?console.groupCollapsed("%c prev state",`color: ${o.colors.prevState};`):console.group("%c prev state",`color: ${o.colors.prevState};`),console.log(f),console.groupEnd(),console.group("%c action    ",`color: ${o.colors.actionDetails};`),console.log({type:l,...u}),console.groupEnd();const y=$();console.group("%c next state",`color: ${o.colors.nextState};`),console.log(y),console.groupEnd(),u.error&&(console.group("%c error",`color: ${o.colors.error};`),console.error(u.error),console.groupEnd()),console.log("")}function ne(l={}){Object.assign(o,l)}function $(){return{queryState:{activeQueries:Array.from(s.activeQueries.entries()).map(([l,u])=>({id:l,status:u.status,startTime:u.startTime,endTime:u.endTime,duration:u.endTime?u.endTime-u.startTime:Date.now()-u.startTime,error:u.error})),responseCacheSize:s.responseCache.size,parsedCacheSize:s.parsedCache.size,lastProcessedResults:s.lastProcessedResults},performanceMetrics:{...a,recentQueries:a.queryDurations.slice(-10),averageQueryDuration:a.queryDurations.length>0?Math.round(a.queryDurations.slice(-10).reduce((l,u)=>l+u.duration,0)/Math.min(10,a.queryDurations.length)):0,cacheHitRate:a.cacheHits+a.cacheMisses>0?Math.round(a.cacheHits/(a.cacheHits+a.cacheMisses)*100):0},listeners:{stateChange:i.stateChange.length,searchComplete:i.searchComplete.length,error:i.error.length,actionTriggered:i.actionTriggered.length},stateLogging:o}}return{QueryBuilder:n,QueryTemplates:m,ResponseParser:h,DataTransformer:b,fetchAndParse:re,executeSearch:me,getQueryState:()=>({...s,lastProcessedResults:s.lastProcessedResults}),getActiveQueries:()=>Array.from(s.activeQueries.entries()),getCachedResponses:()=>Array.from(s.responseCache.keys()),addEventListener:T,removeEventListener:R,updateAppConfig:O,clearCache:()=>{const l=s.responseCache.size,u=s.parsedCache.size;N("CLEAR_CACHE",{responseCacheSize:l,parsedCacheSize:u,totalCleared:l+u}),s.responseCache.clear(),s.parsedCache.clear()},buildQuery:(l,u)=>m[l](u),parseResponse:l=>({aggregations:h.parseAggregations(l),hits:h.parseHits(l),error:h.parseError(l)}),logAction:N,configureLogging:ne,getPerformanceMetrics:()=>{const l=a.queryDurations.slice(-10),u=l.length>0?Math.round(l.reduce((f,y)=>f+y.duration,0)/l.length):0,d=a.cacheHits+a.cacheMisses,p=d>0?Math.round(a.cacheHits/d*100):0;return{averageQueryDuration:u,slowestQueryLastHour:a.slowestQueryLastHour,cacheHitRate:p,cacheHits:a.cacheHits,cacheMisses:a.cacheMisses,failedQueries:a.failedQueries,recentQueries:l,corsProxyStatus:a.corsProxyStatus,lastCorsHealthCheck:a.lastCorsHealthCheck}},updateCorsProxyStatus:l=>{a.corsProxyStatus=l,a.lastCorsHealthCheck=Date.now(),N("CORS_PROXY_HEALTH_CHECK",{status:l,timestamp:new Date().toISOString()})},resetPerformanceMetrics:()=>{a.queryDurations=[],a.cacheHits=0,a.cacheMisses=0,a.failedQueries=0,a.slowestQueryLastHour=null,N("PERFORMANCE_METRICS_RESET",{timestamp:new Date().toISOString()})},cleanup:()=>{N("DATA_LAYER_CLEANUP_START",{responseCacheSize:s.responseCache.size,parsedCacheSize:s.parsedCache.size,activeQueriesCount:s.activeQueries.size,listenerCounts:{stateChange:i.stateChange.length,searchComplete:i.searchComplete.length,error:i.error.length,actionTriggered:i.actionTriggered.length}}),s.responseCache.clear(),s.parsedCache.clear(),s.activeQueries.clear(),s.lastProcessedResults=null,i.stateChange=[],i.searchComplete=[],i.error=[],i.actionTriggered=[],a.queryDurations=[],a.cacheHits=0,a.cacheMisses=0,a.failedQueries=0,a.slowestQueryLastHour=null,a.lastCorsHealthCheck=null,a.corsProxyStatus="unknown",console.log("🧹 DataLayer: All resources cleaned up")}}})();class Ks{constructor(){this.unsubscribe=null}init(){this.unsubscribe=Oi(t=>{this.handleStateChange(t)});const e=j.getState();this.handleStateChange(e)}handleStateChange(e){const{ui:t}=e;t.isLoading?document.body.classList.add("loading"):document.body.classList.remove("loading");const a=document.getElementById("mainAppContent");a&&(t.mainContentVisible?a.style.display="block":a.style.display="none"),t.activeModal?document.body.classList.add("ux-modal-open"):document.body.classList.remove("ux-modal-open")}destroy(){this.unsubscribe&&this.unsubscribe()}}const Ha=new Ks;document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>{Ha.init(),console.log("🎯 DOM Effects Manager initialized")}):(Ha.init(),console.log("🎯 DOM Effects Manager initialized"));window.SimplifiedDashboard=la;function wi(){return H.getCurrentConfigFromDOM()}function St(s){H.loadConfigurationIntoDOM(s),Lt()}async function Ei(s){await H.updateConfig(s),bi.logAction("CONFIG_SAVED",{config:s})}async function Ys(){const s=wi();if(!Le.validateTimeRange(s.currentTimeRange)){alert('Invalid time range format. Use formats like "now-12h" or "-3h-6h"');return}await Ei(s),bi.logAction("CONFIG_APPLIED",{config:s}),window.Dashboard&&typeof window.Dashboard.refresh=="function"&&window.Dashboard.refresh()}function Xs(){H.exportConfig()}async function Js(){try{const s=await H.importConfig();St(s),alert("Configuration imported successfully")}catch(s){alert("Failed to import configuration: "+s.message)}}function Zs(s){H.setPresetTimeRange(s),Lt()}function Lt(){const s=document.getElementById("currentTimeRange")?.value,e=document.querySelectorAll(".preset-button");e.forEach(i=>{i.classList.remove("active")});const a={"now-6h":"6H","now-12h":"12H","now-24h":"24H","now-3d":"3D",inspection_time:"INSPECTION MODE"}[s];a&&e.forEach(i=>{(i.textContent===a||i.textContent.includes(a))&&i.classList.add("active")})}function eo(){return H.getConfig()}function to(s){return H.validateConfig(s)}async function ta(){await H.initialize(),H.subscribe(t=>{t.event==="updated"&&St(t.newConfig)});const s=H.getConfig();St(s);const e=document.getElementById("currentTimeRange");e&&e.addEventListener("change",Lt)}const ao={getCurrentConfig:wi,loadConfiguration:St,saveConfiguration:Ei,applyConfiguration:Ys,exportConfiguration:Xs,importConfiguration:Js,setPresetTimeRange:Zs,highlightActivePreset:Lt,initialize:ta,checkEnvironment:eo,validateConfiguration:to};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>{ta().catch(console.error)}):ta().catch(console.error);const le={autocompleteDelay:150,autocompleteMinChars:1,maxSuggestions:10,syntaxHighlightDelay:50,lineHeight:24,fontSize:14},Ee={function:"#2563eb",field:"#10b981",number:"#f59e0b",string:"#ec4899",operator:"#8b5cf6",parenthesis:"#64748b",keyword:"#ef4444",error:"#dc2626"};class io extends HTMLElement{constructor(){super(),this.attachShadow({mode:"open"}),this.parser=new rt,this.value="",this.cursorPosition=0,this.selectionStart=0,this.selectionEnd=0,this.suggestions=[],this.selectedSuggestion=-1,this.syntaxHighlightTimer=null,this.autocompleteTimer=null,this.lastParseResult=null,this.history=[],this.historyIndex=-1,this.lastAutocompleteTime=0,this.isMobile=/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)}connectedCallback(){this.render(),this.setupEventListeners(),this.setupKeyboardShortcuts(),this.hasAttribute("value")?this.setValue(this.getAttribute("value")):this._pendingValue&&(this.setValue(this._pendingValue),this._pendingValue=null)}render(){this.shadowRoot.innerHTML=k.sanitize(`
      <style>
        :host {
          --editor-bg: #ffffff;
          --editor-border: #e2e8f0;
          --editor-focus-border: #2563eb;
          --editor-text: #1e293b;
          --editor-selection: rgba(37, 99, 235, 0.2);
          --editor-cursor: #2563eb;
          --autocomplete-bg: #ffffff;
          --autocomplete-border: #e2e8f0;
          --autocomplete-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          --autocomplete-selected: #f8fafc;
          --line-number-color: #94a3b8;
          --error-underline: #ef4444;

          display: block;
          position: relative;
          font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
        }

        .editor-container {
          position: relative;
          background: var(--editor-bg);
          border: 1px solid var(--editor-border);
          border-radius: 0.375rem;
          overflow: hidden;
          transition: border-color 0.2s;
        }

        .editor-container:focus-within {
          border-color: var(--editor-focus-border);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .editor-wrapper {
          display: flex;
          min-height: 100px;
          max-height: 400px;
          overflow: auto;
        }

        .line-numbers {
          background: #f8fafc;
          border-right: 1px solid var(--editor-border);
          padding: 0.75rem 0;
          text-align: right;
          user-select: none;
          flex-shrink: 0;
        }

        .line-number {
          display: block;
          padding: 0 0.75rem;
          color: var(--line-number-color);
          font-size: ${le.fontSize}px;
          line-height: ${le.lineHeight}px;
        }

        .editor-content {
          flex: 1;
          position: relative;
          padding: 0.75rem 1rem;
        }

        .editor-layers {
          position: relative;
        }

        .editor-layer {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          font-size: ${le.fontSize}px;
          line-height: ${le.lineHeight}px;
          white-space: pre-wrap;
          word-wrap: break-word;
          pointer-events: none;
        }

        .syntax-highlight {
          color: transparent;
        }

        .syntax-highlight .token-function { color: ${Ee.function}; }
        .syntax-highlight .token-field { color: ${Ee.field}; }
        .syntax-highlight .token-number { color: ${Ee.number}; }
        .syntax-highlight .token-string { color: ${Ee.string}; }
        .syntax-highlight .token-operator { color: ${Ee.operator}; }
        .syntax-highlight .token-parenthesis { color: ${Ee.parenthesis}; }
        .syntax-highlight .token-keyword { color: ${Ee.keyword}; }
        .syntax-highlight .token-error {
          color: ${Ee.error};
          text-decoration: wavy underline;
          text-decoration-color: ${Ee.error};
        }

        .editor-input {
          position: relative;
          background: transparent;
          border: none;
          outline: none;
          font-family: inherit;
          font-size: ${le.fontSize}px;
          line-height: ${le.lineHeight}px;
          color: var(--editor-text);
          resize: none;
          width: 100%;
          min-height: ${le.lineHeight*3}px;
          padding: 0;
          margin: 0;
          white-space: pre-wrap;
          word-wrap: break-word;
          caret-color: var(--editor-cursor);
        }

        .editor-input::selection {
          background: var(--editor-selection);
        }

        /* Autocomplete dropdown */
        .autocomplete-container {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 4px;
          background: var(--autocomplete-bg);
          border: 1px solid var(--autocomplete-border);
          border-radius: 0.375rem;
          box-shadow: var(--autocomplete-shadow);
          max-height: 200px;
          overflow-y: auto;
          z-index: 1000;
          opacity: 0;
          transform: translateY(-10px);
          transition: opacity 0.2s, transform 0.2s;
          pointer-events: none;
        }

        .autocomplete-container.visible {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }

        .autocomplete-list {
          padding: 0.5rem 0;
        }

        .autocomplete-item {
          display: flex;
          align-items: center;
          padding: 0.5rem 1rem;
          cursor: pointer;
          transition: background-color 0.1s;
        }

        .autocomplete-item:hover,
        .autocomplete-item.selected {
          background: var(--autocomplete-selected);
        }

        .autocomplete-icon {
          width: 1rem;
          height: 1rem;
          margin-right: 0.5rem;
          opacity: 0.7;
        }

        .autocomplete-content {
          flex: 1;
        }

        .autocomplete-name {
          font-weight: 500;
          font-size: 0.875rem;
          color: var(--editor-text);
        }

        .autocomplete-match {
          background: rgba(37, 99, 235, 0.2);
          font-weight: 600;
        }

        .autocomplete-description {
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 0.125rem;
        }

        .autocomplete-signature {
          font-size: 0.75rem;
          color: #8b5cf6;
          margin-left: 0.5rem;
        }

        /* Status bar */
        .status-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.375rem 1rem;
          background: #f8fafc;
          border-top: 1px solid var(--editor-border);
          font-size: 0.75rem;
          color: #64748b;
        }

        .status-position {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .status-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .status-indicator {
          display: inline-block;
          width: 0.5rem;
          height: 0.5rem;
          border-radius: 50%;
          margin-right: 0.25rem;
        }

        .status-indicator.valid { background: #10b981; }
        .status-indicator.invalid { background: #ef4444; }
        .status-indicator.typing { background: #f59e0b; }

        /* Mobile optimizations */
        @media (max-width: 640px) {
          .editor-wrapper {
            min-height: 150px;
          }

          .line-numbers {
            padding: 0.5rem 0;
          }

          .editor-content {
            padding: 0.5rem 0.75rem;
          }

          .autocomplete-container {
            position: fixed;
            left: 1rem;
            right: 1rem;
            bottom: 1rem;
            top: auto;
            max-height: 50vh;
          }
        }

        /* Accessibility */
        @media (prefers-reduced-motion: reduce) {
          .autocomplete-container {
            transition: none;
          }
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          :host {
            --editor-bg: #1e293b;
            --editor-border: #334155;
            --editor-text: #f1f5f9;
            --autocomplete-bg: #1e293b;
            --autocomplete-selected: #334155;
          }

          .line-numbers {
            background: #0f172a;
          }

          .status-bar {
            background: #0f172a;
          }
        }
      </style>

      <div class="editor-container" role="textbox" aria-multiline="true" aria-label="Formula editor">
        <div class="editor-wrapper">
          <div class="line-numbers" aria-hidden="true">
            ${this.renderLineNumbers()}
          </div>

          <div class="editor-content">
            <div class="editor-layers">
              <div class="editor-layer syntax-highlight" aria-hidden="true">
                ${this.renderSyntaxHighlight()}
              </div>
              <textarea
                class="editor-input"
                spellcheck="false"
                autocomplete="off"
                autocorrect="off"
                autocapitalize="off"
                aria-label="Formula input"
                placeholder="Enter formula..."
              ></textarea>
            </div>
          </div>
        </div>

        <div class="status-bar">
          <div class="status-position">
            <span>Ln <span class="line-num">1</span>, Col <span class="col-num">1</span></span>
            <span><span class="char-count">0</span> characters</span>
          </div>
          <div class="status-info">
            <span class="validation-status">
              <span class="status-indicator typing"></span>
              Ready
            </span>
            <span class="autocomplete-time" hidden>
              AC: <span class="time-value">0</span>ms
            </span>
          </div>
        </div>

        <div class="autocomplete-container" role="listbox" aria-label="Suggestions">
          <div class="autocomplete-list">
            ${this.renderAutocomplete()}
          </div>
        </div>
      </div>
    `),this.editorInput=this.shadowRoot.querySelector(".editor-input"),this.syntaxLayer=this.shadowRoot.querySelector(".syntax-highlight"),this.autocompleteContainer=this.shadowRoot.querySelector(".autocomplete-container"),this.autocompleteList=this.shadowRoot.querySelector(".autocomplete-list"),this.lineNumbers=this.shadowRoot.querySelector(".line-numbers"),this.statusBar=this.shadowRoot.querySelector(".status-bar")}renderLineNumbers(){const e=this.value.split(`
`).length;return Array.from({length:Math.max(3,e)},(t,a)=>`<span class="line-number">${a+1}</span>`).join("")}renderSyntaxHighlight(){return this.value?this.lastParseResult?this.tokenizeForHighlight(this.value).map(t=>{const a=this.getTokenClass(t),i=this.escapeHtml(t.value);return a?`<span class="${a}">${i}</span>`:i}).join(""):this.escapeHtml(this.value):""}renderAutocomplete(){return this.suggestions.length===0?'<div class="autocomplete-item">No suggestions</div>':this.suggestions.map((e,t)=>`
      <div class="autocomplete-item ${t===this.selectedSuggestion?"selected":""}"
           data-index="${t}"
           role="option"
           aria-selected="${t===this.selectedSuggestion}">
        <svg class="autocomplete-icon" fill="currentColor" viewBox="0 0 20 20">
          ${this.getIconForSuggestion(e)}
        </svg>
        <div class="autocomplete-content">
          <span class="autocomplete-name">
            ${this.highlightMatch(e.name,e.match)}
          </span>
          ${e.signature?`<span class="autocomplete-signature">${e.signature}</span>`:""}
          ${e.description?`<div class="autocomplete-description">${e.description}</div>`:""}
        </div>
      </div>
    `).join("")}setupEventListeners(){this.editorInput.addEventListener("input",e=>{this.handleInput(e)}),this.editorInput.addEventListener("keydown",e=>{this.handleKeyDown(e)}),this.editorInput.addEventListener("selectionchange",e=>{this.updateCursorPosition()}),this.autocompleteList.addEventListener("click",e=>{const t=e.target.closest(".autocomplete-item");if(t){const a=parseInt(t.dataset.index);this.acceptSuggestion(a)}}),this.editorInput.addEventListener("focus",()=>{this.dispatchEvent(new Event("focus"))}),this.editorInput.addEventListener("blur",()=>{setTimeout(()=>{this.hideAutocomplete()},200),this.dispatchEvent(new Event("blur"))}),this.isMobile&&this.setupMobileEvents()}setupKeyboardShortcuts(){this.shortcuts=new Map([["ArrowDown",e=>{this.isAutocompleteVisible()&&(e.preventDefault(),this.selectNextSuggestion())}],["ArrowUp",e=>{this.isAutocompleteVisible()&&(e.preventDefault(),this.selectPreviousSuggestion())}],["Enter",e=>{this.isAutocompleteVisible()&&this.selectedSuggestion>=0&&(e.preventDefault(),this.acceptSuggestion(this.selectedSuggestion))}],["Tab",e=>{this.isAutocompleteVisible()&&this.selectedSuggestion>=0&&(e.preventDefault(),this.acceptSuggestion(this.selectedSuggestion))}],["Escape",e=>{this.isAutocompleteVisible()&&(e.preventDefault(),this.hideAutocomplete())}],["Ctrl+Z",e=>{e.preventDefault(),this.undo()}],["Cmd+Z",e=>{e.preventDefault(),this.undo()}],["Ctrl+Shift+Z",e=>{e.preventDefault(),this.redo()}],["Cmd+Shift+Z",e=>{e.preventDefault(),this.redo()}],["Ctrl+Space",e=>{e.preventDefault(),this.triggerAutocomplete()}],["Cmd+Space",e=>{e.preventDefault(),this.triggerAutocomplete()}]])}handleInput(e){const t=this.editorInput.value;t!==this.value&&(this.value=t,this.addToHistory(t),this.updateLineNumbers(),this.updateStatus(),this.scheduleSyntaxHighlight(),this.scheduleAutocomplete(),this.dispatchEvent(new CustomEvent("input",{detail:{value:t}})))}handleKeyDown(e){const t=this.getShortcutKey(e),a=this.shortcuts.get(t);a&&a(e)}getShortcutKey(e){const t=[];return e.ctrlKey&&t.push("Ctrl"),e.metaKey&&t.push("Cmd"),e.shiftKey&&t.push("Shift"),e.altKey&&t.push("Alt"),t.push(e.key),t.join("+")}scheduleSyntaxHighlight(){this.syntaxHighlightTimer&&clearTimeout(this.syntaxHighlightTimer),this.syntaxHighlightTimer=setTimeout(()=>{this.performSyntaxHighlight()},le.syntaxHighlightDelay)}performSyntaxHighlight(){const e=performance.now();this.lastParseResult=this.parser.parse(this.value),this.syntaxLayer.innerHTML=k.sanitize(this.renderSyntaxHighlight());const t=performance.now()-e;this.updateValidationStatus(this.lastParseResult.success,t)}scheduleAutocomplete(){this.autocompleteTimer&&clearTimeout(this.autocompleteTimer),this.autocompleteTimer=setTimeout(()=>{this.performAutocomplete()},le.autocompleteDelay)}async performAutocomplete(){const e=performance.now(),t=this.getAutocompleteContext();if(!t||t.prefix.length<le.autocompleteMinChars){this.hideAutocomplete();return}this.suggestions=await this.generateSuggestions(t),this.suggestions.length>0?(this.autocompleteList.innerHTML=k.sanitize(this.renderAutocomplete()),this.showAutocomplete(),this.selectedSuggestion=0):this.hideAutocomplete(),this.lastAutocompleteTime=Math.round(performance.now()-e),this.updateAutocompleteTime()}getAutocompleteContext(){const e=this.editorInput.selectionStart,t=this.value;let a=e;for(;a>0&&/[a-zA-Z0-9_.]/.test(t[a-1]);)a--;const i=t.substring(a,e);let o="function",r=0;for(let n=0;n<a;n++)t[n]==="("&&r++,t[n]===")"&&r--;return r>0&&(o="field"),{prefix:i,position:e,start:a,type:o}}async generateSuggestions(e){const t=[],a=e.prefix.toLowerCase();if(e.type==="function")for(const[i,o]of Object.entries(Re))i.toLowerCase().includes(a)&&t.push({name:i,type:"function",description:o.description,signature:this.getFunctionSignature(i),match:a,score:this.calculateMatchScore(i,a)});else if(e.type==="field"){const i=["bytes","response_time","status_code","user.id","product.price"];for(const o of i)o.toLowerCase().includes(a)&&t.push({name:o,type:"field",match:a,score:this.calculateMatchScore(o,a)})}return t.sort((i,o)=>o.score-i.score).slice(0,le.maxSuggestions)}calculateMatchScore(e,t){const a=e.toLowerCase(),i=t.toLowerCase();if(a===i)return 100;if(a.startsWith(i))return 90;if(a.split(/[_.-]/).some(n=>n.startsWith(i)))return 80;const r=a.indexOf(i);return r>=0?70-r:0}getFunctionSignature(e){return Re[e]?"(field)":"()"}highlightMatch(e,t){if(!t)return this.escapeHtml(e);const a=new RegExp(`(${this.escapeRegex(t)})`,"gi");return this.escapeHtml(e).replace(a,'<span class="autocomplete-match">$1</span>')}selectNextSuggestion(){this.suggestions.length!==0&&(this.selectedSuggestion=(this.selectedSuggestion+1)%this.suggestions.length,this.updateAutocompleteSelection())}selectPreviousSuggestion(){this.suggestions.length!==0&&(this.selectedSuggestion=this.selectedSuggestion<=0?this.suggestions.length-1:this.selectedSuggestion-1,this.updateAutocompleteSelection())}updateAutocompleteSelection(){const e=this.autocompleteList.querySelectorAll(".autocomplete-item");e.forEach((t,a)=>{t.classList.toggle("selected",a===this.selectedSuggestion),t.setAttribute("aria-selected",a===this.selectedSuggestion)}),this.selectedSuggestion>=0&&e[this.selectedSuggestion]&&e[this.selectedSuggestion].scrollIntoView({block:"nearest"})}acceptSuggestion(e){const t=this.suggestions[e];if(!t)return;const a=this.getAutocompleteContext(),i=this.value.substring(0,a.start),o=this.value.substring(a.position);let r=t.name;t.type==="function"?(r+="()",this.cursorPosition=a.start+r.length-1):this.cursorPosition=a.start+r.length,this.value=i+r+o,this.editorInput.value=this.value,this.editorInput.setSelectionRange(this.cursorPosition,this.cursorPosition),this.hideAutocomplete(),this.scheduleSyntaxHighlight(),this.dispatchEvent(new CustomEvent("suggestion-accepted",{detail:{suggestion:t}}))}showAutocomplete(){this.autocompleteContainer.classList.add("visible"),this.autocompleteContainer.setAttribute("aria-expanded","true")}hideAutocomplete(){this.autocompleteContainer.classList.remove("visible"),this.autocompleteContainer.setAttribute("aria-expanded","false"),this.selectedSuggestion=-1}isAutocompleteVisible(){return this.autocompleteContainer.classList.contains("visible")}triggerAutocomplete(){this.performAutocomplete()}addToHistory(e){this.history=this.history.slice(0,this.historyIndex+1),this.history.push(e),this.historyIndex=this.history.length-1,this.history.length>100&&(this.history.shift(),this.historyIndex--)}undo(){this.historyIndex>0&&(this.historyIndex--,this.setValue(this.history[this.historyIndex]))}redo(){this.historyIndex<this.history.length-1&&(this.historyIndex++,this.setValue(this.history[this.historyIndex]))}updateLineNumbers(){this.value.split(`
`).length,this.lineNumbers.innerHTML=k.sanitize(this.renderLineNumbers())}updateCursorPosition(){const e=this.editorInput.selectionStart,t=this.value.substring(0,e).split(`
`),a=t.length,i=t[t.length-1].length+1;this.shadowRoot.querySelector(".line-num").textContent=a,this.shadowRoot.querySelector(".col-num").textContent=i}updateStatus(){this.shadowRoot.querySelector(".char-count").textContent=this.value.length,this.updateCursorPosition()}updateValidationStatus(e,t){const a=this.shadowRoot.querySelector(".validation-status"),i=a.querySelector(".status-indicator");this.value.length===0?(i.className="status-indicator typing",a.lastChild.textContent=" Ready"):e?(i.className="status-indicator valid",a.lastChild.textContent=` Valid (${Math.round(t)}ms)`):(i.className="status-indicator invalid",a.lastChild.textContent=" Invalid syntax")}updateAutocompleteTime(){const e=this.shadowRoot.querySelector(".autocomplete-time"),t=e.querySelector(".time-value");this.lastAutocompleteTime>0?(t.textContent=this.lastAutocompleteTime,e.hidden=!1):e.hidden=!0}tokenizeForHighlight(e){const t=[],a=/(\w+)\s*\(|'[^']*'|"[^"]*"|\d+\.?\d*|[+\-*\/><=!]+|[(),:]/g;let i,o=0;for(;(i=a.exec(e))!==null;)i.index>o&&t.push({type:"text",value:e.substring(o,i.index)}),i[1]?(t.push({type:"function",value:i[1]}),t.push({type:"parenthesis",value:"("})):i[0].startsWith("'")||i[0].startsWith('"')?t.push({type:"string",value:i[0]}):/^\d/.test(i[0])?t.push({type:"number",value:i[0]}):/^[+\-*\/><=!]+$/.test(i[0])?t.push({type:"operator",value:i[0]}):/^[(),:]$/.test(i[0])&&t.push({type:"parenthesis",value:i[0]}),o=i.index+i[0].length;return o<e.length&&t.push({type:"text",value:e.substring(o)}),t}getTokenClass(e){return{function:"token-function",field:"token-field",number:"token-number",string:"token-string",operator:"token-operator",parenthesis:"token-parenthesis",keyword:"token-keyword",error:"token-error"}[e.type]||""}getIconForSuggestion(e){return e.type==="function"?'<path d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" />':e.type==="field"?'<path fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />':""}setupMobileEvents(){let e=window.innerHeight;window.addEventListener("resize",()=>{const t=window.innerHeight;t<e*.75?this.editorContainer.classList.add("keyboard-open"):this.editorContainer.classList.remove("keyboard-open"),e=t})}escapeHtml(e){const t={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"};return e.replace(/[&<>"']/g,a=>t[a])}escapeRegex(e){return e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}getValue(){return this.value}setValue(e){this.value=e,this.editorInput?(this.editorInput.value=e,this.updateLineNumbers(),this.updateStatus(),this.scheduleSyntaxHighlight()):this._pendingValue=e}focus(){this.editorInput&&this.editorInput.focus()}blur(){this.editorInput&&this.editorInput.blur()}setFieldSchema(e){this.fieldSchema=e}}customElements.get("enhanced-formula-editor")||customElements.define("enhanced-formula-editor",io);const so=500,Yt=3,qa={ready:"#666",typing:"#999",validating:"#2196F3",valid:"#4CAF50",error:"#f44336"},Va=[{name:"response_time",type:"number",aggregatable:!0},{name:"error_count",type:"number",aggregatable:!0},{name:"error_rate",type:"number",aggregatable:!0},{name:"request_count",type:"number",aggregatable:!0},{name:"bytes_sent",type:"number",aggregatable:!0},{name:"bytes_received",type:"number",aggregatable:!0},{name:"status_code",type:"number",aggregatable:!0},{name:"duration",type:"number",aggregatable:!0},{name:"user_count",type:"number",aggregatable:!0},{name:"session_count",type:"number",aggregatable:!0},{name:"page_views",type:"number",aggregatable:!0},{name:"conversion_rate",type:"number",aggregatable:!0},{name:"@timestamp",type:"date",aggregatable:!0},{name:"host.name",type:"keyword",aggregatable:!0},{name:"service.name",type:"keyword",aggregatable:!0},{name:"environment",type:"keyword",aggregatable:!0},{name:"status",type:"keyword",aggregatable:!0},{name:"method",type:"keyword",aggregatable:!0},{name:"path",type:"keyword",aggregatable:!0},{name:"user.id",type:"keyword",aggregatable:!0}];class oo{constructor(){this.editor=null,this.validationTimer=null,this.availableFields=new Map,this.isValidating=!1}async init(){try{if(console.log("🔧 Initializing formula editor integration..."),this.editor=document.getElementById("formulaEditor"),!this.editor){console.warn("Formula editor element not found");return}if(!this.editor.setValue&&this.editor.tagName!=="ENHANCED-FORMULA-EDITOR"){console.warn("Formula editor is not an enhanced-formula-editor element");return}await customElements.whenDefined("enhanced-formula-editor"),this.setupEventListeners(),await this.loadAvailableFields(),this.editor.setValue?this.editor.setValue('sum("response_time")'):console.warn("Editor does not have setValue method"),console.log("(✓)Formula editor initialized"),window.dispatchEvent(new CustomEvent("formula:initialized",{detail:{message:"Formula builder ready"}}))}catch(e){console.error("Failed to initialize formula editor:",e),this.updateStatus("Initialization failed","error"),window.dispatchEvent(new CustomEvent("formula:error",{detail:{message:e.message||"Formula builder initialization failed"}}))}}setupEventListeners(){this.editor&&(this.editor.addEventListener("input",()=>{this.scheduleValidation()}),this.editor.addEventListener("focus",async()=>{await this.loadAvailableFields()}))}scheduleValidation(){this.validationTimer&&clearTimeout(this.validationTimer),this.updateStatus("Typing...","typing"),this.validationTimer=setTimeout(()=>{this.validateFormula()},so)}async validateFormula(){if(this.isValidating||!this.editor)return;const e=this.editor.getValue().trim();if(!e){this.updateStatus("Ready to create formulas","ready");return}this.isValidating=!0,this.updateStatus("Validating...","validating");try{const t=await ie.validateFormula(e,{dataView:{fields:Array.from(this.availableFields.values())}});if(t.valid){const a=t.complexity?` (complexity: ${t.complexity})`:"";this.updateStatus(`(✓) Valid formula${a}`,"valid")}else{const a=t.errors?.[0]?.message||"Invalid formula";this.updateStatus(`(✗)${a}`,"error")}t.warnings?.length>0&&console.warn("Formula warnings:",t.warnings)}catch(t){console.error("Validation error:",t),this.updateStatus(`(✗)Validation error: ${t.message}`,"error")}finally{this.isValidating=!1}}async loadAvailableFields(){try{this.availableFields.clear(),Va.forEach(e=>{this.availableFields.set(e.name,e)}),this.editor?.setFieldSchema&&this.editor.setFieldSchema(this.availableFields),ie.updateFieldSchema(Va)}catch(e){console.error("Failed to load available fields:",e)}}updateStatus(e,t="ready"){const a=document.getElementById("formulaStatus");a&&(a.style.color=qa[t]||qa.ready,a.textContent=e)}async testFormula(){if(!this.editor)return;const e=this.editor.getValue().trim();if(!e){this.updateStatus("Enter a formula to test","error");return}const t=document.getElementById("formulaResults"),a=document.getElementById("formulaResultsContent"),i=document.getElementById("testFormulaBtn");if(!t||!a||!i){console.error("Required DOM elements not found");return}i.disabled=!0,i.innerHTML=k.sanitize('<span style="font-size: 14px;">⏳</span> Testing...');try{const o=await ie.validateFormula(e,{dataView:{fields:Array.from(this.availableFields.values())}});if(!o.valid)throw new Error(o.errors?.[0]?.message||"Invalid formula");const r=await ie.executeFormulaQuery(e,{timeRange:"now-1h",context:{dataView:{fields:Array.from(this.availableFields.values())}}});if(r.success)t.style.display="block",a.innerHTML=k.sanitize(this.formatTestResults(r)),this.updateStatus("(✓) Test successful","valid");else throw new Error(r.error||"Test failed")}catch(o){t.style.display="block",a.innerHTML=k.sanitize(`<strong style="color: #f44336;">Error:</strong> ${this.escapeHtml(o.message)}`),this.updateStatus(`(✗)Test failed: ${o.message}`,"error")}finally{i.disabled=!1,i.innerHTML=k.sanitize('<span style="font-size: 14px;">🧪</span> Test Formula')}}formatTestResults(e){let t="<strong>Test Results:</strong><br>";return e.data?.length>0?(t+=`Found ${e.data.length} results:<br>`,e.data.slice(0,Yt).forEach((a,i)=>{const o=typeof a.value=="object"?JSON.stringify(a.value):a.value;t+=`${i+1}. ${this.escapeHtml(a.name||a.id)}: ${this.escapeHtml(o)}<br>`}),e.data.length>Yt&&(t+=`... and ${e.data.length-Yt} more`)):t+="No results returned",e.stats&&(t+="<br><strong>Stats:</strong><br>",t+=`Total: ${e.stats.total}, `,t+=`Critical: ${e.stats.critical}, `,t+=`Warning: ${e.stats.warning}`),t}escapeHtml(e){const t=document.createElement("div");return t.textContent=String(e),t.innerHTML}}const At=new oo;window.formulaEditorIntegration=At;window.testFormula=()=>At.testFormula();document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>At.init()):At.init();const vt={FORMULA_CHANGE:"formula-change",VALIDATION_COMPLETE:"validation-complete",PREVIEW_UPDATE:"preview-update",FUNCTION_DROPPED:"function-dropped",TEMPLATE_SELECTED:"template-selected"};class ro extends HTMLElement{constructor(){super(),this.attachShadow({mode:"open"}),this.parser=new rt,this.validator=new _t,this.formula="",this.ast=null,this.validationResult=null,this.userLevel="beginner",this.selectedCategory="all",this.draggedFunction=null,this.lastValidationTime=0,this.validationDebounceTimer=null,this.announcer=null}connectedCallback(){this.render(),this.setupEventListeners(),this.initializeDragDrop(),this.setupAccessibility(),this.loadUserPreferences()}render(){this.shadowRoot.innerHTML=k.sanitize(`
      <style>
        :host {
          --primary-color: #2563eb;
          --secondary-color: #64748b;
          --success-color: #10b981;
          --error-color: #ef4444;
          --warning-color: #f59e0b;
          --bg-primary: #ffffff;
          --bg-secondary: #f8fafc;
          --bg-tertiary: #f1f5f9;
          --text-primary: #1e293b;
          --text-secondary: #64748b;
          --border-color: #e2e8f0;
          --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
          --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
          --radius: 0.375rem;
          --transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

          display: block;
          width: 100%;
          height: 100%;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: var(--text-primary);
        }

        .builder-container {
          display: grid;
          grid-template-columns: 280px 1fr 320px;
          grid-template-rows: auto 1fr;
          gap: 1rem;
          height: 100%;
          padding: 1rem;
          background: var(--bg-secondary);
        }

        @media (max-width: 1024px) {
          .builder-container {
            grid-template-columns: 1fr;
            grid-template-rows: auto auto 1fr auto;
          }

          .function-palette {
            order: 2;
            max-height: 200px;
          }

          .canvas-area {
            order: 3;
          }

          .preview-panel {
            order: 4;
          }
        }

        .header {
          grid-column: 1 / -1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          background: var(--bg-primary);
          border-radius: var(--radius);
          box-shadow: var(--shadow-sm);
        }

        .title {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .user-level-toggle {
          display: flex;
          gap: 0.5rem;
          background: var(--bg-secondary);
          padding: 0.25rem;
          border-radius: var(--radius);
        }

        .level-button {
          padding: 0.5rem 1rem;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          font-size: 0.875rem;
          border-radius: calc(var(--radius) - 2px);
          cursor: pointer;
          transition: var(--transition);
        }

        .level-button:hover {
          background: var(--bg-tertiary);
        }

        .level-button.active {
          background: var(--bg-primary);
          color: var(--primary-color);
          font-weight: 500;
          box-shadow: var(--shadow-sm);
        }

        /* Function Palette */
        .function-palette {
          background: var(--bg-primary);
          border-radius: var(--radius);
          box-shadow: var(--shadow-sm);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .palette-header {
          padding: 1rem;
          border-bottom: 1px solid var(--border-color);
        }

        .search-box {
          position: relative;
        }

        .search-input {
          width: 100%;
          padding: 0.5rem 2.5rem 0.5rem 1rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius);
          font-size: 0.875rem;
          transition: var(--transition);
        }

        .search-input:focus {
          outline: none;
          border-color: var(--primary-color);
          box-shadow: 0 0 0 3px rgb(37 99 235 / 0.1);
        }

        .search-icon {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          width: 1rem;
          height: 1rem;
          color: var(--text-secondary);
        }

        .category-tabs {
          display: flex;
          gap: 0.25rem;
          padding: 0.5rem;
          border-bottom: 1px solid var(--border-color);
          overflow-x: auto;
          scrollbar-width: thin;
        }

        .category-tab {
          padding: 0.375rem 0.75rem;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          font-size: 0.813rem;
          border-radius: var(--radius);
          cursor: pointer;
          white-space: nowrap;
          transition: var(--transition);
        }

        .category-tab:hover {
          background: var(--bg-secondary);
        }

        .category-tab.active {
          background: var(--primary-color);
          color: white;
        }

        .function-list {
          flex: 1;
          overflow-y: auto;
          padding: 0.5rem;
        }

        .function-group {
          margin-bottom: 1rem;
        }

        .function-group-title {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--text-secondary);
          padding: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .function-item {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius);
          padding: 0.75rem;
          margin: 0.25rem 0;
          cursor: move;
          transition: var(--transition);
          user-select: none;
        }

        .function-item:hover {
          background: var(--bg-tertiary);
          border-color: var(--primary-color);
          transform: translateX(2px);
        }

        .function-item.dragging {
          opacity: 0.5;
          cursor: grabbing;
        }

        .function-name {
          font-weight: 500;
          font-size: 0.875rem;
          color: var(--text-primary);
          font-family: 'Monaco', 'Consolas', monospace;
        }

        .function-description {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-top: 0.25rem;
        }

        /* Canvas Area */
        .canvas-area {
          background: var(--bg-primary);
          border-radius: var(--radius);
          box-shadow: var(--shadow-sm);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .canvas-toolbar {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--border-color);
        }

        .toolbar-button {
          padding: 0.5rem;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          border-radius: var(--radius);
          cursor: pointer;
          transition: var(--transition);
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }

        .toolbar-button:hover {
          background: var(--bg-secondary);
          color: var(--text-primary);
        }

        .toolbar-divider {
          width: 1px;
          height: 1.5rem;
          background: var(--border-color);
          margin: 0 0.5rem;
        }

        .formula-canvas {
          flex: 1;
          padding: 1.5rem;
          overflow-y: auto;
          position: relative;
          min-height: 300px;
        }

        .drop-zone {
          min-height: 80px;
          border: 2px dashed var(--border-color);
          border-radius: var(--radius);
          padding: 1rem;
          transition: var(--transition);
          position: relative;
          background: var(--bg-secondary);
        }

        .drop-zone.drag-over {
          border-color: var(--primary-color);
          background: rgb(37 99 235 / 0.05);
        }

        .drop-zone-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          font-size: 0.875rem;
          pointer-events: none;
        }

        .formula-node {
          display: inline-flex;
          align-items: center;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius);
          padding: 0.5rem;
          margin: 0.25rem;
          position: relative;
          transition: var(--transition);
        }

        .formula-node.function {
          background: var(--primary-color);
          color: white;
          border-color: var(--primary-color);
        }

        .formula-node.operator {
          background: var(--secondary-color);
          color: white;
          padding: 0.375rem 0.75rem;
          font-weight: 600;
        }

        .formula-node.field {
          background: var(--success-color);
          color: white;
          border-color: var(--success-color);
        }

        .formula-node.literal {
          background: var(--warning-color);
          color: white;
          border-color: var(--warning-color);
        }

        .formula-node.error {
          background: var(--error-color);
          color: white;
          border-color: var(--error-color);
        }

        .node-content {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .node-name {
          font-family: 'Monaco', 'Consolas', monospace;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .node-args {
          display: flex;
          gap: 0.375rem;
          align-items: center;
        }

        .arg-input {
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: calc(var(--radius) - 2px);
          padding: 0.25rem 0.5rem;
          font-size: 0.813rem;
          color: white;
          min-width: 60px;
          transition: var(--transition);
        }

        .arg-input:focus {
          outline: none;
          background: rgba(255, 255, 255, 0.3);
          border-color: rgba(255, 255, 255, 0.5);
        }

        .arg-input::placeholder {
          color: rgba(255, 255, 255, 0.7);
        }

        .node-remove {
          position: absolute;
          top: -0.5rem;
          right: -0.5rem;
          width: 1.25rem;
          height: 1.25rem;
          background: var(--error-color);
          color: white;
          border: none;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0;
          transition: var(--transition);
        }

        .formula-node:hover .node-remove {
          opacity: 1;
        }

        /* Preview Panel */
        .preview-panel {
          background: var(--bg-primary);
          border-radius: var(--radius);
          box-shadow: var(--shadow-sm);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .preview-tabs {
          display: flex;
          border-bottom: 1px solid var(--border-color);
        }

        .preview-tab {
          flex: 1;
          padding: 0.75rem;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          font-size: 0.875rem;
          cursor: pointer;
          transition: var(--transition);
          position: relative;
        }

        .preview-tab:hover {
          background: var(--bg-secondary);
        }

        .preview-tab.active {
          color: var(--primary-color);
          font-weight: 500;
        }

        .preview-tab.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--primary-color);
        }

        .preview-content {
          flex: 1;
          padding: 1rem;
          overflow-y: auto;
        }

        .formula-text {
          font-family: 'Monaco', 'Consolas', monospace;
          font-size: 0.875rem;
          line-height: 1.5;
          padding: 1rem;
          background: var(--bg-secondary);
          border-radius: var(--radius);
          white-space: pre-wrap;
          word-break: break-all;
        }

        .validation-messages {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .validation-message {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          padding: 0.75rem;
          border-radius: var(--radius);
          font-size: 0.813rem;
        }

        .validation-message.error {
          background: rgb(239 68 68 / 0.1);
          color: var(--error-color);
        }

        .validation-message.warning {
          background: rgb(245 158 11 / 0.1);
          color: var(--warning-color);
        }

        .validation-message.info {
          background: rgb(37 99 235 / 0.1);
          color: var(--primary-color);
        }

        .validation-icon {
          width: 1rem;
          height: 1rem;
          flex-shrink: 0;
          margin-top: 0.125rem;
        }

        .query-preview {
          font-family: 'Monaco', 'Consolas', monospace;
          font-size: 0.75rem;
          line-height: 1.5;
          padding: 1rem;
          background: #1e293b;
          color: #e2e8f0;
          border-radius: var(--radius);
          overflow-x: auto;
        }

        .performance-stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-color);
        }

        .stat-item {
          display: flex;
          flex-direction: column;
        }

        .stat-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .stat-value {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        /* Templates */
        .templates-section {
          padding: 1rem;
          border-top: 1px solid var(--border-color);
        }

        .templates-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 0.75rem;
        }

        .template-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .template-item {
          padding: 0.75rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius);
          cursor: pointer;
          transition: var(--transition);
        }

        .template-item:hover {
          background: var(--bg-tertiary);
          border-color: var(--primary-color);
        }

        .template-name {
          font-size: 0.813rem;
          font-weight: 500;
          color: var(--text-primary);
        }

        .template-description {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-top: 0.25rem;
        }

        /* Accessibility */
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border-width: 0;
        }

        /* Focus styles */
        *:focus-visible {
          outline: 2px solid var(--primary-color);
          outline-offset: 2px;
        }

        /* Loading states */
        .loading {
          position: relative;
          overflow: hidden;
        }

        .loading::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.4),
            transparent
          );
          animation: shimmer 1.5s infinite;
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        /* Mobile adjustments */
        @media (max-width: 640px) {
          .builder-container {
            padding: 0.5rem;
            gap: 0.5rem;
          }

          .function-item {
            font-size: 0.813rem;
          }

          .formula-canvas {
            padding: 1rem;
          }
        }
      </style>

      <div class="builder-container">
        <header class="header">
          <h2 class="title">Formula Builder</h2>
          <div class="user-level-toggle" role="tablist">
            <button class="level-button ${this.userLevel==="beginner"?"active":""}"
                    data-level="beginner" role="tab" aria-selected="${this.userLevel==="beginner"}">
              Beginner
            </button>
            <button class="level-button ${this.userLevel==="intermediate"?"active":""}"
                    data-level="intermediate" role="tab" aria-selected="${this.userLevel==="intermediate"}">
              Intermediate
            </button>
            <button class="level-button ${this.userLevel==="advanced"?"active":""}"
                    data-level="advanced" role="tab" aria-selected="${this.userLevel==="advanced"}">
              Advanced
            </button>
          </div>
        </header>

        <aside class="function-palette">
          <div class="palette-header">
            <div class="search-box">
              <input type="search"
                     class="search-input gd-input"
                     placeholder="Search functions..."
                     aria-label="Search functions">
              <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
          </div>

          <div class="category-tabs" role="tablist">
            <button class="category-tab ${this.selectedCategory==="all"?"active":""}"
                    data-category="all" role="tab">
              All
            </button>
            ${Object.entries(Ze).map(([e,t])=>`
              <button class="category-tab ${this.selectedCategory===e?"active":""}"
                      data-category="${e}" role="tab">
                ${t.name}
              </button>
            `).join("")}
            <button class="category-tab ${this.selectedCategory==="templates"?"active":""}"
                    data-category="templates" role="tab">
              Templates
            </button>
          </div>

          <div class="function-list" role="list">
            ${this.renderFunctionList()}
          </div>

          ${this.userLevel!=="beginner"?`
            <div class="templates-section">
              <h3 class="templates-title">Common Patterns</h3>
              <div class="template-list">
                ${this.renderTemplates()}
              </div>
            </div>
          `:""}
        </aside>

        <main class="canvas-area">
          <div class="canvas-toolbar">
            <button class="toolbar-button" data-action="undo" aria-label="Undo">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path>
              </svg>
              <span>Undo</span>
            </button>
            <button class="toolbar-button" data-action="redo" aria-label="Redo">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6"></path>
              </svg>
              <span>Redo</span>
            </button>
            <div class="toolbar-divider"></div>
            <button class="toolbar-button" data-action="clear" aria-label="Clear formula">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
              <span>Clear</span>
            </button>
            <button class="toolbar-button" data-action="copy" aria-label="Copy formula">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
              </svg>
              <span>Copy</span>
            </button>
          </div>

          <div class="formula-canvas">
            <div class="drop-zone main-drop" data-accepts="all">
              <div class="drop-zone-placeholder">
                Drag functions here to build your formula
              </div>
            </div>
          </div>
        </main>

        <aside class="preview-panel">
          <div class="preview-tabs" role="tablist">
            <button class="preview-tab active" data-tab="formula" role="tab">Formula</button>
            <button class="preview-tab" data-tab="validation" role="tab">Validation</button>
            <button class="preview-tab" data-tab="query" role="tab">ES Query</button>
          </div>

          <div class="preview-content">
            <div data-panel="formula" class="preview-pane active">
              <div class="formula-text">${this.formula||"No formula yet"}</div>
              <div class="performance-stats">
                <div class="stat-item">
                  <span class="stat-label">Parse Time</span>
                  <span class="stat-value">-</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Validation Time</span>
                  <span class="stat-value">${this.lastValidationTime||"-"}ms</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Complexity</span>
                  <span class="stat-value">-</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Functions</span>
                  <span class="stat-value">-</span>
                </div>
              </div>
            </div>

            <div data-panel="validation" class="preview-pane" hidden>
              <div class="validation-messages">
                ${this.renderValidationMessages()}
              </div>
            </div>

            <div data-panel="query" class="preview-pane" hidden>
              <div class="query-preview">
                ${this.renderQueryPreview()}
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>
    `),this.announcer=this.shadowRoot.querySelector('[role="status"]')}renderFunctionList(){const e=this.getFilteredFunctions(),t=this.groupFunctionsByCategory(e);return Object.entries(t).map(([a,i])=>`
      <div class="function-group">
        <div class="function-group-title">
          ${Ze[a]?.name||a}
        </div>
        ${i.map(o=>`
          <div class="function-item"
               draggable="true"
               data-function="${o}"
               data-category="${a}"
               role="listitem"
               tabindex="0">
            <div class="function-name">${o}()</div>
            <div class="function-description">
              ${Re[o]?.description||""}
            </div>
          </div>
        `).join("")}
      </div>
    `).join("")}renderTemplates(){const e=this.getTemplatesForLevel();return Object.entries(e).map(([t,a])=>`
      <div class="template-item" data-template="${t}">
        <div class="template-name">${t}</div>
        <div class="template-description">${a.description}</div>
      </div>
    `).join("")}renderValidationMessages(){return!this.validationResult||!this.validationResult.results?'<p class="validation-message info">No validation results yet</p>':this.validationResult.results.length===0?`
        <div class="validation-message info">
          <svg class="validation-icon" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
          </svg>
          <span>Formula is valid!</span>
        </div>
      `:this.validationResult.results.map(e=>`
      <div class="validation-message ${e.severity}">
        <svg class="validation-icon" fill="currentColor" viewBox="0 0 20 20">
          ${e.severity==="error"?`
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
          `:e.severity==="warning"?`
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
          `:`
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
          `}
        </svg>
        <span>${e.message}</span>
      </div>
    `).join("")}renderQueryPreview(){return"Query preview will be shown here"}setupEventListeners(){this.shadowRoot.querySelectorAll(".level-button").forEach(t=>{t.addEventListener("click",a=>{this.userLevel=a.target.dataset.level,this.updateUserLevel()})}),this.shadowRoot.querySelectorAll(".category-tab").forEach(t=>{t.addEventListener("click",a=>{this.selectedCategory=a.target.dataset.category,this.updateCategoryFilter()})}),this.shadowRoot.querySelector(".search-input").addEventListener("input",t=>{this.filterFunctions(t.target.value)}),this.shadowRoot.querySelectorAll(".toolbar-button").forEach(t=>{t.addEventListener("click",a=>{const i=a.currentTarget.dataset.action;this.handleToolbarAction(i)})}),this.shadowRoot.querySelectorAll(".preview-tab").forEach(t=>{t.addEventListener("click",a=>{this.switchPreviewTab(a.target.dataset.tab)})}),this.shadowRoot.addEventListener("click",t=>{if(t.target.closest(".template-item")){const a=t.target.closest(".template-item").dataset.template;this.applyTemplate(a)}})}initializeDragDrop(){this.shadowRoot.querySelectorAll(".function-item").forEach(t=>{t.addEventListener("dragstart",a=>{a.dataTransfer.effectAllowed="copy",a.dataTransfer.setData("function",a.currentTarget.dataset.function),this.draggedFunction=a.currentTarget.dataset.function,a.currentTarget.classList.add("dragging")}),t.addEventListener("dragend",a=>{a.currentTarget.classList.remove("dragging"),this.draggedFunction=null}),t.addEventListener("keydown",a=>{(a.key==="Enter"||a.key===" ")&&(a.preventDefault(),this.insertFunction(a.currentTarget.dataset.function))})});const e=this.shadowRoot.querySelector(".drop-zone");e.addEventListener("dragover",t=>{t.preventDefault(),t.dataTransfer.dropEffect="copy",e.classList.add("drag-over")}),e.addEventListener("dragleave",t=>{e.contains(t.relatedTarget)||e.classList.remove("drag-over")}),e.addEventListener("drop",t=>{t.preventDefault(),e.classList.remove("drag-over");const a=t.dataTransfer.getData("function");a&&this.handleDrop(a,t.target)})}setupAccessibility(){this.shadowRoot.addEventListener("formula-change",()=>{this.announce(`Formula updated: ${this.formula}`)}),this.shadowRoot.addEventListener("validation-complete",()=>{const e=this.validationResult?.results?.filter(t=>t.severity==="error").length||0;e>0?this.announce(`Validation found ${e} error${e!==1?"s":""}`):this.announce("Formula is valid")})}getFilteredFunctions(){return this.selectedCategory==="all"?this.getAllFunctions():this.selectedCategory==="templates"?[]:Ze[this.selectedCategory]?.functions||[]}getAllFunctions(){const e=[];for(const t of Object.values(Ze))e.push(...t.functions);return e}groupFunctionsByCategory(e){const t={};for(const a of e)for(const[i,o]of Object.entries(Ze))if(o.functions.includes(a)){t[i]||(t[i]=[]),t[i].push(a);break}return t}getTemplatesForLevel(){const e=_e;return this.userLevel==="beginner"?Object.fromEntries(Object.entries(e).filter(([t,a])=>a.category==="metrics").slice(0,3)):this.userLevel==="intermediate"?Object.fromEntries(Object.entries(e).filter(([t,a])=>["metrics","timeseries"].includes(a.category)).slice(0,6)):e}handleDrop(e,t){const a=this.createFormulaNode(e),i=t.querySelector(".drop-zone-placeholder");i&&i.remove(),t.appendChild(a),this.updateFormula(),this.dispatchEvent(new CustomEvent(vt.FUNCTION_DROPPED,{detail:{function:e}}))}createFormulaNode(e){const t=document.createElement("div");t.className="formula-node function",t.dataset.function=e,Re[e];const a=this.getFunctionSignature(e);return t.innerHTML=k.sanitize(`
      <div class="node-content">
        <span class="node-name">${e}</span>
        <span class="node-args">
          (${this.createArgumentInputs(a)})
        </span>
      </div>
      <button class="node-remove" aria-label="Remove ${e}">×</button>
    `),t.querySelector(".node-remove").addEventListener("click",()=>{t.remove(),this.updateFormula()}),t.querySelectorAll(".arg-input").forEach(i=>{i.addEventListener("input",()=>{this.updateFormula()})}),t}createArgumentInputs(e){return!e||!e.args?"":e.args.map((t,a)=>`<input type="text"
                     class="arg-input"
                     placeholder="${t.optional?`${t.name} (optional)`:t.name}"
                     data-arg-index="${a}"
                     data-arg-name="${t.name}">`).join(", ")}getFunctionSignature(e){return{args:[{name:"field",type:"string"}]}}updateFormula(){const t=this.shadowRoot.querySelector(".drop-zone").querySelectorAll(".formula-node"),a=[];t.forEach(i=>{if(i.dataset.function){const o=i.dataset.function,r=Array.from(i.querySelectorAll(".arg-input")).map(n=>n.value||"").filter(n=>n.length>0);a.push(`${o}(${r.join(", ")})`)}}),this.formula=a.join(" "),this.updatePreview(),this.validateFormula(),this.dispatchEvent(new CustomEvent(vt.FORMULA_CHANGE,{detail:{formula:this.formula}}))}async validateFormula(){if(!this.formula){this.validationResult=null;return}this.validationDebounceTimer&&clearTimeout(this.validationDebounceTimer),this.validationDebounceTimer=setTimeout(async()=>{const e=performance.now();try{const t=this.parser.parse(this.formula);t.success?(this.validationResult=await this.validator.validate(t.ast),this.lastValidationTime=Math.round(performance.now()-e),this.updateValidationDisplay(),this.dispatchEvent(new CustomEvent(vt.VALIDATION_COMPLETE,{detail:this.validationResult}))):(this.validationResult={valid:!1,results:t.errors.map(a=>({severity:"error",message:a.message,position:a.position}))},this.updateValidationDisplay())}catch(t){console.error("Validation error:",t),this.validationResult={valid:!1,results:[{severity:"error",message:`Validation error: ${t.message}`,position:0}]},this.updateValidationDisplay()}},300)}updatePreview(){const e=this.shadowRoot.querySelector(".formula-text");e.textContent=this.formula||"No formula yet"}updateValidationDisplay(){const t=this.shadowRoot.querySelector('[data-panel="validation"]').querySelector(".validation-messages");t.innerHTML=k.sanitize(this.renderValidationMessages());const a=this.shadowRoot.querySelector(".stat-value:nth-of-type(2)");a.textContent=`${this.lastValidationTime}ms`}handleToolbarAction(e){switch(e){case"undo":this.announce("Undo not yet implemented");break;case"redo":this.announce("Redo not yet implemented");break;case"clear":this.clearFormula();break;case"copy":this.copyFormula();break}}clearFormula(){const e=this.shadowRoot.querySelector(".drop-zone");e.innerHTML=k.sanitize(`
      <div class="drop-zone-placeholder">
        Drag functions here to build your formula
      </div>
    `),this.formula="",this.updatePreview(),this.validationResult=null,this.updateValidationDisplay(),this.announce("Formula cleared")}copyFormula(){if(!this.formula){this.announce("No formula to copy");return}navigator.clipboard.writeText(this.formula).then(()=>{this.announce("Formula copied to clipboard")}).catch(e=>{console.error("Failed to copy:",e),this.announce("Failed to copy formula")})}switchPreviewTab(e){this.shadowRoot.querySelectorAll(".preview-tab").forEach(t=>{t.classList.toggle("active",t.dataset.tab===e),t.setAttribute("aria-selected",t.dataset.tab===e)}),this.shadowRoot.querySelectorAll(".preview-pane").forEach(t=>{t.hidden=t.dataset.panel!==e})}updateUserLevel(){this.shadowRoot.querySelectorAll(".level-button").forEach(e=>{e.classList.toggle("active",e.dataset.level===this.userLevel),e.setAttribute("aria-selected",e.dataset.level===this.userLevel)}),this.render(),this.setupEventListeners(),this.initializeDragDrop(),localStorage.setItem("formula-builder-level",this.userLevel)}updateCategoryFilter(){this.shadowRoot.querySelectorAll(".category-tab").forEach(t=>{t.classList.toggle("active",t.dataset.category===this.selectedCategory)});const e=this.shadowRoot.querySelector(".function-list");e.innerHTML=k.sanitize(this.renderFunctionList()),this.initializeDragDrop()}filterFunctions(e){const t=this.shadowRoot.querySelectorAll(".function-item"),a=e.toLowerCase();t.forEach(i=>{const o=i.querySelector(".function-name").textContent.toLowerCase(),r=i.querySelector(".function-description").textContent.toLowerCase(),n=o.includes(a)||r.includes(a);i.style.display=n?"":"none"}),this.shadowRoot.querySelectorAll(".function-group").forEach(i=>{const o=Array.from(i.querySelectorAll(".function-item")).some(r=>r.style.display!=="none");i.style.display=o?"":"none"})}insertFunction(e){this.handleDrop(e,this.shadowRoot.querySelector(".drop-zone"))}applyTemplate(e){const t=_e[e];if(!t)return;this.clearFormula(),this.formula=t.formula;const a=this.shadowRoot.querySelector(".drop-zone");a.innerHTML=k.sanitize(`<div class="formula-text">${t.formula}</div>`),this.updatePreview(),this.validateFormula(),this.dispatchEvent(new CustomEvent(vt.TEMPLATE_SELECTED,{detail:{template:e,formula:t.formula}})),this.announce(`Applied template: ${e}`)}loadUserPreferences(){const e=localStorage.getItem("formula-builder-level");e&&["beginner","intermediate","advanced"].includes(e)&&(this.userLevel=e)}announce(e){this.announcer&&(this.announcer.textContent=e,setTimeout(()=>{this.announcer.textContent=""},1e3))}addCustomFields(e){if(this.customFields=e||[],e.forEach(t=>{Re[t.name]||(Re[t.name]={category:"fields",description:t.description||`Field: ${t.name}`,examples:[`${t.name}`],icon:"field"})}),this.shadowRoot){const t=this.shadowRoot.querySelector(".function-list");t&&(t.innerHTML=k.sanitize(this.renderFunctionList()),this.initializeDragDrop())}}addTemplates(e){if(e.forEach(t=>{_e[t.name]||(_e[t.name]={formula:t.formula,description:t.description,category:"rad-monitoring"})}),this.selectedCategory==="templates"&&this.shadowRoot){const t=this.shadowRoot.querySelector(".function-list");t&&(t.innerHTML=k.sanitize(this.renderTemplates()))}}get formula(){return this._formula||""}set formula(e){this._formula=e}}customElements.define("enhanced-formula-builder",ro);const ae={createButton(s={}){const{text:e="",variant:t="primary",size:a="medium",disabled:i=!1,loading:o=!1,onClick:r=()=>{},className:n="",icon:m=null}=s,h=document.createElement("button");return h.className=`ux-button ux-button--${t} ux-button--${a} ${n}`,h.disabled=i||o,o?(h.classList.add("ux-button--loading"),h.innerHTML=k.sanitize('<span class="ux-spinner ux-spinner--small"></span>')):(h.textContent=e,m&&(h.innerHTML=k.sanitize(`<span class="ux-icon ux-icon--${m}"></span> ${e}`))),h.addEventListener("click",r),h},createCard(s={}){const{title:e="",content:t="",footer:a=null,variant:i="default",padding:o="medium",className:r=""}=s,n=document.createElement("div");if(n.className=`ux-card ux-card--${i} ux-card--padding-${o} ${r}`,e){const h=document.createElement("div");h.className="ux-card__header",h.innerHTML=k.sanitize(`<h3 class="ux-text ux-text--heading-3">${e}</h3>`),n.appendChild(h)}const m=document.createElement("div");if(m.className="ux-card__body",typeof t=="string"?m.innerHTML=k.sanitize(t):m.appendChild(t),n.appendChild(m),a){const h=document.createElement("div");h.className="ux-card__footer",typeof a=="string"?h.innerHTML=k.sanitize(a):h.appendChild(a),n.appendChild(h)}return n},createModal(s={}){const{title:e="",content:t="",size:a="medium",closable:i=!0,footer:o=null,onClose:r=()=>{},className:n=""}=s,m=`ux-modal-${Date.now()}`,h=document.createElement("div");h.id=m,h.className=`ux-modal ${n}`;const b=document.createElement("div");b.className="ux-modal__backdrop";const w=document.createElement("div");w.className=`ux-modal__dialog ux-modal__dialog--${a}`;const T=document.createElement("div");if(T.className="ux-modal__content",e){const O=document.createElement("div");O.className="ux-modal__header",O.innerHTML=k.sanitize(`
        <h2 class="ux-text ux-text--heading-2">${e}</h2>
        ${i?'<button class="ux-modal__close ux-button ux-button--tertiary ux-button--small"><span class="ux-icon ux-icon--close"></span></button>':""}
      `),T.appendChild(O),i&&O.querySelector(".ux-modal__close").addEventListener("click",()=>{_.close()})}const R=document.createElement("div");if(R.className="ux-modal__body",typeof t=="string"?R.innerHTML=k.sanitize(t):R.appendChild(t),T.appendChild(R),o){const O=document.createElement("div");O.className="ux-modal__footer",typeof o=="string"?O.innerHTML=k.sanitize(o):O.appendChild(o),T.appendChild(O)}w.appendChild(T),h.appendChild(b),h.appendChild(w);const _={open(){document.body.appendChild(h),document.body.classList.add("ux-modal-open"),de().showModal(m);const O=h.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');O.length&&O[0].focus()},close(){h.remove(),document.body.classList.remove("ux-modal-open"),de().hideModal(),r()},setContent(O){typeof O=="string"?R.innerHTML=k.sanitize(O):(R.innerHTML="",R.appendChild(O))}};return b.addEventListener("click",()=>{i&&_.close()}),h.addEventListener("keydown",O=>{O.key==="Escape"&&i&&_.close()}),_},createSpinner(s={}){const{size:e="medium",text:t="",className:a=""}=s,i=document.createElement("div");i.className=`ux-spinner-container ${a}`;const o=document.createElement("div");if(o.className=`ux-spinner ux-spinner--${e}`,i.appendChild(o),t){const r=document.createElement("div");r.className="ux-spinner__label ux-text ux-text--body-2",r.textContent=t,i.appendChild(r)}return i},createAlert(s={}){const{message:e="",type:t="info",dismissible:a=!0,onDismiss:i=()=>{},className:o=""}=s,r=document.createElement("div");r.className=`ux-alert ux-alert--${t} ${o}`;const n=document.createElement("span");n.className=`ux-icon ux-icon--${t}`,r.appendChild(n);const m=document.createElement("div");if(m.className="ux-alert__content",m.innerHTML=k.sanitize(e),r.appendChild(m),a){const h=document.createElement("button");h.className="ux-alert__close ux-button ux-button--tertiary ux-button--small",h.innerHTML=k.sanitize('<span class="ux-icon ux-icon--close"></span>'),h.addEventListener("click",()=>{r.remove(),i()}),r.appendChild(h)}return r},createChip(s={}){const{text:e="",variant:t="default",size:a="medium",dismissible:i=!1,onDismiss:o=()=>{},className:r=""}=s,n=document.createElement("span");n.className=`ux-chip ux-chip--${t} ux-chip--${a} ${r}`;const m=document.createElement("span");if(m.className="ux-chip__label",m.textContent=e,n.appendChild(m),i){const h=document.createElement("button");h.className="ux-chip__close",h.innerHTML=k.sanitize('<span class="ux-icon ux-icon--close-small"></span>'),h.addEventListener("click",()=>{n.remove(),o()}),n.appendChild(h)}return n},showGrowl(s={}){const{message:e="",type:t="info",duration:a=3e3,position:i="top-right"}=s;de().showGrowl(e,t,a);let o=document.getElementById("ux-growl-container");o||(o=document.createElement("div"),o.id="ux-growl-container",o.className=`ux-growl-container ux-growl-container--${i}`,document.body.appendChild(o));const r=this.createAlert({message:e,type:t,dismissible:!0,className:"ux-growl"});o.appendChild(r),a>0&&setTimeout(()=>{r.remove()},a)},createTooltip(s,e={}){const{content:t="",position:a="top",trigger:i="hover",delay:o=200}=e,r=document.createElement("div");r.className=`ux-tooltip ux-tooltip--${a}`,r.innerHTML=k.sanitize(t);let n,m;const h=()=>{clearTimeout(m),n=setTimeout(()=>{document.body.appendChild(r);const w=s.getBoundingClientRect(),T=r.getBoundingClientRect();let R,_;switch(a){case"top":R=w.top-T.height-8,_=w.left+(w.width-T.width)/2;break;case"bottom":R=w.bottom+8,_=w.left+(w.width-T.width)/2;break;case"left":R=w.top+(w.height-T.height)/2,_=w.left-T.width-8;break;case"right":R=w.top+(w.height-T.height)/2,_=w.right+8;break}r.style.top=`${R}px`,r.style.left=`${_}px`,r.classList.add("ux-tooltip--visible")},o)},b=()=>{clearTimeout(n),m=setTimeout(()=>{r.classList.remove("ux-tooltip--visible"),setTimeout(()=>r.remove(),200)},100)};return i==="hover"?(s.addEventListener("mouseenter",h),s.addEventListener("mouseleave",b),r.addEventListener("mouseenter",()=>clearTimeout(m)),r.addEventListener("mouseleave",b)):i==="click"?(s.addEventListener("click",w=>{w.stopPropagation(),r.classList.contains("ux-tooltip--visible")?b():h()}),document.addEventListener("click",b)):i==="focus"&&(s.addEventListener("focus",h),s.addEventListener("blur",b)),{show:h,hide:b,destroy:()=>{b(),s.removeEventListener("mouseenter",h),s.removeEventListener("mouseleave",b),s.removeEventListener("click",h),s.removeEventListener("focus",h),s.removeEventListener("blur",b)}}},createBox(s={}){const{padding:e=null,margin:t=null,display:a="block",children:i=null,className:o=""}=s,r=document.createElement("div");return r.className=`ux-box ${o}`,e&&r.classList.add(`ux-box--padding-${e}`),t&&r.classList.add(`ux-box--margin-${t}`),a!=="block"&&r.classList.add(`ux-box--display-${a}`),i&&(Array.isArray(i)?i.forEach(n=>{typeof n=="string"?r.innerHTML=k.sanitize(r.innerHTML+n):r.appendChild(n)}):typeof i=="string"?r.innerHTML=k.sanitize(i):r.appendChild(i)),r},createTextLockup(s={}){const{texts:e=[],spacing:t="tight",className:a=""}=s,i=document.createElement("div");return i.className=`ux-text-lockup ux-text-lockup--spacing-${t} ${a}`,e.forEach(o=>{const{text:r="",variant:n="body-1",tag:m=null}=o,h=document.createElement(m||this._getDefaultTagForVariant(n));h.className=`ux-text ux-text--${n}`,h.textContent=r,i.appendChild(h)}),i},_getDefaultTagForVariant(s){return{"heading-1":"h1","heading-2":"h2","heading-3":"h3","heading-4":"h4","heading-5":"h5","heading-6":"h6","body-1":"p","body-2":"p",caption:"span",label:"label"}[s]||"span"}};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>{console.log("✨ UX Components ready")}):console.log("✨ UX Components ready");window.UXComponents=ae;const no=[{name:"event_id",type:"string",description:"Traffic event identifier"},{name:"rad_type",type:"string",description:"RAD type classification"},{name:"count",type:"number",description:"Event count"},{name:"unique_users",type:"number",description:"Unique user count"},{name:"response_time",type:"number",description:"Average response time"},{name:"error_count",type:"number",description:"Number of errors"},{name:"timestamp",type:"date",description:"Event timestamp"}];class lo{constructor(){this.modal=null,this.builder=null,this.initialized=!1}async init(){this.initialized||(this.addVisualBuilderButton(),this.createModal(),this.initBuilder(),this.initialized=!0)}addVisualBuilderButton(){let e=null;const t=document.querySelectorAll(".control-section");for(const i of t)if(i.querySelector("#formulaEditorContainer")){e=i;break}if(!e){console.warn("Formula editor section not found");return}const a=e.querySelector(".control-label");if(a){const i=document.createElement("div");i.className="formula-header-container";const o=a.cloneNode(!0);i.appendChild(o);const r=ae.createButton({text:"🎨 Visual Builder",variant:"secondary",size:"small",onClick:()=>this.showModal(),className:"formula-visual-builder-btn"});r.id="visualBuilderBtn",i.appendChild(r),a.replaceWith(i)}}createModal(){const e=document.createElement("enhanced-formula-builder");e.id="visualFormulaBuilder",e.style.cssText="width: 100%; height: 100%;";const t=ae.createButton({text:"Insert Formula",variant:"primary",onClick:()=>this.insertFormula(),className:"formula-insert-btn"}),a=ae.createButton({text:"Cancel",variant:"secondary",onClick:()=>this.modalController.close(),className:"formula-cancel-btn"}),i=ae.createBox({display:"flex",className:"modal-footer-buttons",children:[t,a]});i.style.cssText="gap: 10px; justify-content: flex-end; padding: 15px 20px; border-top: 1px solid #eee;",this.modalController=ae.createModal({title:"🎨 Visual Formula Builder",content:e,footer:i,size:"large",onClose:()=>{console.log("Visual builder modal closed")},className:"visual-builder-modal"}),this.modal=document.getElementById(this.modalController.modalId)}initBuilder(){if(this.builder=document.getElementById("visualFormulaBuilder"),!this.builder){console.debug("Visual formula builder element not found - skipping initialization");return}customElements.whenDefined("enhanced-formula-builder").then(()=>{if(this.builder.userLevel="beginner",typeof this.builder.addCustomFields=="function")try{this.builder.addCustomFields(no)}catch(t){console.error("Failed to add custom fields:",t)}const e=Object.entries(_e).filter(([t,a])=>a&&a.category==="rad-monitoring").map(([t,a])=>({name:t,formula:a.formula||"",description:a.description||""}));if(typeof this.builder.addTemplates=="function"&&e.length>0)try{this.builder.addTemplates(e)}catch(t){console.error("Failed to add templates:",t)}this.builder.addEventListener("formula-change",t=>{console.log("Formula changed:",t.detail)})}).catch(e=>{console.error("Failed to initialize enhanced-formula-builder:",e)})}showModal(){if(!this.modalController){console.error("Modal not initialized");return}this.modalController.open(),this.builder&&this.builder.focus&&setTimeout(()=>this.builder.focus(),100)}hideModal(){this.modalController&&this.modalController.close()}insertFormula(){if(!this.builder){console.error("Builder not initialized"),this.showError("Visual builder not properly initialized");return}const e=this.builder.formula||"";if(!e||e.trim()===""){this.showError("Please create a formula before inserting");return}const t=document.getElementById("formulaEditor");if(!t){console.error("Formula editor element not found"),this.showError("Could not find formula editor");return}customElements.whenDefined("enhanced-formula-editor").then(()=>{typeof t.setValue=="function"?(t.setValue(e),t.dispatchEvent(new CustomEvent("formula-change",{detail:{formula:e,source:"visual-builder"},bubbles:!0})),this.hideModal(),this.showSuccess("Formula inserted from Visual Builder")):(console.error("Formula editor does not have setValue method"),this.showError("Formula editor not properly initialized"))}).catch(a=>{console.error("Failed to insert formula:",a),this.showError("Failed to insert formula")})}showSuccess(e){const t=document.getElementById("formulaStatus");t&&(t.textContent=e,t.style.color="#4CAF50",setTimeout(()=>{t.textContent="Ready to create formulas",t.style.color="#666"},3e3))}showError(e){const t=document.getElementById("formulaStatus");t?(t.textContent=e,t.style.color="#ef4444",setTimeout(()=>{t.textContent="Ready to create formulas",t.style.color="#666"},5e3)):alert(e)}setTemplates(e){this.builder&&this.builder.addTemplates&&this.builder.addTemplates(e)}setFields(e){this.builder&&this.builder.addCustomFields&&this.builder.addCustomFields(e)}}const aa=new lo;document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>aa.init()):aa.init();window.visualBuilderIntegration=aa;const co={enableRemoteAI:!1,apiEndpoint:"/api/v1/formula-ai",cacheEnabled:!0,cacheTTL:36e5,maxCacheSize:1e3,maxSuggestions:5,confidenceThreshold:.7,temperature:.3},uo=[{pattern:/(?:sum|total|add up) (?:of |the )?(\w+)/i,template:"sum($1)"},{pattern:/average (?:of |the )?(\w+)/i,template:"average($1)"},{pattern:/(?:count|number) (?:of |the )?(\w+)?/i,template:"count($1)"},{pattern:/(?:max|maximum|highest) (?:of |the )?(\w+)/i,template:"max($1)"},{pattern:/(?:min|minimum|lowest) (?:of |the )?(\w+)/i,template:"min($1)"},{pattern:/unique (?:count of |values in )?(\w+)/i,template:"unique_count($1)"},{pattern:/(\d+)(?:th|st|nd|rd)? percentile (?:of |the )?(\w+)/i,template:"percentile($2, percentile=$1)"},{pattern:/median (?:of |the )?(\w+)/i,template:"median($1)"},{pattern:/(\w+) (?:greater than|>) (\d+)/i,template:"$1 > $2"},{pattern:/(\w+) (?:less than|<) (\d+)/i,template:"$1 < $2"},{pattern:/(\w+) (?:equals?|=) (\d+)/i,template:"$1 == $2"},{pattern:/errors?|failed?|failure/i,template:"count(kql='status:error') / count()"},{pattern:/success(?:ful)?|passed/i,template:"count(kql='status:success') / count()"},{pattern:/traffic (?:drop|dropped|drops) (?:more than |over )?(\d+)%/i,template:'ifelse((count() / count(shift="1d")) < (1 - $1/100), 1, 0)'},{pattern:/traffic (?:drop|dropped|drops) (?:by )?(\d+)%/i,template:'ifelse(count() < count(shift="1d") * (1 - $1/100), "CRITICAL", "NORMAL")'},{pattern:/when traffic (?:is )?(?:less|lower) than (\d+)% (?:of )?yesterday/i,template:'ifelse((count() / count(shift="1d")) < ($1/100), 1, 0)'},{pattern:/(?:show|find|alert) (?:when )?errors? (?:exceed|above|over) (\d+)%/i,template:"ifelse((count(kql='response.status_code >= 400') / count()) > ($1/100), 1, 0)"},{pattern:/baseline deviation/i,template:"(count() - overall_average(count())) / overall_average(count()) * 100"},{pattern:/traffic (?:spike|increase) (?:above|over) (\d+)%/i,template:'ifelse(count() > count(shift="1d") * (1 + $1/100), 1, 0)'},{pattern:/critical traffic (?:drop|loss)/i,template:'ifelse((count() / count(shift="1d")) < 0.2, 1, 0)'},{pattern:/warning traffic (?:drop|loss)/i,template:'ifelse((count() / count(shift="1d")) < 0.5 && (count() / count(shift="1d")) >= 0.2, 1, 0)'},{pattern:/business impact/i,template:'((count(shift="1d") - count()) / count(shift="1d")) * unique_count(user.id)'},{pattern:/weekend traffic/i,template:'count() * ifelse(date_histogram_interval("day_of_week") >= 6, 1.43, 1)'},{pattern:/traffic (?:dropped|decreased) (?:by |more than )?(\d+)%/i,template:'count() < count(shift="1d") * (1 - $1/100)'},{pattern:/(?:baseline|normal) traffic for (\w+)/i,template:'average(count(), kql="event_id:$1", shift="1w")'},{pattern:/anomaly detection/i,template:'abs((count() - average(count(), shift="1w")) / standard_deviation(count(), shift="1w")) > 3'},{pattern:/(?:traffic|events?) (?:above|over) baseline/i,template:'(count() - average(count(), shift="1w")) / average(count(), shift="1w") * 100'},{pattern:/(?:slow|high) response times?/i,template:'average(response_time) > percentile(response_time, percentile=90, shift="1w")'},{pattern:/(?:compare|vs) last (\w+)/i,template:'count() / count(shift="1$1")'},{pattern:/health score/i,template:'100 * (1 - (count(kql="status:error") / count()))'},{pattern:/(?:traffic|volume) trend/i,template:'(count() - count(shift="1h")) / count(shift="1h") * 100'},{pattern:/peak traffic/i,template:"max(count()) / average(count())"},{pattern:/minimum traffic threshold/i,template:'ifelse(count() < overall_min(count()) * 1.2, "LOW", "NORMAL")'},{pattern:/service degradation/i,template:'(average(response_time) > average(response_time, shift="1d") * 1.5) || (count(kql="status:error") / count() > 0.05)'},{pattern:/recovery (?:rate|time)/i,template:'(count() - min(count(), shift="1h")) / (average(count(), shift="1d") - min(count(), shift="1h"))'},{pattern:/impact radius/i,template:'unique_count(user.id) * ((count(shift="1d") - count()) / count(shift="1d"))'},{pattern:/(?:monitor|watch) (\w+) for drops/i,template:'ifelse(count(kql="event_id:$1") < count(kql="event_id:$1", shift="1d") * 0.8, "ALERT", "OK")'},{pattern:/sustained (?:drop|decrease)/i,template:'min(count(), shift="30m") < average(count(), shift="1d") * 0.7'},{pattern:/week over week (?:for |of )?(\w+)/i,template:"sum($1) / sum($1, shift='1w')"},{pattern:/day over day (?:for |of )?(\w+)/i,template:"sum($1) / sum($1, shift='1d')"},{pattern:/month over month (?:for |of )?(\w+)/i,template:"sum($1) / sum($1, shift='1M')"},{pattern:/moving average (?:of |the )?(\w+)(?: over (\d+))?/i,template:"moving_average(average($1), window=$2)"},{pattern:/cumulative (?:sum |total )?(?:of |the )?(\w+)/i,template:"cumulative_sum(sum($1))"},{pattern:/(\w+) (?:as a )?percentage of (\w+)/i,template:"100 * sum($1) / sum($2)"},{pattern:/ratio (?:of |between )?(\w+) (?:to|and) (\w+)/i,template:"sum($1) / sum($2)"},{pattern:/percent(?:age)? (?:of )?total (?:for |of )?(\w+)/i,template:"sum($1) / overall_sum(sum($1))"},{pattern:/error rate/i,template:"count(kql='response.status_code >= 400') / count()"},{pattern:/response time/i,template:"average(response_time)"},{pattern:/conversion rate/i,template:"count(kql='event.type:purchase') / count(kql='event.type:view')"},{pattern:/bounce rate/i,template:"count(kql='session.pages_viewed:1') / count()"},{pattern:/availability/i,template:"100 * (1 - count(kql='status:error') / count())"}];class xi{constructor(e={}){this.config={...co,...e},this.parser=new rt,this.validator=new _t,this.cache=new Map,this.contextHistory=[],this.userPatterns=new Map}async generateFormula(e,t={}){const a=performance.now(),i=this.getCacheKey(e,t),o=this.getFromCache(i);if(o)return{...o,cached:!0,generationTime:performance.now()-a};try{const r=await this.generateFromPatterns(e,t);if(r.confidence>=this.config.confidenceThreshold&&(await this.validateFormula(r.formula)).valid){const m={formula:r.formula,explanation:r.explanation,confidence:r.confidence,alternatives:r.alternatives,generationTime:performance.now()-a};return this.addToCache(i,m),this.learnPattern(e,r.formula),m}return this.config.enableRemoteAI?await this.generateFromRemoteAI(e,t):{formula:"",explanation:"Could not generate formula from the given description",confidence:0,alternatives:this.getSimilarExamples(e),generationTime:performance.now()-a}}catch(r){return console.error("Formula generation error:",r),{formula:"",explanation:`Error: ${r.message}`,confidence:0,alternatives:[],generationTime:performance.now()-a}}}async generateFromPatterns(e,t){const a=e.toLowerCase().trim(),i=[];for(const[o,r]of this.userPatterns)this.fuzzyMatch(a,o)&&i.push({formula:r,confidence:.9,explanation:"Based on previously used pattern",source:"learned"});for(const o of uo){const r=a.match(o.pattern);if(r){let n=o.template;for(let m=1;m<r.length;m++)r[m]&&(n=n.replace(`$${m}`,r[m]||"10"));n=n.replace(/\$\d+/g,""),i.push({formula:n,confidence:.8,explanation:`Interpreted "${e}" as ${this.explainFormula(n)}`,source:"pattern"})}}for(const[o,r]of Object.entries(_e))this.matchesFormulaPattern(a,o,r)&&i.push({formula:r.formula,confidence:.75,explanation:r.description,source:"library"});return i.sort((o,r)=>r.confidence-o.confidence),i.length>0?{formula:i[0].formula,explanation:i[0].explanation,confidence:i[0].confidence,alternatives:i.slice(1,this.config.maxSuggestions).map(o=>({formula:o.formula,explanation:o.explanation,confidence:o.confidence}))}:{formula:"",explanation:"No matching pattern found",confidence:0,alternatives:[]}}async getSuggestions(e,t,a={}){const i=[],o=this.parser.parse(e);if(!o.success)return this.getSyntaxFixSuggestions(e,o.errors);const r=this.findNodeAtPosition(o.ast,t);return r&&(r.type==="FunctionCall"?i.push(...this.getFunctionSuggestions(r,a)):r.type==="FieldRef"&&i.push(...this.getFieldSuggestions(r,a))),i.push(...this.getGeneralSuggestions(e,a)),this.rankSuggestions(i,a).slice(0,this.config.maxSuggestions)}explainFormula(e){try{const t=this.parser.parse(e);return t.success?this.explainNode(t.ast):"Invalid formula syntax"}catch{return"Unable to explain formula"}}explainNode(e){switch(e.type){case"FunctionCall":const t=Re[e.name];if(t){const r=e.args.map(n=>this.explainNode(n)).join(", ");return`${t.description} of ${r}`}return`${e.name} function`;case"BinaryOp":const a=this.explainNode(e.left),i=this.explainNode(e.right),o=this.getOperatorName(e.operator);return`${a} ${o} ${i}`;case"FieldRef":return`field "${e.field}"`;case"Literal":return e.dataType==="string"?`"${e.value}"`:String(e.value);default:return"expression"}}getOperatorName(e){return{"+":"plus","-":"minus","*":"times","/":"divided by",">":"greater than","<":"less than",">=":"greater than or equal to","<=":"less than or equal to","==":"equals","!=":"not equals"}[e]||e}learnPattern(e,t){const a=e.toLowerCase().trim();if(this.userPatterns.set(a,t),this.userPatterns.size>100){const i=this.userPatterns.keys().next().value;this.userPatterns.delete(i)}}getCacheKey(e,t){return`${e.toLowerCase().trim()}-${JSON.stringify(t)}`}getFromCache(e){if(!this.config.cacheEnabled)return null;const t=this.cache.get(e);return t&&Date.now()-t.timestamp<this.config.cacheTTL?t.data:(t&&this.cache.delete(e),null)}addToCache(e,t){if(this.config.cacheEnabled){if(this.cache.size>=this.config.maxCacheSize){const a=this.cache.keys().next().value;this.cache.delete(a)}this.cache.set(e,{data:t,timestamp:Date.now()})}}async validateFormula(e){const t=this.parser.parse(e);return t.success?await this.validator.validate(t.ast):{valid:!1,errors:t.errors}}fuzzyMatch(e,t){const a=e.split(/\s+/),i=t.split(/\s+/);let o=0;for(const r of i)a.some(n=>n.includes(r)||r.includes(n))&&o++;return o/i.length>.7}matchesFormulaPattern(e,t,a){const i=t.toLowerCase().split(/\s+/),o=e.split(/\s+/);return i.every(r=>o.some(n=>n.includes(r)||r.includes(n)))}getSimilarExamples(e){const t=[];for(const[a,i]of Object.entries(_e)){const o=this.calculateSimilarity(e,a+" "+i.description);o>.3&&t.push({formula:i.formula,explanation:i.description,confidence:o})}return t.sort((a,i)=>i.confidence-a.confidence).slice(0,3)}calculateSimilarity(e,t){const a=new Set(e.toLowerCase().split(/\s+/)),i=new Set(t.toLowerCase().split(/\s+/)),o=new Set([...a].filter(n=>i.has(n))),r=new Set([...a,...i]);return o.size/r.size}findNodeAtPosition(e,t){return null}getSyntaxFixSuggestions(e,t){return t.map(a=>({type:"fix",description:a.message,action:"fix-syntax",confidence:.9}))}getFunctionSuggestions(e,t){return[]}getFieldSuggestions(e,t){return[]}getGeneralSuggestions(e,t){return[]}rankSuggestions(e,t){return e.sort((a,i)=>i.confidence-a.confidence)}async generateFromRemoteAI(e,t){const a=await fetch(this.config.apiEndpoint,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${this.config.apiKey}`},body:JSON.stringify({prompt:e,context:t,temperature:this.config.temperature,max_tokens:150})});if(!a.ok)throw new Error(`AI API error: ${a.statusText}`);return await a.json()}}class ho extends HTMLElement{constructor(){super(),this.attachShadow({mode:"open"}),this.ai=new xi,this.isProcessing=!1}connectedCallback(){this.render(),this.setupEventListeners()}render(){this.shadowRoot.innerHTML=k.sanitize(`
      <style>
        :host {
          display: block;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .ai-input-container {
          position: relative;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          overflow: hidden;
        }

        .ai-input-header {
          display: flex;
          align-items: center;
          padding: 0.75rem 1rem;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }

        .ai-icon {
          width: 1.25rem;
          height: 1.25rem;
          margin-right: 0.5rem;
          color: #8b5cf6;
        }

        .ai-title {
          font-size: 0.875rem;
          font-weight: 500;
          color: #1e293b;
        }

        .ai-input-wrapper {
          padding: 1rem;
        }

        .nl-input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          resize: none;
          min-height: 80px;
          font-family: inherit;
        }

        .nl-input:focus {
          outline: none;
          border-color: #8b5cf6;
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }

        .ai-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.75rem;
        }

        .ai-button {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .ai-button.primary {
          background: #8b5cf6;
          color: white;
        }

        .ai-button.primary:hover {
          background: #7c3aed;
        }

        .ai-button.secondary {
          background: #f1f5f9;
          color: #475569;
        }

        .ai-button.secondary:hover {
          background: #e2e8f0;
        }

        .ai-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .ai-result {
          margin-top: 1rem;
          padding: 1rem;
          background: #f8fafc;
          border-radius: 0.375rem;
          display: none;
        }

        .ai-result.visible {
          display: block;
        }

        .result-formula {
          font-family: 'Monaco', 'Consolas', monospace;
          font-size: 0.875rem;
          padding: 0.75rem;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 0.375rem;
          margin-bottom: 0.75rem;
        }

        .result-explanation {
          font-size: 0.813rem;
          color: #64748b;
          margin-bottom: 0.5rem;
        }

        .result-confidence {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .confidence-bar {
          flex: 1;
          height: 4px;
          background: #e2e8f0;
          border-radius: 2px;
          overflow: hidden;
        }

        .confidence-fill {
          height: 100%;
          background: #8b5cf6;
          transition: width 0.3s;
        }

        .alternatives {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #e2e8f0;
        }

        .alternatives-title {
          font-size: 0.813rem;
          font-weight: 500;
          color: #64748b;
          margin-bottom: 0.5rem;
        }

        .alternative-item {
          padding: 0.5rem;
          margin: 0.25rem 0;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.813rem;
        }

        .alternative-item:hover {
          border-color: #8b5cf6;
          background: #faf5ff;
        }

        .spinner {
          display: inline-block;
          width: 1rem;
          height: 1rem;
          border: 2px solid #e2e8f0;
          border-top-color: #8b5cf6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>

      <div class="ai-input-container">
        <div class="ai-input-header">
          <svg class="ai-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
          </svg>
          <span class="ai-title">AI Formula Assistant</span>
        </div>

        <div class="ai-input-wrapper">
          <textarea
            class="nl-input"
            placeholder="Describe what you want to calculate in plain English...&#10;&#10;Examples:&#10;• Calculate the error rate&#10;• Show week over week revenue growth&#10;• Find the 95th percentile of response times"
            rows="4"
          ></textarea>

          <div class="ai-actions">
            <button class="ai-button primary" data-action="generate">
              <span class="button-text">Generate Formula</span>
            </button>
            <button class="ai-button secondary" data-action="clear">Clear</button>
          </div>

          <div class="ai-result">
            <div class="result-content"></div>
          </div>
        </div>
      </div>
    `),this.nlInput=this.shadowRoot.querySelector(".nl-input"),this.generateButton=this.shadowRoot.querySelector('[data-action="generate"]'),this.clearButton=this.shadowRoot.querySelector('[data-action="clear"]'),this.resultContainer=this.shadowRoot.querySelector(".ai-result"),this.resultContent=this.shadowRoot.querySelector(".result-content")}setupEventListeners(){this.generateButton.addEventListener("click",()=>this.generateFormula()),this.clearButton.addEventListener("click",()=>this.clear()),this.nlInput.addEventListener("keydown",e=>{e.key==="Enter"&&(e.ctrlKey||e.metaKey)&&(e.preventDefault(),this.generateFormula())}),this.shadowRoot.addEventListener("click",e=>{if(e.target.closest(".alternative-item")){const t=e.target.closest(".alternative-item").dataset.formula;this.selectFormula(t)}})}async generateFormula(){const e=this.nlInput.value.trim();if(!(!e||this.isProcessing)){this.isProcessing=!0,this.generateButton.disabled=!0,this.generateButton.querySelector(".button-text").innerHTML=k.sanitize('<span class="spinner"></span> Generating...');try{const t=await this.ai.generateFormula(e);this.displayResult(t)}catch(t){this.displayError(t.message)}finally{this.isProcessing=!1,this.generateButton.disabled=!1,this.generateButton.querySelector(".button-text").textContent="Generate Formula"}}}displayResult(e){e.formula?(this.resultContent.innerHTML=k.sanitize(`
        <div class="result-formula">${e.formula}</div>
        <div class="result-explanation">${e.explanation}</div>
        <div class="result-confidence">
          <span>Confidence:</span>
          <div class="confidence-bar">
            <div class="confidence-fill" style="width: ${e.confidence*100}%"></div>
          </div>
          <span>${Math.round(e.confidence*100)}%</span>
        </div>

        ${e.alternatives&&e.alternatives.length>0?`
          <div class="alternatives">
            <div class="alternatives-title">Alternative formulas:</div>
            ${e.alternatives.map(t=>`
              <div class="alternative-item" data-formula="${t.formula}">
                <div style="font-family: Monaco, Consolas, monospace; font-size: 0.813rem;">
                  ${t.formula}
                </div>
                <div style="color: #94a3b8; font-size: 0.75rem; margin-top: 0.25rem;">
                  ${t.explanation}
                </div>
              </div>
            `).join("")}
          </div>
        `:""}
      `),this.dispatchEvent(new CustomEvent("formula-generated",{detail:{formula:e.formula,result:e}}))):this.resultContent.innerHTML=k.sanitize(`
        <div style="color: #ef4444; font-size: 0.875rem;">
          ${e.explanation||"Could not generate a formula from your description."}
        </div>
      `),this.resultContainer.classList.add("visible")}displayError(e){this.resultContent.innerHTML=k.sanitize(`
      <div style="color: #ef4444; font-size: 0.875rem;">
        Error: ${e}
      </div>
    `),this.resultContainer.classList.add("visible")}selectFormula(e){this.dispatchEvent(new CustomEvent("formula-selected",{detail:{formula:e}}))}clear(){this.nlInput.value="",this.resultContainer.classList.remove("visible"),this.resultContent.innerHTML=""}}customElements.define("ai-formula-input",ho);const Se={placeholder:'🤖 Ask me anything: "Show traffic drops over 50%", "Alert when errors exceed 10%"...',minInputLength:5,debounceDelay:500,maxSuggestions:3,showConfidenceScores:!0,enableLearning:!0,maxLearnedPatterns:100,successDuration:3e3,errorDuration:5e3},mo=`
  .ai-formula-container { width: 100%; margin: 20px 0; }
  .ai-formula-wrapper { position: relative; }
  .ai-input-group { display: flex; gap: 8px; margin-bottom: 12px; }

  .ai-formula-input {
    flex: 1; padding: 12px 16px; font-size: 14px;
    border: 2px solid #e0e0e0; border-radius: 8px;
    background: white; transition: all 0.2s; outline: none;
  }

  .ai-formula-input:focus {
    border-color: #2196F3;
    box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
  }

  .ai-generate-btn {
    padding: 12px 20px; background: #2196F3; color: white;
    border: none; border-radius: 8px; cursor: pointer;
    font-size: 16px; transition: all 0.2s;
    display: flex; align-items: center; gap: 6px;
  }

  .ai-generate-btn:hover {
    background: #1976D2; transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  .ai-generate-btn.loading { background: #ccc; cursor: not-allowed; }

  .ai-formula-results {
    background: white; border: 1px solid #e0e0e0;
    border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    padding: 16px; animation: slideDown 0.3s ease-out;
  }

  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .ai-result-item {
    padding: 12px; margin-bottom: 12px;
    border: 1px solid #e0e0e0; border-radius: 6px;
    cursor: pointer; transition: all 0.2s;
  }

  .ai-result-item:hover { border-color: #2196F3; background: #f5f5f5; }

  .ai-formula-code {
    font-family: monospace; font-size: 13px;
    background: #f0f4f8; padding: 8px 12px;
    border-radius: 4px; color: #1976D2;
  }

  .ai-confidence {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 12px; color: #666; float: right;
  }

  .ai-confidence-bar {
    width: 60px; height: 6px; background: #e0e0e0;
    border-radius: 3px; overflow: hidden;
  }

  .ai-confidence-fill {
    height: 100%; background: #4CAF50; transition: width 0.3s;
  }

  .ai-confidence-fill.medium { background: #FFC107; }
  .ai-confidence-fill.low { background: #f44336; }

  .ai-explanation { font-size: 12px; color: #666; margin-top: 6px; }

  .ai-actions { display: flex; gap: 8px; margin-top: 10px; }

  .ai-action-btn {
    padding: 6px 12px; font-size: 12px;
    border: none; border-radius: 4px;
    cursor: pointer; transition: all 0.2s;
  }

  .ai-apply-btn { background: #4CAF50; color: white; }
  .ai-apply-btn:hover { background: #45a049; }

  .ai-feedback-btn { background: #f0f0f0; color: #666; }
  .ai-feedback-btn:hover { background: #e0e0e0; }
  .ai-feedback-btn.positive { background: #E8F5E9; color: #4CAF50; }
  .ai-feedback-btn.negative { background: #FFEBEE; color: #f44336; }

  .ai-error {
    background: #FFEBEE; color: #c62828;
    padding: 12px; border-radius: 6px; font-size: 13px;
  }

  .ai-no-results {
    text-align: center; color: #999;
    padding: 20px; font-size: 14px;
  }

  .ai-success-message {
    position: fixed; top: 20px; right: 20px;
    background: #4CAF50; color: white;
    padding: 16px 24px; border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    animation: slideInRight 0.3s ease-out; z-index: 10000;
  }

  @keyframes slideInRight {
    from { opacity: 0; transform: translateX(100px); }
    to { opacity: 1; transform: translateX(0); }
  }
`;class po{constructor(){this.aiAssistant=new xi({enableRemoteAI:!1,cacheEnabled:!0,maxSuggestions:Se.maxSuggestions}),this.validator=new _t,this.parser=new rt,this.elements={},this.debounceTimer=null,this.initialized=!1,this.lastQuery=""}async init(){if(!this.initialized)try{this.injectStyles(),this.createUI(),this.setupEventListeners(),this.loadLearnedPatterns(),this.initialized=!0,console.log("(✓)AI Formula Integration ready")}catch(e){console.error("(✗) AI Integration failed:",e)}}injectStyles(){if(document.getElementById("ai-formula-styles"))return;const e=document.createElement("style");e.id="ai-formula-styles",e.textContent=mo,document.head.appendChild(e)}createUI(){const e=document.querySelector(".header");if(!e){console.warn("Dashboard header not found - skipping UI creation");return}const t=this.createElement("div",{className:"ai-formula-container"});t.innerHTML=k.sanitize(`
        <div class="ai-formula-wrapper">
          <div class="ai-input-group">
            <input type="text" id="aiFormulaInput" class="ai-formula-input"
                   placeholder="${Se.placeholder}" autocomplete="off">
            <button id="aiGenerateBtn" class="ai-generate-btn" title="Generate Formula">
              <span class="ai-icon">✨</span>
            </button>
          </div>
          <div id="aiFormulaResults" class="ai-formula-results" style="display: none;"></div>
        </div>
      `);const a=e.querySelector("h1");e.insertBefore(t,a?a.nextSibling:e.firstChild),this.elements={container:t,input:document.getElementById("aiFormulaInput"),button:document.getElementById("aiGenerateBtn"),results:document.getElementById("aiFormulaResults")}}setupEventListeners(){const{input:e,button:t,container:a}=this.elements;if(!e||!t||!a){console.warn("UI elements not found - skipping event listener setup");return}e.addEventListener("input",i=>this.handleInput(i.target.value)),e.addEventListener("keypress",i=>{i.key==="Enter"&&this.generateFormula()}),t.addEventListener("click",()=>this.generateFormula()),document.addEventListener("click",i=>{a.contains(i.target)||this.hideResults()})}handleInput(e){if(clearTimeout(this.debounceTimer),e.trim().length<Se.minInputLength){this.hideResults();return}this.debounceTimer=setTimeout(()=>this.generateFormula(),Se.debounceDelay)}async generateFormula(){const e=this.elements.input.value.trim();if(e.length<Se.minInputLength){this.showError("Please enter a more detailed description");return}this.setLoading(!0),this.lastQuery=e;try{const t=await this.aiAssistant.generateFormula(e,{dashboardContext:this.getDashboardContext()});this.displayResults(t)}catch(t){console.error("Generation error:",t),this.showError("Failed to generate formula. Please try again.")}finally{this.setLoading(!1)}}displayResults(e){const{results:t}=this.elements;if(!e?.formula&&!e?.alternatives?.length){t.innerHTML=k.sanitize(this.createNoResultsHTML()),t.style.display="block";return}const a=[];e.formula&&a.push({formula:e.formula,explanation:e.explanation,confidence:e.confidence}),e.alternatives&&a.push(...e.alternatives),t.innerHTML=k.sanitize(a.map((i,o)=>this.createResultHTML(i,o)).join("")),t.style.display="block",this.attachResultListeners()}createResultHTML(e,t){const a=Math.round(e.confidence*100),i=e.confidence>=.8?"high":e.confidence>=.6?"medium":"low";return`
      <div class="ai-result-item" data-formula="${this.escape(e.formula)}">
        <div class="ai-formula-code">
          ${this.escape(e.formula)}
          ${`
            <div class="ai-confidence">
              <span>${a}%</span>
              <div class="ai-confidence-bar">
                <div class="ai-confidence-fill ${i}"
                     style="width: ${a}%"></div>
              </div>
            </div>
          `}
        </div>
        <div class="ai-explanation">${this.escape(e.explanation)}</div>
        <div class="ai-actions">
          <button class="ai-action-btn ai-apply-btn" data-action="apply">
            Apply Formula
          </button>
          <button class="ai-action-btn ai-feedback-btn" data-action="positive" title="👍">
            👍
          </button>
          <button class="ai-action-btn ai-feedback-btn" data-action="negative" title="👎">
            👎
          </button>
        </div>
      </div>
    `}createNoResultsHTML(){return`
      <div class="ai-no-results">
        <p>I couldn't understand that request. Try describing it differently.</p>
        <p style="margin-top: 8px; font-size: 12px;">
          Examples: "Show traffic drops over 50%", "Alert when errors exceed 10%"
        </p>
      </div>
    `}attachResultListeners(){this.elements.results.addEventListener("click",e=>{const t=e.target.closest(".ai-action-btn");if(!t)return;const i=t.closest(".ai-result-item").dataset.formula,o=t.dataset.action;switch(o){case"apply":this.applyFormula(i);break;case"positive":case"negative":this.provideFeedback(i,o==="positive"),t.classList.add(o);break}})}async applyFormula(e){try{const t=this.parser.parse(e);if(!t.success)throw new Error("Invalid formula syntax");const a=await this.validator.validate(t.ast);if(!a.valid)throw new Error(a.errors.join(", "));const i=document.getElementById("formulaEditor");if(!i?.setValue)throw new Error("Formula editor not found");i.setValue(e),i.dispatchEvent(new CustomEvent("formula-change",{detail:{formula:e,source:"ai-assistant"},bubbles:!0})),this.hideResults(),this.elements.input.value="",this.showSuccess("Formula applied successfully!"),this.lastQuery&&this.learnPattern(this.lastQuery,e)}catch(t){this.showError(t.message||"Failed to apply formula")}}provideFeedback(e,t){t&&this.lastQuery&&this.learnPattern(this.lastQuery,e),this.showSuccess(t?"Thanks for the feedback!":"Thanks, we'll improve",2e3)}learnPattern(e,t){this.aiAssistant.learnPattern(e,t);try{const a=JSON.parse(localStorage.getItem("aiLearnedPatterns")||"{}");a[e.toLowerCase()]={formula:t,count:(a[e.toLowerCase()]?.count||0)+1,lastUsed:Date.now()};const i=Object.entries(a).sort((o,r)=>r[1].lastUsed-o[1].lastUsed).slice(0,Se.maxLearnedPatterns);localStorage.setItem("aiLearnedPatterns",JSON.stringify(Object.fromEntries(i)))}catch(a){console.error("Failed to save pattern:",a)}}loadLearnedPatterns(){try{const e=JSON.parse(localStorage.getItem("aiLearnedPatterns")||"{}");Object.entries(e).forEach(([t,a])=>{this.aiAssistant.learnPattern(t,a.formula)})}catch(e){console.error("Failed to load patterns:",e)}}getDashboardContext(){return{timeRange:document.getElementById("quickTimeRange")?.textContent||"now-12h",baseline:document.getElementById("quickBaseline")?.textContent||"unknown",activeFilters:this.getActiveFilters()}}getActiveFilters(){const e=[],t=document.querySelector(".filter-btn.active");return t?.dataset.filter!=="all"&&e.push({type:"status",value:t.dataset.filter}),document.querySelectorAll("#radTypeButtons .filter-btn.active").forEach(a=>{a.dataset.radType!=="all"&&e.push({type:"rad_type",value:a.dataset.radType})}),e}setLoading(e){const{button:t,results:a}=this.elements;t.classList.toggle("loading",e),t.disabled=e,e&&(a.innerHTML=k.sanitize('<div class="ai-no-results">Generating formula...</div>'),a.style.display="block")}hideResults(){this.elements.results.style.display="none"}showError(e){const{results:t}=this.elements;t.innerHTML=k.sanitize(`<div class="ai-error">${this.escape(e)}</div>`),t.style.display="block",setTimeout(()=>this.hideResults(),Se.errorDuration)}showSuccess(e,t=Se.successDuration){const a=this.createElement("div",{className:"ai-success-message",textContent:e});document.body.appendChild(a),setTimeout(()=>a.remove(),t)}createElement(e,t={}){const a=document.createElement(e);return Object.assign(a,t),a}escape(e){const t=document.createElement("div");return t.textContent=e,t.innerHTML}}const ia=new po;typeof window<"u"&&typeof window.__TEST__>"u"&&(document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>ia.init()):ia.init());typeof window<"u"&&(window.aiFormulaIntegration=ia);window.CentralizedAuth=na;const fo=na.init().then(s=>(console.log("✅ CentralizedAuth initialized",s),s)).catch(s=>(console.error("❌ CentralizedAuth initialization failed:",s),null));(window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1")&&ja(()=>import("./debug-helper-Bjcha6DC.js"),__vite__mapDeps([0,1])).catch(console.error);window.RADMonitor={store:j,getState:()=>j.getState(),setAuth:s=>{const{setCookie:e}=de();e(s.startsWith("sid=")?s:`sid=${s}`),window.location.reload()},clearAuth:()=>{const{clearAuth:s}=de();s(),window.location.reload()},refresh:()=>dashboard.refresh(),loadTestData:()=>{const s=go(),{setData:e}=de();e(s)},showState:()=>{const s=j.getState();return console.log("🔍 Current App State:",s),s},showAuth:()=>{const{showAuthPrompt:s}=de();s()},init:()=>{const{initialize:s}=de();return s()},help:()=>{console.log(`
🎯 RAD Monitor Console Commands:

Authentication:
  RADMonitor.setAuth("YOUR_SID_VALUE")  - Set Kibana cookie
  RADMonitor.clearAuth()                - Clear authentication
  RADMonitor.showAuth()                 - Show auth prompt (testing)

Dashboard:
  RADMonitor.refresh()                  - Refresh dashboard data
  RADMonitor.loadTestData()             - Load mock data for testing

Debugging:
  RADMonitor.showState()                - Show current app state
  RADMonitor.init()                     - Manual initialization

Examples:
  // Set authentication
  RADMonitor.setAuth("your-sid-cookie-value")

  // Load test data
  RADMonitor.loadTestData()

  // Debug current state
  RADMonitor.showState()
    `)},setupTestCookie:()=>{console.log(`
🍪 To set up authentication:

1. Open Kibana in another tab
2. Open DevTools (F12) → Application → Cookies
3. Find the "sid" cookie
4. Copy its value
5. Run: RADMonitor.setAuth("YOUR_COOKIE_VALUE")

Or use: ${getApiUrl()}/kibana-cookie-sync.html

For testing without Kibana:
RADMonitor.loadTestData() - Load mock data
    `)}};function go(){const s=["CRITICAL","WARNING","NORMAL","INCREASED"],e=["Login","API","Page View","Download","Upload"];return Array.from({length:50},(t,a)=>({id:`event-${a}`,name:`traffic.event.${e[a%e.length].toLowerCase()}.${a}`,radType:e[a%e.length],status:s[Math.floor(Math.random()*s.length)],score:Math.floor(Math.random()*200)-100,current:Math.floor(Math.random()*1e4),baseline:Math.floor(Math.random()*1e4),impact:Math.random()>.5?"High":"Low",kibanaUrl:"#"}))}class yo{constructor(){this.unsubscribe=null,this.init()}init(){this.unsubscribe=j.subscribe(e=>{this.updateDashboard(e)}),window.dashboard&&this.enhanceDashboard()}updateDashboard(e){this.updateSummaryCards(e.data.stats),window.dashboard&&e.data.filteredEvents.length>0&&this.updateTable(e.data.filteredEvents),this.updateFilters(e.filters)}updateSummaryCards(e){Object.entries(e).forEach(([t,a])=>{const i=document.getElementById(`${t}Count`);i&&(i.textContent=a)})}updateTable(e){const t=document.getElementById("tableBody");t&&(t.innerHTML=k.sanitize(e.map(a=>`
      <tr>
        <td>
          <a href="${a.kibanaUrl}" target="_blank" class="event-link">
            ${a.name}
          </a>
        </td>
        <td>
          <span class="rad-type-badge">${a.radType}</span>
        </td>
        <td>
          <span class="badge ${a.status.toLowerCase()}">${a.status}</span>
        </td>
        <td class="number">
          <span class="score ${a.score<0?"negative":"positive"}">
            ${a.score>0?"+":""}${a.score}%
          </span>
        </td>
        <td class="number">${a.current.toLocaleString()}</td>
        <td class="number">${a.baseline.toLocaleString()}</td>
        <td>
          <span class="impact ${a.impact.toLowerCase()}">${a.impact}</span>
        </td>
      </tr>
    `).join("")))}updateFilters(e){const t=document.getElementById("searchInput");t&&t.value!==e.search&&(t.value=e.search),document.querySelectorAll(".filter-btn").forEach(a=>{a.classList.toggle("active",a.dataset.filter===e.status)})}enhanceDashboard(){const e=document.getElementById("searchInput");e&&e.addEventListener("input",t=>{const{setFilter:a}=de();a("search",t.target.value)}),document.querySelectorAll(".filter-btn").forEach(t=>{t.addEventListener("click",()=>{const{setFilter:a}=de();a("status",t.dataset.filter)})})}destroy(){console.log("🧹 DashboardIntegration: Cleaning up store subscription..."),this.unsubscribe&&(this.unsubscribe(),this.unsubscribe=null),console.log("✅ DashboardIntegration: Store subscription cleaned up")}}let Ga=!1,et=null,vo=null;async function Wa(){if(Ga){console.log("⚠️ App already initialized, skipping...");return}Ga=!0,console.log("🚀 RAD Monitor v3.0 (Clean Vanilla + Zustand)"),console.log("💡 Type RADMonitor.help() for available commands");try{console.log("⏳ Waiting for CentralizedAuth to initialize..."),await fo;const{initialize:s}=de();await s()?(et=new la,await et.init(),vo=new yo,window.dashboard=et,window.Dashboard=et,window.ConfigEditor=ea,window.ConfigManager=ao,window.ConfigService=H,window.RADMonitor.refresh=()=>et.refresh(),console.log("✅ Dashboard initialization complete")):console.log("⚠️ Initialization incomplete - authentication required")}catch(s){console.error("❌ Failed to initialize:",s)}}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",Wa):Wa();(window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1")&&console.log("🔧 Development mode active");class bo{constructor(){this.migrated=!1}init(){this.migrated||(document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>this.migrateComponents()):this.migrateComponents())}migrateComponents(){try{this.migrateButtons(),this.migrateSearchInput(),this.migrateFilterButtons(),this.migrateModals(),this.migrated=!0,console.log("✅ Dashboard UX migration completed")}catch(e){console.error("❌ Dashboard UX migration failed:",e)}}migrateButtons(){[{selector:'button[onclick="Dashboard.testApiConnection()"]',config:{text:"Test All Connections",variant:"secondary",onClick:()=>Dashboard.testApiConnection(),className:"test-connections-btn"}},{selector:'button[onclick="Dashboard.refresh()"]',config:{text:"🔄 REFRESH DATA",variant:"primary",onClick:()=>Dashboard.refresh(),disabled:!0,className:"refresh-data-btn"}},{selector:'button[onclick="showAdvancedEditor()"]',config:{text:"⚙️ CONFIGURATION",variant:"secondary",onClick:()=>showAdvancedEditor(),disabled:!0,className:"configuration-btn"}},{selector:'button[onclick="ConfigManager.exportConfiguration()"]',config:{text:"Export Config",variant:"secondary",onClick:()=>ConfigManager.exportConfiguration(),className:"export-config-btn"}},{selector:'button[onclick="Dashboard.showApiSetupInstructions()"]',config:{text:"Help",variant:"secondary",onClick:()=>Dashboard.showApiSetupInstructions(),className:"help-btn"}},{selector:'button[onclick="testFormula()"]',config:{text:"🧪 Test Formula",variant:"primary",onClick:()=>testFormula(),disabled:!0,className:"test-formula-btn"}},{selector:'button[onclick="showHowItWorksModal()"]',config:{text:"📖 How It Works",variant:"secondary",onClick:()=>showHowItWorksModal(),className:"how-it-works-btn"}}].forEach(({selector:t,config:a})=>{const i=document.querySelector(t);if(i){const o=ae.createButton(a);i.id&&(o.id=i.id),i.style.width&&(o.style.width=i.style.width),i.style.marginBottom&&(o.style.marginBottom=i.style.marginBottom),i.replaceWith(o),console.log(`✅ Migrated button: ${a.text}`)}})}migrateSearchInput(){const e=document.getElementById("searchInput");e&&(e.className="ux-text-input ux-text-input--search",console.log("✅ Migrated search input"))}migrateFilterButtons(){document.querySelectorAll(".filter-btn").forEach(t=>{const a=t.classList.contains("active"),i=t.textContent,o=t.getAttribute("data-filter"),r=ae.createChip({text:i,variant:a?"primary":"default",className:`filter-chip ${a?"active":""}`});r.setAttribute("data-filter",o),r.addEventListener("click",()=>{document.querySelectorAll(".filter-chip").forEach(n=>{n.classList.remove("active"),n.className=n.className.replace("ux-chip--primary","ux-chip--default")}),r.classList.add("active"),r.className=r.className.replace("ux-chip--default","ux-chip--primary"),window.setFilter&&window.setFilter(o)}),t.replaceWith(r)}),console.log("✅ Migrated filter buttons to chips")}migrateModals(){this.migrateHowItWorksModal(),this.migrateAdvancedEditorModal()}migrateHowItWorksModal(){const e=document.getElementById("howItWorksModal");e&&(e.style.display="none",window.howItWorksModalController=ae.createModal({title:"📖 How RAD Monitor Works",content:"",size:"large",className:"how-it-works-ux-modal"}),window.showHowItWorksModal=()=>{const t=generateHowItWorksContent();window.howItWorksModalController.setContent(t),window.howItWorksModalController.open()},window.closeHowItWorksModal=()=>{window.howItWorksModalController.close()},console.log("✅ Migrated How It Works modal"))}migrateAdvancedEditorModal(){const e=document.getElementById("advancedEditorModal");if(e){e.style.display="none";const t=ae.createButton({text:"Apply Changes",variant:"primary",onClick:()=>ConfigEditor.saveConfig()}),a=ae.createButton({text:"Reset to Defaults",variant:"secondary",onClick:()=>ConfigEditor.resetToDefaults()}),i=ae.createButton({text:"Cancel",variant:"secondary",onClick:()=>window.advancedEditorModalController.close()}),o=ae.createBox({display:"flex",className:"modal-footer-buttons",children:[t,a,i]});o.style.cssText="gap: 10px; justify-content: center;";const r=document.createElement("div");r.innerHTML=k.sanitize(`
        <div id="configEditorFields">
          <!-- Config fields will be loaded here -->
        </div>
        <div id="configEditorStatus" style="margin: 15px 0 10px 0; font-size: 13px; color: #666; text-align: center;"></div>
      `),window.advancedEditorModalController=ae.createModal({title:"⚙️ Configuration Settings",content:r,footer:o,size:"large",className:"advanced-editor-ux-modal"}),window.showAdvancedEditor=async()=>{await ConfigEditor.loadConfig(),window.advancedEditorModalController.open()},window.closeAdvancedEditor=()=>{window.advancedEditorModalController.close()},console.log("✅ Migrated Advanced Editor modal")}}}const wo=new bo;wo.init();export{j as a};
