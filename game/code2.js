gdjs.GameCode = {};
gdjs.GameCode.localVariables = [];
gdjs.GameCode.idToCallbackMap = new Map();
gdjs.GameCode.forEachIndex2 = 0;

gdjs.GameCode.forEachIndex3 = 0;

gdjs.GameCode.forEachObjects2 = [];

gdjs.GameCode.forEachObjects3 = [];

gdjs.GameCode.forEachTemporary2 = null;

gdjs.GameCode.forEachTemporary3 = null;

gdjs.GameCode.forEachTotalCount2 = 0;

gdjs.GameCode.forEachTotalCount3 = 0;

gdjs.GameCode.GDOceanObjects1= [];
gdjs.GameCode.GDOceanObjects2= [];
gdjs.GameCode.GDOceanObjects3= [];
gdjs.GameCode.GDMapRimObjects1= [];
gdjs.GameCode.GDMapRimObjects2= [];
gdjs.GameCode.GDMapRimObjects3= [];
gdjs.GameCode.GDArcticIceObjects1= [];
gdjs.GameCode.GDArcticIceObjects2= [];
gdjs.GameCode.GDArcticIceObjects3= [];
gdjs.GameCode.GDRegionObjects1= [];
gdjs.GameCode.GDRegionObjects2= [];
gdjs.GameCode.GDRegionObjects3= [];
gdjs.GameCode.GDRegionLineObjects1= [];
gdjs.GameCode.GDRegionLineObjects2= [];
gdjs.GameCode.GDRegionLineObjects3= [];
gdjs.GameCode.GDPlumeObjects1= [];
gdjs.GameCode.GDPlumeObjects2= [];
gdjs.GameCode.GDPlumeObjects3= [];
gdjs.GameCode.GDBubbleObjects1= [];
gdjs.GameCode.GDBubbleObjects2= [];
gdjs.GameCode.GDBubbleObjects3= [];
gdjs.GameCode.GDUIPainterObjects1= [];
gdjs.GameCode.GDUIPainterObjects2= [];
gdjs.GameCode.GDUIPainterObjects3= [];
gdjs.GameCode.GDUITextObjects1= [];
gdjs.GameCode.GDUITextObjects2= [];
gdjs.GameCode.GDUITextObjects3= [];
gdjs.GameCode.GDUIIconObjects1= [];
gdjs.GameCode.GDUIIconObjects2= [];
gdjs.GameCode.GDUIIconObjects3= [];
gdjs.GameCode.GDTutImageObjects1= [];
gdjs.GameCode.GDTutImageObjects2= [];
gdjs.GameCode.GDTutImageObjects3= [];
gdjs.GameCode.GDCodeInputObjects1= [];
gdjs.GameCode.GDCodeInputObjects2= [];
gdjs.GameCode.GDCodeInputObjects3= [];
gdjs.GameCode.GDBackdropObjects1= [];
gdjs.GameCode.GDBackdropObjects2= [];
gdjs.GameCode.GDBackdropObjects3= [];
gdjs.GameCode.GDPortraitObjects1= [];
gdjs.GameCode.GDPortraitObjects2= [];
gdjs.GameCode.GDPortraitObjects3= [];
gdjs.GameCode.GDEndArtObjects1= [];
gdjs.GameCode.GDEndArtObjects2= [];
gdjs.GameCode.GDEndArtObjects3= [];
gdjs.GameCode.GDLogoObjects1= [];
gdjs.GameCode.GDLogoObjects2= [];
gdjs.GameCode.GDLogoObjects3= [];


gdjs.GameCode.userFunc0xce1278 = function GDJSInlineCode(runtimeScene) {
"use strict";
if (!window.P2050 || !window.P2050.ready) { runtimeScene.getVariables().get("GoTo").setString("Loading"); return; }
window.P2050.Screens.setup(runtimeScene, "game");
};
gdjs.GameCode.eventsList0 = function(runtimeScene) {

{


gdjs.GameCode.userFunc0xce1278(runtimeScene);

}


};gdjs.GameCode.userFunc0xfe3f08 = function GDJSInlineCode(runtimeScene) {
"use strict";
const P = window.P2050; if (!P || !P.ready) return;
P.Screens.frame(runtimeScene);
};
gdjs.GameCode.userFunc0xfde040 = function GDJSInlineCode(runtimeScene) {
"use strict";
const P = window.P2050; if (!P || !P.ready) return;
P.tick();
};
gdjs.GameCode.eventsList1 = function(runtimeScene) {

{


gdjs.GameCode.userFunc0xfde040(runtimeScene);

}


};gdjs.GameCode.eventsList2 = function(runtimeScene) {

{


let isConditionTrue_0 = false;
isConditionTrue_0 = false;
{isConditionTrue_0 = (runtimeScene.getScene().getVariables().getFromIndex(2).getAsNumber() == 1);
}
if (isConditionTrue_0) {
isConditionTrue_0 = false;
isConditionTrue_0 = gdjs.evtTools.runtimeScene.getTimerElapsedTimeInSecondsOrNaN(runtimeScene, "tick") >= runtimeScene.getScene().getVariables().getFromIndex(3).getAsNumber();
}
if (isConditionTrue_0) {
{gdjs.evtTools.runtimeScene.resetTimer(runtimeScene, "tick");
}

{ //Subevents
gdjs.GameCode.eventsList1(runtimeScene);} //End of subevents
}

}


{


let isConditionTrue_0 = false;
isConditionTrue_0 = false;
{isConditionTrue_0 = (runtimeScene.getScene().getVariables().getFromIndex(2).getAsNumber() == 0);
}
if (isConditionTrue_0) {
{gdjs.evtTools.runtimeScene.resetTimer(runtimeScene, "tick");
}
}

}


};gdjs.GameCode.userFunc0xfe3288 = function GDJSInlineCode(runtimeScene) {
"use strict";
const P = window.P2050; if (!P || !P.ready) return;
runtimeScene.getVariables().get("UIConsumed").setNumber(P.Screens.release(runtimeScene));
};
gdjs.GameCode.eventsList3 = function(runtimeScene) {

{


gdjs.GameCode.userFunc0xfe3288(runtimeScene);

}


};gdjs.GameCode.mapOfGDgdjs_9546GameCode_9546GDBubbleObjects2Objects = Hashtable.newFrom({"Bubble": gdjs.GameCode.GDBubbleObjects2});
gdjs.GameCode.userFunc0xfe0b68 = function GDJSInlineCode(runtimeScene, objects) {
"use strict";
const P = window.P2050; if (!P || !P.ready) return;
if (objects.length) P.Map.popBubbleObject(objects[0]);
};
gdjs.GameCode.eventsList4 = function(runtimeScene) {

{

/* Reuse gdjs.GameCode.GDBubbleObjects2 */

const objects = gdjs.GameCode.GDBubbleObjects2;
gdjs.GameCode.userFunc0xfe0b68(runtimeScene, objects);

}


};gdjs.GameCode.userFunc0xfdece8 = function GDJSInlineCode(runtimeScene) {
"use strict";
const P = window.P2050; if (!P || !P.ready) return;
P.Map.click();
};
gdjs.GameCode.eventsList5 = function(runtimeScene) {

{


gdjs.GameCode.userFunc0xfdece8(runtimeScene);

}


};gdjs.GameCode.eventsList6 = function(runtimeScene) {

{


let isConditionTrue_0 = false;
isConditionTrue_0 = false;
isConditionTrue_0 = gdjs.evtTools.input.isMouseButtonReleased(runtimeScene, "Left");
if (isConditionTrue_0) {

{ //Subevents
gdjs.GameCode.eventsList3(runtimeScene);} //End of subevents
}

}


{

gdjs.copyArray(runtimeScene.getObjects("Bubble"), gdjs.GameCode.GDBubbleObjects2);

let isConditionTrue_0 = false;
isConditionTrue_0 = false;
isConditionTrue_0 = gdjs.evtTools.input.isMouseButtonReleased(runtimeScene, "Left");
if (isConditionTrue_0) {
isConditionTrue_0 = false;
{isConditionTrue_0 = (runtimeScene.getScene().getVariables().getFromIndex(1).getAsNumber() == 0);
}
if (isConditionTrue_0) {
isConditionTrue_0 = false;
isConditionTrue_0 = gdjs.evtTools.input.cursorOnObject(gdjs.GameCode.mapOfGDgdjs_9546GameCode_9546GDBubbleObjects2Objects, runtimeScene, true, false);
}
}
if (isConditionTrue_0) {
{runtimeScene.getScene().getVariables().getFromIndex(1).setNumber(1);
}

{ //Subevents
gdjs.GameCode.eventsList4(runtimeScene);} //End of subevents
}

}


{


let isConditionTrue_0 = false;
isConditionTrue_0 = false;
isConditionTrue_0 = gdjs.evtTools.input.isMouseButtonReleased(runtimeScene, "Left");
if (isConditionTrue_0) {
isConditionTrue_0 = false;
{isConditionTrue_0 = (runtimeScene.getScene().getVariables().getFromIndex(1).getAsNumber() == 0);
}
}
if (isConditionTrue_0) {

{ //Subevents
gdjs.GameCode.eventsList5(runtimeScene);} //End of subevents
}

}


};gdjs.GameCode.eventsList7 = function(runtimeScene) {

};gdjs.GameCode.eventsList8 = function(runtimeScene) {

};gdjs.GameCode.eventsList9 = function(runtimeScene) {

{

gdjs.copyArray(runtimeScene.getObjects("Plume"), gdjs.GameCode.GDPlumeObjects2);

for (gdjs.GameCode.forEachIndex3 = 0;gdjs.GameCode.forEachIndex3 < gdjs.GameCode.GDPlumeObjects2.length;++gdjs.GameCode.forEachIndex3) {
gdjs.GameCode.GDPlumeObjects3.length = 0;


gdjs.GameCode.forEachTemporary3 = gdjs.GameCode.GDPlumeObjects2[gdjs.GameCode.forEachIndex3];
gdjs.GameCode.GDPlumeObjects3.push(gdjs.GameCode.forEachTemporary3);
let isConditionTrue_0 = false;
if (true) {
{for(var i = 0, len = gdjs.GameCode.GDPlumeObjects3.length ;i < len;++i) {
    gdjs.GameCode.GDPlumeObjects3[i].setScale((gdjs.RuntimeObject.getVariableNumber(gdjs.GameCode.GDPlumeObjects3[i].getVariables().getFromIndex(3))) * (1 + 0.18 * Math.sin(gdjs.evtTools.runtimeScene.getTimeFromStartInSeconds(runtimeScene) * 2.4 + (gdjs.RuntimeObject.getVariableNumber(gdjs.GameCode.GDPlumeObjects3[i].getVariables().getFromIndex(2))))));
}
}
}
}

}


{

gdjs.copyArray(runtimeScene.getObjects("Bubble"), gdjs.GameCode.GDBubbleObjects1);

for (gdjs.GameCode.forEachIndex2 = 0;gdjs.GameCode.forEachIndex2 < gdjs.GameCode.GDBubbleObjects1.length;++gdjs.GameCode.forEachIndex2) {
gdjs.GameCode.GDBubbleObjects2.length = 0;


gdjs.GameCode.forEachTemporary2 = gdjs.GameCode.GDBubbleObjects1[gdjs.GameCode.forEachIndex2];
gdjs.GameCode.GDBubbleObjects2.push(gdjs.GameCode.forEachTemporary2);
let isConditionTrue_0 = false;
if (true) {
{for(var i = 0, len = gdjs.GameCode.GDBubbleObjects2.length ;i < len;++i) {
    gdjs.GameCode.GDBubbleObjects2[i].setY((gdjs.RuntimeObject.getVariableNumber(gdjs.GameCode.GDBubbleObjects2[i].getVariables().getFromIndex(1))) + Math.sin(gdjs.evtTools.runtimeScene.getTimeFromStartInSeconds(runtimeScene) * 4.5 + (gdjs.RuntimeObject.getVariableNumber(gdjs.GameCode.GDBubbleObjects2[i].getVariables().getFromIndex(2)))) * 5);
}
}
}
}

}


};gdjs.GameCode.eventsList10 = function(runtimeScene) {

{


let isConditionTrue_0 = false;
isConditionTrue_0 = false;
{isConditionTrue_0 = (runtimeScene.getScene().getVariables().getFromIndex(4).getAsNumber() == 1);
}
if (isConditionTrue_0) {
{gdjs.evtTools.sound.playMusicOnChannel(runtimeScene, "music-game1.mp3", 1, false, runtimeScene.getGame().getVariables().getFromIndex(1).getAsNumber(), 1);
}
}

}


{


let isConditionTrue_0 = false;
isConditionTrue_0 = false;
{isConditionTrue_0 = (runtimeScene.getScene().getVariables().getFromIndex(4).getAsNumber() == 0);
}
if (isConditionTrue_0) {
{gdjs.evtTools.sound.playMusicOnChannel(runtimeScene, "music-game2.mp3", 1, false, runtimeScene.getGame().getVariables().getFromIndex(1).getAsNumber(), 1);
}
}

}


};gdjs.GameCode.eventsList11 = function(runtimeScene) {

{


let isConditionTrue_0 = false;
isConditionTrue_0 = false;
{isConditionTrue_0 = (runtimeScene.getGame().getVariables().getFromIndex(0).getAsNumber() == 1);
}
if (isConditionTrue_0) {
isConditionTrue_0 = false;
isConditionTrue_0 = gdjs.evtTools.sound.isMusicOnChannelStopped(runtimeScene, 1);
if (isConditionTrue_0) {
isConditionTrue_0 = false;
{isConditionTrue_0 = runtimeScene.getOnceTriggers().triggerOnce(13453516);
}
}
}
if (isConditionTrue_0) {
{runtimeScene.getScene().getVariables().getFromIndex(4).setNumber(1 - runtimeScene.getScene().getVariables().getFromIndex(4).getAsNumber());
}

{ //Subevents
gdjs.GameCode.eventsList10(runtimeScene);} //End of subevents
}

}


};gdjs.GameCode.eventsList12 = function(runtimeScene) {

{


let isConditionTrue_0 = false;
isConditionTrue_0 = false;
{isConditionTrue_0 = (runtimeScene.getScene().getVariables().getFromIndex(0).getAsString() == "Menu");
}
if (isConditionTrue_0) {
{runtimeScene.getScene().getVariables().getFromIndex(0).setString("");
}
{gdjs.evtTools.runtimeScene.replaceScene(runtimeScene, "Menu", false);
}
}

}


{


let isConditionTrue_0 = false;
isConditionTrue_0 = false;
{isConditionTrue_0 = (runtimeScene.getScene().getVariables().getFromIndex(0).getAsString() == "Loading");
}
if (isConditionTrue_0) {
{runtimeScene.getScene().getVariables().getFromIndex(0).setString("");
}
{gdjs.evtTools.runtimeScene.replaceScene(runtimeScene, "Loading", false);
}
}

}


};gdjs.GameCode.eventsList13 = function(runtimeScene) {

{


let isConditionTrue_0 = false;
isConditionTrue_0 = false;
isConditionTrue_0 = gdjs.evtTools.runtimeScene.sceneJustBegins(runtimeScene);
if (isConditionTrue_0) {
{gdjs.evtTools.runtimeScene.resetTimer(runtimeScene, "tick");
}

{ //Subevents
gdjs.GameCode.eventsList0(runtimeScene);} //End of subevents
}

}


{


gdjs.GameCode.userFunc0xfe3f08(runtimeScene);

}


{


gdjs.GameCode.eventsList2(runtimeScene);
}


{


gdjs.GameCode.eventsList6(runtimeScene);
}


{


gdjs.GameCode.eventsList9(runtimeScene);
}


{


gdjs.GameCode.eventsList11(runtimeScene);
}


{


gdjs.GameCode.eventsList12(runtimeScene);
}


};

gdjs.GameCode.func = function(runtimeScene) {
runtimeScene.getOnceTriggers().startNewFrame();

gdjs.GameCode.GDOceanObjects1.length = 0;
gdjs.GameCode.GDOceanObjects2.length = 0;
gdjs.GameCode.GDOceanObjects3.length = 0;
gdjs.GameCode.GDMapRimObjects1.length = 0;
gdjs.GameCode.GDMapRimObjects2.length = 0;
gdjs.GameCode.GDMapRimObjects3.length = 0;
gdjs.GameCode.GDArcticIceObjects1.length = 0;
gdjs.GameCode.GDArcticIceObjects2.length = 0;
gdjs.GameCode.GDArcticIceObjects3.length = 0;
gdjs.GameCode.GDRegionObjects1.length = 0;
gdjs.GameCode.GDRegionObjects2.length = 0;
gdjs.GameCode.GDRegionObjects3.length = 0;
gdjs.GameCode.GDRegionLineObjects1.length = 0;
gdjs.GameCode.GDRegionLineObjects2.length = 0;
gdjs.GameCode.GDRegionLineObjects3.length = 0;
gdjs.GameCode.GDPlumeObjects1.length = 0;
gdjs.GameCode.GDPlumeObjects2.length = 0;
gdjs.GameCode.GDPlumeObjects3.length = 0;
gdjs.GameCode.GDBubbleObjects1.length = 0;
gdjs.GameCode.GDBubbleObjects2.length = 0;
gdjs.GameCode.GDBubbleObjects3.length = 0;
gdjs.GameCode.GDUIPainterObjects1.length = 0;
gdjs.GameCode.GDUIPainterObjects2.length = 0;
gdjs.GameCode.GDUIPainterObjects3.length = 0;
gdjs.GameCode.GDUITextObjects1.length = 0;
gdjs.GameCode.GDUITextObjects2.length = 0;
gdjs.GameCode.GDUITextObjects3.length = 0;
gdjs.GameCode.GDUIIconObjects1.length = 0;
gdjs.GameCode.GDUIIconObjects2.length = 0;
gdjs.GameCode.GDUIIconObjects3.length = 0;
gdjs.GameCode.GDTutImageObjects1.length = 0;
gdjs.GameCode.GDTutImageObjects2.length = 0;
gdjs.GameCode.GDTutImageObjects3.length = 0;
gdjs.GameCode.GDCodeInputObjects1.length = 0;
gdjs.GameCode.GDCodeInputObjects2.length = 0;
gdjs.GameCode.GDCodeInputObjects3.length = 0;
gdjs.GameCode.GDBackdropObjects1.length = 0;
gdjs.GameCode.GDBackdropObjects2.length = 0;
gdjs.GameCode.GDBackdropObjects3.length = 0;
gdjs.GameCode.GDPortraitObjects1.length = 0;
gdjs.GameCode.GDPortraitObjects2.length = 0;
gdjs.GameCode.GDPortraitObjects3.length = 0;
gdjs.GameCode.GDEndArtObjects1.length = 0;
gdjs.GameCode.GDEndArtObjects2.length = 0;
gdjs.GameCode.GDEndArtObjects3.length = 0;
gdjs.GameCode.GDLogoObjects1.length = 0;
gdjs.GameCode.GDLogoObjects2.length = 0;
gdjs.GameCode.GDLogoObjects3.length = 0;

gdjs.GameCode.eventsList13(runtimeScene);
gdjs.GameCode.GDOceanObjects1.length = 0;
gdjs.GameCode.GDOceanObjects2.length = 0;
gdjs.GameCode.GDOceanObjects3.length = 0;
gdjs.GameCode.GDMapRimObjects1.length = 0;
gdjs.GameCode.GDMapRimObjects2.length = 0;
gdjs.GameCode.GDMapRimObjects3.length = 0;
gdjs.GameCode.GDArcticIceObjects1.length = 0;
gdjs.GameCode.GDArcticIceObjects2.length = 0;
gdjs.GameCode.GDArcticIceObjects3.length = 0;
gdjs.GameCode.GDRegionObjects1.length = 0;
gdjs.GameCode.GDRegionObjects2.length = 0;
gdjs.GameCode.GDRegionObjects3.length = 0;
gdjs.GameCode.GDRegionLineObjects1.length = 0;
gdjs.GameCode.GDRegionLineObjects2.length = 0;
gdjs.GameCode.GDRegionLineObjects3.length = 0;
gdjs.GameCode.GDPlumeObjects1.length = 0;
gdjs.GameCode.GDPlumeObjects2.length = 0;
gdjs.GameCode.GDPlumeObjects3.length = 0;
gdjs.GameCode.GDBubbleObjects1.length = 0;
gdjs.GameCode.GDBubbleObjects2.length = 0;
gdjs.GameCode.GDBubbleObjects3.length = 0;
gdjs.GameCode.GDUIPainterObjects1.length = 0;
gdjs.GameCode.GDUIPainterObjects2.length = 0;
gdjs.GameCode.GDUIPainterObjects3.length = 0;
gdjs.GameCode.GDUITextObjects1.length = 0;
gdjs.GameCode.GDUITextObjects2.length = 0;
gdjs.GameCode.GDUITextObjects3.length = 0;
gdjs.GameCode.GDUIIconObjects1.length = 0;
gdjs.GameCode.GDUIIconObjects2.length = 0;
gdjs.GameCode.GDUIIconObjects3.length = 0;
gdjs.GameCode.GDTutImageObjects1.length = 0;
gdjs.GameCode.GDTutImageObjects2.length = 0;
gdjs.GameCode.GDTutImageObjects3.length = 0;
gdjs.GameCode.GDCodeInputObjects1.length = 0;
gdjs.GameCode.GDCodeInputObjects2.length = 0;
gdjs.GameCode.GDCodeInputObjects3.length = 0;
gdjs.GameCode.GDBackdropObjects1.length = 0;
gdjs.GameCode.GDBackdropObjects2.length = 0;
gdjs.GameCode.GDBackdropObjects3.length = 0;
gdjs.GameCode.GDPortraitObjects1.length = 0;
gdjs.GameCode.GDPortraitObjects2.length = 0;
gdjs.GameCode.GDPortraitObjects3.length = 0;
gdjs.GameCode.GDEndArtObjects1.length = 0;
gdjs.GameCode.GDEndArtObjects2.length = 0;
gdjs.GameCode.GDEndArtObjects3.length = 0;
gdjs.GameCode.GDLogoObjects1.length = 0;
gdjs.GameCode.GDLogoObjects2.length = 0;
gdjs.GameCode.GDLogoObjects3.length = 0;


return;

}

gdjs['GameCode'] = gdjs.GameCode;
