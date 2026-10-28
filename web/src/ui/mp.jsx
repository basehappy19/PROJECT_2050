/* 2.0 multiplayer screens: the lobby and friends (menu), the room, and the in-game parts
   (team bar with quick messages, ministries, votes, the race ranking, the end of a multiplayer game) */
import {useEffect, useState} from "preact/hooks";
import {P, S, UIM, L, up, bump, COL} from "../core.js";
import {Audio} from "../audio.js";
import {G} from "../game.js";
import {Mp, MPT} from "../mp.js";
import {Icon, Rich} from "./icon.jsx";
import {Btn, IconBtn, Seg, Tabs, Portrait} from "./widgets.jsx";
import {RoleBadge} from "./rolebadge.jsx";
import {GameMap} from "../map2d.js";

const T = (th, en) => ({th, en});
const W = {
  rooms:T("ห้อง", "Rooms"), friends:T("เพื่อน", "Friends"), create:T("สร้างห้อง", "Create a room"), joinCode:T("เข้าห้องด้วยรหัส", "Join with a code"),
  code:T("รหัสห้อง 6 ตัว", "6-letter room code"), join:T("เข้าร่วม", "Join"), publicRooms:T("ห้องสาธารณะ", "Public rooms"), noRooms:T("ยังไม่มีห้องสาธารณะ ลองสร้างห้องเองเลย", "No public rooms yet: create one!"),
  refresh:T("รีเฟรช", "Refresh"), players:T("ผู้เล่น", "Players"), public:T("สาธารณะ", "Public"), private:T("ส่วนตัว (ใช้รหัส)", "Private (code only)"), diff:T("ความยาก", "Difficulty"),
  normal:T("ปกติ", "Normal"), hard:T("ยาก", "Hard"), leader:T("ผู้นำของทีม", "Team leader"), ready:T("พร้อม", "Ready"), notReady:T("ยังไม่พร้อม", "Not ready"), start:T("เริ่มเกม", "Start the game"),
  leave:T("ออกจากห้อง", "Leave the room"), host:T("หัวหน้าห้อง", "Host"), kick:T("เชิญออก", "Remove"), invite:T("ชวนเพื่อน", "Invite friends"), copy:T("คัดลอกรหัส", "Copy code"), copied:T("คัดลอกแล้ว", "Copied"),
  roles:T("เลือกกระทรวงที่คุณดูแล (สูงสุด 2)", "Pick your ministries (up to 2)"), rolesNote:T("กระทรวงที่ไม่มีใครเลือก จะแบ่งให้อัตโนมัติเมื่อเริ่ม", "Ministries nobody picks are shared out when the clock starts"),
  pickTitleCoop:T("แบ่งงานกันก่อนเริ่ม", "Split the work"), pickTitleVs:T("เลือกภูมิภาคบ้านของคุณ", "Choose your home region"),
  pickWait:T("เวลาจะเริ่มเดินเมื่อทุกคนพร้อม หรือเมื่อหมดเวลา", "The clock starts when everyone is ready, or when time runs out"),
  pickReady:T("พร้อมแล้ว", "I'm ready"), pickUnready:T("แก้ไข", "Change"), pickInGame:T("เลือกกระทรวงหรือภูมิภาคกันในเกม หลังกดเริ่ม", "Ministries or home regions are chosen in the game, after the start"),
  takenBy:T("เลือกโดย", "taken by"), leftS:T("วิ", "s"),
  bloc:T("เลือกภูมิภาคบ้านของคุณ", "Pick your home region"), blocNote:T("ภูมิภาคบ้านเริ่มด้วยความร่วมมือ +10%", "Your home region starts 10% more on-plan"),
  search:T("ค้นหาด้วยชื่อผู้ใช้", "Search by username"), add:T("เพิ่มเพื่อน", "Add friend"), incoming:T("คำขอเป็นเพื่อน", "Friend requests"), outgoing:T("รอตอบรับ", "Waiting for them"),
  accept:T("ตอบรับ", "Accept"), decline:T("ไม่", "Decline"), noFriends:T("ยังไม่มีเพื่อน ค้นหาชื่อผู้ใช้ของเพื่อนแล้วกดเพิ่ม", "No friends yet: search for a username and add them"),
  online:T("ออนไลน์", "online"), offline:T("ออฟไลน์", "offline"), inRoom:T("อยู่ในห้อง", "in a room"), playing:T("กำลังเล่น", "playing"), remove:T("ลบเพื่อน", "Remove friend"),
  invites:T("คำเชิญ", "Invites"), quick:T("ข้อความด่วน", "Quick messages"), team:T("ทีม", "Team"), yourRoles:T("คุณดูแล", "You run"),
  vote:T("โหวต", "Vote"), voteLeft:T("วินาที", "s"), evacVote:T("อพยพทั้งภูมิภาค?", "Evacuate the whole region?"), yes:T("เห็นด้วย", "Yes"), no:T("ไม่เห็นด้วย", "No"),
  evacAll:T("อพยพทั้งภูมิภาค (โหวต)", "Evacuate the region (vote)"), race:T("อันดับการแข่ง", "Race standings"), biggest:T("ปล่อยมากที่สุด", "Biggest emitter"), shared:T("อุณหภูมิโลก (ใช้ร่วมกัน)", "World temperature (shared)"),
  offer:T("เสนอข้อตกลงภูมิอากาศ", "offers a climate pact"), back:T("กลับห้อง", "Back to the room"), menu:T("เมนูหลัก", "Main menu"), result:T("ผลการแข่ง", "Results"),
  winner:T("ผู้ชนะ", "Winner"), allLose:T("ทุกคนแพ้: โลกร้อนเกิน 3°C", "Everyone loses: the world passed 3°C"), waitHost:T("รอหัวหน้าห้อง", "Waiting for the host"),
  coopWin:T("ทีมทำสำเร็จ!", "The team did it!"), coopLose:T("ทีมไปไม่ถึงเป้า", "The team fell short"), you:T("คุณ", "you"), needLogin:MPT.needLogin,
  howCoop:T("ทุกคนใช้งบประมาณร่วมกัน แต่ละคนกดได้เฉพาะงานในกระทรวงของตัวเอง เหตุการณ์ต้องโหวตภายใน 15 วินาที ยิ่งคนมาก ภัยยิ่งถี่", "One shared budget; each player can only act in their own ministries. Events are voted on within 15 seconds. More players, more disasters."),
  howVersus:T("ทุกคนเล่นโลกของตัวเอง (โลกเดียวกันตั้งแต่ต้น) แต่ใช้อุณหภูมิร่วมกัน ใครถึง Net Zero ก่อนชนะ ถ้าโลกร้อนถึง 3°C ทุกคนแพ้ ช่วยกันหรือกดดันกันก็ได้", "Everyone plays their own copy of the same world but shares one temperature. First to Net Zero wins; at 3°C everyone loses. Help each other, or put on the pressure."),
  rejoin:T("กลับเข้าเกม", "Back to the game"),
};
const REGN = id => P.RMETA[id] ? L(P.RMETA[id].name) : "—";
const initials = s => String(s || "?").trim().slice(0, 2).toUpperCase();
function Avatar({p, size = 34, ring}){
  const hue = (String(p.username || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0) * 47) % 360;
  return <span class="mpav" style={{width:size, height:size, background:`hsl(${hue} 45% 32%)`, borderColor:ring || "rgba(255,255,255,.2)", fontSize:size * .38}}>{initials(p.displayName || p.username)}{p.online === false ? <i class="off"/> : <i class="on"/>}</span>;
}
/* a speech bubble with the last quick message / emote of this player */
function Bubble({id}){
  const b = Mp.bubbles[id]; if (!b || performance.now() - b.at > 4000) return null;
  return <span class="mpbub">{b.e !== undefined ? <Icon n={P.MP.EMOTES[b.e]} size={18}/> : L(P.MP.QUICK[b.q])}</span>;
}
export function QuickBar({compact}){
  const [open, setOpen] = useState(false);
  return <div class={"mpquick " + (compact ? "compact" : "")}>
    <IconBtn n="message-circle" title={L(W.quick)} onClick={() => setOpen(o => !o)} on={open}/>
    {open ? <div class="mpqpop glass-strong">
      <div class="mpemotes">{P.MP.EMOTES.map((e, i) => <button type="button" key={e} onClick={() => { Mp.emote(i); setOpen(false); }}><Icon n={e} size={20}/></button>)}</div>
      <div class="mpqs">{P.MP.QUICK.map((q, i) => <button type="button" key={i} onClick={() => { Mp.chat(i); setOpen(false); }}>{L(q)}</button>)}</div>
    </div> : null}
  </div>;
}

/* ---------------- menu: lobby + friends ---------------- */
export function SubMp(){
  const [tab, setTab] = useState(UIM.mpTab || "rooms"), [code, setCode] = useState(""), [mode, setMode] = useState("coop"), [max, setMax] = useState(4), [pub, setPub] = useState(true), [diff, setDiff] = useState("normal");
  useEffect(() => { Mp.connect(); const id = setInterval(() => Mp.list(), 6000); setTimeout(() => Mp.list(), 400); return () => { clearInterval(id); Mp.send("lobby.leave"); }; }, []);
  if (!Mp.canUse()) return <div class="mp"><p class="muted">{L(W.needLogin)}</p><Btn onClick={() => { UIM.sub = "account"; bump(); }}>{`[[log-in]] ${P.t("mAccount")}`}</Btn></div>;
  const go = k => { UIM.mpTab = k; setTab(k); };
  return <div class="mp">
    {Mp.status !== "online" ? <p class="muted small"><Icon n="loader" size={14} cls="spin"/> {L(MPT.offline)}</p> : null}
    <Invites/>
    {Mp.room && Mp.room.state === "playing" ? <Btn block kind="gold" onClick={() => Mp.join(Mp.room.code)}>{`[[play]] ${L(W.rejoin)}`}</Btn> : null}
    <Tabs items={[{id:"rooms", label:L(W.rooms), on:tab === "rooms", fn:() => go("rooms")}, {id:"friends", label:L(W.friends), on:tab === "friends", fn:() => go("friends"), badge:(Mp.friends.incoming || []).length}]}/>
    {Mp.msg ? <p class="msg bad">{Mp.msg}</p> : null}
    {tab === "rooms" ? <>
      <div class="mpcreate card">
        <b class="mph">{L(W.create)}</b>
        <div class="mpmodes">{[["coop", "users", P.UI.mpCoop, P.UI.mpCoopD], ["versus", "swords", P.UI.mpVersus, P.UI.mpVersusD]].map(([m, ic, n, d]) =>
          <button type="button" key={m} class={"mode " + (mode === m ? "on" : "")} onClick={() => { Audio.play("toggle"); setMode(m); }}><Icon n={ic} size={22}/><span><b>{L(n)}</b><small>{L(d)}</small></span></button>)}</div>
        <div class="mprow"><span class="muted small">{L(W.players)}</span><Seg items={[2, 3, 4].map(n => ({id:"n" + n, label:String(n), on:max === n, fn:() => setMax(n)}))}/>
          <span class="muted small">{L(W.diff)}</span><Seg items={[["normal", W.normal], ["hard", W.hard]].map(([d, l]) => ({id:d, label:L(l), on:diff === d, fn:() => setDiff(d)}))}/></div>
        <div class="mprow"><Seg items={[{id:"pub", label:L(W.public), on:pub, fn:() => setPub(true)}, {id:"prv", label:L(W.private), on:!pub, fn:() => setPub(false)}]}/>
          <span class="grow"/><Btn onClick={() => Mp.create({mode, max, public:pub, diff})} disabled={Mp.status !== "online"}>{`[[plus]] ${L(W.create)}`}</Btn></div>
      </div>
      <div class="mpjoin card"><b class="mph">{L(W.joinCode)}</b>
        <div class="mprow"><input class="input mono" maxLength={6} placeholder={L(W.code)} value={code} onInput={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}/>
          <Btn disabled={code.length !== 6 || Mp.status !== "online"} onClick={() => Mp.join(code)}>{L(W.join)}</Btn></div></div>
      <div class="mprow"><b class="mph grow">{L(W.publicRooms)}</b><IconBtn n="refresh-cw" title={L(W.refresh)} onClick={() => Mp.list()}/></div>
      <div class="mprooms">{Mp.rooms.length ? Mp.rooms.map(r => <div class="card mproom" key={r.code}>
        <Icon n={r.mode === "versus" ? "swords" : "users"} size={22} color="accent"/>
        <div class="grow"><b>{L(r.mode === "versus" ? P.UI.mpVersus : P.UI.mpCoop)}</b><small class="muted">{r.host} · {L(r.diff === "hard" ? W.hard : W.normal)}</small></div>
        <span class="mono">{r.n}/{r.max}</span><Btn size="sm" onClick={() => Mp.join(r.code)}>{L(W.join)}</Btn>
      </div>) : <p class="muted small">{L(W.noRooms)}</p>}</div>
    </> : <Friends/>}
  </div>;
}
function Friends({inviting}){
  const [q, setQ] = useState(""), F = Mp.friends;
  useEffect(() => { Mp.loadFriends(); }, []);
  const where = f => (!f.online ? L(W.offline) : f.where === "playing" ? L(W.playing) : f.where === "room" ? L(W.inRoom) : L(W.online));
  return <div class="mpfriends">
    {!inviting ? <div class="mprow"><input class="input" placeholder={L(W.search)} value={q} onInput={e => { setQ(e.target.value); Mp.search(e.target.value); }}/></div> : null}
    {!inviting && q && Mp.found.length ? <div class="mpfound">{Mp.found.map(u => <div class="mpfr" key={u.username}><Avatar p={u}/><span class="grow"><b>{u.displayName}</b><small class="muted mono">@{u.username}</small></span>
      <Btn size="sm" kind="ghost" onClick={() => Mp.friendReq(u.username)}>{`[[user-plus]] ${L(W.add)}`}</Btn></div>)}</div> : null}
    {!inviting && (F.incoming || []).length ? <><b class="mph">{L(W.incoming)}</b>{F.incoming.map(u => <div class="mpfr" key={u.username}><Avatar p={u}/><span class="grow"><b>{u.displayName}</b><small class="muted mono">@{u.username}</small></span>
      <Btn size="sm" onClick={() => Mp.respond(u.username, true)}>{L(W.accept)}</Btn><Btn size="sm" kind="ghost" onClick={() => Mp.respond(u.username, false)}>{L(W.decline)}</Btn></div>)}</> : null}
    <b class="mph">{L(W.friends)} <span class="muted mono">{(F.friends || []).length}</span></b>
    {(F.friends || []).length ? F.friends.map(f => <div class="mpfr" key={f.username}><Avatar p={f}/><span class="grow"><b>{f.displayName}</b><small class={"mono " + (f.online ? "good" : "muted")}>{where(f)}</small></span>
      {Mp.room && f.online && f.where !== "playing" ? <Btn size="sm" onClick={() => Mp.invite(f.username)}>{`[[send]] ${L(W.invite)}`}</Btn> : null}
      {!Mp.room && f.room ? <Btn size="sm" kind="ghost" onClick={() => Mp.join(f.room)}>{L(W.join)}</Btn> : null}
      {!inviting ? <IconBtn n="user-x" title={L(W.remove)} onClick={() => Mp.unfriend(f.username)}/> : null}
    </div>) : <p class="muted small">{L(W.noFriends)}</p>}
    {!inviting && (F.outgoing || []).length ? <><b class="mph">{L(W.outgoing)}</b>{F.outgoing.map(u => <div class="mpfr dim" key={u.username}><Avatar p={u}/><span class="grow"><b>{u.displayName}</b><small class="muted mono">@{u.username}</small></span></div>)}</> : null}
  </div>;
}
export function Invites(){
  if (!Mp.invites.length) return null;
  return <div class="mpinvites">{Mp.invites.slice(-3).map(i => <div class="mpinv glass-strong" key={i.code}>
    <Icon n="mail" size={20} color="gold"/><span class="grow"><b>{i.fromName}</b> {L(MPT.inviteFrom)} · {L(i.mode === "versus" ? P.UI.mpVersus : P.UI.mpCoop)}</span>
    <Btn size="sm" onClick={() => { if (UIM.screen === "game" && S.started && !S.mp){ P.autosave(); G.toMenu(); } Mp.join(i.code); UIM.sub = "room"; bump(); }}>{L(W.join)}</Btn>
    <IconBtn n="x" title={L(W.decline)} onClick={() => { Mp.invites = Mp.invites.filter(x => x !== i); bump(); }}/>
  </div>)}</div>;
}
/* the room: settings, players, ministries or home regions, ready, start */
export function SubRoom(){
  const r = Mp.room, [copied, setCopied] = useState(false), [inv, setInv] = useState(false);
  useEffect(() => { Mp.connect(); }, []);
  if (!r) return <div class="mp"><p class="muted">…</p><Btn kind="ghost" onClick={() => { UIM.sub = "mp"; bump(); }}>{L(W.rooms)}</Btn></div>;
  const me = Mp.me || {}, host = r.host === me.id, mine = r.players.find(p => p.id === me.id) || {}, coop = r.mode === "coop";
  const allReady = r.players.every(p => p.ready || p.host);
  return <div class="mp mproomv">
    <div class="mpcodebox"><small class="muted">{L(W.code)}</small><b class="mono">{r.code}</b>
      <Btn size="sm" kind="ghost" onClick={() => { try { navigator.clipboard.writeText(r.code); } catch(e){} setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? L(W.copied) : `[[copy]] ${L(W.copy)}`}</Btn></div>
    <div class="mprow"><Icon n={coop ? "users" : "swords"} size={22} color="accent"/><b class="grow">{L(coop ? P.UI.mpCoop : P.UI.mpVersus)}</b>
      {host ? <Seg items={[{id:"coop", label:L(P.UI.mpCoop), on:coop, fn:() => Mp.settings({mode:"coop"})}, {id:"versus", label:L(P.UI.mpVersus), on:!coop, fn:() => Mp.settings({mode:"versus"})}]}/> : null}</div>
    <p class="muted small">{L(coop ? W.howCoop : W.howVersus)}</p>
    {host ? <div class="mprow wrap"><span class="muted small">{L(W.players)}</span><Seg items={[2, 3, 4].map(n => ({id:"m" + n, label:String(n), on:r.max === n, fn:() => Mp.settings({max:n})}))}/>
      <span class="muted small">{L(W.diff)}</span><Seg items={[["normal", W.normal], ["hard", W.hard]].map(([d, l]) => ({id:d, label:L(l), on:r.diff === d, fn:() => Mp.settings({diff:d})}))}/>
      <Seg items={[{id:"pub", label:L(W.public), on:r.public, fn:() => Mp.settings({public:true})}, {id:"prv", label:L(W.private), on:!r.public, fn:() => Mp.settings({public:false})}]}/></div>
      : <p class="small"><span class="muted">{L(W.diff)}:</span> {L(r.diff === "hard" ? W.hard : W.normal)} · {r.public ? L(W.public) : L(W.private)}</p>}
    {coop && host ? <div class="mprow wrap"><span class="muted small">{L(W.leader)}</span>{P.CHARS.filter(c => P.Net.owns("char_" + c.id)).map(c => <button type="button" key={c.id} class={"mpchar " + (r.char === c.id ? "on" : "")} title={L(c.person)} onClick={() => Mp.settings({char:c.id})}><Portrait id={c.id} size={36}/></button>)}</div> : null}
    <div class="mpplayers">{r.players.map(p => <div class={"mpplayer card " + (p.id === me.id ? "me" : "")} key={p.id}>
      <Avatar p={p} size={40}/><Bubble id={p.id}/>
      <span class="grow"><b>{p.displayName}{p.id === me.id ? <small class="muted"> ({L(W.you)})</small> : null}</b>
        <small class="muted">{p.host ? <><Icon n="crown" size={12} color="gold"/> {L(W.host)}</> : (p.ready ? L(W.ready) : L(W.notReady))}</small></span>
      <span class={"mpready " + (p.ready || p.host ? "good" : "muted")}><Icon n={p.ready || p.host ? "circle-check" : "circle-dashed"} size={18}/></span>
      {host && p.id !== me.id ? <IconBtn n="user-x" title={L(W.kick)} onClick={() => Mp.kick(p.id)}/> : null}
    </div>)}{Array.from({length:Math.max(0, r.max - r.players.length)}, (_, i) => <div class="mpplayer card empty" key={"e" + i}><span class="mpav empty"><Icon n="user-plus" size={16}/></span><span class="muted small">…</span></div>)}</div>
    {coop ? <div class="mprolepeek">{P.MP.ROLES.map(ro => <span key={ro.id} title={L(ro.does)}><RoleBadge id={ro.id} size={34}/><small>{L(ro.name)}</small></span>)}</div> : null}
    <p class="muted small"><Icon n="info" size={13}/> {L(W.pickInGame)}</p>
    <div class="mprow"><QuickBar/><Btn kind="ghost" size="sm" onClick={() => setInv(v => !v)}>{`[[user-plus]] ${L(W.invite)}`}</Btn></div>
    {inv ? <Friends inviting/> : null}
    {Mp.msg ? <p class="msg bad">{Mp.msg}</p> : null}
    <div class="mpfoot">
      <Btn kind="ghost" onClick={() => Mp.leave()}>{`[[log-out]] ${L(W.leave)}`}</Btn>
      {host ? <Btn size="lg" disabled={!allReady} onClick={() => Mp.start()}>{`${L(W.start)} [[play]]`}</Btn>
        : <Btn size="lg" kind={mine.ready ? "ghost" : "primary"} onClick={() => Mp.ready(!mine.ready)}>{mine.ready ? `[[circle-check]] ${L(W.ready)}` : L(W.ready)}</Btn>}
    </div>
  </div>;
}

/* ---------------- in the game ---------------- */
export function MpHud(){
  const g = Mp.game, r = Mp.room; if (!g || !S.mp) return null;
  const me = Mp.me || {};
  return <>
    <div class="mpbar glass">
      {(r ? r.players : []).map(p => { const roles = (g.roles || {})[p.id] || []; return <span class={"mpm " + (p.id === me.id ? "me" : "")} key={p.id} title={p.displayName}>
        <Avatar p={p} size={30}/><Bubble id={p.id}/>
        {g.mode === "coop" ? <span class="mproleic">{roles.map(x => <RoleBadge key={x} id={x} size={18}/>)}</span> : <small class="mpblocm">{p.bloc || ""}</small>}
      </span>; })}
      <QuickBar compact/>
    </div>
    {g.mode === "coop" ? <CoopBits/> : <Race/>}
  </>;
}
function CoopBits(){
  const g = Mp.game, v = g.vote, me = Mp.me || {}, mine = Mp.myRoles();
  return <>
    <div class="mpmine glass"><small class="muted">{L(W.yourRoles)}</small>{mine.map(x => <span key={x} class="mpchip" style={{"--rc":P.MP.ROLE[x].color}}><RoleBadge id={x} size={22}/>{L(P.MP.ROLE[x].name)}</span>)}</div>
    {v && v.kind === "evac" ? <div class="mpvote glass-strong">
      <b><Icon n="siren" size={18} color="bad"/> {L(W.evacVote)} · {REGN(v.reg)}</b>
      <small class="muted">{v.n} · <Rich t={`${P.IC.ep} ${v.cost}`} iconColor="inherit"/> · {Mp.nameOf(v.by)}</small>
      <div class="mprow"><Btn size="sm" kind={v.votes[me.id] === true ? "primary" : "ghost"} onClick={() => Mp.voteYes(true)}>{L(W.yes)} · {Object.values(v.votes).filter(Boolean).length}</Btn>
        <Btn size="sm" kind={v.votes[me.id] === false ? "danger" : "ghost"} onClick={() => Mp.voteYes(false)}>{L(W.no)} · {Object.values(v.votes).filter(x => x === false).length}</Btn>
        <span class="grow"/><b class="mono warn">{v.left}{L(W.voteLeft)}</b></div>
    </div> : null}
  </>;
}
/* who voted for an option (shown on the event window in co-op) */
export function VoteDots({i}){
  const g = Mp.game; if (!g || !g.vote || g.vote.kind !== "event" || !Mp.room) return null;
  const who = Object.entries(g.vote.votes).filter(([, v]) => v === i).map(([id]) => Mp.room.players.find(p => p.id === Number(id))).filter(Boolean);
  return who.length ? <span class="vdots">{who.map(p => <Avatar key={p.id} p={p} size={22}/>)}</span> : null;
}
export function VoteHead(){
  const g = Mp.game; if (!g) return null;
  if (g.mode === "coop" && g.vote && g.vote.kind === "event") return <div class="mpvotehead"><Icon n="vote" size={16}/> {L(W.vote)} · <b class="mono warn">{g.vote.left}{L(W.voteLeft)}</b> · {Object.keys(g.vote.votes).length}/{(Mp.room ? Mp.room.players.filter(p => p.online).length : 1)}</div>;
  if (g.mode === "versus" && g.evLeft != null) return <div class="mpvotehead"><Icon n="timer" size={16}/> <b class="mono warn">{g.evLeft}{L(W.voteLeft)}</b></div>;
  return null;
}
function Race(){
  const g = Mp.game, me = Mp.me || {}, V = P.MP.VS, [open, setOpen] = useState(true);
  const rk = g.ranking || [], cd = g.cd || {};
  return <>
    <div class={"mprace glass " + (open ? "" : "shut")}>
      <button type="button" class="mprh" onClick={() => setOpen(o => !o)}><Icon n="trophy" size={16} color="gold"/><b>{L(W.race)}</b><span class="grow"/><small class="mono bad">{L(W.shared)} +{(g.T || 0).toFixed(2)}°C</small><Icon n={open ? "chevron-up" : "chevron-down"} size={16}/></button>
      {open ? rk.map(x => { const self = x.id === me.id; return <div class={"mprk " + (self ? "me" : "") + (x.over === "l2" ? " out" : "")} key={x.id}>
        <b class="mono rk">{x.rank}</b><span class="grow"><b>{x.displayName}{x.biggest ? <span class="bad" title={L(W.biggest)}> <Icon n="flame" size={13}/></span> : null}</b>
          <small class="muted">{REGN(x.bloc)} · <span class="mono">{x.net.toFixed(1)} Gt</span> · {x.appr}%{x.tariffs ? <> · <Icon n="ban" size={11}/>{x.tariffs}</> : null}</small></span>
        {!self && x.over !== "l2" && !S.over ? <span class="mpvs">
          <IconBtn n={V.aid.icon} title={`${L(V.aid.name)} · ${L(V.aid.desc)}`} disabled={(cd.vsAid || 0) > S.tick || S.ep < V.aid.ep} onClick={() => Mp.vsAct("vsAid", x.id)}/>
          <IconBtn n={V.tariff.icon} title={`${L(V.tariff.name)} · ${L(V.tariff.desc)}`} disabled={(cd.vsTariff || 0) > S.tick || S.pc < V.tariff.pc || x.net <= P.netCO2()} onClick={() => Mp.vsAct("vsTariff", x.id)}/>
          <IconBtn n={V.pact.icon} title={`${L(V.pact.name)} · ${L(V.pact.desc)}`} disabled={(cd.vsPact || 0) > S.tick || S.pc < V.pact.pc} onClick={() => Mp.vsAct("vsPact", x.id)}/>
        </span> : null}
      </div>; }) : null}
    </div>
    {(g.offers || []).map(o => <div class="mpoffer glass-strong" key={o.from}><Icon n="handshake" size={20} color="good"/><span class="grow"><b>{o.username}</b> {L(W.offer)} <small class="muted">({o.left}s)</small><br/><small class="muted">{L(V.pact.desc)}</small></span>
      <Btn size="sm" onClick={() => Mp.vsAct("vsPactAnswer", o.from, true)}>{L(W.accept)}</Btn><Btn size="sm" kind="ghost" onClick={() => Mp.vsAct("vsPactAnswer", o.from, false)}>{L(W.decline)}</Btn></div>)}
  </>;
}
/* the end of a multiplayer game */
export function MpEnd(){
  const g = Mp.game || {}, r = Mp.room, host = Mp.isHost(), me = Mp.me || {};
  const back = () => { if (host) Mp.again(); Mp.exitGame(); UIM.sub = "room"; bump(); };
  if (g.mode === "versus"){
    const rk = g.ranking || [], win = rk.find(x => x.over === "win");
    return <div class="veil end-veil"><section class="modal end mpend" role="dialog" aria-modal="true">
      <div class="tag accent"><Rich t={up(`[[swords]] ${L(P.UI.mpVersus)}`)} iconColor="inherit"/></div>
      <h2>{win ? `${L(W.winner)}: ${win.displayName}` : (g.T || 0) >= 3 ? L(W.allLose) : L(W.result)}</h2>
      <div class="mprklist">{rk.map(x => <div class={"mprk big " + (x.id === me.id ? "me" : "")} key={x.id}><b class="mono rk">{x.rank}</b><Avatar p={x} size={34}/><span class="grow"><b>{x.displayName}</b><small class="muted">{REGN(x.bloc)} · {x.net.toFixed(1)} Gt · {x.appr}%</small></span><b class="mono">{x.score.toLocaleString()}</b></div>)}</div>
      <div class="endfoot"><span class="grow"/><Btn kind="ghost" onClick={() => { Mp.leaveGame(); }}>{L(W.menu)}</Btn><Btn onClick={back}>{host ? L(W.back) : L(W.back)}</Btn></div>
    </section></div>;
  }
  const win = S.over === "win", ng = P.goodYears ? P.goodYears() : 0, e2 = P.ending2 ? P.ending2() : null;
  return <div class="veil end-veil"><section class={"modal end mpend " + (win ? "win" : "lose")} role="dialog" aria-modal="true">
    <div class={"tag " + (win ? "good" : "bad")}><Rich t={up(`[[users]] ${L(P.UI.mpCoop)} · ${P.dateStr()}`)} iconColor="inherit"/></div>
    <h2>{win ? L(W.coopWin) : L(W.coopLose)}</h2>
    {e2 ? <><p class={"end2t " + (win ? "good" : "bad")}>{L(e2.title)}</p><p>{L(e2.body)}</p></> : null}
    <p class="small muted">{L(P.UI2.yrGoodYears)} <b class="good mono">{ng}</b> / {(S.years || []).length} · CO₂ {P.netCO2().toFixed(1)} Gt · +{S.temp.toFixed(2)}°C</p>
    <div class="mpplayers">{(r ? r.players : []).map(p => <div class="mpplayer card" key={p.id}><Avatar p={p}/><span class="grow"><b>{p.displayName}</b><span class="mpendroles">{((g.roles || {})[p.id] || []).map(x => <span key={x}><RoleBadge id={x} size={20}/>{L(P.MP.ROLE[x].name)}</span>)}</span></span></div>)}</div>
    <div class="endfoot"><span class="grow"/><Btn kind="ghost" onClick={() => Mp.leaveGame()}>{L(W.menu)}</Btn><Btn onClick={back}>{L(W.back)}</Btn></div>
  </section></div>;
}
export const MPW = W;

/* ---------------- the opening pick (in the game, before the clock starts) ---------------- */
export function MpPick(){
  const g = Mp.game, me = Mp.me || {}, r = Mp.room; if (!g || !r) return null;
  const picks = g.picks || {}, mine = picks[me.id] || {roles:[], bloc:null, ready:false}, coop = g.mode === "coop";
  const who = id => { const p = r.players.find(x => x.id === Number(id)); return p ? p : {username:"?", displayName:"?"}; };
  const owner = test => Object.entries(picks).find(([id, v]) => Number(id) !== me.id && test(v));
  return <div class="veil mppick-veil"><section class="modal mppick" role="dialog" aria-modal="true">
    <div class="mprow"><div class="tag accent grow"><Rich t={up(`[[${coop ? "users" : "swords"}]] ${L(coop ? P.UI.mpCoop : P.UI.mpVersus)}`)} iconColor="inherit"/></div><b class="mono warn">{g.left}{L(W.leftS)}</b></div>
    <h2>{L(coop ? W.pickTitleCoop : W.pickTitleVs)}</h2>
    <p class="muted small">{coop ? L(W.roles) + " · " + L(W.rolesNote) : L(W.blocNote)}</p>
    {coop ? <div class="mproles big">{P.MP.ROLES.map(ro => {
      const on = mine.roles.includes(ro.id), own = owner(v => v.roles.includes(ro.id));
      return <button type="button" key={ro.id} class={"mprole " + (on ? "on" : "") + (own ? " busy" : "")} disabled={!!own || mine.ready} style={{"--rc":ro.color}}
        onClick={() => { Audio.play("toggle"); const cur = ((Mp.game.picks || {})[me.id] || mine).roles || [];   // read it now: a newer state may have arrived since this render
          Mp.pickRoles(cur.includes(ro.id) ? cur.filter(x => x !== ro.id) : [...cur, ro.id].slice(-2)); }}>
        <RoleBadge id={ro.id} size={54}/>
        <span><b>{L(ro.name)}</b><small>{L(ro.does)}</small>{own ? <em class="mptaken">{L(W.takenBy)} {who(own[0]).displayName}</em> : null}</span>
        {on ? <Icon n="circle-check" size={20} cls="mpcheck"/> : null}
      </button>; })}</div>
    : <div class="mpblocs big">{["SEA", "EU", "NA", "EA", "SA", "MEAF"].map(b => {
      const on = mine.bloc === b, own = owner(v => v.bloc === b);
      return <button type="button" key={b} class={"mpbloc " + (on ? "on" : "")} disabled={!!own || mine.ready}
        onPointerEnter={() => GameMap.focus && GameMap.focus(b, false)} onClick={() => { Audio.play("toggle"); Mp.pickBloc(b); GameMap.focus(b, true); }}>
        <Icon n="map-pin" size={18}/><span><b>{REGN(b)}</b>{own ? <em class="mptaken">{L(W.takenBy)} {who(own[0]).displayName}</em> : null}</span>
      </button>; })}</div>}
    <div class="mppickers">{r.players.map(p => { const v = picks[p.id] || {}; return <span key={p.id} class={"mppk " + (v.ready ? "ready" : "")}>
      <Avatar p={p} size={30}/><small>{p.displayName}</small>
      <span class="mppkv">{coop ? (v.roles || []).map(x => <RoleBadge key={x} id={x} size={20}/>) : v.bloc ? <small class="mono acc">{v.bloc}</small> : null}{v.ready ? <Icon n="circle-check" size={16} color="good"/> : null}</span>
    </span>; })}</div>
    <div class="mpfoot"><small class="muted grow">{L(W.pickWait)}</small>
      <Btn size="lg" kind={mine.ready ? "ghost" : "primary"} onClick={() => Mp.pickReady(!mine.ready)}>{mine.ready ? L(W.pickUnready) : `${L(W.pickReady)} [[check]]`}</Btn></div>
  </section></div>;
}
