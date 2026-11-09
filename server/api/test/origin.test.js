import { test } from "node:test";
import assert from "node:assert/strict";
import { isAppOrigin } from "../src/settings.js";

test("the game's app builds may call the API", () => {
  for (const o of ["http://127.0.0.1:51234", "http://localhost:8080", "https://localhost", "capacitor://localhost", "https://appassets.androidplatform.net", "null", "file://"])
    assert.equal(isAppOrigin(o), true, o);
});
test("other sites are not app builds", () => {
  for (const o of ["https://evil.example", "http://localhost.evil.example", "http://127.0.0.1.evil.example:80", "https://localhost:8080.evil.example", ""])
    assert.equal(isAppOrigin(o), false, o);
});
