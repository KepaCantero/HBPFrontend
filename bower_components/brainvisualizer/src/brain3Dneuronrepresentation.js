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
 * Brain visualizer / Manage the representation of the neurons
 *
 */

//------------------------------
// Constants

// Shape

BRAIN3D.REP_SHAPE_SPHERICAL = 'Sphere';
BRAIN3D.REP_SHAPE_CUBIC = 'Cube';
BRAIN3D.REP_SHAPE_FLAT = 'Flat';
BRAIN3D.REP_SHAPE_CLOUD = 'Cloud';
BRAIN3D.REP_SHAPE_USER = 'User Defined';           // Coordinates have been defined by the user, in the brain file

// Population Distribution mode

BRAIN3D.REP_DISTRIBUTION_OVERLAP = 'Overlap';
BRAIN3D.REP_DISTRIBUTION_DISTRIBUTE = 'Distribute';
BRAIN3D.REP_DISTRIBUTION_SPLIT = 'Split';

//------------------------------
// Initialize

BRAIN3D.NeuroRepresentation = function (mainView, shape, distrib)
{
    this.mainView = mainView;
    this.shape = shape;
    this.distrib = distrib;
    this.init();
};

BRAIN3D.NeuroRepresentation.prototype.init = function ()
{
    this.updateRadius();
    this.setShape(this.shape);
    this.setDistribution(this.distrib);
};

BRAIN3D.NeuroRepresentation.prototype.updateRadius = function ()
{
    // Radius of a shape is based on the number of particles

    var minRadius = 2.0,
        maxRadius = 150.0;

    var partStart = 20,
        partEnd = 10000;

    if (this.mainView.particles.length <= partStart)
    {
        this.radius = minRadius;
    }
    else if (this.mainView.particles.length >= partEnd)
    {
        this.radius = maxRadius;
    }
    else
    {
        var f;

        f = this.mainView.particles.length / (partEnd - partStart);

        this.radius = minRadius + (f * (maxRadius - minRadius));
    }
};

//------------------------------
// Distribution

BRAIN3D.NeuroRepresentation.prototype.setDistribution = function (distrib)
{
    this.distrib = distrib;

    var newPartList = [];
    var particles = this.mainView.particles;

    if (this.distrib === BRAIN3D.REP_DISTRIBUTION_OVERLAP)
    {
        // Un-flatten

        for (var i = 0; i < particles.length; i++)
        {
            var p = particles[i];

            if (p.super)
            {
                p.super.nextlevel = p;
            }
            else
            {
                newPartList.push(p);
            }
        }
    }
    else
    {
        // Flatten and rearrange by population

        var popnames = Object.getOwnPropertyNames(this.mainView.populations);
        var partperpop = {};

        for (p = 0; p < popnames.length; p++)
        {
            partperpop[popnames[p]] = [];
        }

        for (var i = 0; i < particles.length; i++)
        {
            var p = particles[i];

            do
            {
                var prevp = p;
                partperpop[p.population.name].push(p);
                p = p.nextlevel;
                prevp.nextlevel = null;
            }
            while (p);
        }

        for (p = 0; p < popnames.length; p++)
        {
            newPartList = newPartList.concat(partperpop[popnames[p]]);
        }

        if (this.shape == BRAIN3D.REP_SHAPE_USER)
            newPartList.sort((a, b)=>b.userSize-a.userSize);
    }


    this.mainView.particles = newPartList;

    this.setShape(this.shape);
    this.mainView.updatePopulationVisibility();
    this.mainView.updateParticleColors();
    this.mainView.needsAnimationPass = true;

};

//------------------------------
// Shape management

BRAIN3D.NeuroRepresentation.prototype.setShape = function (shape)
{
    this.shape = shape;

    if (this.mainView.particles.length <= 4 && shape !=  BRAIN3D.REP_SHAPE_USER)    // Special case for low number of particles
    {
        this.applyLowNeuronShape();
        return;
    }

    switch (shape)
    {
        case BRAIN3D.REP_SHAPE_SPHERICAL:
            this.applySphericalShape();
            break;

        case BRAIN3D.REP_SHAPE_CUBIC:
            this.applyCubicalShape();
            break;

        case BRAIN3D.REP_SHAPE_FLAT:
            this.applyFlatShape();
            break;

        case BRAIN3D.REP_SHAPE_CLOUD:
            this.applyCloudShape();
            break;

        case BRAIN3D.REP_SHAPE_USER:
            this.applyUserShape();
            break;

    }

};

// Find the range of a population in the particle list

BRAIN3D.NeuroRepresentation.prototype.findPopulationParticleRange = function (popname)
{
    var particles = this.mainView.particles;
    var res = [0, 0];
    var popFound = false;
    var partstart = 0, partlength = 0;

    for (var i = 0; i < particles.length; i++)
    {
        if (popFound)
        {
            if (particles[i].population.name !== popname)
            {
                break;
            }
            partlength++;
        }
        else if (particles[i].population.name === popname)
        {
            partstart = i;
            popFound = true;
            partlength = 1;
        }
    }

    return [partstart, partlength];
}


// Ultra low number of neurons handler, in this case we only align them on a line

BRAIN3D.NeuroRepresentation.prototype.applyLowNeuronShape = function ()
{
    var particles = this.mainView.particles;

    var x = particles.length > 1 ? -this.radius : 0;
    var d = particles.length > 1 ? (this.radius * 2.0) / (particles.length - 1) : 0;

    for (var i in particles)
    {
        var p = particles[i];

        do
        {
            p.tx = x;
            p.ty = 0;
            p.tz = 0;
            p.xyzInterpolant = 0;

            p = p.nextlevel;
        }
        while (p);

        x += d;
    }

    this.mainView.needsAnimationPass = true;
};

// Cloud shape

BRAIN3D.NeuroRepresentation.prototype.applyCloudShape = function ()
{
    var particles = this.mainView.particles;
    var layerMode = this.distrib === BRAIN3D.REP_DISTRIBUTION_SPLIT;

    this.mainView.needsAnimationPass = true;

    if (layerMode)
    {
        var popnames = Object.getOwnPropertyNames(this.mainView.populations);

        var zsize = this.radius * 2;
        var zstep = zsize / popnames.length;

        var v = new THREE.Vector3;
        var rv = new THREE.Vector3;
        v.x = 0;
        v.y = 0;
        v.z = -zsize * 0.5 - zstep * 0.5;

        for (layerpop = 0; layerpop < popnames.length; layerpop++)
        {
            var p = 0;

            var popname = popnames[layerpop];
            var partlength = particles.length;
            var partstart = 0;

            var res = this.findPopulationParticleRange(popname);
            p = partstart = res[0];
            partlength = res[1];

            v.z += zstep;

            for (var i = p; i < (partstart+partlength); i++)
            {
                var pa = particles[i];

                rv.x = Math.random() * 2 - 1.0;
                rv.y = Math.random() * 2 - 1.0;
                rv.z = Math.random() * 2 - 1.0;
                rv.normalize();
                var r = Math.random() * this.radius * 10;
                var r2 = (0.7 + Math.random()) * this.radius;
                if (r > r2) r = r2;
                r *= 0.8;
                rv.x *= r;
                rv.y *= r;
                rv.z *= zstep * 0.2;
                pa.tx = v.x + rv.x;
                pa.ty = v.y + rv.y;
                pa.tz = v.z + rv.z;
                pa.xyzInterpolant = 0;
            }
        }
    }
    else
    {
        var popnames = Object.getOwnPropertyNames(this.mainView.populations);
        var p;

        // Create an abstract sphere to distribute the populations in the cloud

        var nrings = Math.ceil(Math.sqrt(popnames.length * 0.7));
        var nrays = Math.ceil(popnames.length / nrings);

        var zaxis = new THREE.Vector3(0, 0, 1);
        var yaxis = new THREE.Vector3(0, 1, 0);

        var v = new THREE.Vector3;
        var rv = new THREE.Vector3;

        var gx = 0, gy = 0, gz = 0;
        var gt = 0;

        for (p = 0; p < popnames.length; p++)
        {
            var ring = Math.floor(p / nrays) / nrings;
            var ray = Math.floor(p % nrays) / nrays;

            v.x = 0;
            v.y = -this.radius;
            v.z = 0;

            v.applyAxisAngle(zaxis, (15.0 + (ray * (180.0 - 15.0)) * THREE.Math.DEG2RAD));
            v.applyAxisAngle(yaxis, ring * 360.0 * THREE.Math.DEG2RAD);

            var pop = this.mainView.populations[popnames[p]];

            for (var i = 0; i < particles.length; i++)
            {
                var pa = particles[i];
                if (pa.population === pop)
                {
                    var dx = v.x, dy = v.y, dz = v.z;

                    rv.x = Math.random() * 2 - 1.0;
                    rv.y = Math.random() * 2 - 1.0;
                    rv.z = Math.random() * 2 - 1.0;
                    rv.normalize();
                    var r = Math.random() * this.radius * 10;
                    var r2 = (0.7 + Math.random()) * this.radius;
                    if (r > r2) r = r2;
                    r *= 0.8;
                    rv.x *= r;
                    rv.y *= r;
                    rv.z *= r;

                    dx += rv.x;
                    dy += rv.y;
                    dz += rv.z;

                    gx += dx;
                    gy += dy;
                    gz += dz;
                    gt++;

                    do
                    {
                        pa.tx = dx;
                        pa.ty = dy;
                        pa.tz = dz;
                        pa.xyzInterpolant = 0;
                        pa = pa.nextlevel;
                    }
                    while (pa);
                }
            }

            // Center the cloud on its gravity point

            if (gt > 0)
            {
                gx /= gt;
                gy /= gt;
                gz /= gt;

                for (var i = 0; i < particles.length; i++)
                {
                    var pa = particles[i];

                    do
                    {
                        pa.tx -= gx;
                        pa.ty -= gy;
                        pa.tz -= gz;
                        pa = pa.nextlevel;
                    }
                    while (pa);
                }

            }
        }
    }
};

// Flat shape

BRAIN3D.NeuroRepresentation.prototype.applyFlatShape = function ()
{
    var corners = [[-this.radius, -this.radius, -this.radius], [this.radius, -this.radius, -this.radius], [this.radius, this.radius, -this.radius], [-this.radius, this.radius, -this.radius],
        [-this.radius, -this.radius, this.radius], [this.radius, -this.radius, this.radius], [this.radius, this.radius, this.radius], [-this.radius, this.radius, this.radius]];

    var face = [0, 1, 2, 3];

    var particles = this.mainView.particles;

    var vx = new THREE.Vector3;
    var vy = new THREE.Vector3;

    var layervz = 0;

    vx.x = corners[face[1]][0] - corners[face[0]][0];
    vx.y = corners[face[1]][1] - corners[face[0]][1];
    vx.z = corners[face[1]][1] - corners[face[0]][1];

    var edgeSize = vx.length();

    vy.x = corners[face[3]][0] - corners[face[0]][0];
    vy.y = corners[face[3]][1] - corners[face[0]][1];
    vy.z = corners[face[3]][2] - corners[face[0]][2];

    vx.normalize();
    vy.normalize();

    var nline;
    var layerMode = this.distrib === BRAIN3D.REP_DISTRIBUTION_SPLIT;
    var popnames = Object.getOwnPropertyNames(this.mainView.populations);
    var zstep = edgeSize / popnames.length;

    if (layerMode)
    {
        layervz = -edgeSize * 0.5 - zstep * 0.5;
    }

    for (layerpop = 0; layerpop < popnames.length; layerpop++)
    {
        var p = 0;

        var popname = popnames[layerpop];
        var partlength = particles.length;
        var partstart = 0;

        if (layerMode)
        {
            // Search population range for this layer

            var res = this.findPopulationParticleRange(popname);
            p = partstart = res[0];
            partlength = res[1];

            layervz += zstep;
        }
        else
        {
            layerpop = popnames.length;
        }

        nline = Math.round(Math.sqrt(partlength));
        nperline = Math.ceil(partlength / nline);

        for (var y = 0; y < nline; y++)
        {
            var pvyx = vy.x * y / (nline - 1) * edgeSize || 0;;
            var pvyy = vy.y * y / (nline - 1) * edgeSize || 0;;
            var pvyz = vy.z * y / (nline - 1) * edgeSize || 0;;

            pvyx += vy.x * -edgeSize * 0.5;
            pvyy += vy.y * -edgeSize * 0.5;
            pvyz += vy.z * -edgeSize * 0.5;

            if (y === nline - 1)
            {
                nperline = partlength - (p - partstart);
            }

            for (var x = 0; x < nperline; x++)
            {
                var px, py, py;

                px = vx.x * x / (nperline - 1) * edgeSize || 0;;
                py = vx.y * x / (nperline - 1) * edgeSize || 0;;
                pz = vx.z * x / (nperline - 1) * edgeSize || 0;;

                px += vx.x * -edgeSize * 0.5;
                py += vx.y * -edgeSize * 0.5;
                pz += vx.z * -edgeSize * 0.5;

                px += pvyx;
                py += pvyy;
                pz += pvyz;

                pz += layervz;

                var pa = particles[p];

                do
                {
                    pa.tx = px;
                    pa.ty = py;
                    pa.tz = pz;
                    pa.xyzInterpolant = 0;
                    pa = pa.nextlevel;
                }
                while (pa);

                p++;
                if (p >= (partstart + partlength))
                {
                    y = nline;
                    break;
                }
            }
        }
    }

    this.mainView.needsAnimationPass = true;
};


// Spherical shape

BRAIN3D.NeuroRepresentation.prototype.applySphericalShape = function ()
{
    var particles = this.mainView.particles;

    var popnames = Object.getOwnPropertyNames(this.mainView.populations);
    var layerMode = this.distrib === BRAIN3D.REP_DISTRIBUTION_SPLIT && popnames.length>1;
    var layerScaler = 1.0;

    for (layerpop = 0; layerpop < popnames.length; layerpop++)
    {
        var popname = popnames[layerpop];
        var partlength = particles.length;
        var lastP = 0;
        var partstart = 0;

        if (layerMode)
        {
            // Search population range for this layer

            var res = this.findPopulationParticleRange(popname);
            lastP = partstart = res[0];
            partlength = res[1];

            layerScaler = 1.0 - (layerpop / (popnames.length - 1) * 0.8);
        }
        else
        {
            layerpop = popnames.length;
        }

        var nrings = Math.ceil(Math.sqrt(partlength - 2) * 0.7);
        var nrays = Math.ceil((partlength - 2) / nrings);
        var v = new THREE.Vector3(), v2 = new THREE.Vector3();

        var zaxis = new THREE.Vector3(0, 0, 1);
        var yaxis = new THREE.Vector3(0, 1, 0);

        var degzstep = (180.0 / (nrings + 1)) * THREE.Math.DEG2RAD;

        var totalCirc = 0;
        var r;

        var ringToCirc = new Array();

        for (r = 1; r <= nrings; r++)   // Precompute per ring circumference and cumulated circumference
        {                               // so we can have a nice distribution of the neurons on the sphere
            v.x = 0;
            v.y = -this.radius;
            v.z = 0;

            v.applyAxisAngle(zaxis, r * degzstep);

            v2.x = 0;
            v2.y = v.y;
            v2.z = 0;

            v2.sub(v);
            var c = v2.length() * 2 * Math.PI;
            totalCirc += c;

            ringToCirc.push(c);
        }


        for (r = 0; r <= nrings + 1; r++)
        {
            if (r === 0)                      // Bottom of the sphere
            {
                v.x = 0;
                v.y = -this.radius * layerScaler;
                v.z = 0;

                var pa = particles[lastP++];

                do
                {
                    pa.tx = v.x;
                    pa.ty = v.y;
                    pa.tz = v.z;
                    pa.xyzInterpolant = 0;

                    pa = pa.nextlevel;
                }
                while (pa);
            }
            else if (r === nrings + 1)  // Top of the sphere
            {
                v.x = 0;
                v.y = this.radius * layerScaler;
                v.z = 0;

                var pa = particles[lastP++];

                do
                {
                    pa.tx = v.x;
                    pa.ty = v.y;
                    pa.tz = v.z;
                    pa.xyzInterpolant = 0;

                    pa = pa.nextlevel;
                }
                while (pa);
            }
            else                            // Rings
            {
                // Find number of particles for this ring

                var npart;

                if (r == nrings)
                {
                    npart = ((partstart + partlength) - 1) - lastP; // For the last ring, we distribute all the remaining neurons but the
                }                                                   // last one which is used for the top of the sphere
                else
                {
                    npart = ringToCirc[r - 1];
                    npart /= totalCirc;
                    npart *= partlength - 2;
                    npart = Math.round(npart);
                }

                for (var p = 0; p < npart; p++)
                {
                    v.x = 0;
                    v.y = -this.radius * layerScaler;
                    v.z = 0;

                    v.applyAxisAngle(zaxis, r * degzstep);
                    v.applyAxisAngle(yaxis, (p / npart) * 360.0 * THREE.Math.DEG2RAD);

                    var pa = particles[lastP++];

                    do
                    {
                        pa.tx = v.x;
                        pa.ty = v.y;
                        pa.tz = v.z;
                        pa.xyzInterpolant = 0;

                        pa = pa.nextlevel;
                    }
                    while (pa);
                }
            }
        }
    }

    this.mainView.needsAnimationPass = true;

};


// User shape

BRAIN3D.NeuroRepresentation.prototype.applyUserShape = function ()
{
    var particles = this.mainView.particles;
    var userPos = this.mainView.userData.positions;
    var userPosPerPop = this.mainView.userData.populations;
    var layerMode = this.distrib === BRAIN3D.REP_DISTRIBUTION_SPLIT;

    this.mainView.needsAnimationPass = true;

    if (layerMode)
    {
        var popnames = Object.getOwnPropertyNames(this.mainView.populations);

        var zsize = this.radius * 2;
        var zstep = zsize / popnames.length;

        var v = new THREE.Vector3;
        var rv = new THREE.Vector3;
        v.x = 0;
        v.y = 0;
        v.z = -zsize * 0.5 - zstep * 0.5;

        for (layerpop = 0; layerpop < popnames.length; layerpop++)
        {
            var p = 0;

            var popname = popnames[layerpop];
            var partlength = particles.length;
            var partstart = 0;

            var res = this.findPopulationParticleRange(popname);
            p = partstart = res[0];
            partlength = res[1];

            v.z += zstep;

            if (userPosPerPop)
            {
                userPos = userPosPerPop[popname];
            }

            for (var i = p; i < (partstart+partlength); i++)
            {
                var pa = particles[i];

                rv.x = userPos[pa.index][0] * this.radius/zstep;
                rv.y = userPos[pa.index][1] * this.radius/zstep;
                rv.z = userPos[pa.index][2] * this.radius/zstep;
                rv.z *= zstep * 0.2;
                pa.tx = v.x + rv.x;
                pa.ty = v.y + rv.y;
                pa.tz = v.z + rv.z;
                pa.xyzInterpolant = 0;
            }
        }
    }
    else
    {
        if(this.mainView.populations)
            if (userPosPerPop)
                for (let pa of particles) {
                    do
                    {
                        let pop  = userPosPerPop[pa.population.name];
                        if (pop){
                            let neuron = pop.neurons[pa.index]
                            if (neuron){
                                pa.tx = neuron.pos[0] * this.radius;
                                pa.ty = neuron.pos[1] * this.radius;
                                pa.tz = neuron.pos[2] * this.radius;
                                pa.userSize = neuron.size || 1;
                                //pa.sizeInterpolant = 1;
                                pa.xyzInterpolant = 0;
                            }
                        }
                        pa = pa.nextlevel;
                    }while (pa);

                }
            else
                _.forEach(this.mainView.populations, pop =>{
                    for (let pa of particles) {
                        if (pa.population === pop)
                        {
                            var dx = userPos[pa.index][0] * this.radius;
                            var dy = userPos[pa.index][1] * this.radius;
                            var dz = userPos[pa.index][2] * this.radius;

                            do
                            {
                                pa.tx = dx;
                                pa.ty = dy;
                                pa.tz = dz;
                                pa.xyzInterpolant = 0;
                                pa = pa.nextlevel;
                            }
                            while (pa);
                        }
                    }
                });
    }
};




// Cubical shape

BRAIN3D.NeuroRepresentation.prototype.applyCubicalShape = function ()
{
    var particles = this.mainView.particles;

    var corners = [[-this.radius, -this.radius, -this.radius], [this.radius, -this.radius, -this.radius], [this.radius, this.radius, -this.radius], [-this.radius, this.radius, -this.radius],
        [-this.radius, -this.radius, this.radius], [this.radius, -this.radius, this.radius], [this.radius, this.radius, this.radius], [-this.radius, this.radius, this.radius]];

    var faces = [[0, 1, 2, 3], [0, 4, 5, 1], [1, 5, 6, 2], [3, 2, 6, 7], [0, 3, 7, 4], [4, 7, 6, 5]];
    var edges = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];

    var popnames = Object.getOwnPropertyNames(this.mainView.populations);
    var layerMode = this.distrib === BRAIN3D.REP_DISTRIBUTION_SPLIT && popnames.length>1;
    var layerScaler = 1.0;

    this.mainView.needsAnimationPass = true;

    for (layerpop = 0; layerpop < popnames.length; layerpop++)
    {
        var popname = popnames[layerpop];
        var partlength = particles.length;
        var partstart = 0;

        if (layerMode)
        {
            var res = this.findPopulationParticleRange(popname);
            partstart = res[0];
            partlength = res[1];

            layerScaler = 1.0 - (layerpop / (popnames.length - 1) * 0.8);
        }
        else
        {
            layerpop = popnames.length;
        }


        var p = partstart;


        if (partlength <= (corners.length + edges.length + faces.length))
        {
            // For a low number of particles I simply distribute
            // the neurons on the corner/edge/face

            // Corners

            for (var i = 0; i < corners.length && p < (partstart + partlength); i++)
            {
                var ei = corners[i];
                var pa = particles[p];

                do
                {
                    pa.tx = corners[i][0] * layerScaler;
                    pa.ty = corners[i][1] * layerScaler;
                    pa.tz = corners[i][2] * layerScaler;
                    pa.xyzInterpolant = 0;
                    pa = pa.nextlevel;
                }
                while (pa);

                p++;
            }

            // Edges

            for (var i = 0; i < edges.length && p < (partstart + partlength); i++)
            {
                var ei = edges[i];
                var pa = particles[p];

                var x, y, z;

                x = (corners[edges[i][0]][0] + corners[edges[i][1]][0]) * 0.5 * layerScaler;
                y = (corners[edges[i][0]][1] + corners[edges[i][1]][1]) * 0.5 * layerScaler;
                z = (corners[edges[i][0]][2] + corners[edges[i][1]][2]) * 0.5 * layerScaler;

                do
                {
                    pa.tx = x;
                    pa.ty = y;
                    pa.tz = z;
                    pa.xyzInterpolant = 0;
                    pa = pa.nextlevel;
                }
                while (pa);

                p++;
            }

            // Faces

            for (var i = 0; i < faces.length && p < (partstart + partlength); i++)
            {
                var ei = faces[i];
                var pa = particles[p];

                var x = 0, y = 0, z = 0;

                for (var f = 0; f < 4; f++)
                {
                    x += corners[faces[i][f]][0];
                    y += corners[faces[i][f]][1];
                    z += corners[faces[i][f]][2];
                }

                x *= 0.25 * layerScaler;
                y *= 0.25 * layerScaler;
                z *= 0.25 * layerScaler;

                do
                {
                    pa.tx = x;
                    pa.ty = y;
                    pa.tz = z;
                    pa.xyzInterpolant = 0;
                    pa = pa.nextlevel;
                }
                while (pa);

                p++;
            }
        }
        else
        {
            // High number of neurons, simply create six 3D faces and distribute particles on them

            var partPerFaces;
            var p = partstart;

            var vx = new THREE.Vector3;
            var vy = new THREE.Vector3;
            var vn = new THREE.Vector3;


            for (var i = 0; i < 6 && p < (partstart + partlength); i++)
            {
                vn.x = vx.x = corners[faces[i][1]][0] - corners[faces[i][0]][0];
                vn.y = vx.y = corners[faces[i][1]][1] - corners[faces[i][0]][1];
                vn.z = vx.z = corners[faces[i][1]][2] - corners[faces[i][0]][2];

                var cubeEdgeSize = vx.length() * 0.8;

                vy.x = corners[faces[i][3]][0] - corners[faces[i][0]][0];
                vy.y = corners[faces[i][3]][1] - corners[faces[i][0]][1];
                vy.z = corners[faces[i][3]][2] - corners[faces[i][0]][2];

                vn.cross(vy);

                vx.normalize();
                vy.normalize();
                vn.normalize();

                if (i === 5)
                {
                    partPerFaces = partlength - (p - partstart);
                }
                else
                {
                    partPerFaces = Math.round(partlength / 6);
                }

                var nline;

                nline = Math.round(Math.sqrt(partPerFaces));
                nperline = Math.ceil(partPerFaces / nline);

                vn.multiplyScalar(cubeEdgeSize * 0.5 + (cubeEdgeSize / nline) * 0.5);

                for (var y = 0; y < nline; y++)
                {
                    var pvyx = vy.x * y / (nline - 1) * cubeEdgeSize;
                    var pvyy = vy.y * y / (nline - 1) * cubeEdgeSize;
                    var pvyz = vy.z * y / (nline - 1) * cubeEdgeSize;

                    pvyx += vy.x * -cubeEdgeSize * 0.5;
                    pvyy += vy.y * -cubeEdgeSize * 0.5;
                    pvyz += vy.z * -cubeEdgeSize * 0.5;

                    if (y === nline - 1)
                    {
                        nperline = partPerFaces;
                    }

                    for (var x = 0; x < nperline; x++)
                    {
                        var px, py, py;

                        px = vx.x * x / (nperline - 1) * cubeEdgeSize;
                        py = vx.y * x / (nperline - 1) * cubeEdgeSize;
                        pz = vx.z * x / (nperline - 1) * cubeEdgeSize;

                        px += vx.x * -cubeEdgeSize * 0.5;
                        py += vx.y * -cubeEdgeSize * 0.5;
                        pz += vx.z * -cubeEdgeSize * 0.5;

                        px += pvyx;
                        py += pvyy;
                        pz += pvyz;

                        px += vn.x;
                        py += vn.y;
                        pz += vn.z;

                        px *= layerScaler;
                        py *= layerScaler;
                        pz *= layerScaler;

                        var pa = particles[p];

                        do
                        {
                            pa.tx = px;
                            pa.ty = py;
                            pa.tz = pz;
                            pa.xyzInterpolant = 0;
                            pa = pa.nextlevel;
                        }
                        while (pa);

                        partPerFaces--;
                        p++;
                        if (p >= (partstart + partlength) || partPerFaces <= 0)
                        {
                            y = nline;
                            break;
                        }
                    }
                }
            }
        }
    }
};



