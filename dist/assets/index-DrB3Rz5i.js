var mt=Object.defineProperty;var gt=(e,t,r)=>t in e?mt(e,t,{enumerable:!0,configurable:!0,writable:!0,value:r}):e[t]=r;var p=(e,t,r)=>gt(e,typeof t!="symbol"?t+"":t,r);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))n(s);new MutationObserver(s=>{for(const a of s)if(a.type==="childList")for(const i of a.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&n(i)}).observe(document,{childList:!0,subtree:!0});function r(s){const a={};return s.integrity&&(a.integrity=s.integrity),s.referrerPolicy&&(a.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?a.credentials="include":s.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function n(s){if(s.ep)return;s.ep=!0;const a=r(s);fetch(s.href,a)}})();const I=class I{constructor(){p(this,"logs",[])}static getInstance(){return I.instance||(I.instance=new I),I.instance}log(t,r){const s=`[${new Date().toISOString()}] ${t}`;console.log(`🔍 DEBUG: ${s}`,r||""),this.logs.push(s);const a=document.getElementById("debug-log");a&&(a.innerHTML+=`<div>${s} ${r?JSON.stringify(r):""}</div>`)}installInterceptors(){const t=window.fetch;window.fetch=(...s)=>{var i;const a=typeof s[0]=="string"?s[0]:s[0]instanceof URL?s[0].toString():s[0]instanceof Request?s[0].url:"";return a&&a.includes("api")&&(this.log(`FETCH: ${a}`,{method:((i=s[1])==null?void 0:i.method)||"GET"}),a.includes("index.ts")&&(console.error("🚨 FOUND IT! Fetch to api/index.ts"),console.trace("Stack trace:"))),t.apply(window,s)};const r=window.__vite_import__;r&&(window.__vite_import__=s=>(s.includes("api")&&(this.log(`VITE IMPORT: ${s}`),s.includes("index.ts")&&(console.error("🚨 FOUND IT! Vite import of api/index.ts"),console.trace("Stack trace:"))),r(s)));const n=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(s,a,i,o,c){const u=a.toString();return u&&u.includes("api")&&(I.getInstance().log(`XHR: ${s} ${u}`),u.includes("index.ts")&&(console.error("🚨 FOUND IT! XHR to api/index.ts"),console.trace("Stack trace:"))),n.apply(this,[s,a,i??!0,o,c])},this.log("Debug interceptors installed")}getLogs(){return this.logs}};p(I,"instance");let P=I;typeof window<"u"&&P.getInstance().installInterceptors();class T{static parse(t){if(!t||typeof t!="string")throw new Error("Invalid EID: must be a non-empty string");const r=t.split(".");if(r.length<3)throw new Error(`Invalid EID format: ${t}. Expected at least namespace.radset.radId`);const n={eid:t,namespace:r[0],radset:r[1],radId:r[2]};return r.length>3&&(n.subaction=r[3]),r.length>4&&(n.action=r.slice(4).join(".")),n}static validate(t){try{const r=this.parse(t);return!!(r.namespace&&r.radset&&r.radId)}catch{return!1}}static build(t){const r=[t.namespace||this.DEFAULT_NAMESPACE,t.radset||this.DEFAULT_RADSET,t.radId];return t.subaction&&r.push(t.subaction),t.action&&r.push(t.action),r.join(".")}static extractRADType(t){try{const n=this.parse(t).radId||"";return n.includes("recommendation")?"recommendations":n.includes("discovery")?"discovery":n.includes("search")?"search":n.includes("feed")?"feed":n.includes("cart")?"cart":n.includes("checkout")?"checkout":n}catch{return"unknown"}}static extractRADIdentifier(t){var r;try{const n=this.parse(t);return n.namespace==="pandc"&&n.radset==="vnext"&&n.radId==="recommendations"&&((r=n.subaction)!=null&&r.startsWith("feed.feed"))?"venture-feed":`${n.namespace}.${n.radset}.${n.radId}`}catch{return"unknown"}}static getRADDisplayName(t){return{"venture-feed":"Venture Feed","pandc.vnext.recommendations":"Recommendations","pandc.vnext.metricsevolved":"Metrics Evolved","pandc.vnext.cart":"Cart Recommendations","pandc.vnext.product":"Product Recommendations","pandc.vnext.discovery":"Discovery","pandc.vnext.search":"Search"}[t]||this.humanize(t.split(".").pop()||t)}static getDisplayName(t){try{const r=this.parse(t),n=[];return r.radId&&n.push(this.humanize(r.radId)),r.subaction&&n.push(this.humanize(r.subaction)),r.action&&n.push(this.humanize(r.action)),n.join(" - ")}catch{return t}}static humanize(t){return t.replace(/([A-Z])/g," $1").replace(/_/g," ").replace(/\s+/g," ").trim().toLowerCase().replace(/^\w/,r=>r.toUpperCase())}static getHierarchyPath(t){try{const r=this.parse(t),n=[];return r.namespace&&n.push(r.namespace),r.radset&&n.push(r.radset),r.radId&&n.push(r.radId),r.subaction&&n.push(r.subaction),r.action&&n.push(r.action),n}catch{return[t]}}static isSameRAD(t,r){try{const n=this.parse(t),s=this.parse(r);return n.namespace===s.namespace&&n.radset===s.radset&&n.radId===s.radId}catch{return!1}}static isSameRADSet(t,r){try{const n=this.parse(t),s=this.parse(r);return n.namespace===s.namespace&&n.radset===s.radset}catch{return!1}}static createMetadata(t,r){const n=this.parse(t);return{eid:t,namespace:n.namespace||this.DEFAULT_NAMESPACE,radset:n.radset||this.DEFAULT_RADSET,radId:n.radId||"unknown",subaction:n.subaction,action:n.action,lastSeen:new Date,frequency:0,...r}}}p(T,"DEFAULT_NAMESPACE","pandc"),p(T,"DEFAULT_RADSET","vnext");class yt{constructor(t){p(this,"container");p(this,"selectedRADs");p(this,"radCounts");p(this,"onFilterChange");this.container=t,this.selectedRADs=new Set,this.onFilterChange=null,this.radCounts=new Map}init(t=[]){this.updateRADCounts(t),this.render()}updateRADCounts(t){this.radCounts.clear(),t.forEach(r=>{const n=r.event_id||r.eventId||r.eid||r.id||"",s=T.extractRADIdentifier(n);this.radCounts.has(s)||this.radCounts.set(s,{count:0,displayName:T.getRADDisplayName(s)});const a=this.radCounts.get(s);a&&a.count++})}render(){if(!this.container)return;const t=this.radCounts.size,r=this.selectedRADs.size;let n=`
      <div class="rad-filter">
        <div class="rad-filter-header">
          <span class="rad-filter-title">RAD Types (${r}/${t})</span>
          ${r>0?'<button class="rad-filter-clear" data-action="clear-all">Clear</button>':""}
        </div>
        <div class="rad-filter-chips">
    `;Array.from(this.radCounts.entries()).sort((a,i)=>i[1].count-a[1].count).forEach(([a,i])=>{const o=this.selectedRADs.has(a);n+=this.createChipHTML(a,i,o)}),n+="</div></div>",this.container.innerHTML=n,this.attachEventListeners()}createChipHTML(t,r,n){return`
      <div class="rad-chip ${n?"selected":""}" data-rad-id="${t}">
        <span class="rad-chip-name">${r.displayName}</span>
        <span class="rad-chip-count">${r.count}</span>
      </div>
    `}attachEventListeners(){this.container.querySelectorAll(".rad-chip").forEach(n=>{n.addEventListener("click",s=>{const i=s.currentTarget.dataset.radId;i&&this.toggleRAD(i)})});const r=this.container.querySelector('[data-action="clear-all"]');r&&r.addEventListener("click",()=>{this.clearAll()})}toggleRAD(t){this.selectedRADs.has(t)?this.selectedRADs.delete(t):this.selectedRADs.add(t),this.render(),this.notifyFilterChange()}clearAll(){this.selectedRADs.clear(),this.render(),this.notifyFilterChange()}notifyFilterChange(){if(this.onFilterChange){const t=Array.from(this.selectedRADs);this.onFilterChange(t)}}update(t){this.updateRADCounts(t),this.render()}getActiveFilters(){return Array.from(this.selectedRADs)}setActiveFilters(t){this.selectedRADs=new Set(t),this.render()}}typeof window<"u"&&(window.RADFilter=yt);const J=e=>{let t;const r=new Set,n=(u,d)=>{const g=typeof u=="function"?u(t):u;if(!Object.is(g,t)){const w=t;t=d??(typeof g!="object"||g===null)?g:Object.assign({},t,g),r.forEach(S=>S(t,w))}},s=()=>t,o={setState:n,getState:s,getInitialState:()=>c,subscribe:u=>(r.add(u),()=>r.delete(u))},c=t=e(n,s,o);return o},vt=e=>e?J(e):J;function bt(e){return e&&e.__esModule&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e}var nt={exports:{}},l={};/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var _=Symbol.for("react.element"),St=Symbol.for("react.portal"),Et=Symbol.for("react.fragment"),wt=Symbol.for("react.strict_mode"),At=Symbol.for("react.profiler"),It=Symbol.for("react.provider"),Dt=Symbol.for("react.context"),Rt=Symbol.for("react.forward_ref"),Ct=Symbol.for("react.suspense"),Lt=Symbol.for("react.memo"),Tt=Symbol.for("react.lazy"),X=Symbol.iterator;function $t(e){return e===null||typeof e!="object"?null:(e=X&&e[X]||e["@@iterator"],typeof e=="function"?e:null)}var st={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},at=Object.assign,it={};function L(e,t,r){this.props=e,this.context=t,this.refs=it,this.updater=r||st}L.prototype.isReactComponent={};L.prototype.setState=function(e,t){if(typeof e!="object"&&typeof e!="function"&&e!=null)throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,e,t,"setState")};L.prototype.forceUpdate=function(e){this.updater.enqueueForceUpdate(this,e,"forceUpdate")};function ot(){}ot.prototype=L.prototype;function V(e,t,r){this.props=e,this.context=t,this.refs=it,this.updater=r||st}var G=V.prototype=new ot;G.constructor=V;at(G,L.prototype);G.isPureReactComponent=!0;var K=Array.isArray,ct=Object.prototype.hasOwnProperty,B={current:null},lt={key:!0,ref:!0,__self:!0,__source:!0};function dt(e,t,r){var n,s={},a=null,i=null;if(t!=null)for(n in t.ref!==void 0&&(i=t.ref),t.key!==void 0&&(a=""+t.key),t)ct.call(t,n)&&!lt.hasOwnProperty(n)&&(s[n]=t[n]);var o=arguments.length-2;if(o===1)s.children=r;else if(1<o){for(var c=Array(o),u=0;u<o;u++)c[u]=arguments[u+2];s.children=c}if(e&&e.defaultProps)for(n in o=e.defaultProps,o)s[n]===void 0&&(s[n]=o[n]);return{$$typeof:_,type:e,key:a,ref:i,props:s,_owner:B.current}}function _t(e,t){return{$$typeof:_,type:e.type,key:t,ref:e.ref,props:e.props,_owner:e._owner}}function z(e){return typeof e=="object"&&e!==null&&e.$$typeof===_}function Nt(e){var t={"=":"=0",":":"=2"};return"$"+e.replace(/[=:]/g,function(r){return t[r]})}var Z=/\/+/g;function j(e,t){return typeof e=="object"&&e!==null&&e.key!=null?Nt(""+e.key):t.toString(36)}function x(e,t,r,n,s){var a=typeof e;(a==="undefined"||a==="boolean")&&(e=null);var i=!1;if(e===null)i=!0;else switch(a){case"string":case"number":i=!0;break;case"object":switch(e.$$typeof){case _:case St:i=!0}}if(i)return i=e,s=s(i),e=n===""?"."+j(i,0):n,K(s)?(r="",e!=null&&(r=e.replace(Z,"$&/")+"/"),x(s,t,r,"",function(u){return u})):s!=null&&(z(s)&&(s=_t(s,r+(!s.key||i&&i.key===s.key?"":(""+s.key).replace(Z,"$&/")+"/")+e)),t.push(s)),1;if(i=0,n=n===""?".":n+":",K(e))for(var o=0;o<e.length;o++){a=e[o];var c=n+j(a,o);i+=x(a,t,r,c,s)}else if(c=$t(e),typeof c=="function")for(e=c.call(e),o=0;!(a=e.next()).done;)a=a.value,c=n+j(a,o++),i+=x(a,t,r,c,s);else if(a==="object")throw t=String(e),Error("Objects are not valid as a React child (found: "+(t==="[object Object]"?"object with keys {"+Object.keys(e).join(", ")+"}":t)+"). If you meant to render a collection of children, use an array instead.");return i}function N(e,t,r){if(e==null)return e;var n=[],s=0;return x(e,n,"","",function(a){return t.call(r,a,s++)}),n}function Ot(e){if(e._status===-1){var t=e._result;t=t(),t.then(function(r){(e._status===0||e._status===-1)&&(e._status=1,e._result=r)},function(r){(e._status===0||e._status===-1)&&(e._status=2,e._result=r)}),e._status===-1&&(e._status=0,e._result=t)}if(e._status===1)return e._result.default;throw e._result}var b={current:null},F={transition:null},xt={ReactCurrentDispatcher:b,ReactCurrentBatchConfig:F,ReactCurrentOwner:B};function ut(){throw Error("act(...) is not supported in production builds of React.")}l.Children={map:N,forEach:function(e,t,r){N(e,function(){t.apply(this,arguments)},r)},count:function(e){var t=0;return N(e,function(){t++}),t},toArray:function(e){return N(e,function(t){return t})||[]},only:function(e){if(!z(e))throw Error("React.Children.only expected to receive a single React element child.");return e}};l.Component=L;l.Fragment=Et;l.Profiler=At;l.PureComponent=V;l.StrictMode=wt;l.Suspense=Ct;l.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=xt;l.act=ut;l.cloneElement=function(e,t,r){if(e==null)throw Error("React.cloneElement(...): The argument must be a React element, but you passed "+e+".");var n=at({},e.props),s=e.key,a=e.ref,i=e._owner;if(t!=null){if(t.ref!==void 0&&(a=t.ref,i=B.current),t.key!==void 0&&(s=""+t.key),e.type&&e.type.defaultProps)var o=e.type.defaultProps;for(c in t)ct.call(t,c)&&!lt.hasOwnProperty(c)&&(n[c]=t[c]===void 0&&o!==void 0?o[c]:t[c])}var c=arguments.length-2;if(c===1)n.children=r;else if(1<c){o=Array(c);for(var u=0;u<c;u++)o[u]=arguments[u+2];n.children=o}return{$$typeof:_,type:e.type,key:s,ref:a,props:n,_owner:i}};l.createContext=function(e){return e={$$typeof:Dt,_currentValue:e,_currentValue2:e,_threadCount:0,Provider:null,Consumer:null,_defaultValue:null,_globalName:null},e.Provider={$$typeof:It,_context:e},e.Consumer=e};l.createElement=dt;l.createFactory=function(e){var t=dt.bind(null,e);return t.type=e,t};l.createRef=function(){return{current:null}};l.forwardRef=function(e){return{$$typeof:Rt,render:e}};l.isValidElement=z;l.lazy=function(e){return{$$typeof:Tt,_payload:{_status:-1,_result:e},_init:Ot}};l.memo=function(e,t){return{$$typeof:Lt,type:e,compare:t===void 0?null:t}};l.startTransition=function(e){var t=F.transition;F.transition={};try{e()}finally{F.transition=t}};l.unstable_act=ut;l.useCallback=function(e,t){return b.current.useCallback(e,t)};l.useContext=function(e){return b.current.useContext(e)};l.useDebugValue=function(){};l.useDeferredValue=function(e){return b.current.useDeferredValue(e)};l.useEffect=function(e,t){return b.current.useEffect(e,t)};l.useId=function(){return b.current.useId()};l.useImperativeHandle=function(e,t,r){return b.current.useImperativeHandle(e,t,r)};l.useInsertionEffect=function(e,t){return b.current.useInsertionEffect(e,t)};l.useLayoutEffect=function(e,t){return b.current.useLayoutEffect(e,t)};l.useMemo=function(e,t){return b.current.useMemo(e,t)};l.useReducer=function(e,t,r){return b.current.useReducer(e,t,r)};l.useRef=function(e){return b.current.useRef(e)};l.useState=function(e){return b.current.useState(e)};l.useSyncExternalStore=function(e,t,r){return b.current.useSyncExternalStore(e,t,r)};l.useTransition=function(){return b.current.useTransition()};l.version="18.3.1";nt.exports=l;var Ft=nt.exports;const Q=bt(Ft),kt=e=>e;function Mt(e,t=kt){const r=Q.useSyncExternalStore(e.subscribe,()=>t(e.getState()),()=>t(e.getInitialState()));return Q.useDebugValue(r),r}const Pt=e=>{const t=vt(e),r=n=>Mt(t,n);return Object.assign(r,t),r},Ut=e=>Pt,Y={BASE_URL:"/",DEV:!1,MODE:"production",PROD:!0,SSR:!1},$=new Map,O=e=>{const t=$.get(e);return t?Object.fromEntries(Object.entries(t.stores).map(([r,n])=>[r,n.getState()])):{}},jt=(e,t,r)=>{if(e===void 0)return{type:"untracked",connection:t.connect(r)};const n=$.get(r.name);if(n)return{type:"tracked",store:e,...n};const s={connection:t.connect(r),stores:{}};return $.set(r.name,s),{type:"tracked",store:e,...s}},qt=(e,t)=>{if(t===void 0)return;const r=$.get(e);r&&(delete r.stores[t],Object.keys(r.stores).length===0&&$.delete(e))},Ht=e=>{var t,r;if(!e)return;const n=e.split(`
`),s=n.findIndex(i=>i.includes("api.setState"));if(s<0)return;const a=((t=n[s+1])==null?void 0:t.trim())||"";return(r=/.+ (.+) .+/.exec(a))==null?void 0:r[1]},Wt=(e,t={})=>(r,n,s)=>{const{enabled:a,anonymousActionType:i,store:o,...c}=t;let u;try{u=(a??(Y?"production":void 0)!=="production")&&window.__REDUX_DEVTOOLS_EXTENSION__}catch{}if(!u)return e(r,n,s);const{connection:d,...g}=jt(o,u,c);let w=!0;s.setState=(y,A,h)=>{const E=r(y,A);if(!w)return E;const U=h===void 0?{type:i||Ht(new Error().stack)||"anonymous"}:typeof h=="string"?{type:h}:h;return o===void 0?(d==null||d.send(U,n()),E):(d==null||d.send({...U,type:`${o}/${U.type}`},{...O(c.name),[o]:s.getState()}),E)},s.devtools={cleanup:()=>{d&&typeof d.unsubscribe=="function"&&d.unsubscribe(),qt(c.name,o)}};const S=(...y)=>{const A=w;w=!1,r(...y),w=A},C=e(s.setState,n,s);if(g.type==="untracked"?d==null||d.init(C):(g.stores[g.store]=s,d==null||d.init(Object.fromEntries(Object.entries(g.stores).map(([y,A])=>[y,y===g.store?C:A.getState()])))),s.dispatchFromDevtools&&typeof s.dispatch=="function"){let y=!1;const A=s.dispatch;s.dispatch=(...h)=>{(Y?"production":void 0)!=="production"&&h[0].type==="__setState"&&!y&&(console.warn('[zustand devtools middleware] "__setState" action type is reserved to set state from the devtools. Avoid using it.'),y=!0),A(...h)}}return d.subscribe(y=>{var A;switch(y.type){case"ACTION":if(typeof y.payload!="string"){console.error("[zustand devtools middleware] Unsupported action format");return}return q(y.payload,h=>{if(h.type==="__setState"){if(o===void 0){S(h.state);return}Object.keys(h.state).length!==1&&console.error(`
                    [zustand devtools middleware] Unsupported __setState action format.
                    When using 'store' option in devtools(), the 'state' should have only one key, which is a value of 'store' that was passed in devtools(),
                    and value of this only key should be a state object. Example: { "type": "__setState", "state": { "abc123Store": { "foo": "bar" } } }
                    `);const E=h.state[o];if(E==null)return;JSON.stringify(s.getState())!==JSON.stringify(E)&&S(E);return}s.dispatchFromDevtools&&typeof s.dispatch=="function"&&s.dispatch(h)});case"DISPATCH":switch(y.payload.type){case"RESET":return S(C),o===void 0?d==null?void 0:d.init(s.getState()):d==null?void 0:d.init(O(c.name));case"COMMIT":if(o===void 0){d==null||d.init(s.getState());return}return d==null?void 0:d.init(O(c.name));case"ROLLBACK":return q(y.state,h=>{if(o===void 0){S(h),d==null||d.init(s.getState());return}S(h[o]),d==null||d.init(O(c.name))});case"JUMP_TO_STATE":case"JUMP_TO_ACTION":return q(y.state,h=>{if(o===void 0){S(h);return}JSON.stringify(s.getState())!==JSON.stringify(h[o])&&S(h[o])});case"IMPORT_STATE":{const{nextLiftedState:h}=y.payload,E=(A=h.computedStates.slice(-1)[0])==null?void 0:A.state;if(!E)return;S(o===void 0?E:E[o]),d==null||d.send(null,h);return}case"PAUSE_RECORDING":return w=!w}return}}),C},Vt=Wt,q=(e,t)=>{let r;try{r=JSON.parse(e)}catch(n){console.error("[zustand devtools middleware] Could not parse the received json",n)}r!==void 0&&t(r)},Gt=e=>(t,r,n)=>{const s=n.subscribe;return n.subscribe=(i,o,c)=>{let u=i;if(o){const d=(c==null?void 0:c.equalityFn)||Object.is;let g=i(n.getState());u=w=>{const S=i(w);if(!d(g,S)){const C=g;o(g=S,C)}},c!=null&&c.fireImmediately&&o(g,g)}return s(u)},e(t,r,n)},Bt=Gt;class zt{constructor(){p(this,"baseURL");p(this,"headers");this.baseURL="/api/v1",this.headers={"Content-Type":"application/json"}}async request(t,r={}){const n=`${this.baseURL}${t}`;try{const s=await fetch(n,{...r,headers:{...this.headers,...r.headers},credentials:"include"});if(!s.ok){const a=await s.text();throw console.error(`🔍 API ERROR: ${r.method||"GET"} ${n} - ${s.status} - ${a}`),new Error(`API Error: ${s.status} - ${a}`)}return s.json()}catch(s){throw console.error(`🔍 API CATCH: ${r.method||"GET"} ${n}`,s),s}}async fetchDashboardData(t){try{return await this.request("/dashboard/query",{method:"POST",body:JSON.stringify(t)})}catch{return console.warn("Backend not available, using mock data"),this.getMockData()}}getMockData(){const t=[{id:"EID-001",name:"User Login Events",radType:"login",status:"CRITICAL",score:-85,current:150,baseline:1e3,impact:"High",timestamp:new Date().toISOString(),kibanaUrl:"#"},{id:"EID-002",name:"API Health Check",radType:"api_call",status:"NORMAL",score:5,current:5250,baseline:5e3,impact:"Low",timestamp:new Date().toISOString(),kibanaUrl:"#"},{id:"EID-003",name:"Product Page Views",radType:"page_view",status:"WARNING",score:-60,current:400,baseline:1e3,impact:"Medium",timestamp:new Date().toISOString(),kibanaUrl:"#"},{id:"EID-004",name:"File Downloads",radType:"file_download",status:"INCREASED",score:120,current:2400,baseline:1e3,impact:"Low",timestamp:new Date().toISOString(),kibanaUrl:"#"}];return{data:t,metadata:{took:15,total_hits:t.length},cached:!1,query_time_ms:15}}async fetchConfigSettings(){return this.request("/config/settings")}async checkAuthStatus(){return this.request("/auth/status")}async checkHealth(){const t=await fetch("/health",{credentials:"include"});if(!t.ok){const r=await t.text();throw new Error(`API Error: ${t.status} - ${r}`)}return t.json()}}const tt=new zt;var v=(e=>(e.LOGIN="login",e.API_CALL="api_call",e.PAGE_VIEW="page_view",e.FILE_DOWNLOAD="file_download",e.CUSTOM="custom",e))(v||{}),f=(e=>(e.CRITICAL="CRITICAL",e.WARNING="WARNING",e.NORMAL="NORMAL",e.INCREASED="INCREASED",e))(f||{}),k=(e=>(e.HIGH="High",e.MEDIUM="Medium",e.LOW="Low",e))(k||{});function Jt(e){const{status:t,radType:r,impact:n}=e;return{...e,radColor:Xt(t),radDisplayName:Kt(r),impactClass:Zt(n)}}function Xt(e){return{[f.CRITICAL]:"#dc3545",[f.WARNING]:"#fd7e14",[f.NORMAL]:"#28a745",[f.INCREASED]:"#007bff"}[e]||"#6c757d"}function Kt(e){return{[v.LOGIN]:"Login Events",[v.API_CALL]:"API Calls",[v.PAGE_VIEW]:"Page Views",[v.FILE_DOWNLOAD]:"File Downloads",[v.CUSTOM]:"Custom Events"}[e]||e}function Zt(e){return{[k.HIGH]:"impact-high",[k.MEDIUM]:"impact-medium",[k.LOW]:"impact-low"}[e]||"impact-low"}function D(e){let t=0,r=0,n=0,s=0;return e.forEach(a=>{switch(a.status){case f.CRITICAL:t++;break;case f.WARNING:r++;break;case f.NORMAL:n++;break;case f.INCREASED:s++;break}}),{critical:t,warning:r,normal:n,increased:s,total:e.length}}function R(e,t){let r=[...e];if(t.search){const n=t.search.toLowerCase();r=r.filter(s=>s.name.toLowerCase().includes(n)||s.id.toLowerCase().includes(n))}return t.status!=="all"&&(r=r.filter(n=>n.status===t.status)),t.radTypes.length>0&&(r=r.filter(n=>t.radTypes.includes(n.radType))),t.radFilters.length>0&&window.EIDParser&&(r=r.filter(n=>{const s=window.EIDParser.extractRADIdentifier(n.id);return t.radFilters.includes(s)})),r}function W(e){return e.toLocaleString()}function Qt(e){return`${e>0?"+":""}${e.toFixed(1)}%`}function Yt(e){return new Date(e).toLocaleString()}function te(e,t){return t===0?e>0?100:0:(e-t)/t*100}function pt(e,t){let r;return function(...s){const a=()=>{clearTimeout(r),e(...s)};clearTimeout(r),r=setTimeout(a,t)}}const et={baselineStart:"now-60d",baselineEnd:"now-30d",timeRange:"now-24h",criticalThreshold:-30,warningThreshold:-20,highVolumeThreshold:50,mediumVolumeThreshold:30,refreshInterval:3e4,enableAutoRefresh:!0},H={search:"",status:"all",radTypes:[],radFilters:[]},m=Ut()(Vt(Bt((e,t)=>({events:[],filteredEvents:[],stats:{critical:0,warning:0,normal:0,increased:0,total:0},filters:H,config:et,theme:{isDark:localStorage.getItem("theme")==="dark"},isLoading:!1,lastUpdate:null,lastUpdateWasCached:!1,error:null,loadData:async()=>{e({isLoading:!0,error:null});try{const r=await tt.fetchDashboardData({query:{size:1e4,query:{bool:{must:[{range:{timestamp:{gte:t().config.timeRange}}}]}}},force_refresh:!1}),n=r.data,s=R(n,t().filters),a=D(s);e({events:n,filteredEvents:s,stats:a,lastUpdate:new Date,lastUpdateWasCached:r.cached,isLoading:!1})}catch(r){e({error:r instanceof Error?r.message:"Failed to load data",isLoading:!1})}},refresh:async()=>{e({isLoading:!0,error:null});try{const r=await tt.fetchDashboardData({query:{size:1e4,query:{bool:{must:[{range:{timestamp:{gte:t().config.timeRange}}}]}}},force_refresh:!0}),n=r.data,s=R(n,t().filters),a=D(s);e({events:n,filteredEvents:s,stats:a,lastUpdate:new Date,lastUpdateWasCached:r.cached,isLoading:!1})}catch(r){e({error:r instanceof Error?r.message:"Failed to load data",isLoading:!1})}},setSearchFilter:r=>{e(n=>{const s={...n.filters,search:r},a=R(n.events,s),i=D(a);return{filters:s,filteredEvents:a,stats:i}})},setStatusFilter:r=>{e(n=>{const s={...n.filters,status:r},a=R(n.events,s),i=D(a);return{filters:s,filteredEvents:a,stats:i}})},toggleRADTypeFilter:r=>{e(n=>{const s=n.filters.radTypes.includes(r)?n.filters.radTypes.filter(c=>c!==r):[...n.filters.radTypes,r],a={...n.filters,radTypes:s},i=R(n.events,a),o=D(i);return{filters:a,filteredEvents:i,stats:o}})},clearFilters:()=>{e(r=>{const n=R(r.events,H),s=D(n);return{filters:H,filteredEvents:n,stats:s}})},setRADFilters:r=>{e(n=>{const s={...n.filters,radFilters:r},a=R(n.events,s),i=D(a);return{filters:s,filteredEvents:a,stats:i}})},updateConfig:r=>{e(n=>({config:{...n.config,...r}}))},resetConfig:()=>{e({config:et})},toggleTheme:()=>{e(r=>{const n=!r.theme.isDark;return localStorage.setItem("theme",n?"dark":"light"),document.documentElement.setAttribute("data-theme",n?"dark":"light"),{theme:{isDark:n}}})},showNotification:r=>{console.log("Notification:",r)}})),{name:"rad-monitor-store"}));let M=null;const ht=()=>{const e=m.getState();e.config.enableAutoRefresh&&e.config.refreshInterval>0&&(M=setInterval(()=>{m.getState().refresh()},e.config.refreshInterval))},ee=()=>{M&&(clearInterval(M),M=null)};m.subscribe(e=>e.config,e=>{ee(),e.enableAutoRefresh&&ht()});if(typeof window<"u"){const e=m.getState().theme.isDark;document.documentElement.setAttribute("data-theme",e?"dark":"light")}class re{constructor(){p(this,"container");p(this,"isOpen",!1);p(this,"mappings",[]);this.container=document.createElement("div"),this.container.className="eid-registry-container",this.loadMappings()}async loadMappings(){try{const t=await fetch("/api/v1/eid-registry");if(t.ok){const r=await t.json();this.mappings=r.mappings.map(n=>({...n,addedAt:new Date(n.added_at)}))}else{const r=localStorage.getItem("eid-mappings");r&&(this.mappings=JSON.parse(r).map(n=>({...n,addedAt:new Date(n.addedAt)})))}}catch(t){console.error("Failed to load EID mappings:",t);const r=localStorage.getItem("eid-mappings");r&&(this.mappings=JSON.parse(r).map(n=>({...n,addedAt:new Date(n.addedAt)})))}}async saveMappings(){localStorage.setItem("eid-mappings",JSON.stringify(this.mappings)),m.getState().refresh()}render(){return this.container.innerHTML=`
      <button class="btn btn-secondary" id="registry-toggle" title="Manage EID Registry">
        📋 EID Registry
      </button>
      
      ${this.isOpen?this.renderModal():""}
    `,this.attachEventHandlers(),this.container}renderModal(){return`
      <div class="modal-backdrop" id="registry-backdrop">
        <div class="modal">
          <div class="modal-header">
            <h2>EID Registry</h2>
            <button class="btn btn-icon" id="close-registry">✕</button>
          </div>
          
          <div class="modal-body">
            <!-- Add New EID Form -->
            <div class="card mb-md">
              <h3>Add New EID Mapping</h3>
              <form id="add-eid-form" class="form-grid">
                <div class="form-group">
                  <label for="new-eid">EID Pattern</label>
                  <input 
                    type="text" 
                    id="new-eid" 
                    class="input" 
                    placeholder="e.g., USER_LOGIN_EVENT"
                    required
                  />
                  <small class="text-muted">Enter the Event ID pattern</small>
                </div>
                
                <div class="form-group">
                  <label for="new-rad-type">RAD Type</label>
                  <select id="new-rad-type" class="input" required>
                    <option value="">Select RAD Type</option>
                    ${["login","api_call","page_view","file_download","custom"].map(r=>`
                      <option value="${r}">${this.formatRadType(r)}</option>
                    `).join("")}
                  </select>
                </div>
                
                <div class="form-group">
                  <label for="new-description">Description (Optional)</label>
                  <input 
                    type="text" 
                    id="new-description" 
                    class="input" 
                    placeholder="Brief description"
                  />
                </div>
                
                <button type="submit" class="btn btn-primary">Add Mapping</button>
              </form>
            </div>
            
            <!-- Existing Mappings -->
            <div class="card">
              <h3>Current Mappings (${this.mappings.length})</h3>
              ${this.mappings.length>0?`
                <div class="table-container">
                  <table class="table">
                    <thead>
                      <tr>
                        <th>EID</th>
                        <th>RAD Type</th>
                        <th>Description</th>
                        <th>Added</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${this.mappings.map((r,n)=>`
                        <tr>
                          <td><code>${r.eid}</code></td>
                          <td>
                            <span class="rad-type-badge" style="background: ${this.getRadColor(r.radType)}">
                              ${this.formatRadType(r.radType)}
                            </span>
                          </td>
                          <td>${r.description||"-"}</td>
                          <td>${this.formatDate(r.addedAt)}</td>
                          <td>
                            <button class="btn btn-sm btn-danger" data-delete-index="${n}">
                              Delete
                            </button>
                          </td>
                        </tr>
                      `).join("")}
                    </tbody>
                  </table>
                </div>
              `:`
                <p class="text-muted">No mappings added yet. Add your first EID mapping above.</p>
              `}
            </div>
            
            <!-- Import/Export -->
            <div class="card mt-md">
              <h3>Import/Export</h3>
              <div class="flex gap-md">
                <button class="btn btn-secondary" id="export-mappings">
                  Export Mappings
                </button>
                <button class="btn btn-secondary" id="import-mappings">
                  Import Mappings
                </button>
                <input type="file" id="import-file" accept=".json" style="display: none;" />
              </div>
            </div>
          </div>
        </div>
      </div>
    `}attachEventHandlers(){const t=this.container.querySelector("#registry-toggle");t==null||t.addEventListener("click",()=>{this.isOpen=!this.isOpen,this.render()});const r=this.container.querySelector("#close-registry"),n=this.container.querySelector("#registry-backdrop");r==null||r.addEventListener("click",()=>{this.isOpen=!1,this.render()}),n==null||n.addEventListener("click",c=>{c.target===n&&(this.isOpen=!1,this.render())});const s=this.container.querySelector("#add-eid-form");s==null||s.addEventListener("submit",c=>{c.preventDefault();const u=s.querySelector("#new-eid").value,d=s.querySelector("#new-rad-type").value,g=s.querySelector("#new-description").value;this.addMapping({eid:u,radType:d,description:g,addedAt:new Date}),s.reset()}),this.container.querySelectorAll("[data-delete-index]").forEach(c=>{c.addEventListener("click",u=>{const d=parseInt(u.target.dataset.deleteIndex);this.deleteMapping(d)})});const a=this.container.querySelector("#export-mappings");a==null||a.addEventListener("click",()=>this.exportMappings());const i=this.container.querySelector("#import-mappings"),o=this.container.querySelector("#import-file");i==null||i.addEventListener("click",()=>o==null?void 0:o.click()),o==null||o.addEventListener("change",c=>this.importMappings(c))}async addMapping(t){if(this.mappings.some(r=>r.eid===t.eid)){alert("This EID is already mapped!");return}try{const r=await fetch("/api/v1/eid-registry",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({eid:t.eid,rad_type:t.radType,description:t.description})});if(r.ok)this.mappings.push(t),await this.saveMappings(),this.render();else{const n=await r.json();alert(n.detail||"Failed to add mapping")}}catch{this.mappings.push(t),await this.saveMappings(),this.render()}}async deleteMapping(t){if(confirm("Are you sure you want to delete this mapping?")){const r=this.mappings[t];try{const n=await fetch(`/api/v1/eid-registry/${encodeURIComponent(r.eid)}`,{method:"DELETE"});if(n.ok)this.mappings.splice(t,1),await this.saveMappings(),this.render();else{const s=await n.json();alert(s.detail||"Failed to delete mapping")}}catch{this.mappings.splice(t,1),await this.saveMappings(),this.render()}}}exportMappings(){const t=JSON.stringify(this.mappings,null,2),r=new Blob([t],{type:"application/json"}),n=URL.createObjectURL(r),s=document.createElement("a");s.href=n,s.download=`eid-mappings-${new Date().toISOString().split("T")[0]}.json`,s.click(),URL.revokeObjectURL(n)}async importMappings(t){var n;const r=(n=t.target.files)==null?void 0:n[0];if(r)try{const s=await r.text(),a=JSON.parse(s);if(!Array.isArray(a))throw new Error("Invalid format");const i=a.filter(o=>o.eid&&o.radType&&typeof o.eid=="string");i.forEach(o=>{this.mappings.some(c=>c.eid===o.eid)||this.mappings.push({...o,addedAt:new Date(o.addedAt||Date.now())})}),this.saveMappings(),this.render(),alert(`Imported ${i.length} mappings successfully!`)}catch{alert("Failed to import mappings. Please check the file format.")}}formatRadType(t){return t.replace(/_/g," ").replace(/\b\w/g,r=>r.toUpperCase())}getRadColor(t){return{login:"#6B7280",api_call:"#3B82F6",page_view:"#10B981",file_download:"#F59E0B",custom:"#8B5CF6"}[t]||"#6B7280"}formatDate(t){return t.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}destroy(){}}class ne{constructor(){p(this,"container");p(this,"refreshInterval",null);p(this,"eidRegistry");this.container=document.createElement("div"),this.container.className="control-panel flex gap-md items-center",this.eidRegistry=new re,this.setupEventListeners()}setupEventListeners(){this.updateConfig=pt(this.updateConfig.bind(this),500)}render(){const t=m.getState(),{theme:r,config:n,lastUpdate:s,lastUpdateWasCached:a}=t;this.container.innerHTML=`
      <div class="flex gap-sm items-center">
        <!-- Theme Toggle -->
        <button
          class="btn btn-secondary"
          title="Toggle theme"
          id="theme-toggle"
        >
          ${r.isDark?"☀️":"🌙"}
        </button>

        <!-- Refresh Button -->
        <button
          class="btn btn-secondary"
          title="Refresh data"
          id="refresh-btn"
        >
          🔄 Refresh
        </button>

        <!-- Auto Refresh Toggle -->
        <label class="flex items-center gap-sm">
          <input
            type="checkbox"
            id="auto-refresh-toggle"
            ${n.enableAutoRefresh?"checked":""}
          />
          <span class="text-small">Auto-refresh</span>
        </label>

        <!-- Refresh Interval -->
        ${n.enableAutoRefresh?`
          <select
            id="refresh-interval"
            class="input input-sm"
            style="width: auto;"
          >
            <option value="10000" ${n.refreshInterval===1e4?"selected":""}>10s</option>
            <option value="30000" ${n.refreshInterval===3e4?"selected":""}>30s</option>
            <option value="60000" ${n.refreshInterval===6e4?"selected":""}>1m</option>
            <option value="300000" ${n.refreshInterval===3e5?"selected":""}>5m</option>
          </select>
        `:""}

        <!-- Last Update -->
        ${s?`
          <span class="text-small text-muted">
            Last updated: ${this.formatLastUpdate(s)}
            ${a?'<span style="color: #f59e0b; margin-left: 8px;" title="Data was served from cache">(cached)</span>':'<span style="color: #10b981; margin-left: 8px;" title="Fresh data from Elasticsearch">(fresh)</span>'}
          </span>
        `:""}
      </div>

      <!-- EID Registry Button Container -->
      <div id="eid-registry-container"></div>

      <!-- Settings Button -->
      <button
        class="btn btn-secondary"
        title="Settings"
        id="settings-btn"
      >
        ⚙️
      </button>
    `,this.attachEventHandlers();const i=this.container.querySelector("#eid-registry-container");return i&&i.appendChild(this.eidRegistry.render()),this.container}attachEventHandlers(){const t=m.getState(),r=this.container.querySelector("#theme-toggle");r==null||r.addEventListener("click",()=>{t.toggleTheme(),this.render()});const n=this.container.querySelector("#refresh-btn");n==null||n.addEventListener("click",()=>{t.refresh()});const s=this.container.querySelector("#auto-refresh-toggle");s==null||s.addEventListener("change",o=>{const c=o.target;t.updateConfig({enableAutoRefresh:c.checked}),this.render()});const a=this.container.querySelector("#refresh-interval");a==null||a.addEventListener("change",o=>{const c=o.target;t.updateConfig({refreshInterval:parseInt(c.value)})});const i=this.container.querySelector("#settings-btn");i==null||i.addEventListener("click",()=>{this.showSettingsModal()})}updateConfig(t){m.getState().updateConfig(t)}formatLastUpdate(t){const r={timeZone:"America/Los_Angeles",year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!0};return`${t.toLocaleString("en-US",r)} PDT`}showSettingsModal(){console.log("Settings modal not yet implemented"),m.getState().showNotification({message:"Settings panel coming soon!",type:"info"})}destroy(){this.eidRegistry.destroy()}}class se{constructor(){p(this,"container");this.container=document.createElement("div"),this.container.className="summary-cards grid grid-cols-4 gap-md"}render(){const{stats:t}=m.getState(),r=[{label:"Critical",value:t.critical,subtitle:"Events below -30%",variant:f.CRITICAL,className:"summary-card-critical"},{label:"Warning",value:t.warning,subtitle:"Events below -20%",variant:f.WARNING,className:"summary-card-warning"},{label:"Normal",value:t.normal,subtitle:"Events within range",variant:f.NORMAL,className:"summary-card-normal"},{label:"Increased",value:t.increased,subtitle:"Events above baseline",variant:f.INCREASED,className:"summary-card-increased"}];return this.container.innerHTML=r.map(n=>this.renderCard(n)).join(""),this.container}renderCard(t){const{label:r,value:n,subtitle:s,variant:a,className:i=""}=t,o=`status-${a.toLowerCase()}`;return`
      <div class="card summary-card ${i}">
        <div class="flex justify-between items-start mb-sm">
          <h3 class="text-lg">${r}</h3>
          <span class="status-indicator ${o}">
            ${a}
          </span>
        </div>
        <div class="summary-value text-3xl font-bold mb-sm">
          ${W(n)}
        </div>
        <div class="text-small text-muted">
          ${s}
        </div>
      </div>
    `}destroy(){}}class ae{constructor(){p(this,"container");p(this,"sortField","score");p(this,"sortDirection","asc");this.container=document.createElement("div"),this.container.className="events-table-container"}render(){const{filteredEvents:t,isLoading:r}=m.getState();if(r)return this.container.innerHTML=this.renderLoading(),this.container;if(t.length===0)return this.container.innerHTML=this.renderEmpty(),this.container;const n=t.map(Jt).sort((s,a)=>this.sortEvents(s,a));return this.container.innerHTML=`
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th class="text-center">#</th>
              <th class="sortable" data-field="id">
                EID
                ${this.renderSortIcon("id")}
              </th>
              <th class="sortable" data-field="name">
                Event Name
                ${this.renderSortIcon("name")}
              </th>
              <th class="sortable" data-field="radType">
                Type
                ${this.renderSortIcon("radType")}
              </th>
              <th class="sortable" data-field="status">
                Status
                ${this.renderSortIcon("status")}
              </th>
              <th class="sortable text-right" data-field="score">
                Score
                ${this.renderSortIcon("score")}
              </th>
              <th class="text-right">Current</th>
              <th class="text-right">Baseline</th>
              <th class="text-right">Change</th>
              <th class="sortable" data-field="impact">
                Impact
                ${this.renderSortIcon("impact")}
              </th>
              <th class="sortable" data-field="timestamp">
                Time
                ${this.renderSortIcon("timestamp")}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${n.map((s,a)=>this.renderRow(s,a+1)).join("")}
          </tbody>
        </table>
      </div>
    `,this.attachEventHandlers(),this.container}renderRow(t,r){const n=te(t.current,t.baseline);return`
      <tr>
        <td class="text-center">
          <strong>${r}</strong>
        </td>
        <td class="eid-cell">
          <code>${t.id}</code>
        </td>
        <td class="event-name">
          <strong>${t.name}</strong>
        </td>
        <td>
          <span class="rad-type" title="${t.radDisplayName}">
            ${this.getRADTypeIcon(t.radType)} ${t.radDisplayName}
          </span>
        </td>
        <td>
          <span class="status-indicator status-${t.status.toLowerCase()}">
            ${t.status}
          </span>
        </td>
        <td class="text-right">
          <span class="score" style="color: ${t.radColor}">
            ${t.score.toFixed(1)}
          </span>
        </td>
        <td class="text-right">${W(t.current)}</td>
        <td class="text-right">${W(t.baseline)}</td>
        <td class="text-right">
          <span class="${n<0?"text-danger":"text-success"}">
            ${Qt(n)}
          </span>
        </td>
        <td>
          <span class="${t.impactClass}">
            ${t.impact}
          </span>
        </td>
        <td class="text-small">
          ${Yt(t.timestamp)}
        </td>
        <td>
          <a href="${t.kibanaUrl}" target="_blank" class="btn btn-sm btn-secondary">
            View in Kibana
          </a>
        </td>
      </tr>
    `}renderSortIcon(t){return this.sortField!==t?'<span class="sort-icon">↕️</span>':this.sortDirection==="asc"?'<span class="sort-icon">↑</span>':'<span class="sort-icon">↓</span>'}renderLoading(){return`
      <div class="flex justify-center items-center p-xl">
        <div class="spinner"></div>
        <span class="ml-md">Loading events...</span>
      </div>
    `}renderEmpty(){return`
      <div class="text-center p-xl">
        <p class="text-muted">No events match the current filters.</p>
      </div>
    `}attachEventHandlers(){this.container.querySelectorAll(".sortable").forEach(t=>{t.addEventListener("click",r=>{const n=r.currentTarget.dataset.field;n&&this.handleSort(n)})})}handleSort(t){this.sortField===t?this.sortDirection=this.sortDirection==="asc"?"desc":"asc":(this.sortField=t,this.sortDirection="asc"),this.render()}sortEvents(t,r){const n=t[this.sortField],s=r[this.sortField];let a=0;return n>s&&(a=1),n<s&&(a=-1),this.sortDirection==="asc"?a:-a}getRADTypeIcon(t){return{login:"🔐",api_call:"📡",page_view:"📄",file_download:"📥"}[t]||"❓"}destroy(){}}class ie{constructor(){p(this,"container");p(this,"searchDebounced");p(this,"radFilter");this.container=document.createElement("div"),this.container.className="filter-bar flex gap-md items-center flex-wrap",this.searchDebounced=pt(t=>{m.getState().setSearchFilter(t)},300)}render(){const{filters:t}=m.getState();return this.container.innerHTML=`
      <!-- Search -->
      <div class="filter-search">
        <input
          type="text"
          class="input"
          placeholder="Search events..."
          value="${t.search}"
          id="search-input"
          style="width: 200px;"
        />
      </div>

      <!-- Status Filter -->
      <div class="filter-status flex gap-sm">
        <button
          class="btn ${t.status==="all"?"btn-primary":"btn-secondary"}"
          data-status="all"
        >
          All
        </button>
        <button
          class="btn ${t.status===f.CRITICAL?"btn-primary":"btn-secondary"}"
          data-status="${f.CRITICAL}"
        >
          Critical
        </button>
        <button
          class="btn ${t.status===f.WARNING?"btn-primary":"btn-secondary"}"
          data-status="${f.WARNING}"
        >
          Warning
        </button>
        <button
          class="btn ${t.status===f.NORMAL?"btn-primary":"btn-secondary"}"
          data-status="${f.NORMAL}"
        >
          Normal
        </button>
        <button
          class="btn ${t.status===f.INCREASED?"btn-primary":"btn-secondary"}"
          data-status="${f.INCREASED}"
        >
          Increased
        </button>
      </div>

      <!-- RAD Type Filter -->
      <div class="filter-radtype flex gap-sm">
        ${Object.values(v).map(r=>`
          <button
            class="btn ${t.radTypes.includes(r)?"btn-primary":"btn-secondary"}"
            data-radtype="${r}"
            title="${this.getRADTypeTitle(r)}"
          >
            ${this.getRADTypeIcon(r)}
          </button>
        `).join("")}
      </div>

      <!-- Clear Filters -->
      ${this.hasActiveFilters()?`
        <button
          class="btn btn-secondary"
          id="clear-filters"
        >
          Clear Filters
        </button>
      `:""}

      <!-- RAD Filter Container -->
      <div id="rad-filter-container" class="rad-filter-wrapper"></div>
    `,this.attachEventHandlers(),this.initializeRADFilter(),this.container}attachEventHandlers(){const t=m.getState(),r=this.container.querySelector("#search-input");r==null||r.addEventListener("input",s=>{const a=s.target;this.searchDebounced(a.value)}),this.container.querySelectorAll("[data-status]").forEach(s=>{s.addEventListener("click",a=>{const i=a.currentTarget.dataset.status;t.setStatusFilter(i),this.render()})}),this.container.querySelectorAll("[data-radtype]").forEach(s=>{s.addEventListener("click",a=>{const i=a.currentTarget.dataset.radtype;t.toggleRADTypeFilter(i),this.render()})});const n=this.container.querySelector("#clear-filters");n==null||n.addEventListener("click",()=>{t.clearFilters(),this.render()})}initializeRADFilter(){setTimeout(()=>{const t=this.container.querySelector("#rad-filter-container");if(t&&window.RADFilter){const{events:r}=m.getState(),n=new window.RADFilter(t);n.init(r),n.onFilterChange=s=>{m.getState().setRADFilters(s)},this.radFilter=n}},0)}hasActiveFilters(){const{filters:t}=m.getState();return t.search!==""||t.status!=="all"||t.radTypes.length>0}getRADTypeIcon(t){return{[v.LOGIN]:"🔐",[v.API_CALL]:"📡",[v.PAGE_VIEW]:"📄",[v.FILE_DOWNLOAD]:"📥",[v.CUSTOM]:"⚡"}[t]||"❓"}getRADTypeTitle(t){return{[v.LOGIN]:"Login Events",[v.API_CALL]:"API Calls",[v.PAGE_VIEW]:"Page Views",[v.FILE_DOWNLOAD]:"File Downloads",[v.CUSTOM]:"Custom Events"}[t]||t}destroy(){this.radFilter=null}updateRADFilter(t){this.radFilter&&t&&(this.radFilter.updateRADCounts(t),this.radFilter.render())}}class oe{constructor(){p(this,"container");p(this,"controlPanel");p(this,"summaryCards");p(this,"eventsTable");p(this,"filterBar");p(this,"unsubscribe",null);this.container=document.createElement("div"),this.container.className="rad-monitor",this.controlPanel=new ne,this.summaryCards=new se,this.filterBar=new ie,this.eventsTable=new ae,this.setupSubscriptions()}setupSubscriptions(){this.unsubscribe=m.subscribe(t=>({stats:t.stats,filteredEvents:t.filteredEvents,isLoading:t.isLoading,error:t.error,events:t.events}),t=>{this.update(),t.events&&this.filterBar&&this.filterBar.updateRADFilter(t.events)})}update(){this.render()}render(){const t=m.getState();return this.container.innerHTML=`
      <div class="container">
        <header class="header">
          <div class="flex justify-between items-center mb-lg">
            <div class="flex items-center gap-md">
              <span id="auth-status-indicator" class="auth-indicator" title="Authentication Status">●</span>
              <h1>RAD Traffic Health Monitor</h1>
            </div>
            <div id="control-panel-root"></div>
          </div>
        </header>

        <main class="main-content">
          ${t.error?this.renderError(t.error):""}

          <div id="summary-cards-root" class="mb-lg"></div>

          <div class="card">
            <div class="card-header flex justify-between items-center mb-md">
              <h2>Event Details</h2>
              <div id="filter-bar-root"></div>
            </div>

            ${t.isLoading?this.renderLoading():""}

            <div id="events-table-root"></div>
          </div>
        </main>
      </div>
    `,this.mountComponents(),this.container}mountComponents(){const t=this.container.querySelector("#control-panel-root");t&&t.appendChild(this.controlPanel.render());const r=this.container.querySelector("#summary-cards-root");r&&r.appendChild(this.summaryCards.render());const n=this.container.querySelector("#filter-bar-root");n&&n.appendChild(this.filterBar.render());const s=this.container.querySelector("#events-table-root");s&&s.appendChild(this.eventsTable.render())}renderError(t){return`
      <div class="alert alert-error mb-lg">
        <strong>Error:</strong> ${t}
      </div>
    `}renderLoading(){return`
      <div class="flex justify-center items-center p-xl">
        <div class="spinner"></div>
        <span class="ml-md">Loading...</span>
      </div>
    `}destroy(){this.unsubscribe&&this.unsubscribe(),this.controlPanel.destroy(),this.summaryCards.destroy(),this.filterBar.destroy(),this.eventsTable.destroy()}}const ce=P.getInstance();ce.log("Main.ts loading...");window.EIDParser=T;async function rt(){console.log("🚀 RAD Traffic Monitor starting...");const e=document.getElementById("app");if(!e){console.error("App root element not found");return}const t=m.getState(),r=t.theme.isDark;document.documentElement.setAttribute("data-theme",r?"dark":"light");const n=new oe;e.appendChild(n.render()),setTimeout(ft,100),await t.loadData(),t.config.enableAutoRefresh&&ht(),console.log("✅ RAD Traffic Monitor initialized")}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",rt):rt();async function ft(){const e=document.getElementById("auth-status-indicator");if(e)try{const t=await fetch("/api/v1/auth/status",{credentials:"include"});t.ok?(await t.json()).authenticated?(e.className="auth-indicator auth-success",e.title="Authenticated"):(e.className="auth-indicator auth-warning",e.title="Not authenticated"):(e.className="auth-indicator auth-error",e.title=`Auth check failed: ${t.status}`)}catch{e.className="auth-indicator auth-error",e.title="Auth service unavailable"}}setInterval(ft,3e4);
