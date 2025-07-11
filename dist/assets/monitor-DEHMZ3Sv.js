import{c as mt}from"./vanilla-Das_YOyF.js";function yt(r){return r&&r.__esModule&&Object.prototype.hasOwnProperty.call(r,"default")?r.default:r}var J={exports:{}},c={};/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var nt;function vt(){if(nt)return c;nt=1;var r=Symbol.for("react.element"),t=Symbol.for("react.portal"),n=Symbol.for("react.fragment"),s=Symbol.for("react.strict_mode"),o=Symbol.for("react.profiler"),i=Symbol.for("react.provider"),f=Symbol.for("react.context"),l=Symbol.for("react.forward_ref"),E=Symbol.for("react.suspense"),k=Symbol.for("react.memo"),u=Symbol.for("react.lazy"),L=Symbol.iterator;function D(e){return e===null||typeof e!="object"?null:(e=L&&e[L]||e["@@iterator"],typeof e=="function"?e:null)}var w={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},N=Object.assign,y={};function C(e,a,d){this.props=e,this.context=a,this.refs=y,this.updater=d||w}C.prototype.isReactComponent={},C.prototype.setState=function(e,a){if(typeof e!="object"&&typeof e!="function"&&e!=null)throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,e,a,"setState")},C.prototype.forceUpdate=function(e){this.updater.enqueueForceUpdate(this,e,"forceUpdate")};function h(){}h.prototype=C.prototype;function _(e,a,d){this.props=e,this.context=a,this.refs=y,this.updater=d||w}var x=_.prototype=new h;x.constructor=_,N(x,C.prototype),x.isPureReactComponent=!0;var Q=Array.isArray,Y=Object.prototype.hasOwnProperty,V={current:null},Z={key:!0,ref:!0,__self:!0,__source:!0};function tt(e,a,d){var m,p={},b=null,I=null;if(a!=null)for(m in a.ref!==void 0&&(I=a.ref),a.key!==void 0&&(b=""+a.key),a)Y.call(a,m)&&!Z.hasOwnProperty(m)&&(p[m]=a[m]);var S=arguments.length-2;if(S===1)p.children=d;else if(1<S){for(var v=Array(S),$=0;$<S;$++)v[$]=arguments[$+2];p.children=v}if(e&&e.defaultProps)for(m in S=e.defaultProps,S)p[m]===void 0&&(p[m]=S[m]);return{$$typeof:r,type:e,key:b,ref:I,props:p,_owner:V.current}}function dt(e,a){return{$$typeof:r,type:e.type,key:a,ref:e.ref,props:e.props,_owner:e._owner}}function H(e){return typeof e=="object"&&e!==null&&e.$$typeof===r}function ft(e){var a={"=":"=0",":":"=2"};return"$"+e.replace(/[=:]/g,function(d){return a[d]})}var et=/\/+/g;function G(e,a){return typeof e=="object"&&e!==null&&e.key!=null?ft(""+e.key):a.toString(36)}function M(e,a,d,m,p){var b=typeof e;(b==="undefined"||b==="boolean")&&(e=null);var I=!1;if(e===null)I=!0;else switch(b){case"string":case"number":I=!0;break;case"object":switch(e.$$typeof){case r:case t:I=!0}}if(I)return I=e,p=p(I),e=m===""?"."+G(I,0):m,Q(p)?(d="",e!=null&&(d=e.replace(et,"$&/")+"/"),M(p,a,d,"",function($){return $})):p!=null&&(H(p)&&(p=dt(p,d+(!p.key||I&&I.key===p.key?"":(""+p.key).replace(et,"$&/")+"/")+e)),a.push(p)),1;if(I=0,m=m===""?".":m+":",Q(e))for(var S=0;S<e.length;S++){b=e[S];var v=m+G(b,S);I+=M(b,a,d,v,p)}else if(v=D(e),typeof v=="function")for(e=v.call(e),S=0;!(b=e.next()).done;)b=b.value,v=m+G(b,S++),I+=M(b,a,d,v,p);else if(b==="object")throw a=String(e),Error("Objects are not valid as a React child (found: "+(a==="[object Object]"?"object with keys {"+Object.keys(e).join(", ")+"}":a)+"). If you meant to render a collection of children, use an array instead.");return I}function j(e,a,d){if(e==null)return e;var m=[],p=0;return M(e,m,"","",function(b){return a.call(d,b,p++)}),m}function ht(e){if(e._status===-1){var a=e._result;a=a(),a.then(function(d){(e._status===0||e._status===-1)&&(e._status=1,e._result=d)},function(d){(e._status===0||e._status===-1)&&(e._status=2,e._result=d)}),e._status===-1&&(e._status=0,e._result=a)}if(e._status===1)return e._result.default;throw e._result}var A={current:null},q={transition:null},pt={ReactCurrentDispatcher:A,ReactCurrentBatchConfig:q,ReactCurrentOwner:V};function rt(){throw Error("act(...) is not supported in production builds of React.")}return c.Children={map:j,forEach:function(e,a,d){j(e,function(){a.apply(this,arguments)},d)},count:function(e){var a=0;return j(e,function(){a++}),a},toArray:function(e){return j(e,function(a){return a})||[]},only:function(e){if(!H(e))throw Error("React.Children.only expected to receive a single React element child.");return e}},c.Component=C,c.Fragment=n,c.Profiler=o,c.PureComponent=_,c.StrictMode=s,c.Suspense=E,c.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=pt,c.act=rt,c.cloneElement=function(e,a,d){if(e==null)throw Error("React.cloneElement(...): The argument must be a React element, but you passed "+e+".");var m=N({},e.props),p=e.key,b=e.ref,I=e._owner;if(a!=null){if(a.ref!==void 0&&(b=a.ref,I=V.current),a.key!==void 0&&(p=""+a.key),e.type&&e.type.defaultProps)var S=e.type.defaultProps;for(v in a)Y.call(a,v)&&!Z.hasOwnProperty(v)&&(m[v]=a[v]===void 0&&S!==void 0?S[v]:a[v])}var v=arguments.length-2;if(v===1)m.children=d;else if(1<v){S=Array(v);for(var $=0;$<v;$++)S[$]=arguments[$+2];m.children=S}return{$$typeof:r,type:e.type,key:p,ref:b,props:m,_owner:I}},c.createContext=function(e){return e={$$typeof:f,_currentValue:e,_currentValue2:e,_threadCount:0,Provider:null,Consumer:null,_defaultValue:null,_globalName:null},e.Provider={$$typeof:i,_context:e},e.Consumer=e},c.createElement=tt,c.createFactory=function(e){var a=tt.bind(null,e);return a.type=e,a},c.createRef=function(){return{current:null}},c.forwardRef=function(e){return{$$typeof:l,render:e}},c.isValidElement=H,c.lazy=function(e){return{$$typeof:u,_payload:{_status:-1,_result:e},_init:ht}},c.memo=function(e,a){return{$$typeof:k,type:e,compare:a===void 0?null:a}},c.startTransition=function(e){var a=q.transition;q.transition={};try{e()}finally{q.transition=a}},c.unstable_act=rt,c.useCallback=function(e,a){return A.current.useCallback(e,a)},c.useContext=function(e){return A.current.useContext(e)},c.useDebugValue=function(){},c.useDeferredValue=function(e){return A.current.useDeferredValue(e)},c.useEffect=function(e,a){return A.current.useEffect(e,a)},c.useId=function(){return A.current.useId()},c.useImperativeHandle=function(e,a,d){return A.current.useImperativeHandle(e,a,d)},c.useInsertionEffect=function(e,a){return A.current.useInsertionEffect(e,a)},c.useLayoutEffect=function(e,a){return A.current.useLayoutEffect(e,a)},c.useMemo=function(e,a){return A.current.useMemo(e,a)},c.useReducer=function(e,a,d){return A.current.useReducer(e,a,d)},c.useRef=function(e){return A.current.useRef(e)},c.useState=function(e){return A.current.useState(e)},c.useSyncExternalStore=function(e,a,d){return A.current.useSyncExternalStore(e,a,d)},c.useTransition=function(){return A.current.useTransition()},c.version="18.3.1",c}var st;function gt(){return st||(st=1,J.exports=vt()),J.exports}var bt=gt();const ot=yt(bt),St=r=>r;function Et(r,t=St){const n=ot.useSyncExternalStore(r.subscribe,()=>t(r.getState()),()=>t(r.getInitialState()));return ot.useDebugValue(n),n}const It=r=>{const t=mt(r),n=s=>Et(t,s);return Object.assign(n,t),n},Ct=r=>It,at={BASE_URL:"/",DEV:!1,MODE:"production",PROD:!0,SSR:!1},P=new Map,U=r=>{const t=P.get(r);return t?Object.fromEntries(Object.entries(t.stores).map(([n,s])=>[n,s.getState()])):{}},Rt=(r,t,n)=>{if(r===void 0)return{type:"untracked",connection:t.connect(n)};const s=P.get(n.name);if(s)return{type:"tracked",store:r,...s};const o={connection:t.connect(n),stores:{}};return P.set(n.name,o),{type:"tracked",store:r,...o}},_t=(r,t)=>{if(t===void 0)return;const n=P.get(r);n&&(delete n.stores[t],Object.keys(n.stores).length===0&&P.delete(r))},wt=r=>{var t,n;if(!r)return;const s=r.split(`
`),o=s.findIndex(f=>f.includes("api.setState"));if(o<0)return;const i=((t=s[o+1])==null?void 0:t.trim())||"";return(n=/.+ (.+) .+/.exec(i))==null?void 0:n[1]},At=(r,t={})=>(n,s,o)=>{const{enabled:i,anonymousActionType:f,store:l,...E}=t;let k;try{k=(i??(at?"production":void 0)!=="production")&&window.__REDUX_DEVTOOLS_EXTENSION__}catch{}if(!k)return r(n,s,o);const{connection:u,...L}=Rt(l,k,E);let D=!0;o.setState=(y,C,h)=>{const _=n(y,C);if(!D)return _;const x=h===void 0?{type:f||wt(new Error().stack)||"anonymous"}:typeof h=="string"?{type:h}:h;return l===void 0?(u?.send(x,s()),_):(u?.send({...x,type:`${l}/${x.type}`},{...U(E.name),[l]:o.getState()}),_)},o.devtools={cleanup:()=>{u&&typeof u.unsubscribe=="function"&&u.unsubscribe(),_t(E.name,l)}};const w=(...y)=>{const C=D;D=!1,n(...y),D=C},N=r(o.setState,s,o);if(L.type==="untracked"?u?.init(N):(L.stores[L.store]=o,u?.init(Object.fromEntries(Object.entries(L.stores).map(([y,C])=>[y,y===L.store?N:C.getState()])))),o.dispatchFromDevtools&&typeof o.dispatch=="function"){let y=!1;const C=o.dispatch;o.dispatch=(...h)=>{(at?"production":void 0)!=="production"&&h[0].type==="__setState"&&!y&&(console.warn('[zustand devtools middleware] "__setState" action type is reserved to set state from the devtools. Avoid using it.'),y=!0),C(...h)}}return u.subscribe(y=>{var C;switch(y.type){case"ACTION":if(typeof y.payload!="string"){console.error("[zustand devtools middleware] Unsupported action format");return}return z(y.payload,h=>{if(h.type==="__setState"){if(l===void 0){w(h.state);return}Object.keys(h.state).length!==1&&console.error(`
                    [zustand devtools middleware] Unsupported __setState action format.
                    When using 'store' option in devtools(), the 'state' should have only one key, which is a value of 'store' that was passed in devtools(),
                    and value of this only key should be a state object. Example: { "type": "__setState", "state": { "abc123Store": { "foo": "bar" } } }
                    `);const _=h.state[l];if(_==null)return;JSON.stringify(o.getState())!==JSON.stringify(_)&&w(_);return}o.dispatchFromDevtools&&typeof o.dispatch=="function"&&o.dispatch(h)});case"DISPATCH":switch(y.payload.type){case"RESET":return w(N),l===void 0?u?.init(o.getState()):u?.init(U(E.name));case"COMMIT":if(l===void 0){u?.init(o.getState());return}return u?.init(U(E.name));case"ROLLBACK":return z(y.state,h=>{if(l===void 0){w(h),u?.init(o.getState());return}w(h[l]),u?.init(U(E.name))});case"JUMP_TO_STATE":case"JUMP_TO_ACTION":return z(y.state,h=>{if(l===void 0){w(h);return}JSON.stringify(o.getState())!==JSON.stringify(h[l])&&w(h[l])});case"IMPORT_STATE":{const{nextLiftedState:h}=y.payload,_=(C=h.computedStates.slice(-1)[0])==null?void 0:C.state;if(!_)return;w(l===void 0?_:_[l]),u?.send(null,h);return}case"PAUSE_RECORDING":return D=!D}return}}),N},Lt=At,z=(r,t)=>{let n;try{n=JSON.parse(r)}catch(s){console.error("[zustand devtools middleware] Could not parse the received json",s)}n!==void 0&&t(n)},Tt=r=>(t,n,s)=>{const o=s.subscribe;return s.subscribe=(f,l,E)=>{let k=f;if(l){const u=E?.equalityFn||Object.is;let L=f(s.getState());k=D=>{const w=f(D);if(!u(L,w)){const N=L;l(L=w,N)}},E?.fireImmediately&&l(L,L)}return o(k)},r(t,n,s)},$t=Tt;class Dt{baseURL;headers;constructor(){this.baseURL="/api/v1",this.headers={"Content-Type":"application/json"}}async request(t,n={}){const s=await fetch(`${this.baseURL}${t}`,{...n,headers:{...this.headers,...n.headers},credentials:"include"});if(!s.ok){const o=await s.text();throw new Error(`API Error: ${s.status} - ${o}`)}return s.json()}async fetchDashboardData(t){return this.request("/dashboard/query",{method:"POST",body:JSON.stringify(t)})}async fetchConfigSettings(){return this.request("/config/settings")}async checkAuthStatus(){return this.request("/auth/status")}async checkHealth(){const t=await fetch("/health",{credentials:"include"});if(!t.ok){const n=await t.text();throw new Error(`API Error: ${t.status} - ${n}`)}return t.json()}}const Nt=new Dt;var T=(r=>(r.LOGIN="login",r.API_CALL="api_call",r.PAGE_VIEW="page_view",r.FILE_DOWNLOAD="file_download",r))(T||{}),g=(r=>(r.CRITICAL="CRITICAL",r.WARNING="WARNING",r.NORMAL="NORMAL",r.INCREASED="INCREASED",r))(g||{}),W=(r=>(r.HIGH="High",r.MEDIUM="Medium",r.LOW="Low",r))(W||{});function kt(r){const{status:t,radType:n,impact:s}=r;return{...r,radColor:xt(t),radDisplayName:Ot(n),impactClass:Ft(s)}}function xt(r){return{[g.CRITICAL]:"#dc3545",[g.WARNING]:"#fd7e14",[g.NORMAL]:"#28a745",[g.INCREASED]:"#007bff"}[r]||"#6c757d"}function Ot(r){return{[T.LOGIN]:"Login Events",[T.API_CALL]:"API Calls",[T.PAGE_VIEW]:"Page Views",[T.FILE_DOWNLOAD]:"File Downloads"}[r]||r}function Ft(r){return{[W.HIGH]:"impact-high",[W.MEDIUM]:"impact-medium",[W.LOW]:"impact-low"}[r]||"impact-low"}function O(r){let t=0,n=0,s=0,o=0;return r.forEach(i=>{switch(i.status){case g.CRITICAL:t++;break;case g.WARNING:n++;break;case g.NORMAL:s++;break;case g.INCREASED:o++;break}}),{critical:t,warning:n,normal:s,increased:o,total:r.length}}function F(r,t){return r.filter(n=>{if(t.search){const s=t.search.toLowerCase();if(!(n.name.toLowerCase().includes(s)||n.radType.toLowerCase().includes(s)))return!1}return!(t.status!=="all"&&n.status!==t.status||t.radTypes.length>0&&!t.radTypes.includes(n.radType))})}function X(r){return r.toLocaleString()}function Pt(r){return`${r>0?"+":""}${r.toFixed(1)}%`}function Mt(r){return new Date(r).toLocaleString()}function jt(r,t){return t===0?r>0?100:0:(r-t)/t*100}function lt(r,t){let n;return function(...o){const i=()=>{clearTimeout(n),r(...o)};clearTimeout(n),n=setTimeout(i,t)}}const it={baselineStart:"now-60d",baselineEnd:"now-30d",timeRange:"now-24h",criticalThreshold:-30,warningThreshold:-20,highVolumeThreshold:50,mediumVolumeThreshold:30,refreshInterval:3e4,enableAutoRefresh:!0},K={search:"",status:"all",radTypes:[]},R=Ct()(Lt($t((r,t)=>({events:[],filteredEvents:[],stats:{critical:0,warning:0,normal:0,increased:0,total:0},filters:K,config:it,theme:{isDark:localStorage.getItem("theme")==="dark"},isLoading:!1,lastUpdate:null,error:null,loadData:async()=>{r({isLoading:!0,error:null});try{const s=(await Nt.fetchDashboardData({query:{size:1e4,query:{bool:{must:[{range:{timestamp:{gte:t().config.timeRange}}}]}}},force_refresh:!1})).data,o=F(s,t().filters),i=O(o);r({events:s,filteredEvents:o,stats:i,lastUpdate:new Date,isLoading:!1})}catch(n){r({error:n instanceof Error?n.message:"Failed to load data",isLoading:!1})}},refresh:async()=>{const{loadData:n}=t();await n()},setSearchFilter:n=>{r(s=>{const o={...s.filters,search:n},i=F(s.events,o),f=O(i);return{filters:o,filteredEvents:i,stats:f}})},setStatusFilter:n=>{r(s=>{const o={...s.filters,status:n},i=F(s.events,o),f=O(i);return{filters:o,filteredEvents:i,stats:f}})},toggleRADTypeFilter:n=>{r(s=>{const o=s.filters.radTypes.includes(n)?s.filters.radTypes.filter(E=>E!==n):[...s.filters.radTypes,n],i={...s.filters,radTypes:o},f=F(s.events,i),l=O(f);return{filters:i,filteredEvents:f,stats:l}})},clearFilters:()=>{r(n=>{const s=F(n.events,K),o=O(s);return{filters:K,filteredEvents:s,stats:o}})},updateConfig:n=>{r(s=>({config:{...s.config,...n}}))},resetConfig:()=>{r({config:it})},toggleTheme:()=>{r(n=>{const s=!n.theme.isDark;return localStorage.setItem("theme",s?"dark":"light"),document.documentElement.setAttribute("data-theme",s?"dark":"light"),{theme:{isDark:s}}})},showNotification:n=>{console.log("Notification:",n)}})),{name:"rad-monitor-store"}));let B=null;const ut=()=>{const r=R.getState();r.config.enableAutoRefresh&&r.config.refreshInterval>0&&(B=setInterval(()=>{R.getState().refresh()},r.config.refreshInterval))},qt=()=>{B&&(clearInterval(B),B=null)};R.subscribe(r=>r.config,r=>{qt(),r.enableAutoRefresh&&ut()});if(typeof window<"u"){const r=R.getState().theme.isDark;document.documentElement.setAttribute("data-theme",r?"dark":"light")}class Ut{container;refreshInterval=null;constructor(){this.container=document.createElement("div"),this.container.className="control-panel flex gap-md items-center",this.setupEventListeners()}setupEventListeners(){this.updateConfig=lt(this.updateConfig.bind(this),500)}render(){const t=R.getState(),{theme:n,config:s,lastUpdate:o}=t;return this.container.innerHTML=`
      <div class="flex gap-sm items-center">
        <!-- Theme Toggle -->
        <button
          class="btn btn-secondary"
          title="Toggle theme"
          id="theme-toggle"
        >
          ${n.isDark?"☀️":"🌙"}
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
            ${s.enableAutoRefresh?"checked":""}
          />
          <span class="text-small">Auto-refresh</span>
        </label>

        <!-- Refresh Interval -->
        ${s.enableAutoRefresh?`
          <select
            id="refresh-interval"
            class="input input-sm"
            style="width: auto;"
          >
            <option value="10000" ${s.refreshInterval===1e4?"selected":""}>10s</option>
            <option value="30000" ${s.refreshInterval===3e4?"selected":""}>30s</option>
            <option value="60000" ${s.refreshInterval===6e4?"selected":""}>1m</option>
            <option value="300000" ${s.refreshInterval===3e5?"selected":""}>5m</option>
          </select>
        `:""}

        <!-- Last Update -->
        ${o?`
          <span class="text-small text-muted">
            Last updated: ${this.formatLastUpdate(o)}
          </span>
        `:""}
      </div>

      <!-- Settings Button -->
      <button
        class="btn btn-secondary"
        title="Settings"
        id="settings-btn"
      >
        ⚙️
      </button>
    `,this.attachEventHandlers(),this.container}attachEventHandlers(){const t=R.getState();this.container.querySelector("#theme-toggle")?.addEventListener("click",()=>{t.toggleTheme(),this.render()}),this.container.querySelector("#refresh-btn")?.addEventListener("click",()=>{t.refresh()}),this.container.querySelector("#auto-refresh-toggle")?.addEventListener("change",l=>{const E=l.target;t.updateConfig({enableAutoRefresh:E.checked}),this.render()}),this.container.querySelector("#refresh-interval")?.addEventListener("change",l=>{const E=l.target;t.updateConfig({refreshInterval:parseInt(E.value)})}),this.container.querySelector("#settings-btn")?.addEventListener("click",()=>{this.showSettingsModal()})}updateConfig(t){R.getState().updateConfig(t)}formatLastUpdate(t){const s=new Date().getTime()-t.getTime(),o=Math.floor(s/1e3);if(o<60)return`${o}s ago`;const i=Math.floor(o/60);if(i<60)return`${i}m ago`;const f=Math.floor(i/60);return f<24?`${f}h ago`:t.toLocaleDateString()}showSettingsModal(){console.log("Settings modal not yet implemented"),R.getState().showNotification({message:"Settings panel coming soon!",type:"info"})}destroy(){}}class Wt{container;constructor(){this.container=document.createElement("div"),this.container.className="summary-cards grid grid-cols-4 gap-md"}render(){const{stats:t}=R.getState(),n=[{label:"Critical",value:t.critical,subtitle:"Events below -30%",variant:g.CRITICAL,className:"summary-card-critical"},{label:"Warning",value:t.warning,subtitle:"Events below -20%",variant:g.WARNING,className:"summary-card-warning"},{label:"Normal",value:t.normal,subtitle:"Events within range",variant:g.NORMAL,className:"summary-card-normal"},{label:"Increased",value:t.increased,subtitle:"Events above baseline",variant:g.INCREASED,className:"summary-card-increased"}];return this.container.innerHTML=n.map(s=>this.renderCard(s)).join(""),this.container}renderCard(t){const{label:n,value:s,subtitle:o,variant:i,className:f=""}=t,l=`status-${i.toLowerCase()}`;return`
      <div class="card summary-card ${f}">
        <div class="flex justify-between items-start mb-sm">
          <h3 class="text-lg">${n}</h3>
          <span class="status-indicator ${l}">
            ${i}
          </span>
        </div>
        <div class="summary-value text-3xl font-bold mb-sm">
          ${X(s)}
        </div>
        <div class="text-small text-muted">
          ${o}
        </div>
      </div>
    `}destroy(){}}class Bt{container;sortField="score";sortDirection="asc";constructor(){this.container=document.createElement("div"),this.container.className="events-table-container"}render(){const{filteredEvents:t,isLoading:n}=R.getState();if(n)return this.container.innerHTML=this.renderLoading(),this.container;if(t.length===0)return this.container.innerHTML=this.renderEmpty(),this.container;const s=t.map(kt).sort((o,i)=>this.sortEvents(o,i));return this.container.innerHTML=`
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
            ${s.map((o,i)=>this.renderRow(o,i+1)).join("")}
          </tbody>
        </table>
      </div>
    `,this.attachEventHandlers(),this.container}renderRow(t,n){const s=jt(t.current,t.baseline);return`
      <tr>
        <td class="text-center">
          <strong>${n}</strong>
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
        <td class="text-right">${X(t.current)}</td>
        <td class="text-right">${X(t.baseline)}</td>
        <td class="text-right">
          <span class="${s<0?"text-danger":"text-success"}">
            ${Pt(s)}
          </span>
        </td>
        <td>
          <span class="${t.impactClass}">
            ${t.impact}
          </span>
        </td>
        <td class="text-small">
          ${Mt(t.timestamp)}
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
    `}attachEventHandlers(){this.container.querySelectorAll(".sortable").forEach(t=>{t.addEventListener("click",n=>{const s=n.currentTarget.dataset.field;s&&this.handleSort(s)})})}handleSort(t){this.sortField===t?this.sortDirection=this.sortDirection==="asc"?"desc":"asc":(this.sortField=t,this.sortDirection="asc"),this.render()}sortEvents(t,n){const s=t[this.sortField],o=n[this.sortField];let i=0;return s>o&&(i=1),s<o&&(i=-1),this.sortDirection==="asc"?i:-i}getRADTypeIcon(t){return{login:"🔐",api_call:"📡",page_view:"📄",file_download:"📥"}[t]||"❓"}destroy(){}}class Vt{container;searchDebounced;constructor(){this.container=document.createElement("div"),this.container.className="filter-bar flex gap-md items-center flex-wrap",this.searchDebounced=lt(t=>{R.getState().setSearchFilter(t)},300)}render(){const{filters:t}=R.getState();return this.container.innerHTML=`
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
          class="btn ${t.status===g.CRITICAL?"btn-primary":"btn-secondary"}"
          data-status="${g.CRITICAL}"
        >
          Critical
        </button>
        <button
          class="btn ${t.status===g.WARNING?"btn-primary":"btn-secondary"}"
          data-status="${g.WARNING}"
        >
          Warning
        </button>
        <button
          class="btn ${t.status===g.NORMAL?"btn-primary":"btn-secondary"}"
          data-status="${g.NORMAL}"
        >
          Normal
        </button>
        <button
          class="btn ${t.status===g.INCREASED?"btn-primary":"btn-secondary"}"
          data-status="${g.INCREASED}"
        >
          Increased
        </button>
      </div>

      <!-- RAD Type Filter -->
      <div class="filter-radtype flex gap-sm">
        ${Object.values(T).map(n=>`
          <button
            class="btn ${t.radTypes.includes(n)?"btn-primary":"btn-secondary"}"
            data-radtype="${n}"
            title="${this.getRADTypeTitle(n)}"
          >
            ${this.getRADTypeIcon(n)}
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
    `,this.attachEventHandlers(),this.container}attachEventHandlers(){const t=R.getState();this.container.querySelector("#search-input")?.addEventListener("input",o=>{const i=o.target;this.searchDebounced(i.value)}),this.container.querySelectorAll("[data-status]").forEach(o=>{o.addEventListener("click",i=>{const f=i.currentTarget.dataset.status;t.setStatusFilter(f),this.render()})}),this.container.querySelectorAll("[data-radtype]").forEach(o=>{o.addEventListener("click",i=>{const f=i.currentTarget.dataset.radtype;t.toggleRADTypeFilter(f),this.render()})}),this.container.querySelector("#clear-filters")?.addEventListener("click",()=>{t.clearFilters(),this.render()})}hasActiveFilters(){const{filters:t}=R.getState();return t.search!==""||t.status!=="all"||t.radTypes.length>0}getRADTypeIcon(t){return{[T.LOGIN]:"🔐",[T.API_CALL]:"📡",[T.PAGE_VIEW]:"📄",[T.FILE_DOWNLOAD]:"📥"}[t]||"❓"}getRADTypeTitle(t){return{[T.LOGIN]:"Login Events",[T.API_CALL]:"API Calls",[T.PAGE_VIEW]:"Page Views",[T.FILE_DOWNLOAD]:"File Downloads"}[t]||t}destroy(){}}class Ht{container;controlPanel;summaryCards;eventsTable;filterBar;unsubscribe=null;constructor(){this.container=document.createElement("div"),this.container.className="rad-monitor",this.controlPanel=new Ut,this.summaryCards=new Wt,this.filterBar=new Vt,this.eventsTable=new Bt,this.setupSubscriptions()}setupSubscriptions(){this.unsubscribe=R.subscribe(t=>({stats:t.stats,filteredEvents:t.filteredEvents,isLoading:t.isLoading,error:t.error}),()=>this.update())}update(){this.render()}render(){const t=R.getState();return this.container.innerHTML=`
      <div class="container">
        <header class="header">
          <div class="flex justify-between items-center mb-lg">
            <h1>RAD Traffic Health Monitor</h1>
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
    `,this.mountComponents(),this.container}mountComponents(){const t=this.container.querySelector("#control-panel-root");t&&t.appendChild(this.controlPanel.render());const n=this.container.querySelector("#summary-cards-root");n&&n.appendChild(this.summaryCards.render());const s=this.container.querySelector("#filter-bar-root");s&&s.appendChild(this.filterBar.render());const o=this.container.querySelector("#events-table-root");o&&o.appendChild(this.eventsTable.render())}renderError(t){return`
      <div class="alert alert-error mb-lg">
        <strong>Error:</strong> ${t}
      </div>
    `}renderLoading(){return`
      <div class="flex justify-center items-center p-xl">
        <div class="spinner"></div>
        <span class="ml-md">Loading...</span>
      </div>
    `}destroy(){this.unsubscribe&&this.unsubscribe(),this.controlPanel.destroy(),this.summaryCards.destroy(),this.filterBar.destroy(),this.eventsTable.destroy()}}async function ct(){console.log("🚀 RAD Traffic Monitor starting...");const r=document.getElementById("app");if(!r){console.error("App root element not found");return}const t=R.getState(),n=t.theme.isDark;document.documentElement.setAttribute("data-theme",n?"dark":"light");try{const o=await fetch("/api/v1/auth/status",{credentials:"include"});o.ok||console.warn("Authentication check failed:",o.status)}catch(o){console.error("Failed to check authentication:",o)}const s=new Ht;r.appendChild(s.render()),await t.loadData(),t.config.enableAutoRefresh&&ut(),console.log("✅ RAD Traffic Monitor initialized")}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",ct):ct();
