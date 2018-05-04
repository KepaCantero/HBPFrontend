(function() {
  'use strict';

  var phoenixRosDict = {};

  ROSLIB.PhoenixRos = function(rosOptions) {
    var url = rosOptions.url;

    var phoenixRos = phoenixRosDict[url];
    if (phoenixRos) {
      console.debug('Reusing already established connection to ' + url);
    } else {
      phoenixRos = createRosConnection(rosOptions);
    }
    _.assign(this, phoenixRos);
  };

  var RECONNECT_INTERVAL = 1000; //ms
  var connections = {};

  function createRosConnection(rosOptions) {
    var reconnectOnClose = true,
      url = rosOptions.url,
      events = {},
      subscriptions = {},
      reconnectTimeout;

    connect();

    return (phoenixRosDict[url] = {
      close: closeRos,
      on: on,
      off: off,
      once: once,
      roscmd: roscmd,
      setRoscmdListener: setRoscmdListener,
      removeRoscmdListener: removeRoscmdListener,
      disableRebirth: disableRebirth,
      callOnConnection: callOnConnection
    });

    function onmessage(ros) {
      let onmessage = ros.socket.onmessage;

      return (...args) => {
        if (args.length) {
          try {
            let msgdata = JSON.parse(args[0].data);
            if (msgdata.op === 'ros_response') {
              ros.roscmdListener &&
                ros.roscmdListener(msgdata.msg, msgdata.running);
            }
          } catch (e) {}
        }
        onmessage(...args);
      };
    }

    function connect() {
      console.debug('Establishing websocket to: ' + url);
      var ros = new ROSLIB.Ros(rosOptions);
      ros.socket.onmessage = onmessage(ros);

      connections[url] = ros;

      //re-register events
      _.forOwn(events, function(subscribers, topic) {
        subscribers.forEach(function(fn) {
          ros.on(topic, fn);
        });
      });

      //re-register subsbcriptions
      _.forOwn(subscriptions, function(operation) {
        ros.callOnConnection(operation);
      });

      ros.on('connection', function() {
        console.debug('Connected to websocket server: ' + url);
        triggerReconnectingEvent(false);
      });

      ros.on('error', function(error) {
        console.error(
          'Error connecting to websocket server (' + url + '):',
          error
        );
      });

      ros.on('close', function() {
        clearTimeout(reconnectTimeout);
        console.debug('Connection closed to websocket server: ' + url);
        if (!reconnectOnClose) {
          delete connections[url];
          delete phoenixRosDict[url];
          triggerReconnectingEvent(false);
        } else {
          console.debug('Retrying connection to: ' + url);
          triggerReconnectingEvent(true);
          reconnectTimeout = setTimeout(connect, RECONNECT_INTERVAL);
        }
      });
    }

    function on(topic, fn) {
      if (topic !== 'connection') {
        //we don't want to notify internal reconnections
        if (!events[topic]) {
          events[topic] = [];
        }
        events[topic].push(fn);
      }
      connections[url].on(topic, fn);
    }

    function off(topic, fn) {
      events[topic].splice(events[topic].indexOf(fn));
      if (connections[url]) {
        connections[url].off(topic, fn);
      }
    }

    function once(topic, fn) {
      connections[url].once(topic, fn);
    }

    function roscmd(msg) {
      connections[url].socket.send(JSON.stringify({ op: 'roscmd', msg: msg }));
    }

    function callOnConnection(options) {
      if (options.op === 'subscribe') {
        subscriptions[options.id] = options;
      } else if (options.op === 'unsubscribe') {
        delete subscriptions[options.id];
      }
      if (connections[url]) {
        connections[url].callOnConnection(options);
      }
    }

    function disableRebirth() {
      reconnectOnClose = false;
    }

    function closeRos() {
      disableRebirth();
      if (connections[url]) {
        connections[url].close();
      }
    }

    function setRoscmdListener(fn){
      connections[url].roscmdListener = fn;
    }

    function removeRoscmdListener(){
      delete connections[url].roscmdListener;
    }
  }

  var reconnectingCallbacks = [];
  //global PhoenixRos reconnecting event
  //called with 'true' when reconnecting
  //called with 'false' when end reconnecting
  window.ROSLIB.PhoenixRos.onReconnecting = function(callback) {
    reconnectingCallbacks.push(callback);
    return function() {
      reconnectingCallbacks.splice(reconnectingCallbacks.indexOf(callback));
    };
  };

  var lastNotifiedState = false;
  function triggerReconnectingEvent(state) {
    if (lastNotifiedState === state) {
      //we already notified the current state
      return;
    }
    var someDisconnected = _.some(connections, function(con) {
      return !con.isConnected;
    });

    if (someDisconnected !== state) {
      //only notify 'reconnection' when all are reconnected
      return;
    }
    lastNotifiedState = state;
    reconnectingCallbacks.forEach(function(fn) {
      fn(state);
    }); //notify reconnecting event
  }
})();

var GZ3D = GZ3D || {
  REVISION : '1',
  assetsPath: 'http://localhost:8080/assets',
  webSocketUrl: 'ws://localhost:7681',
  webSocketToken: undefined
};

GZ3D.AnimatedModel = function(scene) {
  this.scene = scene;
  this.loader = null;
};

GZ3D.AnimatedModel.prototype.loadAnimatedModel = function(modelName) {
  this.loader = new THREE.ColladaLoader();
  this.loader.textureLoadedCallback = ()=>{this.scene.refresh3DViews();};

  // Helper function to enable 'skinning' property so three.js treats meshes as deformable

  var enableSkinning = function (skinnedMesh) {
    var materials = skinnedMesh.material.materials;
    if (materials !== null && materials !== undefined) {
      for (var i = 0, length = materials.length; i < length; i++) {
        var mat = materials[i];
        mat.skinning = true;
      }
    }

    if (skinnedMesh.material !== undefined && skinnedMesh.material !== null) {
      skinnedMesh.material.skinning = true;
    }
  };

  // Load animated model with separate COLLADA loader instance
  var that = this;
  // Progress update: Add this asset to the assetProgressArray
  var element = {};
  element.id = modelName;
  element.url = GZ3D.animatedModel.assetsPath;
  element.progress = 0;
  element.totalSize = 0;
  element.done = false;
  GZ3D.assetProgressData.assets.push(element);
  var scene = this.scene;
  this.loader.load(element.url, function (collada) {
    var modelParent = new THREE.Object3D();
    modelParent.name = modelName + '_animated';
    var linkParent = new THREE.Object3D();

    // Set gray, phong-shaded material for loaded model
    collada.scene.traverse(function (child)
    {
      if (child instanceof THREE.Mesh)
      {
        var applyDefaultMaterial = true;

        if (child.material instanceof THREE.MultiMaterial)
        {
          if (child.material.materials[0].pbrMaterialDescription !== undefined)
          {
            child.material = child.material.materials[0];
            applyDefaultMaterial = false;
          }
        }
        else if (child.material instanceof THREE.MeshPhongMaterial)
        {
            applyDefaultMaterial = false;
        }

        if (applyDefaultMaterial)
        {
          var transparentMaterial = new THREE.MeshPhongMaterial({ color: 0x707070 });
          transparentMaterial.wireframe = false;
          child.material = transparentMaterial;
        }
      }
    });

    // Enable skinning for all child meshes
    collada.scene.traverse(function (child) {
      if (child instanceof THREE.SkinnedMesh) {
        enableSkinning(child);
      }
    });

    linkParent.add(collada.scene);

    // Hide model coordinate frames for the time being; remove as soon as position offset and rotation axis issues are fixed
    /*var collada_scene_axes = new THREE.AxisHelper(2);
     linkParent.add(collada_scene_axes);*/

    modelParent.add(linkParent);

    // Hide model coordinate frames for the time being; remove as soon as position offset and rotation axis issues are fixed
    /*var model_parent_axes = new THREE.AxisHelper(4);
     modelParent.add(model_parent_axes);*/

    // Use scale, position, and rotation offsets provided in animated robot model specification
    var p = GZ3D.animatedModel.visualModelParams;
    modelParent.scale.x = modelParent.scale.y = modelParent.scale.z = p[6];
    modelParent.position.x = modelParent.position.x + p[0] ;
    modelParent.position.y = modelParent.position.y + p[1];
    modelParent.position.z = modelParent.position.z + p[2];
    modelParent.rotation.x = modelParent.rotation.x + p[3];
    modelParent.rotation.y = modelParent.rotation.y + p[4];
    modelParent.rotation.z = modelParent.rotation.z + p[5];

    // Build list of bones in rig, and attach it to scene node (userData) for later retrieval in animation handling
    var getBoneList = function (object) {
      var boneList = [];

      if (object instanceof THREE.Bone) {
        boneList.push(object);
      }

      for (var i = 0; i < object.children.length; i++) {
        boneList.push.apply(boneList, getBoneList(object.children[i]));
      }

      return boneList;
    };

    var boneList = getBoneList(collada.scene);
    var boneHash = {};
    for (var k = 0; k < boneList.length; k++) {
      boneHash[boneList[k].name] = boneList[k];
    }
    // Skeleton visualization helper class
    var helper = new THREE.SkeletonHelper(collada.scene);

    boneHash['Skeleton_Visual_Helper'] = helper;
    modelParent.userData = boneHash;

    helper.material.linewidth = 3;
    // Hide skeleton helper for the time being
    // TODO: Make this configurable for visualizing the underlying skeleton
    helper.visible = false;

    that.scene.add(helper);
    that.scene.add(modelParent);

    that.scene.applyComposerSettingsToModel(modelParent);

    // Progress update: execute callback
    element.done = true;
    if (GZ3D.assetProgressCallback) {
      GZ3D.assetProgressCallback(GZ3D.assetProgressData);
    }
  }, function(progress){
    element.progress = progress.loaded;
    element.totalSize = progress.total;
    element.error = progress.error;
    if (GZ3D.assetProgressCallback) {
      GZ3D.assetProgressCallback(GZ3D.assetProgressData);
    }
  });
};

GZ3D.AnimatedModel.prototype.updateJoint = function(robotName, jointName, jointValue, jointAxis) {
  // Check if there is an animated model for it on the client side
  var entity = this.scene.getByName(robotName + '_animated');
  if (entity) {
    if (entity.userData !== undefined && entity.userData !== null) {
      var boneName = jointName;

      // Retrieve bone instance from userData map of bone instances in animated model
      if (entity.userData[boneName] !== undefined && entity.userData[boneName] !== null) {
        var targetBone = entity.userData[boneName];
        var rotationAxis = jointAxis;
        var rotationAngle = jointValue;

        var rotationMatrix = new THREE.Matrix4();
        rotationMatrix.identity();
        rotationMatrix.makeRotationAxis(rotationAxis, rotationAngle);

        targetBone.setRotationFromMatrix(rotationMatrix);
      }
    }

    this.scene.refresh3DViews();
  }
};


GZ3D.VisualMuscleModel = function(scene, robotName) {
  this.scene = scene;
  this.cylinderShapes = {};
  this.robotName = robotName;
  this.last_muscle_count = -1;
  this.radius = 1;
};


GZ3D.VisualMuscleModel.prototype.updateVisualization = function(message) {
  if (message.robot_name === this.robotName) {
    if (this.last_muscle_count !== message.muscle.length)
    {
      // Compute the radius as fraction of the average length of all cylinders.
      var total_length = 0;
      for (var k1 = 0; k1 < message.muscle.length; ++k1) {
        total_length += message.muscle[k1].length;
      }
      this.radius = 0.05 * total_length / message.muscle.length;
      this.last_muscle_count = message.muscle.length;
    }

    for (var k = 0; k < message.muscle.length; ++k) {
      // NOTE: The number of path segments can vary over time
      // because wrap objects cause local refinement of the initial path.
      var cylinder = null;
      var cq = 0;
      var cylinderEndPoint_1 = null;
      var cylinderEndPoint_2 = null;
      var radius = this.radius;
      var activation = message.muscle[k].activation;
      var color;
      if (message.muscle[k].isMuscle) {
        color = new THREE.Color(activation, 0, 1-activation);
      } else {
        color = new THREE.Color(activation, 1-activation, 0); // Path actuators are green.
      }
      var num_segments = message.muscle[k].pathPoint.length - 1;

      // In case we don't have enough muscles.
      // NOTE: The case were the number of muscles decreases is not handled.
      // It would result in superfluous visible geometry.
      if (!(k in this.cylinderShapes)) {
        this.cylinderShapes[k] = {
          cylinders : [],
          spheres : []
        };
      }
      let cylinders = this.cylinderShapes[k].cylinders;
      for (cq = 0; cq < num_segments; ++cq) {
        // Create new cylinder on demand.
        if (cylinders.length <= cq) {
          let edgeGeometry = new THREE.CylinderBufferGeometry(1, 1, 1, 8, 1);
          let cylinder = new THREE.Mesh(edgeGeometry, new THREE.MeshLambertMaterial({
            color: color,
            wireframe: false,
            flatShading: THREE.FlatShading
          }));
          this.scene.add(cylinder);
          cylinders.push(cylinder);
        }

        let cylinder = cylinders[cq];
        cylinder.visible = true; // In case less segments were needed the last frame.
        // Align and scale the cylinder.
        cylinderEndPoint_1 = new THREE.Vector3(
          message.muscle[k].pathPoint[cq].x,
          message.muscle[k].pathPoint[cq].y,
          message.muscle[k].pathPoint[cq].z);
        cylinderEndPoint_2 = new THREE.Vector3(
          message.muscle[k].pathPoint[cq + 1].x,
          message.muscle[k].pathPoint[cq + 1].y,
          message.muscle[k].pathPoint[cq + 1].z);
        let cylinder_direction = new THREE.Vector3().subVectors(cylinderEndPoint_2, cylinderEndPoint_1);
        cylinder.material.color = color;
        cylinder.scale.y = cylinder_direction.length();
        cylinder.scale.x = radius;
        cylinder.scale.z = radius;
        cylinder_direction.normalize();
        cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), cylinder_direction);
        cylinder.position.x = (cylinderEndPoint_2.x + cylinderEndPoint_1.x) / 2;
        cylinder.position.y = (cylinderEndPoint_2.y + cylinderEndPoint_1.y) / 2;
        cylinder.position.z = (cylinderEndPoint_2.z + cylinderEndPoint_1.z) / 2;
      } // end for path points
      // I don't bother tracking how many segments were needed last time.
      // Simply loop over all superfluous segments and turn them all off.
      for(; cq < cylinders.length; ++cq) {
        cylinders[cq].visible = false;
      }
      // Now the spheres!
      let spheres = this.cylinderShapes[k].spheres;
      for (cq = 0; cq < message.muscle[k].pathPoint.length; ++cq) {
        // Create one if needed.
        if (spheres.length <= cq) {
          let geom = new THREE.SphereBufferGeometry(1, 8, 8);
          let s = new THREE.Mesh(geom, new THREE.MeshLambertMaterial({
            color: color,
            wireframe: false,
            flatShading: THREE.FlatShading
          }));
          this.scene.add(s);
          spheres.push(s);
        }
        // Put it at the right place with the right size.
        let sphere = spheres[cq];
        sphere.visible = true;
        sphere.material.color = color;
        let pos = new THREE.Vector3(
          message.muscle[k].pathPoint[cq].x,
          message.muscle[k].pathPoint[cq].y,
          message.muscle[k].pathPoint[cq].z);
        sphere.position.copy(pos);
        sphere.scale.x = radius;
        sphere.scale.y = radius;
        sphere.scale.z = radius;
      }
      // Turn off not needed ones.
      for(; cq < spheres.length; ++cq) {
        spheres[cq].visible = false;
      }
    } // end for message.muscle
  }
};

/**
 * Object auto align helper
 * @constructor
 */
GZ3D.AutoAlignModel = function (scene)
{
  this.scene = scene;
  this.init();
  this.obj = undefined;
  this.needsAlignOnFloor = false;
  this.disableSnap = false;
};

/**
 * Constants
 */


GZ3D.AutoAlignModel.HorizontalObjectSnapDist = 0.1;
GZ3D.AutoAlignModel.AutoAlignSnapDist = 0.1;
GZ3D.AutoAlignModel.InnerBorder = 0.1;


/**
 * Initialize AutoAlignModel
 */

GZ3D.AutoAlignModel.prototype.init = function ()
{
  this.plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  this.ray = new THREE.Ray();
  this.obj = null;
};

/**
 * Align on the bottom of the mesh.
 *
 */

GZ3D.AutoAlignModel.prototype.alignOnMeshBase = function ()
{
  if (this.scene.modelManipulator.lockZAxis)
  {
    return;
  }

  if (!this.needsAlignOnFloor && this.obj)
  {
    var bbox = new THREE.Box3().setFromObject(this.obj);
    if (Math.abs(bbox.min.x) !== Infinity)
    {
      this.needsAlignOnFloor = false;
      var point = this.obj.position.clone();

      if (!this.disableSnap)
      {
        point.z = this.findBestZ(point.z - bbox.min.z);
      }
      else
      {
        point.z -= bbox.min.z;
      }

      this.scene.setPose(this.obj, point, this.obj.quaternion);
    }
    else
    {
      var that = this;

      setTimeout(function () { that.alignOnMeshBase(); }, 0.1);
    }
  }
};

/**
 * Initialize UI helpers
 *
 */

GZ3D.AutoAlignModel.prototype.initUIHelpers = function ()
{
  if (!this.displayAlignAxes)
  {
    this.displayAlignAxes = [];

    for (var i = 0; i < 4; i++)
    {
      var axisGeometry = new THREE.Geometry();
      if (i < 2)
      {
        axisGeometry.vertices.push(new THREE.Vector3(0, -1000, 0), new THREE.Vector3(0, 1000, 0));
      }
      else
      {
        axisGeometry.vertices.push(new THREE.Vector3(-1000, 0, 0), new THREE.Vector3(1000, 0, 0));
      }


      this.displayAlignAxes.push(new THREE.LineSegments(axisGeometry, new THREE.LineBasicMaterial({
        opacity: 0.3, color: 0xffffff, depthTest: false,
        depthWrite: false,
        transparent: true
      })));
      this.displayAlignAxes[i].visible = false;
      this.scene.add(this.displayAlignAxes[this.displayAlignAxes.length - 1]);
    }
  }
};

/**
 * Hide UI helpers
 *
 */

GZ3D.AutoAlignModel.prototype.hideUIHelpers = function ()
{
  if (this.displayAlignAxes)
  {
    for (var i = 0; i < this.displayAlignAxes.length; i++)
    {
      this.displayAlignAxes[i].visible = false;
    }
  }
};

/**
 * Return true, if an object should be ignored by snap
 *
 */

GZ3D.AutoAlignModel.prototype.autoAlignIgnoreObject = function (meshobj)
{
  if (meshobj.name.indexOf('_lightHelper') >= 0 || meshobj.name === 'grid' || meshobj.name === 'boundingBox' ||
    ((meshobj instanceof THREE.Camera)) || (meshobj instanceof THREE.Light) || (meshobj instanceof THREE.CameraHelper) ||
    (meshobj instanceof THREE.LensFlare) || (meshobj instanceof THREE.GridHelper))
  {
    return true;
  }

  while (meshobj)
  {
    if (meshobj === this.obj)
    {
      return true;
    }
    meshobj = meshobj.parent;
  }

  return false;
};

/**
 * Find lower Z of ray cast
 *
 */

GZ3D.AutoAlignModel.prototype.raycastToLowerZ = function (point, vector)
{
  var raycaster = new THREE.Raycaster();
  var objects, i, oneFound = false, idesc;
  var lowerZ = 1000;
  var lowerObject;

  raycaster.set(point, vector);
  objects = raycaster.intersectObjects(this.scene.scene.children, true);

  for (i = 0; i < objects.length; i++)
  {
    idesc = objects[i];
    if (!this.autoAlignIgnoreObject(idesc.object))
    {
      if (!oneFound || lowerZ < idesc.point.z)
      {
        lowerZ = idesc.point.z;
        lowerObject = idesc.object;
      }

      oneFound = true;
    }
  }

  if (!oneFound)
  {
    return undefined;
  }

  return { 'lowerZ': lowerZ, 'lowerObject': lowerObject };
};

/**
 * Generate a snap box aligned on a face of the bounding box.
 *
 */

GZ3D.AutoAlignModel.prototype.snapToObjectGenInnerFaceCube = function (bbox, faceIndex, snapsize)
{
  var innerCube = new THREE.Box3();

  innerCube.min.z = bbox.min.z + (bbox.max.z - bbox.min.z) * GZ3D.AutoAlignModel.InnerBorder;
  innerCube.max.z = bbox.max.z - (bbox.max.z - bbox.min.z) * GZ3D.AutoAlignModel.InnerBorder;

  switch (faceIndex)
  {
    case 0:
      innerCube.min.x = bbox.min.x - snapsize;
      innerCube.max.x = bbox.min.x + snapsize;
      innerCube.min.y = bbox.min.y + (bbox.max.y - bbox.min.y) * GZ3D.AutoAlignModel.InnerBorder;
      innerCube.max.y = bbox.max.y - (bbox.max.y - bbox.min.y) * GZ3D.AutoAlignModel.InnerBorder;
      break;

    case 1:
      innerCube.min.x = bbox.max.x - snapsize;
      innerCube.max.x = bbox.max.x + snapsize;
      innerCube.min.y = bbox.min.y + (bbox.max.y - bbox.min.y) * GZ3D.AutoAlignModel.InnerBorder;
      innerCube.max.y = bbox.max.y - (bbox.max.y - bbox.min.y) * GZ3D.AutoAlignModel.InnerBorder;
      break;

    case 2:
      innerCube.min.y = bbox.min.y - snapsize;
      innerCube.max.y = bbox.min.y + snapsize;
      innerCube.min.x = bbox.min.x + (bbox.max.x - bbox.min.x) * GZ3D.AutoAlignModel.InnerBorder;
      innerCube.max.x = bbox.max.x - (bbox.max.x - bbox.min.x) * GZ3D.AutoAlignModel.InnerBorder;
      break;

    case 3:
      innerCube.min.y = bbox.max.y - snapsize;
      innerCube.max.y = bbox.max.y + snapsize;
      innerCube.min.x = bbox.min.x + (bbox.max.x - bbox.min.x) * GZ3D.AutoAlignModel.InnerBorder;
      innerCube.max.x = bbox.max.x - (bbox.max.x - bbox.min.x) * GZ3D.AutoAlignModel.InnerBorder;
      break;
  }

  return innerCube;

};

/**
 * Compute the gravity of a face of a bounding box
 *
 */

GZ3D.AutoAlignModel.prototype.gravityPointOfFace = function (bbox, faceIndex)
{
  switch (faceIndex)
  {
    case 0: return new THREE.Vector3(bbox.min.x, bbox.min.y + (bbox.max.y - bbox.min.y) * 0.5, bbox.min.z + (bbox.max.z - bbox.min.z) * 0.5);
    case 1: return new THREE.Vector3(bbox.max.x, bbox.min.y + (bbox.max.y - bbox.min.y) * 0.5, bbox.min.z + (bbox.max.z - bbox.min.z) * 0.5);
    case 2: return new THREE.Vector3(bbox.min.x + (bbox.max.x - bbox.min.x) * 0.5, bbox.min.y, bbox.min.z + (bbox.max.z - bbox.min.z) * 0.5);
    case 3: return new THREE.Vector3(bbox.min.x + (bbox.max.x - bbox.min.x) * 0.5, bbox.max.y, bbox.min.z + (bbox.max.z - bbox.min.z) * 0.5);
    case 4: return new THREE.Vector3(bbox.min.x + (bbox.max.x - bbox.min.x) * 0.5, bbox.min.y + (bbox.max.y - bbox.min.y) * 0.5, bbox.max.z);
    case 5: return new THREE.Vector3(bbox.min.x + (bbox.max.x - bbox.min.x) * 0.5, bbox.min.y + (bbox.max.y - bbox.min.y) * 0.5, bbox.min.z);
  }
};

/**
 * Check if this object contain at least one 3D mesh
 */

GZ3D.AutoAlignModel.prototype.hasMeshSubObjects = function (object)
{
  var meshFound = false;

  object.traverse(function (subobj)
  {
    if (subobj instanceof THREE.Mesh)
    {
      meshFound = true;
    }
  });

  return meshFound;
};

/**
 * Align to objects
 */

GZ3D.AutoAlignModel.prototype.alignToObjects = function (position)
{

  var minimalSnapDistance = GZ3D.AutoAlignModel.HorizontalObjectSnapDist;
  if (this.obj && !this.needsAlignOnFloor)
  {
    var bbox = new THREE.Box3();

    bbox.setFromObject(this.obj);

    if (Math.abs(bbox.min.x) !== Infinity)
    {
      var innerFaceCubes = [this.snapToObjectGenInnerFaceCube(bbox, 1, minimalSnapDistance),
      this.snapToObjectGenInnerFaceCube(bbox, 0, minimalSnapDistance),
      this.snapToObjectGenInnerFaceCube(bbox, 3, minimalSnapDistance),
      this.snapToObjectGenInnerFaceCube(bbox, 2, minimalSnapDistance)];

      var that = this;
      var snapFound = false;
      var alignXFound = false;
      var alignYFound = false;
      var alignZFound = false;

      // Align faces

      this.scene.scene.traverse(function (snap2obj)
      {
        if (snap2obj.visible &&
          snap2obj instanceof THREE.Mesh &&
          !that.autoAlignIgnoreObject(snap2obj))
        {
          var snap2bbox = new THREE.Box3();

          snap2bbox.setFromObject(snap2obj);
          if (Math.abs(snap2bbox.min.x) !== Infinity)
          {

            if (!snapFound)
            {
              for (var j = 0; j < 4; j++)
              {
                var fc = that.snapToObjectGenInnerFaceCube(snap2bbox, j, minimalSnapDistance);

                if (fc.intersectsBox(innerFaceCubes[j]))
                {
                  snapFound = true;

                  switch (j)
                  {
                    case 0:
                      position.x = snap2bbox.min.x - (bbox.max.x - that.obj.position.x);
                      that.displayAlignAxes[0].position.copy(new THREE.Vector3(snap2bbox.min.x, position.y, position.z));
                      that.displayAlignAxes[0].visible = true;
                      break;

                    case 1:
                      position.x = snap2bbox.max.x - (bbox.min.x - that.obj.position.x);
                      that.displayAlignAxes[1].position.copy(new THREE.Vector3(snap2bbox.max.x, position.y, position.z));
                      that.displayAlignAxes[1].visible = true;
                      break;

                    case 2:
                      position.y = snap2bbox.min.y - (bbox.max.y - that.obj.position.y);
                      that.displayAlignAxes[2].position.copy(new THREE.Vector3(position.x, snap2bbox.min.y, position.z));
                      that.displayAlignAxes[2].visible = true;
                      break;

                    case 3:
                      position.y = snap2bbox.max.y - (bbox.min.y - that.obj.position.y);
                      that.displayAlignAxes[3].position.copy(new THREE.Vector3(position.x, snap2bbox.max.y, position.z));
                      that.displayAlignAxes[3].visible = true;
                      break;
                  }

                  that.obj.position.copy(position);
                  bbox.setFromObject(that.obj);
                }
              }
            }
          }
        }
      });

      // Align borders ( try first with object of same size (x/y))

      for (var i = 0; i < 2; i++)
      {
        if (alignXFound && alignYFound && alignZFound)
        {
          break;
        }

        for (var j = 0; j < this.scene.scene.children.length; j++)
        {
          var snap2obj = this.scene.scene.children[j];

          if (snap2obj.visible && !that.autoAlignIgnoreObject(snap2obj) && that.hasMeshSubObjects(snap2obj))
          {
            var snap2bbox = new THREE.Box3();

            snap2bbox.setFromObject(snap2obj);
            if (Math.abs(snap2bbox.min.x) !== Infinity)
            {
              if (i === 0)
              {
                var s = bbox.getSize();
                var s2 = snap2bbox.getSize();
                if (Math.abs(s.x - s2.x) > 0.01 || Math.abs(s.y - s2.y) > 0.01)
                {
                  continue;
                }
              }

              if (!((bbox.min.z >= (snap2bbox.max.z + GZ3D.AutoAlignModel.InnerBorder) ||
                bbox.max.z <= (snap2bbox.min.z + GZ3D.AutoAlignModel.InnerBorder))))
              {
                if (!alignZFound)
                {
                  if (Math.abs(snap2bbox.min.x - bbox.max.x) < GZ3D.AutoAlignModel.AutoAlignSnapDist ||
                    Math.abs(snap2bbox.max.x - bbox.min.x) < GZ3D.AutoAlignModel.AutoAlignSnapDist ||
                    Math.abs(snap2bbox.min.x - bbox.min.x) < GZ3D.AutoAlignModel.AutoAlignSnapDist ||
                    Math.abs(snap2bbox.max.x - bbox.max.x) < GZ3D.AutoAlignModel.AutoAlignSnapDist ||
                    Math.abs(snap2bbox.min.y - bbox.max.y) < GZ3D.AutoAlignModel.AutoAlignSnapDist ||
                    Math.abs(snap2bbox.max.y - bbox.min.y) < GZ3D.AutoAlignModel.AutoAlignSnapDist ||
                    Math.abs(snap2bbox.min.y - bbox.min.y) < GZ3D.AutoAlignModel.AutoAlignSnapDist ||
                    Math.abs(snap2bbox.max.y - bbox.max.y) < GZ3D.AutoAlignModel.AutoAlignSnapDist)
                  {
                    if (Math.abs(snap2bbox.min.z - bbox.min.z) < GZ3D.AutoAlignModel.AutoAlignSnapDist)
                    {
                      position.z = snap2bbox.min.z - (bbox.min.z - that.obj.position.z);
                      alignZFound = true;
                    }
                    else if (Math.abs(snap2bbox.max.z - bbox.max.z) < GZ3D.AutoAlignModel.AutoAlignSnapDist)
                    {
                      position.z = snap2bbox.max.z - (bbox.max.z - that.obj.position.z);
                      alignZFound = true;
                    }

                    if (alignZFound)
                    {
                      that.obj.position.copy(position);
                      bbox.setFromObject(that.obj);
                    }
                  }
                }

                if (!alignYFound)
                {
                  if (Math.abs(snap2bbox.min.x - bbox.max.x) < GZ3D.AutoAlignModel.AutoAlignSnapDist ||
                    Math.abs(snap2bbox.max.x - bbox.min.x) < GZ3D.AutoAlignModel.AutoAlignSnapDist ||
                    Math.abs(snap2bbox.min.x - bbox.min.x) < GZ3D.AutoAlignModel.AutoAlignSnapDist ||
                    Math.abs(snap2bbox.max.x - bbox.max.x) < GZ3D.AutoAlignModel.AutoAlignSnapDist ||
                    Math.abs(snap2bbox.min.z - bbox.max.z) < GZ3D.AutoAlignModel.AutoAlignSnapDist ||
                    Math.abs(snap2bbox.max.z - bbox.min.z) < GZ3D.AutoAlignModel.AutoAlignSnapDist)
                  {
                    if (Math.abs(snap2bbox.min.y - bbox.min.y) < GZ3D.AutoAlignModel.AutoAlignSnapDist)
                    {
                      position.y = snap2bbox.min.y - (bbox.min.y - that.obj.position.y);
                      this.displayAlignAxes[2].position.copy(new THREE.Vector3(position.x, snap2bbox.min.y, position.z));
                      this.displayAlignAxes[2].visible = true;
                      alignYFound = true;
                    }
                    if (Math.abs(snap2bbox.max.y - bbox.max.y) < GZ3D.AutoAlignModel.AutoAlignSnapDist)
                    {
                      position.y = snap2bbox.max.y - (bbox.max.y - that.obj.position.y);
                      this.displayAlignAxes[3].position.copy(new THREE.Vector3(position.x, snap2bbox.max.y, position.z));
                      this.displayAlignAxes[3].visible = true;
                      alignYFound = true;
                    }

                    if (alignYFound)
                    {

                      that.obj.position.copy(position);
                      bbox.setFromObject(that.obj);
                    }
                  }
                }

                if (!alignXFound)
                {
                  if (Math.abs(snap2bbox.min.y - bbox.max.y) < GZ3D.AutoAlignModel.AutoAlignSnapDist ||
                    Math.abs(snap2bbox.max.y - bbox.min.y) < GZ3D.AutoAlignModel.AutoAlignSnapDist ||
                    Math.abs(snap2bbox.min.y - bbox.min.y) < GZ3D.AutoAlignModel.AutoAlignSnapDist ||
                    Math.abs(snap2bbox.max.y - bbox.max.y) < GZ3D.AutoAlignModel.AutoAlignSnapDist ||
                    Math.abs(snap2bbox.min.z - bbox.max.z) < GZ3D.AutoAlignModel.AutoAlignSnapDist ||
                    Math.abs(snap2bbox.max.z - bbox.min.z) < GZ3D.AutoAlignModel.AutoAlignSnapDist)
                  {
                    if (Math.abs(snap2bbox.min.x - bbox.min.x) < GZ3D.AutoAlignModel.AutoAlignSnapDist)
                    {
                      position.x = snap2bbox.min.x - (bbox.min.x - that.obj.position.x);
                      this.displayAlignAxes[0].position.copy(new THREE.Vector3(snap2bbox.min.x, position.y, position.z));
                      this.displayAlignAxes[0].visible = true;
                      alignXFound = true;
                    }
                    if (Math.abs(snap2bbox.max.x - bbox.max.x) < GZ3D.AutoAlignModel.AutoAlignSnapDist)
                    {
                      position.x = snap2bbox.max.x - (bbox.max.x - that.obj.position.x);
                      this.displayAlignAxes[1].position.copy(new THREE.Vector3(snap2bbox.max.x, position.y, position.z));
                      this.displayAlignAxes[1].visible = true;
                      alignXFound = true;
                    }

                    if (alignXFound)
                    {
                      that.obj.position.copy(position);
                      bbox.setFromObject(that.obj);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  return position;
};

/**
 * Align snap object on target hitten mesh
 *
 */

GZ3D.AutoAlignModel.prototype.alignOnShape = function (position, hitDesc)
{
  var bbox = new THREE.Box3().setFromObject(this.obj);
  if (Math.abs(bbox.min.x) !== Infinity)
  {
    var alignOnGround = true;

    if (hitDesc && hitDesc.object && hitDesc.face)
    {
      var av,bv,cv;

      if (hitDesc.object.geometry.vertices)
      {
        av = hitDesc.object.geometry.vertices[hitDesc.face.a];
        bv = hitDesc.object.geometry.vertices[hitDesc.face.b];
        cv = hitDesc.object.geometry.vertices[hitDesc.face.c];
      }
      else if (hitDesc.object.geometry.attributes)
      {
        var itemSize = hitDesc.object.geometry.attributes.position.itemSize;
        var array = hitDesc.object.geometry.attributes.position.array;
        var i;

        i = hitDesc.face.a*itemSize;
        av = new THREE.Vector3(array[i],array[i+1],array[i+2]);

        i = hitDesc.face.b*itemSize;
        bv = new THREE.Vector3(array[i],array[i+1],array[i+2]);

        i = hitDesc.face.c*itemSize;
        cv = new THREE.Vector3(array[i],array[i+1],array[i+2]);
      }
      else
      {
        return;
      }

      var q = hitDesc.object.getWorldQuaternion();

      var abv = new THREE.Vector3();
      var acv = new THREE.Vector3();

      abv.subVectors(bv, av);
      acv.subVectors(cv, av);

      var v = new THREE.Vector3();
      v.copy(abv);

      v.cross(acv);
      v.normalize();

      v.applyQuaternion(q);

      if (Math.abs(v.x) > Math.abs(v.y))
      {
        v.y = 0;

        if (Math.abs(v.x) > Math.abs(v.z))
        {
          v.z = 0;
        }
        else
        {
          v.x = 0;
        }
      }
      else
      {
        v.x = 0;

        if (Math.abs(v.y) > Math.abs(v.z))
        {
          v.z = 0;
        }
        else
        {
          v.y = 0;
        }
      }

      v.normalize();

      if (v.x > 0)
      {
        position.x = position.x - (bbox.min.x - this.obj.position.x);
      }
      else if (v.x < 0)
      {
        position.x = position.x - (bbox.max.x - this.obj.position.x);
      }
      else if (v.y > 0)
      {
        position.y = position.y - (bbox.min.y - this.obj.position.y);
      }
      else if (v.y < 0)
      {
        position.y = position.y - (bbox.max.y - this.obj.position.y);
      }
      else if (v.z < 0)
      {
        position.z = position.z - (bbox.max.z - this.obj.position.z);
        alignOnGround = false;
      }

    }
    else
    {
      alignOnGround = false;
      var resInfo = this.findBestSurfaceToAlignZ(position.z);
      if (resInfo)
      {
        position.z = resInfo.lowerZ;
        var centerbbox = new THREE.Box3().setFromObject(resInfo.lowerObject);
        if (Math.abs(centerbbox.min.x) !== Infinity)
        {
          var pt1 = this.gravityPointOfFace(centerbbox, 4);
          var pt2 = this.gravityPointOfFace(bbox, 5);
          var vx = pt2.x - pt1.x;
          var vy = pt2.y - pt1.y;
          var minDist = GZ3D.AutoAlignModel.AutoAlignSnapDist;

          if ((vx * vx + vy * vy) < (minDist * minDist))
          {
            position.x = (pt1.x - (bbox.max.x - this.obj.position.x)) + (bbox.max.x - bbox.min.x) * 0.5;
            position.y = (pt1.y - (bbox.max.y - this.obj.position.y)) + (bbox.max.y - bbox.min.y) * 0.5;
          }
        }
      }
    }

    if (alignOnGround)
    {
      position.z = position.z - (bbox.min.z - this.obj.position.z);
    }

  }

  return position;
};

/**
 * Find the best Z value/object for auto-align object
 *
 */

GZ3D.AutoAlignModel.prototype.findBestSurfaceToAlignZ = function (fromZ)
{
  var bbox = new THREE.Box3().setFromObject(this.obj);
  if (Math.abs(bbox.min.x) !== Infinity)
  {
    var point = this.obj.position.clone();
    var gpoint = point.clone();
    var lowerZ;
    var raycastResult;

    point.z = fromZ;
    gpoint.z = fromZ + (bbox.max.z - bbox.min.z) * 0.5;

    raycastResult = this.raycastToLowerZ(gpoint, new THREE.Vector3(0, 0, 1));
    if (raycastResult !== undefined)
    {
      point.z = raycastResult.lowerZ - 0.01;
    }
    else
    {
      point.z += 50.0;
    }

    raycastResult = this.raycastToLowerZ(point, new THREE.Vector3(0, 0, -1));
    if (raycastResult !== undefined)
    {
      raycastResult.lowerZ = raycastResult.lowerZ - (bbox.min.z - this.obj.position.z);
      return raycastResult;
    }

  }

  return undefined;
};

/**
 * Find the best possible Z value so the mesh is not under the ground, when we add it.
 *
 */

GZ3D.AutoAlignModel.prototype.findBestZ = function (fromZ)
{
  if (this.obj && !this.needsAlignOnFloor)
  {
    var resInfo = this.findBestSurfaceToAlignZ(fromZ);
    if (resInfo)
    {
      return resInfo.lowerZ;
    }

    return this.obj.position.z;
  }

  return 0;
};


/**
 * Start aligning model.
 */

GZ3D.AutoAlignModel.prototype.start = function (objectToAlign)
{
  this.obj = objectToAlign;
  this.disableSnap = false;
  this.initUIHelpers();
};

/**
 * Finish aligning
 */

GZ3D.AutoAlignModel.prototype.finish = function ()
{
  var that = this;

  this.obj = undefined;
  this.needsAlignOnFloor = false;
  this.hideUIHelpers();
};


/**
 * Move and align model
 *
 */

GZ3D.AutoAlignModel.prototype.moveAlignModel = function (positionX, positionY)
{
  var raycaster = new THREE.Raycaster();
  var point, i;
  var distance = -1000;
  var hitDesc;

  var viewWidth = this.scene.getDomElement().clientWidth;
  var viewHeight = this.scene.getDomElement().clientHeight;
  var originalObjPos = new THREE.Vector3(this.obj.position.x, this.obj.position.y, this.obj.position.z);

  this.hideUIHelpers();

  if (!this.disableSnap)
  {
    raycaster.setFromCamera(new THREE.Vector2((positionX / viewWidth) * 2 - 1,
      -(positionY / viewHeight) * 2 + 1), this.scene.camera);

    var objects = raycaster.intersectObjects(this.scene.scene.children, true);

    for (i = 0; i < objects.length; i++)
    {
      var idesc = objects[i];

      if (!this.autoAlignIgnoreObject(idesc.object))
      {
        if (idesc.distance < distance || !point)
        {
          distance = idesc.distance;
          point = idesc.point.clone();
          hitDesc = idesc;
        }
      }
    }
  }

  if (!point)
  {
    var vector = new THREE.Vector3((positionX / viewWidth) * 2 - 1,
      -(positionY / viewHeight) * 2 + 1, 0.5);

    vector.unproject(this.scene.camera);

    var camv = this.scene.camera.position.clone();
    camv.z -= this.obj.position.z;

    this.ray.set(camv,
      vector.sub(this.scene.camera.position).normalize());
    point = this.ray.intersectPlane(this.plane);
  }

  if (point)
  {
    if (!this.disableSnap)
    {
      var snapDist = this.scene.modelManipulator.snapDist;
      if (snapDist)
      {
        point.x = Math.round(point.x / snapDist) * snapDist;
        point.y = Math.round(point.y / snapDist) * snapDist;
      }
    }

    if (!this.disableSnap)
    {
      this.obj.position.copy(point);
      point = this.alignOnShape(point, hitDesc);
    }
    else
    {
      point.z = this.obj.position.z;
    }

    if (this.scene.modelManipulator.lockZAxis)
    {
      point.z = originalObjPos.z;
    }

    if (!this.disableSnap)
    {
      this.obj.position.copy(point);
      point = this.alignToObjects(point);
    }

    if (this.scene.modelManipulator.lockXAxis)
    {
      point.x = originalObjPos.x;
    }

    if (this.scene.modelManipulator.lockYAxis)
    {
      point.y = originalObjPos.y;
    }

    if (this.scene.modelManipulator.lockZAxis)
    {
      point.z = originalObjPos.z;
    }


    this.scene.setPose(this.obj, point, this.obj.quaternion);
  }
};

/**
 * Rotate 90 deg.
 *
 */

GZ3D.AutoAlignModel.prototype.quickRotate = function ()
{
  if (this.obj)
  {
    var q = this.obj.quaternion.clone();
    var qr = new THREE.Quaternion();

    qr.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
    q.multiply(qr);

    this.scene.setPose(this.obj, this.obj.position, q);
  }
};

/**
 * Keyboard shortcuts
 *
 */

GZ3D.AutoAlignModel.prototype.onKeyUp = function (event)
{
  if (event.key === 'Shift')
  {
    this.disableSnap = false;
  }
};

GZ3D.AutoAlignModel.prototype.onKeyDown = function (event)
{
  if (event.keyCode === 32) // Quick rotation
  {
    this.quickRotate();
  }

  if (event.key === 'Shift')
  {
    this.disableSnap = true;
  }
};
/**
 * Bloom shader
 *
 * This is basically the THREE.UnrealBloomPass shader (that can be found in ThreeJS examples) with some minor changes.
 *
 */

GZ3D.BloomShader = function (resolution, strength, radius, threshold)
{

	THREE.Pass.call(this);

	this.strength = (strength !== undefined) ? strength : 1;
	this.radius = radius;
	this.threshold = threshold;
	this.resolution = (resolution !== undefined) ? new THREE.Vector2(resolution.x, resolution.y) : new THREE.Vector2(256, 256);

	// render targets
	var pars = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat };
	this.renderTargetsHorizontal = [];
	this.renderTargetsVertical = [];
	this.nMips = 5;
	var resx = Math.round(this.resolution.x / 2);
	var resy = Math.round(this.resolution.y / 2);

	this.renderTargetBright = new THREE.WebGLRenderTarget(resx, resy, pars);
	this.renderTargetBright.texture.generateMipmaps = false;

	for (var i = 0; i < this.nMips; i++)
	{

		var renderTarget = new THREE.WebGLRenderTarget(resx, resy, pars);

		renderTarget.texture.generateMipmaps = false;

		this.renderTargetsHorizontal.push(renderTarget);

		renderTarget = new THREE.WebGLRenderTarget(resx, resy, pars);

		renderTarget.texture.generateMipmaps = false;

		this.renderTargetsVertical.push(renderTarget);

		resx = Math.round(resx / 2);
		resy = Math.round(resy / 2);
	}

	// luminosity high pass material

	if (GZ3D.LuminosityHighPassShader === undefined)
	{
		console.error('GZ3D.BloomShader relies on GZ3D.LuminosityHighPassShader');
	}

	var highPassShader = GZ3D.LuminosityHighPassShader;
	this.highPassUniforms = THREE.UniformsUtils.clone(highPassShader.uniforms);

	this.highPassUniforms['luminosityThreshold'].value = threshold;
	this.highPassUniforms['smoothWidth'].value = 0.01;

	this.materialHighPassFilter = new THREE.ShaderMaterial({
		uniforms: this.highPassUniforms,
		vertexShader: highPassShader.vertexShader,
		fragmentShader: highPassShader.fragmentShader,
		defines: {}
	});

	// Gaussian Blur Materials
	this.separableBlurMaterials = [];
	var kernelSizeArray = [3, 5, 7, 9, 11];
	resx = Math.round(this.resolution.x / 2);
	resy = Math.round(this.resolution.y / 2);

	for (i = 0; i < this.nMips; i++)
	{

		this.separableBlurMaterials.push(this.getSeperableBlurMaterial(kernelSizeArray[i]));

		this.separableBlurMaterials[i].uniforms['texSize'].value = new THREE.Vector2(resx, resy);

		resx = Math.round(resx / 2);

		resy = Math.round(resy / 2);
	}

	// Composite material
	this.compositeMaterial = this.getCompositeMaterial(this.nMips);
	this.compositeMaterial.uniforms['blurTexture1'].value = this.renderTargetsVertical[0].texture;
	this.compositeMaterial.uniforms['blurTexture2'].value = this.renderTargetsVertical[1].texture;
	this.compositeMaterial.uniforms['blurTexture3'].value = this.renderTargetsVertical[2].texture;
	this.compositeMaterial.uniforms['blurTexture4'].value = this.renderTargetsVertical[3].texture;
	this.compositeMaterial.uniforms['blurTexture5'].value = this.renderTargetsVertical[4].texture;
	this.compositeMaterial.uniforms['bloomStrength'].value = strength;
	this.compositeMaterial.uniforms['bloomRadius'].value = 0.1;
	this.compositeMaterial.needsUpdate = true;

	var bloomFactors = [1.0, 0.8, 0.6, 0.4, 0.2];
	this.compositeMaterial.uniforms['bloomFactors'].value = bloomFactors;
	this.bloomTintColors = [new THREE.Vector3(1, 1, 1), new THREE.Vector3(1, 1, 1), new THREE.Vector3(1, 1, 1), new THREE.Vector3(1, 1, 1), new THREE.Vector3(1, 1, 1)];
	this.compositeMaterial.uniforms['bloomTintColors'].value = this.bloomTintColors;

	// copy material
	if (THREE.CopyShader === undefined)
	{
		console.error('THREE.BloomPass relies on THREE.CopyShader');
	}

	var copyShader = THREE.CopyShader;

	this.copyUniforms = THREE.UniformsUtils.clone(copyShader.uniforms);
	this.copyUniforms['opacity'].value = 1.0;

	this.materialCopy = new THREE.ShaderMaterial({
		uniforms: this.copyUniforms,
		vertexShader: copyShader.vertexShader,
		fragmentShader: copyShader.fragmentShader,
		blending: THREE.AdditiveBlending,
		depthTest: false,
		depthWrite: false,
		transparent: true
	});

	this.enabled = true;
	this.needsSwap = false;

	this.oldClearColor = new THREE.Color();
	this.oldClearAlpha = 1;

	this.camera = new THREE.OrthographicCamera(- 1, 1, 1, - 1, 0, 1);
	this.scene = new THREE.Scene();

	this.quad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), null);
	this.scene.add(this.quad);

};

GZ3D.BloomShader.prototype = Object.assign(Object.create(THREE.Pass.prototype), {

	constructor: GZ3D.BloomShader,

	dispose: function ()
	{
		for (var i = 0; i < this.renderTargetsHorizontal.length(); i++)
		{
			this.renderTargetsHorizontal[i].dispose();
		}
		for (i = 0; i < this.renderTargetsVertical.length(); i++)
		{
			this.renderTargetsVertical[i].dispose();
		}
		this.renderTargetBright.dispose();
	},

	setSize: function (width, height)
	{

		var resx = Math.round(width / 2);
		var resy = Math.round(height / 2);

		this.renderTargetBright.setSize(resx, resy);

		for (var i = 0; i < this.nMips; i++)
		{

			this.renderTargetsHorizontal[i].setSize(resx, resy);
			this.renderTargetsVertical[i].setSize(resx, resy);

			this.separableBlurMaterials[i].uniforms['texSize'].value = new THREE.Vector2(resx, resy);

			resx = Math.round(resx / 2);
			resy = Math.round(resy / 2);
		}
	},

	render: function (renderer, writeBuffer, readBuffer, delta, maskActive)
	{

		this.oldClearColor.copy(renderer.getClearColor());
		this.oldClearAlpha = renderer.getClearAlpha();
		var oldAutoClear = renderer.autoClear;
		renderer.autoClear = false;

		renderer.setClearColor(new THREE.Color(0, 0, 0), 0);

		if (maskActive)
		{
			renderer.context.disable(renderer.context.STENCIL_TEST);
		}

		// 1. Extract Bright Areas
		this.highPassUniforms['tDiffuse'].value = readBuffer.texture;
		this.highPassUniforms['luminosityThreshold'].value = this.threshold;
		this.quad.material = this.materialHighPassFilter;
		renderer.render(this.scene, this.camera, this.renderTargetBright, true);

		// 2. Blur All the mips progressively
		var inputRenderTarget = this.renderTargetBright;

		for (var i = 0; i < this.nMips; i++)
		{

			this.quad.material = this.separableBlurMaterials[i];

			this.separableBlurMaterials[i].uniforms['colorTexture'].value = inputRenderTarget.texture;

			this.separableBlurMaterials[i].uniforms['direction'].value = GZ3D.BloomShader.BlurDirectionX;

			renderer.render(this.scene, this.camera, this.renderTargetsHorizontal[i], true);

			this.separableBlurMaterials[i].uniforms['colorTexture'].value = this.renderTargetsHorizontal[i].texture;

			this.separableBlurMaterials[i].uniforms['direction'].value = GZ3D.BloomShader.BlurDirectionY;

			renderer.render(this.scene, this.camera, this.renderTargetsVertical[i], true);

			inputRenderTarget = this.renderTargetsVertical[i];
		}

		// Composite All the mips
		this.quad.material = this.compositeMaterial;
		this.compositeMaterial.uniforms['bloomStrength'].value = this.strength;
		this.compositeMaterial.uniforms['bloomRadius'].value = this.radius;
		this.compositeMaterial.uniforms['bloomTintColors'].value = this.bloomTintColors;
		renderer.render(this.scene, this.camera, this.renderTargetsHorizontal[0], true);

		// Blend it additively over the input texture
		this.quad.material = this.materialCopy;
		this.copyUniforms['tDiffuse'].value = this.renderTargetsHorizontal[0].texture;

		if (maskActive)
		{
			renderer.context.enable(renderer.context.STENCIL_TEST);
		}

		renderer.render(this.scene, this.camera, readBuffer, false);

		renderer.setClearColor(this.oldClearColor, this.oldClearAlpha);
		renderer.autoClear = oldAutoClear;
	},

	getSeperableBlurMaterial: function (kernelRadius)
	{

		return new THREE.ShaderMaterial({

			defines: {
				'KERNEL_RADIUS': kernelRadius,
				'SIGMA': kernelRadius
			},

			uniforms: {
				'colorTexture': { value: null },
				'texSize': { value: new THREE.Vector2(0.5, 0.5) },
				'direction': { value: new THREE.Vector2(0.5, 0.5) },
			},

			vertexShader: [
				'varying vec2 vUv;',
				'void main() {',
				'vUv = uv;',
				'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
				'}'].join('\n'),

			fragmentShader: [
				'#include <common>',
				'varying vec2 vUv;',
				'uniform sampler2D colorTexture;',
				'uniform vec2 texSize;',
				'uniform vec2 direction;',

				'float gaussianPdf(in float x, in float sigma) {',
				'	return 0.39894 * exp( -0.5 * x * x/( sigma * sigma))/sigma;',
				'}',
				'void main() {',
				'	vec2 invSize = 1.0 / texSize;',
				'	float fSigma = float(SIGMA);',
				'	float weightSum = gaussianPdf(0.0, fSigma);',
				'	vec3 diffuseSum = texture2D( colorTexture, vUv).rgb * weightSum;',
				'	for( int i = 1; i < KERNEL_RADIUS; i ++ ) {',
				'		float x = float(i);',
				'		float w = gaussianPdf(x, fSigma);',
				'		vec2 uvOffset = direction * invSize * x;',
				'		vec3 sample1 = texture2D( colorTexture, vUv + uvOffset).rgb;',
				'		vec3 sample2 = texture2D( colorTexture, vUv - uvOffset).rgb;',
				'		diffuseSum += (sample1 + sample2) * w;',
				'		weightSum += 2.0 * w;',
				'	}',
				'	gl_FragColor = vec4(diffuseSum/weightSum, 1.0);',
				'}'].join('\n')
		});
	},

	getCompositeMaterial: function (nMips)
	{

		return new THREE.ShaderMaterial({

			defines: {
				'NUM_MIPS': nMips
			},

			uniforms: {
				'blurTexture1': { value: null },
				'blurTexture2': { value: null },
				'blurTexture3': { value: null },
				'blurTexture4': { value: null },
				'blurTexture5': { value: null },
				'dirtTexture': { value: null },
				'bloomStrength': { value: 1.0 },
				'bloomFactors': { value: null },
				'bloomTintColors': { value: null },
				'bloomRadius': { value: 0.0 }
			},

			vertexShader: [
				'varying vec2 vUv;',
				'void main() {',
				'vUv = uv;',
				'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
				'}'].join('\n'),

			fragmentShader: [
				'varying vec2 vUv;',
				'uniform sampler2D blurTexture1;',
				'uniform sampler2D blurTexture2;',
				'uniform sampler2D blurTexture3;',
				'uniform sampler2D blurTexture4;',
				'uniform sampler2D blurTexture5;',
				'uniform sampler2D dirtTexture;',
				'uniform float bloomStrength;',
				'uniform float bloomRadius;',
				'uniform float bloomFactors[NUM_MIPS];',
				'uniform vec3 bloomTintColors[NUM_MIPS];',

				'float lerpBloomFactor(const in float factor) { ',
				'	float mirrorFactor = 1.2 - factor;',
				'	return mix(factor, mirrorFactor, bloomRadius);',
				'}',

				'void main() {',
				'	gl_FragColor = bloomStrength * ( lerpBloomFactor(bloomFactors[0]) * vec4(bloomTintColors[0], 1.0) * texture2D(blurTexture1, vUv) + ',
				'	 							 lerpBloomFactor(bloomFactors[1]) * vec4(bloomTintColors[1], 1.0) * texture2D(blurTexture2, vUv) + ',
				'								 lerpBloomFactor(bloomFactors[2]) * vec4(bloomTintColors[2], 1.0) * texture2D(blurTexture3, vUv) + ',
				'								 lerpBloomFactor(bloomFactors[3]) * vec4(bloomTintColors[3], 1.0) * texture2D(blurTexture4, vUv) + ',
				'								 lerpBloomFactor(bloomFactors[4]) * vec4(bloomTintColors[4], 1.0) * texture2D(blurTexture5, vUv) );',
				'}'].join('\n')
		});
	}

});

GZ3D.BloomShader.BlurDirectionX = new THREE.Vector2(1.0, 0.0);
GZ3D.BloomShader.BlurDirectionY = new THREE.Vector2(0.0, 1.0);

/**
 * HBP
 *
 * The composer is called by each view to render the final scene and apply all post-processing effects.
 * Since each view can have a different OpenGL context, the composer duplicates its shaders and buffers
 * and stores them directly in the view object.
 *
 * All composer settings are defined in "gzcomposersettings.js".
 *
 */

GZ3D.Composer = function (gz3dScene)
{
    this.gz3dScene = gz3dScene;
    this.scene = gz3dScene.scene;
    this.currenSkyBoxTexture = null;
    this.currentSkyBoxID = '';
    this.loadingSkyBox = false;
    this.settingsReady = false;

    this.pbrMaterial = false;
    this.pbrTotalLoadingTextures = 0;
    this.currentMasterSettings = localStorage.getItem('GZ3DMaster3DSettingsV2');

    if (!this.currentMasterSettings)
    {
        this.currentMasterSettings = GZ3D.MASTER_QUALITY_MIDDLE;
    }
    this.normalizedMasterSettings = null;


    //-----------------------------------
    // Sun, lens flare

    var that = this;
    var flareColor = new THREE.Color(0xffffff);

    var textureLoader = new THREE.TextureLoader();

    var textureFlare0 = textureLoader.load('img/3denv/lens/lenstart.png');
    var textureFlare1 = textureLoader.load('img/3denv/lens/lenspoly.png');
    var textureFlare2 = textureLoader.load('img/3denv/lens/lensflare2.png');
    var textureFlare3 = textureLoader.load('img/3denv/lens/lensflare3.png');
    var textureFlare4 = textureLoader.load('img/3denv/lens/lenscircle.jpg');

    this.lensFlare = new THREE.LensFlare(textureFlare0, 400, 0.0, THREE.AdditiveBlending, flareColor);
    this.lensFlare.customUpdateCallback = function (object) { that.lensFlareUpdateCallback(object); };

    this.lensFlare.add(textureFlare2, 512, 0.0, THREE.AdditiveBlending);
    this.lensFlare.add(textureFlare4, 150, 0.1, THREE.AdditiveBlending, new THREE.Color(0xffffff), 0.4);

    this.lensFlare.add(textureFlare3, 60, 0.6, THREE.AdditiveBlending);
    this.lensFlare.add(textureFlare3, 70, 0.7, THREE.AdditiveBlending);
    this.lensFlare.add(textureFlare3, 120, 0.9, THREE.AdditiveBlending);

    this.lensFlare.add(textureFlare1, 150, 0.8, THREE.AdditiveBlending, new THREE.Color(0xffffff), 0.2);
    this.lensFlare.add(textureFlare1, 90, 0.6, THREE.AdditiveBlending, new THREE.Color(0xffffff), 0.2);

    this.lensFlare.add(textureFlare3, 70, 1.0, THREE.AdditiveBlending);

    this.lensFlare.position.x = -65;
    this.lensFlare.position.y = 50;
    this.lensFlare.position.z = 40.0;
    this.scene.add(this.lensFlare);

    this.init();
};

GZ3D.Composer.prototype.init = function ()
{
    this.minimalRender = false;         // Can be used to force a rendering without any post-processing effects
};

/**
 * Lensflare call back
 *
 */

GZ3D.Composer.prototype.lensFlareUpdateCallback = function (object)
{
    // This function is called by the lens flare object to set the on-screen position of the lens flare particles.

    var dist = Math.sqrt(object.positionScreen.x * object.positionScreen.x + object.positionScreen.y * object.positionScreen.y);

    if (dist > 1.0) { dist = 1.0; }
    dist = 1.0 - dist;

    var f, fl = object.lensFlares.length;
    var flare;
    var vecX = -object.positionScreen.x * 2;
    var vecY = -object.positionScreen.y * 2;

    for (f = 0; f < fl; f++)
    {
        flare = object.lensFlares[f];
        flare.x = object.positionScreen.x + vecX * flare.distance;
        flare.y = object.positionScreen.y + vecY * flare.distance;
        flare.rotation = 0;
    }

    object.lensFlares[0].size = 10.0 + (600.0 - 10.0) * dist;
    object.lensFlares[1].size = 512.0 + (600.0 - 512.0) * dist;
    object.lensFlares[1].rotation = dist * 0.5;
    object.lensFlares[1].opacity = dist * dist;
    object.lensFlares[2].size = 512.0 + (600.0 - 512.0) * dist;
    object.lensFlares[2].opacity = dist;
    object.lensFlares[3].size = 100.0 + (200.0 - 100.0) * dist;
};



/**
 * Init composer for a specific view
 *
 */

GZ3D.Composer.prototype.initView = function (view)
{
    var width = view.canvas.width;
    var height = view.canvas.height;
    var camera = view.camera;

    //---------------------------------
    // Init the effect composer which handles all post-processing passes.

    view.composer = new THREE.EffectComposer(view.renderer);

    view.directRenderPass = new THREE.RenderPass(this.scene, camera);       // First pass simply render the scene
    view.directRenderPass.enabled = true;
    view.composer.addPass(view.directRenderPass);

    //-------------------------------------------------------
    // SSAO, initialize ambient occlusion pass

    // Setup depth buffer. SSAO requires a pre-rendered depth buffer.

    view.depthMaterial = new THREE.MeshDepthMaterial();
    view.depthMaterial.depthPacking = THREE.RGBADepthPacking;
    view.depthMaterial.blending = THREE.NoBlending;

    var pars = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
    view.depthRenderTarget = new THREE.WebGLRenderTarget(width, height, pars);

    // Setup SSAO pass which will compute and apply SSAO.

    view.ssaoPass = new THREE.ShaderPass(GZ3D.SSAOShader);
    view.ssaoPass.uniforms['tDepth'].value = view.depthRenderTarget.texture;
    view.ssaoPass.uniforms['size'].value.set(width, height);
    view.ssaoPass.uniforms['cameraNear'].value = camera.near;
    view.ssaoPass.uniforms['cameraFar'].value = camera.far;
    view.ssaoPass.uniforms['onlyAO'].value = 0;
    view.ssaoPass.uniforms['aoClamp'].value = 0.5;
    view.ssaoPass.uniforms['lumInfluence'].value = 0.9;
    view.composer.addPass(view.ssaoPass);

    //-------------------------------------------------------
    // RGB Curves

    if (!view.rgbCurvesShader)
    {
        view.rgbCurvesShader = new THREE.ShaderPass(GZ3D.RGBCurvesShader);
        view.rgbCurvesShader.enabled = false;
    }

    view.composer.addPass(view.rgbCurvesShader);

    //-------------------------------------------------------
    // Levels

    view.levelsShader = new THREE.ShaderPass(GZ3D.LevelsShader);
    view.levelsShader.enabled = false;
    view.levelsShader.uniforms['inBlack'].value = 0.0;
    view.levelsShader.uniforms['inGamma'].value = 1.0;
    view.levelsShader.uniforms['inWhite'].value = 1.0;

    view.levelsShader.uniforms['outBlack'].value = 0.0;
    view.levelsShader.uniforms['outWhite'].value = 1.0;

    view.composer.addPass(view.levelsShader);

    if (view.lensFlare !== undefined)
    {
        view.lensFlare.screenLevels = view.levelsShader;
    }

    //---------------------------------
    // Anti-aliasing

    view.fxaaShader = new THREE.ShaderPass(THREE.FXAAShader);
    view.composer.addPass(view.fxaaShader);

    //---------------------------------
    // Bloom

    view.bloomPass = new GZ3D.BloomShader(new THREE.Vector2(1024, 1024), 1.5, 0.4, 0.85);
    view.composer.addPass(view.bloomPass);

    //---------------------------------
    // Copy pass, after all the effects have been applied copy the content to the screen

    var copyPass = new THREE.ShaderPass(THREE.CopyShader);
    copyPass.renderToScreen = true;
    view.composer.addPass(copyPass);
 };


/**
 * Apply user camera settings
 * Reflect updates to user camera parameters in the 3D scene.
 * Must be called before a view is updated.
*/

GZ3D.Composer.prototype.applyUserCameraSettings = function ()
{
    var i;
    var cs = this.gz3dScene.normalizedComposerSettings;

    if (!cs.verticalFOV) { cs.verticalFOV = 60; }
    if (!cs.nearClippingDistance) { cs.nearClippingDistance = 0.15; }
    if (!cs.farClippingDistance) { cs.farClippingDistance = 100.0; }
    if (!cs.showCameraHelper) { cs.showCameraHelper = false; }

    for (i = 0; i < this.gz3dScene.viewManager.views.length; i++)
    {
        if (this.gz3dScene.viewManager.views[i].name==='main_view')
        {
            var camera = this.gz3dScene.viewManager.views[i].camera;

            camera.fov = cs.verticalFOV;
            // These two are 'string' types when assigned from Angular.js, so force a conversion to 'float'
            camera.near = 1.0 * cs.nearClippingDistance;
            camera.far = 1.0 * cs.farClippingDistance;

            camera.updateProjectionMatrix();

            if (cs.showCameraHelper === true)
            {
                camera.cameraHelper.visible = true;
                camera.cameraHelper.update();
            }
            else
            {
                camera.cameraHelper.visible = false;
            }
        }
    }
};


/**
 * Update PBR Material
 *
 */

GZ3D.Composer.prototype.updatePBRMaterial = function (node)
{
    var cs = this.gz3dScene.normalizedComposerSettings;
    var materialParams = {};
    var textureLoader;
    var that = this;

    if (this.pbrMaterial)
    {
        if (node.material.pbrMaterialDescription !== undefined)
        {
            if (node.pbrMeshMaterial === undefined)
            {
                // Need to initialize the PBR material and store both material for future use

                // Load textures

                textureLoader = new THREE.TextureLoader();

                if (!this.loadedPBRTextures)
                {
                    this.loadedPBRTextures = {};
                }

                Object.keys(node.material.pbrMaterialDescription).forEach(function (maptype)
                {
                    var mappath = node.material.pbrMaterialDescription[maptype];

                    if (that.currentMasterSettings !== GZ3D.MASTER_QUALITY_BEST)
                    {
                        mappath = mappath.replace('PBR','LOWPBR');
                    }

                    if (!that.loadedPBRTextures[mappath])
                    {
                        that.loadingPBR = true;
                        that.pbrTotalLoadingTextures += 1;

                        materialParams[maptype] = textureLoader.load(mappath,
                            function ()
                            {
                                that.pbrTotalLoadingTextures -= 1;
                                if (that.pbrTotalLoadingTextures === 0)
                                {
                                    that.gz3dScene.refresh3DViews();
                                }
                            },
                            undefined,
                            function ()
                            {
                                that.pbrTotalLoadingTextures -= 1;
                                that.gz3dScene.refresh3DViews();
                            });

                        materialParams[maptype].wrapS = THREE.RepeatWrapping;
                        that.loadedPBRTextures[mappath] = materialParams[maptype];
                    }
                    else
                    {
                        materialParams[maptype] = that.loadedPBRTextures[mappath];
                    }

                    if (maptype==='map')
                    {
                        node.material.map = materialParams[maptype];
                    }

                });

                node.pbrMeshMaterial = new THREE.MeshStandardMaterial(materialParams);
                node.pbrMeshMaterial.transparent = node.material.transparent;
                node.pbrMeshMaterial.opacity = node.material.opacity;

                if (node.pbrMeshMaterial.transparent)
                {
                    node.pbrMeshMaterial.side = THREE.FrontSide;
                    node.pbrMeshMaterial.depthWrite = false;
                    node.castShadow = false;
                }

                node.pbrMeshMaterial.blending = node.material.blending;
                node.pbrMeshMaterial.blendSrc = node.material.blendSrc;
                node.pbrMeshMaterial.blendDst = node.material.blendDst;
                node.pbrMeshMaterial.blendEquation = node.material.blendEquation;
                node.stdMeshMaterial = node.material;
                node.pbrMeshMaterial.roughness = 1.0;
                node.pbrMeshMaterial.metalness = 1.0;
                node.pbrMeshMaterial.skinning = node.stdMeshMaterial.skinning;
                node.pbrMeshMaterial.aoMapIntensity = 1.0;
            }

            if (cs.dynamicEnvMap)
            {
                if (this.cubeCamera)
                {
                    node.pbrMeshMaterial.envMap = this.cubeCamera.renderTarget.texture;
                }
            }
            else
            {
                node.pbrMeshMaterial.envMap = this.currenSkyBoxTexture; // Use the sky box if no custom env map texture has been defined
            }

            if (!this.loadingPBR)
            {
                node.material = node.pbrMeshMaterial;
                node.material.needsUpdate = true;
            }
        }
    }
    else
    {
        if (node.stdMeshMaterial !== undefined)
        {
            node.material = node.stdMeshMaterial;
            node.material.needsUpdate = true;
        }

        if (node.material.pbrMaterialDescription !== undefined && !node.material.map)
        {
            if (node.pbrMeshMaterial)
            {
                node.material.map = node.pbrMeshMaterial.map;
            }
            else
            {
                var maptype = 'map';
                if (maptype in node.material.pbrMaterialDescription)
                {
                    var mappath = node.material.pbrMaterialDescription[maptype];

                    if (this.currentMasterSettings !== GZ3D.MASTER_QUALITY_BEST)
                    {
                        mappath = mappath.replace('PBR','LOWPBR');
                    }

                    if (!this.loadedPBRTextures)
                    {
                        this.loadedPBRTextures = {};
                    }

                    if (!this.loadedPBRTextures[mappath])
                    {
                        this.loadingPBR = true;
                        this.pbrTotalLoadingTextures += 1;

                        textureLoader = new THREE.TextureLoader();

                        node.material.map = materialParams[maptype] = textureLoader.load(mappath,
                            function ()
                            {
                                that.pbrTotalLoadingTextures -= 1;
                                if (that.pbrTotalLoadingTextures === 0)
                                {
                                    that.gz3dScene.refresh3DViews();
                                }
                            },
                            undefined,
                            function ()
                            {
                                that.pbrTotalLoadingTextures -= 1;
                                that.gz3dScene.refresh3DViews();
                            });

                        this.loadedPBRTextures[mappath] = materialParams[maptype];
                    }
                    else
                    {
                        materialParams[maptype] = this.loadedPBRTextures[mappath];
                        if (maptype==='map')
                        {
                            node.material.map = materialParams[maptype];
                        }
                    }
                }
            }
        }
    }
};

/**
 * Disable shadow receiving
 *
 */

GZ3D.Composer.prototype.disableShadowReceiving = function (node)
{
    node.receiveShadow = false;
    node.traverse(function (subnode) { subnode.receiveShadow = false; });
};

/**
 * Apply shadow settings
 *
 */

GZ3D.Composer.prototype.applyShadowSettings = function ()
{
    var cs = this.gz3dScene.normalizedComposerSettings;
    var that = this;

    if (cs.shadowSettings)
    {
        this.scene.traverse(function (node)
        {
            for (var i = 0; i < cs.shadowSettings.length; i = i + 1)
            {
                var settings = cs.shadowSettings[i];

                if (node.name && node.name.indexOf('robot:') === 0)
                {
                    that.disableShadowReceiving(node);
                }

                if (node.name === settings.lightName && node instanceof THREE.Light)
                {
                    if (settings.cameraNear)
                    {
                        node.shadow.camera.near = settings.cameraNear;
                    }

                    if (settings.cameraFOV)
                    {
                        node.shadow.camera.fov = (2 * settings.cameraFOV / Math.PI) * 180;
                    }

                    if (settings.cameraFar)
                    {
                        node.shadow.camera.far = settings.cameraFar;
                    }

                    if (settings.mapSize)
                    {
                        node.shadow.mapSize.width = settings.mapSize;
                        node.shadow.mapSize.height = settings.mapSize;
                    }

                    if (settings.cameraBottom)
                    {
                        node.shadow.camera.bottom = settings.cameraBottom;
                        node.shadow.camera.left = settings.cameraLeft;
                        node.shadow.camera.right = settings.cameraRight;
                        node.shadow.camera.top = settings.cameraTop;
                    }

                    if (settings.bias)
                    {
                        node.shadow.bias = settings.bias;
                    }

                    if (settings.radius)
                    {
                        node.shadow.radius = settings.radius;
                    }
                }
            }
        });
    }
};

/**
 * Apply composer settings
 *
 */

GZ3D.Composer.prototype.applyComposerSettings = function (updateColorCurve, forcePBRUpdate, shadowReset)
{
    var that = this;

    this.gz3dScene.refresh3DViews();
    this.settingsReady = true;

    var cs = this.gz3dScene.composerSettings;
    if (cs.pbrMaterial === undefined)
    {
        cs.pbrMaterial = true;
    }

    if (cs.dynamicEnvMap === undefined)
    {
        cs.dynamicEnvMap = false;
    }

    this.normalizedMasterSetting = null;
    this.updateComposerWithMasterSettings();
    this.applyUserCameraSettings();

    // Updates the composer internal data with the latest settings.

    // Pass true to updateColorCurve it the color curve has been changed. This will
    // force the composer to update its ramp texture for the color curves.

    cs = this.gz3dScene.normalizedComposerSettings;

    // Shadows

    this.applyShadowSettings();

    // call setShadowsMap only when the shadow setting is changed, not at every color update (ambient occlusion,bloom,color correction)
    if (shadowReset !== true)
    {
        this.gz3dScene.setShadowMaps(cs.shadows);
    }

    // Fog

    if ((cs.fog && this.scene.fog === null) || (!cs.fog && this.scene.fog !== null))
    {
        // turning on/off fog requires materials to be updated

        this.scene.traverse(function (node)
        {
            if (node.material)
            {
                node.material.needsUpdate = true;
                if (node.material.materials)
                {
                    for (var i = 0; i < node.material.materials.length; i = i + 1)
                    {
                        node.material.materials[i].needsUpdate = true;
                    }
                }
            }
        });
    }

    if (cs.fog)
    {
        this.scene.fog = new THREE.FogExp2(cs.fogColor, cs.fogDensity);
    }
    else
    {
        this.scene.fog = null;
    }


    // Update sky box

    var path, format, urls;

    if (this.currentSkyBoxID !== cs.skyBox)
    {
        this.currentSkyBoxID = cs.skyBox;
        forcePBRUpdate = true;

        if (this.currentSkyBoxID === '')
        {
            this.currenSkyBoxTexture = null; // Plain color, no needs for a texture
        }
        else
        {
            var name = this.currentSkyBoxID;
            var filename = this.currentSkyBoxID;

            if (this.currentMasterSettings !== GZ3D.MASTER_QUALITY_BEST)
            {
                filename = 'LOWSKY_' + filename;
            }

            path = GZ3D.assetsPath + '/sky/' + name + '/' + filename + '-';
            format = '.jpg';
            urls = [
                path + 'px' + format, path + 'nx' + format,
                path + 'nz' + format, path + 'pz' + format,
                path + 'py' + format, path + 'ny' + format
            ];

            this.loadingSkyBox = true;
            this.currenSkyBoxTexture = new THREE.CubeTextureLoader().load(urls,
                function ()
                {
                    that.loadingSkyBox = false;
                    that.gz3dScene.refresh3DViews();
                }
            );
            this.currenSkyBoxTexture.format = THREE.RGBFormat;
        }
    }

    // PBR material

    if (this.pbrMaterial !== cs.pbrMaterial || forcePBRUpdate)
    {
        this.pbrMaterial = cs.pbrMaterial;

        this.scene.traverse(function (node)
        {
            if (node.material)
            {
                if (forcePBRUpdate && node.stdMeshMaterial)
                {
                    node.material = node.stdMeshMaterial;
                }

                that.updatePBRMaterial(node);
                node.material.needsUpdate = true;
            }
        });

        if (cs.pbrMaterial && cs.dynamicEnvMap)
        {
            if (!this.cubeCamera)
            {
                this.cubeCamera = new THREE.CubeCamera(1, 100000, 16);
                this.cubeCamera.position.copy(new THREE.Vector3(0, 0, 1.5));
                this.scene.add(this.cubeCamera);
            }

            this.cubeMapNeedsUpdate = true;
            this.scene.traverse(function (node)
            {
                if (node.material && node.pbrMeshMaterial)
                {
                    node.pbrMeshMaterial.envMap = that.cubeCamera.renderTarget.texture;
                    node.pbrMeshMaterial.needsUpdate = true;
                }
            });
        }
    }

    // Color curve

    if (updateColorCurve)
    {
        this.gz3dScene.viewManager.views.forEach(function (view)
        {
            if (!view.rgbCurvesShader)
            {
                view.rgbCurvesShader = new THREE.ShaderPass(GZ3D.RGBCurvesShader);
                view.rgbCurvesShader.enabled = false;
            }
                // Color curve

            if ((cs.rgbCurve['red'] === undefined || cs.rgbCurve['red'].length < 2) &&
                (cs.rgbCurve['green'] === undefined || cs.rgbCurve['green'].length < 2) &&
                (cs.rgbCurve['blue'] === undefined || cs.rgbCurve['blue'].length < 2))
            {
                view.rgbCurvesShader.enabled = false;   // We don't need RGB curve correction, simply disable the shader pass
            }
            else
            {
                view.rgbCurvesShader.enabled = true;

                var rgbCurves = [{ 'color': 'red', 'curve': [] },
                { 'color': 'green', 'curve': [] },
                { 'color': 'blue', 'curve': [] }];

                // Prepare the curve. Vertices need to be converted to ThreeJS vectors.

                rgbCurves.forEach(function (channel)
                {
                    var color = channel['color'];

                    if ((cs.rgbCurve[color] === undefined || cs.rgbCurve[color].length < 2))
                    {
                        // The curve is empty, fill the chanel with a simple linear curve (no color correction).

                        channel['curve'].push(new THREE.Vector3(0, 0, 0));
                        channel['curve'].push(new THREE.Vector3(0, 1, 0));
                    }
                    else
                    {
                        // Convert to vectors

                        cs.rgbCurve[color].forEach(function (vi)
                        {
                            channel['curve'].push(new THREE.Vector3(vi[0], vi[1], 0));
                        });
                    }
                });

                // Pass the new curve to the color correction shader.

                GZ3D.RGBCurvesShader.setupCurve(rgbCurves[0]['curve'], rgbCurves[1]['curve'], rgbCurves[2]['curve'], view.rgbCurvesShader);
            }
        });
    }
};

/**
 * Apply composer settings to a specific 3D model
 *
 */

GZ3D.Composer.prototype.applyComposerSettingsToModel = function (model)
{
    this.updateComposerWithMasterSettings();

    var that = this;

    function updatePBRForModel(node)
    {
        if (node.material)
        {
            if (node.stdMeshMaterial)
            {
                node.material = node.stdMeshMaterial;
            }

            that.updatePBRMaterial(node);
            node.material.needsUpdate = true;
        }
    }

    updatePBRForModel(model);

    model.traverse(function (node)
    {
        updatePBRForModel(node);
    });

    this.gz3dScene.refresh3DViews();
};

/**
 * Prepare cube map render
 *
 */

GZ3D.Composer.prototype.prepareCubeMapEnvMapRender = function (done)
{
    var that = this;
    var i = 0;

    if (!done)
    {
        this.cubeMapRenderHidden = [];
    }
    else
    {
        for (i = 0; i < this.cubeMapRenderHidden.length; i++)
        {
            this.cubeMapRenderHidden[i].visible = true;
        }

        this.cubeMapRenderHidden = undefined;
    }


    this.scene.traverse(function (node)
    {
        if (node.material)
        {
            if (node.pbrMeshMaterial)
            {
                node.pbrMeshMaterial.envMap = done ? that.cubeCamera.renderTarget.texture : null;
                node.pbrMeshMaterial.needsUpdate = true;
            }
            else if (!done)
            {
                if (node.visible)
                {
                    node.visible = false;
                    that.cubeMapRenderHidden.push(node);
                }
            }
        }
    });
};

/**
 *
 * Ask composer for scene preparation readyness. Returns null when all is ready or a message describing the progress state.
 *
 */

GZ3D.Composer.prototype.scenePreparationState = function ()
{
    var cs = this.gz3dScene.normalizedComposerSettings;

    if (this.pbrMaterial)
    {
        if (this.loadingPBR)
        {
            return 'Loading PBR textures';
        }

        if (cs.dynamicEnvMap)   // Usually done at the very end
        {
            if (this.cubeMapNeedsUpdate)
            {
                return 'Generating environment map';
            }
        }

    }

    if (this.currentSkyBoxID !== '')
    {
        if (this.loadingSkyBox)
        {
            return 'Loading sky box';
        }
    }


    return null;
};


/**
 * Render the scene and apply the post-processing effects.
 *
 */

GZ3D.Composer.prototype.render = function (view)
{
    var that = this;
    var cs = this.gz3dScene.normalizedComposerSettings;

    if (view.composer === undefined)    // No ThreeJS composer for this view, we need to initialize it.
    {
        this.initView(view);
    }

    view.renderer.clear();

    if (!this.settingsReady)
    {
        return;
    }

    if (this.pbrMaterial)
    {
        if (this.loadingPBR && this.pbrTotalLoadingTextures === 0)
        {
            this.loadingPBR = false;
            this.applyComposerSettings(false, true);
            this.loadingPBR = (this.pbrTotalLoadingTextures !== 0);
        }
    }

    if (!this.loadingPBR && this.pbrMaterial && !this.loadingSkyBox && cs.dynamicEnvMap && !this.gz3dScene.dontRebuildCubemapNow)
    {
        if (this.cubeMapNeedsUpdate)
        {
            this.scene.background = this.currenSkyBoxTexture;
            this.cubeMapNeedsUpdate = false;
            this.prepareCubeMapEnvMapRender(false);
            this.cubeCamera.update(view.renderer, this.scene);
            this.prepareCubeMapEnvMapRender(true);
        }
    }


    this.gz3dScene.labelManager.onRender();

    var camera = view.camera;
    var width = view.container.clientWidth;
    var height = view.container.clientHeight;
    var nopostProcessing = (cs.sun === '' && !cs.ssao && !cs.antiAliasing && !view.rgbCurvesShader.enabled && !view.levelsShader.enabled && this.currentSkyBoxID === '');

    if (this.minimalRender || nopostProcessing || this.currentMasterSettings === GZ3D.MASTER_QUALITY_MINIMAL) // No post processing is required, directly render to the screen.
    {
        this.lensFlare.visible = false;
        this.scene.background = null;
        view.renderer.render(this.scene, camera);
    }
    else
    {
        var pixelRatio = view.renderer.getPixelRatio();
        var newWidth = Math.floor(width / pixelRatio) || 1;
        var newHeight = Math.floor(height / pixelRatio) || 1;

        view.composer.setSize(newWidth, newHeight);

        // Update the shaders with the latest settings

        // SSAO

        view.ssaoPass.enabled = cs.ssao;
        view.ssaoPass.uniforms['onlyAO'].value = cs.ssaoDisplay ? 1.0 : 0.0;
        view.ssaoPass.uniforms['aoClamp'].value = cs.ssaoClamp;
        view.ssaoPass.uniforms['lumInfluence'].value = cs.ssaoLumInfluence;
        view.ssaoPass.uniforms['size'].value.set(width, height);
        view.ssaoPass.uniforms['cameraNear'].value = camera.near;
        view.ssaoPass.uniforms['cameraFar'].value = camera.far;

        // Bloom

        view.bloomPass.enabled = cs.bloom;
        view.bloomPass.strength = cs.bloomStrength;
        view.bloomPass.radius = cs.bloomRadius;
        view.bloomPass.threshold = cs.bloomThreshold;

        // Levels

        view.levelsShader.enabled = (cs.levelsInBlack > 0.0 || cs.levelsInGamma < (1.0 - 0.00001) || cs.levelsInGamma > (1.0 + 0.00001) ||
            cs.levelsInWhite < 1.0 || cs.levelsOutBlack > 0.0 || cs.levelsOutWhite < 1.0);

        if (view.levelsShader.enabled)
        {
            view.levelsShader.uniforms['inBlack'].value = cs.levelsInBlack;
            view.levelsShader.uniforms['inGamma'].value = cs.levelsInGamma;
            view.levelsShader.uniforms['inWhite'].value = cs.levelsInWhite;
            view.levelsShader.uniforms['outBlack'].value = cs.levelsOutBlack;
            view.levelsShader.uniforms['outWhite'].value = cs.levelsOutWhite;
        }

        // Anti-aliasing

        if (cs.antiAliasing)
        {
            view.fxaaShader.enabled = true;
            view.fxaaShader.uniforms['resolution'].value.set(1.0 / width, 1.0 / height);
        }
        else
        {
            view.fxaaShader.enabled = false;
        }

        // Start rendering

        if (cs.ssao)
        {
            // If SSAO is active, we need to render the scene to a depth buffer that will be used later
            // by the SSAO shader.

            if (view.depthRenderTarget.width !== width || view.depthRenderTarget.height !== height)
            {
                view.depthRenderTarget.setSize(width, height);  // Resize the depth buffer if required
            }

            // Render to depth buffer

            this.scene.background = null;       // Some effects should be disabled during depth buffer rendering
            this.lensFlare.visible = false;
            this.scene.overrideMaterial = view.depthMaterial;
            view.renderer.render(this.scene, camera, view.depthRenderTarget, true);    // Render to depth buffer now!
            this.scene.overrideMaterial = null;
        }

        // Render all passes

        this.lensFlare.visible = cs.sun === 'SIMPLELENSFLARE';  // Display lens flare if required
        this.scene.background = this.currenSkyBoxTexture;
        this.renderingView = view;
        view.composer.render();
        this.renderingView = null;
    }
};

/**
 * Check scene ready
 *
 */

GZ3D.Composer.prototype.checkSceneReady = function ()
{
    // Scene ready callback

    if (this.sceneReadyCallback)
    {
        var prepstate = this.scenePreparationState();
        this.sceneReadyCallback(prepstate);
        if (prepstate===null)
        {
            this.sceneReadyCallback = undefined;
            this.gz3dScene.refresh3DViews();
        }
    }
};


/**
 * Apply master settings to composer settings
 *
 */

GZ3D.Composer.prototype.updateComposerWithMasterSettings = function ()
{
    if (this.normalizedMasterSetting !== this.currentMasterSettings)
    {
        this.normalizedMasterSetting = this.currentMasterSettings;

        this.gz3dScene.normalizedComposerSettings = JSON.parse(JSON.stringify(this.gz3dScene.composerSettings));

        var maxShadow = null;

        switch (this.currentMasterSettings)
        {
            case GZ3D.MASTER_QUALITY_BEST: break;    // Keep the settings as they are by default

            case GZ3D.MASTER_QUALITY_MINIMAL:
                this.gz3dScene.normalizedComposerSettings.antiAliasing = false;
                this.gz3dScene.normalizedComposerSettings.rgbCurve = { 'red': [], 'green': [], 'blue': [] };
                this.gz3dScene.normalizedComposerSettings.levelsInBlack = 0.0;
                this.gz3dScene.normalizedComposerSettings.levelsInGamma = 1.0;
                this.gz3dScene.normalizedComposerSettings.levelsInWhite = 1.0;
                this.gz3dScene.normalizedComposerSettings.levelsOutBlack = 0.0;
                this.gz3dScene.normalizedComposerSettings.levelsOutWhite = 1.0;
                this.gz3dScene.normalizedComposerSettings.shadows = false;
                /* falls through */

            case GZ3D.MASTER_QUALITY_LOW:
                this.gz3dScene.normalizedComposerSettings.skyBox = '';
                this.gz3dScene.normalizedComposerSettings.pbrMaterial = false;
                this.gz3dScene.normalizedComposerSettings.fog = false;
                this.gz3dScene.normalizedComposerSettings.sun = '';
                maxShadow = 1024;
            /* falls through */

            case GZ3D.MASTER_QUALITY_MIDDLE:
                this.gz3dScene.normalizedComposerSettings.ssaoDisplay = false;
                this.gz3dScene.normalizedComposerSettings.ssao = false;
                this.gz3dScene.normalizedComposerSettings.bloom = false;

                if (!maxShadow)
                {
                    maxShadow = 2048;
                }

            /* falls through */
        }

        if (maxShadow && this.gz3dScene.normalizedComposerSettings.shadowSettings && this.gz3dScene.normalizedComposerSettings.shadows)
        {
            for (var i = 0; i < this.gz3dScene.normalizedComposerSettings.shadowSettings.length; i = i + 1)
            {
                var settings = this.gz3dScene.normalizedComposerSettings.shadowSettings[i];

                if (settings.mapSize >= maxShadow)
                {
                    settings.mapSize = maxShadow;
                }
            }
        }
    }
};

/**
 * Set master settings
 *
 */

GZ3D.Composer.prototype.setMasterSettings = function (masterSettings, applySettings)
{
    if (masterSettings !== this.currentMasterSettings)
    {
        if (applySettings)
        {
            this.currentMasterSettings = masterSettings;
            this.applyComposerSettings(true, true);
            this.normalizedMasterSetting = null;
        }
        localStorage.setItem('GZ3DMaster3DSettingsV2', masterSettings);
    }
};

/**
 * Is a specific setting supported by current master settings
 *
 */

GZ3D.Composer.prototype.isSupportedByMasterSetting = function (setting)
{
    switch (this.currentMasterSettings)
    {
        case GZ3D.MASTER_QUALITY_MINIMAL: return false;

        case GZ3D.MASTER_QUALITY_LOW:
            if (setting === 'shadows') { return false; }
            if (setting === 'skyBox') { return false; }
            if (setting === 'pbrMaterial') { return false; }
            if (setting === 'dynamicEnvMap') { return false; }

        /* falls through */

        case GZ3D.MASTER_QUALITY_MIDDLE:
            if (setting === 'ssao') { return false; }
            if (setting === 'ssaoDisplay') { return false; }
            if (setting === 'bloom') { return false; }
            if (setting === 'fog') { return false; }
            if (setting === 'sun') { return false; }
            break;
    }

    return true;
};




/**
 * HBP
 *
 * Composer settings. This is where you specify global post-processing settings
 * such as ssao, etc. Composer settings can be accessed in scene.composerSettings.
 * Once modified you need to call scene.applyComposerSettings to reflect the changes
 * in the 3D scene.
 */

// Master settings

GZ3D.MASTER_QUALITY_BEST = 'Best';
GZ3D.MASTER_QUALITY_MIDDLE = 'Middle';
GZ3D.MASTER_QUALITY_LOW = 'Low';
GZ3D.MASTER_QUALITY_MINIMAL = 'Minimal';

// Composer Settings

GZ3D.ComposerSettings = function ()
{
    this.shadows = false;
    this.antiAliasing = true;

    this.ssao = false;                       // Screen space ambient occlusion
    this.ssaoDisplay = false;
    this.ssaoClamp = 0.8;
    this.ssaoLumInfluence = 0.7;

    this.rgbCurve = {'red':[],'green':[],'blue':[]};    // Color correction, disabled by default

    this.levelsInBlack = 0.0;     // Color levels
    this.levelsInGamma = 1.0;
    this.levelsInWhite = 1.0;
    this.levelsOutBlack = 0.0;
    this.levelsOutWhite = 1.0;

    this.skyBox = '';               // The file path of the sky box (without file extension) or empty string for plain color background
    this.dynamicEnvMap = true;      // Environment map is generated at the beginning of the experiment

    this.sun = '';                  // empty string for no sun or "SIMPLELENSFLARE" for simple lens flare rendering

    this.bloom = false;             // Bloom
    this.bloomStrength = 1.0;
    this.bloomRadius = 0.37;
    this.bloomThreshold = 0.98;

    this.fog = false;               // Fog
    this.fogDensity = 0.05;
    this.fogColor = '#b2b2b2';      // CSS style

    this.pbrMaterial = true;       // Physically based material

    // User camera frustum settings

    this.verticalFOV = 60.0;
    this.nearClippingDistance = 0.15;
    this.farClippingDistance = 100.0;
    this.showCameraHelper = false;
};



/*global $:false */
/*global angular*/

var guiEvents = new EventEmitter2({ verbose: true });

var emUnits = function(value)
    {
      return value*parseFloat($('#gz3d-body').css('font-size'));
    };

var isMobile = function()
{
    var agent = navigator.userAgent || navigator.vendor || window.opera;
    return (/ (android | bb\d+| meego).+mobile | avantgo | bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(agent) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(agent.substr(0, 4)));
};

var isTouchDevice = isMobile();

var isWideScreen = function()
    {
      return $(window).width() / emUnits(1) > 35;
    };
var isTallScreen = function()
    {
      return $(window).height() / emUnits(1) > 35;
    };
var lastOpenMenu = {mainMenu: 'mainMenu', insertMenu: 'insertMenu',
    treeMenu: 'treeMenu'};

var tabColors = {selected: 'rgb(34, 170, 221)', unselected: 'rgb(42, 42, 42)'};

$(function()
{
  //Initialize
  if ('ontouchstart' in window || 'onmsgesturechange' in window)
  {
    $('#gz3d-body').addClass('isTouchDevice');
  }

  // Toggle items
  $('#view-collisions').buttonMarkup({icon: 'false'});
  $('#snap-to-grid').buttonMarkup({icon: 'false'});
  $('#open-tree-when-selected').buttonMarkup({icon: 'false'});
  $('#view-transparent').buttonMarkup({icon: 'false'});
  $('#view-wireframe').buttonMarkup({icon: 'false'});
  $('#view-joints').buttonMarkup({icon: 'false'});
  guiEvents.emit('toggle_notifications');
  guiEvents.emit('show_orbit_indicator');

  $( '#clock-touch' ).popup('option', 'arrow', 't');
  $('#notification-popup-screen').remove();
  $('.tab').css('border-left-color', tabColors.unselected);

  if (isWideScreen())
  {
    guiEvents.emit('openTab', 'mainMenu', 'mainMenu');
  }

  if (isTallScreen())
  {
    $('.collapsible_header').click();
    $('#expand-MODELS').click();
    $('#expand-LIGHTS').click();
  }

  // Touch devices
  if (isTouchDevice)
  {
    $('.mouse-only')
        .css('display','none');

    $('#play-header-fieldset')
        .css('position', 'absolute')
        .css('right', '13.6em')
        .css('top', '0em')
        .css('z-index', '1000');

    $('#clock-header-fieldset')
        .css('position', 'absolute')
        .css('right', '10.2em')
        .css('top', '0em')
        .css('z-index', '1000');

    $('#mode-header-fieldset')
        .css('position', 'absolute')
        .css('right', '0.5em')
        .css('top', '0.15em')
        .css('z-index', '1000');

    $('.gzGUI').touchstart(function(event){
        guiEvents.emit('pointerOnMenu');
    });

    $('.gzGUI').touchend(function(event){
        guiEvents.emit('pointerOffMenu');
    });

    // long press on canvas
    var press_time_container = 400;
    $('#container')
      .on('touchstart', function (event) {
        $(this).data('checkdown', setTimeout(function () {
          guiEvents.emit('longpress_container_start',event);
        }, press_time_container));
      })
      .on('touchend', function (event) {
        clearTimeout($(this).data('checkdown'));
        guiEvents.emit('longpress_container_end',event,false);
      })
      .on('touchmove', function (event) {
        clearTimeout($(this).data('checkdown'));
        $(this).data('checkdown', setTimeout(function () {
          guiEvents.emit('longpress_container_start',event);
        }, press_time_container));
        guiEvents.emit('longpress_container_move',event);
      });

    // long press on insert menu item
    var press_time_insert = 400;
    $('[id^="insert-entity-"]')
      .on('touchstart', function (event) {
        var path = $(this).attr('id');
        path = path.substring(14); // after 'insert-entity-'
        $(this).data('checkdown', setTimeout(function () {
          guiEvents.emit('longpress_insert_start', event, path);
        }, press_time_insert));
      })
      .on('touchend', function (event) {
        clearTimeout($(this).data('checkdown'));
        guiEvents.emit('longpress_insert_end',event,false);
      })
      .on('touchmove', function (event) {
        clearTimeout($(this).data('checkdown'));
        guiEvents.emit('longpress_insert_move',event);
      });
  }
  // Mouse devices
  else
  {
    $('.touch-only')
        .css('display','none');

    $('[id^="insert-entity-"]')
      .click(function(event) {
        var path = $(this).attr('id');
        path = path.substring(14); // after 'insert-entity-'
        guiEvents.emit('spawn_entity_start', path);
      })
      .on('mousedown', function(event) {
        event.preventDefault();
      });

    $('#play-header-fieldset')
        .css('position', 'absolute')
        .css('right', '41.2em')
        .css('top', '0em')
        .css('z-index', '1000');

    $('#clock-mouse')
        .css('position', 'absolute')
        .css('right', '29.0em')
        .css('top', '0.5em')
        .css('z-index', '100')
        .css('width', '11em')
        .css('height', '2.5em')
        .css('background-color', '#333333')
        .css('padding', '3px')
        .css('border-radius', '5px');

    $('#mode-header-fieldset')
        .css('position', 'absolute')
        .css('right', '24.4em')
        .css('top', '0.15em')
        .css('z-index', '1000');

    $('#box-header-fieldset')
        .css('position', 'absolute')
        .css('right', '15.5em')
        .css('top', '0em')
        .css('z-index', '1000');

    $('#sphere-header-fieldset')
        .css('position', 'absolute')
        .css('right', '12.5em')
        .css('top', '0em')
        .css('z-index', '1000');

    $('#cylinder-header-fieldset')
        .css('position', 'absolute')
        .css('right', '9.5em')
        .css('top', '0em')
        .css('z-index', '1000');

    $('#pointlight-header-fieldset')
        .css('position', 'absolute')
        .css('right', '6.5em')
        .css('top', '0em')
        .css('z-index', '1000');

    $('#spotlight-header-fieldset')
        .css('position', 'absolute')
        .css('right', '3.5em')
        .css('top', '0em')
        .css('z-index', '1000');

    $('#directionallight-header-fieldset')
        .css('position', 'absolute')
        .css('right', '0.5em')
        .css('top', '0em')
        .css('z-index', '1000');

    $('.gzGUI').mouseenter(function(event){
        guiEvents.emit('pointerOnMenu');
    });

    $('.gzGUI').mouseleave(function(event){
        guiEvents.emit('pointerOffMenu');
    });

    // right-click
    $('#container').mousedown(function(event)
        {
          event.preventDefault();
          if(event.which === 3)
          {
            guiEvents.emit('right_click', event);
          }
        });

    $('#model-popup-screen').mousedown(function(event)
        {
          $('#model-popup').popup('close');
        });
  }

  $('.tab').click(function()
      {
        var idTab = $(this).attr('id');
        var idMenu = idTab.substring(0,idTab.indexOf('Tab'));

        if($('#'+idTab).css('border-left-color') === tabColors.unselected)
        {
          guiEvents.emit('openTab', lastOpenMenu[idMenu], idMenu);
        }
        else
        {
          guiEvents.emit('closeTabs', true);
        }
      });

  $('.closePanels').click(function()
      {
        guiEvents.emit('closeTabs', true);
      });

  $('#view-mode').click(function()
      {
        guiEvents.emit('manipulation_mode', 'view');
      });
  $('#translate-mode').click(function()
      {
        guiEvents.emit('manipulation_mode', 'translate');
      });
  $('#rotate-mode').click(function()
      {
        guiEvents.emit('manipulation_mode', 'rotate');
      });

  $('[id^="header-insert-"]').click(function()
      {
        var entity = $(this).attr('id');
        entity = entity.substring(14); // after 'header-insert-'
        guiEvents.emit('closeTabs', false);
        guiEvents.emit('spawn_entity_start', entity);
      });

  $('#play').click(function()
      {
        if ( $('#playText').html().indexOf('Play') !== -1 )
        {
          guiEvents.emit('pause', false);
          guiEvents.emit('notification_popup','Physics engine running');
        }
        else
        {
          guiEvents.emit('pause', true);
          guiEvents.emit('notification_popup','Physics engine paused');
        }
      });
  $('#clock').click(function()
      {
        if ($.mobile.activePage.find('#clock-touch').parent().
            hasClass('ui-popup-active'))
        {
          $( '#clock-touch' ).popup('close');
        }
        else
        {
          var position = $('#clock').offset();
          $('#notification-popup').popup('close');
          $('#clock-touch').popup('open', {
              x:position.left+emUnits(1.6),
              y:emUnits(4)});
        }
      });

  $('#reset-model').click(function()
      {
        guiEvents.emit('model_reset');
        guiEvents.emit('closeTabs', false);
      });
  $('#reset-world').click(function()
      {
        guiEvents.emit('world_reset');
        guiEvents.emit('closeTabs', false);
      });
  $('#reset-view').click(function()
      {
        guiEvents.emit('view_reset');
        guiEvents.emit('closeTabs', false);
      });
  $('#view-grid').click(function()
      {
        guiEvents.emit('show_grid', 'toggle');
        guiEvents.emit('closeTabs', false);
      });
  $('#view-collisions').click(function()
      {
        guiEvents.emit('show_collision');
        guiEvents.emit('closeTabs', false);
      });
  $('#view-orbit-indicator').click(function()
      {
        guiEvents.emit('show_orbit_indicator');
        guiEvents.emit('closeTabs', false);
      });
  $('#view-shadows').click(function()
      {
        guiEvents.emit('show_shadows', 'toggle');
      });
  $('#view-camera-sensors').click(function()
      {
        guiEvents.emit('show_camera_sensors', 'toggle');
      });
  $( '#snap-to-grid' ).click(function() {
    guiEvents.emit('snap_to_grid');
    guiEvents.emit('closeTabs', false);
  });
  $( '#open-tree-when-selected' ).click(function() {
    guiEvents.emit('openTreeWhenSelected');
    guiEvents.emit('closeTabs', false);
  });
  $( '#toggle-notifications' ).click(function() {
    guiEvents.emit('toggle_notifications');
    guiEvents.emit('closeTabs', false);
  });

  // Disable Esc key to close panel
    $('#gz3d-body').on('keyup', function(event) {
    if (event.which === 27)
    {
      return false;
    }
  });

  // Object menu
  $( '#view-transparent' ).click(function() {
    $('#model-popup').popup('close');
    guiEvents.emit('set_view_as','transparent');
  });

  $( '#view-wireframe' ).click(function() {
    $('#model-popup').popup('close');
    guiEvents.emit('set_view_as','wireframe');
  });

  $( '#view-joints' ).click(function() {
    if ($('#view-joints a').css('color') === 'rgb(255, 255, 255)')
    {
      $('#model-popup').popup('close');
      guiEvents.emit('view_joints');
    }
  });

  $( '#delete-entity' ).click(function() {
    guiEvents.emit('delete_entity');
  });

  $(window).resize(function()
  {
    guiEvents.emit('resizePanel');
  });
});

function getNameFromPath(path)
{
  if(path === 'box')
  {
    return 'Box';
  }
  if(path === 'sphere')
  {
    return 'Sphere';
  }
  if(path === 'cylinder')
  {
    return 'Cylinder';
  }
  if(path === 'pointlight')
  {
    return 'Point Light';
  }
  if(path === 'spotlight')
  {
    return 'Spot Light';
  }
  if(path === 'directionallight')
  {
    return 'Directional Light';
  }

  if (GZ3D.modelList)
  {
    for(var i = 0; i < GZ3D.modelList.length; ++i)
    {
      for(var j = 0; j < GZ3D.modelList[i].models.length; ++j)
      {
        if(GZ3D.modelList[i].models[j].modelPath === path)
        {
          return GZ3D.modelList[i].models[j].modelTitle;
        }
      }
    }
  }
}

// World tree
var gzangular = angular.module('gzangular',[]);
// add ng-right-click
gzangular.directive('ngRightClick', function($parse)
{
  return function(scope, element, attrs)
      {
        var fn = $parse(attrs.ngRightClick);
        element.bind('contextmenu', function(event)
            {
              scope.$apply(function()
                  {
                    event.preventDefault();
                    fn(scope, {$event:event});
                  });
            });
      };
});

gzangular.controller('treeControl', ['$scope', function($scope)
{
  $scope.updateStats = function()
  {
    $scope.models = modelStats;
    $scope.lights = lightStats;
    $scope.scene = sceneStats;
    $scope.physics = physicsStats;
    if (!$scope.$$phase)
    {
      $scope.$apply();
    }
  };

  $scope.selectEntity = function (name)
  {
    $('#model-popup').popup('close');
    guiEvents.emit('openTab', 'propertyPanel-'+name, 'treeMenu');
    guiEvents.emit('selectEntity', name);
  };

  $scope.openEntityMenu = function (event, name)
  {
    $('#model-popup').popup('close');
    guiEvents.emit('openEntityPopup', event, name);
  };

  $scope.openTab = function (tab)
  {
    guiEvents.emit('openTab', tab, 'treeMenu');
  };

  $scope.expandTree = function (tree)
  {
    var idContent = 'expandable-' + tree;
    var idHeader = 'expand-' + tree;

    if ($('#' + idContent).is(':visible'))
    {
      $('#' + idContent).hide();
      $('#' + idHeader+' img').css('transform','rotate(0deg)')
                              .css('-webkit-transform','rotate(0deg)')
                              .css('-ms-transform','rotate(0deg)');
    }
    else
    {
      $('#' + idContent).show();
      $('#' + idHeader+' img').css('transform','rotate(90deg)')
                              .css('-webkit-transform','rotate(90deg)')
                              .css('-ms-transform','rotate(90deg)');
    }
  };

  $scope.expandProperty = function (prop, modelName, subPropShortName, subPropName, parentProp)
  {
    var idContent = 'expandable-' + prop + '-' + modelName;
    var idHeader = 'expand-' + prop + '-' + modelName;

    var idContentOthers, idHeaderOthers;

    if (subPropShortName)
    {
      idContentOthers = idContent;
      idHeaderOthers = idHeader;
      idContent = idContent + '-' + subPropShortName;
      idHeader = idHeader + '-' + subPropShortName;
    }

    if ($('#' + idContent).is(':visible'))
    {
      $('#' + idContent).hide();
      $('#' + idHeader+' img').css('transform','rotate(0deg)')
                              .css('-webkit-transform','rotate(0deg)')
                              .css('-ms-transform','rotate(0deg)');
    }
    else
    {
      if (subPropShortName && (prop === 'link' || prop === 'joint'))
      {
        $('[id^="' + idContentOthers + '-"]').hide();
        $('[id^="' + idHeaderOthers + '-"] img')
            .css('transform','rotate(0deg)')
            .css('-webkit-transform','rotate(0deg)')
            .css('-ms-transform','rotate(0deg)');
      }

      $('#' + idContent).show();
      $('#' + idHeader+' img').css('transform','rotate(90deg)')
                              .css('-webkit-transform','rotate(90deg)')
                              .css('-ms-transform','rotate(90deg)');

      if (prop === 'pose' && parentProp === 'link')
      {
        guiEvents.emit('setPoseStats', modelName, subPropName);
      }
    }
  };

  $scope.changePose = function(prop1, prop2, name, value)
  {
    guiEvents.emit('setPose', prop1, prop2, name, value);
  };

  $scope.changeLight = function(prop, name, value)
  {
    guiEvents.emit('setLight', prop, name, value);
  };

  $scope.toggleProperty = function(prop, entity, subEntity)
  {
    // only for links so far
    guiEvents.emit('toggleProperty', prop, entity, subEntity);
  };
}]);

// Insert menu
gzangular.controller('insertControl', ['$scope', '$http', function ($scope, $http)
{
  $scope.spawnEntity = function(path)
  {
    guiEvents.emit('spawn_entity_start', path);
  };

  $scope.openTab = function (tab)
  {
    guiEvents.emit('openTab', tab, 'insertMenu');
  };

}]);


/**
 * Graphical user interface
 * @constructor
 * @param {GZ3D.Scene} scene - A scene to connect to
 */
GZ3D.Gui = function(scene)
{
  this.scene = scene;
  this.domElement = scene.getDomElement();
  this.init();
  this.emitter = new EventEmitter2({verbose: true});
  this.guiEvents = guiEvents;
};

/**
 * Initialize GUI
 */
GZ3D.Gui.prototype.init = function()
{
  this.spawnState = null;
  this.longPressContainerState = null;
  this.showNotifications = false;
  this.openTreeWhenSelected = false;

  var that = this;

  // On guiEvents, emitter events
  guiEvents.on('manipulation_mode',
      function(mode)
      {
        that.scene.setManipulationMode(mode);
        var space = that.scene.modelManipulator.space;

        if (mode === 'view')
        {
          guiEvents.emit('notification_popup', 'View mode');
        }
        else
        {
          guiEvents.emit('notification_popup',
              mode.charAt(0).toUpperCase()+
              mode.substring(1)+' mode in '+
              space.charAt(0).toUpperCase()+
              space.substring(1)+' space');
        }
      }
  );

  // Create temp model
  guiEvents.on('spawn_entity_start', function(entity)
      {
        // manually trigger view mode
        that.scene.setManipulationMode('view');
        $('#view-mode').prop('checked', true);
        $('input[type="radio"]').checkboxradio('refresh');

        var name = getNameFromPath(entity);

        that.spawnState = 'START';
        that.scene.spawnModel.start(entity,function(obj)
            {
              that.emitter.emit('entityCreated', obj, entity);
            });
        guiEvents.emit('notification_popup',
            'Place '+name+' at the desired position');
      }
  );

  // Move temp model by touch
  guiEvents.on('spawn_entity_move', function(event)
      {
        that.spawnState = 'MOVE';
        that.scene.spawnModel.onTouchMove(event,false);
      }
  );
  // Place temp model by touch
  guiEvents.on('spawn_entity_end', function()
      {
        if (that.spawnState === 'MOVE')
        {
          that.scene.spawnModel.onTouchEnd();
        }
        that.spawnState = null;
      }
  );

  guiEvents.on('world_reset', function()
      {
        that.emitter.emit('reset', 'world');
        guiEvents.emit('notification_popup','Reset world');
      }
  );

  guiEvents.on('model_reset', function()
      {
        that.emitter.emit('reset', 'model');
        guiEvents.emit('notification_popup','Reset model poses');
      }
  );

  guiEvents.on('view_reset', function()
      {
        that.scene.resetView();
        guiEvents.emit('notification_popup','Reset view');
      }
  );

  guiEvents.on('show_shadows', function(option)
      {
          if (option === 'show')
          {
              //that.emitter.emit('setShadows', true);
              that.scene.setShadowMaps(true);
          }
          else if (option === 'hide')
          {
              //that.emitter.emit('setShadows', false);
              that.scene.setShadowMaps(false);
          }
          else if (option === 'toggle')
          {
              var shadowsEnabled = that.scene.renderer.shadowMap.enabled;
              //that.emitter.emit('setShadows', !shadowsEnabled);
              that.scene.setShadowMaps(!shadowsEnabled);
          }

          if(!that.scene.renderer.shadowMap.enabled)
          {
              $('#view-shadows').buttonMarkup({icon: 'false'});
              guiEvents.emit('notification_popup','Disabling shadows');
          }
          else
          {
              $('#view-shadows').buttonMarkup({icon: 'check'});
              guiEvents.emit('notification_popup','Enabling shadows');
          }
      }
  );

    guiEvents.on('show_camera_sensors', function(option)
        {
            var camerasShown = false;
            if (option === 'show')
            {
                that.scene.viewManager.showCameras(true);
            }
            else if (option === 'hide')
            {
                that.scene.viewManager.showCameras(false);
            }
            else if (option === 'toggle')
            {
                if (that.scene.viewManager.views.length > 1) {
                    camerasShown = that.scene.viewManager.views[1].active;
                    that.scene.viewManager.showCameras(!camerasShown);
                }
            }

            if (that.scene.viewManager.views.length > 1) {
                camerasShown = that.scene.viewManager.views[1].active;
            }
            if(!camerasShown)
            {
                $('#view-camera-sensors').buttonMarkup({icon: 'false'});
                guiEvents.emit('notification_popup','Disabling camera views');
            }
            else
            {
                $('#view-camera-sensors').buttonMarkup({icon: 'check'});
                guiEvents.emit('notification_popup','Enabling camera views');
            }
        }
    );

  guiEvents.on('pause', function(paused)
      {
        that.emitter.emit('pause', paused);
      }
  );

  guiEvents.on('show_collision', function()
      {
        that.scene.showCollision(!that.scene.showCollisions);
        if(!that.scene.showCollisions)
        {
          $('#view-collisions').buttonMarkup({icon: 'false'});
          guiEvents.emit('notification_popup','Hiding collisions');
        }
        else
        {
          $('#view-collisions').buttonMarkup({icon: 'check'});
          guiEvents.emit('notification_popup','Viewing collisions');
        }
      }
  );

  guiEvents.on('show_grid', function(option)
      {
        if (option === 'show')
        {
          that.scene.grid.visible = true;
        }
        else if (option === 'hide')
        {
          that.scene.grid.visible = false;
        }
        else if (option === 'toggle')
        {
          that.scene.grid.visible = !that.scene.grid.visible;
        }

        if(!that.scene.grid.visible)
        {
          $('#view-grid').buttonMarkup({icon: 'false'});
          guiEvents.emit('notification_popup','Hiding grid');
        }
        else
        {
          $('#view-grid').buttonMarkup({icon: 'check'});
          guiEvents.emit('notification_popup','Viewing grid');
        }
      }
  );

   guiEvents.on('show_orbit_indicator', function()
      {

      }
  );

  guiEvents.on('snap_to_grid',
      function ()
      {
        if(that.scene.modelManipulator.snapDist === null)
        {
          $('#snap-to-grid').buttonMarkup({icon: 'check'});
          that.scene.modelManipulator.snapDist = 0.5;
          that.scene.spawnModel.snapDist = that.scene.modelManipulator.snapDist;
          guiEvents.emit('notification_popup','Snapping to grid');
        }
        else
        {
          $('#snap-to-grid').buttonMarkup({icon: 'false'});
          that.scene.modelManipulator.snapDist = null;
          that.scene.spawnModel.snapDist = null;
          guiEvents.emit('notification_popup','Not snapping to grid');
        }
      }
  );

  guiEvents.on('openTreeWhenSelected', function ()
      {
        this.openTreeWhenSelected = !this.openTreeWhenSelected;
        if(!this.openTreeWhenSelected)
        {
          $('#open-tree-when-selected').buttonMarkup({icon: 'false'});
        }
        else
        {
          $('#open-tree-when-selected').buttonMarkup({icon: 'check'});
        }
      }
  );

  guiEvents.on('toggle_notifications', function ()
      {
        this.showNotifications = !this.showNotifications;
        if(!this.showNotifications)
        {
          $('#toggle-notifications').buttonMarkup({icon: 'false'});
        }
        else
        {
          $('#toggle-notifications').buttonMarkup({icon: 'check'});
        }
      }
  );


  guiEvents.on('longpress_container_start',
      function (event)
      {
        if (event.originalEvent.touches.length !== 1 ||
            that.scene.modelManipulator.hovered ||
            that.scene.spawnModel.active)
        {
          guiEvents.emit('longpress_container_end', event.originalEvent,true);
        }
        else
        {
          that.scene.showRadialMenu(event);
          that.longPressContainerState = 'START';
        }
      }
  );

  guiEvents.on('longpress_container_end', function(event,cancel)
      {
        if (that.longPressContainerState !== 'START')
        {
          that.longPressContainerState = 'END';
          return;
        }
        that.longPressContainerState = 'END';
        if (that.scene.radialMenu.showing)
        {
          if (cancel)
          {
            that.scene.radialMenu.hide(event);
          }
          else
          {
          that.scene.radialMenu.hide(event, function(type,entity)
              {
                if (type === 'delete')
                {
                  that.emitter.emit('deleteEntity',entity);
                  that.scene.setManipulationMode('view');
                  $( '#view-mode' ).prop('checked', true);
                  $('input[type="radio"]').checkboxradio('refresh');
                }
                else if (type === 'translate')
                {
                  $('#translate-mode').click();
                  $('input[type="radio"]').checkboxradio('refresh');
                  that.scene.attachManipulator(entity,type);
                }
                else if (type === 'rotate')
                {
                  $( '#rotate-mode' ).click();
                  $('input[type="radio"]').checkboxradio('refresh');
                  that.scene.attachManipulator(entity,type);
                }
                else if (type === 'transparent')
                {
                  guiEvents.emit('set_view_as','transparent');
                }
                else if (type === 'wireframe')
                {
                  guiEvents.emit('set_view_as','wireframe');
                }
                else if (type === 'joints')
                {
                  that.scene.selectEntity(entity);
                  guiEvents.emit('view_joints');
                }

              });
          }
        }
      }
  );

  guiEvents.on('longpress_container_move', function(event)
      {
        if (event.originalEvent.touches.length !== 1)
        {
          guiEvents.emit('longpress_container_end',event.originalEvent,true);
        }
        else
        {
          if (that.longPressContainerState !== 'START')
          {
            return;
          }
          if (that.scene.radialMenu.showing)
          {
            that.scene.radialMenu.onLongPressMove(event);
          }
        }
      }
  );

  guiEvents.on('longpress_insert_start', function (event, path)
      {
        navigator.vibrate(50);
        guiEvents.emit('spawn_entity_start', path);
        event.stopPropagation();
      }
  );

  guiEvents.on('longpress_insert_end', function(event)
      {
        guiEvents.emit('spawn_entity_end');
      }
  );

  guiEvents.on('longpress_insert_move', function(event)
      {
        guiEvents.emit('spawn_entity_move', event);
        event.stopPropagation();
      }
  );

  var notificationTimeout;
  guiEvents.on('notification_popup',
      function (notification, duration)
      {
        if (this.showNotifications)
        {
          clearTimeout(notificationTimeout);
          $( '#notification-popup' ).popup('close');
          $( '#notification-popup' ).html('&nbsp;'+notification+'&nbsp;');
          $( '#notification-popup' ).popup('open', {
              y:window.innerHeight-50});

          if (duration === undefined)
          {
            duration = 2000;
          }
          notificationTimeout = setTimeout(function()
          {
            $( '#notification-popup' ).popup('close');
          }, duration);
        }
      }
  );

  guiEvents.on('right_click', function (event)
      {
        that.scene.onRightClick(event, function(entity)
            {
              that.openEntityPopup(event, entity);
            });
      }
  );

  guiEvents.on('set_view_as', function (viewAs)
      {
        that.scene.setViewAs(that.scene.selectedEntity, viewAs);
      }
  );

  guiEvents.on('view_joints', function ()
      {
        that.scene.viewJoints(that.scene.selectedEntity);
      }
  );



  guiEvents.on('lookat_entity', function ()
    {
        that.scene.controls.setLookatTarget(that.scene.selectedEntity);
    }
  );

  guiEvents.on('delete_entity', function ()
      {
        that.emitter.emit('deleteEntity',that.scene.selectedEntity);
        $('#model-popup').popup('close');
        that.scene.selectEntity(null);
        that.scene.manipulationMode = 'view';
      }
  );

  guiEvents.on('duplicate_entity', function ()
      {
        var modelEntity = that.scene.selectedEntity;
        if (that.scene.selectedEntity)
        {
          var entity = GZ3D.Gui.findBaseModelName(modelEntity.name);
          if (entity)
          {
            // manually trigger view mode
            that.scene.setManipulationMode('view');
            $('#view-mode').prop('checked', true);
            $('input[type="radio"]').checkboxradio('refresh');

            var name = getNameFromPath(entity);

            that.spawnState = 'START';
            that.scene.spawnModel.start(entity, function (obj)
            {
              that.emitter.emit('entityCreated', obj, entity);
            },modelEntity.position,modelEntity.quaternion,modelEntity.scale);

            guiEvents.emit('notification_popup',
              'Place ' + name + ' at the desired position');

          }
        }
      }
  );

  guiEvents.on('pointerOnMenu', function ()
      {
        that.scene.pointerOnMenu = true;
      }
  );

  guiEvents.on('pointerOffMenu', function ()
      {
        that.scene.pointerOnMenu = false;
      }
  );

  guiEvents.on('openTab', function (id, parentId)
      {
        lastOpenMenu[parentId] = id;

        $('.leftPanels').hide();
        //$('#'+id).show(); //defaults as flex, but block is needed
        $('#'+id).css('display','block');

        $('.tab').css('border-left-color', tabColors.unselected);
        $('#'+parentId+'Tab').css('border-left-color', tabColors.selected);

        if (id.indexOf('propertyPanel-') >= 0)
        {
          var entityName = id.substring(id.indexOf('-')+1);
          var object = that.scene.getByName(entityName);

          var stats = {};
          stats.name = entityName;

          stats.pose = {};
          stats.pose.position = {x: object.position.x,
                                 y: object.position.y,
                                 z: object.position.z};

          stats.pose.orientation = {x: object.quaternion._x,
                                    y: object.quaternion._y,
                                    z: object.quaternion._z,
                                    w: object.quaternion._w};
        }

        guiEvents.emit('resizePanel');
      }
  );

  guiEvents.on('closeTabs', function (force)
      {
        // Close for narrow viewports, force to always close
        if (force || !isWideScreen())
        {
          $('.leftPanels').hide();
          $('.tab').css('left', '0em');
          $('.tab').css('border-left-color', tabColors.unselected);
        }
      }
  );

  guiEvents.on('setTreeSelected', function (object)
      {
        for (var i = 0; i < modelStats.length; ++i)
        {
          if (modelStats[i].name === object)
          {
            modelStats[i].selected = 'selectedTreeItem';
            if (this.openTreeWhenSelected)
            {
              guiEvents.emit('openTab', 'propertyPanel-'+object, 'treeMenu');
            }
          }
          else
          {
            modelStats[i].selected = 'unselectedTreeItem';
          }
        }
        for (i = 0; i < lightStats.length; ++i)
        {
          if (lightStats[i].name === object)
          {
            lightStats[i].selected = 'selectedTreeItem';
            if (this.openTreeWhenSelected)
            {
              guiEvents.emit('openTab', 'propertyPanel-'+object, 'treeMenu');
            }
          }
          else
          {
            lightStats[i].selected = 'unselectedTreeItem';
          }
        }
        that.updateStats();
      }
  );

  guiEvents.on('setTreeDeselected', function ()
      {
        for (var i = 0; i < modelStats.length; ++i)
        {
          modelStats[i].selected = 'unselectedTreeItem';
        }
        for (i = 0; i < lightStats.length; ++i)
        {
          lightStats[i].selected = 'unselectedTreeItem';
        }
        that.updateStats();
      }
  );

  guiEvents.on('selectEntity', function (name)
      {
        var object = that.scene.getByName(name);
        that.scene.selectEntity(object);
      }
  );

  guiEvents.on('openEntityPopup', function (event, name)
      {
        if (!isTouchDevice)
        {
          var object = that.scene.getByName(name);
          that.openEntityPopup(event, object);
        }
      }
  );

  guiEvents.on('setPoseStats', function (modelName, linkName)
      {
        var object;
        if (linkName === undefined)
        {
          object = that.scene.getByName(modelName);
        }
        else
        {
          object = that.scene.getByName(linkName);
        }

        var stats = {};
        stats.name = object.name;
        stats.pose = {};
        stats.pose.position = {x: object.position.x,
                               y: object.position.y,
                               z: object.position.z};
        stats.pose.orientation = {x: object.quaternion._x,
                                  y: object.quaternion._y,
                                  z: object.quaternion._z,
                                  w: object.quaternion._w};

        if (object.children[0] instanceof THREE.Light)
        {
          that.setLightStats(stats, 'update');
        }
        else
        {
          that.setModelStats(stats, 'update');
        }
      }
  );

  guiEvents.on('resizePanel', function ()
      {
        if ($('.leftPanels').is(':visible'))
        {
          if (isWideScreen())
          {
            $('.tab').css('left', '23em');
          }
          else
          {
            $('.tab').css('left', '10.5em');
          }
        }

        if ($('.propertyPanels').is(':visible'))
        {
          var maxWidth = $(window).width();
          if (isWideScreen())
          {
            maxWidth = emUnits(23);
          }

          $('.propertyPanels').css('width', maxWidth);
        }
      }
  );

  guiEvents.on('setPose', function (prop1, prop2, name, value)
      {
        if (value === undefined)
        {
          return;
        }

        var entity = that.scene.getByName(name);
        if (prop1 === 'orientation')
        {
          entity['rotation']['_'+prop2] = value;
          entity['quaternion'].setFromEuler(entity['rotation']);
        }
        else
        {
          entity[prop1][prop2] = value;
        }
        entity.updateMatrixWorld();

        if (entity.children[0] &&
           (entity.children[0] instanceof THREE.SpotLight ||
            entity.children[0] instanceof THREE.DirectionalLight))
        {
          var lightObj = entity.children[0];
          var dir = new THREE.Vector3(0,0,0);
          dir.copy(entity.direction);
          entity.localToWorld(dir);
          lightObj.target.position.copy(dir);
        }

        that.scene.emitter.emit('entityChanged', entity);
      }
  );

  guiEvents.on('setLight', function (prop, name, value)
      {
        if (value === undefined)
        {
          return;
        }

        var entity = that.scene.getByName(name);
        var lightObj = entity.children[0];
        if (prop === 'diffuse')
        {
          lightObj.color = new THREE.Color(value);
        }
        else if (prop === 'specular')
        {
          entity.serverProperties.specular = new THREE.Color(value);
        }
        else if (prop === 'range')
        {
          lightObj.distance = value;
        }
        else if (prop === 'attenuation_constant')
        {
          entity.serverProperties.attenuation_constant = value;
        }
        else if (prop === 'attenuation_linear')
        {
          entity.serverProperties.attenuation_linear = value;
          lightObj.intensity = lightObj.intensity/(1+value);
        }
        else if (prop === 'attenuation_quadratic')
        {
          entity.serverProperties.attenuation_quadratic = value;
          lightObj.intensity = lightObj.intensity/(1+value);
        }

        // updating color too often, maybe only update when popup is closed
        that.scene.emitter.emit('entityChanged', entity);
      }
  );

  guiEvents.on('toggleProperty', function (prop, subEntityName)
      {
        var entity = that.scene.getByName(subEntityName);
        entity.serverProperties[prop] = !entity.serverProperties[prop];

        that.scene.emitter.emit('linkChanged', entity);
      }
  );
};

/**
 * Play/pause simulation
 * @param {boolean} paused
 */
GZ3D.Gui.prototype.setPaused = function(paused)
{
  if (paused)
  {
    $('#playText').html(
        '<img style="height:1.2em" src="style/images/play.png" title="Play">');
  }
  else
  {
    $('#playText').html(
        '<img style="height:1.2em" src="style/images/pause.png" title="Pause">'
        );
  }
};

/**
 * Update displayed real time
 * @param {string} realTime
 */
GZ3D.Gui.prototype.setRealTime = function(realTime)
{
  $('.real-time-value').text(realTime);
};

/**
 * Update displayed simulation time
 * @param {string} simTime
 */
GZ3D.Gui.prototype.setSimTime = function(simTime)
{
  $('.sim-time-value').text(simTime);
};

var sceneStats = {};
/**
 * Update scene stats on scene tree
 * @param {} stats
 */
GZ3D.Gui.prototype.setSceneStats = function(stats)
{
  sceneStats['ambient'] = this.round(stats.ambient, true);
  sceneStats['background'] = this.round(stats.background, true);
};

var physicsStats = {};
/**
 * Update physics stats on scene tree
 * @param {} stats
 */
GZ3D.Gui.prototype.setPhysicsStats = function(stats)
{
  physicsStats = stats;
  physicsStats['enable_physics'] = this.trueOrFalse(
      physicsStats['enable_physics']);
  physicsStats['max_step_size'] = this.round(
      physicsStats['max_step_size'], false, 3);
  physicsStats['gravity'] = this.round(
      physicsStats['gravity'], false, 3);
  physicsStats['sor'] = this.round(
      physicsStats['sor'], false, 3);
  physicsStats['cfm'] = this.round(
      physicsStats['cfm'], false, 3);
  physicsStats['erp'] = this.round(
      physicsStats['erp'], false, 3);
  physicsStats['contact_max_correcting_vel'] = this.round(
      physicsStats['contact_max_correcting_vel'], false, 3);
  physicsStats['contact_surface_layer'] = this.round(
      physicsStats['contact_surface_layer'], false, 3);

  this.updateStats();
};

var modelStats = [];
/**
 * Update model stats on property panel
 * @param {} stats
 * @param {} action: 'update' / 'delete'
 */
GZ3D.Gui.prototype.setModelStats = function(stats, action)
{
  var modelName = stats.name;
  var linkShortName;

  // if it's a link
  if (stats.name.indexOf('::') >= 0)
  {
    modelName = stats.name.substring(0, stats.name.indexOf('::'));
    linkShortName = stats.name.substring(stats.name.lastIndexOf('::')+2);
  }

  if (action === 'update')
  {
    var model = $.grep(modelStats, function(e)
        {
          return e.name === modelName;
        });

    var formatted;

    // New model
    if (model.length === 0)
    {
      var thumbnail = this.findModelThumbnail(modelName);

      formatted = this.formatStats(stats);

      modelStats.push(
          {
            name: modelName,
            thumbnail: thumbnail,
            selected: 'unselectedTreeItem',
            is_static: this.trueOrFalse(stats.is_static),
            position: formatted.pose.position,
            orientation: formatted.pose.orientation,
            links: [],
            joints: []
          });

      var newModel = modelStats[modelStats.length-1];

      // links
      for (var l = 0; l < stats.link.length; ++l)
      {
        var shortName = stats.link[l].name.substring(
            stats.link[l].name.lastIndexOf('::')+2);

        formatted = this.formatStats(stats.link[l]);

        newModel.links.push(
            {
              name: stats.link[l].name,
              shortName: shortName,
              self_collide: this.trueOrFalse(stats.link[l].self_collide),
              gravity: this.trueOrFalse(stats.link[l].gravity),
              kinematic: this.trueOrFalse(stats.link[l].kinematic),
              canonical: this.trueOrFalse(stats.link[l].canonical),
              position: formatted.pose.position,
              orientation: formatted.pose.orientation,
              inertial: formatted.inertial
            });
      }

      // joints
      for (var j = 0; j < stats.joint.length; ++j)
      {
        var jointShortName = stats.joint[j].name.substring(
            stats.joint[j].name.lastIndexOf('::')+2);
        var parentShortName = stats.joint[j].parent.substring(
            stats.joint[j].parent.lastIndexOf('::')+2);
        var childShortName = stats.joint[j].child.substring(
            stats.joint[j].child.lastIndexOf('::')+2);

        var type;
        switch (stats.joint[j].type)
        {
          case 1:
              type = 'Revolute';
              break;
          case 2:
              type = 'Revolute2';
              break;
          case 3:
              type = 'Prismatic';
              break;
          case 4:
              type = 'Universal';
              break;
          case 5:
              type = 'Ball';
              break;
          case 6:
              type = 'Screw';
              break;
          case 7:
              type = 'Gearbox';
              break;
          default:
              type = 'Unknown';
        }

        formatted = this.formatStats(stats.joint[j]);

        newModel.joints.push(
            {
              name: stats.joint[j].name,
              shortName: jointShortName,
              type: type,
              parent: stats.joint[j].parent,
              parentShortName: parentShortName,
              child: stats.joint[j].child,
              childShortName: childShortName,
              position: formatted.pose.position,
              orientation: formatted.pose.orientation,
              axis1: formatted.axis1,
              axis2: formatted.axis2
            });
      }
    }
    // Update existing model
    else
    {
      var link;

      if (stats.link && stats.link[0])
      {
        var LinkShortName = stats.link[0].name;

        link = $.grep(model[0].links, function(e)
            {
              return e.shortName === LinkShortName;
            });

        if (link[0])
        {
          if (link[0].self_collide)
          {
            link[0].self_collide = this.trueOrFalse(stats.link[0].self_collide);
          }
          if (link[0].gravity)
          {
            link[0].gravity = this.trueOrFalse(stats.link[0].gravity);
          }
          if (link[0].kinematic)
          {
            link[0].kinematic = this.trueOrFalse(stats.link[0].kinematic);
          }
        }
      }

      // Update pose stats only if they're being displayed and are not focused
      if (!((linkShortName &&
          !$('#expandable-pose-'+modelName+'-'+linkShortName).is(':visible'))||
          (!linkShortName &&
          !$('#expandable-pose-'+modelName).is(':visible'))||
          $('#expandable-pose-'+modelName+' input').is(':focus')))
      {

        if (stats.position)
        {
          stats.pose = {};
          stats.pose.position = stats.position;
          stats.pose.orientation = stats.orientation;
        }

        if (stats.pose)
        {
          formatted = this.formatStats(stats);

          if (linkShortName === undefined)
          {
            model[0].position = formatted.pose.position;
            model[0].orientation = formatted.pose.orientation;
          }
          else
          {
            link = $.grep(model[0].links, function(e)
              {
                return e.shortName === linkShortName;
              });

            link[0].position = formatted.pose.position;
            link[0].orientation = formatted.pose.orientation;
          }
        }
      }
    }
  }
  else if (action === 'delete')
  {
    this.deleteFromStats('model', modelName);
  }

  this.updateStats();
};

var lightStats = [];
/**
 * Update light stats on property panel
 * @param {} stats
 * @param {} action: 'update' / 'delete'
 */
GZ3D.Gui.prototype.setLightStats = function(stats, action)
{
  var name = stats.name;

  if (action === 'update')
  {
    var light = $.grep(lightStats, function(e)
        {
          return e.name === name;
        });

    var formatted;

    // New light
    if (light.length === 0)
    {
      var type = stats.type;

      var thumbnail;
      switch(type)
      {
        case GZ3D.LIGHT_SPOT:
            thumbnail = 'style/images/spotlight.png';
            break;
        case GZ3D.LIGHT_DIRECTIONAL:
            thumbnail = 'style/images/directionallight.png';
            break;
        default:
            thumbnail = 'style/images/pointlight.png';
      }

      stats.attenuation = {constant: stats.attenuation_constant,
                           linear: stats.attenuation_linear,
                           quadratic: stats.attenuation_quadratic};

      formatted = this.formatStats(stats);

      var direction;
      if (stats.direction)
      {
        direction = stats.direction;
      }

      lightStats.push(
          {
            name: name,
            thumbnail: thumbnail,
            selected: 'unselectedTreeItem',
            position: formatted.pose.position,
            orientation: formatted.pose.orientation,
            diffuse: formatted.diffuse,
            specular: formatted.specular,
            color: formatted.color,
            range: stats.range,
            attenuation: this.round(stats.attenuation, false, null),
            direction: direction
          });
    }
    else
    {
      formatted = this.formatStats(stats);

      if (stats.pose)
      {
        light[0].position = formatted.pose.position;
        light[0].orientation = formatted.pose.orientation;
      }

      if (stats.diffuse)
      {
        light[0].diffuse = formatted.diffuse;
      }

      if (stats.specular)
      {
        light[0].specular = formatted.specular;
      }
    }
  }
  else if (action === 'delete')
  {
    this.deleteFromStats('light', name);
  }

  this.updateStats();
};


/**
 * Can model be duplicated ?
 * @param {} instanceName
 * @returns string
 */
GZ3D.Gui.findBaseModelName = function (modelName)
{
  var basicObjects = ['box', 'sphere', 'cylinder', 'pointlight', 'pointlight', 'spotlight', 'directionallight'];
  var i, j, k;

  for (k = 0; k < 2; k++)
  {
    if (k > 0)
    {
      var idx = modelName.lastIndexOf('_');
      if (idx > 0)
      {
        modelName = modelName.substring(0, idx);
      }
    }

    if (GZ3D.modelList)
    {
      for (i = 0; i < GZ3D.modelList.length; ++i)
      {
        for (j = 0; j < GZ3D.modelList[i].models.length; ++j)
        {
          if (modelName === GZ3D.modelList[i].models[j].modelPath)
          {
            return modelName;
          }
        }
      }
    }

    for (j = 0; j < basicObjects.length; ++j)
    {
      if (modelName === basicObjects[j])
      {
        return modelName;
      }
    }

  }

  return undefined;
};

/**
 * Can model be duplicated ?
 * @param {} instanceName
 * @returns string
 */
GZ3D.Gui.prototype.canModelBeDuplicated = function(modelName)
{
  if (this.scene.spawnModel.active)
  {
    return false;
  }

  return GZ3D.Gui.findBaseModelName(modelName)!==undefined;
};


/**
 * Find thumbnail
 * @param {} instanceName
 * @returns string
 */
GZ3D.Gui.prototype.findModelThumbnail = function(instanceName)
{
  if (GZ3D.modelList)
  {
    for(var i = 0; i < GZ3D.modelList.length; ++i)
    {
      for(var j = 0; j < GZ3D.modelList[i].models.length; ++j)
      {
        var path = GZ3D.modelList[i].models[j].modelPath;
        if(instanceName.indexOf(path) >= 0)
        {
          return '/assets/'+path+'/thumbnails/0.png';
        }
      }
    }
  }

  if(instanceName.indexOf('box') >= 0)
  {
    return 'style/images/box.png';
  }
  if(instanceName.indexOf('sphere') >= 0)
  {
    return 'style/images/sphere.png';
  }
  if(instanceName.indexOf('cylinder') >= 0)
  {
    return 'style/images/cylinder.png';
  }
  return 'style/images/box.png';
};

/**
 * Update model stats
 */
GZ3D.Gui.prototype.updateStats = function()
{
  var tree = angular.element($('#treeMenu')).scope();
  if (typeof(tree) !== 'undefined' && typeof tree.updateStats !== 'undefined')
  {
    tree.updateStats();
  }
};

/**
 * Open entity (model/light) context menu
 * @param {} event
 * @param {THREE.Object3D} entity
 */
GZ3D.Gui.prototype.openEntityPopup = function(event, entity)
{
  this.scene.selectEntity(entity);
  $('.ui-popup').popup('close');

  if (entity.children[0] instanceof THREE.Light)
  {
    $('#view-transparent').css('visibility','collapse');
    $('#view-wireframe').css('visibility','collapse');
    $('#view-joints').css('visibility','collapse');
    $('#model-popup').popup('open',
      {x: event.clientX + emUnits(6),
       y: event.clientY + emUnits(-8)});
  }
  else
  {
    if (this.scene.selectedEntity.viewAs === 'transparent')
    {
      $('#view-transparent').buttonMarkup({icon: 'check'});
    }
    else
    {
      $('#view-transparent').buttonMarkup({icon: 'false'});
    }

    if (this.scene.selectedEntity.viewAs === 'wireframe')
    {
      $('#view-wireframe').buttonMarkup({icon: 'check'});
    }
    else
    {
      $('#view-wireframe').buttonMarkup({icon: 'false'});
    }

    if (entity.joint === undefined || entity.joint.length === 0)
    {
      $('#view-joints a').css('color', '#888888');
      $('#view-joints').buttonMarkup({icon: 'false'});
    }
    else
    {
      $('#view-joints a').css('color', '#ffffff');
      if (entity.getObjectByName('JOINT_VISUAL', true))
      {
        $('#view-joints').buttonMarkup({icon: 'check'});
      }
      else
      {
        $('#view-joints').buttonMarkup({icon: 'false'});
      }
    }

    $('#view-transparent').css('visibility','visible');
    $('#view-wireframe').css('visibility','visible');
    $('#view-joints').css('visibility','visible');
    $('#model-popup').popup('open',
      {x: event.clientX + emUnits(6),
       y: event.clientY + emUnits(0)});
  }
};

/**
 * Format stats message for proper display
 * @param {} stats
 * @returns {Object.<position, orientation, inertial, diffuse, specular, attenuation>}
 */
GZ3D.Gui.prototype.formatStats = function(stats)
{
  var position, orientation;
  var quat, rpy;
  if (stats.pose)
  {
    position = this.round(stats.pose.position, false, null);

    quat = new THREE.Quaternion(stats.pose.orientation.x,
        stats.pose.orientation.y, stats.pose.orientation.z,
        stats.pose.orientation.w);

    rpy = new THREE.Euler();
    rpy.setFromQuaternion(quat);

    orientation = {roll: rpy._x, pitch: rpy._y, yaw: rpy._z};
    orientation = this.round(orientation, false, null);
  }
  var inertial;
  if (stats.inertial)
  {
    inertial = this.round(stats.inertial, false, 3);

    var inertialPose = stats.inertial.pose;
    inertial.pose = {};

    inertial.pose.position = {x: inertialPose.position.x,
                              y: inertialPose.position.y,
                              z: inertialPose.position.z};

    inertial.pose.position = this.round(inertial.pose.position, false, 3);

    quat = new THREE.Quaternion(inertialPose.orientation.x,
        inertialPose.orientation.y, inertialPose.orientation.z,
        inertialPose.orientation.w);

    rpy = new THREE.Euler();
    rpy.setFromQuaternion(quat);

    inertial.pose.orientation = {roll: rpy._x, pitch: rpy._y, yaw: rpy._z};
    inertial.pose.orientation = this.round(inertial.pose.orientation, false, 3);
  }
  var diffuse, colorHex, comp;
  var color = {};
  if (stats.diffuse)
  {
    diffuse = this.round(stats.diffuse, true);

    colorHex = {};
    for (comp in diffuse)
    {
      if (diffuse.hasOwnProperty(comp)) {
        colorHex[comp] = diffuse[comp].toString(16);
        if (colorHex[comp].length === 1)
        {
          colorHex[comp] = '0' + colorHex[comp];
        }
      }
    }
    color.diffuse = '#' + colorHex['r'] + colorHex['g'] + colorHex['b'];
  }
  var specular;
  if (stats.specular)
  {
    specular = this.round(stats.specular, true);

    colorHex = {};
    for (comp in specular)
    {
      if (specular.hasOwnProperty(comp)) {
        colorHex[comp] = specular[comp].toString(16);
        if (colorHex[comp].length === 1)
        {
          colorHex[comp] = '0' + colorHex[comp];
        }
      }
    }
    color.specular = '#' + colorHex['r'] + colorHex['g'] + colorHex['b'];
  }
  var axis1;
  if (stats.axis1)
  {
    axis1 = {};
    axis1 = this.round(stats.axis1);
    axis1.direction = this.round(stats.axis1.xyz, false, 3);
  }
  var axis2;
  if (stats.axis2)
  {
    axis2 = {};
    axis2 = this.round(stats.axis2);
    axis2.direction = this.round(stats.axis2.xyz, false, 3);
  }

  return {pose: {position: position, orientation: orientation},
          inertial: inertial,
          diffuse: diffuse,
          specular: specular,
          color: color,
          axis1: axis1,
          axis2: axis2};
};

/**
 * Round numbers and format colors
 * @param {} stats
 * @param {} decimals - number of decimals to display, null for input fields
 * @returns result
 */
GZ3D.Gui.prototype.round = function(stats, isColor, decimals)
{
  var result = stats;
  if (typeof result === 'number')
  {
    result = this.roundNumber(result, isColor, decimals);
  }
  else // array of numbers
  {
    result = this.roundArray(result, isColor, decimals);
  }
  return result;
};

/**
 * Round number and format color
 * @param {} stats
 * @param {} decimals - number of decimals to display, null for input fields
 * @returns result
 */
GZ3D.Gui.prototype.roundNumber = function(stats, isColor, decimals)
{
  var result = stats;
  if (isColor)
  {
    result = Math.round(result * 255);
  }
  else
  {
    if (decimals === null)
    {
      result = Math.round(result*1000)/1000;
    }
    else
    {
      result = result.toFixed(decimals);
    }
  }
  return result;
};

/**
 * Round each number in an array
 * @param {} stats
 * @param {} decimals - number of decimals to display, null for input fields
 * @returns result
 */
GZ3D.Gui.prototype.roundArray = function(stats, isColor, decimals)
{
  var result = stats;
  for (var key in result)
  {
    if (typeof result[key] === 'number')
    {
      result[key] = this.roundNumber(result[key], isColor, decimals);
    }
  }
  return result;
};

/**
 * Format toggle items
 * @param {} stats: true / false
 * @returns {Object.<icon, title>}
 */
GZ3D.Gui.prototype.trueOrFalse = function(stats)
{
  return stats ?
      {icon: 'true', title: 'True'} :
      {icon: 'false', title: 'False'};
};

/**
 * Delete an entity from stats list
 * @param {} type: 'model' / 'light'
 * @param {} name
 */
GZ3D.Gui.prototype.deleteFromStats = function(type, name)
{
  var list = (type === 'model') ? modelStats : lightStats;

  for (var i = 0; i < list.length; ++i)
  {
    if (list[i].name === name)
    {
      if ($('#propertyPanel-'+name).is(':visible'))
      {
        guiEvents.emit('openTab', 'treeMenu', 'treeMenu');
      }

      list.splice(i, 1);
      break;
    }
  }
};


//var GAZEBO_MODEL_DATABASE_URI='http://gazebosim.org/models';

THREE.ImageUtils.crossOrigin = 'anonymous'; // needed to allow cross-origin loading of textures


GZ3D.GZIface = function(scene, gui)
{
  this.scene = scene;
  this.gui = gui;

  this.isConnected = false;

  this.emitter = new EventEmitter2({ verbose: true });

  this.init();
  this.visualsToAdd = [];
  this.canDeletePredicates = [];

  // Stores AnimatedModel instances
  this.animatedModels = {};

  // Stores muscle visualization geometries
  this.muscleVisuzalizations = {};

  this.waitingForScaleNewObjects = [];

  GZ3D.assetProgressData = {};
  GZ3D.assetProgressData.assets = [];
  GZ3D.assetProgressData.prepared = false;
  GZ3D.assetProgressCallback = undefined;

  this.webSocketConnectionCallbacks = [];
};

GZ3D.GZIface.prototype.addCanDeletePredicate = function(canDeletePredicate){
  this.canDeletePredicates.push(canDeletePredicate);
};

GZ3D.GZIface.prototype.init = function()
{
  this.material = [];
  this.entityMaterial = {};

  this.connect();
};

GZ3D.GZIface.prototype.setAssetProgressCallback = function(callback)
{
  GZ3D.assetProgressCallback = callback;
};

GZ3D.GZIface.prototype.registerWebSocketConnectionCallback = function(callback) {
  this.webSocketConnectionCallbacks.push(callback);
};

GZ3D.GZIface.prototype.connect = function() {
  // connect to websocket
  var url = GZ3D.webSocketUrl;

  if (GZ3D.webSocketToken !== undefined) {
    url = url + '?token=' + GZ3D.webSocketToken;
  }

  this.webSocket = new ROSLIB.PhoenixRos({
    url : url
  });

  var that = this;
  this.webSocket.on('connection', function() {
    that.onConnected();
  });
  this.webSocket.on('error', function() {
    that.onError();
  });
};

GZ3D.GZIface.prototype.onError = function()
{
  this.emitter.emit('error');
};


GZ3D.GZIface.prototype.createEntityModifyMessage = function(entity)
{
  var matrix = entity.matrixWorld;
  var translation = new THREE.Vector3();
  var quaternion = new THREE.Quaternion();
  var scale = new THREE.Vector3();
  matrix.decompose(translation, quaternion, scale);

  var entityMsg =
  {
    name : entity.name,
    id : entity.userData,
    createEntity : 0,
    position :
    {
      x : translation.x,
      y : translation.y,
      z : translation.z
    },
    scale :
    {
      x : scale.x,
      y : scale.y,
      z : scale.z
    },
    orientation :
    {
      w: quaternion.w,
      x: quaternion.x,
      y: quaternion.y,
      z: quaternion.z
    }
  };
  return entityMsg;
};

GZ3D.GZIface.prototype.onConnected = function()
{
  this.heartbeatTopic = new ROSLIB.Topic({
    ros : this.webSocket,
    name : '~/heartbeat',
    messageType : 'heartbeat',
  });

  var that = this;
  var publishHeartbeat = function()
  {
    var hearbeatMsg =
    {
      alive : 1
    };
    that.heartbeatTopic.publish(hearbeatMsg);
  };

  setInterval(publishHeartbeat, 5000);

  // call all the registered callbacks since we are connected now
  this.webSocketConnectionCallbacks.forEach(function(callback) {
    callback();
  });

  this.statusTopic = new ROSLIB.Topic({
    ros: this.webSocket,
    name: '~/status',
    messageType : 'status',
  });

  var statusUpdate = function(message)
  {
    if (message.status === 'error')
    {
      that.isConnected = false;
      this.emitter.emit('gzstatus', 'error');
    }
  };
  this.statusTopic.subscribe(statusUpdate.bind(this));

  this.materialTopic = new ROSLIB.Topic({
    ros : this.webSocket,
    name : '~/material',
    messageType : 'material',
  });

  var materialUpdate = function(message)
  {
    this.material = message;
    this.emitter.emit('material', this.material);

  };
  this.materialTopic.subscribe(materialUpdate.bind(this));

  this.sceneTopic = new ROSLIB.Topic({
    ros : this.webSocket,
    name : '~/scene',
    messageType : 'scene',
  });


  var isChildModel = function(modelList,name, firstlevel =true)
  {
    for(var i=0;i<modelList.length;i++)
    {
        var model = modelList[i];
        if (!firstlevel)
        {
          if (name===model.name)
          {
            return true;
          }
        }

        var isChild = isChildModel(model.model, name,false);
        if (isChild)
        {
          return true;
        }
    }

    return false;
  };

  var createModelHierarchy = function(gzface, parentObject, model)
  {
    var modelObj = gzface.createModelFromMsg(model);
    if (modelObj)
    {
      parentObject.add(modelObj);
      gzface.scene.applyComposerSettingsToModel(modelObj);
      gzface.gui.setModelStats(model, 'update');

      for(var i=0;i<model.model.length;i++)
      {
          createModelHierarchy(gzface, modelObj,model.model[i] );
      }
    }

    return modelObj;
  };

  var sceneUpdate = function(message)
  {
    if (message.name)
    {
      this.scene.name = message.name;
    }

    if (message.grid === true)
    {
      //this.gui.guiEvents.emit('show_grid', 'show'); // do not show grid by default for now
    }

    if (message.ambient)
    {
      var ambient = new THREE.Color();
      ambient.r = message.ambient.r;
      ambient.g = message.ambient.g;
      ambient.b = message.ambient.b;

      this.scene.ambient.color = ambient;
    }

    if (message.background)
    {
      var background = new THREE.Color();
      background.r = message.background.r;
      background.g = message.background.g;
      background.b = message.background.b;

      this.scene.viewManager.setBackgrounds(background);
    }

    for (var i = 0; i < message.light.length; ++i)
    {
      var light = message.light[i];
      var lightObj = this.createLightFromMsg(light);
      this.scene.add(lightObj);
      this.gui.setLightStats(light, 'update');
    }

    var j, model;
    var hierachyOnlyModels = [];

    for (j = 0; j < message.model.length; ++j)
    {
      model = message.model[j];
      if (!isChildModel(message.model,model.name))
      {
        hierachyOnlyModels.push(model);
      }
    }

    for (j = 0; j < hierachyOnlyModels.length; ++j)
    {
      createModelHierarchy(this, this.scene, hierachyOnlyModels[j]);
    }

    GZ3D.assetProgressData.prepared = true;
    if (GZ3D.assetProgressCallback) {
      GZ3D.assetProgressCallback(GZ3D.assetProgressData);
    }
    this.gui.setSceneStats(message);
    this.sceneTopic.unsubscribe();

    this.scene.refresh3DViews();
  };
  this.sceneTopic.subscribe(sceneUpdate.bind(this));

  this.physicsTopic = new ROSLIB.Topic({
    ros : this.webSocket,
    name : '~/physics',
    messageType : 'physics',
  });

  var physicsUpdate = function(message)
  {
    this.gui.setPhysicsStats(message);
  };
  this.physicsTopic.subscribe(physicsUpdate.bind(this));


  // Update model pose
  this.poseTopic = new ROSLIB.Topic({
    ros : this.webSocket,
    name : '~/pose/info',
    messageType : 'pose',
  });


  var poseUpdate = function(message)
  {
    var poseApplyUpdate = function(scope, message)
    {
      var entity = scope.scene.getByName(message.name);
      if (entity && entity !== scope.scene.modelManipulator.object
          && entity.parent !== scope.scene.modelManipulator.object)
      {
        scope.scene.updatePose(entity, message.position, message.orientation);
        scope.gui.setModelStats(message, 'update');
      }
    };

    if (message.name)
    {
      poseApplyUpdate(this,message);
    }
    else
    {
      var keys = Object.keys(message);

      for (var i=0;i<keys.length; i++)
      {
        poseApplyUpdate(this,message[keys[i]]);
      }
    }
  };

  this.poseTopic.subscribe(poseUpdate.bind(this));

  // ROS topic subscription for joint_state messages
  // Requires gzserver version with support for joint state messages
  this.jointTopicSubscriber = new ROSLIB.Topic({ros: this.webSocket,
                                              name: '~/joint_states',
                                              message_type: 'jointstates',
                                              throttle_rate: 1.0 / 25.0 * 1000.0,
                                              });

  // function for updating transformations of bones in a client-side-only animated model
  var updateJoint = function(message)
  {
    if (message.robot_name in this.animatedModels)
    {
      var animatedModel = this.animatedModels[message.robot_name];
      animatedModel.updateJoint(message.robot_name, message.name, message.position, message.axes);
    }
  };

  // Subscription to joint update topic
  this.jointTopicSubscriber.subscribe(updateJoint.bind(this));

  // Requests - for deleting models
  this.requestTopic = new ROSLIB.Topic({
    ros : this.webSocket,
    name : '~/request',
    messageType : 'request',
  });

  // ROS topic subscription for muscle system visualization messages
  // Requires gzserver version with OpenSim support, and OpenSim as active physics engine (gzserver -e opensim)
  console.debug('Subscribing to muscle visualization topic (gzbridge)');
  this.muscleVisualizationSubscriber = new ROSLIB.Topic({
    ros: this.webSocket,
    name: '~/muscles',
    message_type: 'muscles',
    throttle_rate: 1.0 / 20.0 * 1000.0,
  });

  // function for updating clien system visualization
  var updateMuscleVisualization = function (message) {
    if (!(message.robot_name in this.muscleVisuzalizations)) {
      this.muscleVisuzalizations[message.robot_name] = new GZ3D.VisualMuscleModel(this.scene, message.robot_name);
    }

    if (message.robot_name in this.muscleVisuzalizations) {
      this.muscleVisuzalizations[message.robot_name].updateVisualization(message);
    }
  };

  // Subscription to joint update topic
  this.muscleVisualizationSubscriber.subscribe(updateMuscleVisualization.bind(this));

  var requestUpdate = function (message) {
    if (message.request === 'entity_delete') {
      var entity = this.scene.getByName(message.data);
      if (entity)
      {
        if (entity.children[0] instanceof THREE.Light)
        {
          this.gui.setLightStats({name: message.data}, 'delete');
          guiEvents.emit('notification_popup', message.data+' deleted');
        }
        else
        {
          this.gui.setModelStats({name: message.data}, 'delete');
          guiEvents.emit('notification_popup', message.data+' deleted');
        }
        this.scene.remove(entity);
      }
    }
  };

  this.requestTopic.subscribe(requestUpdate.bind(this));

  // Model info messages - currently used for spawning new models
  this.modelInfoTopic = new ROSLIB.Topic({
    ros : this.webSocket,
    name : '~/model/info',
    messageType : 'model',
  });

  var modelUpdate = function(message)
  {
    if (!this.scene.getByName(message.name))
    {
      var modelObj = createModelHierarchy(this, this.scene, message);
      if (modelObj)
      {
        guiEvents.emit('notification_popup', message.name+' inserted');
      }

      // visuals may arrive out of order (before the model msg),
      // add the visual in if we find its parent here
      var len = this.visualsToAdd.length;
      var i = 0;
      var j = 0;
      while (i < len)
      {
        var parentName = this.visualsToAdd[j].parent_name;
        if (parentName.indexOf(modelObj.name) >=0)
        {
          var parent = this.scene.getByName(parentName);
          var visualObj = this.createVisualFromMsg(this.visualsToAdd[j]);
          parent.add(visualObj);
          this.visualsToAdd.splice(j, 1);
        }
        else
        {
          j++;
        }
        i++;
      }
    } else {
      this.updateModelFromMsg(this.scene.getByName(message.name), message);
    }
    this.gui.setModelStats(message, 'update');
  };

  this.modelInfoTopic.subscribe(modelUpdate.bind(this));

  // Visual messages - currently just used for collision visuals
  this.visualTopic = new ROSLIB.Topic({
    ros : this.webSocket,
    name : '~/visual',
    messageType : 'visual',
  });

  var visualUpdate = function(message)
  {
    if (!this.scene.getByName(message.name))
    {
      // accept only collision visual msgs for now
      if (message.name.indexOf('COLLISION_VISUAL') < 0)
      {
        return;
      }

      // delay the add if parent not found, this array will checked in
      // modelUpdate function
      var parent = this.scene.getByName(message.parent_name);
      if (message.parent_name && !parent)
      {
        this.visualsToAdd.push(message);
      }
      else
      {
        var visualObj = this.createVisualFromMsg(message);
        parent.add(visualObj);
      }
    } else {
      // backend generated material updates for objects in the scene
      // these are not a user actions, so update the visuals
      var backendVisualObj = this.scene.getByName(message.name);
      if(message.material && message.material.script.name !== '__default__')
      {
        this.updateVisualFromMsg(backendVisualObj, message);
      }
    }
  };

  this.visualTopic.subscribe(visualUpdate.bind(this));

  // world stats
  this.worldStatsTopic = new ROSLIB.Topic({
    ros : this.webSocket,
    name : '~/world_stats',
    messageType : 'world_stats',
  });

  var worldStatsUpdate = function(message)
  {
    this.updateStatsGuiFromMsg(message);
  };

  this.worldStatsTopic.subscribe(worldStatsUpdate.bind(this));

  // Spawn new lights
  this.lightFactoryTopic = new ROSLIB.Topic({
    ros : this.webSocket,
    name : '~/factory/light',
    messageType : 'light',
  });

  var lightCreate = function(message)
  {
    var entity = this.scene.getByName(message.name);
    if (!entity)
    {
      var lightObj = this.createLightFromMsg(message);
      this.scene.add(lightObj);

      // For the inserted light to have effect
      var allObjects = [];
      this.scene.scene.getDescendants(allObjects);
      for (var l = 0; l < allObjects.length; ++l)
      {
        if (allObjects[l].material)
        {
          allObjects[l].material.needsUpdate = true;
        }
      }

      guiEvents.emit('notification_popup', message.name+' inserted');
    }
    this.gui.setLightStats(message, 'update');
  };

  this.lightFactoryTopic.subscribe(lightCreate.bind(this));

  // Update existing lights
  var lightModifyTopic = new ROSLIB.Topic({
    ros : this.webSocket,
    name : '~/light/modify',
    messageType : 'light',
  });

  var lightUpdate = function(message)
  {
    var entity = this.scene.getByName(message.name);
    if (entity && entity !== this.scene.modelManipulator.object
        && entity.parent !== this.scene.modelManipulator.object)
    {
      this.scene.updateLight(entity, message);
    }
    this.gui.setLightStats(message, 'update');
  };

  lightModifyTopic.subscribe(lightUpdate.bind(this));

  // heightmap
  this.heightmapDataService = new ROSLIB.Service({
    ros : this.webSocket,
    name : '~/heightmap_data',
    serviceType : 'heightmap_data'
  });

  // road
  this.roadService = new ROSLIB.Service({
    ros : this.webSocket,
    name : '~/roads',
    serviceType : 'roads'
  });

  var request = new ROSLIB.ServiceRequest({
      name : 'roads'
  });

  // send service request and load road on response
  this.roadService.callService(request,
  function(result)
  {
    var roadsObj = that.createRoadsFromMsg(result);
    this.scene.add(roadsObj);
  });

  // Model modify messages - for modifying models
  this.modelModifyTopic = new ROSLIB.Topic({
    ros : this.webSocket,
    name : '~/model/modify',
    messageType : 'model',
  });

  // Light messages - for modifying lights
  this.lightModifyTopic = new ROSLIB.Topic({
    ros : this.webSocket,
    name : '~/light/modify',
    messageType : 'light',
  });


  /*
  TODO: (Sandro Weber)
  The following functions are used to change all lights at the same time through the light slider of the NRP.
  Gazebo only knows attenuation factors, not intensity, so we manipulate diffuse color for now.
  Probably replaced / revamped after a dedicated edit tab is introduced to allow manipulation of lights directly.
   */
  var createEntityModifyMessageWithLight = function (entity, diffuse)
  {
    var entityMsg = that.createEntityModifyMessage(entity);

    var lightObj = entity.children[0];

    if (diffuse === undefined) {
      diffuse = lightObj.color;
    }
    entityMsg.diffuse =
      {
        r: diffuse.r,
        g: diffuse.g,
        b: diffuse.b
      };
    entityMsg.specular =
      {
        r: entity.serverProperties.specular.r,
        g: entity.serverProperties.specular.g,
        b: entity.serverProperties.specular.b
      };

    entityMsg.direction = entity.direction;
    entityMsg.range = lightObj.distance;

    if (entityMsg.direction === undefined && lightObj.target !== undefined)
    {
      entityMsg.direction = {x:lightObj.target.position.x,y:lightObj.target.position.y,z:lightObj.target.position.z};
    }

    entityMsg.attenuation_constant = entity.serverProperties.attenuation_constant;
    entityMsg.attenuation_linear = entity.serverProperties.attenuation_linear;
    entityMsg.attenuation_quadratic = entity.serverProperties.attenuation_quadratic;

    return entityMsg;
  };

  var publishEntityModify = function (entity)
  {
    if (entity)
    {
      var lightObj = entity.children?entity.children[0]:null;
      if (lightObj && lightObj instanceof THREE.Light)
      {
        that.lightModifyTopic.publish(createEntityModifyMessageWithLight(entity, undefined));
      }
      else
      {
        that.modelModifyTopic.publish(that.createEntityModifyMessage(entity));
      }
    }
  };

  this.scene.emitter.on('entityChanged', publishEntityModify);

  var publishLightModify = function (vec)
  {
    var lights = [];
    that.scene.scene.traverse(function (node)
    {
      if (node instanceof THREE.Light)
      {
        lights.push(node);
      }
    });

    var numberOfLights = lights.length;
    for (var i = 0; i < numberOfLights; i += 1)
    {
      if (lights[i] instanceof THREE.AmbientLight)
      { // we don't change ambient lights
        continue;
      }
      var entity = that.scene.getByName(lights[i].name);
      lights[i].color.r = THREE.Math.clamp(vec + lights[i].color.r, 0, 1);
      lights[i].color.g = THREE.Math.clamp(vec + lights[i].color.g, 0, 1);
      lights[i].color.b = THREE.Math.clamp(vec + lights[i].color.b, 0, 1);

      that.lightModifyTopic.publish(createEntityModifyMessageWithLight(entity, lights[i].color));
    }
  };

  this.scene.emitter.on('lightChanged', publishLightModify);
  /*
  end of light slider change functions
   */

  var publishLinkModify = function(entity, type)
  {
    var modelMsg =
    {
      name : entity.parent.name,
      id : entity.parent.userData.id,
      link:
      {
        name: entity.name,
        id: entity.userData.id,
        self_collide: entity.serverProperties.self_collide,
        gravity: entity.serverProperties.gravity,
        kinematic: entity.serverProperties.kinematic
      }
    };

    that.linkModifyTopic.publish(modelMsg);
  };

  this.scene.emitter.on('linkChanged', publishLinkModify);

  // Factory messages - for spawning new models
  this.factoryTopic = new ROSLIB.Topic({
    ros : this.webSocket,
    name : '~/factory',
    messageType : 'factory',
  });

  // Factory messages - for spawning new lights
  this.lightFactoryTopic = new ROSLIB.Topic({
    ros : this.webSocket,
    name : '~/factory/light',
    messageType : 'light',
  });

  var publishFactory = function(model, type)
  {
    var matrix = model.matrixWorld;
    var translation = new THREE.Vector3();
    var quaternion = new THREE.Quaternion();
    var scale = new THREE.Vector3();
    matrix.decompose(translation, quaternion, scale);
    var entityMsg =
    {
      name : model.name,
      type : type,
      createEntity : 1,
      position :
      {
        x : translation.x,
        y : translation.y,
        z : translation.z
      },
      scale :
      {
        x : scale.x,
        y : scale.y,
        z : scale.z
      },
      orientation :
      {
        w: quaternion.w,
        x: quaternion.x,
        y: quaternion.y,
        z: quaternion.z
      }
    };
    if (model.children[0] && model.children[0].children[0] && model.children[0].children[0] instanceof THREE.Light)
    {
      that.lightFactoryTopic.publish(entityMsg);
    }
    else
    {
      that.factoryTopic.publish(entityMsg);

      if (scale.x!==1.0 || scale.y!==1.0 || scale.z!==1.0)  // The factory topic does not handle the scale value, so I have to publish a modify message
      {                                                     // to apply the scale transform. I'll do it later, since I don't have the ID of the new created object now
        that.waitingForScaleNewObjects[model.name] = [scale.x,scale.y,scale.z];
      }
    }
  };

  // For deleting models
  this.deleteTopic = new ROSLIB.Topic({
    ros : this.webSocket,
    name : '~/entity_delete',
    messageType : 'entity_delete',
  });

  var publishDeleteEntity = function (entity) {
    var canDelete = !that.canDeletePredicates.length ||
      that.canDeletePredicates
        .every(function (deletePredicate) {
          return deletePredicate(entity) !== false;
        });
    if (canDelete) {
      that.deleteTopic.publish({ name: entity.name });
    }
  };

  this.gui.emitter.on('deleteEntity',
      function(entity)
      {
        publishDeleteEntity(entity);
      }
  );

  // World control messages - for resetting world/models
  this.worldControlTopic = new ROSLIB.Topic({
    ros : this.webSocket,
    name : '~/world_control',
    messageType : 'world_control',
  });

  var publishWorldControl = function(state, resetType)
  {
    var worldControlMsg = {};
    if (state !== null)
    {
      worldControlMsg.pause = state;
    }
    if (resetType)
    {
      worldControlMsg.reset = resetType;
    }
    that.worldControlTopic.publish(worldControlMsg);
  };

  this.gui.emitter.on('entityCreated', publishFactory);

  this.gui.emitter.on('reset',
      function(resetType)
      {
        publishWorldControl(null, resetType);
      }
  );

  this.gui.emitter.on('pause',
      function(paused)
      {
        publishWorldControl(paused, null);
      }
  );

  this.isConnected = true;
  this.emitter.emit('connection');
};

GZ3D.GZIface.prototype.updateStatsGuiFromMsg = function(stats)
{
  this.gui.setPaused(stats.paused);

  var simSec = stats.sim_time.sec;
  var simNSec = stats.sim_time.nsec;

  var simDay = Math.floor(simSec / 86400);
  simSec -= simDay * 86400;

  var simHour = Math.floor(simSec / 3600);
  simSec -= simHour * 3600;

  var simMin = Math.floor(simSec / 60);
  simSec -= simMin * 60;

  var simMsec = Math.floor(simNSec * 1e-6);

  var realSec = stats.real_time.sec;
  var realNSec = stats.real_time.nsec;

  var realDay = Math.floor(realSec / 86400);
  realSec -= realDay * 86400;

  var realHour = Math.floor(realSec / 3600);
  realSec -= realHour * 3600;

  var realMin = Math.floor(realSec / 60);
  realSec -= realMin * 60;

  var realMsec = Math.floor(realNSec * 1e-6);

  var simTimeValue = '';
  var realTimeValue = '';

  if (realDay < 10)
  {
    realTimeValue += '0';
  }
  realTimeValue += realDay.toFixed(0) + ' ';
  if (realHour < 10)
  {
    realTimeValue += '0';
  }
  realTimeValue += realHour.toFixed(0) + ':';
  if (realMin < 10)
  {
    realTimeValue += '0';
  }
  realTimeValue += realMin.toFixed(0)  + ':';
  if (realSec < 10)
  {
    realTimeValue += '0';
  }
  realTimeValue += realSec.toFixed(0);

  if (simDay < 10)
  {
    simTimeValue += '0';
  }
  simTimeValue += simDay.toFixed(0)  + ' ';
  if (simHour < 10)
  {
    simTimeValue += '0';
  }
  simTimeValue += simHour.toFixed(0) + ':';
  if (simMin < 10)
  {
    simTimeValue += '0';
  }
  simTimeValue += simMin.toFixed(0) + ':';
  if (simSec < 10)
  {
    simTimeValue += '0';
  }
  simTimeValue += simSec.toFixed(0);

  this.gui.setRealTime(realTimeValue);
  this.gui.setSimTime(simTimeValue);
};

var getShapeName = function(object3D) {

  var getObject3DGeometryType = function() {
      var geometryType = null;

      //object::link::visual::Mesh
      object3D.traverse(function(node) {
        if(!geometryType && node.name.indexOf('link::visual') >= 0) {
          //current node is a link::visual node, test the mesh geometry
          node.traverse(function (subnode) {
            if (subnode instanceof THREE.Mesh) {
              geometryType = subnode.geometry;
            }
          });
        }
      });

      return geometryType;
    };

  var shapeName = 'complex';

  var geomType = getObject3DGeometryType();

  if(geomType instanceof THREE.BoxGeometry) {
      shapeName = 'box';
  } else if (geomType instanceof THREE.CylinderGeometry) {
      shapeName = 'cylinder';
  } else if (geomType instanceof THREE.SphereGeometry) {
      shapeName = 'sphere';
  }

  return shapeName;

};

GZ3D.GZIface.prototype.loadCollisionVisuals = function(object)
{
  if (object._pendingCollisionVisuals)
  {
    for(var i=0;i<object._pendingCollisionVisuals.length; i++)
    {
      var collDef = object._pendingCollisionVisuals[i];

      var collisionVisualObj = this.createVisualFromMsg(collDef.collisionVisual, collDef.modelScale);
      if (collisionVisualObj && !collisionVisualObj.parent)
      {
        object.add(collisionVisualObj);
      }
    }

    object._pendingCollisionVisuals = undefined;
  }
};

GZ3D.GZIface.prototype.createModelFromMsg = function(model)
{
  var modelObj = new THREE.Object3D();
  modelObj.name = model.name;
  modelObj.userData.id = model.id;
  modelObj.userData.is_static = model.is_static;
  if (model.pose)
  {
    this.scene.setPose(modelObj, model.pose.position, model.pose.orientation);
  }

  // Check for client-side-only animated model for robot
  var animatedModel = new GZ3D.AnimatedModel(this.scene);
  if (model.name === 'robot' && GZ3D.animatedModel)
  {
    animatedModel.loadAnimatedModel(model.name);
    this.animatedModels[model.name] = animatedModel;
  }
  else
  {
    animatedModel = null;
  }

  for (var j = 0; j < model.link.length; ++j)
  {
    var link = model.link[j];
    var linkObj = new THREE.Object3D();
    linkObj.name = link.name;
    linkObj.userData.id = link.id;
    linkObj.userData.gazeboType = 'link';
    linkObj.serverProperties =
        {
          self_collide: link.self_collide,
          gravity: link.gravity,
          kinematic: link.kinematic
        };

    if (link.pose)
    {
      this.scene.setPose(linkObj, link.pose.position,
          link.pose.orientation);
    }

    linkObj._linkSource = link;
    modelObj.add(linkObj);

    // only load individual link visuals if they are not replaced by an createVisualFromMsganimated model
    if (animatedModel === null)
    {
      for (var k = 0; k < link.visual.length; ++k)
      {
        var visual = link.visual[k];
        var visualObj = this.createVisualFromMsg(visual, model.scale);
        if (visualObj && !visualObj.parent) {
          linkObj.add(visualObj);
        }
      }

      for (var l = 0; l < link.collision.length; ++l)
      {
        var collision = link.collision[l];
        for (var m = 0; m < link.collision[l].visual.length; ++m)
        {
          var collisionVisual = link.collision[l].visual[m];

          if (!linkObj._pendingCollisionVisuals)
          {
            linkObj._pendingCollisionVisuals = [];
          }

          linkObj._pendingCollisionVisuals.push( {'collisionVisual':collisionVisual, 'modelScale':model.scale} );
        }
      }
    }

    // always add sensor links, even with animated models (e.g. cameras)
    for (var i = 0; i < link.sensor.length; ++i) {
      var sensor = link.sensor[i];

      var sensorObj = this.createSensorFromMsg(sensor,link.name);
      if (sensorObj && !sensorObj.parent)
      {
        linkObj.add(sensorObj);
      }
    }
  }
  if (model.joint)
  {
    modelObj.joint = model.joint;
  }

  if(model.scale)
  {
    this.scene.setScale(modelObj, model.scale);
  }

  var shapeName = getShapeName(modelObj);

  modelObj.userData.shapeName = shapeName;
  modelObj.userData.isSimpleShape = (shapeName !== 'complex');
  modelObj.getShapeName  = function () { return this.userData.shapeName; };
  modelObj.isSimpleShape = function () { return this.userData.isSimpleShape; };

  if (this.waitingForScaleNewObjects[model.name])
  {
    modelObj.scale.x = this.waitingForScaleNewObjects[model.name][0];
    modelObj.scale.y = this.waitingForScaleNewObjects[model.name][1];
    modelObj.scale.z = this.waitingForScaleNewObjects[model.name][2];
    modelObj.updateMatrixWorld();
    this.modelModifyTopic.publish(this.createEntityModifyMessage(modelObj));

    delete this.waitingForScaleNewObjects[model.name];
  }


  return modelObj;
};

// This method uses code also to be found at GZ3D.GZIface.prototype.createModelFromMsg.
// Currently not everything is handled for an update, but this method was introduced to handle
// the updates of colors of objects; if there should be more functionality one could consider
// merging the two methods and extracting the different things to parameters (or any other means
// of configuration).
GZ3D.GZIface.prototype.updateModelFromMsg = function (modelObj, modelMsg) {

  if(modelMsg.scale)  {
    this.scene.setScale(modelObj, modelMsg.scale);
  }

  for (var j = 0; j < modelMsg.link.length; ++j) {
    var link = modelMsg.link[j];
    var linkObj = modelObj.children[j];

    for (var k = 0; k < link.visual.length; ++k) {
      var visual = link.visual[k];
      var visualObj = linkObj.getObjectByName(visual.name);
      this.updateVisualFromMsg(visualObj, visual);
    }
    //update view mode, possibly overwritten by visual/material update
    this.scene.setViewAs(modelObj, modelObj.viewAs);
  }
};

GZ3D.GZIface.prototype.createVisualFromMsg = function(visual, modelScale)
{
  if (visual.geometry)
  {
    var geom = visual.geometry;
    var visualObj = new THREE.Object3D();
    visualObj.name = visual.name;
    if (visual.pose)
    {
      this.scene.setPose(visualObj, visual.pose.position,
          visual.pose.orientation);
    }

    visualObj.castShadow = visual.cast_shadows;
    visualObj.receiveShadow = visual.receive_shadows;

    this.createGeom(geom, visual.material, visualObj, modelScale);

    return visualObj;
  }
};

GZ3D.GZIface.prototype.updateVisualFromMsg = function (visualObj, visual) {
  if (visual.geometry) {
    var obj = visualObj.children[0];
    var mat = this.parseMaterial(visual.material);

    if (obj && mat) {
      this.scene.setMaterial(obj, mat);
    }
  }
};

GZ3D.GZIface.prototype.createLightFromMsg = function(light)
{
  var obj, range, direction;

  if (light.type === this.scene.LIGHT_POINT)
  {
    direction = null;
    range = light.range;
  }
  else if (light.type === this.scene.LIGHT_SPOT)
  {
    direction = new THREE.Vector3();
    direction.x = light.direction.x;
    direction.y = light.direction.y;
    direction.z = light.direction.z;
    range = light.range;
  }
  else if (light.type === this.scene.LIGHT_DIRECTIONAL)
  {
    direction = new THREE.Vector3();
    direction.x = light.direction.x;
    direction.y = light.direction.y;
    direction.z = light.direction.z;
    range = null;
  }

  // equation taken from
  // http://wiki.blender.org/index.php/Doc:2.6/Manual/Lighting/Lights/Light_Attenuation
  var E = 1;
  var D = 1;
  var r = 1;
  var L = light.attenuation_linear;
  var Q = light.attenuation_quadratic;
  var intensity = E*(D/(D+L*r))*(Math.pow(D,2)/(Math.pow(D,2)+Q*Math.pow(r,2)));

  obj = this.scene.createLight(light.type, light.diffuse, intensity,
        light.pose, range, light.cast_shadows, light.name,
        direction, light.specular, light.attenuation_constant,
        light.attenuation_linear, light.attenuation_quadratic, light.spot_outer_angle, light.spot_falloff);

  return obj;
};

GZ3D.GZIface.prototype.createRoadsFromMsg = function(roads)
{
  var roadObj = new THREE.Object3D();

  var mat = this.material['Gazebo/Road'];
  var texture = null;
  if (mat)
  {
    texture = this.parseUri('media/materials/textures/' + mat['texture']);
  }
  var obj = this.scene.createRoads(roads.point, roads.width, texture);
  roadObj.add(obj);
  return roadObj;
};

GZ3D.GZIface.prototype.createLinkInfo = function(link,parent)
{
  this.createLabel(parent,new THREE.Vector3(0,0,0), link.name.replace('robot::',''),true);
};

GZ3D.GZIface.prototype.createSensorFromMsg = function(sensor,modelName)
{
  var sensorObj = new THREE.Object3D();
  sensorObj.name = sensor.name;
  sensorObj.userData.gazeboType = 'sensor';
  sensorObj.userData.sensorType = sensor.type;
  sensorObj._sensorSource = sensor;

  if (sensor.pose) {
    this.scene.setPose(sensorObj, sensor.pose.position, sensor.pose.orientation);
  }

  if (sensor.type === 'camera') {
    // If we have a camera sensor we have a potential view that could be rendered
    var camera = sensor.camera;

    // The following camera parameters are available only for Gazebo versions >= 6.5 (imageSize exists but always 0x0)

    // set to default values if not available
    // If no rendering is available, image_size is set to { x: 0.0, y: 0.0 }, see
    // https://bitbucket.org/osrf/gazebo/issues/1663/sensor-camera-elements-from-sdf-not-being
    if (!angular.isDefined(camera.image_size) || (camera.image_size.x === 0.0 && camera.image_size.y === 0.0)) {
      camera.image_size = {};
      camera.image_size.x = 960; // width
      camera.image_size.y = 600; // height
    }
    if (!angular.isDefined(camera.horizontal_fov)) {
      camera.horizontal_fov = Math.PI * 0.3;
    }
    if (!angular.isDefined(camera.near_clip)) {
      camera.near_clip = 0.1;
    }
    if (!angular.isDefined(camera.far_clip)) {
      camera.far_clip = 100.0;
    }

    var aspectRatio = camera.image_size.x / camera.image_size.y;

    // FOV: THREE uses 1) vertical instead of horizontal FOV, 2) degree instead of radians,
    // FOV conversion taken from: http://wiki.panotools.org/Field_of_View
    // aspect ratio inverted because it is given in sensor.camera as width/height
    var vFOV = 2 * Math.atan(Math.tan(camera.horizontal_fov / 2.0) * (1.0 / aspectRatio));
    var camFOV = THREE.Math.radToDeg(vFOV);
    var camNear = camera.near_clip;
    var camFar = camera.far_clip;

    var cameraParams = {
      width: camera.image_size.x,
      height: camera.image_size.y,
      aspectRatio: aspectRatio,
      fov: camFOV,
      near: camNear,
      far: camFar
    };

    var viewManager = this.scene.viewManager;
    var viewName = modelName +' (' + sensor.name+')';
    var view = viewManager.createView(viewName, cameraParams);
    if (!view) {
      console.error('GZ3D.GZIface.createSensorFromMsg() - failed to create view ' + viewName);
      return;
    }
    view.type = sensor.type;
    view.topic = sensor.topic;

    sensorObj.add(view.camera);
  }

  return sensorObj;
};

GZ3D.GZIface.prototype.parseUri = function(uri)
{
  var uriPath = GZ3D.assetsPath;
  var idx = uri.indexOf('://');
  if (idx > 0)
  {
    idx +=3;
  }
  return uriPath + '/' + uri.substring(idx);
};

GZ3D.GZIface.prototype.createGeom = function(geom, material, parent, modelScale)
{
  var obj;
  var uriPath = GZ3D.assetsPath;
  var that = this;
  var mat = this.parseMaterial(material);
  var defaultMat = {diffuse:[0.7,0.7,0.7], flatShading: THREE.SmoothShading};

  //geometries' sizes in scene messages are scaled, must un-scale them first
  //cfr. physics::Link::UpdateVisualGeomSDF
  if (geom.box)
  {
    var unScaledSize = (new THREE.Vector3().copy(geom.box.size)).divide(modelScale);
    obj = this.scene.createBox(unScaledSize.x, unScaledSize.y, unScaledSize.z);
    if (!mat) {mat = defaultMat;}
  }
  else if (geom.cylinder)
  {
    var unscaledRadiusCylinder = geom.cylinder.radius / Math.max(modelScale.x, modelScale.y);
    var unScaledLength = geom.cylinder.length / modelScale.z;
    obj = this.scene.createCylinder(unscaledRadiusCylinder, unScaledLength);
    if (!mat) {mat = defaultMat;}
  }
  else if (geom.sphere)
  {
    var unscaledRadiusSphere = geom.sphere.radius / Math.max(modelScale.x, modelScale.y, modelScale.z);
    obj = this.scene.createSphere(unscaledRadiusSphere);
    if (!mat) {mat = defaultMat;}
  }
  else if (geom.plane)
  {
    obj = this.scene.createPlane(geom.plane.normal.x, geom.plane.normal.y,
    geom.plane.normal.z, geom.plane.size.x, geom.plane.size.y);
    if (!mat) {mat = defaultMat;}
  }
  else if (geom.mesh)
  {
    // get model name which the mesh is in
    var rootModel = parent;
    while (rootModel.parent)
    {
      rootModel = rootModel.parent;
    }

    var isCollModel = rootModel.name.indexOf('COLLISION_VISUAL') >= 0 ;

    // find model from database, download the mesh if it exists
    // var manifestXML;
    // var manifestURI = GAZEBO_MODEL_DATABASE_URI + '/manifest.xml';
    // var request = new XMLHttpRequest();
    // request.open('GET', manifestURI, false);
    // request.onreadystatechange = function(){
    //   if (request.readyState === 4)
    //   {
    //     if (request.status === 200 || request.status === 0)
    //     {
    //         manifestXML = request.responseXML;
    //     }
    //   }
    // };
    // request.send();

    // var uriPath;
    // var modelAvailable = false;
    // var modelsElem = manifestXML.getElementsByTagName('models')[0];
    // var i;
    // for (i = 0; i < modelsElem.getElementsByTagName('uri').length; ++i)
    // {
    //   var uri = modelsElem.getElementsByTagName('uri')[i];
    //   var model = uri.substring(uri.indexOf('://') + 3);
    //   if (model === rootModel)
    //   {
    //     modelAvailable = true;
    //   }
    // }

    // if (modelAvailable)
    {
      var meshUri = geom.mesh.filename;
      var submesh = geom.mesh.submesh;
      var centerSubmesh = geom.mesh.center_submesh;

      var uriType = meshUri.substring(0, meshUri.indexOf('://'));
      if (uriType === 'file' || uriType === 'model')
      {
        var modelName = meshUri.substring(meshUri.indexOf('://') + 3);
        if (geom.mesh.scale)
        {
          parent.scale.x = geom.mesh.scale.x;
          parent.scale.y = geom.mesh.scale.y;
          parent.scale.z = geom.mesh.scale.z;
        }

        var modelUri = uriPath + '/' + modelName;
        var modelCacheKey = modelUri;

        if (isCollModel)
        {
          modelCacheKey += '__COLLISION_VISUAL__';
        }

        if (modelCacheKey in this.scene.cachedModels)
        {
          var cachedData = this.scene.cachedModels[modelCacheKey];

          if (cachedData.referenceObject)
          {
            parent.add(cachedData.referenceObject.clone());
            loadGeom(parent);
          }
          else
          {
            cachedData.objects.push(parent);
          }
        }
        else
        {
          this.scene.cachedModels[modelCacheKey] =
          {
            referenceObject:null,
            objects:[parent]
          };

          // Progress update: Add this asset to the assetProgressArray, always do this before async call
          // for dae-s below so that asset list is the proper length for splash progress without blocking
          var element = {};
          element.id = parent.name;
          element.url = modelUri;
          element.progress = 0;
          element.totalSize = 0;
          element.done = false;
          GZ3D.assetProgressData.assets.push(element);

          // HBP Change (Luc): we assume that all requested collada files are
          // are web-compliant
          if (modelUri.indexOf('.dae') !== -1)
          {
            var materialName = parent.name + '::' + element.url;
            that.entityMaterial[materialName] = mat;

            that.scene.loadMesh(element.url, submesh,
                centerSubmesh, function(dae) {
                  if (that.entityMaterial[materialName])
                  {
                    var allChildren = [];
                    dae.getDescendants(allChildren);
                    for (var c = 0; c < allChildren.length; ++c)
                    {
                      if (allChildren[c] instanceof THREE.Mesh)
                      {
                        that.scene.setMaterial(allChildren[c],
                            that.entityMaterial[materialName]);
                      }
                    }
                  }

                  cachedData = that.scene.cachedModels[modelCacheKey];
                  cachedData.referenceObject = dae;
                  for(var i = 0; i<cachedData.objects.length; i++)
                  {
                    cachedData.objects[i].add( (i===0) ? dae:dae.clone() );
                    loadGeom(cachedData.objects[i]);
                  }

                  // Progress update: execute callback
                  element.done = true;
                  if (GZ3D.assetProgressCallback) {
                    GZ3D.assetProgressCallback(GZ3D.assetProgressData);
                  }
                }, function(progress) {
                  element.progress = progress.loaded;
                  element.totalSize = progress.total;
                  element.error = progress.error;
                  if (GZ3D.assetProgressCallback) {
                    GZ3D.assetProgressCallback(GZ3D.assetProgressData);
                  }
                });
          }

          // non-dae mesh, not supported by the mesh pipeline, log and display a loading error
          else {
            console.error('Unsupported model mesh, non dae file: ' + modelUri);
            element.error = true;
            if (GZ3D.assetProgressCallback) {
              GZ3D.assetProgressCallback(GZ3D.assetProgressData);
            }
          }
        }
      }
    }
  }
  else if (geom.heightmap)
  {
    var request = new ROSLIB.ServiceRequest({
      name : that.scene.name
    });

    // redirect the texture paths to the assets dir
    var textures = geom.heightmap.texture;
    for ( var k = 0; k < textures.length; ++k)
    {
      textures[k].diffuse = this.parseUri(textures[k].diffuse);
      textures[k].normal = this.parseUri(textures[k].normal);
    }

    var sizes = geom.heightmap.size;

    // send service request and load heightmap on response
    this.heightmapDataService.callService(request,
        function(result)
        {
          var heightmap = result.heightmap;
          // gazebo heightmap is always square shaped,
          // and a dimension of: 2^N + 1
          that.scene.loadHeightmap(heightmap.heights, heightmap.size.x,
              heightmap.size.y, heightmap.width, heightmap.height,
              heightmap.origin, textures,
              geom.heightmap.blend, parent);
            //console.log('Result for service call on ' + result);
        });

    //this.scene.loadHeightmap(parent)
  }

  if (obj)
  {
    if (mat)
    {
      // texture mapping for simple shapes and planes only,
      // not used by mesh and terrain
      this.scene.setMaterial(obj, mat);
    }
    obj.updateMatrix();
    parent.add(obj);
    loadGeom(parent);
  }

  function loadGeom(visualObj)
  {
    var allChildren = [];
    visualObj.getDescendants(allChildren);
    for (var c = 0; c < allChildren.length; ++c)
    {
      if (allChildren[c] instanceof THREE.Mesh)
      {
        allChildren[c].castShadow = visualObj.castShadow===undefined;
        allChildren[c].receiveShadow = visualObj.receiveShadow===undefined;

        if (visualObj.castShadow)
        {
          allChildren[c].castShadow = visualObj.castShadow;
        }
        if (visualObj.receiveShadow)
        {
          allChildren[c].receiveShadow = visualObj.receiveShadow;
        }

        if (visualObj.name !== undefined && visualObj.name.indexOf('COLLISION_VISUAL') >= 0)
        {
          allChildren[c].castShadow = false;
          allChildren[c].receiveShadow = false;

          allChildren[c].visible = that.scene.showCollisions || visualObj.visible;
        }
      }
    }

    that.scene.applyComposerSettingsToModel(visualObj);
  }
};

GZ3D.GZIface.prototype.applyMaterial = function(obj, mat)
{
  if (obj)
  {
    if (mat)
    {
      obj.material = new THREE.MeshPhongMaterial();
      var emissive = mat.emissive;
      if (emissive)
      {
        obj.material.emissive.setRGB(emissive[0], emissive[1], emissive[2]);
      }
      var diffuse = mat.diffuse;
      if (diffuse)
      {
        obj.material.color.setRGB(diffuse[0], diffuse[1], diffuse[2]);
      }
      var specular = mat.specular;
      if (specular)
      {
        obj.material.specular.setRGB(specular[0], specular[1], specular[2]);
      }
      var opacity = mat.opacity;
      if (opacity)
      {
        if (opacity < 1)
        {
          obj.material.transparent = true;
          obj.material.opacity = opacity;
        }
      }

      if (mat.texture)
      {
        obj.material.map = THREE.ImageUtils.loadTexture(mat.texture);
      }
      if (mat.normalMap)
      {
        obj.material.normalMap = THREE.ImageUtils.loadTexture(mat.normalMap);
      }
    }
  }
};

GZ3D.GZIface.prototype.parseMaterial = function(material)
{
  if (!material)
  {
    return null;
  }

  var uriPath = GZ3D.assetsPath;//'assets';
  var texture;
  var normalMap;
  var textureUri;
  var ambient;
  var diffuse;
  var emissive;
  var specular;
  var opacity;
  var scale;
  var mat;

  function setMatRGB(dest, src)
  {
    if (src)  {return [src.r, src.g, src.b, src.a ];}
    if (dest) {return dest;}
  }

  // get texture from material script
  var script  = material.script;
  if (script)
  {
    if (script.uri.length > 0)
    {
      if (script.name)
      {
        mat = this.material[script.name];
        if (mat)
        {
          ambient = setMatRGB(mat['ambient'],material['ambient']);
          diffuse = setMatRGB(mat['diffuse'],material['diffuse']);
          emissive = setMatRGB(mat['emissive'],material['emissive']);
          specular = setMatRGB(mat['specular'],material['specular']);

          if (ambient)
          {
            var maxVal = Math.max(Math.max(ambient[0],ambient[1]),ambient[2]) ;
            if (maxVal)
            {
              // ThreeJS does not support ambient in material - apply the ambient only if it has a color
              var color = [ambient[0]/maxVal,ambient[1]/maxVal,ambient[2]/maxVal,1.0];

              if (diffuse)
              {
                if (Math.abs(diffuse[0]-diffuse[1])< Number.EPSILON && Math.abs(diffuse[1]-diffuse[2])< Number.EPSILON)
                {
                  diffuse[0] *= color[0];
                  diffuse[1] *= color[1];
                  diffuse[2] *= color[2];
                }
              }
              else
              {
                diffuse = color;
              }
            }
          }

          opacity = mat['opacity'];
          scale = mat['scale'];

          var textureName = mat['texture'];
          if (textureName)
          {
            for (var i = 0; i < script.uri.length; ++i)
            {
              var type = script.uri[i].substring(0,
                    script.uri[i].indexOf('://'));

              if (type === 'model')
              {
                if (script.uri[i].indexOf('textures') > 0)
                {
                  textureUri = script.uri[i].substring(
                      script.uri[i].indexOf('://') + 3);
                  break;
                }
              }
              else if (type === 'file')
              {
                if (script.uri[i].indexOf('materials') > 0)
                {
                  textureUri = script.uri[i].substring(
                      script.uri[i].indexOf('://') + 3,
                      script.uri[i].indexOf('materials') + 9) + '/textures';
                  break;
                }
              }
            }
            if (textureUri)
            {
              texture = uriPath + '/' +
                  textureUri  + '/' + textureName;
            }
          }
        }
      }
    }
  }

  // normal map
  if (material.normal_map)
  {
    var mapUri;
    if (material.normal_map.indexOf('://') > 0)
    {
      mapUri = material.normal_map.substring(
          material.normal_map.indexOf('://') + 3,
          material.normal_map.lastIndexOf('/'));
    }
    else
    {
      mapUri = textureUri;
    }
    if (mapUri)
    {
      var startIndex = material.normal_map.lastIndexOf('/') + 1;
      if (startIndex < 0)
      {
        startIndex = 0;
      }
      var normalMapName = material.normal_map.substr(startIndex,
          material.normal_map.lastIndexOf('.') - startIndex);
      normalMap = uriPath + '/' +
        mapUri  + '/' + normalMapName + '.png';
    }
  }

  return {
      texture: texture,
      normalMap: normalMap,
      ambient: ambient,
      emissive: emissive,
      diffuse: diffuse,
      specular: specular,
      opacity: opacity,
      scale: scale
  };
};


/*GZ3D.GZIface.prototype.createGeom = function(geom, material, parent)
{
  var obj;

  var uriPath = 'assets';
  var texture;
  var normalMap;
  var textureUri;
  var mat;
  if (material)
  {
    // get texture from material script
    var script  = material.script;
    if (script)
    {
      if (script.uri.length > 0)
      {
        if (script.name)
        {
          mat = this.material[script.name];
          if (mat)
          {
            var textureName = mat['texture'];
            if (textureName)
            {
              for (var i = 0; i < script.uri.length; ++i)
              {
                var type = script.uri[i].substring(0,
                      script.uri[i].indexOf('://'));

                if (type === 'model')
                {
                  if (script.uri[i].indexOf('textures') > 0)
                  {
                    textureUri = script.uri[i].substring(
                        script.uri[i].indexOf('://') + 3);
                    break;
                  }
                }
                else if (type === 'file')
                {
                  if (script.uri[i].indexOf('materials') > 0)
                  {
                    textureUri = script.uri[i].substring(
                        script.uri[i].indexOf('://') + 3,
                        script.uri[i].indexOf('materials') + 9) + '/textures';
                    break;
                  }
                }
              }
              if (textureUri)
              {
                texture = uriPath + '/' +
                    textureUri  + '/' + textureName;
              }
            }
          }
        }
      }
    }
    // normal map
    if (material.normal_map)
    {
      var mapUri;
      if (material.normal_map.indexOf('://') > 0)
      {
        mapUri = material.normal_map.substring(
            material.normal_map.indexOf('://') + 3,
            material.normal_map.lastIndexOf('/'));
      }
      else
      {
        mapUri = textureUri;
      }
      if (mapUri)
      {
        var startIndex = material.normal_map.lastIndexOf('/') + 1;
        if (startIndex < 0)
        {
          startIndex = 0;
        }
        var normalMapName = material.normal_map.substr(startIndex,
            material.normal_map.lastIndexOf('.') - startIndex);
        normalMap = uriPath + '/' +
          mapUri  + '/' + normalMapName + '.png';
      }

    }
  }

  if (geom.box)
  {
    obj = this.scene.createBox(geom.box.size.x, geom.box.size.y,
        geom.box.size.z);
  }
  else if (geom.cylinder)
  {
    obj = this.scene.createCylinder(geom.cylinder.radius,
        geom.cylinder.length);
  }
  else if (geom.sphere)
  {
    obj = this.scene.createSphere(geom.sphere.radius);
  }
  else if (geom.plane)
  {
    obj = this.scene.createPlane(geom.plane.normal.x, geom.plane.normal.y,
        geom.plane.normal.z, geom.plane.size.x, geom.plane.size.y);
  }
  else if (geom.mesh)
  {
    // get model name which the mesh is in
    var rootModel = parent;
    while (rootModel.parent)
    {
      rootModel = rootModel.parent;
    }

    {
      var meshUri = geom.mesh.filename;
      var submesh = geom.mesh.submesh;
      var centerSubmesh = geom.mesh.center_submesh;

      console.log(geom.mesh.filename + ' ' + submesh);

      var uriType = meshUri.substring(0, meshUri.indexOf('://'));
      if (uriType === 'file' || uriType === 'model')
      {
        var modelName = meshUri.substring(meshUri.indexOf('://') + 3);
        if (geom.mesh.scale)
        {
          parent.scale.x = geom.mesh.scale.x;
          parent.scale.y = geom.mesh.scale.y;
          parent.scale.z = geom.mesh.scale.z;
        }

        this.scene.loadMesh(uriPath + '/' + modelName, submesh, centerSubmesh,
            texture, normalMap, parent);
      }
    }
  }
  else if (geom.heightmap)
  {
    var that = this;
    var request = new ROSLIB.ServiceRequest({
      name : that.scene.name
    });

    // redirect the texture paths to the assets dir
    var textures = geom.heightmap.texture;
    for ( var k = 0; k < textures.length; ++k)
    {
      textures[k].diffuse = this.parseUri(textures[k].diffuse);
      textures[k].normal = this.parseUri(textures[k].normal);
    }

    var sizes = geom.heightmap.size;

    // send service request and load heightmap on response
    this.heightmapDataService.callService(request,
        function(result)
        {
          var heightmap = result.heightmap;
          // gazebo heightmap is always square shaped,
          // and a dimension of: 2^N + 1
          that.scene.loadHeightmap(heightmap.heights, heightmap.size.x,
              heightmap.size.y, heightmap.width, heightmap.height,
              heightmap.origin, textures,
              geom.heightmap.blend, parent);
            //console.log('Result for service call on ' + result);
        });

    //this.scene.loadHeightmap(parent)
  }

  // texture mapping for simple shapes and planes only,
  // not used by mesh and terrain
  if (obj)
  {

    if (mat)
    {
      obj.material = new THREE.MeshPhongMaterial();

      var ambient = mat['ambient'];
      if (ambient)
      {
        obj.material.emissive.setRGB(ambient[0], ambient[1], ambient[2]);
      }
      var diffuse = mat['diffuse'];
      if (diffuse)
      {
        obj.material.color.setRGB(diffuse[0], diffuse[1], diffuse[2]);
      }
      var specular = mat['specular'];
      if (specular)
      {
        obj.material.specular.setRGB(specular[0], specular[1], specular[2]);
      }
      var opacity = mat['opacity'];
      if (opacity)
      {
        if (opacity < 1)
        {
          obj.material.transparent = true;
          obj.material.opacity = opacity;
        }
      }

      //this.scene.setMaterial(obj, texture, normalMap);

      if (texture)
      {
        obj.material.map = THREE.ImageUtils.loadTexture(texture);
      }
      if (normalMap)
      {
        obj.material.normalMap = THREE.ImageUtils.loadTexture(normalMap);
      }
    }
    obj.updateMatrix();
    parent.add(obj);
  }
};
*/

/**
 * HBP
 *
 * Manage labels in the 3D scene.
 *
 */

GZ3D.LabelManager = function (gz3dScene)
{
    this.scene = gz3dScene;

    this.init();
};

GZ3D.LabelManager.prototype.init = function ()
{
    this.sensorIcons = {};
    this.perObjectLabels = {};

    this.initMeshIcons();
};

GZ3D.LabelManager.prototype.initMeshIcons = function ()
{
    var loader = new THREE.ColladaLoader();

    var textureLoader = new THREE.TextureLoader();

    this.sensorIcons['generic'] = textureLoader.load('img/3denv/icons/sensor_Generic.png');
    this.sensorIcons['ray'] = textureLoader.load('img/3denv/icons/sensor_Ray.png');
    this.sensorIcons['camera'] = textureLoader.load('img/3denv/icons/sensor_Camera.png');

    var that = this;
    loader.load('img/3denv/icons/sensor.dae', function (collada)
    {
        var dae = collada.scene;
        dae.updateMatrix();

        that.sensorMesh = dae;
    });

    loader.load('img/3denv/icons/joint.dae', function (collada)
    {
        var dae = collada.scene;
        dae.updateMatrix();

        that.jointMesh = dae;
    });
};

GZ3D.LabelManager.prototype.createJoint3DIcon = function (jointObj, joint)
{
    var jointIcon = 'generic';
    var jointIconMesh = this.jointMesh.clone();
    var material = new THREE.MeshBasicMaterial();
    material.map = this.sensorIcons[jointIcon];
    jointIconMesh.children[0].material = material;
    jointIconMesh.name = 'LABEL_INFO_VISUAL';
    jointIconMesh.castShadow = false;
    jointIconMesh.receiveShadow = false;
    jointIconMesh.visible = true;
    jointIconMesh.scale.set(0.8, 0.8, 0.8);
    jointObj.add(jointIconMesh);
    return jointIconMesh;
};

GZ3D.LabelManager.prototype.createSensor3DIcon = function (sensorObj, sensor)
{
    var sensorIcon = (sensor.type in this.sensorIcons) ? sensor.type : 'generic';
    var sensorIconMesh = this.sensorMesh.clone();
    var material = new THREE.MeshBasicMaterial();
    material.map = this.sensorIcons[sensorIcon];
    sensorIconMesh.children[0].material = material;
    sensorIconMesh.name = 'LABEL_INFO_VISUAL';
    sensorIconMesh.castShadow = false;
    sensorIconMesh.receiveShadow = false;
    sensorIconMesh.visible = true;
    sensorIconMesh.scale.set(0.8, 0.8, 0.8);
    sensorObj.add(sensorIconMesh);
    return sensorIconMesh;
};

GZ3D.LabelManager.prototype.createLabel = function (text, link, parent)
{
    // function for drawing rounded rectangles
    var roundRect = function (ctx, x, y, w, h, r)
    {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
        context.lineWidth = 5;
        ctx.stroke();
    };

    var canvas = document.createElement('canvas');
    var size = 0.4;
    canvas.width = 512;
    canvas.height = 64;
    var context = canvas.getContext('2d');
    context.textAlign = 'center';

    context.font = '32px Arial';

    var boxSize = context.measureText(text).width + 30;
    var boxHeight = 45;
    if (boxSize > canvas.width)
    {
        boxSize = canvas.width;
    }

    if (link)
    {
        context.fillStyle = 'black';
        context.strokeStyle = 'gray';
    }
    else
    {
        context.fillStyle = 'white';
        context.strokeStyle = 'gray';
    } roundRect(context, (canvas.width / 2) - (boxSize / 2), 2, boxSize, boxHeight, 15);

    roundRect(context, (canvas.width / 2) - (boxSize / 2), 2, boxSize, boxHeight, 15);

    if (link)
    {
        context.fillStyle = 'white';
    }
    else
    {
        context.fillStyle = 'black';
    }

    context.fillText(text, canvas.width / 2, canvas.height / 2);
    var texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;

    var geometry = new THREE.PlaneGeometry(size, (canvas.height / canvas.width) * size);
    var material = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, map: texture });
    material.transparent = true;
    material.depthTest = false;
    material.depthWrite = false;

    var plane = new THREE.Mesh(geometry, material);
    plane._ignoreRaycast = true;
    plane.visible = true;
    plane.name = 'LABEL_INFO_VISUAL';

    var hitGeometry = new THREE.PlaneGeometry(size / (canvas.width / boxSize), size / ((canvas.height / boxHeight) / (canvas.height / canvas.width)));
    var hitPlane = new THREE.Mesh(hitGeometry, material);
    hitPlane.visible = false;
    hitPlane._raycastOnly = true;
    hitPlane.name = 'LABEL_INFO_VISUAL';

    if (!parent._relatedLabels)
    {
        parent._relatedLabels = [];
    }

    parent._relatedLabels.push(hitPlane);
    parent._relatedLabels.push(plane);

    this.scene.scene.add(hitPlane);
    this.scene.scene.add(plane);

    hitPlane._labelOwner = parent;
    plane._labelOwner = parent;

    plane._hitPlane = hitPlane;

    return plane;
};

GZ3D.LabelManager.prototype.onRender = function ()
{
    var tempVector = new THREE.Vector3();
    var bbox = new THREE.Box3();
    var nodePos = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();

    for (var key in this.perObjectLabels)
    {
        if (this.perObjectLabels.hasOwnProperty(key))
        {
            var labelInfoList = this.perObjectLabels[key];

            if (labelInfoList.length && labelInfoList[0].root._labelsVisible)
            {
                var root = labelInfoList[0].root;
                var labelPos = [];

                bbox.setFromObject(root);
                var bsphere = bbox.getBoundingSphere();

                for(var i=0;i<labelInfoList.length;i++)
                {
                    var labelInfo = labelInfoList[i];
                    var node = labelInfo.node;
                    var line = labelInfo.line;

                    // Label

                    node.matrixWorld.decompose(nodePos, q, s);

                    var dir = nodePos.clone();
                    dir.sub(bsphere.center);

                    var l = dir.length();

                    if (l<=Number.EPSILON || isNaN(l))
                    {
                        dir.set(0,0,-1);
                    }
                    else
                    {
                        dir.divideScalar(l);
                    }

                    dir.multiplyScalar(bsphere.radius);

                    var finalLabelPos = bsphere.center.clone();
                    finalLabelPos.add(dir);

                    finalLabelPos.z += 0.25;

                    if (finalLabelPos.z<bbox.min.z)
                    {
                        finalLabelPos.z = bbox.min.z+0.1;

                        dir.set(finalLabelPos.x,finalLabelPos.y,0);
                        dir.normalize();
                        dir.multiplyScalar(bsphere.radius+0.1);

                        finalLabelPos = bsphere.center.clone();
                        finalLabelPos.add(dir);
                    }

                    // Check if it is too close from another label
                    // We keep it simple, because it has to be in real-time

                    dir.normalize();
                    dir.multiplyScalar(0.08);

                    for(var li = 0; li<labelPos.length; li++)
                    {
                        tempVector.copy(finalLabelPos);
                        tempVector.sub(labelPos[li]);

                        if (tempVector.length()<0.1)
                        {
                            finalLabelPos.add(dir);
                        }
                    }

                    labelPos.push(finalLabelPos);
                    labelInfo.label.position.copy(finalLabelPos);
                    labelInfo.label.quaternion.copy(this.scene.camera.quaternion);

                    if (labelInfo.label._hitPlane)
                    {
                        labelInfo.label._hitPlane.position.copy(finalLabelPos);
                        labelInfo.label._hitPlane.quaternion.copy(this.scene.camera.quaternion);
                    }

                    // Line

                    line.position.copy(nodePos);

                    if (!(line.geometry.vertices[1].equals(nodePos)))
                    {
                        line.geometry.vertices[1] = labelInfo.label.position.clone().sub(nodePos);
                        line.geometry.verticesNeedUpdate = true;
                    }
                }
            }
        }
    }
};

GZ3D.LabelManager.prototype.createLineLabel = function (parent)
{
    var lineGeometry = new THREE.Geometry();
    var vertArray = lineGeometry.vertices;
    vertArray.push( new THREE.Vector3(0,0,0), new THREE.Vector3(1, 1, 1) );

    var lineMaterial = new THREE.LineBasicMaterial( { color: 0x888888, linewidth: 3 });
    var line = new THREE.Line( lineGeometry, lineMaterial );
    lineGeometry.computeLineDistances();

    this.scene.scene.add(line);

    line.name = 'LABEL_INFO_VISUAL';
    line._ignoreRaycast = true;

    if (!parent._relatedLabels)
    {
        parent._relatedLabels = [];
    }

    parent._relatedLabels.push(line);

    return line;
};


GZ3D.LabelManager.prototype.setLabelInfoVisible = function (root, visible)
{
    var that = this;
    var iconMesh;
    var labelMesh;
    var labelLine;

    root._labelsVisible = visible;

    root.traverse(function (node)
    {
        if (node._linkSource)
        {
            if (!node._labelInitialized && visible)
            {
                node._labelInitialized = true;
                iconMesh = that.createJoint3DIcon(node,node._linkSource);
                labelLine = that.createLineLabel(node);
                labelMesh = that.createLabel(node._linkSource.name, true, node);

                if (!that.perObjectLabels[root.uuid])
                {
                    that.perObjectLabels[root.uuid] = [];
                }

                that.perObjectLabels[root.uuid].push({ 'root': root, 'node': node, 'icon3d': iconMesh, 'label': labelMesh, 'line':labelLine });
            }

        }
        else if (node._sensorSource)
        {
            if (!node._labelInitialized && visible)
            {
                node._labelInitialized = true;
                iconMesh = that.createSensor3DIcon(node, node._sensorSource);
                labelLine = that.createLineLabel(node);
                labelMesh = that.createLabel(node._sensorSource.name, false, node);

                if (!that.perObjectLabels[root.uuid])
                {
                    that.perObjectLabels[root.uuid] = [];
                }

                that.perObjectLabels[root.uuid].push({ 'root': root, 'node': node, 'icon3d': iconMesh, 'label': labelMesh, 'line':labelLine  });
            }
        }
        else if (node.name === 'LABEL_INFO_VISUAL' && !node._raycastOnly)
        {
            node.visible = visible;
        }

        if (node._relatedLabels)
        {
            for (var i = 0; i < node._relatedLabels.length; i++)
            {
                if (!node._relatedLabels[i]._raycastOnly)
                {
                    node._relatedLabels[i].visible = visible;
                }
            }
        }

    });

};


/**
 * GZ3D Levels. Simply color levels shader.
 *
 */

GZ3D.LevelsShader = {

	uniforms: {

		'tDiffuse': { value: null },

		// Levels parameters

		'inBlack': { value: 0.0 },
		'inWhite': { value: 1.0 },
		'inGamma': { value: 1.0 },

		'outBlack': { value: 0.0 },
		'outWhite': { value: 1.0 },
	},

	vertexShader: [

		'varying vec2 vUv;',

		'void main() {',

		'vUv = uv;',
		'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',

		'}'

	].join('\n'),

	fragmentShader: [

		'uniform float inBlack,inWhite,inGamma,outBlack,outWhite;',
		'uniform sampler2D tDiffuse;',

		'varying vec2 vUv;',

		'void main() {',

		'vec4 texel = texture2D( tDiffuse, vUv );',

		'float outf =  (outWhite - outBlack);',

		'texel[0] = pow((texel[0] - inBlack) / (inWhite - inBlack),inGamma) * outf + outBlack;',
		'texel[1] = pow((texel[1] - inBlack) / (inWhite - inBlack),inGamma) * outf + outBlack;',
		'texel[2] = pow((texel[2] - inBlack) / (inWhite - inBlack),inGamma) * outf + outBlack;',

		'gl_FragColor = texel;',

		'}'

	].join('\n')

};



/**
 * This shader is based on THREE.LuminosityHighPassShader of the ThreeJS examples.
 */

GZ3D.LuminosityHighPassShader = {

  shaderID: 'luminosityHighPass',

	uniforms: {

		'tDiffuse': { type: 't', value: null },
		'luminosityThreshold': { type: 'f', value: 1.0 },
		'smoothWidth': { type: 'f', value: 1.0 },
		'defaultColor': { type: 'c', value: new THREE.Color( 0x000000 ) },
		'defaultOpacity':  { type: 'f', value: 0.0 },

	},

	vertexShader: [

		'varying vec2 vUv;',

		'void main() {',

			'vUv = uv;',

			'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',

		'}'

	].join('\n'),

	fragmentShader: [

		'uniform sampler2D tDiffuse;',
		'uniform vec3 defaultColor;',
		'uniform float defaultOpacity;',
		'uniform float luminosityThreshold;',
		'uniform float smoothWidth;',

		'varying vec2 vUv;',

		'void main() {',

			'vec4 texel = texture2D( tDiffuse, vUv );',

			'vec3 luma = vec3( 0.299, 0.587, 0.114 );',

			'float v = dot( texel.xyz, luma );',

			'vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );',

			'float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );',

			'gl_FragColor = mix( outputColor, texel, alpha );',

		'}'

	].join('\n')

};

// Based on TransformControls.js
// original author: arodic / https://github.com/arodic


GZ3D.TRANSFORM_TYPE_NAME_PREFIX = {
  TRANSLATE: 'T',
  SCALE:     'S',
  ROTATE:    'R',
  ALL:       'A',
  NONE:      'N'
};

/**
 * Manipulator to perform translate, scale and rotate transforms on objects
 * within the scene.
 * @constructor
 */
GZ3D.Manipulator = function(gz3dScene, mobile)
{
  this.gz3dScene = gz3dScene;
  this.userView = this.gz3dScene.viewManager.mainUserView;

  // Mobile / desktop
  this.mobile = (mobile !== undefined) ? mobile : false;

  // Object to be manipulated
  this.object = undefined;

  // translate / rotate / scale
  this.mode = 'translate';

  // world / local
  this.space = 'world';

  // axis lock

  this.lockXAxis = false;
  this.lockYAxis = false;
  this.lockZAxis = false;

  // hovered used for backwards compatibility
  // Whenever it wasn't an issue, hovered and active were combined
  // into selected
  this.hovered = false;
  this.selected = 'null';

  this.scale = 1;

  this.snapDist = null;
  this.modifierAxis = new THREE.Vector3(1, 1, 1);
  this.gizmo = new THREE.Object3D();

  this.pickerNames = [];
  this.pickerMeshes = [];

  var scope = this;

  var changeEvent = function(_transform) { //TRANSFORM_TYPE_NAME_PREFIX

    if(_transform) {
        return {type: 'change', transform: _transform};
    } else {
        return {type: 'change', transform: GZ3D.TRANSFORM_TYPE_NAME_PREFIX.NONE};
    }
  };

  var ray = new THREE.Raycaster();
  var pointerVector = new THREE.Vector3();
  var startRay = new THREE.Ray();
  var lastRay = new THREE.Ray();

  var point = new THREE.Vector3();
  var offset = new THREE.Vector3();

  var rotation = new THREE.Vector3();
  var offsetRotation = new THREE.Vector3();
  var scale = 1;

  var lookAtMatrix = new THREE.Matrix4();
  var eye = new THREE.Vector3();

  var tempMatrix = new THREE.Matrix4();
  var tempVector = new THREE.Vector3();
  var tempQuaternion = new THREE.Quaternion();
  var unitX = new THREE.Vector3(1, 0, 0);
  var unitY = new THREE.Vector3(0, 1, 0);
  var unitZ = new THREE.Vector3(0, 0, 1);

  var quaternionXYZ = new THREE.Quaternion();
  var quaternionX = new THREE.Quaternion();
  var quaternionY = new THREE.Quaternion();
  var quaternionZ = new THREE.Quaternion();
  var quaternionE = new THREE.Quaternion();

  var oldPosition = new THREE.Vector3();
  var oldRotationMatrix = new THREE.Matrix4();
  var oldScale = new THREE.Vector3();

  var parentRotationMatrix  = new THREE.Matrix4();
  var parentScale = new THREE.Vector3();

  var worldPosition = new THREE.Vector3();
  var worldRotation = new THREE.Vector3();
  var worldRotationMatrix  = new THREE.Matrix4();
  var camPosition = new THREE.Vector3();

  var hovered = null;
  var hoveredColor = new THREE.Color();

  // Picker currently selected (highlighted)
  var selectedPicker = null;
  var selectedColor = new THREE.Color();

  // Intersection planes
  var intersectionPlanes = {};
  var intersectionPlaneList = ['XY','YZ','XZ'];
  var currentPlane = 'XY';

  var planes = new THREE.Object3D();
  this.gizmo.add(planes);

  for(var i in intersectionPlaneList)
  {
    var currentIntersectionPlane =
        new THREE.Mesh(new THREE.PlaneGeometry(500, 500));

    currentIntersectionPlane.material.side = THREE.DoubleSide;
    currentIntersectionPlane.visible = false;

    intersectionPlanes[intersectionPlaneList[i]] = currentIntersectionPlane;
    planes.add(currentIntersectionPlane);
  }

  intersectionPlanes['YZ'].rotation.set(0, Math.PI/2, 0);
  intersectionPlanes['XZ'].rotation.set(-Math.PI/2, 0, 0);
  bakeTransformations(intersectionPlanes['YZ']);
  bakeTransformations(intersectionPlanes['XZ']);

  // Geometries

  var pickerAxes = {};
  var displayAxes = {};

  var HandleMaterial = function(color, over, opacity)
  {
    var material = new THREE.MeshBasicMaterial();
    material.color = color;
    if(over)
    {
      material.side = THREE.DoubleSide;
      material.depthTest = false;
      material.depthWrite = false;
    }
    material.opacity = opacity !== undefined ? opacity : 0.5;
    material.transparent = true;
    return material;
  };

  var LineMaterial = function(color, opacity)
  {
    var material = new THREE.LineBasicMaterial();
    material.color = color;
    material.depthTest = false;
    material.depthWrite = false;
    material.opacity = opacity !== undefined ? opacity : 1;
    material.transparent = true;
    material.linewidth = 2;
    return material;
  };

  // Colors
  var white = new THREE.Color(0xffffff);
  var gray = new THREE.Color(0x808080);
  var red = new THREE.Color(0xff0000);
  var green = new THREE.Color(0x00ff00);
  var blue = new THREE.Color(0x0000ff);
  var cyan = new THREE.Color(0x00ffff);
  var magenta = new THREE.Color(0xff00ff);
  var yellow = new THREE.Color(0xffff00);

  function buildArrowManipulator(transformType) {// 'translate' or 'scale'

    var geometry, mesh;

    var transformTypePrefix =
      (transformType === 'translate') ? GZ3D.TRANSFORM_TYPE_NAME_PREFIX.TRANSLATE: GZ3D.TRANSFORM_TYPE_NAME_PREFIX.SCALE;

    pickerAxes[transformType] = new THREE.Object3D();
    displayAxes[transformType] = new THREE.Object3D();
    scope.gizmo.add(pickerAxes[transformType]);
    scope.gizmo.add(displayAxes[transformType]);

    // Picker cylinder
    if(scope.mobile) {
      geometry = new THREE.CylinderGeometry(0.5, 0.01, 1.4, 10, 1, false);
    }
    else {
      geometry = new THREE.CylinderGeometry(0.2, 0.1, 0.8, 4, 1, false);
    }

    mesh = new THREE.Mesh(geometry, new HandleMaterial(red, true));
    mesh.position.x = 0.7;
    mesh.rotation.z = -Math.PI/2;
    bakeTransformations(mesh);
    mesh.name = transformTypePrefix + 'X';
    pickerAxes[transformType].add(mesh);
    scope.pickerNames.push(mesh.name);
    scope.pickerMeshes[mesh.name] = mesh;

    mesh = new THREE.Mesh(geometry, new HandleMaterial(green, true));
    mesh.position.y = 0.7;
    bakeTransformations(mesh);
    mesh.name = transformTypePrefix + 'Y';
    pickerAxes[transformType].add(mesh);
    scope.pickerNames.push(mesh.name);
    scope.pickerMeshes[mesh.name] = mesh;

    mesh = new THREE.Mesh(geometry, new HandleMaterial(blue, true));
    mesh.position.z = 0.7;
    mesh.rotation.x = Math.PI/2;
    bakeTransformations(mesh);
    mesh.name = transformTypePrefix + 'Z';
    pickerAxes[transformType].add(mesh);
    scope.pickerNames.push(mesh.name);
    scope.pickerMeshes[mesh.name] = mesh;

    if(scope.mobile)
    {
      // Display cylinder
      geometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 10, 1, false);

      mesh = new THREE.Mesh(geometry, new HandleMaterial(red, true));
      mesh.position.x = 0.5;
      mesh.rotation.z = -Math.PI/2;
      bakeTransformations(mesh);
      mesh.name = transformTypePrefix + 'X';
      displayAxes[transformType].add(mesh);

      mesh = new THREE.Mesh(geometry, new HandleMaterial(green, true));
      mesh.position.y = 0.5;
      bakeTransformations(mesh);
      mesh.name = transformTypePrefix + 'Y';
      displayAxes[transformType].add(mesh);

      mesh = new THREE.Mesh(geometry, new HandleMaterial(blue, true));
      mesh.position.z = 0.5;
      mesh.rotation.x = Math.PI/2;
      bakeTransformations(mesh);
      mesh.name = transformTypePrefix + 'Z';
      displayAxes[transformType].add(mesh);

      // Display arrow tip
      if(transformTypePrefix === GZ3D.TRANSFORM_TYPE_NAME_PREFIX.TRANSLATE) {  // translate -> cone tip
        geometry =  new THREE.CylinderGeometry(0, 0.15, 0.4, 10, 1, false);
      }
      else { // scale -> box tip
        geometry = new THREE.BoxGeometry(0.3, 0.5, 0.3);
      }

      mesh = new THREE.Mesh(geometry, new HandleMaterial(red, true));
      mesh.position.x = 1.2;
      mesh.rotation.z = -Math.PI/2;
      bakeTransformations(mesh);
      mesh.name = transformTypePrefix + 'X';
      displayAxes[transformType].add(mesh);

      mesh = new THREE.Mesh(geometry, new HandleMaterial(green, true));
      mesh.position.y = 1.2;
      bakeTransformations(mesh);
      mesh.name = transformTypePrefix + 'Y';
      displayAxes[transformType].add(mesh);

      mesh = new THREE.Mesh(geometry, new HandleMaterial(blue, true));
      mesh.position.z = 1.2;
      mesh.rotation.x = Math.PI/2;
      bakeTransformations(mesh);
      mesh.name = transformTypePrefix + 'Z';
      displayAxes[transformType].add(mesh);
    }
    else
    {
      // Display lines
      geometry = new THREE.Geometry();
      geometry.vertices.push(
          new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0),
          new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0),
          new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1)
      );
      geometry.colors.push(
          red, red, green, green, blue, blue
      );
      var material = new THREE.LineBasicMaterial({
          vertexColors: THREE.VertexColors,
          depthTest: false,
          depthWrite: false,
          transparent: true,
          linewidth:2
      });
      mesh = new THREE.LineSegments(geometry, material);
      displayAxes[transformType].add(mesh);

      // Display (arrow tip)
      if(transformType === 'translate') { // translate -> cone tip
        geometry = new THREE.CylinderGeometry(0, 0.05, 0.2, 4, 1, true);
      }
      else { // scale -> box tip
        geometry = new THREE.BoxGeometry( 0.1, 0.2, 0.1);
      }

      mesh = new THREE.Mesh(geometry, new HandleMaterial(red, true, 1));
      mesh.position.x = 1.1;
      mesh.rotation.z = -Math.PI/2;
      bakeTransformations(mesh);
      mesh.name = transformTypePrefix + 'X';
      displayAxes[transformType].add(mesh);

      mesh = new THREE.Mesh(geometry, new HandleMaterial(green, true, 1));
      mesh.position.y = 1.1;
      bakeTransformations(mesh);
      mesh.name = transformTypePrefix + 'Y';
      displayAxes[transformType].add(mesh);

      mesh = new THREE.Mesh(geometry, new HandleMaterial(blue, true, 1));
      mesh.position.z = 1.1;
      mesh.rotation.x = Math.PI/2;
      bakeTransformations(mesh);
      mesh.name = transformTypePrefix + 'Z';
      displayAxes[transformType].add(mesh);

      if(transformType === 'translate'){
        // Picker and display octahedron for TXYZ
        var T = transformTypePrefix;
        mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), new HandleMaterial(white, true, 0.25));
        mesh.name = T + 'XYZ';
        scope.pickerNames.push(mesh.name);
        displayAxes[transformType].add(mesh);
        pickerAxes[transformType].add(mesh.clone());

        // Picker and display planes
        geometry = new THREE.PlaneGeometry(0.3, 0.3);

        mesh = new THREE.Mesh(geometry, new HandleMaterial(yellow, 0.25));
        mesh.position.set(0.15, 0.15, 0);
        bakeTransformations(mesh);
        mesh.name = T + 'XY';
        scope.pickerNames.push(mesh.name);
        displayAxes[transformType].add(mesh);
        pickerAxes[transformType].add(mesh.clone());

        mesh = new THREE.Mesh(geometry, new HandleMaterial(cyan, 0.25));
        mesh.position.set(0, 0.15, 0.15);
        mesh.rotation.y = Math.PI/2;
        bakeTransformations(mesh);
        mesh.name = T + 'YZ';
        scope.pickerNames.push(mesh.name);
        displayAxes[transformType].add(mesh);
        pickerAxes[transformType].add(mesh.clone());

        mesh = new THREE.Mesh(geometry, new HandleMaterial(magenta, 0.25));
        mesh.position.set(0.15, 0, 0.15);
        mesh.rotation.x = Math.PI/2;
        bakeTransformations(mesh);
        mesh.name = T + 'XZ';
        scope.pickerNames.push(mesh.name);
        displayAxes[transformType].add(mesh);
        pickerAxes[transformType].add(mesh.clone());
      }
    }
  }

  // Translate
  buildArrowManipulator('translate');

  // Scale
  buildArrowManipulator('scale');

  // Rotate
  var geometry, mesh;

  pickerAxes['rotate'] = new THREE.Object3D();
  displayAxes['rotate'] = new THREE.Object3D();
  this.gizmo.add(pickerAxes['rotate']);
  this.gizmo.add(displayAxes['rotate']);

  // RX, RY, RZ

  // Picker torus
  if(this.mobile)
  {
    geometry = new THREE.TorusGeometry(1, 0.3, 4, 36, 2*Math.PI);
  }
  else
  {
    geometry = new THREE.TorusGeometry(1, 0.15, 4, 6, Math.PI);
  }

  mesh = new THREE.Mesh(geometry, new HandleMaterial(red, false));
  mesh.rotation.z = -Math.PI/2;
  mesh.rotation.y = -Math.PI/2;
  bakeTransformations(mesh);
  mesh.name = 'RX';
  pickerAxes['rotate'].add(mesh);
  this.pickerNames.push(mesh.name);
  this.pickerMeshes[mesh.name] = mesh;

  mesh = new THREE.Mesh(geometry, new HandleMaterial(green, false));
  mesh.rotation.z = Math.PI;
  mesh.rotation.x = -Math.PI/2;
  bakeTransformations(mesh);
  mesh.name = 'RY';
  pickerAxes['rotate'].add(mesh);
  this.pickerNames.push(mesh.name);
  this.pickerMeshes[mesh.name] = mesh;

  mesh = new THREE.Mesh(geometry, new HandleMaterial(blue, false));
  mesh.rotation.z = -Math.PI/2;
  bakeTransformations(mesh);
  mesh.name = 'RZ';
  pickerAxes['rotate'].add(mesh);
  this.pickerNames.push(mesh.name);
  this.pickerMeshes[mesh.name] = mesh;

  if(this.mobile)
  {
    // Display torus
    geometry = new THREE.TorusGeometry(1, 0.1, 4, 36, 2*Math.PI);

    mesh = new THREE.Mesh(geometry, new HandleMaterial(blue, false));
    mesh.rotation.z = -Math.PI/2;
    bakeTransformations(mesh);
    mesh.name = 'RZ';
    displayAxes['rotate'].add(mesh);

    mesh = new THREE.Mesh(geometry, new HandleMaterial(red, false));
    mesh.rotation.z = -Math.PI/2;
    mesh.rotation.y = -Math.PI/2;
    bakeTransformations(mesh);
    mesh.name = 'RX';
    displayAxes['rotate'].add(mesh);

    mesh = new THREE.Mesh(geometry, new HandleMaterial(green, false));
    mesh.rotation.z = Math.PI;
    mesh.rotation.x = -Math.PI/2;
    bakeTransformations(mesh);
    mesh.name = 'RY';
    displayAxes['rotate'].add(mesh);
  }
  else
  {
    // Display circles
    var Circle = function(radius, facing, arc)
    {
      geometry = new THREE.Geometry();
      arc = arc ? arc : 1;
      for(var i = 0; i <= 64 * arc; ++i)
      {
        if(facing === 'x')
        {
          geometry.vertices.push(new THREE.Vector3(
              0, Math.cos(i / 32 * Math.PI), Math.sin(i / 32 * Math.PI))
              .multiplyScalar(radius));
        }
        if(facing === 'y')
        {
          geometry.vertices.push(new THREE.Vector3(
              Math.cos(i / 32 * Math.PI), 0, Math.sin(i / 32 * Math.PI))
              .multiplyScalar(radius));
        }
        if(facing === 'z')
        {
          geometry.vertices.push(new THREE.Vector3(
              Math.sin(i / 32 * Math.PI), Math.cos(i / 32 * Math.PI), 0)
              .multiplyScalar(radius));
        }
      }
      return geometry;
    };

    mesh = new THREE.Line(new Circle(1, 'x', 0.5), new LineMaterial(red));
    mesh.name = 'RX';
    displayAxes['rotate'].add(mesh);

    mesh = new THREE.Line(new Circle(1, 'y', 0.5), new LineMaterial(green));
    mesh.name = 'RY';
    displayAxes['rotate'].add(mesh);

    mesh = new THREE.Line(new Circle(1, 'z', 0.5), new LineMaterial(blue));
    mesh.name = 'RZ';
    displayAxes['rotate'].add(mesh);

    mesh = new THREE.Line(new Circle(1, 'z'), new LineMaterial(gray));
    mesh.name = 'RXYZE';
    this.pickerNames.push(mesh.name);
    displayAxes['rotate'].add(mesh);

    mesh = new THREE.Line(new Circle(1.25, 'z'),
        new LineMaterial(yellow, 0.25));
    mesh.name = 'RE';
    this.pickerNames.push(mesh.name);
    displayAxes['rotate'].add(mesh);

    // Picker spheres
    mesh = new THREE.Mesh(new THREE.SphereGeometry(0.95, 12, 12),
        new HandleMaterial(white, 0.25));
    mesh.name = 'RXYZE';
    pickerAxes['rotate'].add(mesh);
    this.pickerNames.push(mesh.name);

    intersectionPlanes['SPHERE'] = new THREE.Mesh(new
        THREE.SphereGeometry(0.95, 12, 12));
    intersectionPlanes['SPHERE'].visible = false;
    planes.add(intersectionPlanes['SPHERE']);

    mesh = new THREE.Mesh(new THREE.TorusGeometry(1.30, 0.15, 4, 12),
        new HandleMaterial(yellow, 0.25));
    mesh.name = 'RE';
    pickerAxes['rotate'].add(mesh);
    this.pickerNames.push(mesh.name);
  }
  mesh = null;

  /**
   * Attach gizmo to an object
   * @param {THREE.Object3D} - Model to be manipulated
   */
  this.attach = function(object)
  {
    this.object = object;
    this.setMode(scope.mode);

    if(this.mobile)
    {
      this.userView.container.addEventListener('touchstart', onTouchStart, false);
    }
    else
    {
      this.userView.container.addEventListener('mousedown', onMouseDown, false);
      this.userView.container.addEventListener('mousemove', onMouseHover, false);
    }
  };

  /**
   * Detatch gizmo from an object
   * @param {THREE.Object3D} - Model
   */
  this.detach = function(object)
  {
    this.object = undefined;
    this.selected = 'null';

    this.hide();

    if(this.mobile)
    {
      this.userView.container.removeEventListener('touchstart', onTouchStart, false);
    }
    else
    {
      this.userView.container.removeEventListener('mousedown', onMouseDown, false);
      this.userView.container.removeEventListener('mousemove', onMouseHover, false);
    }
  };

  /**
   * Update gizmo's pose and scale
   */
  this.update = function()
  {
    if (this.gz3dScene.manipulationMode !== 'natural')
    {
      setMoveHoverMesh(null);
    }

    if(this.object === undefined)
    {
      return;
    }

    this.object.updateMatrixWorld();
    this.gz3dScene.updateBoundingBox(this.object);

    worldPosition.setFromMatrixPosition(this.object.matrixWorld);

    this.userView.camera.updateMatrixWorld();
    camPosition.setFromMatrixPosition(this.userView.camera.matrixWorld);

    scale = worldPosition.distanceTo(camPosition) / 6 * this.scale;
    this.gizmo.position.copy(worldPosition);
    this.gizmo.scale.set(scale, scale, scale);

    for(var i in this.gizmo.children)
    {
      for(var j in this.gizmo.children[i].children)
      {
        var object = this.gizmo.children[i].children[j];
        var name = object.name;

        if(name.search('E') !== -1)
        {
          lookAtMatrix.lookAt(camPosition, worldPosition,
              tempVector.set(0, 1, 0));
          object.rotation.setFromRotationMatrix(lookAtMatrix);
        }
        else
        {
          eye.copy(camPosition).sub(worldPosition).normalize();

          if (this.space === 'local')
          {
            tempQuaternion.setFromRotationMatrix(tempMatrix
                .extractRotation(this.object.matrixWorld));

            if (name.search('R') !== -1)
            {
              tempMatrix.makeRotationFromQuaternion(tempQuaternion)
                  .getInverse(tempMatrix);
              eye.applyProjection(tempMatrix);

              if (name === 'RX')
              {
                quaternionX.setFromAxisAngle(unitX, Math.atan2(-eye.y, eye.z));
                tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionX);
              }
              if (name ==='RY')
              {
                quaternionY.setFromAxisAngle(unitY, Math.atan2( eye.x, eye.z));
                tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionY);
              }
              if (name === 'RZ')
              {
                quaternionZ.setFromAxisAngle(unitZ, Math.atan2( eye.y, eye.x));
                tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionZ);
              }
            }
            object.quaternion.copy(tempQuaternion);
          }
          else if (this.space === 'world')
          {
            object.rotation.set(0, 0, 0);

            if(name === 'RX')
            {
              object.rotation.x = Math.atan2(-eye.y, eye.z);
            }
            if(name === 'RY')
            {
              object.rotation.y = Math.atan2( eye.x, eye.z);
            }
            if(name === 'RZ')
            {
              object.rotation.z = Math.atan2( eye.y, eye.x);
            }
          }
        }
      }
    }

    scope.gz3dScene.refresh3DViews();
  };

  /**
   * Hide gizmo
   */
  this.hide = function()
  {
    for(var i in displayAxes)
    {
      for(var j in displayAxes[i].children)
      {
        displayAxes[i].children[j].visible = false;
      }
    }
    for(var k in pickerAxes)
    {
      for(var l in pickerAxes[k].children)
      {
        pickerAxes[k].children[l].visible = false;
      }
    }

    for(var m in intersectionPlaneList)
    {
      intersectionPlanes[intersectionPlaneList[m]].visible = false;
    }
  };

  /**
   * Set mode
   * @param {string} value - translate | scale | rotate
   */
  this.setMode = function(value)
  {
    scope.mode = value;

    this.hide();

    for(var i in displayAxes[this.mode].children)
    {
      displayAxes[this.mode].children[i].visible = true;
    }

    for(var j in pickerAxes[this.mode].children)
    {
      pickerAxes[this.mode].children[j].visible = false; // debug
    }

    for(var k in intersectionPlaneList)
    {
      intersectionPlanes[intersectionPlaneList[k]].visible = false; // debug
    }

    scope.update();
  };

  /**
   * Choose intersection plane
   */
  this.setIntersectionPlane = function()
  {
    eye.copy(camPosition).sub(worldPosition).normalize();

    if (this.space === 'local')
    {
       eye.applyMatrix4(tempMatrix.getInverse(scope.object.matrixWorld));
    }

    var T = GZ3D.TRANSFORM_TYPE_NAME_PREFIX.TRANSLATE;
    var S = GZ3D.TRANSFORM_TYPE_NAME_PREFIX.SCALE;

    if (isSelected(T+'XYZ') || isSelected(S+'XYZ'))
    {
      if (Math.abs(eye.x) > Math.abs(eye.y) &&
          Math.abs(eye.x) > Math.abs(eye.z))
      {
        currentPlane = 'YZ';
      }
      else if (Math.abs(eye.y) > Math.abs(eye.x) &&
               Math.abs(eye.y) > Math.abs(eye.z))
      {
        currentPlane = 'XZ';
      }
      else
      {
        currentPlane = 'XY';
      }
    }
    else if (isSelected('RX') || isSelected(T+'YZ') || isSelected(S+'YZ'))
    {
      currentPlane = 'YZ';
    }
    else if (isSelected('RY') || isSelected(T+'XZ') || isSelected(S+'XZ'))
    {
      currentPlane = 'XZ';
    }
    else if (isSelected('RZ') || isSelected(T+'XY') || isSelected(S+'XY'))
    {
      currentPlane = 'XY';
    }
    else if (isSelected('X'))
    {
      if (Math.abs(eye.y) > Math.abs(eye.z))
      {
        currentPlane = 'XZ';
      }
      else
      {
        currentPlane = 'XY';
      }
    }
    else if (isSelected('Y'))
    {
      if (Math.abs(eye.x) > Math.abs(eye.z))
      {
        currentPlane = 'YZ';
      }
      else
      {
        currentPlane = 'XY';
      }
    }
    else if (isSelected('Z'))
    {
      if (Math.abs(eye.x) > Math.abs(eye.y))
      {
        currentPlane = 'YZ';
      }
      else
      {
        currentPlane = 'XZ';
      }
    }
  };

  /**
   * Window event callback
   * @param {} event
   */
  function onTouchStart(event)
  {
    event.preventDefault();

    var intersect = intersectObjects(event, pickerAxes[scope.mode].children);

    // If one of the current pickers was touched
    if(intersect)
    {
      if (scope.gz3dScene.controls) {
        scope.gz3dScene.controls.enabled = false;
      }

      if(selectedPicker !== intersect.object)
      {
        // Back to original color
        if(selectedPicker !== null)
        {
            selectedPicker.material.color.copy(selectedColor);
        }

        selectedPicker = intersect.object;

        // Save color for when it's deselected
        selectedColor.copy(selectedPicker.material.color);

        // Darken color
        selectedPicker.material.color.offsetHSL(0, 0, -0.3);

        scope.dispatchEvent(changeEvent());
      }

      scope.selected = selectedPicker.name;
      scope.hovered = true;
      scope.update();
      scope.setIntersectionPlane();

      var planeIntersect = intersectObjects(event,
          [intersectionPlanes[currentPlane]]);

      if(planeIntersect)
      {
        oldPosition.copy(scope.object.position);

        oldRotationMatrix.extractRotation(scope.object.matrix);
        worldRotationMatrix.extractRotation(scope.object.matrixWorld);

        parentRotationMatrix.extractRotation(scope.object.parent.matrixWorld);
        parentScale.setFromMatrixScale(tempMatrix.getInverse(
            scope.object.parent.matrixWorld));

        offset.copy(planeIntersect.point);
      }
    }

    scope.userView.container.addEventListener('touchmove', onPointerMove, false);
    scope.userView.container.addEventListener('touchend', onTouchEnd, false);
  }


  /**
   * Window event callback
   * @param {} event
   */
  function onTouchEnd()
  {
    // Previously selected picker back to its color
    if(selectedPicker)
    {
      selectedPicker.material.color.copy(selectedColor);
    }

    selectedPicker = null;

    scope.dispatchEvent(changeEvent());

    scope.selected = 'null';
    scope.hovered = false;

    scope.userView.container.removeEventListener('touchmove', onPointerMove, false);
    scope.userView.container.removeEventListener('touchend', onTouchEnd, false);

    if (scope.gz3dScene.controls) {
      scope.gz3dScene.controls.enabled = true;
    }
  }

  this.highlightPicker = function (picker) {
    highlightPicker(picker);
  };

  function highlightPicker(picker) {

    if (picker)
    {
      if (hovered !== picker)
      {
        if (hovered !== null)
        {
          hovered.material.color.copy(hoveredColor);
        }

        selectedPicker = picker;
        hovered = picker;
        hoveredColor.copy(hovered.material.color);

        hovered.material.color.offsetHSL(0, 0, -0.3);

        scope.dispatchEvent(changeEvent());
      }
      scope.hovered = true;
    }
    else if (hovered !== null)
    {
      hovered.material.color.copy(hoveredColor);

      hovered = null;

      scope.dispatchEvent(changeEvent());

      scope.hovered = false;
    }
  }

  /**
   * Window event callback
   * @param {} event
   */
  function onMouseHover(event)
  {
    event.preventDefault();

    if(event.button === 0 && scope.selected === 'null')
    {
      var intersect = intersectObjects(event, pickerAxes[scope.mode].children);
      highlightPicker(intersect.object);
    }
    scope.userView.container.addEventListener('mousemove', onPointerMove, false);
    scope.userView.container.addEventListener('mouseup', onMouseUp, false);
  }

  this.selectPicker = function (event) {
    selectPicker(event);
  };
  function selectPicker(event) {
    scope.selected = selectedPicker.name;

    scope.update();
    scope.setIntersectionPlane();

    var planeIntersect = intersectObjects(event,
       [intersectionPlanes[currentPlane]]);

    var rect = scope.userView.container.getBoundingClientRect();
    var x = (event.clientX - rect.left) / rect.width;
    var y = (event.clientY - rect.top) / rect.height;

    startRay.copy(ray.ray);// copy the ray used to raycast from the start point

    if(planeIntersect) {

      oldPosition.copy(scope.object.position);
      oldScale.copy(scope.object.scale);

      oldRotationMatrix.extractRotation(scope.object.matrix);
      worldRotationMatrix.extractRotation(scope.object.matrixWorld);

      parentRotationMatrix.extractRotation(
          scope.object.parent.matrixWorld);
      parentScale.setFromMatrixScale(tempMatrix.getInverse(
          scope.object.parent.matrixWorld));

      offset.copy(planeIntersect.point);
    }
  }

  /**
   * Window event callback
   * @param {} event
   */
  function onMouseDown(event)
  {
    event.preventDefault();

    if(event.button !== 0)
    {
      return;
    }

    var intersect = intersectObjects(event, pickerAxes[scope.mode].children);

    if(intersect)
    {
      selectPicker(event);

      if (scope.gz3dScene.controls) {
        scope.gz3dScene.controls.enabled = false;
      }
    }

    scope.userView.container.addEventListener('mousemove', onPointerMove, false);
    scope.userView.container.addEventListener('mouseup', onMouseUp, false);
  }

  this.onPointerMove = function (event) {
    onPointerMove(event);
  };

  var moveHoverMesh = null;

  function setMoveHoverMesh(obj)
  {
    if (moveHoverMesh===obj)
    {
      return;
    }

    if (moveHoverMesh)
    {
      scope.gz3dScene.hideBoundingBox();
    }

    if (obj)
    {
      scope.gz3dScene.showBoundingBox(obj);
    }

    moveHoverMesh = obj;
    scope.gz3dScene.dontRebuildCubemapNow = moveHoverMesh!==null;
    scope.gz3dScene.refresh3DViews();
  }

  function processNaturalMoveHover(event)
  {
    if (scope.gz3dScene.naturalAutoAlignMode)
    {
        return;
    }

    var positionX = event.clientX, positionY = event.clientY;
    var raycaster = new THREE.Raycaster();
    var i;
    var distance = -1000;
    var hitDesc;
    var point;

    var viewWidth = scope.gz3dScene.getDomElement().clientWidth;
    var viewHeight = scope.gz3dScene.getDomElement().clientHeight;

    raycaster.setFromCamera(new THREE.Vector2((positionX / viewWidth) * 2 - 1,
      -(positionY / viewHeight) * 2 + 1), scope.gz3dScene.camera);

    var objects = raycaster.intersectObjects(scope.gz3dScene.scene.children, true);

    for (i = 0; i < objects.length; i++)
    {
      var idesc = objects[i];
      var meshobj = idesc.object;

      if (meshobj.name.indexOf('_lightHelper') >= 0 || meshobj.name === 'grid' || meshobj.name === 'boundingBox' ||
        ((meshobj instanceof THREE.Camera)) || (meshobj instanceof THREE.Light) || (meshobj instanceof THREE.CameraHelper) ||
        (meshobj instanceof THREE.LensFlare) || (meshobj instanceof THREE.GridHelper))
      {
        continue;
      }

      if (idesc.distance < distance || !point)
      {
        distance = idesc.distance;
        hitDesc = idesc;
        point = idesc.point.clone();
      }

    }


    if (hitDesc && hitDesc.object)
    {
      var rootObject = hitDesc.object;
      while(rootObject && !(rootObject.parent instanceof THREE.Scene))
      {
        rootObject = rootObject.parent;
      }

      setMoveHoverMesh(rootObject);
    }
    else
    {
      setMoveHoverMesh(null);
    }
  }

  /**
   * Window event callback (mouse move and touch move)
   * @param {} event
   */
  function onPointerMove(event)
  {
    if (scope.gz3dScene.naturalAutoAlignMode)
    {
      setMoveHoverMesh(scope.gz3dScene.naturalAutoAlignMode.obj);
    }
    else if (scope.gz3dScene.manipulationMode === 'natural')
    {
      processNaturalMoveHover(event);
    }
    else
    {
      setMoveHoverMesh(null);
    }

    if(scope.selected === 'null')
    {
      return;
    }

    event.preventDefault();

    var planeIntersect = intersectObjects(event,
        [intersectionPlanes[currentPlane]]);

    var rect = scope.userView.container.getBoundingClientRect();
    var x = (event.clientX - rect.left) / rect.width;
    var y = (event.clientY - rect.top) / rect.height;

    lastRay.copy(ray.ray);// copy the ray used to raycast from the end point

    var transformType;

    if(planeIntersect)
    {
      var initPosition = Object.assign({}, scope.object.position);
      var currentObject = scope.object;
      point.copy(planeIntersect.point);

      if((scope.mode === 'translate') && isSelected(GZ3D.TRANSFORM_TYPE_NAME_PREFIX.TRANSLATE))
      {
        point.sub(offset);
        point.multiply(parentScale);

        if (scope.space === 'local')
        {
          point.applyMatrix4(tempMatrix.getInverse(worldRotationMatrix));

          if(!(isSelected('X')) || scope.modifierAxis.x !== 1)
          {
            point.x = 0;
          }
          if(!(isSelected('Y')) || scope.modifierAxis.y !== 1)
          {
            point.y = 0;
          }
          if(!(isSelected('Z')) || scope.modifierAxis.z !== 1)
          {
            point.z = 0;
          }
          if (isSelected('XYZ'))
          {
            point.set(0, 0, 0);
          }
          point.applyMatrix4(oldRotationMatrix);

          scope.object.position.copy(oldPosition);
          scope.object.position.add(point);
        }
        if (scope.space === 'world' || isSelected('XYZ'))
        {
          if(!(isSelected('X')) || scope.modifierAxis.x !== 1)
          {
            point.x = 0;
          }
          if(!(isSelected('Y')) || scope.modifierAxis.y !== 1)
          {
            point.y = 0;
          }
          if(!(isSelected('Z')) || scope.modifierAxis.z !== 1)
          {
            point.z = 0;
          }

          point.applyMatrix4(tempMatrix.getInverse(parentRotationMatrix));

          currentObject.position.copy(oldPosition);
          currentObject.position.add(point);

          if(scope.snapDist)
          {
            if(isSelected('X'))
            {
              currentObject.position.x = Math.round(currentObject.position.x /
                  scope.snapDist) * scope.snapDist;
            }
            if(isSelected('Y'))
            {
              currentObject.position.y = Math.round(currentObject.position.y /
                  scope.snapDist) * scope.snapDist;
            }
            if(isSelected('Z'))
            {
              currentObject.position.z = Math.round(currentObject.position.z /
                  scope.snapDist) * scope.snapDist;
            }
          }
        }
        // workaround for the problem when an object jumps straight to (0,0,0) on translation
        if (scope.object.position.x === 0 &&
            scope.object.position.y === 0 &&
            scope.object.position.z === 0) {
          // a "jump" detected -> keep the object at initial position
          scope.object.position.copy(initPosition);
          selectPicker(event);
        }

        transformType = GZ3D.TRANSFORM_TYPE_NAME_PREFIX.TRANSLATE;
      }
      else if((scope.mode === 'scale') && isSelected(GZ3D.TRANSFORM_TYPE_NAME_PREFIX.SCALE))
      {
        if(!currentObject.isSimpleShape()) { return; }

        var distanceToPlane = function(plane, origin, dir) {
            var denom = plane.normal.dot(dir);
            if(Math.abs(denom) < 1e-3) {
                return 0;
            }
            else {
                var nom = origin.dot(plane.normal) - plane.constant;
                return -(nom/denom);
            }
        };

        // adapted from gazebo::gui:ModelManipulator
        var axis = new THREE.Vector3();

        if(isSelected('X')) { axis.x = 1;}
        if(isSelected('Y')) { axis.y = 1;}
        if(isSelected('Z')) { axis.z = 1;}

        var getMouseMoveDistance = function(startRay, endRay, pose, axis, isLocal) {

            var origin1 = startRay.origin;
            var direction1 = startRay.direction;

            var origin2 = endRay.origin;
            var direction2 = endRay.direction;

            var planeNorm = new THREE.Vector3(0,0,0);
            var projNorm = new THREE.Vector3(0,0,0);

            var planeNormOther = new THREE.Vector3(0,0,0);

            if(axis.x > 0 && axis.y > 0) {
                planeNorm.z = 1;
                projNorm.z = 1;
            }
            else if(axis.z > 0)
            {
                planeNorm.y = 1;
                projNorm.x = 1;
                planeNormOther.x = 1;
            }
            else if (axis.x > 0)
            {
                planeNorm.z = 1;
                projNorm.y = 1;
                planeNormOther.y = 1;
            }
            else if (axis.y > 0)
            {
                planeNorm.z = 1;
                projNorm.x = 1;
                planeNormOther.x = 1;
            }

            if(isLocal) {
                planeNorm.applyQuaternion(pose.rot);
                projNorm.applyQuaternion(pose.rot);
            }

            // Fine tune ray casting: cast a second ray and compare the two rays' angle
            // to plane. Use the one that is less parallel to plane for better results.
            var angle = (direction1).dot(planeNorm);
            if(isLocal) {
                planeNormOther.applyQuaternion(pose.rot);
            }
            var angleOther = (direction1).dot(planeNormOther);
            if(Math.abs(angleOther) > Math.abs(angle)) {
                projNorm = planeNorm;
                planeNorm = planeNormOther;
            }

            // Compute the distance from the camera to plane
            var d = (pose.pos).dot(planeNorm);
            var plane = new THREE.Plane(planeNorm, d);

            var dist1 = distanceToPlane(plane, origin1, direction1);
            var dist2 = distanceToPlane(plane, origin2, direction1);
            var tmpVector = new THREE.Vector3();

            // Compute two points on the plane. The first point is the current
            // mouse position, the second is the previous mouse position
            tmpVector.copy(direction1).multiplyScalar(dist1); // dir1 * dist1
            var p1 = new THREE.Vector3().addVectors(origin1,tmpVector); //origin1 + (dir1 * dist1)

            tmpVector.copy(direction2).multiplyScalar(dist2);
            var p2 = new THREE.Vector3().addVectors(origin2, tmpVector);

            if(isLocal) {
                var p1MinusP2 = tmpVector;

                p1MinusP2.subVectors(p1, p2); //(p1-p2)

                // p1 = p1 - (projNorm * (p1-p2).Dot(projNorm));
                p1.sub(projNorm.multiplyScalar(p1MinusP2.dot(projNorm)));
            }

             var distance = tmpVector.subVectors(p1, p2);

             if(!isLocal) { distance.multiply(axis); }

             return distance;
        };

        var updateScale = function(scaleVector, axis, shape) { // impose uniform transformation constraints on simple shapes

            switch (shape) {
                case 'cylinder': //X=Y Z
                   if (axis.x > 0) {
                      scaleVector.y = scaleVector.x;
                   }
                   else if(axis.y > 0) {
                      scaleVector.x = scaleVector.y;
                   }
                   break;
                case 'sphere': //X=Y=Z
                   if(axis.x > 0) {
                        scaleVector.y = scaleVector.z = scaleVector.x;
                   }
                   else if(axis.y > 0) {
                        scaleVector.x = scaleVector.z = scaleVector.y;
                   }
                   else if(axis.z > 0) {
                        scaleVector.x = scaleVector.y = scaleVector.z;
                   }
                   break;
                case undefined: // undefined --> do nothing
                   break;
                // box and complex --> do nothing
              }
        };

        var objectWorldPose = {'pos': currentObject.getWorldPosition(), 'rot': currentObject.getWorldQuaternion()};

        var mouseDistance =
            getMouseMoveDistance(startRay, lastRay, objectWorldPose, axis, (scope.space === 'local'));

        mouseDistance.multiply(axis);//filter out unselected component. i.e. keep only the coordinates set to 1 in axis.

        var objectWorldInverseRotation = (objectWorldPose.rot).clone().inverse();
        mouseDistance.applyQuaternion(objectWorldInverseRotation);

        var scale = (new THREE.Vector3(1,1,1).sub(mouseDistance)); // 1 - mouseDistance

        //check simple shapes constraints
        updateScale(scale, axis, currentObject.getShapeName());

        var absScale = new THREE.Vector3(Math.abs(scale.x), Math.abs(scale.y), Math.abs(scale.z));
        var newScale = absScale.multiply(oldScale);

        currentObject.scale.copy(newScale);

        transformType = GZ3D.TRANSFORM_TYPE_NAME_PREFIX.SCALE;
      }
      else if((scope.mode === 'rotate') && isSelected(GZ3D.TRANSFORM_TYPE_NAME_PREFIX.ROTATE))
      {
        point.sub(worldPosition);
        point.multiply(parentScale);
        tempVector.copy(offset).sub(worldPosition);
        tempVector.multiply(parentScale);

        if(scope.selected === 'RE')
        {
          point.applyMatrix4(tempMatrix.getInverse(lookAtMatrix));
          tempVector.applyMatrix4(tempMatrix.getInverse(lookAtMatrix));

          rotation.set(Math.atan2(point.z, point.y),
                       Math.atan2(point.x, point.z),
                       Math.atan2(point.y, point.x));
          offsetRotation.set(Math.atan2(tempVector.z, tempVector.y),
                             Math.atan2(tempVector.x, tempVector.z),
                             Math.atan2(tempVector.y, tempVector.x));

          tempQuaternion.setFromRotationMatrix(tempMatrix.getInverse(parentRotationMatrix));

          quaternionE.setFromAxisAngle(eye, rotation.z - offsetRotation.z);
          quaternionXYZ.setFromRotationMatrix(worldRotationMatrix);

          tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionE);
          tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionXYZ);

          currentObject.quaternion.copy(tempQuaternion);
        }
        else if(scope.selected === 'RXYZE')
        {
          // commented out for now since it throws an error message at quaternionE.setFromEuler('not a THREE.Euler')
          // and has unexpected results when actually followed through with a THREE.Euler passed to setFromEuler()
          /*
          quaternionE.setFromEuler(point.clone().cross(tempVector).normalize()); // has this ever worked?

          tempQuaternion.setFromRotationMatrix(tempMatrix.getInverse(parentRotationMatrix));
          quaternionX.setFromAxisAngle(quaternionE, - point.clone().angleTo(tempVector));
          quaternionXYZ.setFromRotationMatrix(worldRotationMatrix);

          tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionX);
          tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionXYZ);

          currentObject.quaternion.copy(tempQuaternion);
          */
        }
        else
        {
          if (scope.space === 'local')
          {
            point.applyMatrix4(tempMatrix.getInverse(worldRotationMatrix));

            tempVector.applyMatrix4(tempMatrix.getInverse(worldRotationMatrix));

            rotation.set(Math.atan2(point.z, point.y), Math.atan2(point.x, point.z),
                Math.atan2(point.y, point.x));
            offsetRotation.set(Math.atan2(tempVector.z, tempVector.y), Math.atan2(
                tempVector.x, tempVector.z), Math.atan2(tempVector.y, tempVector.x));

            quaternionXYZ.setFromRotationMatrix(oldRotationMatrix);
            quaternionX.setFromAxisAngle(unitX, rotation.x - offsetRotation.x);
            quaternionY.setFromAxisAngle(unitY, rotation.y - offsetRotation.y);
            quaternionZ.setFromAxisAngle(unitZ, rotation.z - offsetRotation.z);

            if (scope.selected === 'RX')
            {
              quaternionXYZ.multiplyQuaternions(quaternionXYZ, quaternionX);
            }
            if (scope.selected === 'RY')
            {
              quaternionXYZ.multiplyQuaternions(quaternionXYZ, quaternionY);
            }
            if (scope.selected === 'RZ')
            {
              quaternionXYZ.multiplyQuaternions(quaternionXYZ, quaternionZ);
            }

            currentObject.quaternion.copy(quaternionXYZ);
          }
          else if (scope.space === 'world')
          {
            rotation.set(Math.atan2(point.z, point.y), Math.atan2(point.x, point.z),
                Math.atan2(point.y, point.x));
            offsetRotation.set(Math.atan2(tempVector.z, tempVector.y), Math.atan2(
              tempVector.x, tempVector.z), Math.atan2(tempVector.y, tempVector.x));

            tempQuaternion.setFromRotationMatrix(tempMatrix.getInverse(
              parentRotationMatrix));

            quaternionX.setFromAxisAngle(unitX, rotation.x - offsetRotation.x);
            quaternionY.setFromAxisAngle(unitY, rotation.y - offsetRotation.y);
            quaternionZ.setFromAxisAngle(unitZ, rotation.z - offsetRotation.z);
            quaternionXYZ.setFromRotationMatrix(worldRotationMatrix);

            if(scope.selected === 'RX')
            {
              tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionX);
            }
            if(scope.selected === 'RY')
            {
              tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionY);
            }
            if(scope.selected === 'RZ')
            {
              tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionZ);
            }

            tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionXYZ);

            currentObject.quaternion.copy(tempQuaternion);
          }
        }

        transformType = GZ3D.TRANSFORM_TYPE_NAME_PREFIX.ROTATE;
      }

    }

    scope.update();
    scope.dispatchEvent(changeEvent(transformType));
  }

  this.handleAxisLockEnd = function () {
    handleAxisLockEnd();
  };

  function handleAxisLockEnd() {
    highlightPicker();
    scope.selected = 'null';

    scope.userView.container.removeEventListener('mousemove', onPointerMove, false);
    scope.userView.container.removeEventListener('mouseup', onMouseUp, false);

    scope.gz3dScene.updateDynamicEnvMap();
  }

  function onMouseUp(event)
  {
    handleAxisLockEnd();
    if (scope.gz3dScene.controls) {
      scope.gz3dScene.controls.enabled = true;
    }
  }

  /**
   * intersectObjects
   * @param {} event
   * @param {} objects
   * @returns {?}
   */
  function intersectObjects(event, objects)
  {
    var pointer = event.touches ? event.touches[0] : event;

    var rect = scope.userView.container.getBoundingClientRect();
    var x = (pointer.clientX - rect.left) / rect.width;
    var y = (pointer.clientY - rect.top) / rect.height;
    var i;

    pointerVector.set((x) * 2 - 1, - (y) * 2 + 1, 0.5);

    pointerVector.unproject(scope.userView.camera);
    ray.set(camPosition, pointerVector.sub(camPosition).normalize());

    for(i=0;i<objects.length;i++) {objects[i].visible = true;}  // ThreeJS intersectObjects function requires object to be visible

    // checks all intersections between the ray and the objects,
    // true to check the descendants
    var intersections = ray.intersectObjects(objects, true);

    for(i=0;i<objects.length;i++) {objects[i].visible = false;}   // Hide them again after the test

    return intersections[0] ? intersections[0] : false;
  }

  this.isSelected = function (name) {
    return isSelected(name);
  };
  /**
   * Checks if given name is currently selected
   * @param {} name
   * @returns {boolean}
   */
  function isSelected(name)
  {
    return scope.selected.search(name) !== -1;
  }

  /**
   * bakeTransformations
   * @param {} object
   */
  function bakeTransformations(object)
  {
    var tempGeometry = new THREE.Geometry();
    object.updateMatrix();
    tempGeometry.merge(object.geometry, object.matrix);
    object.geometry = tempGeometry;
    object.position.set(0, 0, 0);
    object.rotation.set(0, 0, 0);
    object.scale.set(1, 1, 1);
  }
};

GZ3D.Manipulator.prototype = Object.create(THREE.EventDispatcher.prototype);


/**
 *
 * GZ3D Multiply Shader
 */

GZ3D.MultiplyShader = {

	uniforms: {

		'tDiffuse': { value: null },
		'tMultiply': { value: null },
	},

	vertexShader: [

		'varying vec2 vUv;',

		'void main() {',

		'vUv = uv;',
		'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',

		'}'

	].join('\n'),

	fragmentShader: [

		'uniform sampler2D tDiffuse;',
		'uniform sampler2D tMultiply;',

		'varying vec2 vUv;',

		'void main() {',

		'vec4 texel = texture2D( tDiffuse, vUv );',
		'vec4 tmul = texture2D( tMultiply, vUv );',

		'gl_FragColor =tmul;',

		'}'

	].join('\n')

};



/**
 * Created by Sandro Weber (webers@in.tum.de).
 */

GZ3D.RENDER_MODE = {
  MULTIPLE_CONTEXTS: 1,
  OFFSCREEN_AND_COPY_TO_CANVAS: 2,
  DYNAMIC: 3
};


GZ3D.MULTIVIEW_MAX_VIEW_COUNT = 10;
GZ3D.MULTIVIEW_MAINVIEW_NAME = 'main_view';
GZ3D.MULTIVIEW_DEFAULT_CAMERA_PARAMS = {
  fov: 60,
  aspectRatio: 1.6,
  near: 0.15,
  far: 100
};

GZ3D.MultiView = function (gz3dScene) {
  this.gz3dScene = gz3dScene;

  this.renderMode = GZ3D.RENDER_MODE.DYNAMIC;
  if (this.renderMode === GZ3D.RENDER_MODE.OFFSCREEN_AND_COPY_TO_CANVAS ||
      this.renderMode === GZ3D.RENDER_MODE.DYNAMIC)
  {
    this.renderer = this.createRenderer();
  }
  this.views = [];
  // create the main user view
  this.mainUserView = this.createView(GZ3D.MULTIVIEW_MAINVIEW_NAME, GZ3D.MULTIVIEW_DEFAULT_CAMERA_PARAMS);
};

/**
 *
 * @param name
 * @param displayParams {left, top, width, height, zIndex, adjustable}
 * @param cameraParams {width, height, fov, near, far}
 */
GZ3D.MultiView.prototype.createView = function (name, cameraParams) {
  if (angular.isDefined(this.getViewByName(name))) {
    console.error('GZ3D.MultiView.createView() - a view of that name already exists (' + name + ')');
    return undefined;
  }

  if (this.views.length >= this.MULTIVIEW_MAX_VIEW_COUNT) {
    console.warn('GZ3D.MultiView.createView() - creating new view will exceed MULTIVIEW_MAX_VIEW_COUNT(' + this.MULTIVIEW_MAX_VIEW_COUNT + '). This may cause z-ordering issues.');
  }

  var that = this;

  // camera
  var camera = new THREE.PerspectiveCamera(
    cameraParams.fov,
    cameraParams.aspectRatio,
    cameraParams.near,
    cameraParams.far
  );
  camera.name = name;
  camera.up = new THREE.Vector3(0, 0, 1);  // gazebo's up vector
  // gazebo's transform for the sensor object is different for some reason
  // or the camera sensor looks along the x-axis by default instead of negative z-axis
  camera.lookAt(camera.localToWorld(new THREE.Vector3(1, 0, 0)));
  camera.updateMatrixWorld();
  this.gz3dScene.scene.add(camera);

  // camera visualization
  var cameraHelper = new THREE.CameraHelper(camera);
  cameraHelper.visible = false;
  camera.cameraHelper = cameraHelper;
  this.gz3dScene.scene.add(cameraHelper);
  cameraHelper.update();

  var view;

  if (this.renderMode===GZ3D.RENDER_MODE.DYNAMIC)
  {
     // assemble view
      view = {
        name: name,
        camera: camera,
        container: undefined,
        renderer: this.renderer,
        canvas: this.renderer.domElement,
        initAspectRatio: cameraParams.aspectRatio,
        masterView: this.views.length===0           // First view is the master view, it owns the renderer and renders directly on screen
      };                                            // Master view may be changed later, if another view is bigger than this view
  }
  else if (this.renderMode === GZ3D.RENDER_MODE.MULTIPLE_CONTEXTS) {
    // renderer
    var renderer = this.createRenderer();

    // assemble view
    view = {
      name: name,
      camera: camera,
      container: undefined,
      renderer: renderer,
      canvas: renderer.domElement,
      initAspectRatio: cameraParams.aspectRatio
    };
  } else if (this.renderMode === GZ3D.RENDER_MODE.OFFSCREEN_AND_COPY_TO_CANVAS) {
    // assemble view
    view = {
      name: name,
      camera: camera,
      renderer: this.renderer,
      container: undefined,
      canvas: undefined,
      initAspectRatio: cameraParams.aspectRatio
    };
  }

  view.needsRefresh = true;
  view.cameraViewCurrentMatrix = camera.matrixWorld.clone();

  this.views.push(view);

  return view;
};

GZ3D.MultiView.prototype.getViewByName = function (name) {
  for (var i = 0; i < this.views.length; i = i + 1) {
    if (this.views[i].name === name) {
      return this.views[i];
    }
  }

  return undefined;
};

GZ3D.MultiView.prototype.isViewVisible = function (view) {
  if (view.container) {
      return (view.container.style.visibility === 'visible' &&
              view.container.className.indexOf('ng-hide')===-1);
  } else {
    return false;
  }
};

GZ3D.MultiView.prototype.setViewContainerElement = function (view, containerElement) {
  if (!angular.isDefined(view)) {
    return false;
  }

  if (this.renderMode === GZ3D.RENDER_MODE.DYNAMIC)
  {
    if (view.masterView)
    {
      view.container = containerElement;
      view.container.appendChild(view.renderer.domElement);
      view.container.style.visibility = 'visible';
    }
    else
    {
      view.container = containerElement;
      view.canvas = document.createElement('canvas');
      view.container.appendChild(view.canvas);
      view.container.style.visibility = 'visible';
    }
  }
  else if (this.renderMode === GZ3D.RENDER_MODE.MULTIPLE_CONTEXTS) {
    view.container = containerElement;
    view.container.appendChild(view.renderer.domElement);
    view.container.style.visibility = 'visible';
  } else if (this.renderMode === GZ3D.RENDER_MODE.OFFSCREEN_AND_COPY_TO_CANVAS) {
    view.container = containerElement;
    view.canvas = document.createElement('canvas');
    view.container.appendChild(view.canvas);
    view.container.style.visibility = 'visible';
  }
};

GZ3D.MultiView.prototype.updateView = function (view) {
  var width = view.container.clientWidth;
  var height = view.container.clientHeight;

  view.canvas.width = width;
  view.canvas.height = height;

  view.camera.aspect = width / height;
  view.camera.updateProjectionMatrix();
  view.camera.cameraHelper.update();

  view.renderer.setSize(width, height);
  view.renderer.setViewport(0, 0, width, height);
  view.renderer.setScissor(0, 0, width, height);
};

GZ3D.MultiView.prototype.updateMasterView = function () {

  // The master view should be the larger canvas

  var maxSize = 0;
  var maxSizeView;
  var masterView;

  for (var i = 0, l = this.views.length; i < l; i = i + 1)
  {
    var view = this.views[i];

    if (this.isViewVisible(view))
    {
      var nPixels = view.canvas.width * view.canvas.height;

      if (view.masterView)
      {
        masterView = view;
      }

      if (i===0)
      {
        maxSize = nPixels;
        maxSizeView = view;
      }
      else
      {
        if (nPixels>maxSize)
        {
          maxSize = nPixels;
          maxSizeView = view;
        }
      }
    }
  }

  if (maxSizeView && !maxSizeView.masterView )
  {
      // The masterView is not the biggest one anymore, it should be updated

      maxSizeView.masterView = true;
      maxSizeView.container.appendChild(this.renderer.domElement);

      if (masterView)
      {
        masterView.container.appendChild(maxSizeView.canvas);
        masterView.canvas = maxSizeView.canvas;
        masterView.masterView = false;
      }
      else
      {
        maxSizeView.container.removeChild(maxSizeView.canvas);
      }

      maxSizeView.canvas = this.renderer.domElement;
    }
};

GZ3D.MultiView.prototype.renderViews = function () {

  var masterView, oneViewNeedRefresh, i, l, view;

  if (this.renderMode===GZ3D.RENDER_MODE.DYNAMIC)
  {
    this.updateMasterView();
  }

  for (i = 0, l = this.views.length; i < l; i = i + 1)
  {
    view = this.views[i];

    if (this.isViewVisible(view))
    {
      if (view.needsRefresh ||
        view.canvas.width!==view.container.clientWidth ||
        view.canvas.height!==view.container.clientHeight ||
        !view.camera.matrixWorld.equals(view.cameraViewCurrentMatrix) )
      {
        oneViewNeedRefresh = true;
      }
    }
  }

  if (oneViewNeedRefresh)
  {
    for (i = 0, l = this.views.length; i < l; i = i + 1)
    {
      view = this.views[i];

      if (this.isViewVisible(view))
      {
        view.needsRefresh = false;
        view.cameraViewCurrentMatrix = view.camera.matrixWorld.clone();

        if (this.renderMode === GZ3D.RENDER_MODE.DYNAMIC)
        {
          if ( !view.masterView )
          {
            this.updateView(view);
            this.gz3dScene.composer.render(view);
            view.canvas.getContext('2d').drawImage(this.renderer.domElement, 0, 0,view.canvas.width,view.canvas.height,
                                                                            0, 0,view.canvas.width,view.canvas.height);
          }
          else
          {
            masterView = view;
          }
        }
        else
        {
          this.updateView(view);
          this.gz3dScene.composer.render(view);

          if (this.renderMode === GZ3D.RENDER_MODE.OFFSCREEN_AND_COPY_TO_CANVAS)
          {
            view.canvas.getContext('2d').drawImage(this.renderer.domElement, 0, 0);
          }
        }
      }
    }
  }

  if (masterView)
  {
    this.updateView(masterView);
    this.gz3dScene.composer.render(masterView);
  }

  this.gz3dScene.composer.checkSceneReady();
};

GZ3D.MultiView.prototype.setCameraHelperVisibility = function (view, visible) {
  view.camera.cameraHelper.visible = visible;
};

GZ3D.MultiView.prototype.createRenderer = function () {
  var renderer = new THREE.WebGLRenderer({antialias: false});
  renderer.setClearColor(0xb2b2b2, 1); // Sky
  renderer.setScissorTest(true);
  renderer.shadowMap.enabled = false;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  return renderer;
};

GZ3D.MultiView.prototype.setBackgrounds = function (background) {
  this.views.forEach(function(view, index, array) {
    view.renderer.clear();
    view.renderer.setClearColor(background, 1);
  });
};

GZ3D.MultiView.prototype.setShadowMaps = function (enabled) {
  this.views.forEach(function(view, index, array) {
    view.renderer.shadowMap.enabled = enabled;
  });
};

GZ3D.MultiView.prototype.clearRenderTargets = function (target) {
  this.views.forEach(function(view, index, array) {
    view.renderer.clearTarget(target);
  });
};
/**
 * Radial menu for an object
 * @constructor
 */
GZ3D.RadialMenu = function(gz3dScene)
{
  this.gz3dScene = gz3dScene;

  this.init();
};

/**
 * Initialize radial menu
 */
GZ3D.RadialMenu.prototype.init = function()
{
  var scale = 1.2;
  // Distance from starting point
  this.radius = 70*scale;
  // Speed to spread the menu
  this.speed = 10*scale;
  // Icon size
  this.bgSize = 40*scale;
  this.bgSizeSelected = 68*scale;
  this.highlightSize = 45*scale;
  this.iconProportion = 0.6;

  var loader = new THREE.TextureLoader();
  this.bgShape = loader.load( 'style/images/icon_background.png');

  this.layers = {
    ICON: 0,
    BACKGROUND : 1,
    HIGHLIGHT : 2
  };

  // For the opening motion
  this.moving = false;
  this.startPosition = null;

  // Either moving or already stopped
  this.showing = false;

  // Colors
  this.selectedColor = new THREE.Color(0x22aadd);
  this.plainColor = new THREE.Color(0x333333);
  this.highlightColor = new THREE.Color(0x22aadd);
  this.disabledColor = new THREE.Color(0x888888);

  // Selected item
  this.selected = null;

  // Selected model
  this.model = null;

  // Object containing all items
  this.menu = new THREE.Object3D();

  // Add items to the menu
  this.addItem('delete','style/images/trash.png');
  this.addItem('translate','style/images/translate.png');
  this.addItem('rotate','style/images/rotate.png');
  this.addItem('transparent','style/images/transparent.png');
  this.addItem('wireframe','style/images/wireframe.png');
  this.addItem('joints','style/images/joints.png');

  this.setNumberOfItems(this.menu.children.length);

  // Start hidden
  this.hide();
};

/**
 * Hide radial menu
 * @param {} event - event which triggered hide
 * @param {function} callback
 */
GZ3D.RadialMenu.prototype.hide = function(event,callback)
{
  for (var i = 0; i < this.numberOfItems; i++)
  {
    var item = this.menu.children[i];

    item.children[this.layers.ICON].visible = false;
    item.children[this.layers.ICON].scale.set(
        this.bgSize*this.iconProportion,
        this.bgSize*this.iconProportion, 1.0 );

    item.children[this.layers.BACKGROUND].visible = false;
    item.children[this.layers.BACKGROUND].material.color = this.plainColor;
    item.children[this.layers.BACKGROUND].scale.set(
        this.bgSize,
        this.bgSize, 1.0 );

    item.children[this.layers.HIGHLIGHT].visible = false;
  }

  this.showing = false;
  this.moving = false;
  this.startPosition = null;

  if (callback && this.model)
  {
    if ( this.selected )
    {
      callback(this.selected,this.model);
      this.model = null;
    }
  }
  this.selected = null;
};

/**
 * Show radial menu
 * @param {} event - event which triggered show
 * @param {THREE.Object3D} model - model to which the menu will be attached
 */
GZ3D.RadialMenu.prototype.show = function(event,model)
{
  if (this.showing)
  {
    return;
  }

  this.model = model;

  if (model.children[0] instanceof THREE.Light)
  {
    this.setNumberOfItems(3);
  }
  else
  {
    this.setNumberOfItems(6);
  }

  var pointer = this.getPointer(event);
  this.startPosition = pointer;

  this.menu.getObjectByName('transparent').isHighlighted = false;
  this.menu.getObjectByName('wireframe').isHighlighted = false;
  this.menu.getObjectByName('joints').isHighlighted = false;
  this.menu.getObjectByName('joints').isDisabled = false;
  if (this.model.viewAs === 'transparent')
  {
    this.menu.getObjectByName('transparent').isHighlighted = true;
  }
  if (this.model.viewAs === 'wireframe')
  {
    this.menu.getObjectByName('wireframe').isHighlighted = true;
  }
  if (this.model.joint === undefined || this.model.joint.length === 0)
  {
    this.menu.getObjectByName('joints').isDisabled = true;
  }
  else if (this.model.getObjectByName('JOINT_VISUAL', true))
  {
    this.menu.getObjectByName('joints').isHighlighted = true;
  }

  for (var i = 0; i < this.numberOfItems; i++)
  {
    var item = this.menu.children[i];

    item.children[this.layers.ICON].visible = true;
    item.children[this.layers.ICON].position.set(pointer.x,pointer.y,0);

    item.children[this.layers.BACKGROUND].visible = true;
    item.children[this.layers.BACKGROUND].position.set(pointer.x,pointer.y,0);
    if (item.isDisabled)
    {
      item.children[this.layers.BACKGROUND].material.color = this.disabledColor;
    }

    item.children[this.layers.HIGHLIGHT].visible = item.isHighlighted;
    item.children[this.layers.HIGHLIGHT].position.set(pointer.x,pointer.y,0);
  }

  this.moving = true;
  this.showing = true;
};

/**
 * Update radial menu
 */
GZ3D.RadialMenu.prototype.update = function()
{
  if (!this.moving)
  {
    return;
  }

  // Move outwards
  for (var i = 0; i < this.numberOfItems; i++)
  {
    var item = this.menu.children[i];

    var X = item.children[this.layers.ICON].position.x -
        this.startPosition.x;
    var Y = item.children[this.layers.ICON].position.y -
        this.startPosition.y;

    var d = Math.sqrt(Math.pow(X,2) + Math.pow(Y,2));

    if ( d < this.radius)
    {
      X = X - ( this.speed * Math.sin( ( this.offset - i ) * Math.PI/4 ) );
      Y = Y - ( this.speed * Math.cos( ( this.offset - i ) * Math.PI/4 ) );
    }
    else
    {
      this.moving = false;
    }

    item.children[this.layers.ICON].position.x = X + this.startPosition.x;
    item.children[this.layers.ICON].position.y = Y + this.startPosition.y;

    item.children[this.layers.BACKGROUND].position.x = X + this.startPosition.x;
    item.children[this.layers.BACKGROUND].position.y = Y + this.startPosition.y;

    item.children[this.layers.HIGHLIGHT].position.x = X + this.startPosition.x;
    item.children[this.layers.HIGHLIGHT].position.y = Y + this.startPosition.y;
  }

};

/**
 * Get pointer (mouse or touch) coordinates inside the canvas
 * @param {} event
 */
GZ3D.RadialMenu.prototype.getPointer = function(event)
{
  if (event.originalEvent)
  {
    event = event.originalEvent;
  }
  var pointer = event.touches ? event.touches[ 0 ] : event;
  var rect = this.gz3dScene.viewManager.mainUserView.container.getBoundingClientRect();
  var posX = (pointer.clientX - rect.left);
  var posY = (pointer.clientY - rect.top);

  return {x: posX, y:posY};
};

/**
 * Movement after long press to select items on menu
 * @param {} event
 */
GZ3D.RadialMenu.prototype.onLongPressMove = function(event)
{
  var pointer = this.getPointer(event);
  var pointerX = pointer.x - this.startPosition.x;
  var pointerY = pointer.y - this.startPosition.y;

  var angle = Math.atan2(pointerY,pointerX);

  // Check angle region
  var region = null;
  // bottom-left
  if (angle > 5*Math.PI/8 && angle < 7*Math.PI/8)
  {
    region = 1;
  }
  // left
  else if ( (angle > -8*Math.PI/8 && angle < -7*Math.PI/8) ||
      (angle > 7*Math.PI/8 && angle < 8*Math.PI/8) )
  {
    region = 2;
  }
  // top-left
  else if (angle > -7*Math.PI/8 && angle < -5*Math.PI/8)
  {
    region = 3;
  }
  // top
  else if (angle > -5*Math.PI/8 && angle < -3*Math.PI/8)
  {
    region = 4;
  }
  // top-right
  else if (angle > -3*Math.PI/8 && angle < -1*Math.PI/8)
  {
    region = 5;
  }
  // right
  else if (angle > -1*Math.PI/8 && angle < 1*Math.PI/8)
  {
    region = 6;
  }
  // bottom-right
  else if (angle > 1*Math.PI/8 && angle < 3*Math.PI/8)
  {
    region = 7;
  }
  // bottom
  else if (angle > 3*Math.PI/8 && angle < 5*Math.PI/8)
  {
    region = 8;
  }

  // Check if any existing item is in the region
  var Selected = region - 4 + this.offset;

  if (Selected >= this.numberOfItems || Selected < 0)
  {
    this.selected = null;
    Selected = null;
  }

  var counter = 0;
  for (var i = 0; i < this.numberOfItems; i++)
  {
    var item = this.menu.children[i];

    if (counter === Selected)
    {
      item.children[this.layers.ICON].scale.set(
          this.bgSizeSelected*this.iconProportion,
          this.bgSizeSelected*this.iconProportion, 1.0 );
      this.selected = item.children[this.layers.ICON].name;

      if (!item.isDisabled)
      {
        item.children[this.layers.BACKGROUND].material.color =
            this.selectedColor;
      }
      item.children[this.layers.BACKGROUND].scale.set(
          this.bgSizeSelected,
          this.bgSizeSelected, 1.0 );
    }
    else
    {
      item.children[this.layers.ICON].scale.set(
          this.bgSize*this.iconProportion,
          this.bgSize*this.iconProportion, 1.0 );

      item.children[this.layers.BACKGROUND].scale.set(
          this.bgSize, this.bgSize, 1.0 );
      if (!item.isDisabled)
      {
        item.children[this.layers.BACKGROUND].material.color = this.plainColor;
      }
    }
    counter++;
  }
};

/**
 * Create an item and add it to the menu.
 * Create them in order
 * @param {string} type - delete/translate/rotate/transparent/wireframe/joints
 * @param {string} iconTexture - icon's uri
 */
GZ3D.RadialMenu.prototype.addItem = function(type, iconTexture)
{
  // Icon

  var loader = new THREE.TextureLoader();
  iconTexture = loader.load( iconTexture);

  var iconMaterial = new THREE.SpriteMaterial( {
    map: iconTexture
  } );

  var icon = new THREE.Sprite( iconMaterial );
  icon.scale.set( this.bgSize*this.iconProportion,
      this.bgSize*this.iconProportion, 1.0 );
  icon.name = type;

  // Background
  var bgMaterial = new THREE.SpriteMaterial( {
      map: this.bgShape,
      color: this.plainColor } );

  var bg = new THREE.Sprite( bgMaterial );
  bg.scale.set( this.bgSize, this.bgSize, 1.0 );

  // Highlight
  var highlightMaterial = new THREE.SpriteMaterial({
      map: this.bgShape,
      color: this.highlightColor});

  var highlight = new THREE.Sprite(highlightMaterial);
  highlight.scale.set(this.highlightSize, this.highlightSize, 1.0);
  highlight.visible = false;

  var item = new THREE.Object3D();
  // Respect layer order
  item.add(icon);
  item.add(bg);
  item.add(highlight);
  item.isHighlighted = false;
  item.name = type;

  this.menu.add(item);
};

/**
 * Set number of items (different for models and lights)
 * @param {int} number
 */
GZ3D.RadialMenu.prototype.setNumberOfItems = function(number)
{
  this.numberOfItems = number;
  this.offset = this.numberOfItems - 1 - Math.floor(this.numberOfItems/2);
};

/**
 *
 * GZ3D RGB Curves correction shader.
 */

GZ3D.RGBCurvesShader = {

	uniforms: {

		'tDiffuse': { value: null },
		'tCurveMapper': { value: null },
	},

	vertexShader: [

		'varying vec2 vUv;',

		'void main() {',

		'vUv = uv;',
		'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',

		'}'

	].join('\n'),

	fragmentShader: [

		'uniform sampler2D tCurveMapper;',
		'uniform sampler2D tDiffuse;',
		'varying vec2 vUv;',

		'void main() {',

		'vec4 texel = texture2D( tDiffuse, vUv );',

		'texel[0] = texture2D( tCurveMapper, vec2(texel[0],0) )[0];',
		'texel[1] = texture2D( tCurveMapper, vec2(texel[1],0) )[1];',
		'texel[2] = texture2D( tCurveMapper, vec2(texel[2],0) )[2];',

		'gl_FragColor = texel;',

		'}'

	].join('\n')

};

// This method takes one curve per channel and render it to a ramp texture that is used by the shader
// to correct the colors.

GZ3D.RGBCurvesShader.setupCurve = function (redCurve, greenCurve, blueCurve, shader)
{
	var rwidth = 256, rheight = 1, rsize = rwidth * rheight;
	var tcolor = new THREE.Color(0xffffff);
	var dataColor = new Uint8Array(rsize * 3);
	var i;


	for (var col = 0; col < 3; col++)
	{
		var colarr;

		switch (col)
		{
			case 0: colarr = redCurve; break;
			case 1: colarr = greenCurve; break;
			case 2: colarr = blueCurve; break;
		}

		for (i = 0; i < rwidth; i++)
		{
			dataColor[i * 3 + col] = i;
		}

		if (colarr.length > 2)
		{
			var curve = new THREE.CatmullRomCurve3(colarr);

			var steps = rwidth * 10.0;

			for (i = 0; i <= (steps+1.0); i++)
			{
				var vec = curve.getPoint(i / steps);
				var x = Math.floor(vec.x * (rwidth - 1));
				var val = Math.floor(vec.y * 255);

				dataColor[x * 3 + col] = Math.max(Math.min(val,255.0),0.0);
			}
		}
	}

	var colorRampTexture = shader.uniforms['tCurveMapper'].value;

	if (colorRampTexture!==null)
	{
		colorRampTexture.dispose();
	}

	colorRampTexture = new THREE.DataTexture(dataColor, rwidth, rheight, THREE.RGBFormat);
	shader.uniforms['tCurveMapper'].value = colorRampTexture;

	colorRampTexture.needsUpdate = true;

};




/**
 * The scene is where everything is placed, from objects, to lights and cameras.
 * @constructor
 */
GZ3D.Scene = function()
{
  this.init();
};

GZ3D.Scene.prototype.LIGHT_POINT = 1;
GZ3D.Scene.prototype.LIGHT_SPOT = 2;
GZ3D.Scene.prototype.LIGHT_DIRECTIONAL = 3;
GZ3D.Scene.prototype.LIGHT_UNKNOWN = 4;

/**
 * Initialize scene
 */
GZ3D.Scene.prototype.init = function()
{
  this.name = 'default';
  this.scene = new THREE.Scene();
  // this.scene.name = this.name;

  // Loaded models cache
  this.cachedModels = {};

  // only support one heightmap for now.
  this.heightmap = null;

  this.frameTime = 0;
  this.dropCycles = 0;

  this.selectedEntity = null;

  this.manipulationMode = 'view';
  this.pointerOnMenu = false;

  // create views manager
  this.viewManager = new GZ3D.MultiView(this);

  // lights
  this.ambient = new THREE.AmbientLight( 0x666666 );
  this.scene.add(this.ambient);

  // camera
  this.camera = this.viewManager.getViewByName(GZ3D.MULTIVIEW_MAINVIEW_NAME).camera;
  this.defaultCameraPosition = new THREE.Vector3(5, 0, 1);
  this.defaultCameraLookAt = new THREE.Vector3(0.0, 0.0, 0.0);
  this.resetView();

  // create post-processing composer
  this.composer = new GZ3D.Composer(this);
  this.composerSettings = new GZ3D.ComposerSettings();
  this.normalizedComposerSettings = new GZ3D.ComposerSettings();

  // create label manager
  this.labelManager = new GZ3D.LabelManager(this);

  // Grid
  this.grid = new THREE.GridHelper(10, 1,new THREE.Color( 0xCCCCCC ),new THREE.Color( 0x4D4D4D ));
  this.grid.name = 'grid';
  this.grid.position.z = 0.05;
  this.grid.rotation.x = Math.PI * 0.5;
  this.grid.castShadow = false;
  this.grid.material.transparent = true;
  this.grid.material.opacity = 0.5;
  this.grid.visible = false;
  this.scene.add(this.grid);

  this.showCollisions = false;
  this.lockSelectedIdentity = false;

  this.showLightHelpers = false;

  this.spawnModel = new GZ3D.SpawnModel(this);
  // Material for simple shapes being spawned (grey transparent)
  this.spawnedShapeMaterial = new THREE.MeshPhongMaterial(
      {color:0xffffff, flatShading: THREE.SmoothShading} );
  this.spawnedShapeMaterial.transparent = true;
  this.spawnedShapeMaterial.opacity = 0.5;

  var that = this;

  this.keyboardBindingsEnabled = true;

  // Handles for translating, scaling and rotating objects
  this.modelManipulator = new GZ3D.Manipulator(this, isTouchDevice);

  this.timeDown = null;

  this.emitter = new EventEmitter2({ verbose: true });

  // Radial menu (only triggered by touch)
  this.radialMenu = new GZ3D.RadialMenu(this);
  this.scene.add(this.radialMenu.menu);

  // Bounding Box
  var vertices = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 0),

    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 0)
  ];
  var boxGeometry = new THREE.Geometry();
  boxGeometry.vertices.push(
    vertices[0], vertices[1],
    vertices[1], vertices[2],
    vertices[2], vertices[3],
    vertices[3], vertices[0],

    vertices[4], vertices[5],
    vertices[5], vertices[6],
    vertices[6], vertices[7],
    vertices[7], vertices[4],

    vertices[0], vertices[4],
    vertices[1], vertices[5],
    vertices[2], vertices[6],
    vertices[3], vertices[7]
  );
  this.boundingBox = new THREE.LineSegments(boxGeometry,
      new THREE.LineBasicMaterial({color: 0xffffff}));
  this.boundingBox.visible = false;

  // Joint visuals
  this.jointTypes =
      {
        REVOLUTE: 1,
        REVOLUTE2: 2,
        PRISMATIC: 3,
        UNIVERSAL: 4,
        BALL: 5,
        SCREW: 6,
        GEARBOX: 7
      };
  this.jointAxis = new THREE.Object3D();
  this.jointAxis.name = 'JOINT_VISUAL';
  var geometry, material, mesh;

  // XYZ
  var XYZaxes = new THREE.Object3D();

  geometry = new THREE.CylinderGeometry(0.01, 0.01, 0.3, 10, 1, false);

  material = new THREE.MeshBasicMaterial({color: new THREE.Color(0xff0000)});
  mesh = new THREE.Mesh(geometry, material);
  mesh.position.x = 0.15;
  mesh.rotation.z = -Math.PI/2;
  mesh.name = 'JOINT_VISUAL';
  XYZaxes.add(mesh);

  material = new THREE.MeshBasicMaterial({color: new THREE.Color(0x00ff00)});
  mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = 0.15;
  mesh.name = 'JOINT_VISUAL';
  XYZaxes.add(mesh);

  material = new THREE.MeshBasicMaterial({color: new THREE.Color(0x0000ff)});
  mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = 0.15;
  mesh.rotation.x = Math.PI/2;
  mesh.name = 'JOINT_VISUAL';
  XYZaxes.add(mesh);

  geometry = new THREE.CylinderGeometry(0, 0.03, 0.1, 10, 1, true);

  material = new THREE.MeshBasicMaterial({color: new THREE.Color(0xff0000)});
  mesh = new THREE.Mesh(geometry, material);
  mesh.position.x = 0.3;
  mesh.rotation.z = -Math.PI/2;
  mesh.name = 'JOINT_VISUAL';
  XYZaxes.add(mesh);

  material = new THREE.MeshBasicMaterial({color: new THREE.Color(0x00ff00)});
  mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = 0.3;
  mesh.name = 'JOINT_VISUAL';
  XYZaxes.add(mesh);

  material = new THREE.MeshBasicMaterial({color: new THREE.Color(0x0000ff)});
  mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = 0.3;
  mesh.rotation.x = Math.PI/2;
  mesh.name = 'JOINT_VISUAL';
  XYZaxes.add(mesh);

  this.jointAxis['XYZaxes'] = XYZaxes;

  var mainAxis = new THREE.Object3D();

  material = new THREE.MeshLambertMaterial();
  material.color = new THREE.Color(0xffff00);
  material.emissive = material.color;

  geometry = new THREE.CylinderGeometry(0.02, 0.02, 0.25, 36, 1, false);

  mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = -0.175;
  mesh.rotation.x = Math.PI/2;
  mesh.name = 'JOINT_VISUAL';
  mainAxis.add(mesh);

  geometry = new THREE.CylinderGeometry(0, 0.035, 0.1, 36, 1, false);

  mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = Math.PI/2;
  mesh.name = 'JOINT_VISUAL';
  mainAxis.add(mesh);

  this.jointAxis['mainAxis'] = mainAxis;

  var rotAxis = new THREE.Object3D();

  geometry = new THREE.TorusGeometry(0.04, 0.006, 10, 36, Math.PI * 3/2);

  mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'JOINT_VISUAL';
  rotAxis.add(mesh);

  geometry = new THREE.CylinderGeometry(0.015, 0, 0.025, 10, 1, false);

  mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = -0.04;
  mesh.rotation.z = Math.PI/2;
  mesh.name = 'JOINT_VISUAL';
  rotAxis.add(mesh);

  this.jointAxis['rotAxis'] = rotAxis;

  var transAxis = new THREE.Object3D();

  geometry = new THREE.CylinderGeometry(0.01, 0.01, 0.1, 10, 1, true);

  mesh = new THREE.Mesh(geometry, material);
  mesh.position.x = 0.03;
  mesh.position.y = 0.03;
  mesh.position.z = -0.15;
  mesh.rotation.x = Math.PI/2;
  mesh.name = 'JOINT_VISUAL';
  transAxis.add(mesh);

  geometry = new THREE.CylinderGeometry(0.02, 0, 0.0375, 10, 1, false);

  mesh = new THREE.Mesh(geometry, material);
  mesh.position.x = 0.03;
  mesh.position.y = 0.03;
  mesh.position.z = -0.15 + 0.05;
  mesh.rotation.x = -Math.PI/2;
  mesh.name = 'JOINT_VISUAL';
  transAxis.add(mesh);

  mesh = new THREE.Mesh(geometry, material);
  mesh.position.x = 0.03;
  mesh.position.y = 0.03;
  mesh.position.z = -0.15 - 0.05;
  mesh.rotation.x = Math.PI/2;
  mesh.name = 'JOINT_VISUAL';
  transAxis.add(mesh);

  this.jointAxis['transAxis'] = transAxis;

  var screwAxis = new THREE.Object3D();

  mesh = new THREE.Mesh(geometry, material);
  mesh.position.x = -0.04;
  mesh.position.z = -0.11;
  mesh.rotation.z = -Math.PI/4;
  mesh.rotation.x = -Math.PI/10;
  mesh.name = 'JOINT_VISUAL';
  screwAxis.add(mesh);

  var radius = 0.04;
  var length = 0.02;
  var curve = new THREE.CatmullRomCurve3([new THREE.Vector3(radius, 0, 0*length),
                                      new THREE.Vector3(0, radius, 1*length),
                                      new THREE.Vector3(-radius, 0, 2*length),
                                      new THREE.Vector3(0, -radius, 3*length),
                                      new THREE.Vector3(radius, 0, 4*length),
                                      new THREE.Vector3(0, radius, 5*length),
                                      new THREE.Vector3(-radius, 0, 6*length)]);
  geometry = new THREE.TubeGeometry(curve, 36, 0.01, 10, false);

  mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = -0.23;
  mesh.name = 'JOINT_VISUAL';
  screwAxis.add(mesh);

  this.jointAxis['screwAxis'] = screwAxis;

  var ballVisual = new THREE.Object3D();

  geometry = new THREE.SphereGeometry(0.06);

  mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'JOINT_VISUAL';
  ballVisual.add(mesh);

  this.jointAxis['ballVisual'] = ballVisual;
};

GZ3D.Scene.prototype.setSDFParser = function(sdfParser)
{
  this.spawnModel.sdfParser = sdfParser;
};

/**
 * Begin natural manipulation of model
 * @param {} event - mousedown or touchdown events
 */

GZ3D.Scene.prototype.beginNaturalManipulation = function(event)
{
    this.naturalAutoAlignMode = null;

    if (event.ctrlKey)
    {
      return;
    }

    // check for model selection
    var mainPointer = true;
    var pos;
    if (event.touches)
    {
      if (event.touches.length === 1)
      {
        pos = new THREE.Vector2(
            event.touches[0].clientX, event.touches[0].clientY);
      }
      else
      {
        return;
      }
    }
    else
    {
      pos = new THREE.Vector2(event.clientX, event.clientY);
      if (event.button !== 0)
      {
        mainPointer = false;
      }
    }

    var intersect = new THREE.Vector3();
    var model = this.getRayCastModel(pos, intersect);

    // Cancel in case of multitouch
    if (event.touches && event.touches.length !== 1 || !mainPointer)
    {
      return;
    }

    if (model)
    {
      if (model.name === 'plane')
      {
        return;
      }
      // Attach manipulator to model
      else if (model.name !== '')
      {
        if (mainPointer && model.parent === this.scene)
        {
          this.selectEntity(model);
        }
      }
      else
      {
        return;
      }

      this.naturalAutoAlignMode = new GZ3D.AutoAlignModel(this);
      this.naturalAutoAlignMode.start(model);

      if (this.controls && this.controls.input && this.controls.input.mouse) {
        this.controls.input.mouse.enabled = false;
      }
    }

};

/**
 * Update natural manipulation of model
 * @param {} event - mousedown or touchdown events
 */

GZ3D.Scene.prototype.updateMoveNaturalManipulation = function(positionX,positionY)
{
  if (this.naturalAutoAlignMode)
  {
    this.naturalAutoAlignMode.moveAlignModel(positionX,positionY);
  }
};

/**
 * End natural manipulation of model
 * @param {} event - mousedown or touchdown events
 */

GZ3D.Scene.prototype.endNaturalManipulation = function(event)
{
  if (this.naturalAutoAlignMode)
  {
    this.naturalAutoAlignMode.finish();
    this.naturalAutoAlignMode = null;
    this.updateDynamicEnvMap();

    if (this.controls && this.controls.input && this.controls.input.mouse) {
      this.controls.input.mouse.enabled = true;
    }
  }
};

/**
 * attach window event callbacks
 */
GZ3D.Scene.prototype.attachEventListeners = function()
{
  if (!this.getDomElement()) {
    console.warn('GZ3D.Scene.attachEventListeners() - user view container element not defined!');
    return;
  }

  var that = this;

  // Need to use `document` instead of getDomElement in order to get event outside the webgl div element.
  this.getDomElement().addEventListener( 'mouseup', function(event) {that.onPointerUp(event);}, false );
  //document.addEventListener( 'mouseup', function(event) {that.onPointerUp(event);}, false );
  this.getDomElement().addEventListener( 'mousedown', function(event) {that.onPointerDown(event);}, false );
  this.getDomElement().addEventListener( 'touchstart', function(event) {that.onPointerDown(event);}, false );
  this.getDomElement().addEventListener( 'touchend', function(event) {that.onPointerUp(event);}, false );

  document.addEventListener( 'keydown', function(event) {that.onKeyDown(event);}, false );
};

/**
 * Window event callback
 * @param {} event - mousedown or touchdown events
 */
GZ3D.Scene.prototype.onPointerDown = function(event)
{
  if (this.keyboardBindingsEnabled === false) {
    return;
  }

  event.preventDefault();

  if (this.spawnModel.active)
  {
    return;
  }

  if (this.manipulationMode==='natural')
  {
    this.beginNaturalManipulation(event);
    this.updateUI();

    if (this.naturalAutoAlignMode)
    {
      return;
    }
  }

  this.timeDown = new Date().getTime();
};

/**
 * Window event callback
 * @param {} event - mouseup or touchend events
 */
GZ3D.Scene.prototype.onPointerUp = function(event)
{
  if (this.keyboardBindingsEnabled === false) {
    return;
  }

  event.preventDefault();

  if (this.naturalAutoAlignMode)
  {
    this.endNaturalManipulation();
    return;
  }

  var millisecs = new Date().getTime();
  if (millisecs - this.timeDown < 300)
  {
    // check for model selection
    var mainPointer = true;
    var pos;
    if (event.touches)
    {
      if (event.touches.length === 1)
      {
        pos = new THREE.Vector2(
            event.touches[0].clientX, event.touches[0].clientY);
      }
      else if (event.touches.length === 2)
      {
        pos = new THREE.Vector2(
            (event.touches[0].clientX + event.touches[1].clientX)/2,
            (event.touches[0].clientY + event.touches[1].clientY)/2);
      }
      else
      {
        return;
      }
    }
    else
    {
      pos = new THREE.Vector2(
          event.clientX, event.clientY);
      if (event.button !== 0)
      {
        mainPointer = false;
      }
    }

    var intersect = new THREE.Vector3();
    var model = this.getRayCastModel(pos, intersect);

    // Cancel in case of multitouch
    if (event.touches && event.touches.length !== 1)
    {
      return;
    }

    // Manipulation modes
    // Model found
    if (model)
    {

      if (model.name.indexOf('LABEL_INFO_VISUAL') >= 0)
      {
        guiEvents.emit('setTreeSelection', model.name);
      }
      else if (model.name === 'plane')
      {
        // Do nothing
      }
      else if (this.modelManipulator.pickerNames.indexOf(model.name) >= 0)
      {
        // Do not attach manipulator to itself
      }
      // Attach manipulator to model
      else if (model.name !== '')
      {
        if (mainPointer && model.parent === this.scene)
        {
          this.selectEntity(model);
        }
      }
      // Manipulator pickers, for mouse
      else if (this.modelManipulator.hovered)
      {
        this.modelManipulator.update();
        this.modelManipulator.object.updateMatrixWorld();
      }
      // Sky
      else
      {
        // Do nothing
      }
    }
    else {
      // Clicks (<150ms) outside any models trigger view mode
      this.setManipulationMode('view');
      $( '#view-mode' ).click();
      $('input[type="radio"]').checkboxradio('refresh');
    }
  }

  this.timeDown = null;
};

/**
 * Window event callback
 * @param {} event - mousescroll event
 */
GZ3D.Scene.prototype.onMouseScroll = function(event)
{
  event.preventDefault();

  var pos = new THREE.Vector2(event.clientX, event.clientY);

  var intersect = new THREE.Vector3();
  var model = this.getRayCastModel(pos, intersect);
};

/**
 * Window event callback
 * @param {} event - keydown events
 */
GZ3D.Scene.prototype.onKeyDown = function(event)
{
  if (this.keyboardBindingsEnabled === false) {
    return;
  }

  if (event.shiftKey)
  {
    // + and - for zooming
    if (event.keyCode === 187 || event.keyCode === 189)
    {
      var pos = new THREE.Vector2(window.innerWidth/2.0,
          window.innerHeight/2.0);

      var intersect = new THREE.Vector3();
      var model = this.getRayCastModel(pos, intersect);
    }
  }

  // DEL to delete entities
  if (event.keyCode === 46)
  {
    if (this.selectedEntity)
    {
      guiEvents.emit('delete_entity');
    }
  }


  // Esc/R/T for changing manipulation modes
  if (event.keyCode === 27) // Esc
  {
    $( '#view-mode' ).click();
    $('input[type="radio"]').checkboxradio('refresh');
  }
  if (event.keyCode === 82) // R
  {
    $( '#rotate-mode' ).click();
    $('input[type="radio"]').checkboxradio('refresh');
  }
  if (event.keyCode === 84) // T
  {
    $( '#translate-mode' ).click();
    $('input[type="radio"]').checkboxradio('refresh');
  }
};

/**
 * Prepare face to camera object for ray cast
 *
 */

GZ3D.Scene.prototype.prepareModelsForRaycast = function(before)
{
  var that = this;
  this.scene.traverse(function(node){

    if (before)
    {
      if (node._ignoreRaycast)
      {
        node._ignoreRayCastVisiblePrevState = node.visible;
        node.visible = false;
      }
      else if (node._raycastOnly)
      {
        node.visible = true;
      }
    }
    else
    {
      if (node._ignoreRayCastVisiblePrevState)
      {
        node.visible = node._ignoreRayCastVisiblePrevState;
        node._ignoreRayCastVisiblePrevState = undefined;
      }
      else if (node._raycastOnly)
      {
        node.visible = false;
      }
    }
  });

};

/**
 * Check if there's a model immediately under canvas coordinate 'pos'
 * @param {THREE.Vector2} pos - Canvas coordinates
 * @param {THREE.Vector3} intersect - Empty at input,
 * contains point of intersection in 3D world coordinates at output
 * @returns {THREE.Object3D} model - Intercepted model closest to the camera
 */
GZ3D.Scene.prototype.getRayCastModel = function(pos, intersect)
{
  var normalizedScreenCoords = new THREE.Vector2(
    ((pos.x - this.viewManager.mainUserView.renderer.domElement.offsetLeft) / this.viewManager.mainUserView.container.clientWidth) * 2 - 1,
    -((pos.y - this.viewManager.mainUserView.renderer.domElement.offsetTop) / this.viewManager.mainUserView.container.clientHeight) * 2 + 1
  );

  var raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(normalizedScreenCoords, this.camera);

  this.prepareModelsForRaycast(true);
  var objects = raycaster.intersectObjects(this.scene.children, true);
  this.prepareModelsForRaycast(false);

  var model;
  var point, i;
  if (objects.length > 0)
  {
    for (i = 0; i < objects.length; ++i)
    {
      model = objects[i].object;

      // Check first robot info

      if (model.name.indexOf('LABEL_INFO_VISUAL') >= 0)
      {
        this.robotInfoObject = model;
        return model;
      }
    }

    modelsloop:
    for (i = 0; i < objects.length; ++i)
    {
      model = objects[i].object;
      if (model.name.indexOf('_lightHelper') >= 0)
      {
        model = model.parent;
        break;
      }


      if (!this.modelManipulator.hovered &&
          (model.name === 'plane'))
      {
        // model = null;
        point = objects[i].point;
        break;
      }

      if (model.name === 'grid' || model.name === 'boundingBox' ||
          model.name === 'JOINT_VISUAL')
      {
        point = objects[i].point;
        model = null;
        continue;
      }

      while (model.parent !== this.scene)
      {
        // Select current mode's handle
        if (model.parent.parent === this.modelManipulator.gizmo &&
            ((this.manipulationMode === 'translate' &&
              model.name.indexOf('T') >=0) ||
             (this.manipulationMode === 'rotate' &&
               model.name.indexOf('R') >=0)))
        {
          break modelsloop;
        }
        model = model.parent;
      }

      if (model === this.radialMenu.menu)
      {
        continue;
      }

      if (model.name.indexOf('COLLISION_VISUAL') >= 0)
      {
        model = null;
        continue;
      }

      if (this.modelManipulator.hovered)
      {
        if (model === this.modelManipulator.gizmo)
        {
          break;
        }
      }
      else if (model.name !== '')
      {
        point = objects[i].point;
        break;
      }
    }
  }
  if (point)
  {
    intersect.x = point.x;
    intersect.y = point.y;
    intersect.z = point.z;
  }
  return model;
};

/**
 * Get dom element
 * @returns {domElement}
 */
GZ3D.Scene.prototype.getDomElement = function()
{
  return this.viewManager.mainUserView.container;
};

/**
 * Render scene
 */

GZ3D.Scene.prototype.render = function()
{
  this.viewManager.renderViews();
  this.updateUI();
};

/**
 * updateUI
 */

GZ3D.Scene.prototype.updateUI = function()
{
  this.modelManipulator.update();
  this.radialMenu.update();
};

/**
 * Add object to the scene
 * @param {THREE.Object3D} model
 */
GZ3D.Scene.prototype.add = function(model)
{
  model.viewAs = 'normal';
  this.scene.add(model);
  this.updateDynamicEnvMap();
  this.refresh3DViews();
};

/**
 * Remove object from the scene
 * @param {THREE.Object3D} model
 */
GZ3D.Scene.prototype.remove = function(model)
{
  this.scene.remove(model);
  this.updateDynamicEnvMap();
  this.refresh3DViews();
};

/**
 * Returns the object which has the given name
 * @param {string} name
 * @returns {THREE.Object3D} model
 */
GZ3D.Scene.prototype.getByName = function(name)
{
  return this.scene.getObjectByName(name, true);
};

/**
 * Update a model's pose
 * @param {THREE.Object3D} model
 * @param {} position
 * @param {} orientation
 */
GZ3D.Scene.prototype.updatePose = function(model, position, orientation)
{
  if (this.modelManipulator && this.modelManipulator.object &&
      this.modelManipulator.hovered)
  {
    return;
  }

  this.setPose(model, position, orientation);
};

/**
 * Set a model's pose
 * @param {THREE.Object3D} model
 * @param {} position
 * @param {} orientation
 */
GZ3D.Scene.prototype.setPose = function(model, position, orientation)
{
  model.position.x = position.x;
  model.position.y = position.y;
  model.position.z = position.z;
  model.quaternion.w = orientation.w;
  model.quaternion.x = orientation.x;
  model.quaternion.y = orientation.y;
  model.quaternion.z = orientation.z;
  this.refresh3DViews();
  this.updateBoundingBox(model);
};

/**
 * Set the scale of a model
 * @param {THREE.Object3D} model
 * @param {THREE.Vector3} scale
 */
GZ3D.Scene.prototype.setScale = function(model, scale) {
  model.scale.copy(scale);
  model.updateMatrixWorld();
  this.refresh3DViews();
  this.updateBoundingBox(model);
};

GZ3D.Scene.prototype.removeAll = function()
{
  while(this.scene.children.length > 0)
  {
    this.scene.remove(this.scene.children[0]);
  }
  this.refresh3DViews();
};

/**
 * Create plane
 * @param {double} normalX
 * @param {double} normalY
 * @param {double} normalZ
 * @param {double} width
 * @param {double} height
 * @returns {THREE.Mesh}
 */
GZ3D.Scene.prototype.createPlane = function(normalX, normalY, normalZ,
    width, height)
{
  var geometry = new THREE.PlaneGeometry(width, height, 1, 1);
  var material =  new THREE.MeshPhongMaterial(
      {color:0xbbbbbb, flatShading: THREE.SmoothShading} ); // Later Gazebo/Grey
  var mesh = new THREE.Mesh(geometry, material);
  var normal = new THREE.Vector3(normalX, normalY, normalZ);
  var cross = normal.crossVectors(normal, mesh.up);
  mesh.rotation = normal.applyAxisAngle(cross, -(normal.angleTo(mesh.up)));
  mesh.name = 'plane';
  mesh.receiveShadow = true;
  return mesh;
};

/**
 * Create sphere
 * @param {double} radius
 * @returns {THREE.Mesh}
 */
GZ3D.Scene.prototype.createSphere = function(radius)
{
  var geometry = new THREE.SphereGeometry(radius, 32, 32);
  var mesh = new THREE.Mesh(geometry, this.spawnedShapeMaterial);
  return mesh;
};

/**
 * Create cylinder
 * @param {double} radius
 * @param {double} length
 * @returns {THREE.Mesh}
 */
GZ3D.Scene.prototype.createCylinder = function(radius, length)
{
  var geometry = new THREE.CylinderGeometry(radius, radius, length, 32, 1,
      false);
  var mesh = new THREE.Mesh(geometry, this.spawnedShapeMaterial);
  mesh.rotation.x = Math.PI * 0.5;
  return mesh;
};

/**
 * Create box
 * @param {double} width
 * @param {double} height
 * @param {double} depth
 * @returns {THREE.Mesh}
 */
GZ3D.Scene.prototype.createBox = function(width, height, depth)
{
  var geometry = new THREE.BoxGeometry(width, height, depth, 1, 1, 1);

  // Fix UVs so textures are mapped in a way that is consistent to gazebo
  // Some face uvs need to be rotated clockwise, while others anticlockwise
  // After updating to threejs rev 62, geometries changed from quads (6 faces)
  // to triangles (12 faces).
  geometry.dynamic = true;
  var faceUVFixA = [1, 4, 5];
  var faceUVFixB = [0];
  for (var i = 0; i < faceUVFixA.length; ++i)
  {
    var idx = faceUVFixA[i]*2;
    var uva = geometry.faceVertexUvs[0][idx][0];
    geometry.faceVertexUvs[0][idx][0] = geometry.faceVertexUvs[0][idx][1];
    geometry.faceVertexUvs[0][idx][1] = geometry.faceVertexUvs[0][idx+1][1];
    geometry.faceVertexUvs[0][idx][2] = uva;

    geometry.faceVertexUvs[0][idx+1][0] = geometry.faceVertexUvs[0][idx+1][1];
    geometry.faceVertexUvs[0][idx+1][1] = geometry.faceVertexUvs[0][idx+1][2];
    geometry.faceVertexUvs[0][idx+1][2] = geometry.faceVertexUvs[0][idx][2];
  }
  for (var ii = 0; ii < faceUVFixB.length; ++ii)
  {
    var idxB = faceUVFixB[ii]*2;
    var uvc = geometry.faceVertexUvs[0][idxB][0];
    geometry.faceVertexUvs[0][idxB][0] = geometry.faceVertexUvs[0][idxB][2];
    geometry.faceVertexUvs[0][idxB][1] = uvc;
    geometry.faceVertexUvs[0][idxB][2] =  geometry.faceVertexUvs[0][idxB+1][1];

    geometry.faceVertexUvs[0][idxB+1][2] = geometry.faceVertexUvs[0][idxB][2];
    geometry.faceVertexUvs[0][idxB+1][1] = geometry.faceVertexUvs[0][idxB+1][0];
    geometry.faceVertexUvs[0][idxB+1][0] = geometry.faceVertexUvs[0][idxB][1];
  }
  geometry.uvsNeedUpdate = true;

  var mesh = new THREE.Mesh(geometry, this.spawnedShapeMaterial);
  mesh.castShadow = true;
  return mesh;
};

/**
 * Create light
 * @param {} type - 1: point, 2: spot, 3: directional
 * @param {} diffuse
 * @param {} intensity
 * @param {} pose
 * @param {} distance
 * @param {} cast_shadows
 * @param {} name
 * @param {} direction
 * @param {} specular
 * @param {} attenuation_constant
 * @param {} attenuation_linear
 * @param {} attenuation_quadratic
 * @param {} spot_angle
 * @param {} spot_falloff
 * @returns {THREE.Object3D}
 */
GZ3D.Scene.prototype.createLight = function(type, diffuse, intensity, pose,
    distance, cast_shadows, name, direction, specular, attenuation_constant,
    attenuation_linear, attenuation_quadratic, spot_angle, spot_falloff)
{
  var obj = new THREE.Object3D();
  var color = new THREE.Color();

  if (typeof(diffuse) === 'undefined')
  {
    diffuse = 0xffffff;
  }
  else if (typeof(diffuse) !== THREE.Color)
  {
    color.r = diffuse.r;
    color.g = diffuse.g;
    color.b = diffuse.b;
    diffuse = color.clone();
  }
  else if (typeof(specular) !== THREE.Color)
  {
    color.r = specular.r;
    color.g = specular.g;
    color.b = specular.b;
    specular = color.clone();
  }

  if (typeof(specular) === 'undefined') {
    specular = 0xffffff;
  }

  var matrixWorld;

  if (pose)
  {
    var quaternion = new THREE.Quaternion(
        pose.orientation.x,
        pose.orientation.y,
        pose.orientation.z,
        pose.orientation.w);

    var translation = new THREE.Vector3(
        pose.position.x,
        pose.position.y,
        pose.position.z);

    matrixWorld = new THREE.Matrix4();
    matrixWorld.compose(translation, quaternion, new THREE.Vector3(1,1,1));

    this.setPose(obj, pose.position, pose.orientation);
    obj.matrixWorldNeedsUpdate = true;
  }

  var elements;
  if (type === this.LIGHT_POINT)
  {
    elements = this.createPointLight(obj, diffuse, intensity,
        distance, cast_shadows);
  }
  else if (type === this.LIGHT_SPOT)
  {
    elements = this.createSpotLight(obj, diffuse, intensity,
        distance, cast_shadows, spot_angle, spot_falloff);
  }
  else if (type === this.LIGHT_DIRECTIONAL)
  {
    elements = this.createDirectionalLight(obj, diffuse, intensity,
        cast_shadows);
  }

  var lightObj = elements[0];
  var helper = elements[1];
  obj.add(lightObj);
  obj.add(helper);

  helper.visible = this.showLightHelpers;
  lightObj.up = new THREE.Vector3(0,0,1);
  lightObj.shadow.bias = -0.0005;

  if (name)
  {
    lightObj.name = name;
    obj.name = name;
    helper.name = name + '_lightHelper';
  } else {
    helper.name = '_lightHelper';
  }

  if ((type === this.LIGHT_SPOT || type === this.LIGHT_DIRECTIONAL) && !(direction instanceof THREE.Vector3)) {
    direction = new THREE.Vector3(0, 0, -1);
  }
  if (direction)
  {
    lightObj.target.name = name + '_target';
    obj.add(lightObj.target);
    lightObj.target.position.copy(direction);
    lightObj.target.updateMatrixWorld();
  }

  // Add properties which exist on the server but have no meaning on THREE.js
  obj.serverProperties = {};
  obj.serverProperties.specular = specular;
  obj.serverProperties.attenuation_constant = attenuation_constant;
  obj.serverProperties.attenuation_linear = attenuation_linear;
  obj.serverProperties.attenuation_quadratic = attenuation_quadratic;
  obj.serverProperties.initial = {};
  obj.serverProperties.initial.diffuse = diffuse;

  return obj;
};

/**
 * Create point light - called by createLight
 * @param {} obj - light object
 * @param {} color
 * @param {} intensity
 * @param {} distance
 * @param {} cast_shadows
 * @returns {Object.<THREE.Light, THREE.Mesh>}
 */
GZ3D.Scene.prototype.createPointLight = function(obj, color, intensity,
    distance, cast_shadows)
{
  if (typeof(intensity) === 'undefined')
  {
    intensity = 0.5;
  }

  var lightObj = new THREE.PointLight(color, intensity);
//  lightObj.shadowDarkness = 0.3;

  if (distance)
  {
    lightObj.distance = distance;
  }

  // point light shadow maps not supported yet, disable for now
  /*if (cast_shadows)
  {
    lightObj.castShadow = cast_shadows;
  }*/

  var helperGeometry = new THREE.OctahedronGeometry(0.25, 0);
  helperGeometry.applyMatrix(new THREE.Matrix4().makeRotationX(Math.PI/2));
  var helperMaterial = new THREE.MeshBasicMaterial(
        {wireframe: true, color: 0x00ff00});
  var helper = new THREE.Mesh(helperGeometry, helperMaterial);

  return [lightObj, helper];
};

/**
 * Create spot light - called by createLight
 * @param {} obj - light object
 * @param {} color
 * @param {} intensity
 * @param {} distance
 * @param {} cast_shadows
 * @returns {Object.<THREE.Light, THREE.Mesh>}
 */
GZ3D.Scene.prototype.createSpotLight = function(obj, color, intensity,
    distance, cast_shadows, angle, falloff)
{
  if (typeof(intensity) === 'undefined')
  {
    intensity = 1;
  }
  if (typeof(distance) === 'undefined')
  {
    distance = 20;
  }
  if (typeof(angle) === 'undefined')
  {
    angle = Math.PI/3;
  }
  if (typeof(falloff) === 'undefined')
  {
    falloff = 1;
  }

  var lightObj = new THREE.SpotLight(color, intensity, distance, angle, falloff);
  lightObj.position.set(0,0,0);
//  lightObj.shadowDarkness = 0.3;
  lightObj.shadow.bias = 0.0001;

  lightObj.shadow.camera.near = 0.1;
  lightObj.shadow.camera.far = 50;
  lightObj.shadow.camera.fov = (2 * angle / Math.PI) * 180;

  lightObj.shadow.mapSize.width = 2048;
  lightObj.shadow.mapSize.height = 2048;

  if (cast_shadows)
  {
    lightObj.castShadow = cast_shadows;
  }

  var helperGeometry = new THREE.CylinderGeometry(0, 0.3, 0.2, 4, 1, true);
  helperGeometry.applyMatrix(new THREE.Matrix4().makeRotationX(Math.PI/2));
  helperGeometry.applyMatrix(new THREE.Matrix4().makeRotationZ(Math.PI/4));
  var helperMaterial = new THREE.MeshBasicMaterial(
        {wireframe: true, color: 0x00ff00});
  var helper = new THREE.Mesh(helperGeometry, helperMaterial);

  return [lightObj, helper];

};

/**
 * Create directional light - called by createLight
 * @param {} obj - light object
 * @param {} color
 * @param {} intensity
 * @param {} cast_shadows
 * @returns {Object.<THREE.Light, THREE.Mesh>}
 */
GZ3D.Scene.prototype.createDirectionalLight = function(obj, color, intensity,
    cast_shadows)
{
  if (typeof(intensity) === 'undefined')
  {
    intensity = 1;
  }

  var lightObj = new THREE.DirectionalLight(color, intensity);
  lightObj.shadow.camera.near = 0.1;
  lightObj.shadow.camera.far = 50;
  lightObj.shadow.mapSize.width = 2048;
  lightObj.shadow.mapSize.height = 2048;
  lightObj.shadow.camera.bottom = -15;
  lightObj.shadow.camera.left = -15;
  lightObj.shadow.camera.right = 15;
  lightObj.shadow.camera.top = 15;
  lightObj.shadow.bias = 0.0001;
  lightObj.position.set(0,0,0);

  if (cast_shadows)
  {
    lightObj.castShadow = cast_shadows;
  }

  var helperGeometry = new THREE.Geometry();
  helperGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, 0));
  helperGeometry.vertices.push(new THREE.Vector3(-0.5,  0.5, 0));
  helperGeometry.vertices.push(new THREE.Vector3(-0.5,  0.5, 0));
  helperGeometry.vertices.push(new THREE.Vector3( 0.5,  0.5, 0));
  helperGeometry.vertices.push(new THREE.Vector3( 0.5,  0.5, 0));
  helperGeometry.vertices.push(new THREE.Vector3( 0.5, -0.5, 0));
  helperGeometry.vertices.push(new THREE.Vector3( 0.5, -0.5, 0));
  helperGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, 0));
  helperGeometry.vertices.push(new THREE.Vector3(   0,    0, 0));
  helperGeometry.vertices.push(new THREE.Vector3(   0,    0, -0.5));
  var helperMaterial = new THREE.LineBasicMaterial({color: 0x00ff00});
  var helper = new THREE.LineSegments(helperGeometry, helperMaterial);

  return [lightObj, helper];
};

/**
 * Create roads
 * @param {} points
 * @param {} width
 * @param {} texture
 * @returns {THREE.Mesh}
 */
GZ3D.Scene.prototype.createRoads = function(points, width, texture)
{
  var geometry = new THREE.Geometry();
  geometry.dynamic = true;
  var texCoord = 0.0;
  var texMaxLen = width;
  var factor = 1.0;
  var curLen = 0.0;
  var tangent = new THREE.Vector3(0,0,0);
  var pA;
  var pB;
  var prevPt = new THREE.Vector3(0,0,0);
  var prevTexCoord;
  var texCoords = [];
  var j = 0;
  for (var i = 0; i < points.length; ++i)
  {
    var pt0 =  new THREE.Vector3(points[i].x, points[i].y,
        points[i].z);
    var pt1;
    if (i !== points.length - 1)
    {
      pt1 =  new THREE.Vector3(points[i+1].x, points[i+1].y,
          points[i+1].z);
    }
    factor = 1.0;
    if (i > 0)
    {
      curLen += pt0.distanceTo(prevPt);
    }
    texCoord = curLen/texMaxLen;
    if (i === 0)
    {
      tangent.x = pt1.x;
      tangent.y = pt1.y;
      tangent.z = pt1.z;
      tangent.sub(pt0);
      tangent.normalize();
    }
    else if (i === points.length - 1)
    {
      tangent.x = pt0.x;
      tangent.y = pt0.y;
      tangent.z = pt0.z;
      tangent.sub(prevPt);
      tangent.normalize();
    }
    else
    {
      var v0 = new THREE.Vector3(0,0,0);
      var v1 = new THREE.Vector3(0,0,0);
      v0.x = pt0.x;
      v0.y = pt0.y;
      v0.z = pt0.z;
      v0.sub(prevPt);
      v0.normalize();

      v1.x = pt1.x;
      v1.y = pt1.y;
      v1.z = pt1.z;
      v1.sub(pt0);
      v1.normalize();

      var dot = v0.dot(v1*-1);

      tangent.x = pt1.x;
      tangent.y = pt1.y;
      tangent.z = pt1.z;
      tangent.sub(prevPt);
      tangent.normalize();

      if (dot > -0.97 && dot < 0.97)
      {
        factor = 1.0 / Math.sin(Math.acos(dot) * 0.5);
      }
    }
    var theta = Math.atan2(tangent.x, -tangent.y);
    pA = new THREE.Vector3(pt0.x,pt0.y,pt0.z);
    pB = new THREE.Vector3(pt0.x,pt0.y,pt0.z);
    var w = (width * factor)*0.5;
    pA.x += Math.cos(theta) * w;
    pA.y += Math.sin(theta) * w;
    pB.x -= Math.cos(theta) * w;
    pB.y -= Math.sin(theta) * w;

    geometry.vertices.push(pA);
    geometry.vertices.push(pB);

    texCoords.push([0, texCoord]);
    texCoords.push([1, texCoord]);

    // draw triangle strips
    if (i > 0)
    {
      geometry.faces.push(new THREE.Face3(j, j+1, j+2,
        new THREE.Vector3(0, 0, 1)));
      geometry.faceVertexUvs[0].push(
          [new THREE.Vector2(texCoords[j][0], texCoords[j][1]),
           new THREE.Vector2(texCoords[j+1][0], texCoords[j+1][1]),
           new THREE.Vector2(texCoords[j+2][0], texCoords[j+2][1])]);
      j++;

      geometry.faces.push(new THREE.Face3(j, j+2, j+1,
        new THREE.Vector3(0, 0, 1)));
      geometry.faceVertexUvs[0].push(
          [new THREE.Vector2(texCoords[j][0], texCoords[j][1]),
           new THREE.Vector2(texCoords[j+2][0], texCoords[j+2][1]),
           new THREE.Vector2(texCoords[j+1][0], texCoords[j+1][1])]);
      j++;

    }

    prevPt.x = pt0.x;
    prevPt.y = pt0.y;
    prevPt.z = pt0.z;

    prevTexCoord = texCoord;
  }

  // geometry.computeTangents();
  geometry.computeFaceNormals();

  geometry.verticesNeedUpdate = true;
  geometry.uvsNeedUpdate = true;


  var material =  new THREE.MeshPhongMaterial();

 /* var ambient = mat['ambient'];
  if (ambient)
  {
    material.emissive.setRGB(ambient[0], ambient[1], ambient[2]);
  }
  var diffuse = mat['diffuse'];
  if (diffuse)
  {
    material.color.setRGB(diffuse[0], diffuse[1], diffuse[2]);
  }
  var specular = mat['specular'];
  if (specular)
  {
    material.specular.setRGB(specular[0], specular[1], specular[2]);
  }*/
  if (texture)
  {
    var tex = THREE.ImageUtils.loadTexture(texture);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    material.map = tex;
  }

  var mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = false;
  return mesh;
};


/**
 * findLightIntensityInfo
 * Return min/max/ratio light intensity by combining all lights values
 */

GZ3D.Scene.prototype.findLightIntensityInfo = function ()
{
  var lights = [];
  this.scene.traverse(function (node)
  {
    if (node instanceof THREE.Light && !(node instanceof THREE.AmbientLight))
    {
      lights.push(node);
    }
  });

  var info = { min: 100.0, max: -100.0 };
  var numberOfLights = lights.length;

  for (var i = 0; i < numberOfLights; i += 1)
  {
    var entity = this.getByName(lights[i].name);
    var intensity = (lights[i].color.r + lights[i].color.g + lights[i].color.b) / 3.0;

    if (intensity < info.min)
    {
      info.min = intensity;
    }

    if (intensity > info.max)
    {
      info.max = intensity;
    }
  }

  return info;
};

/**
 * Load heightmap
 * @param {} heights
 * @param {} width
 * @param {} height
 * @param {} segmentWidth
 * @param {} segmentHeight
 * @param {} textures
 * @param {} blends
 * @param {} parent
 */
GZ3D.Scene.prototype.loadHeightmap = function(heights, width, height,
    segmentWidth, segmentHeight, origin, textures, blends, parent)
{
  if (this.heightmap)
  {
    return;
  }
  // unfortunately large heightmaps kills the fps and freeze everything so
  // we have to scale it down
  var scale = 1;
  var maxHeightmapWidth = 256;
  var maxHeightmapHeight = 256;

  if ((segmentWidth-1) > maxHeightmapWidth)
  {
    scale = maxHeightmapWidth / (segmentWidth-1);
  }

  var geometry = new THREE.PlaneGeometry(width, height,
      (segmentWidth-1) * scale, (segmentHeight-1) * scale);
  geometry.dynamic = true;

  // flip the heights
  var vertices = [];
  for (var h = segmentHeight-1; h >= 0; --h)
  {
    for (var w = 0; w < segmentWidth; ++w)
    {
      vertices[(segmentHeight-h-1)*segmentWidth  + w]
          = heights[h*segmentWidth + w];
    }
  }

  // sub-sample
  var col = (segmentWidth-1) * scale;
  var row = (segmentHeight-1) * scale;
  for (var r = 0; r < row; ++r)
  {
    for (var c = 0; c < col; ++c)
    {
      var index = (r * col * 1/(scale*scale)) +   (c * (1/scale));
      geometry.vertices[r*col + c].z = vertices[index];
    }
  }

  var mesh;
  if (textures && textures.length > 0)
  {
    geometry.computeFaceNormals();
    geometry.computeVertexNormals();
    geometry.computeTangents();

    var textureLoaded = [];
    var repeats = [];
    for (var t = 0; t < textures.length; ++t)
    {
      textureLoaded[t] = THREE.ImageUtils.loadTexture(textures[t].diffuse,
          new THREE.UVMapping());
      textureLoaded[t].wrapS = THREE.RepeatWrapping;
      textureLoaded[t].wrapT = THREE.RepeatWrapping;
      repeats[t] = width/textures[t].size;
    }

    // for now, use fixed no. of textures and blends
    // so populate the remaining ones to make the fragment shader happy
    for (var tt = textures.length; tt< 3; ++tt)
    {
      textureLoaded[tt] = textureLoaded[tt-1];
    }

    for (var b = blends.length; b < 2; ++b)
    {
      blends[b] = blends[b-1];
    }

    for (var rr = repeats.length; rr < 3; ++rr)
    {
      repeats[rr] = repeats[rr-1];
    }

    // Use the same approach as gazebo scene, grab the first directional light
    // and use it for shading the terrain
    var lightDir = new THREE.Vector3(0, 0, 1);
    var lightDiffuse = new THREE.Color(0xffffff);
    var allObjects = [];
    this.scene.getDescendants(allObjects);
    for (var l = 0; l < allObjects.length; ++l)
    {
      if (allObjects[l] instanceof THREE.DirectionalLight)
      {
        lightDir = allObjects[l].target.position;
        lightDiffuse = allObjects[l].color;
        break;
      }
    }

    var material = new THREE.ShaderMaterial({
      uniforms:
      {
        texture0: { type: 't', value: textureLoaded[0]},
        texture1: { type: 't', value: textureLoaded[1]},
        texture2: { type: 't', value: textureLoaded[2]},
        repeat0: { type: 'f', value: repeats[0]},
        repeat1: { type: 'f', value: repeats[1]},
        repeat2: { type: 'f', value: repeats[2]},
        minHeight1: { type: 'f', value: blends[0].min_height},
        fadeDist1: { type: 'f', value: blends[0].fade_dist},
        minHeight2: { type: 'f', value: blends[1].min_height},
        fadeDist2: { type: 'f', value: blends[1].fade_dist},
        ambient: { type: 'c', value: this.ambient.color},
        lightDiffuse: { type: 'c', value: lightDiffuse},
        lightDir: { type: 'v3', value: lightDir}
      },
      attributes: {},
      vertexShader: document.getElementById( 'heightmapVS' ).innerHTML,
      fragmentShader: document.getElementById( 'heightmapFS' ).innerHTML
    });

    mesh = new THREE.Mesh( geometry, material);
  }
  else
  {
    mesh = new THREE.Mesh( geometry,
        new THREE.MeshPhongMaterial( { color: 0x555555 } ) );
  }

  mesh.position.x = origin.x;
  mesh.position.y = origin.y;
  mesh.position.z = origin.z;
  parent.add(mesh);

  this.heightmap = parent;
};

/**
 * Load mesh
 * @param {string} uri
 * @param {} submesh
 * @param {} centerSubmesh
 * @param {function} callback
 */
GZ3D.Scene.prototype.loadMesh = function(uri, submesh, centerSubmesh,
    callback, progressCallback)
{
  var uriPath = uri.substring(0, uri.lastIndexOf('/'));
  var uriFile = uri.substring(uri.lastIndexOf('/') + 1);

  // load urdf model
  if (uriFile.substr(-4).toLowerCase() === '.dae')
  {
    return this.loadCollada(uri, submesh, centerSubmesh, callback, progressCallback);
  }
  else if (uriFile.substr(-5).toLowerCase() === '.urdf')
  {
    /*var urdfModel = new ROSLIB.UrdfModel({
      string : uri
    });

    // adapted from ros3djs
    var links = urdfModel.links;
    for ( var l in links) {
      var link = links[l];
      if (link.visual && link.visual.geometry) {
        if (link.visual.geometry.type === ROSLIB.URDF_MESH) {
          var frameID = '/' + link.name;
          var filename = link.visual.geometry.filename;
          var meshType = filename.substr(-4).toLowerCase();
          var mesh = filename.substring(filename.indexOf('://') + 3);
          // ignore mesh files which are not in Collada format
          if (meshType === '.dae')
          {
            var dae = this.loadCollada(uriPath + '/' + mesh, parent);
            // check for a scale
            if(link.visual.geometry.scale)
            {
              dae.scale = new THREE.Vector3(
                  link.visual.geometry.scale.x,
                  link.visual.geometry.scale.y,
                  link.visual.geometry.scale.z
              );
            }
          }
        }
      }
    }*/
  }
};

/**
 * Load collada file
 * @param {string} uri
 * @param {} submesh
 * @param {} centerSubmesh
 * @param {function} callback
 */
GZ3D.Scene.prototype.loadCollada = function(uri, submesh, centerSubmesh,
    callback, progressCallback)
{
  var dae;
  var mesh = null;

  var cachedModel = this.cachedModels[uri];
  if (cachedModel && cachedModel.referenceObject)
  {
    dae = cachedModel.referenceObject.clone();
    this.useColladaSubMesh(dae, submesh, centerSubmesh);
    callback(dae);
    return;
  }

  var loader = new THREE.ColladaLoader();
  loader.textureLoadedCallback = ()=>{this.refresh3DViews();};

  // var loader = new ColladaLoader2();
  // loader.options.convertUpAxis = true;
  var thatURI = uri;
  var thatSubmesh = submesh;
  var thatCenterSubmesh = centerSubmesh;

  var that = this;
  loader.load(uri, function(collada)
  {
    // check for a scale factor
    /*if(collada.dae.asset.unit)
    {
      var scale = collada.dae.asset.unit;
      collada.scene.scale = new THREE.Vector3(scale, scale, scale);
    }*/

    dae = collada.scene;
    dae.updateMatrix();
    that.prepareColladaMesh(dae);
    dae = dae.clone();
    that.useColladaSubMesh(dae, thatSubmesh, centerSubmesh);

    dae.name = uri;
    callback(dae);
  },function(progress) {
    if (progressCallback !== undefined) {
      progress.error = false;
      progressCallback(progress);
    }
  },function(){
    if (progressCallback !== undefined) {
      progressCallback({ total: 0, loaded: 0, error: true });
    }
  });
};

/**
 * Prepare collada by removing other non-mesh entities such as lights
 * @param {} dae
 */
GZ3D.Scene.prototype.prepareColladaMesh = function(dae)
{
  var allChildren = [];
  dae.getDescendants(allChildren);
  for (var i = 0; i < allChildren.length; ++i)
  {
    if (allChildren[i] instanceof THREE.Light)
    {
      allChildren[i].parent.remove(allChildren[i]);
    }
  }
};

/**
 * Prepare collada by handling submesh-only loading
 * @param {} dae
 * @param {} submesh
 * @param {} centerSubmesh
 * @returns {THREE.Mesh} mesh
 */
GZ3D.Scene.prototype.useColladaSubMesh = function(dae, submesh, centerSubmesh)
{
  if (!submesh)
  {
    return null;
  }

  var mesh;
  var allChildren = [];
  dae.getDescendants(allChildren);
  for (var i = 0; i < allChildren.length; ++i)
  {
    if (allChildren[i] instanceof THREE.Mesh)
    {
      if (!submesh && !mesh)
      {
        mesh = allChildren[i];
      }

      if (submesh)
      {

        if (allChildren[i].geometry.name === submesh)
        {
          if (centerSubmesh)
          {
            var vertices = allChildren[i].geometry.vertices;
            var vMin = new THREE.Vector3();
            var vMax = new THREE.Vector3();
            vMin.x = vertices[0].x;
            vMin.y = vertices[0].y;
            vMin.z = vertices[0].z;
            vMax.x = vMin.x;
            vMax.y = vMin.y;
            vMax.z = vMin.z;

            for (var j = 1; j < vertices.length; ++j)
            {
              vMin.x = Math.min(vMin.x, vertices[j].x);
              vMin.y = Math.min(vMin.y, vertices[j].y);
              vMin.z = Math.min(vMin.z, vertices[j].z);
              vMax.x = Math.max(vMax.x, vertices[j].x);
              vMax.y = Math.max(vMax.y, vertices[j].y);
              vMax.z = Math.max(vMax.z, vertices[j].z);
            }

            var center  = new THREE.Vector3();
            center.x = vMin.x + (0.5 * (vMax.x - vMin.x));
            center.y = vMin.y + (0.5 * (vMax.y - vMin.y));
            center.z = vMin.z + (0.5 * (vMax.z - vMin.z));

            for (var k = 0; k < vertices.length; ++k)
            {
              vertices[k].x -= center.x;
              vertices[k].y -= center.y;
              vertices[k].z -= center.z;
            }
            allChildren[i].geometry.verticesNeedUpdate = true;

            allChildren[i].position.x = 0;
            allChildren[i].position.y = 0;
            allChildren[i].position.z = 0;

            allChildren[i].parent.position.x = 0;
            allChildren[i].parent.position.y = 0;
            allChildren[i].parent.position.z = 0;
          }
          mesh = allChildren[i];
        }
        else
        {
          allChildren[i].parent.remove(allChildren[i]);
        }
      }
    }
  }
  return mesh;
};

/*GZ3D.Scene.prototype.setMaterial = function(mesh, texture, normalMap)
{
  if (!mesh)
  {
    return;
  }

  if (texture || normalMap)
  {
    // normal map shader
    var shader = THREE.ShaderLib['normalmap'];
    var uniforms = THREE.UniformsUtils.clone( shader.uniforms );
    if (texture)
    {
      uniforms['enableDiffuse'].value = true;
      uniforms['tDiffuse'].value = THREE.ImageUtils.loadTexture(texture);
    }
    if (normalMap)
    {
      uniforms['tNormal'].value = THREE.ImageUtils.loadTexture(normalMap);
    }

    var parameters = { fragmentShader: shader.fragmentShader,
        vertexShader: shader.vertexShader, uniforms: uniforms,
        lights: true, fog: false };
    var shaderMaterial = new THREE.ShaderMaterial(parameters);
    mesh.geometry.computeTangents();
    mesh.material = shaderMaterial;
  }
};*/

/**
 * Set material for an object
 * @param {} obj
 * @param {} material
 */
GZ3D.Scene.prototype.setMaterial = function(obj, material)
{
  if (obj)
  {
    if (obj instanceof THREE.Group)
    {
      var that = this;

      obj.traverse(function (node)
      {
        if (!(node instanceof THREE.Group))
        {
          that.setMaterial(node, material);
        }
      });

      return;
    }

    if (material)
    {
      obj.material = new THREE.MeshPhongMaterial();
      var emissive = material.emissive;
      if (emissive)
      {
        obj.material.emissive.setRGB(emissive[0], emissive[1], emissive[2]);
      }
      var diffuse = material.diffuse;
      if (diffuse)
      {
        obj.material.color.setRGB(diffuse[0], diffuse[1], diffuse[2]);
      }
      var specular = material.specular;
      if (specular)
      {
        obj.material.specular.setRGB(specular[0], specular[1], specular[2]);
      }
      var opacity = material.opacity;
      if (opacity)
      {
        if (opacity < 1)
        {
          obj.material.transparent = true;
          obj.material.opacity = opacity;
        }
      }

      if (material.texture)
      {
        var texture = THREE.ImageUtils.loadTexture(material.texture);
        if (material.scale)
        {
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
          texture.repeat.x = 1.0 / material.scale[0];
          texture.repeat.y = 1.0 / material.scale[1];
        }
        obj.material.map = texture;
      }
      if (material.normalMap)
      {
        obj.material.normalMap =
            THREE.ImageUtils.loadTexture(material.normalMap);
      }
    }

    this.updateDynamicEnvMap();
    this.refresh3DViews();
  }
};

/**
 * Set manipulation mode (view/translate/rotate/scale)
 * @param {string} mode
 */
GZ3D.Scene.prototype.setManipulationMode = function(mode)
{
  var previousMode = this.manipulationMode;
  this.manipulationMode = mode;

  if (mode === 'view' || mode==='natural')
  {
    if (this.modelManipulator.object)
    {
      this.emitter.emit('entityChanged', this.modelManipulator.object);
    }

    if (mode==='view' && previousMode==='natural')
    {
      if (this.selectedEntity)
      {
        this.showBoundingBox(this.selectedEntity);
      }
    }
    else
    {
      this.selectEntity(null);
    }
  }
  else
  {

    this.modelManipulator.mode = this.manipulationMode;
    this.modelManipulator.setMode(this.modelManipulator.mode);

  }

  this.refresh3DViews();
};

/**
 * Show collision visuals
 * @param {boolean} show
 */
GZ3D.Scene.prototype.showCollision = function(show)
{
  if (show === this.showCollisions)
  {
    return;
  }

  var allObjects = [];
  this.scene.getDescendants(allObjects);
  for (var i = 0; i < allObjects.length; ++i)
  {
    if (allObjects[i] instanceof THREE.Object3D &&
        allObjects[i].name.indexOf('COLLISION_VISUAL') >=0)
    {
      var allChildren = [];
      allObjects[i].getDescendants(allChildren);
      for (var j =0; j < allChildren.length; ++j)
      {
        if (allChildren[j] instanceof THREE.Mesh)
        {
          allChildren[j].visible = show;
        }
      }
    }
  }
  this.showCollisions = show;
  this.refresh3DViews();
};

/**
 * Attach manipulator to an object
 * @param {THREE.Object3D} model
 * @param {string} mode (translate/rotate/scale)
 */
GZ3D.Scene.prototype.attachManipulator = function(model,mode)
{
  if (this.modelManipulator.object)
  {
    this.emitter.emit('entityChanged', this.modelManipulator.object);
  }

  if (mode !== 'view')
  {
    this.modelManipulator.attach(model);
    this.modelManipulator.mode = mode;
    this.modelManipulator.setMode( this.modelManipulator.mode );
    this.scene.add(this.modelManipulator.gizmo);
  }
};

/**
 * Reset view
 */
GZ3D.Scene.prototype.resetView = function()
{
  this.camera.position.copy(this.defaultCameraPosition);
  this.camera.up = new THREE.Vector3(0, 0, 1);
  this.camera.lookAt(this.defaultCameraLookAt);
  this.camera.updateMatrix();
  this.refresh3DViews();
};

/**
 * Set the camera pose and the default value (position and LookAt) and update the projection matrix
 * @param {Float} xPos - x coordinate (camera position)
 * @param {Float} yPos - y coordinate (camera position)
 * @param {Float} zPos - z coordinate (camera position)
 * @param {Float} xLookAt - x coordinate (LookAt position)
 * @param {Float} yLookAt - y coordinate (LookAt position)
 * @param {Float} zLookAt - z coordinate (LookAt position)
 */
GZ3D.Scene.prototype.setDefaultCameraPose = function(xPos, yPos, zPos, xLookAt, yLookAt, zLookAt)
{
  this.defaultCameraPosition = new THREE.Vector3(xPos, yPos, zPos);
  this.defaultCameraLookAt = new THREE.Vector3(xLookAt, yLookAt, zLookAt);
  this.resetView();
};


 /**
 * Set the camera pose (position and LookAt) and update the projection matrix
 * @param {Float} xPos - x coordinate (camera position)
 * @param {Float} yPos - y coordinate (camera position)
 * @param {Float} zPos - z coordinate (camera position)
 * @param {Float} xLookAt - x coordinate (LookAt position)
 * @param {Float} yLookAt - y coordinate (LookAt position)
 * @param {Float} zLookAt - z coordinate (LookAt position)
 */
GZ3D.Scene.prototype.setCameraPose = function(xPos, yPos, zPos, xLookAt, yLookAt, zLookAt)
{
  this.camera.position = new THREE.Vector3(xPos, yPos, zPos);
  this.camera.lookAt(new THREE.Vector3(xLookAt, yLookAt, zLookAt));
  this.camera.updateMatrix();
  this.refresh3DViews();
};

/**
 * Show radial menu
 * @param {} event
 */
GZ3D.Scene.prototype.showRadialMenu = function(e)
{
  var event = e.originalEvent;

  var pointer = event.touches ? event.touches[ 0 ] : event;
  var pos = new THREE.Vector2(pointer.clientX, pointer.clientY);

  var intersect = new THREE.Vector3();
  var model = this.getRayCastModel(pos, intersect);

  if (model && model.name !== '' && model.name !== 'plane'
      && this.modelManipulator.pickerNames.indexOf(model.name) === -1)
  {
    this.radialMenu.show(event,model);
    this.selectEntity(model);
  }
};

/**
 * Update bounding box for a model. The box is aligned with the world.
 * @param {THREE.Object3D} model
 */
GZ3D.Scene.prototype.updateBoundingBox = function(model)
{
  if (typeof model === 'string')
  {
    model = this.scene.getObjectByName(model);
  }

  if (this.boundingBox.visible && model===this.boundingBox.boundingBoxObject)
  {
    var box = new THREE.Box3();
    var prevAngle = model.rotation.clone();
    var prevPos = model.position.clone();
    model.rotation.copy(new THREE.Euler( 0, 0, 0, 'XYZ' ));
    model.position.copy(new THREE.Vector3(0,0,0));
    model.updateMatrixWorld();
    box.setFromObject(model);
    model.rotation.copy(prevAngle);
    model.position.copy(prevPos);
    this.boundingBox.rotation.copy(prevAngle);
    this.boundingBox.position.copy(prevPos);
    model.updateMatrixWorld();
    this.boundingBox.updateMatrixWorld();

    var vertex = new THREE.Vector3(box.max.x, box.max.y, box.max.z); // 0
    this.boundingBox.geometry.vertices[0].copy(vertex);
    this.boundingBox.geometry.vertices[7].copy(vertex);
    this.boundingBox.geometry.vertices[16].copy(vertex);

    vertex.set(box.min.x, box.max.y, box.max.z); // 1
    this.boundingBox.geometry.vertices[1].copy(vertex);
    this.boundingBox.geometry.vertices[2].copy(vertex);
    this.boundingBox.geometry.vertices[18].copy(vertex);

    vertex.set(box.min.x, box.min.y, box.max.z); // 2
    this.boundingBox.geometry.vertices[3].copy(vertex);
    this.boundingBox.geometry.vertices[4].copy(vertex);
    this.boundingBox.geometry.vertices[20].copy(vertex);

    vertex.set(box.max.x, box.min.y, box.max.z); // 3
    this.boundingBox.geometry.vertices[5].copy(vertex);
    this.boundingBox.geometry.vertices[6].copy(vertex);
    this.boundingBox.geometry.vertices[22].copy(vertex);

    vertex.set(box.max.x, box.max.y, box.min.z); // 4
    this.boundingBox.geometry.vertices[8].copy(vertex);
    this.boundingBox.geometry.vertices[15].copy(vertex);
    this.boundingBox.geometry.vertices[17].copy(vertex);

    vertex.set(box.min.x, box.max.y, box.min.z); // 5
    this.boundingBox.geometry.vertices[9].copy(vertex);
    this.boundingBox.geometry.vertices[10].copy(vertex);
    this.boundingBox.geometry.vertices[19].copy(vertex);

    vertex.set(box.min.x, box.min.y, box.min.z); // 6
    this.boundingBox.geometry.vertices[11].copy(vertex);
    this.boundingBox.geometry.vertices[12].copy(vertex);
    this.boundingBox.geometry.vertices[21].copy(vertex);

    vertex.set(box.max.x, box.min.y, box.min.z); // 7
    this.boundingBox.geometry.vertices[13].copy(vertex);
    this.boundingBox.geometry.vertices[14].copy(vertex);
    this.boundingBox.geometry.vertices[23].copy(vertex);

    this.boundingBox.geometry.verticesNeedUpdate = true;
  }
};

/**
 * Show bounding box for a model. The box is aligned with the world.
 * @param {THREE.Object3D} model
 */
GZ3D.Scene.prototype.showBoundingBox = function(model)
{
  if (typeof model === 'string')
  {
    model = this.scene.getObjectByName(model);
  }

  if (this.boundingBox.visible)
  {
    if (this.boundingBox.boundingBoxObject === model)
    {
      return;
    }
    else
    {
      this.hideBoundingBox();
    }
  }

  this.boundingBox.name = 'boundingBox';
  this.boundingBox.visible = true;

  this.boundingBox.boundingBoxObject = model;

  this.updateBoundingBox(model);

  // Add box as model's child
  this.scene.add(this.boundingBox);
  this.refresh3DViews();
};

/**
 * Hide bounding box
 */
GZ3D.Scene.prototype.hideBoundingBox = function()
{
  if(this.boundingBox.boundingBoxObject)
  {
    this.scene.remove(this.boundingBox);
    this.boundingBox.boundingBoxObject = undefined;
  }
  this.boundingBox.visible = false;
  this.refresh3DViews();
};

/**
 * Mouse right click
 * @param {} event
 * @param {} callback - function to be executed to the clicked model
 */
GZ3D.Scene.prototype.onRightClick = function(event, callback)
{
  var pos = new THREE.Vector2(event.clientX, event.clientY);
  var model = this.getRayCastModel(pos, new THREE.Vector3());

  if(model && model.name !== '' && model.name !== 'plane' &&
      this.modelManipulator.pickerNames.indexOf(model.name) === -1)
  {
    callback(model);
  }
  this.refresh3DViews();
};


/**
 * Set model's view mode
 * @param {} model
 * @param {} viewAs (normal/transparent/wireframe)
 */
GZ3D.Scene.prototype.setViewAs = function(model, viewAs)
{
  function materialViewAs(material)
  {
    if (!material.originalOpacity)
    {
      material.originalOpacity = material.opacity;
    }

    if (materials.indexOf(material.id) === -1)
    {
      materials.push(material.id);

      if (viewAs === 'transparent')
      {
        material.opacity = 0.4;
      }
      else  // normal or wireframe
      {
        material.opacity = material.originalOpacity ? material.originalOpacity : 1.0;
      }
      material.transparent = material.opacity<1.0;

    }
  }

  var descendants = [];
  var materials = [];
  model.getDescendants(descendants);
  for (var i = 0; i < descendants.length; ++i)
  {
    if (descendants[i].material &&
        descendants[i].name.indexOf('boundingBox') === -1 &&
        descendants[i].name.indexOf('COLLISION_VISUAL') === -1 &&
        descendants[i].name.indexOf('LABEL_INFO_VISUAL') === -1 &&
        !this.getParentByPartialName(descendants[i], 'COLLISION_VISUAL')&&
        !this.getParentByPartialName(descendants[i], 'LABEL_INFO_VISUAL')&&
        descendants[i].name.indexOf('wireframe') === -1 &&
        descendants[i].name.indexOf('JOINT_VISUAL') === -1)
    {
      if (descendants[i].material instanceof THREE.MeshFaceMaterial)
      {
        for (var j = 0; j < descendants[i].material.materials.length; ++j)
        {
          materialViewAs(descendants[i].material.materials[j]);
        }
      }
      else
      {
        materialViewAs(descendants[i].material);
      }

      // wireframe handling
      var showWireframe = (viewAs === 'wireframe');
      if (descendants[i].material instanceof THREE.MeshFaceMaterial)
      {
        for (var m = 0; m < descendants[i].material.materials.length; m=m+1)
        {
          descendants[i].material.materials[m].wireframe = showWireframe;
        }
      }
      else
      {
        descendants[i].material.wireframe = showWireframe;
      }
    }
  }
  model.viewAs = viewAs;
  this.refresh3DViews();
};

/**
 * Returns the closest parent whose name contains the given string
 * @param {} object
 * @param {} name
 */
GZ3D.Scene.prototype.getParentByPartialName = function(object, name)
{
  var parent = object.parent;
  while (parent && parent !== this.scene)
  {
    if (parent.name.indexOf(name) !== -1)
    {
      return parent;
    }

    parent = parent.parent;
  }
  return null;
};

/**
 * Select entity
 * @param {} object
 */
GZ3D.Scene.prototype.selectEntity = function(object)
{
  if (this.lockSelectedIdentity)
  {
    return;
  }

  if (object)
  {
    var animatedExt = '_animated';

    if ((object.name.indexOf(animatedExt) < 0 || object.name.indexOf(animatedExt) !== object.name.length - animatedExt.length))
    {
      if (object !== this.selectedEntity)
      {
        this.showBoundingBox(object);
        this.selectedEntity = object;
      }

      //when scaling and object is not a simple shape, remove manipulator and switch to view mode
      if(this.manipulationMode === 'scale' && !object.isSimpleShape())
      {
        this.modelManipulator.detach();
        this.scene.remove(this.modelManipulator.gizmo);
        this.manipulationMode = 'view';
      }
      else if (this.manipulationMode!=='natural')
      {
        this.attachManipulator(object, this.manipulationMode);
      }

      guiEvents.emit('setTreeSelected', object.name);
    }
  }
  else
  {
    if (this.modelManipulator.object)
    {
      this.modelManipulator.detach();
      this.scene.remove(this.modelManipulator.gizmo);
    }
    this.hideBoundingBox();
    this.selectedEntity = null;
    guiEvents.emit('setTreeDeselected');

    this.refresh3DViews();
  }
};



/**
 * View joints
 * Toggle: if there are joints, hide, otherwise, show.
 * @param {} model
 */
GZ3D.Scene.prototype.viewJoints = function(model)
{
  if (model.joint === undefined || model.joint.length === 0)
  {
    return;
  }

  var child;

  // Visuals already exist
  if (model.jointVisuals)
  {
    // Hide = remove from parent
    if (model.jointVisuals[0].parent !== undefined)
    {
      for (var v = 0; v < model.jointVisuals.length; ++v)
      {
        model.jointVisuals[v].parent.remove(model.jointVisuals[v]);
      }
    }
    // Show: attach to parent
    else
    {
      for (var s = 0; s < model.joint.length; ++s)
      {
        child = model.getObjectByName(model.joint[s].child);

        if (!child)
        {
          continue;
        }

        child.add(model.jointVisuals[s]);
      }
    }
  }
  // Create visuals
  else
  {
    model.jointVisuals = [];
    for (var j = 0; j < model.joint.length; ++j)
    {
      child = model.getObjectByName(model.joint[j].child);

      if (!child)
      {
        continue;
      }

      // XYZ expressed w.r.t. child
      var jointVisual = this.jointAxis['XYZaxes'].clone();
      child.add(jointVisual);
      model.jointVisuals.push(jointVisual);
      jointVisual.scale.set(0.7, 0.7, 0.7);

      this.setPose(jointVisual, model.joint[j].pose.position,
          model.joint[j].pose.orientation);

      var mainAxis;
      if (model.joint[j].type !== this.jointTypes.BALL)
      {
        mainAxis = this.jointAxis['mainAxis'].clone();
        jointVisual.add(mainAxis);
      }

      var secondAxis;
      if (model.joint[j].type === this.jointTypes.REVOLUTE2 ||
          model.joint[j].type === this.jointTypes.UNIVERSAL)
      {
        secondAxis = this.jointAxis['mainAxis'].clone();
        jointVisual.add(secondAxis);
      }

      if (model.joint[j].type === this.jointTypes.REVOLUTE ||
          model.joint[j].type === this.jointTypes.GEARBOX)
      {
        mainAxis.add(this.jointAxis['rotAxis'].clone());
      }
      else if (model.joint[j].type === this.jointTypes.REVOLUTE2 ||
               model.joint[j].type === this.jointTypes.UNIVERSAL)
      {
        mainAxis.add(this.jointAxis['rotAxis'].clone());
        secondAxis.add(this.jointAxis['rotAxis'].clone());
      }
      else if (model.joint[j].type === this.jointTypes.BALL)
      {
        jointVisual.add(this.jointAxis['ballVisual'].clone());
      }
      else if (model.joint[j].type === this.jointTypes.PRISMATIC)
      {
        mainAxis.add(this.jointAxis['transAxis'].clone());
      }
      else if (model.joint[j].type === this.jointTypes.SCREW)
      {
        mainAxis.add(this.jointAxis['screwAxis'].clone());
      }

      var direction, tempMatrix, rotMatrix;
      if (mainAxis)
      {
        // main axis expressed w.r.t. parent model or joint frame
        // needs Gazebo issue #1268 fixed, receive use_parent_model_frame on msg
        // for now, true by default because most old models have it true
        if (model.joint[j].axis1.use_parent_model_frame === undefined)
        {
          model.joint[j].axis1.use_parent_model_frame = true;
        }

        direction = new THREE.Vector3(
            model.joint[j].axis1.xyz.x,
            model.joint[j].axis1.xyz.y,
            model.joint[j].axis1.xyz.z);
        direction.normalize();

        tempMatrix = new THREE.Matrix4();
        if (model.joint[j].axis1.use_parent_model_frame)
        {
          tempMatrix.extractRotation(jointVisual.matrix);
          tempMatrix.getInverse(tempMatrix);
          direction.applyMatrix4(tempMatrix);
          tempMatrix.extractRotation(child.matrix);
          tempMatrix.getInverse(tempMatrix);
          direction.applyMatrix4(tempMatrix);
        }

        mainAxis.position =  direction.multiplyScalar(0.3);
        rotMatrix = new THREE.Matrix4();
        rotMatrix.lookAt(direction, new THREE.Vector3(0, 0, 0), mainAxis.up);
        mainAxis.quaternion.setFromRotationMatrix(rotMatrix);
      }

      if (secondAxis)
      {
        if (model.joint[j].axis2.use_parent_model_frame === undefined)
        {
          model.joint[j].axis2.use_parent_model_frame = true;
        }

        direction = new THREE.Vector3(
            model.joint[j].axis2.xyz.x,
            model.joint[j].axis2.xyz.y,
            model.joint[j].axis2.xyz.z);
        direction.normalize();

        tempMatrix = new THREE.Matrix4();
        if (model.joint[j].axis2.use_parent_model_frame)
        {
          tempMatrix.extractRotation(jointVisual.matrix);
          tempMatrix.getInverse(tempMatrix);
          direction.applyMatrix4(tempMatrix);
          tempMatrix.extractRotation(child.matrix);
          tempMatrix.getInverse(tempMatrix);
          direction.applyMatrix4(tempMatrix);
        }

        secondAxis.position =  direction.multiplyScalar(0.3);
        rotMatrix = new THREE.Matrix4();
        rotMatrix.lookAt(direction, new THREE.Vector3(0, 0, 0), secondAxis.up);
        secondAxis.quaternion.setFromRotationMatrix(rotMatrix);
      }
    }
  }
  this.refresh3DViews();
};

/**
 * Update a light entity from a message
 * @param {} entity
 * @param {} msg
 */
GZ3D.Scene.prototype.updateLight = function(entity, msg)
{
  // TODO: Generalize this and createLight
  var lightObj = entity.children[0];
  var dir;

  var color = new THREE.Color();

  if (msg.diffuse)
  {
    color.r = msg.diffuse.r;
    color.g = msg.diffuse.g;
    color.b = msg.diffuse.b;
    lightObj.color = color.clone();
  }
  if (msg.specular)
  {
    color.r = msg.specular.r;
    color.g = msg.specular.g;
    color.b = msg.specular.b;
    entity.serverProperties.specular = color.clone();
  }

  if (msg.pose)
  {
    this.setPose(entity, msg.pose.position, msg.pose.orientation);
    entity.matrixWorldNeedsUpdate = true;
  }

  if (msg.range)
  {
    // THREE.js's light distance impacts the attenuation factor defined in the shader:
    // attenuation factor = 1.0 - distance-to-enlighted-point / light.distance
    // Gazebo's range (taken from OGRE 3D API) does not contribute to attenuation;
    // it is a hard limit for light scope.
    // Nevertheless, we identify them for sake of simplicity.
    lightObj.distance = msg.range;
  }

  if (msg.cast_shadows)
  {
    lightObj.castShadow = msg.cast_shadows;
  }

  if (msg.attenuation_constant)
  {
    entity.serverProperties.attenuation_constant = msg.attenuation_constant;
  }
  if (msg.attenuation_linear)
  {
    entity.serverProperties.attenuation_linear = msg.attenuation_linear;
    lightObj.intensity = lightObj.intensity/(1+msg.attenuation_linear);
  }
  if (msg.attenuation_quadratic)
  {
    entity.serverProperties.attenuation_quadratic = msg.attenuation_quadratic;
    lightObj.intensity = lightObj.intensity/(1+msg.attenuation_quadratic);
  }
  if (msg.attenuation_linear && msg.attenuation_quadratic)
  {
    // equation taken from
    // http://wiki.blender.org/index.php/Doc:2.6/Manual/Lighting/Lights/Light_Attenuation
    var E = 1;
    var D = 1;
    var r = 1;
    var L = msg.attenuation_linear;
    var Q = msg.attenuation_quadratic;
    lightObj.intensity = E*(D/(D+L*r))*(Math.pow(D,2)/(Math.pow(D,2)+Q*Math.pow(r,2)));
  }

  if (lightObj instanceof THREE.SpotLight) {
    if (msg.spot_outer_angle) {
      lightObj.angle = msg.spot_outer_angle;
      lightObj.shadowCameraFov = (2 * msg.spot_outer_angle / Math.PI) * 180;
    }
    if (msg.spot_falloff) {
      lightObj.exponent = msg.spot_falloff;
    }
  }

  this.refresh3DViews();
};

GZ3D.Scene.prototype.setShadowMaps = function(enabled) {
  this.viewManager.setShadowMaps(enabled);

  var that = this;
  this.scene.traverse(function(node) {
    if (enabled) {
      if (node.material) {
        node.material.needsUpdate = true;
        if (node.material.materials) {
          for (var i = 0; i < node.material.materials.length; i = i+1) {
            node.material.materials[i].needsUpdate = true;
          }
        }
      }
    } else {
      if (node instanceof THREE.Light) {
        if (that.viewManager && node.shadow!==undefined && node.shadow.map!==undefined) {
            that.viewManager.clearRenderTargets(node.shadow.map);
        }
      }
    }
  });

  this.refresh3DViews();
};

/**
 * Apply composer settings
 * Reflect the post-processing composer settings in the 3D scene.
 * @param updateColorCurve
*/

GZ3D.Scene.prototype.applyComposerSettings = function(updateColorCurve,forcePBRUpdate,shadowReset)
{
    this.composer.applyComposerSettings(updateColorCurve,forcePBRUpdate,shadowReset);
    this.needsImmediateUpdate = true;
};

/**
 * Force an update of the dynamic environment map
*/

GZ3D.Scene.prototype.updateDynamicEnvMap = function()
{
  this.composer.cubeMapNeedsUpdate = true;
  this.needsImmediateUpdate = true;
  this.refresh3DViews();
};

/**
 * Apply composer settings to a specific model
 * Update a model with the post-processing composer settings
 * @param updateColorCurve
*/

GZ3D.Scene.prototype.applyComposerSettingsToModel = function(model)
{
    this.composer.applyComposerSettingsToModel(model);
};

/**
 * Set master settings
 * Master settings can be used to changed the global quality of the scene.
 * It overrides the composer settings.
 * @param master settings
*/

GZ3D.Scene.prototype.setMasterSettings = function (masterSettings, applySettings)
{
    this.composer.setMasterSettings(masterSettings, applySettings);
    if (applySettings)
    {
      this.needsImmediateUpdate = true;
      this.refresh3DViews();
    }
  };

/**
 * Check a specific setting is supported by the current master setting level
 *
 * @param composer setting
*/

GZ3D.Scene.prototype.isSupportedByMasterSetting = function (setting)
{
  return this.composer.isSupportedByMasterSetting(setting);
};

/**
 * 3D views need to be refreshed
 *
*/

GZ3D.Scene.prototype.refresh3DViews = function ()
{
  for(var i=0; i<this.viewManager.views.length; i++)
  {
    this.viewManager.views[i].needsRefresh = true;
  }
};

/**
 * Set a callback that is called when the scene preparation is done. The callback is called with null when everyhing is ready or with a progress message.
 *
 * @param callback
*/

GZ3D.Scene.prototype.setScenePreparationReadyCallback = function (sceneReadyCallback)
{
  this.composer.sceneReadyCallback = sceneReadyCallback;
};

/**
 * Show labels for sensors and links
 *
*/

GZ3D.Scene.prototype.setLabelInfoVisible = function (object, visible)
{
  this.labelManager.setLabelInfoVisible(object,visible);

  if (visible)
  {
    this.hideBoundingBox();
  }
  else if (this.selectedEntity)
  {
    this.showBoundingBox(this.selectedEntity);
  }

};




/**
 * SDF parser constructor initializes SDF parser with the given parameters
 * and defines a DOM parser function to parse SDF XML files
 * @param {object} scene - the gz3d scene object
 * @param {object} gui - the gz3d gui object
 * @param {object} gziface - the gz3d gziface object
 */
GZ3D.SdfParser = function(scene, gui, gziface)
{
  // set the sdf version
  this.SDF_VERSION = 1.5;
  this.MATERIAL_ROOT = GZ3D.assetsPath + '/';

  // set the xml parser function
  this.parseXML = function(xmlStr) {
    return (new window.DOMParser()).parseFromString(xmlStr, 'text/xml');
  };

  this.scene = scene;
  this.scene.setSDFParser(this);
  this.gui = gui;
  this.gziface = gziface;
  this.init();

  // cache materials if more than one model needs them
  this.materials = [];
  this.entityMaterial = {};

};

/**
 * Initializes SDF parser by connecting relevant events from gziface
 */
GZ3D.SdfParser.prototype.init = function()
{
  var that = this;
  var errorMsg = 'GzWeb is currently running without a server and' +
    ' materials could not be loaded. When connected, the scene will be reinitialized.';
  this.gziface.emitter.on('error', function() {
    console.debug(errorMsg);
    that.gui.guiEvents.emit('notification_popup', errorMsg, 5000);
    that.onConnectionError();
  });

  this.gziface.emitter.on('material', function(mat) {
    that.materials = mat;
  });

  this.gziface.emitter.on('gzstatus', function(gzstatus) {
    if (gzstatus === 'error')
    {
      console.debug(errorMsg);
      that.gui.guiEvents.emit('notification_popup', errorMsg, 5000);
      that.onConnectionError();
    }
  });
};

/**
 * Event callback function for gziface connection error which occurs
 * when gziface cannot connect to gzbridge websocket
 * this is due to 2 reasons:
 * 1 - gzbridge websocket might not be run yet
 * 2 - gzbridge websocket is trying to connect to gzserver which is not running currenly
 */
GZ3D.SdfParser.prototype.onConnectionError = function()
{
  var that = this;
  var entityCreated = function(model, type)
  {
    if (!that.gziface.isConnected)
    {
      that.addModelByType(model, type);
    }
  };
  this.gui.emitter.on('entityCreated', entityCreated);

  var deleteEntity = function(entity)
  {
    var name = entity.name;
    var obj = that.scene.getByName(name);
    if (obj !== undefined)
    {
      if (obj.children[0] instanceof THREE.Light)
      {
        that.gui.setLightStats({name: name}, 'delete');
      }
      else
      {
        that.gui.setModelStats({name: name}, 'delete');
      }
      that.scene.remove(obj);
    }
  };
  this.gui.emitter.on('deleteEntity', deleteEntity);
};

/**
 * Parses string which denotes the color
 * @param {string} colorStr - string which denotes the color where every value
 * should be separated with single white space
 * @returns {object} color - color object having r,g,b and alpha values
 */
GZ3D.SdfParser.prototype.parseColor = function(colorStr)
{
  var color = {};
  var values = colorStr.trim().split(' ');

  color.r = parseFloat(values[0]);
  color.g = parseFloat(values[1]);
  color.b = parseFloat(values[2]);
  color.a = parseFloat(values[3]);

  return color;
};

/**
 * Parses string which is a 3D vector
 * @param {string} vectorStr - string which denotes the vector where every value
 * should be separated with single white space
 * @returns {object} vector3D - vector having x, y, z values
 */
GZ3D.SdfParser.prototype.parse3DVector = function(vectorStr)
{
  var vector3D = {};
  var values = vectorStr.trim().split(' ');
  vector3D.x = parseFloat(values[0]);
  vector3D.y = parseFloat(values[1]);
  vector3D.z = parseFloat(values[2]);
  return vector3D;
};

/**
 * Creates THREE light object according to properties of sdf object
 * which is parsed from sdf model of the light
 * @param {object} sdfObj - object which is parsed from the sdf string
 * @returns {THREE.Light} lightObj - THREE light object created
 * according to given properties. The type of light object is determined
 * according to light type
 */
GZ3D.SdfParser.prototype.spawnLightFromSDF = function(sdfObj)
{
  var light = sdfObj.light;
  var lightObj;
  var color = new THREE.Color();
  var diffuseColor = this.parseColor(light.diffuse);
  color.r = diffuseColor.r;
  color.g = diffuseColor.g;
  color.b = diffuseColor.b;

  if (light['@type'] === 'point')
  {
    lightObj = new THREE.PointLight(color.getHex());
    lightObj.distance = light.range;
    this.scene.setPose(lightObj, light.pose.position, light.pose.orientation);
  }
  if (light['@type'] === 'spot')
  {
    lightObj = new THREE.SpotLight(color.getHex());
    lightObj.distance = light.range;
    this.scene.setPose(lightObj, light.pose.position, light.pose.orientation);
  }
  else if (light['@type'] === 'directional')
  {
    lightObj = new THREE.DirectionalLight(color.getHex());

    var direction = this.parse3DVector(light.direction);
    var dir = new THREE.Vector3(direction.x, direction.y, direction.z);
    var target = dir;
    var negDir = dir.negate();
    negDir.normalize();
    var factor = 10;
    var pose = this.parsePose(light.pose);
    pose.position.x += factor * negDir.x;
    pose.position.y += factor * negDir.y;
    pose.position.z += factor * negDir.z;

    target.x -= pose.position.x;
    target.y -= pose.position.y;
    target.z -= pose.position.z;

    lightObj.target.position = target;
    lightObj.shadow.camera.near = 1;
    lightObj.shadow.camera.far = 50;
    lightObj.shadow.map.width = 2048;
    lightObj.shadow.map.height = 2048;
    lightObj.shadow.camera.bottom = -100;
    lightObj.shadow.camera.left = -100;
    lightObj.shadow.camera.right = 100;
    lightObj.shadow.camera.top = 100;
    lightObj.shadow.bias = 0.0001;

    lightObj.position.set(negDir.x, negDir.y, negDir.z);
    this.scene.setPose(lightObj, pose.position, pose.orientation);
  }
  lightObj.intensity = parseFloat(light.attenuation.constant);
  lightObj.castShadow = light.cast_shadows;
  lightObj.name = light['@name'];

  return lightObj;
};

/**
 * Parses a string which is a 3D vector
 * @param {string} poseStr - string which denotes the pose of the object
 * where every value should be separated with single white space and first three denotes
 * x,y,z and values of the pose, and following three denotes euler rotation around x,y,z
 * @returns {object} pose - pose object having position (x,y,z)(THREE.Vector3)
 * and orientation (THREE.Quaternion) properties
 */
GZ3D.SdfParser.prototype.parsePose = function(poseStr)
{
  var values = poseStr.trim().split(' ');

  var position = new THREE.Vector3(parseFloat(values[0]),
          parseFloat(values[1]), parseFloat(values[2]));

  // get euler rotation and convert it to Quaternion
  var quaternion = new THREE.Quaternion();
  var euler = new THREE.Euler(parseFloat(values[3]), parseFloat(values[4]),
          parseFloat(values[5]), 'ZYX');
  quaternion.setFromEuler(euler);

  var pose = {
    'position': position,
    'orientation': quaternion
  };

  return pose;

};

/**
 * Parses a string which is a 3D vector
 * @param {string} scaleStr - string which denotes scaling in x,y,z
 * where every value should be separated with single white space
 * @returns {THREE.Vector3} scale - THREE Vector3 object
 * which denotes scaling of an object in x,y,z
 */
GZ3D.SdfParser.prototype.parseScale = function(scaleStr)
{
  var values = scaleStr.trim().split(' ');
  var scale = new THREE.Vector3(parseFloat(values[0]), parseFloat(values[1]),
          parseFloat(values[2]));
  return scale;
};

/**
 * Parses SDF material element which is going to be used by THREE library
 * It matches material scripts with the material objects which are
 * already parsed by gzbridge and saved by SDFParser
 * @param {object} material - SDF material object
 * @returns {object} material - material object which has the followings:
 * texture, normalMap, ambient, diffuse, specular, opacity
 */
GZ3D.SdfParser.prototype.createMaterial = function(material)
{
  var textureUri, texture, mat;
  var ambient, diffuse, specular, opacity, normalMap;

  if (!material) { return null; }

  var script = material.script;
  if (script)
  {
    if (script.uri)
    {
      // if there is just one uri convert it to array
      if (!(script.uri instanceof Array))
      {
        script.uri = [script.uri];
      }

      if (script.name)
      {
        mat = this.materials[script.name];
        // if we already cached the materials
        if (mat)
        {
          ambient = mat.ambient;
          diffuse = mat.diffuse;
          specular = mat.specular;
          opacity = mat.opacity;

          if (mat.texture)
          {
            for (var i = 0; i < script.uri.length; ++i)
            {
              var uriType = script.uri[i].substring(0, script.uri[i]
                      .indexOf('://'));
              if (uriType === 'model')
              {
                // if texture uri
                if (script.uri[i].indexOf('textures') > 0)
                {
                  textureUri = script.uri[i].substring(script.uri[i]
                          .indexOf('://') + 3);
                  break;
                }
              }
              else if (uriType === 'file')
              {
                if (script.uri[i].indexOf('materials') > 0)
                {
                  textureUri = script.uri[i].substring(script.uri[i]
                          .indexOf('://') + 3, script.uri[i]
                          .indexOf('materials') + 9)
                          + '/textures';
                  break;
                }
              }
            }
            texture = this.MATERIAL_ROOT + textureUri + '/' + mat.texture;
          }
        }
        else
        {
          //TODO: how to handle if material is not cached
          console.log(script.name + ' is not cached!!!');
        }
      }
    }
  }

  // normal map
  if (material.normal_map)
  {
    var mapUri;
    if (material.normal_map.indexOf('://') > 0)
    {
      mapUri = material.normal_map.substring(
              material.normal_map.indexOf('://') + 3, material.normal_map
                      .lastIndexOf('/'));
    }
    else
    {
      mapUri = textureUri;
    }
    if (mapUri)
    {
      var startIndex = material.normal_map.lastIndexOf('/') + 1;
      if (startIndex < 0)
      {
        startIndex = 0;
      }
      var normalMapName = material.normal_map.substr(startIndex,
              material.normal_map.lastIndexOf('.') - startIndex);
      normalMap = this.MATERIAL_ROOT + mapUri + '/' + normalMapName + '.png';
    }
  }

  return {
    texture: texture,
    normalMap: normalMap,
    ambient: ambient,
    diffuse: diffuse,
    specular: specular,
    opacity: opacity
  };

};

/**
 * Parses a string which is a size of an object
 * @param {string} sizeStr - string which denotes size in x,y,z
 * where every value should be separated with single white space
 * @returns {object} size - size object which denotes
 * size of an object in x,y,z
 */
GZ3D.SdfParser.prototype.parseSize = function(sizeStr)
{
  var sizeObj;
  var values = sizeStr.trim().split(' ');
  var x = parseFloat(values[0]);
  var y = parseFloat(values[1]);
  var z = parseFloat(values[2]);
  sizeObj = {
    'x': x,
    'y': y,
    'z': z
  };

  return sizeObj;
};

/**
 * Parses SDF geometry element and creates corresponding mesh,
 * when it creates the THREE.Mesh object it directly add it to the parent
 * object.
 * @param {object} geom - SDF geometry object which determines the geometry
 *  of the object and can have following properties: box, cylinder, sphere,
 *   plane, mesh
 * @param {object} mat - SDF material object which is going to be parsed
 * by createMaterial function
 * @param {object} parent - parent 3D object
 */
GZ3D.SdfParser.prototype.createGeom = function(geom, mat, parent)
{
  var that = this;
  var obj;
  var size, normal;

  var material = this.createMaterial(mat);
  if (geom.box)
  {
    size = this.parseSize(geom.box.size);
    obj = this.scene.createBox(size.x, size.y, size.z);
  }
  else if (geom.cylinder)
  {
    obj = this.scene.createCylinder(geom.cylinder.radius, geom.cylinder.length);
  }
  else if (geom.sphere)
  {
    obj = this.scene.createSphere(geom.sphere.radius);
  }
  else if (geom.plane)
  {
    normal = this.parseSize(geom.plane.normal);
    size = this.parseSize(geom.plane.size);
    obj = this.scene.createPlane(normal.x, normal.y, normal.z, size.x, size.y);
  }
  else if (geom.mesh)
  {
    {
      var meshUri = geom.mesh.uri;
      var submesh = geom.mesh.submesh;
      var centerSubmesh = geom.mesh.center_submesh;

      var uriType = meshUri.substring(0, meshUri.indexOf('://'));
      if (uriType === 'file' || uriType === 'model')
      {
        var modelName = meshUri.substring(meshUri.indexOf('://') + 3);
        if (geom.mesh.scale)
        {
          var scale = this.parseScale(geom.mesh.scale);
          parent.scale.x = scale.x;
          parent.scale.y = scale.y;
          parent.scale.z = scale.z;
        }

        var modelUri = this.MATERIAL_ROOT + modelName;
        var materialName = parent.name + '::' + modelUri;
        this.entityMaterial[materialName] = material;

        this.scene.loadMesh(modelUri, submesh, centerSubmesh, function(dae){
          if (that.entityMaterial[materialName])
          {
            var allChildren = [];
            dae.getDescendants(allChildren);
            for (var c = 0; c < allChildren.length; ++c)
            {
              if (allChildren[c] instanceof THREE.Mesh)
              {
                that.scene.setMaterial(allChildren[c],
                        that.entityMaterial[materialName]);
                break;
              }
            }
          }
          parent.add(dae);
          loadGeom(parent);
        });
      }
    }
  }
  //TODO: how to handle height map without connecting to the server
  //  else if (geom.heightmap)
  //  {
  //    var request = new ROSLIB.ServiceRequest({
  //      name : that.scene.name
  //    });
  //
  //    // redirect the texture paths to the assets dir
  //    var textures = geom.heightmap.texture;
  //    for ( var k = 0; k < textures.length; ++k)
  //    {
  //      textures[k].diffuse = this.parseUri(textures[k].diffuse);
  //      textures[k].normal = this.parseUri(textures[k].normal);
  //    }
  //
  //    var sizes = geom.heightmap.size;
  //
  //    // send service request and load heightmap on response
  //    this.heightmapDataService.callService(request,
  //        function(result)
  //        {
  //          var heightmap = result.heightmap;
  //          // gazebo heightmap is always square shaped,
  //          // and a dimension of: 2^N + 1
  //          that.scene.loadHeightmap(heightmap.heights, heightmap.size.x,
  //              heightmap.size.y, heightmap.width, heightmap.height,
  //              heightmap.origin, textures,
  //              geom.heightmap.blend, parent);
  //            //console.log('Result for service call on ' + result);
  //        });
  //
  //    //this.scene.loadHeightmap(parent)
  //  }

  if (obj)
  {
    if (material)
    {
      // texture mapping for simple shapes and planes only,
      // not used by mesh and terrain
      this.scene.setMaterial(obj, material);
    }
    obj.updateMatrix();
    parent.add(obj);
    loadGeom(parent);
  }

  function loadGeom(visualObj)
  {
    var allChildren = [];
    visualObj.getDescendants(allChildren);
    for (var c = 0; c < allChildren.length; ++c)
    {
      if (allChildren[c] instanceof THREE.Mesh)
      {
        allChildren[c].castShadow = visualObj.castShadow===undefined;
        allChildren[c].receiveShadow = visualObj.receiveShadow===undefined;

        if (visualObj.castShadow)
        {
          allChildren[c].castShadow = visualObj.castShadow;
        }
        if (visualObj.receiveShadow)
        {
          allChildren[c].receiveShadow = visualObj.receiveShadow;
        }

        if (visualObj.name !== undefined && visualObj.name.indexOf('COLLISION_VISUAL') >= 0)
        {
          allChildren[c].castShadow = false;
          allChildren[c].receiveShadow = false;

          allChildren[c].visible = that.scene.showCollisions;
        }
        break;
      }
    }

    that.scene.applyComposerSettingsToModel(visualObj);
  }
};

/**
 * Parses SDF visual element and creates THREE 3D object by parsing
 * geometry element using createGeom function
 * @param {object} visual - SDF visual element
 * @returns {THREE.Object3D} visualObj - 3D object which is created
 * according to SDF visual element.
 */
GZ3D.SdfParser.prototype.createVisual = function(visual)
{
  //TODO: handle these node values
  // cast_shadow, receive_shadows
  if (visual.geometry)
  {
    var visualObj = new THREE.Object3D();
    visualObj.name = visual['@name'] || visual['name'];

    if (visual.pose)
    {
      var visualPose = this.parsePose(visual.pose);
      this.scene
        .setPose(visualObj, visualPose.position, visualPose.orientation);
    }

    visualObj.castShadow = visual.cast_shadows;
    visualObj.receiveShadow = visual.receive_shadows;

    this.createGeom(visual.geometry, visual.material, visualObj);

    return visualObj;
  }

  return null;

};

/**
 * Parses SDF XML string or SDF XML DOM object
 * @param {object} sdf - It is either SDF XML string or SDF XML DOM object
 * @returns {THREE.Object3D} object - 3D object which is created from the
 * given SDF.
 */
GZ3D.SdfParser.prototype.spawnFromSDF = function(sdf)
{
  //convert SDF to Json object
  //TODO: we need better xml 2 json object convertor (done?)
  var jsonObj = xml2json.parser(sdf);
  var sdfObj = jsonObj.sdf;
  // it is easier to manipulate json object

  if (sdfObj.model)
  {
    return this.spawnModelFromSDF(sdfObj);
  }
  else if (sdfObj.light)
  {
    return this.spawnLightFromSDF(sdfObj);
  }
};

/**
 * Loads SDF file according to given model name
 * @param {string} modelName - name of the model
 * @returns {THREE.Object3D} modelObject - 3D object which is created
 * according to SDF model.
 */
GZ3D.SdfParser.prototype.loadSDF = function(modelName)
{
  var sdf = this.loadModel(modelName);
  return this.spawnFromSDF(sdf);
};

/**
 * Creates 3D object from parsed model SDF
 * @param {object} sdfObj - parsed SDF object
 * @returns {THREE.Object3D} modelObject - 3D object which is created
 * according to SDF model object.
 */
GZ3D.SdfParser.prototype.spawnModelFromSDF = function(sdfObj)
{
  // create the model
  var modelObj = this.createModel(sdfObj.model);

  //  this.scene.add(modelObj);
  return modelObj;

};

GZ3D.SdfParser.prototype.createModel = function(model)
{
  // create the model
  var modelObj = new THREE.Object3D();
  modelObj.name = model.name;
  //TODO: is that needed
  //modelObj.userData.id = sdfObj.model.@id;

  var pose;

  if (model.pose)
  {
    pose = this.parsePose(model.pose);
    this.scene.setPose(modelObj, pose.position, pose.orientation);
  }

  // go through nested models
  if (model.model)
  {
    //convert link object to link array
    if (!(model.model instanceof Array))
    {
      model.model = [model.model];
    }

    for (var i = 0; i < model.model.length; ++i)
    {
      var newModelObj = this.createModel(model.model[i]);
      modelObj.add(newModelObj);
    }
  }

  // go through links
  if (model.link)
  {
    //convert link object to link array
    if (!(model.link instanceof Array))
    {
      model.link = [model.link];
    }

    for (var j = 0; j < model.link.length; ++j)
    {
      var newLinkObj = this.createLink(model.link[j]);
      modelObj.add(newLinkObj);
    }
  }

  return modelObj;
};

/**
 * Creates a link 3D object of the model. A model consists of links
 * these links are 3D objects. The function creates only visual elements
 * of the link by createLink function
 * @param {object} link - parsed SDF link object
 * @returns {THREE.Object3D} linkObject - 3D link object
 */
GZ3D.SdfParser.prototype.createLink = function(link)
{
  var linkPose, visualObj;
  var linkObj = new THREE.Object3D();
  linkObj.name = link['@name'];

  if (link.pose)
  {
    linkPose = this.parsePose(link.pose);
    this.scene.setPose(linkObj, linkPose.position, linkPose.orientation);
  }

  if (link.visual)
  {
    if (!(link.visual instanceof Array))
    {
      link.visual = [link.visual];
    }

    for (var i = 0; i < link.visual.length; ++i)
    {
      visualObj = this.createVisual(link.visual[i]);
      if (visualObj && !visualObj.parent)
      {
        linkObj.add(visualObj);
      }
    }
  }

  if (link.collision)
  {
    if (link.collision.visual)
    {
      if (!(link.collision.visual instanceof Array))
      {
        link.collision.visual = [link.collision.visual];
      }

      for (var j = 0; j < link.collision.visual.length; ++j)
      {
        visualObj = this.createVisual(link.collision.visual[j]);
        if (visualObj && !visualObj.parent)
        {
          linkObj.add(visualObj);
        }
      }

    }
  }

  // go through sub-links
  if (link.link)
  {
    //convert link object to link array
    if (!(link.link instanceof Array))
    {
      link.link = [link.link];
    }

    for (var k = 0; k < link.link.length; ++k)
    {
      var newLinkObj = this.createLink(link.link[k]);
      linkObj.add(newLinkObj);
    }
  }

  return linkObj;
};

/**
 * Creates 3D object according to model name and type of the model and add
 * the created object to the scene.
 * @param {THREE.Object3D} model - model object which will be added to scene
 * @param {string} type - type of the model which can be followings: box,
 * sphere, cylinder, spotlight, directionallight, pointlight
 */
GZ3D.SdfParser.prototype.addModelByType = function(model, type)
{
  var sdf, translation, euler;
  var quaternion = new THREE.Quaternion();
  var modelObj;

  if (model.matrixWorld)
  {
    var matrix = model.matrixWorld;
    translation = new THREE.Vector3();
    var scale = new THREE.Vector3();
    matrix.decompose(translation, quaternion, scale);
  }

  if (type === 'box')
  {
    euler = new THREE.Euler();
    euler.setFromQuaternion(quaternion);
    sdf = this.createBoxSDF(translation, euler);
    modelObj = this.spawnFromSDF(sdf);
    modelObj.userData.isSimpleShape = true;
  }
  else if (type === 'sphere')
  {
    euler = new THREE.Euler();
    euler.setFromQuaternion(quaternion);
    sdf = this.createSphereSDF(translation, euler);
    modelObj = this.spawnFromSDF(sdf);
    modelObj.userData.isSimpleShape = true;
  }
  else if (type === 'cylinder')
  {
    euler = new THREE.Euler();
    euler.setFromQuaternion(quaternion);
    sdf = this.createCylinderSDF(translation, euler);
    modelObj = this.spawnFromSDF(sdf);
    modelObj.userData.isSimpleShape = true;
  }
  else if (type === 'spotlight')
  {
    modelObj = this.scene.createLight(2);
    this.scene.setPose(modelObj, translation, quaternion);
  }
  else if (type === 'directionallight')
  {
    modelObj = this.scene.createLight(3);
    this.scene.setPose(modelObj, translation, quaternion);
  }
  else if (type === 'pointlight')
  {
    modelObj = this.scene.createLight(1);
    this.scene.setPose(modelObj, translation, quaternion);
  }
  else
  {
    var sdfObj = this.loadSDF(type);
    modelObj = new THREE.Object3D();
    modelObj.add(sdfObj);
    modelObj.name = model.name;
    this.scene.setPose(modelObj, translation, quaternion);
  }

  var that = this;

  var addModelFunc;
  addModelFunc = function()
  {
    // check whether object is removed
    var obj = that.scene.getByName(modelObj.name);
    if (obj === undefined)
    {
      that.scene.add(modelObj);
      that.gui.setModelStats(modelObj, 'update');
    }
    else
    {
      setTimeout(addModelFunc, 100);
    }
  };

  setTimeout(addModelFunc , 100);

//  this.scene.add(modelObj);
//  this.gui.setModelStats(modelObj, 'update');
};

/**
 * Creates SDF string for simple shapes: box, cylinder, sphere.
 * @param {string} type - type of the model which can be followings: box,
 * sphere, cylinder
 * @param {THREE.Vector3} translation - denotes the x,y,z position
 * of the object
 * @param {THREE.Euler} euler - denotes the euler rotation of the object
 * @param {string} geomSDF - geometry element string of 3D object which is
 * already created according to type of the object
 * @returns {string} sdf - SDF string of the simple shape
 */
GZ3D.SdfParser.prototype.createSimpleShapeSDF = function(type, translation,
        euler, geomSDF)
  {
  var sdf;

  sdf = '<sdf version="' + this.SDF_VERSION + '">' + '<model name="' + type
          + '">' + '<pose>' + translation.x + ' ' + translation.y + ' '
          + translation.z + ' ' + euler.x + ' ' + euler.y + ' ' + euler.z
          + '</pose>' + '<link name="link">'
          + '<inertial><mass>1.0</mass></inertial>'
          + '<collision name="collision">' + '<geometry>' + geomSDF
          + '</geometry>' + '</collision>' + '<visual name="visual">'
          + '<geometry>' + geomSDF + '</geometry>' + '<material>' + '<script>'
          + '<uri>file://media/materials/scripts/gazebo.material' + '</uri>'
          + '<name>Gazebo/Grey</name>' + '</script>' + '</material>'
          + '</visual>' + '</link>' + '</model>' + '</sdf>';

  return sdf;
};

/**
 * Creates SDF string of box geometry element
 * @param {THREE.Vector3} translation - the x,y,z position of
 * the box object
 * @param {THREE.Euler} euler - the euler rotation of the box object
 * @returns {string} geomSDF - geometry SDF string of the box
 */
GZ3D.SdfParser.prototype.createBoxSDF = function(translation, euler)
{
  var geomSDF = '<box>' + '<size>1.0 1.0 1.0</size>' + '</box>';

  return this.createSimpleShapeSDF('box', translation, euler, geomSDF);
};

/**
 * Creates SDF string of sphere geometry element
 * @param {THREE.Vector3} translation - the x,y,z position of
 * the box object
 * @param {THREE.Euler} euler - the euler rotation of the box object
 * @returns {string} geomSDF - geometry SDF string of the sphere
 */
GZ3D.SdfParser.prototype.createSphereSDF = function(translation, euler)
{
  var geomSDF = '<sphere>' + '<radius>0.5</radius>' + '</sphere>';

  return this.createSimpleShapeSDF('sphere', translation, euler, geomSDF);
};

/**
 * Creates SDF string of cylinder geometry element
 * @param {THREE.Vector3} translation - the x,y,z position of
 * the box object
 * @param {THREE.Euler} euler - the euler rotation of the cylinder object
 * @returns {string} geomSDF - geometry SDF string of the cylinder
 */
GZ3D.SdfParser.prototype.createCylinderSDF = function(translation, euler)
{
  var geomSDF = '<cylinder>' + '<radius>0.5</radius>' + '<length>1.0</length>'
          + '</cylinder>';

  return this.createSimpleShapeSDF('cylinder', translation, euler, geomSDF);
};

/**
 * Loads SDF of the model. It first constructs the url of the model
 * according to modelname
 * @param {string} modelName - name of the model
 * @returns {XMLDocument} modelDOM - SDF DOM object of the loaded model
 */
GZ3D.SdfParser.prototype.loadModel = function(modelName)
{
  var modelFile = this.MATERIAL_ROOT + modelName + '/model.sdf';

  var xhttp = new XMLHttpRequest();
  xhttp.overrideMimeType('text/xml');
  xhttp.open('GET', modelFile, false);
  xhttp.send();
  return xhttp.responseText;
};

/**
 * Spawn a model into the scene
 * @constructor
 */
GZ3D.SpawnModel = function(scene)
{
  this.scene = scene;
  this.init();
  this.obj = undefined;
  this.callback = undefined;
  this.sdfParser = undefined;
};

/**
 * Initialize SpawnModel
 */

GZ3D.SpawnModel.prototype.init = function ()
{
  this.plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  this.ray = new THREE.Ray();
  this.obj = null;
  this.active = false;
  this.autoAlignModel = new GZ3D.AutoAlignModel(this.scene);
};


/**
 * Start spawning an entity. Only simple shapes supported so far.
 * Adds a temp object to the scene which is not registered on the server.
 * @param {string} entity
 * @param {function} callback
 */
GZ3D.SpawnModel.prototype.start = function (entity, callback, position, quaternion,scale)
{
  if (this.active)
  {
    this.finish();
  }

  if (!angular.isDefined(this.scene.getDomElement())) {
    console.warn('SpawnModel.start() - no DOM element defined!');
    return;
  } else {
    this.attachEventListeners();
  }

  this.callback = callback;

  this.obj = new THREE.Object3D();
  var mesh;
  var zoffset = 0.5;

   this.autoAlignModel.start(this.obj);

  if (entity === 'box')
  {
    mesh = this.scene.createBox(1, 1, 1);
    this.obj.userData.shapeName = entity;
  }
  else if (entity === 'sphere')
  {
    mesh = this.scene.createSphere(0.5);
    this.obj.userData.shapeName = entity;
  }
  else if (entity === 'cylinder')
  {
    mesh = this.scene.createCylinder(0.5, 1.0);
    this.obj.userData.shapeName = entity;
  }
  else if (entity === 'pointlight')
  {
    mesh = this.scene.createLight(this.scene.LIGHT_POINT);
  }
  else if (entity === 'spotlight')
  {
    mesh = this.scene.createLight(this.scene.LIGHT_SPOT);
  }
  else if (entity === 'directionallight')
  {
    mesh = this.scene.createLight(this.scene.LIGHT_DIRECTIONAL);
  }
  else
  {
    mesh = this.sdfParser.loadSDF(entity);
    //TODO: add transparency to the object
    zoffset = 0;
    this.autoAlignModel.alignOnMeshBase();
  }

  this.obj.name = this.generateUniqueName(entity);
  this.obj.add(mesh);

  var viewWidth = this.scene.getDomElement().clientWidth;
  var viewHeight = this.scene.getDomElement().clientHeight;

  // temp model appears within current view
  var pos = new THREE.Vector2(viewWidth / 2, viewHeight / 2);
  var intersect = new THREE.Vector3();
  this.scene.getRayCastModel(pos, intersect);

  this.obj.position.x = intersect.x;
  this.obj.position.y = intersect.y;
  this.obj.position.z += zoffset;
  this.scene.add(this.obj);
  // For the inserted light to have effect
  var allObjects = [];
  this.scene.scene.getDescendants(allObjects);
  for (var l = 0; l < allObjects.length; ++l)
  {
    if (allObjects[l].material)
    {
      allObjects[l].material.needsUpdate = true;
    }
  }

  if (position && quaternion)
  {
    this.scene.setPose(this.obj, position, quaternion);
  }

  if (scale)
  {
    this.scene.setScale(this.obj, scale);
  }

  this.active = true;

};

/**
 * Finish spawning an entity: re-enable camera controls,
 * remove listeners, remove temp object
 */
GZ3D.SpawnModel.prototype.finish = function ()
{
  this.detachEventListeners();

  this.scene.remove(this.obj);
  this.obj = undefined;
  this.active = false;

  this.autoAlignModel.finish();
  this.scene.updateDynamicEnvMap();
};

/**
 * Window event callback
 * @param {} event - not yet
 */
GZ3D.SpawnModel.prototype.onMouseDown = function (event)
{
  // Does this ever get called?
  // Change like this:
  // https://bitbucket.org/osrf/gzweb/pull-request/14/switch-to-arrow-mode-when-spawning-models/diff
  event.preventDefault();
  event.stopImmediatePropagation();
};

/**
 * Window event callback
 * @param {} event - mousemove events
 */
GZ3D.SpawnModel.prototype.onMouseMove = function (event)
{
  if (!this.active)
  {
    return;
  }

  event.preventDefault();

  this.moveSpawnedModel(event.clientX, event.clientY);
};

/**
 * Window event callback
 * @param {} event - touchmove events
 */
GZ3D.SpawnModel.prototype.onTouchMove = function (event, originalEvent)
{
  if (!this.active)
  {
    return;
  }

  var e;

  if (originalEvent)
  {
    e = event;
  }
  else
  {
    e = event.originalEvent;
  }
  e.preventDefault();

  if (e.touches.length === 1)
  {
    this.moveSpawnedModel(e.touches[0].pageX, e.touches[0].pageY);
  }
};

/**
 * Window event callback
 * @param {} event - touchend events
 */
GZ3D.SpawnModel.prototype.onTouchEnd = function ()
{
  if (!this.active)
  {
    return;
  }

  this.callback(this.obj);
  this.finish();
};

/**
 * Window event callback
 * @param {} event - mousedown events
 */
GZ3D.SpawnModel.prototype.onMouseUp = function (event)
{
  if (!this.active)
  {
    return;
  }

  this.callback(this.obj);
  this.finish();
};

/**
 * Window event callback
 * @param {} event - keyup events
 */
GZ3D.SpawnModel.prototype.onKeyUp = function (event)
{
  this.autoAlignModel.onKeyUp(event);
};

/**
 * Window event callback
 * @param {} event - keydown events
 */
GZ3D.SpawnModel.prototype.onKeyDown = function (event)
{
  if (event.keyCode === 27) // Esc
  {
    this.finish();
  }
  else
  {
    this.autoAlignModel.onKeyDown(event);
  }
};

/**
 * Move temp spawned model
 * @param {integer} positionX - Horizontal position on the canvas
 * @param {integer} positionY - Vertical position on the canvas
 */
GZ3D.SpawnModel.prototype.moveSpawnedModel = function (positionX, positionY)
{
  this.autoAlignModel.moveAlignModel(positionX,positionY);

};

/**
 * Generate unique name for spawned entity
 * @param {string} entity - entity type
 */
GZ3D.SpawnModel.prototype.generateUniqueName = function (entity)
{
  var i = 0;
  while (i < 1000)
  {
    if (this.scene.getByName(entity + '_' + i))
    {
      ++i;
    }
    else
    {
      return entity + '_' + i;
    }
  }
};

/**
 * Attach the event listeners for interaction
 */
GZ3D.SpawnModel.prototype.attachEventListeners = function()
{
  var that = this;

  this.mouseDown = function(event) {that.onMouseDown(event);};
  this.mouseUp = function(event) {that.onMouseUp(event);};
  this.mouseMove = function(event) {that.onMouseMove(event);};
  this.keyDown = function(event) {that.onKeyDown(event);};
  this.keyUp = function (event) { that.onKeyUp(event); };
  this.touchMove = function(event) {that.onTouchMove(event,true);};
  this.touchEnd = function(event) {that.onTouchEnd(event);};

  this.scene.getDomElement().addEventListener('mousedown', that.mouseDown, false);
  this.scene.getDomElement().addEventListener('mouseup', that.mouseUp, false);
  this.scene.getDomElement().addEventListener('mousemove', that.mouseMove, false);
  window.addEventListener('keydown', that.keyDown, false);
  window.addEventListener('keyup', that.keyUp, false);

  this.scene.getDomElement().addEventListener('touchmove', that.touchMove, false);
  this.scene.getDomElement().addEventListener('touchend', that.touchEnd, false);
};

/**
 * Detach the event listeners for interaction
 */
GZ3D.SpawnModel.prototype.detachEventListeners = function()
{
  var that = this;

  this.scene.getDomElement().removeEventListener('mousedown', that.mouseDown, false);
  this.scene.getDomElement().removeEventListener('mouseup', that.mouseUp, false);
  this.scene.getDomElement().removeEventListener('mousemove', that.mouseMove, false);
  window.removeEventListener('keydown', that.keyDown, false);
  window.removeEventListener('keyup', that.keyUp, false);
};

/**
 * SSAO Shader for occlusion ambient
 *
 * This is a customized version of the THREE.SSAOShader shader. It uses slightly different user variables.
 *
 */

GZ3D.SSAOShader = {

	uniforms: {

		'tDiffuse':     { value: null },
		'tDepth':       { value: null },
		'size':         { value: new THREE.Vector2( 512, 512 ) },
		'cameraNear':   { value: 1 },
		'cameraFar':    { value: 100 },
		'onlyAO':       { value: 0 },
		'aoClamp':      { value: 0.5 },
		'lumInfluence': { value: 0.5 }

	},

	vertexShader: [

		'varying vec2 vUv;',

		'void main() {',

			'vUv = uv;',

			'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',

		'}'

	].join( '\n' ),

	fragmentShader: [

		'uniform float cameraNear;',
		'uniform float cameraFar;',

		'uniform bool onlyAO;',      // use only ambient occlusion pass?

		'uniform vec2 size;',        // texture width, height
		'uniform float aoClamp;',    // depth clamp - reduces haloing at screen edges

		'uniform float lumInfluence;',  // how much luminance affects occlusion

		'uniform sampler2D tDiffuse;',
		'uniform sampler2D tDepth;',

		'varying vec2 vUv;',

		// '#define PI 3.14159265',
		'#define DL 2.399963229728653',  // PI * ( 3.0 - sqrt( 5.0 ) )
		'#define EULER 2.718281828459045',

		// user variables

		'const int samples = 8;',     // ao sample count
		'const float radius = 5.0;',  // ao radius

		'const bool useNoise = false;',      // use noise instead of pattern for sample dithering
		'const float noiseAmount = 0.0003;', // dithering amount

		'const float diffArea = 0.4;',   // self-shadowing reduction
		'const float gDisplace = 0.6;',  // gauss bell center


		// RGBA depth

		'#include <packing>',

		// generating noise / pattern texture for dithering

		'vec2 rand( const vec2 coord ) {',

			'vec2 noise;',

			'if ( useNoise ) {',

				'float nx = dot ( coord, vec2( 12.9898, 78.233 ) );',
				'float ny = dot ( coord, vec2( 12.9898, 78.233 ) * 2.0 );',

				'noise = clamp( fract ( 43758.5453 * sin( vec2( nx, ny ) ) ), 0.0, 1.0 );',

			'} else {',

				'float ff = fract( 1.0 - coord.s * ( size.x / 2.0 ) );',
				'float gg = fract( coord.t * ( size.y / 2.0 ) );',

				'noise = vec2( 0.25, 0.75 ) * vec2( ff ) + vec2( 0.75, 0.25 ) * gg;',

			'}',

			'return ( noise * 2.0  - 1.0 ) * noiseAmount;',

		'}',

		'float readDepth( const in vec2 coord ) {',

			'float cameraFarPlusNear = cameraFar + cameraNear;',
			'float cameraFarMinusNear = cameraFar - cameraNear;',
			'float cameraCoef = 2.0 * cameraNear;',

			// 'return ( 2.0 * cameraNear ) / ( cameraFar + cameraNear - unpackDepth( texture2D( tDepth, coord ) ) * ( cameraFar - cameraNear ) );',
			'return cameraCoef / ( cameraFarPlusNear - unpackRGBAToDepth( texture2D( tDepth, coord ) ) * cameraFarMinusNear );',


		'}',

		'float compareDepths( const in float depth1, const in float depth2, inout int far ) {',

			'float garea = 2.0;',                         // gauss bell width
			'float diff = ( depth1 - depth2 ) * 100.0;',  // depth difference (0-100)

			// reduce left bell width to avoid self-shadowing

			'if ( diff < gDisplace ) {',

				'garea = diffArea;',

			'} else {',

				'far = 1;',

			'}',

			'float dd = diff - gDisplace;',
			'float gauss = pow( EULER, -2.0 * dd * dd / ( garea * garea ) );',
			'return gauss;',

		'}',

		'float calcAO( float depth, float dw, float dh ) {',

			'float dd = radius - depth * radius;',
			'vec2 vv = vec2( dw, dh );',

			'vec2 coord1 = vUv + dd * vv;',
			'vec2 coord2 = vUv - dd * vv;',

			'float temp1 = 0.0;',
			'float temp2 = 0.0;',

			'int far = 0;',
			'temp1 = compareDepths( depth, readDepth( coord1 ), far );',

			// DEPTH EXTRAPOLATION

			'if ( far > 0 ) {',

				'temp2 = compareDepths( readDepth( coord2 ), depth, far );',
				'temp1 += ( 1.0 - temp1 ) * temp2;',

			'}',

			'return temp1;',

		'}',

		'void main() {',

			'vec2 noise = rand( vUv );',
			'float depth = readDepth( vUv );',

			'float tt = clamp( depth, aoClamp, 1.0 );',

			'float w = ( 1.0 / size.x )  / tt + ( noise.x * ( 1.0 - noise.x ) );',
			'float h = ( 1.0 / size.y ) / tt + ( noise.y * ( 1.0 - noise.y ) );',

			'float ao = 0.0;',

			'float dz = 1.0 / float( samples );',
			'float z = 1.0 - dz / 2.0;',
			'float l = 0.0;',

			'for ( int i = 0; i <= samples; i ++ ) {',

				'float r = sqrt( 1.0 - z );',

				'float pw = cos( l ) * r;',
				'float ph = sin( l ) * r;',
				'ao += calcAO( depth, pw * w, ph * h );',
				'z = z - dz;',
				'l = l + DL;',

			'}',

			'ao /= float( samples );',
			'ao = 1.0 - ao;',

			'vec3 color = texture2D( tDiffuse, vUv ).rgb;',

			'vec3 lumcoeff = vec3( 0.299, 0.587, 0.114 );',
			'float lum = dot( color.rgb, lumcoeff );',
			'vec3 luminance = vec3( lum );',

			'vec3 final = vec3( color * mix( vec3( ao ), vec3( 1.0 ), luminance * lumInfluence ) );',  // mix( color * ao, white, luminance )

			'if ( onlyAO ) {',

				'final = vec3( mix( vec3( ao ), vec3( 1.0 ), luminance * lumInfluence ) );',  // ambient occlusion only

			'}',

			'gl_FragColor = vec4( final, 1.0 );',

		'}'

	].join( '\n' )

};
