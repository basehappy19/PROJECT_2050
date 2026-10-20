/* Runs before the shared engine: a tiny stand-in for the GDevelop UI toolkit hooks the engine and the server client call. */
const P = window.P2050 = window.P2050 || {};
P.Kit = {dirty(){ if (P._bump) P._bump(); }};
P.web = true;
