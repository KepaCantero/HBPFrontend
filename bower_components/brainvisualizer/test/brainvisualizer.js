'use strict';

describe('Brainvisualizer', function ()
{
  function triggerEvent(element, eventName)
  {
    var event; // The custom event that will be created

    if (document.createEvent)
    {
      event = document.createEvent("HTMLEvents");
      event.initEvent(eventName, true, true);
    } else
    {
      event = document.createEventObject();
      event.eventType = eventName;
    }

    event.eventName = eventName;

    if (document.createEvent)
    {
      element.dispatchEvent(event);
    } else
    {
      element.fireEvent("on" + event.eventType, event);
    }
  }
  window.document.body.innerHTML += '<div class="braincontainer"></div>';

  var testData = { "xyz": [100, 0, 0, -100, 0, 0, 100, 0, 100, -100, 0, 100, 0, 0, 100, 0, 0, -100, 0, 100, -100, 0, 100, 100], "populations": { "record": { "to": 2, "step": null, "from": 0, "color": "hsl(0,70%,80%)", "name": "record", "visible": true }, "neurons": { "to": 2, "step": null, "from": 0, "color": "hsl(120,70%,80%)", "name": "neurons", "visible": true } } };

  var brainvisualizer = new BRAIN3D.MainView(window.document.getElementsByClassName("braincontainer")[0], testData, 'img/brain3dballsimple256.png', 'img/brain3dballsimple256.png');
  brainvisualizer.setClipPlanes(10, 20);
  brainvisualizer.setPointSize(10);
  brainvisualizer.periodicalUpdate();   // Simulate an update
  brainvisualizer.updateSize(); // Simulate update size

  brainvisualizer.mouseIsDown = true;
  brainvisualizer.periodicalUpdate();   // Simulate an update with mouse down
  brainvisualizer.mouseIsDown = false;

  brainvisualizer.cameraZoom = 17;
  brainvisualizer.periodicalUpdate();   // Simulate an update with different camera zoom

  it('camera should be initialized', function ()
  {
    expect(brainvisualizer.camera).toBeDefined();
  });

  it('scene should be initialized', function ()
  {
    expect(brainvisualizer.scene).toBeDefined();
  });


  it('brainvisualizer data should be updated', function ()
  {
    var testData =
      {
        "populations": {
          "record": { "to": 2000, "step": null, "from": 0, "color": "hsl(0,70%,80%)", "name": "record", "visible": true },
          "updatedpop": { "to": 2000, "step": null, "from": 0, "color": "hsl(0,70%,80%)", "name": "record", "visible": true },
          "neurons": { "to": 3000, "step": null, "from": 0, "color": "hsl(120,70%,80%)", "name": "neurons", "visible": true }
        }
      };

    brainvisualizer.updateData(testData);

    expect(brainvisualizer.populations['updatedpop']).toBeDefined();
  });

  it('acceleration/deceleration curve should have correct results', function ()
  {
    var pos = brainvisualizer.accDecCurve(1.0);
    expect(pos).toBe(1.0);
  });

  it('visibility should start animating particle size', function ()
  {
    testData["populations"]["record"].visible = false;
    brainvisualizer.updatePopulationVisibility();
    expect(brainvisualizer.needsAnimationPass).toBe(true);
    brainvisualizer.processAnimation();
    expect(brainvisualizer.lastAnimTime).toBeDefined();
  });

  it('pause should be true', function ()
  {
    brainvisualizer.setPaused(true);
    expect(brainvisualizer.paused).toBe(true);
    brainvisualizer.setPaused(false);
  });

  it('width result should be defined', function ()
  {
    expect(brainvisualizer.width()).toBeDefined();
  });

  it('height result should be defined', function ()
  {
    expect(brainvisualizer.height()).toBeDefined();
  });

  it('min clip plane wrong value', function ()
  {
    expect(brainvisualizer.minRenderDist).toBe(10);
  });

  it('max clip plane wrong value', function ()
  {
    expect(brainvisualizer.maxRenderDist).toBe(20);
  });

  it('point size wrong value', function ()
  {
    expect(brainvisualizer.ptsize).toBe(10);
  });

  it('display type wrong value', function ()
  {
    brainvisualizer.setDisplayType(BRAIN3D.DISPLAY_TYPE_POINT);
    expect(brainvisualizer.displayType).toBe(BRAIN3D.DISPLAY_TYPE_POINT);

    brainvisualizer.setDisplayType(BRAIN3D.DISPLAY_TYPE_BLENDED);
    expect(brainvisualizer.displayType).toBe(BRAIN3D.DISPLAY_TYPE_BLENDED);
  });

  it('it should handle spike messages', function ()
  {
    var testMsg = [{ "neuron": 0, "time": 0 }, { "neuron": 1, "time": 1 }];

    brainvisualizer.setSpikeScaleFactor(1.0);
    brainvisualizer.displaySpikes(testMsg);
    brainvisualizer.processWaitingSpikes(1.0);

    for (var i = 0; i < 100; i++)
    {
      brainvisualizer.lastAnimTime = 0; // Advance 100 steps in animation
      brainvisualizer.processAnimation();
    }

    expect(brainvisualizer.waitingSpikes.length).toBe(0);
  });

  it('should handle mouse events', function ()
  {
    spyOn(brainvisualizer, 'mouseDown').and.callThrough();
    triggerEvent(brainvisualizer.container, "mousedown");
    expect(brainvisualizer.mouseDown).toHaveBeenCalled();

    spyOn(brainvisualizer, 'mouseUp').and.callThrough();
    triggerEvent(brainvisualizer.container, "mouseup");
    expect(brainvisualizer.mouseUp).toHaveBeenCalled();

    spyOn(brainvisualizer, 'mouseOut').and.callThrough();
    triggerEvent(brainvisualizer.container, "mouseout");
    expect(brainvisualizer.mouseOut).toHaveBeenCalled();

    spyOn(brainvisualizer, 'mouseMove').and.callThrough();
    triggerEvent(brainvisualizer.container, "mousemove");
    expect(brainvisualizer.mouseMove).toHaveBeenCalled();

    spyOn(brainvisualizer, 'mouseWheel').and.callThrough();
    triggerEvent(brainvisualizer.container, "mousewheel");
    expect(brainvisualizer.mouseWheel).toHaveBeenCalled();
  });



  var shapes = [BRAIN3D.REP_SHAPE_SPHERICAL,
  BRAIN3D.REP_SHAPE_CUBIC,
  BRAIN3D.REP_SHAPE_FLAT,
  BRAIN3D.REP_SHAPE_CLOUD];

  var distrib = [BRAIN3D.REP_DISTRIBUTION_OVERLAP,
  BRAIN3D.REP_DISTRIBUTION_DISTRIBUTE,
  BRAIN3D.REP_DISTRIBUTION_SPLIT];

  var displays = [BRAIN3D.DISPLAY_TYPE_POINT,
  BRAIN3D.DISPLAY_TYPE_BLENDED];

  for (var dispi in displays)
  {
    var display = displays[dispi];

    for (var s in shapes)
    {
      var sh = shapes[s];

      for (var d in distrib)
      {
        var di = distrib[d];

        it('should set ' + sh + ' with ' + di + ' and ' + display, (function (sh, di, display)
        {
          return function ()
          {

            brainvisualizer.spikeFactor = 0.1;
            brainvisualizer.setDistribution(di);
            brainvisualizer.setDisplayType(display);
            brainvisualizer.setShape(sh);

            expect(brainvisualizer.displayType).toBe(display);
            expect(brainvisualizer.neuronRepresentation.shape).toBe(sh);
            expect(brainvisualizer.neuronRepresentation.distrib).toBe(di);
            expect(brainvisualizer.needsAnimationPass).toBe(true);

          }
        })(sh, di, display));
      }
    }
  }



  it('should support cube with low number of neurons', function ()
  {
    var testData =
      {
        "populations": {
          "record": { "to": 26, "step": null, "from": 0, "color": "hsl(0,70%,80%)", "name": "record", "visible": true },
          "neurons": { "to": 26, "step": null, "from": 0, "color": "hsl(120,70%,80%)", "name": "neurons", "visible": true }
        }
      };

    brainvisualizer.updateData(testData);
    brainvisualizer.setDistribution(BRAIN3D.REP_DISTRIBUTION_OVERLAP);
    brainvisualizer.setShape(BRAIN3D.REP_SHAPE_CUBIC);

    expect(brainvisualizer.neuronRepresentation.shape).toBe(BRAIN3D.REP_SHAPE_CUBIC);
    expect(brainvisualizer.neuronRepresentation.distrib).toBe(BRAIN3D.REP_DISTRIBUTION_OVERLAP);
  });

  it('should unbind its event listener on terminate', function ()
  {
    brainvisualizer.terminate();

    spyOn(brainvisualizer, 'mouseMove');
    triggerEvent(brainvisualizer.container, "mousemove");
    expect(brainvisualizer.mouseMove).not.toHaveBeenCalled();
  });


  it('it should initialize per population user coordinates', function ()
  {
    var perPopUserFiles =
      {
        "populations":
        {
          "record": { "positions": [[-8, -8, -16], [-4, -4, -16], [0, 0, -16], [4, 4, -16], [8, 8, -16], [12, 12, -16], [16, 16, -16], [20, 20, -16]] },
          "updatedpop": { "positions": [[-8, -8, -8], [-4, -4, -8], [0, 0, -8], [4, 4, -8], [8, 8, -8], [12, 12, -8], [16, 16, -8], [20, 20, -8]] },
          "neurons": { "positions": [[-8, -8, 0], [-4, -4, 0], [0, 0, 0], [4, 4, 0], [8, 8, 0], [12, 12, 0], [16, 16, 0], [20, 20, 0]] },
        }
      };

    var testData =
      {
        "populations": {
          "record": { "to": 8, "step": null, "from": 0, "color": "hsl(0,70%,80%)", "name": "record", "visible": true },
          "updatedpop": { "to": 8, "step": null, "from": 0, "color": "hsl(0,70%,80%)", "name": "record", "visible": true },
          "neurons": { "to": 8, "step": null, "from": 0, "color": "hsl(120,70%,80%)", "name": "neurons", "visible": true }
        },

        "userData": perPopUserFiles
      };

    brainvisualizer.updateData(testData);

    expect(brainvisualizer.userData.populations).toBeDefined();

  });

  it('it should initialize absolute coordinates/colors from user files', function ()
  {
    var userFile =
      {
        "positions": [[-8, -8, -16], [-4, -4, -16], [0, 0, -16], [4, 4, -16], [8, 8, -16], [12, 12, -16], [16, 16, -16], [20, 20, -16]],
        "colors": [[-8, -8, -16], [-4, -4, -16], [0, 0, -16], [4, 4, -16], [8, 8, -16], [12, 12, -16], [16, 16, -16], [20, 20, -16]],

      };

    var testData =
      {
        "populations": {
          "record": { "to": 8, "step": null, "from": 0, "color": "hsl(0,70%,80%)", "name": "record", "visible": true },
          "updatedpop": { "to": 8, "step": null, "from": 0, "color": "hsl(0,70%,80%)", "name": "record", "visible": true },
          "neurons": { "to": 8, "step": null, "from": 0, "color": "hsl(120,70%,80%)", "name": "neurons", "visible": true }
        },

        "userData": userFile
      };

    brainvisualizer.updateData(testData);

    expect(brainvisualizer.userData.positions).toBeDefined();

  });

  it('it should initialize user file with multiple lod', function ()
  {
    var userFile =
      {
        'brain_lod': [
          {
            "positions": [[-8, -8, -16], [-4, -4, -16]],
            "colors": [[-8, -8, -16], [-4, -4, -16]]
          },
          {
            "positions": [[-8, -8, -16], [-4, -4, -16], [0, 0, -16], [4, 4, -16], [8, 8, -16], [12, 12, -16], [16, 16, -16], [20, 20, -16]],
            "colors": [[-8, -8, -16], [-4, -4, -16], [0, 0, -16], [4, 4, -16], [8, 8, -16], [12, 12, -16], [16, 16, -16], [20, 20, -16]]
          }
        ]
      };

    var testData =
      {
        "populations": {
          "record": { "to": 8, "step": null, "from": 0, "color": "hsl(0,70%,80%)", "name": "record", "visible": true },
          "updatedpop": { "to": 8, "step": null, "from": 0, "color": "hsl(0,70%,80%)", "name": "record", "visible": true },
          "neurons": { "to": 8, "step": null, "from": 0, "color": "hsl(120,70%,80%)", "name": "neurons", "visible": true }
        },

        "userData": userFile
      };

    brainvisualizer.updateData(testData);

    expect(brainvisualizer.userData.positions).toBeDefined();

  });


  it('it should change color map', function ()
  {
    brainvisualizer.setColorMap(BRAIN3D.COLOR_MAP_USER);

    expect(brainvisualizer.colormap).toBe(BRAIN3D.COLOR_MAP_USER);

  });

  for (var dispi in displays)
  {
    var display = displays[dispi];

    var sh = BRAIN3D.REP_SHAPE_USER;

    for (var d in distrib)
    {
      var di = distrib[d];

      it('should set ' + sh + ' with ' + di + ' and ' + display, (function (sh, di, display)
      {
        return function ()
        {

          brainvisualizer.spikeFactor = 0.1;
          brainvisualizer.setDistribution(di);
          brainvisualizer.setDisplayType(display);
          brainvisualizer.setShape(sh);

          expect(brainvisualizer.displayType).toBe(display);
          expect(brainvisualizer.neuronRepresentation.shape).toBe(sh);
          expect(brainvisualizer.neuronRepresentation.distrib).toBe(di);
          expect(brainvisualizer.needsAnimationPass).toBe(true);

        }
      })(sh, di, display));
    }

  }



});
