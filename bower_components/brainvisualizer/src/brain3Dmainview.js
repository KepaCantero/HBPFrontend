/**---LICENSE-BEGIN - DO NOT CHANGE OR MOVE THIS HEADER
 * This file is part of the Neurorobotics Platform software
 * Copyright (C) 2014,2015,2016,2017 Human Brain Project
 * https://www.humanbrainproject.eu
 *
 * The Human Brain Project is a European Commission funded project
 * in the frame of the Horizon2020 FET Flagship plan.
 * http://ec.europa.eu/programmes/horizon2020/en/h2020-section/fet-flagships
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 * ---LICENSE-END**/
/**
 * Brain visualizer / Main view
 *
 */

//------------------------------
// Constants

// Display type

BRAIN3D.DISPLAY_TYPE_POINT = 'Big Solid';
BRAIN3D.DISPLAY_TYPE_BLENDED = 'Small Blended';

// Color map

BRAIN3D.COLOR_MAP_POLULATIONS = 'Populations';
BRAIN3D.COLOR_MAP_NONE = 'None';

// Camera zoom min/max

BRAIN3D.CAMERA_MIN_ZOOM = 10;
BRAIN3D.CAMERA_MAX_ZOOM = 750.0;

// Neurones resize factor

BRAIN3D.OVERLAPPING_NEURONS_RESIZE_FACTOR = 0.3;

// Spike

BRAIN3D.SPIKING_SIZE_FACTOR = 0.7;
BRAIN3D.SPIKING_FADEIN_SPEED = 4.0;
BRAIN3D.SPIKING_FADEOUT_SPEED = 1.0;


//------------------------------
// Initialize

BRAIN3D.MainView = function (container, data, ballImagePath,glowBallImagePath)
{
    this.populations = data.populations;
    this.userXYZ = data.xyz;
    this.container = container;
    this.ballImagePath = ballImagePath;
    this.glowBallImagePath = glowBallImagePath;
    this.init();
};

BRAIN3D.MainView.prototype.init = function ()
{
    this.needsAnimationPass = false;
    this.paused = false;
    this.totalParticles = 0;
    this.particles = [];
    this.indexToParticles = {};
    this.waitingSpikes = [];
    this.spikeScaleFactor = 0.3;
    this.spikeFactorChanged = false;

    this.ptsize = 6.0;
    this.ptsizeInViewOld = 0;
    this.displayType = BRAIN3D.DISPLAY_TYPE_POINT;
    this.colormap = BRAIN3D.COLOR_MAP_POLULATIONS;
    this.minRenderDist = 1.0;             // Clipping planes
    this.maxRenderDist = 1000.0;

    this.cameraZoom = BRAIN3D.CAMERA_MIN_ZOOM;  // By Default min zoom
    this.cameraZoomSource = BRAIN3D.CAMERA_MIN_ZOOM;
    this.cameraZoomTarget = BRAIN3D.CAMERA_MIN_ZOOM;
    this.cameraZoomInterpolant = 0;
    this.cameraTheta = -1.0;
    this.cameraPhi = 1.56;
    this.cameraThetaOld = 0.0;
    this.cameraPhiOld = 0.0;
    this.cameraTranslation = [0.0, 0.0, 0.0];
    this.cameraDefaultRotation = true;

    this.mouse = { x: 0, y: 0 };
    this.mouseOld = { x: 0, y: 0 };
    this.mouseLast = { x: 0, y: 0 };
    this.mouseSpeed = { x: 0, y: 0 };
    this.mouseIsDown = false;

    this.time = 0;

    this.initPopulations();
    this.init3D();
    this.initImages();
    this.init3DBrain();
    this.initInteractivity();

    this.startPeriodicalUpdate();
};

BRAIN3D.MainView.prototype.updateData = function (data)
{
    this.populations = data.populations;
    this.userXYZ = data.xyz;
    this.spikeBaseTime = 0;
    this.waitingSpikes = [];

    this.initPopulations();
    this.init3DBrain();
};

BRAIN3D.MainView.prototype.init3D = function ()     // Init Three JS
{
    this.currentWidth = this.width();
    this.currentHeight = this.height();

    this.camera = new THREE.PerspectiveCamera(40, this.width() / this.height(), 1, 1000);
    this.scene = new THREE.Scene();
    this.scene.add(this.camera);

    var canvas;
    try
    {
        canvas = document.createElement('canvas');
        ctx = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        exts = ctx.getSupportedExtensions();
    }
    catch (e)
    {
        // WebGL is not available, don't build a renderer
        this.renderer = undefined;
        return;
    }

    this.renderer = new THREE.WebGLRenderer({ alpha: true, preserveDrawingBuffer: true, antialias: true });
    this.renderer.setSize(this.width(), this.height());
    this.renderer.setClearColor(new THREE.Color().setRGB(0.0, 0.0, 0.0), 0);
    this.renderer.sortObjects = false;
    this.container.appendChild(this.renderer.domElement);
};

BRAIN3D.MainView.prototype.initPopulations = function ()     // Init population
{
    for (var popname in this.populations)
    {
        var popValues = this.populations[popname];

        popValues.name = popname;
        popValues.color3D = new THREE.Color(popValues.color);
    }
};

BRAIN3D.MainView.prototype.newParticle = function (index, pop, posx, posy, posz, psize, psuper)     // Init a new particle
{

    var newp = {
        x: posx,     // Current pos
        y: posy,
        z: posz,
        tx: posx,    // Target pos
        ty: posy,
        tz: posz,
        xyzInterpolant: 1.0,
        size: psize,
        tsize: psize,
        sizeInterpolant: 1.0,
        spikingDir: 0.0,
        spikingFactor: 1.0,
        population: pop,
        super: psuper,
        nextlevel: null
    };

    if (psuper === null)
    {
        this.particles.push(newp);
    }
    else
    {
        psuper.nextlevel = newp;
    }

    if (index in this.indexToParticles)
    {
        this.indexToParticles[index].push(newp);
    }
    else
    {
        this.indexToParticles[index] = [newp];
    }

    return newp;
};

BRAIN3D.MainView.prototype.create3DMaterial = function ()
{
    var ptSize = this.ptsizeInView();

    // Shader Attributes / Uniforms
    var uniforms = { baseSize: { type: "f", value: ptSize },
                    color: { type: "c", value: new THREE.Color(0xffffff) },
                    texture: { type: "t", value: this.displayType===BRAIN3D.DISPLAY_TYPE_POINT?this.ballImage:this.glowBallImage } };


    uniforms.texture.value.wrapS = uniforms.texture.value.wrapT = THREE.RepeatWrapping;

    return new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: this.displayType===BRAIN3D.DISPLAY_TYPE_POINT?BRAIN3D.vertexshader:BRAIN3D.maskvertexshader,
        fragmentShader: this.displayType===BRAIN3D.DISPLAY_TYPE_POINT?BRAIN3D.fragmentshader:BRAIN3D.maskfragmentshader,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        transparent: true,
    });
}

BRAIN3D.MainView.prototype.init3DBrain = function ()     // Init brain 3D object
{
    this.flushPendingSpikes();

    // Particles

    this.particles = [];
    this.indexToParticles = {};
    this.totalParticles = 0;

    if (this.object)
    {
        this.scene.remove(this.object);
        this.object = null;
        this.geometry = null;
    }

    var visibleNeurons = {};
    var visibleNeuronsLastLevel = {};

    this.addParticleForNeuron = function (i)
    {
        var nsize = 1.0;

        if (popValues.visible)
        {
            if (!visibleNeurons.hasOwnProperty(i))
            {
                visibleNeurons[i] = 1;
            }
            else
            {
                visibleNeurons[i] += 1;
            }

            nsize = 1.0 - ((visibleNeurons[i] - 1.0) * BRAIN3D.OVERLAPPING_NEURONS_RESIZE_FACTOR);
        }

        var previousLevel = (visibleNeuronsLastLevel.hasOwnProperty(i)) ? visibleNeuronsLastLevel[i] : null;

        visibleNeuronsLastLevel[i] = this.newParticle(i, popValues, 0, 0, 0, nsize, previousLevel);
        this.totalParticles++;
    };

    for (var popname in this.populations)
    {
        var popValues = this.populations[popname];

        if (popValues.hasOwnProperty('list'))
        {
            // List of neurons

            var nlist = popValues['list'];

            for (var j in nlist)
            {
                this.addParticleForNeuron(nlist[j]);
            }
        }
        else
        {
            // Slice of neurons

            var start = popValues.from;
            var end = popValues.to;
            var step = popValues.hasOwnProperty('step') ? popValues.step : 1;
            if (step <= 0) step = 1;

            for (var i = start; i < end; i += step)
            {
                this.addParticleForNeuron(i);
            }
        }
    }

    var positions = new Float32Array(this.totalParticles * 3);
    var colors = new Float32Array(this.totalParticles * 3);
    var sizes = new Float32Array(this.totalParticles);
    var innermask = new Float32Array(this.totalParticles);

    var ptSize = this.ptsizeInView();
    var buffi = 0;

    for (var i = 0; i < this.particles.length; i++)
    {
        var p = this.particles[i];

        while (p)
        {
            var buffi3 = buffi * 3;

            positions[buffi3] = p.x;
            positions[buffi3 + 1] = p.y;
            positions[buffi3 + 2] = p.z;

            var c = p.population.color3D;

            colors[buffi3] = c.r;
            colors[buffi3 + 1] = c.g;
            colors[buffi3 + 2] = c.b;

            sizes[buffi] = ptSize * p.size;
            innermask[buffi] = p.nextlevel!==null?1.0:0.0;

            p = p.nextlevel;

            buffi++;
        }
    }

    // Use new ThreeJS model

    this.geometry = new THREE.BufferGeometry();
    this.geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.addAttribute('vcolor', new THREE.BufferAttribute(colors, 3));
    this.geometry.addAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.geometry.addAttribute('innermask', new THREE.BufferAttribute(innermask, 1));

    this.object = new THREE.Points(this.geometry, this.create3DMaterial());
    this.object.dynamic = true;
    this.scene.add(this.object);

    this.applyDisplayType();

    var defaultShape = BRAIN3D.REP_SHAPE_SPHERICAL;
    var defaultDist = BRAIN3D.REP_DISTRIBUTION_OVERLAP;

    if (this.neuronRepresentation !== undefined)
    {
        defaultShape = this.neuronRepresentation.shape;
        defaultDist = this.neuronRepresentation.distrib;
    }

    this.neuronRepresentation = new BRAIN3D.NeuroRepresentation(this, defaultShape, defaultDist);

    this.resetCameraZoom();
    this.updateInnerMasks();
};

BRAIN3D.MainView.prototype.initImages = function ()        // Init images
{
    var e = new THREE.TextureLoader;

    this.ballImage = e.load(this.ballImagePath);
    this.glowBallImage = e.load(this.glowBallImagePath);
};

BRAIN3D.MainView.prototype.initInteractivity = function ()
{
    var that = this;

    this.container.addEventListener('mousemove', this.mouseMoveHandler = function (e) { that.mouseMove.call(that, e); }, false);
    this.container.addEventListener('mousedown', this.mouseDownHandler = function (e) { that.mouseDown.call(that, e); }, false);
    this.container.addEventListener('mouseup', this.mouseUpHandler = function (e) { that.mouseUp.call(that, e); }, false);
    this.container.addEventListener('mouseout', this.mouseOutHandler = function (e) { that.mouseOut.call(that, e); }, false);

    // IE9, Chrome, Safari, Opera
    this.container.addEventListener("mousewheel", this.mouseWheelHandler = function (e) { that.mouseWheel.call(that, e); }, false);

    // Firefox
    this.container.addEventListener("DOMMouseScroll", this.mouseWheelFXHandler = function (e) { that.mouseWheel.call(that, e); }, false);
};

//------------------------------
// Terminate (should be called when the object is not required anymore to unregister its event listeners)

BRAIN3D.MainView.prototype.terminate = function ()
{
    this.container.removeEventListener('mousemove', this.mouseMoveHandler);
    this.container.removeEventListener('mousedown', this.mouseDownHandler);
    this.container.removeEventListener('mouseup', this.mouseUpHandler);
    this.container.removeEventListener('mouseout', this.mouseOutHandler);

    this.container.removeEventListener('mousewheel', this.mouseWheelHandler);
    this.container.removeEventListener('DOMMouseScroll', this.mouseWheelFXHandler);
};

//------------------------------
// View size

BRAIN3D.MainView.prototype.width = function ()
{
    return this.container.clientWidth;
};

BRAIN3D.MainView.prototype.height = function ()
{
    return this.container.clientHeight;
};

BRAIN3D.MainView.prototype.updateSize = function ()
{
    this.camera.aspect = this.width() / this.height();

    if (this.renderer !== undefined)
    {
        this.renderer.setSize(this.width(), this.height());
    }

    this.currentWidth = this.width();
    this.currentHeight = this.height();

    this.updateParticleSize();
};

BRAIN3D.MainView.prototype.ptsizeInView = function ()    // Size of a point adapted to the viewport size
{
    return this.ptsize * (this.height() / 800.0);
};

//------------------------------
// Render

BRAIN3D.MainView.prototype.render = function ()
{
    if (this.renderer !== undefined)
    {
        this.renderer.render(this.scene, this.camera);
    }
};

//------------------------------
// Updates

BRAIN3D.MainView.prototype.setPaused = function (p)
{
    this.paused = p;
};

BRAIN3D.MainView.prototype.startPeriodicalUpdate = function ()
{
    var that = this;
    var updateFrame = function ()
    {
        requestAnimationFrame(function () { that.periodicalUpdate.call(that); updateFrame(); });
    };
    updateFrame();
};

BRAIN3D.MainView.prototype.periodicalUpdate = function ()
{
    // Time elapsed

    var time_old = this.time;
    this.time = Date.now() * 0.001;

    if (this.paused) return;

    // Update size if required

    if (this.currentWidth != this.width() || this.currentHeight != this.height() || this.ptsizeInView() != this.ptsizeInViewOld) this.updateSize();

    // Mouse interaction

    if (this.mouseIsDown)
    {
        this.cameraTheta = this.cameraThetaOld + 0.0075 * (this.mouse.x - this.mouseOld.x);
        this.cameraPhi = this.cameraPhiOld - 0.0075 * (this.mouse.y - this.mouseOld.y);
    }

    if (this.cameraPhi > Math.PI) { this.cameraPhi = Math.PI - 0.0001; }
    if (this.cameraPhi < 0.0) { this.cameraPhi = 0.0 + 0.0001; }

    if (this.mouseIsDown)
    {
        this.mouseSpeed.x = this.mouse.x - this.mouseLast.x;
        this.mouseSpeed.y = this.mouse.y - this.mouseLast.y;
    }
    else
    {
        this.cameraTheta += this.mouseSpeed.x * 0.0025;
        //~ phi   += mouse_speed.y*0.01;
    }

    this.mouseLast.x = this.mouse.x;
    this.mouseLast.y = this.mouse.y;


    // Camera

    // Initial rotation

    if (this.cameraDefaultRotation == true)
    {
        var droty = (this.time - time_old) * 0.3;
        if (time_old == 0.0) droty = 0.0;

        this.cameraTheta -= droty;
    }

    // Animation

    this.processAnimation();

    // Update camera

    this.camera_position = [this.cameraZoom * Math.cos(this.cameraTheta) * Math.sin(this.cameraPhi), this.cameraZoom * Math.cos(this.cameraPhi), this.cameraZoom * Math.sin(this.cameraTheta) * Math.sin(this.cameraPhi)];
    this.camera.near = this.minRenderDist;
    this.camera.far = this.maxRenderDist;
    this.camera.position.set(this.cameraTranslation[0] + this.camera_position[0], this.cameraTranslation[1] + this.camera_position[1], this.cameraTranslation[2] + this.camera_position[2]);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(new THREE.Vector3(this.cameraTranslation[0], this.cameraTranslation[1], this.cameraTranslation[2]));
    this.camera.updateProjectionMatrix();


    // Render

    this.render();
};

//------------------------------
// Spikes

BRAIN3D.MainView.prototype.applySpikeEffect = function (neuron)
{
    var particles = this.indexToParticles[neuron];
    for (var i = 0; i < particles.length; i++)
    {
        var p = particles[i];

        if (p.spikingDir>0 && p.spikingFactor>=0.2)
        {
            p.spikingFactor = 0.2;

        }
        p.spikingDir = 1.0;
    }

    this.needsAnimationPass = true;
};

BRAIN3D.MainView.prototype.flushPendingSpikes = function()
{
    this.waitingSpikes = [];
};

BRAIN3D.MainView.prototype.processWaitingSpikes = function (elapsed)
{
    for (var i = 0; i < this.waitingSpikes.length; i++)
    {
        var spike = this.waitingSpikes[i];
        spike.time -= elapsed;
        if (spike.time <= 0)
        {
            this.applySpikeEffect(spike.neuron);
            this.waitingSpikes.splice(i, 1);
            i--;
        }
    }
};

BRAIN3D.MainView.prototype.displaySpikes = function (spikes)
{
    // Spike format: [{"neuron":INDEX,"time":TIME},{"neuron":INDEX,"time":TIME}, ...]

    var baseTime;

    for (var i = 0; i < spikes.length; i++)
    {
        var spike = spikes[i];

        if (i===0)
        {
            baseTime = spike.time;
            this.applySpikeEffect(spike.neuron);
        }
        else
        {
            var timeDiff = (spike.time-baseTime)/1000.0;

            if (timeDiff<1.0/30.0)
            {
                this.applySpikeEffect(spike.neuron);
            }
            else
            {
                this.waitingSpikes.push({"neuron":spike.neuron,"time":spike.time-baseTime});
            }
        }
    }
};



//------------------------------
// Public access methods

BRAIN3D.MainView.prototype.setSpikeScaleFactor = function (factor)
{
    this.spikeScaleFactor = factor;
    this.needsAnimationPass = true;
    this.spikeFactorChanged = true;
};

BRAIN3D.MainView.prototype.setClipPlanes = function (minClip, maxClip)
{
    this.minRenderDist = minClip;             // Clipping planes
    this.maxRenderDist = maxClip;
};

BRAIN3D.MainView.prototype.setPointSize = function (ps)
{
    this.ptsize = ps;   // No need to update buffer, it will be done at next render
};

BRAIN3D.MainView.prototype.setDistribution = function (distribution)
{
    this.neuronRepresentation.setDistribution(distribution);
    if (this.displayType===BRAIN3D.DISPLAY_TYPE_BLENDED)
    {
        this.updateInnerMasks();
    }

    if (this.spikeScaleFactor>0)
    {
        this.spikeFactorChanged = true;
        this.needsAnimationPass = true;
    }
};

BRAIN3D.MainView.prototype.setShape = function (shape)
{
    this.neuronRepresentation.setShape(shape);
};

BRAIN3D.MainView.prototype.setDisplayType = function (st)
{
    this.displayType = st;
    this.applyDisplayType();
    if (this.displayType===BRAIN3D.DISPLAY_TYPE_BLENDED)
    {
        this.updateInnerMasks();
    }
    if (this.spikeScaleFactor>0)
    {
        this.spikeFactorChanged = true;
        this.needsAnimationPass = true;
    }
};

BRAIN3D.MainView.prototype.resetCameraZoom = function ()
{
    // The best zoom depends of the number of particles

    var minZoom = BRAIN3D.CAMERA_MIN_ZOOM,
        maxZoom = BRAIN3D.CAMERA_MAX_ZOOM;

    var partStart = 20,
        partEnd = 10000;

    if (this.particles.length <= partStart)
    {
        this.cameraZoomTarget = minZoom;
    }
    else if (this.particles.length >= partEnd)
    {
        this.cameraZoomTarget = maxZoom;
    }
    else
    {
        var f = this.particles.length / (partEnd - partStart);

        this.cameraZoomTarget = minZoom + (f * (maxZoom - minZoom));
    }

    this.cameraZoomSource = this.cameraZoom;
    this.cameraZoomInterpolant = 0;
};


//------------------------------
// Animation

BRAIN3D.MainView.prototype.accDecCurve = function (pos)
{
    if (pos <= 0.5)
    {
        pos *= 2;
        pos = 1.0 - Math.sin((1.0 - pos) * 0.5 * Math.PI);
        pos *= 0.5;
    }
    else
    {
        pos = (pos - 0.5) * 2;
        pos = Math.sin(pos * 0.5 * Math.PI);
        pos = 0.5 + (pos * 0.5);
    }

    return pos;
}

BRAIN3D.MainView.prototype.processAnimation = function ()
{
    var elapsed = 0;
    var t = Date.now();
    if (this.lastAnimTime !== undefined)
    {
        elapsed = t - this.lastAnimTime;
    }
    this.lastAnimTime = t;
    if (elapsed > 0.1)
    {
        elapsed = 0.1;
    }

    // Process pending spikes

    this.processWaitingSpikes(elapsed);

    // Camera zoom animation

    if (this.cameraZoom !== this.cameraZoomTarget)
    {
        if (this.cameraZoomInterpolant < 1.0)
        {
            this.cameraZoomInterpolant += elapsed;
            if (this.cameraZoomInterpolant >= 1.0)
            {
                this.cameraZoom = this.cameraZoomTarget;
            }
            else
            {
                var ip = this.accDecCurve(this.cameraZoomInterpolant);

                this.cameraZoom = this.cameraZoomSource + (this.cameraZoomTarget - this.cameraZoomSource) * ip;
            }
        }
        else
        {
            this.cameraZoom = this.cameraZoomTarget;
        }
    }

    // Particles animation

    if (this.needsAnimationPass)
    {
        this.needsAnimationPass = false;

        var ptSize = this.ptsizeInView();
        var needsSizeUpdate = false;
        var needsXYZUpdate = false;
        var needsColorUpdate = false;
        var blendMode = (this.displayType !== BRAIN3D.DISPLAY_TYPE_POINT);

        var buffi = 0;

        for (var i = 0; i < this.particles.length; i++)
        {
            var p = this.particles[i];

            while (p)
            {
                if (p.xyzInterpolant < 1.0)
                {
                    var x, y, z;

                    p.xyzInterpolant += elapsed;
                    if (p.xyzInterpolant >= 1.0)
                    {
                        p.xyzInterpolant = 1.0;
                        x = p.x = p.tx;
                        y = p.y = p.ty;
                        z = p.z = p.tz;
                    }
                    else
                    {
                        var ip = this.accDecCurve(p.xyzInterpolant);

                        x = p.x + (p.tx - p.x) * ip;
                        y = p.y + (p.ty - p.y) * ip;
                        z = p.z + (p.tz - p.z) * ip;

                        this.needsAnimationPass = true;
                    }

                    needsXYZUpdate = true;

                    this.geometry.attributes.position.array[buffi * 3] = x;
                    this.geometry.attributes.position.array[(buffi * 3) + 1] = y;
                    this.geometry.attributes.position.array[(buffi * 3) + 2] = z;
                }

                var finalSizeFactor = -1.0;

                if (p.sizeInterpolant < 1.0)
                {
                    p.sizeInterpolant += elapsed;
                    if (p.sizeInterpolant >= 1.0)
                    {
                        p.sizeInterpolant = 1.0;
                        finalSizeFactor = p.size = p.tsize;
                    }
                    else
                    {
                        this.needsAnimationPass = true;
                        finalSizeFactor = p.size + (p.tsize - p.size) * this.accDecCurve(p.sizeInterpolant);
                    }

                }

                var r,g,b;

                if (this.spikeFactorChanged || p.spikingDir)
                {
                    var c = p.population.color3D;
                    var rf = this.spikeScaleFactor;

                    r = c.r;
                    g = c.g;
                    b = c.b;

                    this.geometry.attributes.vcolor.array[buffi * 3] = r = (r * (1.0 - rf)) + rf * r * 0.2;
                    this.geometry.attributes.vcolor.array[buffi * 3 + 1] = g = (g * (1.0 - rf)) + rf * g * 0.2;
                    this.geometry.attributes.vcolor.array[buffi * 3 + 2] = b = (b * (1.0 - rf)) + rf * b * 0.2;

                    needsColorUpdate = true;
                }

                if (p.spikingDir)
                {
                    if (finalSizeFactor < 0)
                    {
                        finalSizeFactor = p.size;
                    }

                    if (p.spikingDir > 0)
                    {
                        p.spikingFactor += elapsed * BRAIN3D.SPIKING_FADEIN_SPEED;
                        if (p.spikingFactor >= 1.0)
                        {
                            p.spikingFactor = 1.0;
                            p.spikingDir = -1;
                        }
                    }
                    else
                    {
                        p.spikingFactor -= elapsed * BRAIN3D.SPIKING_FADEOUT_SPEED;
                        if (p.spikingFactor <= 0)
                        {
                            p.spikingDir = 0;
                            p.spikingFactor = 0.0;
                        }
                    }

                    var spikeFactor =  this.accDecCurve(p.spikingFactor);

                    finalSizeFactor *= 1.0 + spikeFactor * this.spikeScaleFactor * BRAIN3D.SPIKING_SIZE_FACTOR * (blendMode ? 3 : 1.0);

                    this.geometry.attributes.vcolor.array[buffi*3] = (r * (1.0 - spikeFactor)) + spikeFactor;
                    this.geometry.attributes.vcolor.array[buffi*3 + 1] = (g * (1.0 - spikeFactor)) + spikeFactor;
                    this.geometry.attributes.vcolor.array[buffi*3 + 2] = (b * (1.0 - spikeFactor)) + spikeFactor;

                    needsColorUpdate = true;
                    this.needsAnimationPass = true;
                }

                if (finalSizeFactor>=0)
                {
                    this.geometry.attributes.size.array[buffi] = ptSize * finalSizeFactor;
                    needsSizeUpdate = true;
                }

                p = p.nextlevel;
                buffi++;
            }
        }

        if (needsXYZUpdate)
        {
            this.geometry.attributes.position.needsUpdate = true;
        }

        if (needsColorUpdate)
        {
            this.geometry.attributes.vcolor.needsUpdate = true;
        }

        if (needsSizeUpdate)
        {
            this.geometry.attributes.size.needsUpdate = true;
            this.ptsizeInViewOld = ptSize;
        }

        this.spikeFactorChanged = false;
    }

};

//------------------------------
// Buffer updates

BRAIN3D.MainView.prototype.updateInnerMasks = function ()
{
    var buffi = 0;
    var doMasks = this.neuronRepresentation.distrib===BRAIN3D.REP_DISTRIBUTION_OVERLAP;

    for (var i = 0; i < this.particles.length; i++)
    {
        var p = this.particles[i];
        while (p)
        {
            var c = p.population.color3D;

            this.geometry.attributes.innermask.array[buffi] = p.nextlevel!==null?doMasks:0.0;

            p = p.nextlevel;
            buffi += 1;
        }
    }

    this.geometry.attributes.innermask.needsUpdate = true;
};


BRAIN3D.MainView.prototype.updateParticleColors = function ()
{
    var buffi = 0;

    for (var i = 0; i < this.particles.length; i++)
    {
        var p = this.particles[i];
        while (p)
        {
            var c = p.population.color3D;

            this.geometry.attributes.vcolor.array[buffi] = c.r;
            this.geometry.attributes.vcolor.array[buffi + 1] = c.g;
            this.geometry.attributes.vcolor.array[buffi + 2] = c.b;

            p = p.nextlevel;
            buffi += 3;
        }
    }

    this.geometry.attributes.vcolor.needsUpdate = true;
};

BRAIN3D.MainView.prototype.updateParticleSize = function ()
{
    var ptSize = this.ptsizeInView();
    var buffi = 0;

    for (var i = 0; i < this.particles.length; i++)
    {
        var p = this.particles[i];
        while (p)
        {
            var currentSize;

            if (p.sizeInterpolant < 1.0)
            {
                currentSize = p.size + (p.tsize - p.size) * this.accDecCurve(p.sizeInterpolant);
            }
            else
            {
                currentSize = p.size;
            }

            if (p.spikingDir)
            {
                currentSize *= 1.0 + this.accDecCurve(p.spikingFactor) * this.spikeScaleFactor;
            }

            this.geometry.attributes.size.array[buffi] = ptSize * currentSize;

            p = p.nextlevel;
            buffi++;
        }
    }

    this.geometry.attributes.size.needsUpdate = true;
    this.ptsizeInViewOld = ptSize;
};

BRAIN3D.MainView.prototype.updatePopulationVisibility = function ()
{
    this.needsAnimationPass = true;

    for (var i = 0; i < this.particles.length; i++)
    {
        var p = this.particles[i];
        var level = 1;

        while (p)
        {
            var nsize = 1.0;

            if (p.population.visible)
            {
                nsize = 1.0 - ((level - 1.0) * BRAIN3D.OVERLAPPING_NEURONS_RESIZE_FACTOR);
                level++;
            }
            else
            {
                nsize = 0;
            }

            if (p.tsize != nsize || p.sizeInterpolant >= 1.0)
            {
                p.sizeInterpolant = 0.0;
                p.tsize = nsize;
            }

            p = p.nextlevel;
        }
    }
};

BRAIN3D.MainView.prototype.applyDisplayType = function ()
{
    this.object.material = this.create3DMaterial();

    if (this.displayType === BRAIN3D.DISPLAY_TYPE_BLENDED)
    {
        this.object.material.blending = THREE.AdditiveBlending;
        this.object.material.depthTest = false;
        this.object.material.transparent = true;
    }
    else if (this.displayType === BRAIN3D.DISPLAY_TYPE_POINT)
    {
        this.object.material.blending = 0;
        this.object.material.depthTest = true;
        this.object.material.transparent = false;
    }
};

//------------------------------
// Interactivity

BRAIN3D.MainView.prototype.mouseMove = function (e)
{
    this.mouse.x = e.layerX;
    this.mouse.y = e.layerY;
};

BRAIN3D.MainView.prototype.mouseDown = function (e)
{
    this.cameraDefaultRotation = false;
    this.mouseOld.x = this.mouse.x;
    this.mouseOld.y = this.mouse.y;
    this.cameraThetaOld = this.cameraTheta;
    this.cameraPhiOld = this.cameraPhi;
    this.mouseIsDown = true;
};

BRAIN3D.MainView.prototype.mouseUp = function (e)
{
    this.mouseIsDown = false;
};

BRAIN3D.MainView.prototype.mouseOut = function (e)
{
    this.mouseIsDown = false;
};


BRAIN3D.MainView.prototype.mouseWheel = function (e)
{
    var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
    var move = delta * 20.0;
    this.cameraZoom = this.cameraZoom - move;
    if (this.cameraZoom < BRAIN3D.CAMERA_MIN_ZOOM) { this.cameraZoom = BRAIN3D.CAMERA_MIN_ZOOM; }
    else if (this.cameraZoom > BRAIN3D.CAMERA_MAX_ZOOM) { this.cameraZoom = BRAIN3D.CAMERA_MAX_ZOOM; }

    this.cameraZoomTarget = this.cameraZoom;
    this.cameraZoomSource = this.cameraZoom;
};





