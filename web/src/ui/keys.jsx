/* 3.9: every keyboard shortcut in one window ("?" on a computer, or "Shortcuts" in the pause menu) */
import {P, S, L} from "../core.js";
import {G} from "../game.js";
import {Icon} from "./icon.jsx";
import {Modal} from "./modals.jsx";

const COLV = {accent:"var(--accent)", sky:"var(--sky)", purple:"var(--purple)", gold:"var(--gold)", pink:"#ff7aa8", muted:"var(--muted)"};
export const Kbd = ({k}) => <kbd class="kbd">{k}</kbd>;
export function KeysModal(){
  const th = S.lang === "th";
  return <Modal kind="keys" wide onClose={() => G.closeKeys()}>
    <div class="mbody">
      <h2><Icon n="keyboard" size={22}/> {th ? "ปุ่มลัด" : "Keyboard shortcuts"}</h2>
      <div class="kgrid">{P.KEYS.map(g => <section key={g.id} class="kgrp" style={{"--c":COLV[g.col]}}>
        <h3><Icon n={g.icon} size={16}/>{L(g.name)}</h3>
        {g.keys.map(([ks, what], i) => <div class="krow" key={i}><span class="kks">{ks.map(k => <Kbd key={k} k={k}/>)}</span><span>{L(what)}</span></div>)}
      </section>)}</div>
    </div>
  </Modal>;
}
