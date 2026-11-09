/* Runs before the shared engine: a tiny stand-in for the GDevelop UI toolkit hooks the engine and the server client call. */
const P = window.P2050 = window.P2050 || {};
P.Kit = {dirty(){ if (P._bump) P._bump(); }};
P.web = true;
/* 3.4: the English page (/en/) and ?lang=th|en links open the game in that language (the engine reads p2050-lang when it starts) */
try {
  const q = new URLSearchParams(location.search).get("lang"), l = q || (document.documentElement.lang === "en" ? "en" : null);
  if (l === "th" || l === "en") localStorage.setItem("p2050-lang", l);
} catch(e){}
