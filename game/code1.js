gdjs.MenuCode = {};
gdjs.MenuCode.localVariables = [];
gdjs.MenuCode.idToCallbackMap = new Map();
gdjs.MenuCode.forEachIndex2 = 0;

gdjs.MenuCode.forEachObjects2 = [];

gdjs.MenuCode.forEachTemporary2 = null;

gdjs.MenuCode.forEachTotalCount2 = 0;

gdjs.MenuCode.GDOceanObjects1= [];
gdjs.MenuCode.GDOceanObjects2= [];
gdjs.MenuCode.GDOceanObjects3= [];
gdjs.MenuCode.GDMapRimObjects1= [];
gdjs.MenuCode.GDMapRimObjects2= [];
gdjs.MenuCode.GDMapRimObjects3= [];
gdjs.MenuCode.GDArcticIceObjects1= [];
gdjs.MenuCode.GDArcticIceObjects2= [];
gdjs.MenuCode.GDArcticIceObjects3= [];
gdjs.MenuCode.GDRegionObjects1= [];
gdjs.MenuCode.GDRegionObjects2= [];
gdjs.MenuCode.GDRegionObjects3= [];
gdjs.MenuCode.GDRegionLineObjects1= [];
gdjs.MenuCode.GDRegionLineObjects2= [];
gdjs.MenuCode.GDRegionLineObjects3= [];
gdjs.MenuCode.GDPlumeObjects1= [];
gdjs.MenuCode.GDPlumeObjects2= [];
gdjs.MenuCode.GDPlumeObjects3= [];
gdjs.MenuCode.GDBubbleObjects1= [];
gdjs.MenuCode.GDBubbleObjects2= [];
gdjs.MenuCode.GDBubbleObjects3= [];
gdjs.MenuCode.GDMenuShadeObjects1= [];
gdjs.MenuCode.GDMenuShadeObjects2= [];
gdjs.MenuCode.GDMenuShadeObjects3= [];
gdjs.MenuCode.GDUIPainterObjects1= [];
gdjs.MenuCode.GDUIPainterObjects2= [];
gdjs.MenuCode.GDUIPainterObjects3= [];
gdjs.MenuCode.GDUITextObjects1= [];
gdjs.MenuCode.GDUITextObjects2= [];
gdjs.MenuCode.GDUITextObjects3= [];
gdjs.MenuCode.GDUIIconObjects1= [];
gdjs.MenuCode.GDUIIconObjects2= [];
gdjs.MenuCode.GDUIIconObjects3= [];
gdjs.MenuCode.GDTutImageObjects1= [];
gdjs.MenuCode.GDTutImageObjects2= [];
gdjs.MenuCode.GDTutImageObjects3= [];
gdjs.MenuCode.GDCodeInputObjects1= [];
gdjs.MenuCode.GDCodeInputObjects2= [];
gdjs.MenuCode.GDCodeInputObjects3= [];
gdjs.MenuCode.GDBackdropObjects1= [];
gdjs.MenuCode.GDBackdropObjects2= [];
gdjs.MenuCode.GDBackdropObjects3= [];
gdjs.MenuCode.GDPortraitObjects1= [];
gdjs.MenuCode.GDPortraitObjects2= [];
gdjs.MenuCode.GDPortraitObjects3= [];
gdjs.MenuCode.GDEndArtObjects1= [];
gdjs.MenuCode.GDEndArtObjects2= [];
gdjs.MenuCode.GDEndArtObjects3= [];
gdjs.MenuCode.GDLogoObjects1= [];
gdjs.MenuCode.GDLogoObjects2= [];
gdjs.MenuCode.GDLogoObjects3= [];


gdjs.MenuCode.userFunc0xcc61b0 = function GDJSInlineCode(runtimeScene) {
"use strict";
if (!window.P2050 || !window.P2050.ready) { runtimeScene.getVariables().get("GoTo").setString("Loading"); return; }
window.P2050.Screens.setup(runtimeScene, "menu");
};
gdjs.MenuCode.eventsList0 = function(runtimeScene) {

{


gdjs.MenuCode.userFunc0xcc61b0(runtimeScene);

}


};gdjs.MenuCode.userFunc0xfe37b8 = function GDJSInlineCode(runtimeScene) {
"use strict";
const P = window.P2050; if (!P || !P.ready) return;
P.Screens.frame(runtimeScene);
};
gdjs.MenuCode.userFunc0xfdc6a8 = function GDJSInlineCode(runtimeScene) {
"use strict";
const P = window.P2050; if (!P || !P.ready) return;
runtimeScene.getVariables().get("UIConsumed").setNumber(P.Screens.release(runtimeScene));
};
gdjs.MenuCode.eventsList1 = function(runtimeScene) {

{


gdjs.MenuCode.userFunc0xfdc6a8(runtimeScene);

}


};gdjs.MenuCode.eventsList2 = function(runtimeScene) {

{


let isConditionTrue_0 = false;
isConditionTrue_0 = false;
isConditionTrue_0 = gdjs.evtTools.input.isMouseButtonReleased(runtimeScene, "Left");
if (isConditionTrue_0) {

{ //Subevents
gdjs.MenuCode.eventsList1(runtimeScene);} //End of subevents
}

}


};gdjs.MenuCode.eventsList3 = function(runtimeScene) {

};gdjs.MenuCode.eventsList4 = function(runtimeScene) {

{

gdjs.copyArray(runtimeScene.getObjects("Plume"), gdjs.MenuCode.GDPlumeObjects1);

for (gdjs.MenuCode.forEachIndex2 = 0;gdjs.MenuCode.forEachIndex2 < gdjs.MenuCode.GDPlumeObjects1.length;++gdjs.MenuCode.forEachIndex2) {
gdjs.MenuCode.GDPlumeObjects2.length = 0;


gdjs.MenuCode.forEachTemporary2 = gdjs.MenuCode.GDPlumeObjects1[gdjs.MenuCode.forEachIndex2];
gdjs.MenuCode.GDPlumeObjects2.push(gdjs.MenuCode.forEachTemporary2);
let isConditionTrue_0 = false;
if (true) {
{for(var i = 0, len = gdjs.MenuCode.GDPlumeObjects2.length ;i < len;++i) {
    gdjs.MenuCode.GDPlumeObjects2[i].setScale((gdjs.RuntimeObject.getVariableNumber(gdjs.MenuCode.GDPlumeObjects2[i].getVariables().getFromIndex(3))) * (1 + 0.18 * Math.sin(gdjs.evtTools.runtimeScene.getTimeFromStartInSeconds(runtimeScene) * 2.4 + (gdjs.RuntimeObject.getVariableNumber(gdjs.MenuCode.GDPlumeObjects2[i].getVariables().getFromIndex(2))))));
}
}
}
}

}


};gdjs.MenuCode.eventsList5 = function(runtimeScene) {

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
{isConditionTrue_0 = runtimeScene.getOnceTriggers().triggerOnce(16944852);
}
}
}
if (isConditionTrue_0) {
{gdjs.evtTools.sound.playMusicOnChannel(runtimeScene, "music-menu.mp3", 1, true, runtimeScene.getGame().getVariables().getFromIndex(1).getAsNumber(), 1);
}
}

}


};gdjs.MenuCode.eventsList6 = function(runtimeScene) {

{


let isConditionTrue_0 = false;
isConditionTrue_0 = false;
{isConditionTrue_0 = (runtimeScene.getScene().getVariables().getFromIndex(0).getAsString() == "Game");
}
if (isConditionTrue_0) {
{runtimeScene.getScene().getVariables().getFromIndex(0).setString("");
}
{gdjs.evtTools.runtimeScene.replaceScene(runtimeScene, "Game", false);
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


};gdjs.MenuCode.eventsList7 = function(runtimeScene) {

{


let isConditionTrue_0 = false;
isConditionTrue_0 = false;
isConditionTrue_0 = gdjs.evtTools.runtimeScene.sceneJustBegins(runtimeScene);
if (isConditionTrue_0) {

{ //Subevents
gdjs.MenuCode.eventsList0(runtimeScene);} //End of subevents
}

}


{


gdjs.MenuCode.userFunc0xfe37b8(runtimeScene);

}


{


gdjs.MenuCode.eventsList2(runtimeScene);
}


{


gdjs.MenuCode.eventsList4(runtimeScene);
}


{


gdjs.MenuCode.eventsList5(runtimeScene);
}


{


gdjs.MenuCode.eventsList6(runtimeScene);
}


};

gdjs.MenuCode.func = function(runtimeScene) {
runtimeScene.getOnceTriggers().startNewFrame();

gdjs.MenuCode.GDOceanObjects1.length = 0;
gdjs.MenuCode.GDOceanObjects2.length = 0;
gdjs.MenuCode.GDOceanObjects3.length = 0;
gdjs.MenuCode.GDMapRimObjects1.length = 0;
gdjs.MenuCode.GDMapRimObjects2.length = 0;
gdjs.MenuCode.GDMapRimObjects3.length = 0;
gdjs.MenuCode.GDArcticIceObjects1.length = 0;
gdjs.MenuCode.GDArcticIceObjects2.length = 0;
gdjs.MenuCode.GDArcticIceObjects3.length = 0;
gdjs.MenuCode.GDRegionObjects1.length = 0;
gdjs.MenuCode.GDRegionObjects2.length = 0;
gdjs.MenuCode.GDRegionObjects3.length = 0;
gdjs.MenuCode.GDRegionLineObjects1.length = 0;
gdjs.MenuCode.GDRegionLineObjects2.length = 0;
gdjs.MenuCode.GDRegionLineObjects3.length = 0;
gdjs.MenuCode.GDPlumeObjects1.length = 0;
gdjs.MenuCode.GDPlumeObjects2.length = 0;
gdjs.MenuCode.GDPlumeObjects3.length = 0;
gdjs.MenuCode.GDBubbleObjects1.length = 0;
gdjs.MenuCode.GDBubbleObjects2.length = 0;
gdjs.MenuCode.GDBubbleObjects3.length = 0;
gdjs.MenuCode.GDMenuShadeObjects1.length = 0;
gdjs.MenuCode.GDMenuShadeObjects2.length = 0;
gdjs.MenuCode.GDMenuShadeObjects3.length = 0;
gdjs.MenuCode.GDUIPainterObjects1.length = 0;
gdjs.MenuCode.GDUIPainterObjects2.length = 0;
gdjs.MenuCode.GDUIPainterObjects3.length = 0;
gdjs.MenuCode.GDUITextObjects1.length = 0;
gdjs.MenuCode.GDUITextObjects2.length = 0;
gdjs.MenuCode.GDUITextObjects3.length = 0;
gdjs.MenuCode.GDUIIconObjects1.length = 0;
gdjs.MenuCode.GDUIIconObjects2.length = 0;
gdjs.MenuCode.GDUIIconObjects3.length = 0;
gdjs.MenuCode.GDTutImageObjects1.length = 0;
gdjs.MenuCode.GDTutImageObjects2.length = 0;
gdjs.MenuCode.GDTutImageObjects3.length = 0;
gdjs.MenuCode.GDCodeInputObjects1.length = 0;
gdjs.MenuCode.GDCodeInputObjects2.length = 0;
gdjs.MenuCode.GDCodeInputObjects3.length = 0;
gdjs.MenuCode.GDBackdropObjects1.length = 0;
gdjs.MenuCode.GDBackdropObjects2.length = 0;
gdjs.MenuCode.GDBackdropObjects3.length = 0;
gdjs.MenuCode.GDPortraitObjects1.length = 0;
gdjs.MenuCode.GDPortraitObjects2.length = 0;
gdjs.MenuCode.GDPortraitObjects3.length = 0;
gdjs.MenuCode.GDEndArtObjects1.length = 0;
gdjs.MenuCode.GDEndArtObjects2.length = 0;
gdjs.MenuCode.GDEndArtObjects3.length = 0;
gdjs.MenuCode.GDLogoObjects1.length = 0;
gdjs.MenuCode.GDLogoObjects2.length = 0;
gdjs.MenuCode.GDLogoObjects3.length = 0;

gdjs.MenuCode.eventsList7(runtimeScene);
gdjs.MenuCode.GDOceanObjects1.length = 0;
gdjs.MenuCode.GDOceanObjects2.length = 0;
gdjs.MenuCode.GDOceanObjects3.length = 0;
gdjs.MenuCode.GDMapRimObjects1.length = 0;
gdjs.MenuCode.GDMapRimObjects2.length = 0;
gdjs.MenuCode.GDMapRimObjects3.length = 0;
gdjs.MenuCode.GDArcticIceObjects1.length = 0;
gdjs.MenuCode.GDArcticIceObjects2.length = 0;
gdjs.MenuCode.GDArcticIceObjects3.length = 0;
gdjs.MenuCode.GDRegionObjects1.length = 0;
gdjs.MenuCode.GDRegionObjects2.length = 0;
gdjs.MenuCode.GDRegionObjects3.length = 0;
gdjs.MenuCode.GDRegionLineObjects1.length = 0;
gdjs.MenuCode.GDRegionLineObjects2.length = 0;
gdjs.MenuCode.GDRegionLineObjects3.length = 0;
gdjs.MenuCode.GDPlumeObjects1.length = 0;
gdjs.MenuCode.GDPlumeObjects2.length = 0;
gdjs.MenuCode.GDPlumeObjects3.length = 0;
gdjs.MenuCode.GDBubbleObjects1.length = 0;
gdjs.MenuCode.GDBubbleObjects2.length = 0;
gdjs.MenuCode.GDBubbleObjects3.length = 0;
gdjs.MenuCode.GDMenuShadeObjects1.length = 0;
gdjs.MenuCode.GDMenuShadeObjects2.length = 0;
gdjs.MenuCode.GDMenuShadeObjects3.length = 0;
gdjs.MenuCode.GDUIPainterObjects1.length = 0;
gdjs.MenuCode.GDUIPainterObjects2.length = 0;
gdjs.MenuCode.GDUIPainterObjects3.length = 0;
gdjs.MenuCode.GDUITextObjects1.length = 0;
gdjs.MenuCode.GDUITextObjects2.length = 0;
gdjs.MenuCode.GDUITextObjects3.length = 0;
gdjs.MenuCode.GDUIIconObjects1.length = 0;
gdjs.MenuCode.GDUIIconObjects2.length = 0;
gdjs.MenuCode.GDUIIconObjects3.length = 0;
gdjs.MenuCode.GDTutImageObjects1.length = 0;
gdjs.MenuCode.GDTutImageObjects2.length = 0;
gdjs.MenuCode.GDTutImageObjects3.length = 0;
gdjs.MenuCode.GDCodeInputObjects1.length = 0;
gdjs.MenuCode.GDCodeInputObjects2.length = 0;
gdjs.MenuCode.GDCodeInputObjects3.length = 0;
gdjs.MenuCode.GDBackdropObjects1.length = 0;
gdjs.MenuCode.GDBackdropObjects2.length = 0;
gdjs.MenuCode.GDBackdropObjects3.length = 0;
gdjs.MenuCode.GDPortraitObjects1.length = 0;
gdjs.MenuCode.GDPortraitObjects2.length = 0;
gdjs.MenuCode.GDPortraitObjects3.length = 0;
gdjs.MenuCode.GDEndArtObjects1.length = 0;
gdjs.MenuCode.GDEndArtObjects2.length = 0;
gdjs.MenuCode.GDEndArtObjects3.length = 0;
gdjs.MenuCode.GDLogoObjects1.length = 0;
gdjs.MenuCode.GDLogoObjects2.length = 0;
gdjs.MenuCode.GDLogoObjects3.length = 0;


return;

}

gdjs['MenuCode'] = gdjs.MenuCode;
