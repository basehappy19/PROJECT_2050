/* 4.0 · The end of the game as live news footage: 12 animated scenes, one per ending (how it ended × good years),
   drawn in code (SVG + CSS animation, no photos or AI pictures). Shown inside the "TV" of the news end screen.
   Kinds: win0 win1 win2 (down to the wire · through every obstacle · golden age)
          l2_0 l2_1 l2_2 (removed: no results · good work, people left behind · lost trust at the end)
          l3_0 l3_1 l3_2 (time over: too slow · so close · one step short)
          l1_0 l1_1 l1_2 (runaway warming: too hot · tipping points · nature set off)
   Every moving part is a CSS animation (style.css, .scn …), so it costs no JavaScript per frame and stops for
   people who ask for reduced motion. */

const W = 1600, H = 900;
const rng = seed => { let s = seed >>> 0 || 1; return () => ((s = (s * 16807) % 2147483647) / 2147483647); };
const st = o => o;   // style object (CSS variables are passed through by Preact)

/* ---------------- parts ---------------- */
function Sky({id, top, mid, bot}){
  return <>
    <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color={top}/><stop offset=".6" stop-color={mid || bot}/><stop offset="1" stop-color={bot}/></linearGradient></defs>
    <rect width={W} height={H} fill={`url(#${id})`}/>
  </>;
}
function Sun({x, y, r, c, glow = .35, cls = ""}){
  return <g class={cls}>
    <circle cx={x} cy={y} r={r * 2.4} fill={c} opacity={glow * .35}/>
    <circle cx={x} cy={y} r={r * 1.6} fill={c} opacity={glow * .6}/>
    <circle cx={x} cy={y} r={r} fill={c}/>
  </g>;
}
function Clouds({n = 5, c = "#fff", op = .85, y0 = 60, y1 = 300, sp = 70, seed = 3}){
  const R = rng(seed), out = [];
  for (let i = 0; i < n; i++){
    const y = y0 + R() * (y1 - y0), s = .6 + R() * .9, d = sp * (.7 + R() * .6);
    out.push(<g key={i} class="sc-drift" style={st({"--d":`${d}s`, "animationDelay":`${-R() * d}s`})}>
      <g transform={`translate(-300 ${y}) scale(${s})`} fill={c} opacity={op}>
        <ellipse cx="0" cy="0" rx="90" ry="34"/><ellipse cx="55" cy="-22" rx="60" ry="40"/><ellipse cx="-50" cy="-12" rx="50" ry="30"/><ellipse cx="110" cy="4" rx="56" ry="26"/>
      </g>
    </g>);
  }
  return <g>{out}</g>;
}
const Hill = ({d, c, o = 1}) => <path d={d} fill={c} opacity={o}/>;
function Skyline({y, c, win = null, seed = 7, x0 = 0, x1 = W, hMin = 80, hMax = 300, lit = .5}){
  const R = rng(seed), out = [];
  let x = x0;
  while (x < x1){
    const w = 50 + R() * 90, h = hMin + R() * (hMax - hMin);
    out.push(<rect key={"b" + x} x={x} y={y - h} width={w} height={h} fill={c}/>);
    if (win) for (let wy = y - h + 14; wy < y - 16; wy += 26) for (let wx = x + 10; wx < x + w - 14; wx += 20) if (R() < lit) out.push(<rect key={`w${wx},${wy}`} x={wx} y={wy} width="9" height="12" fill={win} class={R() < .12 ? "sc-blink" : ""} style={st({"animationDelay":`${-R() * 6}s`})}/>);
    x += w + 4 + R() * 10;
  }
  return <g>{out}</g>;
}
function Turbine({x, y, h, c = "#f4f7f5", sp = 4, delay = 0}){
  const hy = y - h, r = h * .42;
  return <g>
    <path d={`M${x - h * .022} ${y} L${x - h * .01} ${hy} L${x + h * .01} ${hy} L${x + h * .022} ${y} Z`} fill={c}/>
    <g class="sc-spin" style={st({"transformOrigin":`${x}px ${hy}px`, "--d":`${sp}s`, "animationDelay":`${-delay}s`})}>
      {[0, 120, 240].map(a => <path key={a} transform={`rotate(${a} ${x} ${hy})`} d={`M${x - 4} ${hy} Q${x - 9} ${hy - r * .5} ${x} ${hy - r} Q${x + 5} ${hy - r * .5} ${x + 4} ${hy} Z`} fill={c}/>)}
    </g>
    <circle cx={x} cy={hy} r={h * .025} fill={c}/>
  </g>;
}
function Solar({x, y, n = 4, s = 1}){
  const out = [];
  for (let i = 0; i < n; i++) out.push(<g key={i} transform={`translate(${x + i * 92 * s} ${y}) scale(${s})`}>
    <path d="M0 0 L80 0 L64 -34 L-16 -34 Z" fill="#1f4f9f"/><path d="M0 0 L80 0 L64 -34 L-16 -34 Z" fill="none" stroke="#9cc3ff" stroke-width="2" opacity=".6"/>
    <path d="M20 0 L4 -34 M40 0 L24 -34 M60 0 L44 -34 M-8 -17 L72 -17" stroke="#9cc3ff" stroke-width="1.5" opacity=".45"/>
    <rect x="34" y="0" width="6" height="16" fill="#3a4550"/>
    <rect class="sc-glint" x="-10" y="-30" width="18" height="26" fill="#fff" opacity="0" transform="skewX(-25)" style={st({"animationDelay":`${i * .6}s`})}/>
  </g>);
  return <g>{out}</g>;
}
function Stack({x, y, h = 220, w = 34, smoke = "#6b6e72", n = 6, sp = 7, c = "#8a8d91", stripe = "#c8402e"}){
  const out = [];
  for (let i = 0; i < n; i++) out.push(<circle key={i} class="sc-puff" cx={x} cy={y - h - 10} r={w * .7} fill={smoke} style={st({"--d":`${sp}s`, "animationDelay":`${-i * sp / n}s`})}/>);
  return <g>
    {out}
    <path d={`M${x - w / 2} ${y} L${x - w * .38} ${y - h} L${x + w * .38} ${y - h} L${x + w / 2} ${y} Z`} fill={c}/>
    <rect x={x - w * .4} y={y - h + 14} width={w * .8} height="12" fill={stripe}/>
  </g>;
}
function Train({y, c = "#f2f5f7", stripe = "#2bb3a6", cars = 6, sp = 9, dir = 1, delay = 0}){
  const L = 150, parts = [];
  for (let i = 0; i < cars; i++){
    const x = i * (L + 6);
    parts.push(<g key={i}>
      {i === 0 ? <path d={`M${x} ${y} L${x + L} ${y} L${x + L} ${y - 44} L${x + 40} ${y - 44} Q${x} ${y - 40} ${x} ${y - 10} Z`} fill={c}/> : <rect x={x} y={y - 44} width={L} height="44" rx="6" fill={c}/>}
      <rect x={x + (i === 0 ? 46 : 10)} y={y - 34} width={L - (i === 0 ? 56 : 20)} height="12" fill="#1b3446"/>
      <rect x={x} y={y - 18} width={L} height="6" fill={stripe}/>
    </g>);
  }
  const span = cars * (L + 6);
  return <g class="sc-train" style={st({"--d":`${sp}s`, "--x0":`${dir > 0 ? -span - 100 : W + 100}px`, "--x1":`${dir > 0 ? W + 100 : -span - 100}px`, "animationDelay":`${-delay}s`})}>{parts}</g>;
}
function Birds({n = 6, y = 200, sp = 18, seed = 5}){
  const R = rng(seed), out = [];
  for (let i = 0; i < n; i++){ const dy = y + R() * 120, s = .6 + R() * .6, d = sp * (.8 + R() * .5);
    out.push(<g key={i} class="sc-fly" style={st({"--d":`${d}s`, "animationDelay":`${-R() * d}s`})}><g transform={`translate(-60 ${dy}) scale(${s})`}><path class="sc-flap" d="M-16 0 Q-8 -10 0 0 Q8 -10 16 0" fill="none" stroke="#24313a" stroke-width="3" stroke-linecap="round"/></g></g>); }
  return <g>{out}</g>;
}
function Fireworks({n = 5, seed = 9, y0 = 80, y1 = 330}){
  const R = rng(seed), cols = ["#f2c14e", "#ff6b8a", "#7fe3b0", "#8fd0ff", "#ffffff", "#c3a6ff"], out = [];
  for (let i = 0; i < n; i++){
    const x = 150 + R() * (W - 300), y = y0 + R() * (y1 - y0), c = cols[i % cols.length], d = 2.4 + R() * 1.4, rays = [];
    for (let k = 0; k < 14; k++){ const a = k / 14 * Math.PI * 2; rays.push(<line key={k} x1={x + Math.cos(a) * 14} y1={y + Math.sin(a) * 14} x2={x + Math.cos(a) * 70} y2={y + Math.sin(a) * 70} stroke={c} stroke-width="4" stroke-linecap="round"/>); }
    out.push(<g key={i} class="sc-fw" style={st({"transformOrigin":`${x}px ${y}px`, "--d":`${d}s`, "animationDelay":`${-R() * d}s`})}>{rays}<circle cx={x} cy={y} r="8" fill={c}/></g>);
  }
  return <g>{out}</g>;
}
function Confetti({n = 40, seed = 11}){
  const R = rng(seed), cols = ["#f2c14e", "#4fd1c5", "#ff6b8a", "#8fd0ff", "#7fe3b0", "#ffffff"], out = [];
  for (let i = 0; i < n; i++){ const x = R() * W, d = 4 + R() * 4;
    out.push(<rect key={i} class="sc-fall" x={x} y="-30" width={8 + R() * 8} height={12 + R() * 8} fill={cols[i % cols.length]} style={st({"--d":`${d}s`, "--r":`${(R() - .5) * 900}deg`, "animationDelay":`${-R() * d}s`, "transformOrigin":`${x}px -20px`})}/>); }
  return <g>{out}</g>;
}
function Hq({x, y, s = 1, c = "#d9dde0", dome = "#9fb7c2", label = "GCT"}){
  return <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x="-200" y="-150" width="400" height="150" fill={c}/>
    {[-160, -100, -40, 20, 80, 140].map(cx => <rect key={cx} x={cx} y="-130" width="22" height="130" fill="#b6bcc1"/>)}
    <path d="M-220 -150 L0 -210 L220 -150 Z" fill={c}/>
    <path d="M-90 -205 Q0 -320 90 -205 Z" fill={dome}/>
    <rect x="-4" y="-330" width="8" height="40" fill="#5a646b"/>
    <path class="sc-flag" d="M4 -330 L52 -320 L4 -308 Z" fill="#4fd1c5" style={st({"transformOrigin":"4px -320px"})}/>
    <text x="0" y="-160" text-anchor="middle" font-family="Kanit, sans-serif" font-weight="700" font-size="30" fill="#4a5359">{label}</text>
  </g>;
}
function Crowd({y, n = 26, seed = 13, signs = [], tone = ["#3b2f2a", "#5a463b", "#7a5b46", "#2e3a44", "#4b5a66"], wear = ["#c8402e", "#2b6cb0", "#3fae6a", "#f2b441", "#6b4fa0", "#d06a2c"]}){
  const R = rng(seed), out = [];
  for (let i = 0; i < n; i++){
    const x = 30 + i * (W - 60) / n + R() * 20, s = .85 + R() * .35, sign = signs.length && R() < .45 ? signs[(R() * signs.length) | 0] : null, d = .9 + R() * .7;
    out.push(<g key={i} class="sc-bob" style={st({"--d":`${d}s`, "animationDelay":`${-R() * d}s`})}><g transform={`translate(${x} ${y}) scale(${s})`}>
      {sign ? <g><rect x="-2" y="-170" width="5" height="90" fill="#6b4a2b"/><rect x="-46" y="-214" width="96" height="48" rx="4" fill="#f4efe3"/><text x="2" y="-182" text-anchor="middle" font-family="Kanit, sans-serif" font-weight="700" font-size="20" fill="#c8402e">{sign}</text></g> : null}
      <path d="M-26 0 Q-26 -62 0 -66 Q26 -62 26 0 Z" fill={wear[i % wear.length]}/>
      <circle cx="0" cy="-84" r="18" fill={tone[i % tone.length]}/>
    </g></g>);
  }
  return <g>{out}</g>;
}
function Board({x, y, text, sub, c = "#ff5a4a", blink = true}){
  return <g transform={`translate(${x} ${y})`}>
    <rect x="-170" y="-70" width="340" height="120" rx="14" fill="#0b0f14" stroke="#2a323a" stroke-width="6"/>
    <text x="0" y="12" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-weight="600" font-size="64" fill={c} class={blink ? "sc-blink2" : ""}>{text}</text>
    {sub ? <text x="0" y="40" text-anchor="middle" font-family="Kanit, sans-serif" font-size="20" fill="#8fa9a6">{sub}</text> : null}
    <rect x="-6" y="50" width="12" height="160" fill="#2a323a"/>
  </g>;
}
function Fire({x, y, w = 300, seed = 17, n = 9}){
  const R = rng(seed), out = [];
  for (let i = 0; i < n; i++){ const fx = x + (i / (n - 1) - .5) * w + (R() - .5) * 20, h = 70 + R() * 90, d = .5 + R() * .5;
    out.push(<g key={i} class="sc-flick" style={st({"transformOrigin":`${fx}px ${y}px`, "--d":`${d}s`, "animationDelay":`${-R() * d}s`})}>
      <path d={`M${fx - 26} ${y} Q${fx - 30} ${y - h * .5} ${fx} ${y - h} Q${fx + 30} ${y - h * .5} ${fx + 26} ${y} Z`} fill="#ff6a1f"/>
      <path d={`M${fx - 14} ${y} Q${fx - 16} ${y - h * .35} ${fx} ${y - h * .62} Q${fx + 16} ${y - h * .35} ${fx + 14} ${y} Z`} fill="#ffd36e"/>
    </g>); }
  return <g><ellipse cx={x} cy={y - 30} rx={w * .7} ry="90" fill="#ff7a2a" opacity=".25"/>{out}</g>;
}
function Water({y, c = "#2f6f8f", c2 = "#3f86a8", rise = false}){
  return <g class={rise ? "sc-riseW" : ""}>
    <g class="sc-wave" style={st({"--d":"5s"})}><path d={`M-200 ${y} Q-100 ${y - 18} 0 ${y} T200 ${y} T400 ${y} T600 ${y} T800 ${y} T1000 ${y} T1200 ${y} T1400 ${y} T1600 ${y} T1800 ${y} V${H} H-200 Z`} fill={c2} opacity=".8"/></g>
    <g class="sc-wave" style={st({"--d":"7s", "animationDirection":"reverse"})}><path d={`M-200 ${y + 22} Q-100 ${y + 6} 0 ${y + 22} T200 ${y + 22} T400 ${y + 22} T600 ${y + 22} T800 ${y + 22} T1000 ${y + 22} T1200 ${y + 22} T1400 ${y + 22} T1600 ${y + 22} T1800 ${y + 22} V${H} H-200 Z`} fill={c}/></g>
  </g>;
}
function Rain({n = 60, seed = 19, c = "#bcd3e0"}){
  const R = rng(seed), out = [];
  for (let i = 0; i < n; i++){ const x = R() * (W + 200) - 100, d = .6 + R() * .4; out.push(<line key={i} class="sc-rain" x1={x} y1="-40" x2={x - 16} y2="0" stroke={c} stroke-width="2.5" opacity=".6" style={st({"--d":`${d}s`, "animationDelay":`${-R() * d}s`})}/>); }
  return <g>{out}</g>;
}
function Heat(){
  return <g class="sc-heat" opacity=".22">{[0, 1, 2, 3].map(i => <path key={i} d={`M-100 ${700 - i * 120} Q200 ${680 - i * 120} 500 ${700 - i * 120} T1100 ${700 - i * 120} T1700 ${700 - i * 120}`} fill="none" stroke="#fff3d6" stroke-width="10" style={st({"animationDelay":`${-i * 1.2}s`})}/>)}</g>;
}
function Smog({c = "#7d7a72", o = .35}){ return <rect class="sc-smog" width={W} height={H} fill={c} opacity={o}/>; }
function Crane({x, y, h = 360}){
  return <g>
    <path d={`M${x - 14} ${y} L${x - 8} ${y - h} L${x + 8} ${y - h} L${x + 14} ${y} Z`} fill="#f2b441"/>
    <path d={`M${x - 120} ${y - h} L${x + 300} ${y - h}`} stroke="#f2b441" stroke-width="14"/>
    <g class="sc-swing" style={st({"transformOrigin":`${x + 230}px ${y - h}px`})}><line x1={x + 230} y1={y - h} x2={x + 230} y2={y - h + 170} stroke="#2a323a" stroke-width="3"/><rect x={x + 205} y={y - h + 170} width="50" height="26" fill="#d9dde0"/></g>
  </g>;
}
function Bubbles({x, y, w = 600, n = 12, seed = 23, c = "#cfe7ef"}){
  const R = rng(seed), out = [];
  for (let i = 0; i < n; i++){ const bx = x + R() * w, d = 3 + R() * 3; out.push(<circle key={i} class="sc-bubble" cx={bx} cy={y} r={5 + R() * 9} fill="none" stroke={c} stroke-width="3" style={st({"--d":`${d}s`, "animationDelay":`${-R() * d}s`})}/>); }
  return <g>{out}</g>;
}
function Iceberg({x, y, s = 1, c = "#e8f6fb"}){
  return <g class="sc-sink" style={st({"transformOrigin":`${x}px ${y}px`})}><path transform={`translate(${x} ${y}) scale(${s})`} d="M-160 0 L-120 -70 L-60 -90 L-20 -150 L40 -110 L90 -130 L150 -40 L170 0 Z" fill={c}/><path transform={`translate(${x} ${y}) scale(${s})`} d="M-20 -150 L10 -60 L40 -110 Z" fill="#bfe1ec"/></g>;
}
const Ground = ({y, c}) => <rect x="0" y={y} width={W} height={H - y} fill={c}/>;
function Cracks({y, c = "#5a3a22"}){
  return <g stroke={c} stroke-width="4" fill="none" stroke-linecap="round">{[[120, 30], [380, 60], [700, 20], [980, 70], [1300, 40]].map(([x, dy], i) => <path key={i} d={`M${x} ${y + dy} l40 20 l-10 30 l50 18 m-50 -18 l-40 26`}/>)}</g>;
}
function Ticks({y}){ return <line x1="0" y1={y} x2={W} y2={y} stroke="rgba(0,0,0,.25)" stroke-width="3"/>; }

/* ---------------- the 12 scenes ---------------- */
const SCENES = {
  // win · down to the wire: the countdown hits zero at midnight, fireworks over the city
  win0: o => <>
    <Sky id="s-w0" top="#0b1430" mid="#24305a" bot="#5a4a6e"/>
    <Fireworks n={6}/>
    <Clouds n={3} c="#3b4a72" op={.6} y0={120} y1={260} sp={90}/>
    <Skyline y={720} c="#141c30" win="#ffd36e" lit={.55} seed={4}/>
    <Turbine x={1320} y={720} h={320} c="#cfd8e3" sp={5}/><Turbine x={1460} y={720} h={260} c="#cfd8e3" sp={4.4} delay={1}/>
    <Board x={330} y={430} text="00:00" sub={o.date ? `${o.date} · Net Zero` : "Net Zero"} c="#7fe3b0"/>
    <Ground y={720} c="#0d1424"/><Ticks y={720}/>
    <Crowd y={890} n={22} seed={31} signs={o.th ? ["NET ZERO", "เย้!", "เราทำได้"] : ["NET ZERO", "YES!", "WE DID IT"]} wear={["#4fd1c5", "#f2c14e", "#ff6b8a", "#8fd0ff", "#7fe3b0"]}/>
    <Confetti n={34}/>
  </>,
  // win · through every obstacle: sunrise over a wind farm, a clean train, confetti
  win1: o => <>
    <Sky id="s-w1" top="#ffb26b" mid="#ffd9a0" bot="#fff1d6"/>
    <Sun x={1100} y={360} r={90} c="#ffcf5a" glow={.6}/>
    <Clouds n={4} c="#fff7ea" op={.9} y0={80} y1={240}/>
    <Hill d="M0 560 C300 480 600 560 900 520 C1200 480 1400 540 1600 500 V900 H0 Z" c="#9dcf8e"/>
    {[220, 420, 640, 1300, 1480].map((x, i) => <Turbine key={x} x={x} y={540 - (i % 2) * 20} h={250 - (i % 3) * 30} sp={3.6 + i * .4} delay={i}/>)}
    <Hill d="M0 650 C320 600 640 660 960 620 C1250 590 1450 630 1600 610 V900 H0 Z" c="#5fae6b"/>
    <rect x="0" y="690" width={W} height="16" fill="#6b5a4a"/><rect x="0" y="700" width={W} height="4" fill="#b9b2a6"/>
    <Train y={700} sp={10}/>
    <Hill d="M0 760 C300 730 700 780 1000 750 C1300 725 1500 760 1600 750 V900 H0 Z" c="#3f8f55"/>
    <Solar x={160} y={830} n={5}/><Solar x={980} y={840} n={4}/>
    <Birds n={5} y={150}/>
    <Confetti n={26} seed={12}/>
  </>,
  // win · golden age: a green city in golden light, solar roofs, trees, birds, electric trains
  win2: o => <>
    <Sky id="s-w2" top="#7fc4e8" mid="#cfe9f2" bot="#fff4d8"/>
    <Sun x={300} y={210} r={80} c="#ffe08a" glow={.55}/>
    <Clouds n={4} c="#ffffff" op={.95}/>
    <Turbine x={1180} y={520} h={300} sp={4}/><Turbine x={1330} y={530} h={260} sp={3.6} delay={1.2}/><Turbine x={1460} y={540} h={230} sp={4.4} delay={.5}/>
    <Skyline y={620} c="#8fb8c9" seed={21} hMin={120} hMax={320} win="#e8fbff" lit={.25}/>
    <Skyline y={650} c="#5d8fa3" seed={22} hMin={60} hMax={200}/>
    {[180, 470, 760, 1050].map((x, i) => <g key={x} transform={`translate(${x} 630)`}><rect x="-80" y="-14" width="160" height="14" fill="#3fae6a"/>{[-60, -20, 20, 60].map(t => <circle key={t} cx={t} cy="-26" r="18" fill="#2f9a55"/>)}</g>)}
    <Ground y={650} c="#6fbf73"/>
    <rect x="0" y="690" width={W} height="14" fill="#7d8a8f"/>
    <Train y={700} sp={8} stripe="#3fae6a"/><Train y={700} sp={11} dir={-1} delay={4} stripe="#1f5fbf"/>
    <Ground y={720} c="#4fa868"/>
    <Solar x={120} y={820} n={6} s={1.05}/><Solar x={900} y={830} n={6}/>
    <Birds n={8} y={120} seed={8}/>
  </>,
  // removed · no results: smog, smokestacks, an angry crowd outside the GCT
  l2_0: o => <>
    <Sky id="s-l20" top="#7b6f66" mid="#a3968a" bot="#c9b8a6"/>
    <Sun x={1250} y={220} r={60} c="#f3d3a0" glow={.2}/>
    <Stack x={1180} y={600} h={300} n={7}/><Stack x={1330} y={600} h={260} n={6} sp={8}/><Stack x={1460} y={600} h={220} n={5}/>
    <Smog o={.28}/>
    <Hq x={560} y={640}/>
    <Ground y={640} c="#6e6a64"/>
    <Crowd y={890} n={26} seed={33} signs={o.th ? ["ลาออก!", "ไม่มีผลงาน", "ออกไป!"] : ["RESIGN!", "NO RESULTS", "OUT!"]}/>
  </>,
  // removed · good work, the people left behind: turbines in the distance, but the crowd is angry about prices
  l2_1: o => <>
    <Sky id="s-l21" top="#5d7894" mid="#93a9bb" bot="#d8cdb9"/>
    <Clouds n={4} c="#e9eef2" op={.7}/>
    {[1100, 1240, 1380, 1500].map((x, i) => <Turbine key={x} x={x} y={600} h={230 - i * 15} sp={4 + i * .3} delay={i}/>)}
    <Hq x={540} y={640} c="#e1e4e6"/>
    <Ground y={640} c="#8a8f86"/>
    <Crowd y={890} n={24} seed={35} signs={o.th ? ["ค่าไฟแพง!", "งานหาย", "ฟังเราบ้าง"] : ["BILLS TOO HIGH", "OUR JOBS?", "LISTEN!"]}/>
  </>,
  // removed · lost trust at the end: evening rain, a thin crowd, the clean city carries on behind
  l2_2: o => <>
    <Sky id="s-l22" top="#2b3550" mid="#4c5a78" bot="#7d7f8f"/>
    <Clouds n={5} c="#5c667c" op={.8} y0={40} y1={200}/>
    <Skyline y={640} c="#3a4660" win="#ffe9a8" lit={.4} seed={41}/>
    <Turbine x={1300} y={640} h={300} c="#d5dde6" sp={4}/><Turbine x={1450} y={640} h={250} c="#d5dde6" sp={4.6} delay={1}/>
    <Hq x={520} y={660} c="#c9cdd1" dome="#7f97a3"/>
    <Ground y={660} c="#4a4f57"/>
    <Rain n={70}/>
    <Crowd y={890} n={12} seed={37} signs={o.th ? ["หมดศรัทธา"] : ["NO TRUST"]}/>
  </>,
  // time over · too slow: 2051 on the board, a smoggy city still burning coal
  l3_0: o => <>
    <Sky id="s-l30" top="#6f6a63" mid="#9a9086" bot="#bfae98"/>
    <Sun x={1200} y={260} r={70} c="#e9c79a" glow={.15}/>
    <Skyline y={660} c="#4a4744" win="#d9c08a" lit={.3} seed={51}/>
    <Stack x={300} y={660} h={320} n={8}/><Stack x={1100} y={660} h={280} n={7}/><Stack x={1400} y={660} h={300} n={7} sp={8}/>
    <Smog o={.32}/>
    <Board x={760} y={420} text="2051" sub={o.th ? "ยังไม่ถึง Net Zero" : "No Net Zero yet"}/>
    <Ground y={660} c="#5f5a54"/>
    <rect x="0" y="740" width={W} height="60" fill="#3d3a37"/>
    <Train y={790} sp={14} c="#d9622b" stripe="#f2c14e" cars={7}/>
  </>,
  // time over · so close: half the city clean, half still smoking, the sun behind haze
  l3_1: o => <>
    <Sky id="s-l31" top="#8db3c9" mid="#c9c2b0" bot="#d9c3a4"/>
    <Sun x={800} y={250} r={80} c="#ffd28a" glow={.35}/>
    <Clouds n={3} c="#f1ece4" op={.7}/>
    <Turbine x={160} y={640} h={300} sp={4}/><Turbine x={320} y={640} h={250} sp={4.6} delay={1}/><Turbine x={470} y={640} h={220} sp={3.8} delay={2}/>
    <Skyline y={660} c="#6f8a96" seed={61} x0={0} x1={760}/>
    <Skyline y={660} c="#605a54" seed={62} x0={840} x1={W}/>
    <Stack x={1180} y={660} h={280} n={6}/><Stack x={1400} y={660} h={240} n={5} sp={8}/>
    <Board x={800} y={470} text="2051" sub={o.nz ? (o.th ? `ไปถึงแล้ว ${o.nz}%` : `${o.nz}% of the way`) : (o.th ? "เกือบถึงแล้ว" : "So close")} c="#f2b441"/>
    <Ground y={660} c="#7d8a7a"/>
    <Solar x={80} y={820} n={5}/>
  </>,
  // time over · one step short: almost all clean, cranes building the last turbines, one last smokestack
  l3_2: o => <>
    <Sky id="s-l32" top="#7fc0e0" mid="#cfe5ee" bot="#f4e6c8"/>
    <Sun x={360} y={220} r={70} c="#ffe08a" glow={.45}/>
    <Clouds n={4} c="#ffffff" op={.9}/>
    {[700, 860, 1020].map((x, i) => <Turbine key={x} x={x} y={620} h={260 - i * 20} sp={4 + i * .4} delay={i}/>)}
    <Crane x={1180} y={640} h={360}/>
    <Stack x={1460} y={640} h={240} n={4} sp={9}/>
    <Skyline y={660} c="#7aa3b4" seed={71} x0={0} x1={640}/>
    <Ground y={660} c="#8fc48a"/>
    <Solar x={100} y={820} n={6}/><Solar x={760} y={830} n={5}/>
    <Birds n={4} y={140}/>
  </>,
  // runaway · too hot: a red sky, the hills on fire, cracked ground, heat shimmer
  l1_0: o => <>
    <Sky id="s-l10" top="#7a1f12" mid="#c4471f" bot="#f08a3a"/>
    <Sun x={1180} y={260} r={110} c="#ffcf6a" glow={.6}/>
    <Hill d="M0 560 C260 470 560 560 860 500 C1160 440 1400 520 1600 470 V900 H0 Z" c="#6e2a14"/>
    <Fire x={420} y={560} w={420} n={10}/><Fire x={1180} y={520} w={360} seed={18} n={8}/>
    <Clouds n={5} c="#3a2620" op={.55} y0={60} y1={260} sp={50} seed={8}/>
    <Ground y={680} c="#b5763f"/>
    <Cracks y={720}/>
    <Heat/>
  </>,
  // runaway · tipping points: the ice melting, methane bubbling out of the thawing ground, water rising
  l1_1: o => <>
    <Sky id="s-l11" top="#5a6f86" mid="#a7a9a3" bot="#d6b48c"/>
    <Sun x={1250} y={240} r={80} c="#ffd08a" glow={.3}/>
    <Iceberg x={420} y={600} s={1.4}/><Iceberg x={980} y={610} s={1}/>
    <Water y={600} rise/>
    <Bubbles x={200} y={880} w={1200} n={16}/>
    <Heat/>
  </>,
  // runaway · nature set off: a superstorm hits the seawall, the turbines still stand
  l1_2: o => <>
    <Sky id="s-l12" top="#1f2a3a" mid="#3c4a5e" bot="#6a7484"/>
    <Clouds n={7} c="#2a3446" op={.9} y0={30} y1={260} sp={20}/>
    <Turbine x={1250} y={600} h={300} c="#d5dde6" sp={1.6}/><Turbine x={1420} y={610} h={260} c="#d5dde6" sp={1.4} delay={.4}/>
    <Skyline y={620} c="#2c3644" win="#ffe9a8" lit={.2} seed={81} x0={0} x1={1000}/>
    <rect x="0" y="600" width={W} height="40" fill="#5a6470"/>
    <Water y={640} c="#24465c" c2="#355f78"/>
    <Rain n={110} c="#9fb4c4"/>
  </>,
};
export const sceneKind = (over, tier) => (over === "win" ? "win" : over + "_") + Math.max(0, Math.min(2, tier | 0));
export function EndScene({kind, cls = "", th = true, nz = 0, date = ""}){
  const draw = SCENES[kind] || SCENES.l3_1;
  return <svg class={"scn " + cls} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <g class="sc-cam">{draw({th, nz, date})}</g>
  </svg>;
}
