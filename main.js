import './style.css'
import { log } from './extra.js'
import { DirectionalLight, Engine, FreeCamera, HemisphericLight, MeshBuilder,
  PointerEventTypes, Ray, Scene, SceneLoader, Vector3, WebXRState } from '@babylonjs/core';
import "@babylonjs/loaders/glTF";

// SCENE CREATION AND INITIAL PROJECT SETUP
var canvas = document.getElementById("canvas");
var engine = new Engine(canvas,true);
var scene = new Scene(engine);
scene.useRightHandedSystem = true;
var ground = MeshBuilder.CreateGround("ground",{width:100, height:100},scene);
var sun = new DirectionalLight("sunSky",new Vector3(-1,-1,-1),scene);
var hemisphericLight = new HemisphericLight("hemiLight",new Vector3(0,1,0),scene);

var playerStart = {
  pos:new Vector3(0,.75,0),
  rot:new Vector3(0,0,0)
}

var modelRepoPos = new Vector3(0,-1,0);

var vrControllerInfo = {
  ray:Ray.Zero(),
  dist:0.0,
  collisionInfo: {
    colliding:false,
    normal:Vector3.Zero()
  }
}

var state = "holdingMFD"; // possibleValues: holdingMFD, placingMFD

//var dash_car = spawn_gltf("scenes/models/glb/","carDash.glb",scene,{pos:new Vector3(1.25,.5,1.25)});
var dash_60W = spawn_gltf("scenes/models/glb/","Dashboard.glb",scene,{pos:new Vector3(0,.5,1.25)});
var dash_bridge = spawn_gltf("scenes/models/glb/","bridge.glb",scene,{pos:new Vector3(0,0,8)});

var mfds = {
  list:[],
  active:0
};

mfds.list.push({path:"scenes/models/glb/displays/", fileName:"RDU-3068.glb", meshes:[]});
mfds.list.push({path:"scenes/models/glb/displays/", fileName:"RDU-3138.glb", meshes:[]});
mfds.list.push({path:"scenes/models/glb/displays/", fileName:"RDU-4047.glb", meshes:[]});
for(var i = 0; i < mfds.list.length; i++) {
  var newMFD = await spawn_gltf(mfds.list[i].path,mfds.list[i].fileName,scene,{pos:new Vector3(0,-1,0)});
  mfds.list[i].meshes = newMFD.meshes;
}

console.log(mfds);

var cam_monitor = spawn_cam("cam_main",playerStart.pos,scene,canvas, {
  speed:.25
});
//

// Initiating XR
const xr = await scene.createDefaultXRExperienceAsync({
  floorMeshes:[ground],
  disableTeleportation:false
});
//

if (!xr.baseExperience) { // XR is not supported
  console.log("XR is not supported");
} else { // XR is supported
  console.log("XR is supported", xr);

  xr.baseExperience.onStateChangedObservable.add((state) => {
    switch(state) {
      case WebXRState.ENTERING_XR:
        console.log("Entering XR");
        xr.baseExperience.camera.position = new Vector3(0,0,0);
        xr.baseExperience.camera.rotation = playerStart.rot;
      case WebXRState.IN_XR:
        console.log("In XR");
      case WebXRState.EXITING_XR:
        console.log("Exiting XR");
    }
  })

  ///// Pointer Observables
  var g_activeMFDS = [];
  scene.onPointerObservable.add((pointerInfo) => {
    switch (pointerInfo.type) {
      case PointerEventTypes.POINTERDOWN:
        // console.log("POINTER DOWN");

        break;
      case PointerEventTypes.POINTERUP:
        //console.log("POINTER UP");
  
        break;
      case PointerEventTypes.POINTERMOVE:
        //console.log("POINTER MOVE");
        //////////////////////////////BOOKMARK
        vrControllerInfo.ray = pointerInfo.pickInfo.ray;
        vrControllerInfo.dist = pointerInfo.pickInfo.distance;
        if(pointerInfo.pickInfo.pickedMesh != null && pointerInfo.pickInfo.pickedMesh.name.substring(0,9) == "collider_") {
          vrControllerInfo.collisionInfo.colliding = true;
          vrControllerInfo.collisionInfo.normal = pointerInfo.pickInfo.getNormal(true,true);
        } else {
          vrControllerInfo.collisionInfo.colliding = false;
        }

        break;
      case PointerEventTypes.POINTERPICK:
        if(vrControllerInfo.collisionInfo.colliding == true) {
          var newMFD = {obj:mfds.list[mfds.active].meshes[0].clone()};
          newMFD.obj.position = vrControllerInfo.ray.direction.scale(vrControllerInfo.dist).add(vrControllerInfo.ray.origin);
          newMFD.obj.parent = null;
          newMFD.obj.setDirection(vrControllerInfo.collisionInfo.normal);
          newMFD.obj.rotate(new Vector3(1,0,0),Math.PI / 2);

          g_activeMFDS.push(newMFD);

          console.log(g_activeMFDS);
        }

        break;
    }
  });

  ///// Input Source Observables

  // global landmark variables
  var g_rightThumbStickInDeadZone = true;
  xr.input.onControllerAddedObservable.add((inputSource) => {
    inputSource.onMotionControllerInitObservable.add((motionController) => {
      //console.log(motionController.getComponentIds());
      if (motionController.handedness === 'left') {
        inputSource.getWorldPointerRayToRef(vrControllerInfo.ray);

        const squeezeComponent = motionController.getComponentOfType("squeeze");
        squeezeComponent.onButtonStateChangedObservable.add((component) => {
          if(squeezeComponent.pressed) {
            //console.log("Left squeezeComponent is pressed");
          } else {
            //console.log("Left squeezeComponent is released");
          }
        })
  
        const xButtonComponent = motionController.getComponent("x-button");
        xButtonComponent.onButtonStateChangedObservable.add((component) => {
          if(xButtonComponent.pressed) {
            //console.log("x-button is pressed");
          } else {
            //console.log("x-button is released");
          }
        })

        const yButtonComponent = motionController.getComponent("y-button");
        yButtonComponent.onButtonStateChangedObservable.add((component) => {
          if(yButtonComponent.pressed) {
            //console.log("y-button is pressed");
          } else {
            //console.log("y-button is released");
          }
        })
  
        const thumbStickComponent = motionController.getComponentOfType("thumbstick");
        thumbStickComponent.onAxisValueChangedObservable.add((component) => {
          //console.log("Left Thumb x:",component.x);
          //console.log("Left Thumb y:",component.y);
        })
  
        const triggerComponent = motionController.getMainComponent();
        triggerComponent.onButtonStateChangedObservable.add((component) => {
          if(triggerComponent.pressed) {
            //console.log("Left triggerComponent is pressed");
          } else {
            //console.log("Left triggerComponent is released");
          }
        })
      }
      if (motionController.handedness == 'right') {
        inputSource.getWorldPointerRayToRef(vrControllerInfo.ray);

        const squeezeComponent = motionController.getComponentOfType("squeeze");
        squeezeComponent.onButtonStateChangedObservable.add((component) => {
          if(squeezeComponent.pressed) {
            //console.log("Right squeezeComponent is pressed");
          } else {
            //console.log("Right squeezeComponent is released");
          }
        })
  
        const aButtonComponent = motionController.getComponent("a-button");
        aButtonComponent.onButtonStateChangedObservable.add((component) => {
          if(aButtonComponent.pressed) {
            for(var i = 0; i < g_activeMFDS.length; i++) {
              console.log(g_activeMFDS[i]);
              g_activeMFDS[i].obj.dispose();
            }

            g_activeMFDS = [];
          } else {
            //console.log("a-button is released");
          }
        })

        const bButtonComponent = motionController.getComponent("b-button");
        bButtonComponent.onButtonStateChangedObservable.add((component) => {
          if(bButtonComponent.pressed) {
            //console.log("b-button is pressed");
          } else {
            //console.log("b-button is released");
          }
        })
  
        const thumbStickComponent = motionController.getComponentOfType("thumbstick");
        thumbStickComponent.onAxisValueChangedObservable.add((component) => {
          //console.log("Right Thumb x:",component.x);
          //console.log("Right Thumb y:",component.y);
          if(component.x > .75) {
            if(g_rightThumbStickInDeadZone == true) {
              g_rightThumbStickInDeadZone = false;

              cycleMFDs(mfds,1);
              equipMFD(mfds,inputSource.grip);
            }
          }
          else if(component.x < -.75) {
            if(g_rightThumbStickInDeadZone == true) {
              g_rightThumbStickInDeadZone = false;

              cycleMFDs(mfds,-1);
              equipMFD(mfds,inputSource.grip);
            }
          }
          else {
            g_rightThumbStickInDeadZone = true;
          }
        })
  
        const triggerComponent = motionController.getMainComponent();
        triggerComponent.onButtonStateChangedObservable.add((component) => {
          if(triggerComponent.pressed) {
            // console.log("Right triggerComponent is pressed");

            
          } else {
            // console.log("Right triggerComponent is released");
          }
        })
      }
    });
  });
}

engine.runRenderLoop(() => {
  scene.render();
});
window.addEventListener("resize", function () {
  engine.resize();
});
function spawn_cam(name,vector,scene,canvas,arg) {
  var camera = new FreeCamera(name, vector, scene);
  camera.attachControl(canvas,true);
  // camera.keysUp.push(87);
  // camera.keysDown.push(83);
  // camera.keysLeft.push(65);
  // camera.keysRight.push(68);
  // camera.keysUpward.push(69);
  // camera.keysDownward.push(81);

  if(arg.speed != null) {
    camera.speed = arg.speed;
  }

  return camera;
}
async function spawn_gltf(path = "",fileName = "",scene,transform = 
{
  pos:new Vector3(0,0,0)
}) {

  var obj = await SceneLoader.ImportMeshAsync("",path,fileName,scene);

  for(var m = 0; m < obj.meshes.length; m++) {
    if(obj.meshes[m].name.substring(0,9) == "collider_") {
      console.log(obj.meshes[m]);
      obj.meshes[m].isPickable = true;
    } else {
      obj.meshes[m].isPickable = false;
    }

    if(obj.meshes[m].material != null) {
      console.log("Material: ", obj.meshes[m].material);

      if(obj.meshes[m].material.name.substring(0,4) == "dec_") {
        obj.meshes[m].material.transparencyMode = 3;
      }
      else if(obj.meshes[m].material.name.substring(0,4) == "win_") {
        obj.meshes[m].material.alpha = .1;
      }
      else {
        var textures = obj.meshes[m].material.getActiveTextures();
        //console.log("Textures:", textures, "\n");
      }
    }
  }

  obj.meshes[0].position = transform.pos;

  return obj
}
function cloneModelWithChildren(complexModel) {
  var root;
  var children;
  for(var i = 0; i < complexModel.meshes.length; i++) {
    if(i = 0) {
      root = complexModel.meshes[i];
    } else {
      children.push(complexModel.meshes[i]);
    }
  }

  var newRoot = root.clone()
  newRoot.name = root.name + "_clone";
  newRoot.id = root.id + "_clone";

  var newChildren = [];
  for(var i = 0; i < children.length; i++)  {
    var newChild = (children[i].clone());
    newChild.name = children[i].name + "_clone";
    newChild.id = children[i].id + "_clone";
    newChild.parent = newRoot;

    newChildren.push(newChild);
  }

  var result = [];
  result.push(newRoot);
  for(var i = 0; i < newChildren.length; i++) {
    result.push(newChildren);
  }

  return result;
}
function cycleMFDs(mfdsJSON = {list:[],active:0},cycleAmount = 0) {
  if(cycleAmount > 0) {
    for(var i = 0; i < cycleAmount; i++) {
      mfdsJSON.active++;
      if(mfdsJSON.active >= mfdsJSON.list.length) {
        mfdsJSON.active = 0;
      }
    }
  }
  else if(cycleAmount < 0) {
    for(var i = 0; i < Math.abs(cycleAmount); i++) {
      mfdsJSON.active--;
      if(mfdsJSON.active < 0) {
        mfdsJSON.active = mfdsJSON.list.length - 1;
      }
    }
  }
}
function equipMFD(mfdsJSON = mfds,parent) {
  console.log(mfdsJSON);
  for(var i = 0; i < mfdsJSON.list.length; i++) {
    if(i == mfdsJSON.active) {
      mfdsJSON.list[i].meshes[0].parent = parent;
      mfdsJSON.list[i].meshes[0].position = new Vector3(0,0,-.25);
    } else {
      mfdsJSON.list[i].meshes[0].parent = null;
      mfdsJSON.list[i].meshes[0].position = new Vector3(0,-1,0);
    }
  }
}