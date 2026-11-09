/* Map projection shared by the build tools and the game.
   3.7: Miller cylindrical (was Robinson), so the world is a full rectangle like Plague Inc's map and fills the screen.
   Centred on 11°E, cropped to 84°N … 57°S, scaled so the whole world is MAP.W units wide. */
import {geoMiller} from "d3-geo-projection";

const W = 2400, LON0 = 11, LAT_TOP = 84, LAT_BOT = -57;
const K = W / (2 * Math.PI);
const base = geoMiller().rotate([-LON0, 0]).scale(K).translate([W / 2, 0]);
const yTop = base([LON0, LAT_TOP])[1], yBot = base([LON0, LAT_BOT])[1];
export const MAP = {W, H:Math.round(yBot - yTop), lon0:LON0, latTop:LAT_TOP, latBot:LAT_BOT};
export const projection = () => geoMiller().rotate([-LON0, 0]).scale(K).translate([W / 2, -yTop]);
const P = projection();
/* [lat, lon] → map units */
export const ll = (lat, lon) => P([lon, lat]);
