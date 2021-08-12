/*
Copyright (c) 2016 Ermiya Eskandary & Théophile Cailliau and other contributors
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
// ==UserScript==
// @name         Slither.io-bot
// @namespace    http://slither.io/
// @version      1.2.9
// @description  Slither.io bot
// @author       Ermiya Eskandary & Théophile Cailliau
// @match        http://slither.io/
// @grant        none
// ==/UserScript==

/*
Override bot options here
Uncomment variables you wish to change from their default values
Changes you make here will be kept between script versions
*/
var customBotOptions = {
    // target fps
    // targetFps: 30,
    // size of arc for collisionAngles
    // arcSize: Math.PI / 8,
    // radius multiple for circle intersects
    // radiusMult: 10,
    // food cluster size to trigger acceleration
    // foodAccelSize: 60,
    // maximum angle of food to trigger acceleration
    // foodAccelAngle:  Math.PI / 3,
    // how many frames per food check
    // foodFrames: 4,
    // round food cluster size up to the nearest
    // foodRoundSize: 5,
    // round food angle up to nearest for angle difference scoring
    // foodRoundAngle: Math.PI / 8,
    // food clusters at or below this size won't be considered
    // if there is a collisionAngle
    // foodSmallSize: 10,
    // angle or higher where enemy heady is considered in the rear
    // rearHeadAngle: 3 * Math.PI / 4,
    // attack emeny rear head at this angle
    // rearHeadDir: Math.PI / 2,
    // quick radius toggle size in approach mode
    // radiusApproachSize: 5,
    // quick radius toggle size in avoid mode
    // radiusAvoidSize: 25,
    // uncomment to quickly revert to the default options
    // if you update the script while this is active,
    // you will lose your custom options
    // useDefaults: true
};

// Custom logging function - disabled by default
window.log = function() {
    if (window.logDebugging) {
        console.log.apply(console, arguments);
    }
};

// Add standard deviation function to array prototype
Array.prototype.stats = function() {
    var i;
    var j;
    var total = 0;
    var mean = 0;
    var diffSqredArr = [];
    for (i = 0; i < this.length; i += 1) {
        total += this[i];
    }
    mean = total / this.length;
    for (j = 0; j < this.length; j += 1) {
        diffSqredArr.push(Math.pow((this[j] - mean), 2));
    }
    return {
        mean: mean,
        stdev: (Math.sqrt(diffSqredArr.reduce(
            function(firstEl, nextEl) { return firstEl + nextEl; }
            ) / this.length)),
        min: Math.min.apply(null, this),
        max: Math.max.apply(null, this)
    };
};


var canvasUtil = window.canvasUtil = (function() {
    return {
        // Ratio of screen size divided by canvas size.
        canvasRatio: {
            x: window.mc.width / window.ww,
            y: window.mc.height / window.hh
        },

        // Set direction of snake towards the virtual mouse coordinates
        setMouseCoordinates: function(point) {
            window.xm = point.x;
            window.ym = point.y;
        },

        // Convert snake-relative coordinates to absolute screen coordinates.
        mouseToScreen: function(point) {
            var screenX = point.x + (window.ww / 2);
            var screenY = point.y + (window.hh / 2);
            return {
                x: screenX,
                y: screenY
            };
        },

        // Convert screen coordinates to canvas coordinates.
        screenToCanvas: function(point) {
            var canvasX = window.csc *
                (point.x * canvasUtil.canvasRatio.x) - parseInt(window.mc.style.left);
            var canvasY = window.csc *
                (point.y * canvasUtil.canvasRatio.y) - parseInt(window.mc.style.top);
            return {
                x: canvasX,
                y: canvasY
            };
        },

        // Convert map coordinates to mouse coordinates.
        mapToMouse: function(point) {
            var mouseX = (point.x - window.snake.xx) * window.gsc;
            var mouseY = (point.y - window.snake.yy) * window.gsc;
            return {
                x: mouseX,
                y: mouseY
            };
        },

        // Map coordinates to Canvas coordinates.
        mapToCanvas: function(point) {
            var c = canvasUtil.mapToMouse(point);
            c = canvasUtil.mouseToScreen(c);
            c = canvasUtil.screenToCanvas(c);
            return c;
        },

        // Map to Canvas coordinates conversion for drawing circles.
        circleMapToCanvas: function(circle) {
            var newCircle = canvasUtil.mapToCanvas(circle);
            return canvasUtil.circle(
                newCircle.x,
                newCircle.y,
                // Radius also needs to scale by .gsc
                circle.radius * window.gsc
            );
        },

        // Constructor for point type
        point: function(x, y) {
            var p = {
                x: Math.round(x),
                y: Math.round(y)
            };

            return p;
        },

        // Constructor for rect type
        rect: function(x, y, w, h) {
            var r = {
                x: Math.round(x),
                y: Math.round(y),
                width: Math.round(w),
                height: Math.round(h)
            };

            return r;
        },

        // Constructor for circle type
        circle: function(x, y, r) {
            var c = {
                x: Math.round(x),
                y: Math.round(y),
                radius: Math.round(r)
            };

            return c;
        },

        // Fast atan2
        fastAtan2: function(y, x) {
            const QPI = Math.PI / 4;
            const TQPI = 3 * Math.PI / 4;
            var r = 0.0;
            var angle = 0.0;
            var abs_y = Math.abs(y) + 1e-10;
            if (x < 0) {
                r = (x + abs_y) / (abs_y - x);
                angle = TQPI;
            } else {
                r = (x - abs_y) / (x + abs_y);
                angle = QPI;
            }
            angle += (0.1963 * r * r - 0.9817) * r;
            if (y < 0) {
                return -angle;
            }

            return angle;
        },

        // Adjusts zoom in response to the mouse wheel.
        setZoom: function(e) {
            // Scaling ratio
            if (window.gsc) {
                window.gsc *= Math.pow(0.9, e.wheelDelta / -120 || e.detail / 2 || 0);
            }
        },

        // Restores zoom to the default value.
        resetZoom: function() {
            window.gsc = 0.9;
        },

        // Sets background to the given image URL.
        // Defaults to slither.io's own background.
        setBackground: function(url) {
            url = typeof url !== 'undefined' ? url : '/s/bg45.jpg';
            window.ii.src = url;
        },

        // Draw a rectangle on the canvas.
        drawRect: function(rect, color, fill, alpha) {
            if (alpha === undefined) alpha = 1;

            var context = window.mc.getContext('2d');
            var lc = canvasUtil.mapToCanvas({
                x: rect.x,
                y: rect.y
            });

            context.save();
            context.globalAlpha = alpha;
            context.strokeStyle = color;
            context.rect(lc.x, lc.y, rect.width * window.gsc, rect.height * window.gsc);
            context.stroke();
            if (fill) {
                context.fillStyle = color;
                context.fill();
            }
            context.restore();
        },

        // Draw a circle on the canvas.
        drawCircle: function(circle, color, fill, alpha) {
            if (alpha === undefined) alpha = 1;
            if (circle.radius === undefined) circle.radius = 5;

            var context = window.mc.getContext('2d');
            var drawCircle = canvasUtil.circleMapToCanvas(circle);

            context.save();
            context.globalAlpha = alpha;
            context.beginPath();
            context.strokeStyle = color;
            context.arc(drawCircle.x, drawCircle.y, drawCircle.radius, 0, Math.PI * 2);
            context.stroke();
            if (fill) {
                context.fillStyle = color;
                context.fill();
            }
            context.restore();
        },

        // Draw an angle.
        // @param {number} start -- where to start the angle
        // @param {number} angle -- width of the angle
        // @param {String|CanvasGradient|CanvasPattern} color
        // @param {boolean} fill
        // @param {number} alpha
        drawAngle: function(start, angle, color, fill, alpha) {
            if (alpha === undefined) alpha = 0.6;

            var context = window.mc.getContext('2d');

            context.save();
            context.globalAlpha = alpha;
            context.beginPath();
            context.moveTo(window.mc.width / 2, window.mc.height / 2);
            context.arc(window.mc.width / 2, window.mc.height / 2, window.gsc * 100, start, angle);
            context.lineTo(window.mc.width / 2, window.mc.height / 2);
            context.closePath();
            context.stroke();
            if (fill) {
                context.fillStyle = color;
                context.fill();
            }
            context.restore();
        },

        // Draw a line on the canvas.
        drawLine: function(p1, p2, color, width) {
            if (width === undefined) width = 5;

            var context = window.mc.getContext('2d');
            var dp1 = canvasUtil.mapToCanvas(p1);
            var dp2 = canvasUtil.mapToCanvas(p2);

            context.save();
            context.beginPath();
            context.lineWidth = width * window.gsc;
            context.strokeStyle = color;
            context.moveTo(dp1.x, dp1.y);
            context.lineTo(dp2.x, dp2.y);
            context.stroke();
            context.restore();
        },

        // Given the start and end of a line, is point left.
        isLeft: function(start, end, point) {
            return ((end.x - start.x) * (point.y - start.y) -
                (end.y - start.y) * (point.x - start.x)) > 0;

        },

        // Get distance squared
        getDistance2: function(x1, y1, x2, y2) {
            var distance2 = Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2);
            return distance2;
        },

        getDistance2FromSnake: function(point) {
            point.distance = canvasUtil.getDistance2(window.snake.xx, window.snake.yy,
                point.xx, point.yy);
            return point;
        },

        // Check if point in Rect
        pointInRect: function(point, rect) {
            if (rect.x <= point.x && rect.y <= point.y &&
                rect.x + rect.width >= point.x && rect.y + rect.height >= point.y) {
                return true;
            }
            return false;
        },

        // Check if circles intersect
        circleIntersect: function(circle1, circle2) {
            var bothRadii = circle1.radius + circle2.radius;
            var dx = circle1.x - circle2.x;
            var dy = circle1.y - circle2.y;

            // Pretends the circles are squares for a quick collision check.
            // If it collides, do the more expensive circle check.
            if (dx + bothRadii > 0 && dy + bothRadii > 0 &&
                dx - bothRadii < 0 && dy - bothRadii < 0) {

                var distance2 = canvasUtil.getDistance2(circle1.x, circle1.y, circle2.x, circle2.y);

                if (distance2 < bothRadii * bothRadii) {
                    if (window.visualDebugging) {
                        var collisionPointCircle = canvasUtil.circle(
                            ((circle1.x * circle2.radius) + (circle2.x * circle1.radius)) /
                            bothRadii,
                            ((circle1.y * circle2.radius) + (circle2.y * circle1.radius)) /
                            bothRadii,
                            5
                        );
                        canvasUtil.drawCircle(circle2, 'red', true);
                        canvasUtil.drawCircle(collisionPointCircle, 'cyan', true);
                    }
                    return true;
                }
            }
            return false;
        }
    };
})();

var logUtil = window.logUtil = (function() {
    return {
        functionData: [],
        startTimes: [],

        startTime: function(functionName) {
            logUtil.startTimes[functionName] = performance.now();
        },

        endTime: function(functionName) {
            // No sense recording end time if start wasn't called.
            if (!(functionName in logUtil.startTimes)) {
                window.log('logUtil.endTime called for "' + functionName + '" without start');
                return;
            }
            var duration = performance.now() - logUtil.startTimes[functionName];

            if (!(functionName in logUtil.functionData)) {
                logUtil.functionData[functionName] = [];
            }
            if (logUtil.functionData[functionName].push(duration) > window.bot.opt.logFrames) {
                logUtil.functionData[functionName].shift();
            }
        },

        functionStats: function(functionName) {
            if (functionName in logUtil.functionData) {
                return logUtil.functionData[functionName].stats();
            } else {
                window.log('No function data for ' + functionName);
                return false;
            }
        }
    };
})();

var bot = window.bot = (function() {
    return {
        isBotRunning: false,
        isBotEnabled: true,
        lookForFood: false,
        collisionPoints: [],
        collisionAngles: [],
        scores: [],
        foodTimeout: undefined,
        sectorBoxSide: 0,
        defaultAccel: 0,
        sectorBox: {},
        currentFood: {},
        opt: {
            // These are the bot's default options
            // If you wish to customise these, use
            // customBotOptions above
            targetFps: 30,
            arcSize: Math.PI / 8,
            radiusMult: 10,
            foodAccelSize: 60,
            foodAccelAngle: Math.PI / 3,
            foodFrames: 4,
            foodRoundSize: 5,
            foodRoundAngle: Math.PI / 8,
            foodSmallSize: 10,
            rearHeadAngle: 3 * Math.PI / 4,
            rearHeadDir: Math.PI / 2,
            radiusApproachSize: 5,
            radiusAvoidSize: 25,
            logFrames: 200
        },
        MID_X: 0,
        MID_Y: 0,
        MAP_R: 0,

        getSnakeWidth: function(sc) {
            if (sc === undefined) sc = window.snake.sc;
            return Math.round(sc * 29.0);
        },

        quickRespawn: function() {
            window.dead_mtm = 0;
            window.login_fr = 0;

            bot.isBotRunning = false;
            window.forcing = true;
            window.connect();
            window.forcing = false;
        },

        // angleBetween - get the smallest angle between two angles (0-pi)
        angleBetween: function(a1, a2) {
            var r1 = 0.0;
            var r2 = 0.0;

            r1 = (a1 - a2) % Math.PI;
            r2 = (a2 - a1) % Math.PI;

            return r1 < r2 ? -r1 : r2;
        },

        // Avoid headPoint
        avoidHeadPoint: function(collisionPoint) {
            var cehang = canvasUtil.fastAtan2(
                collisionPoint.yy - window.snake.yy, collisionPoint.xx - window.snake.xx);
            var diff = bot.angleBetween(window.snake.ehang, cehang);

            if (Math.abs(diff) > bot.opt.rearHeadAngle) {
                var dir = diff > 0 ? -bot.opt.rearHeadDir : bot.opt.rearHeadDir;
                bot.changeHeading(dir);
            } else {
                bot.avoidCollisionPoint(collisionPoint);
            }
        },

        // Change heading by ang
        // +0-pi turn left
        // -0-pi turn right

        changeHeading: function(angle) {
            var heading = {
                x: window.snake.xx + 500 * bot.cos,
                y: window.snake.yy + 500 * bot.sin
            };

            var cos = Math.cos(-angle);
            var sin = Math.sin(-angle);

            window.goalCoordinates = {
                x: Math.round(
                    cos * (heading.x - window.snake.xx) -
                    sin * (heading.y - window.snake.yy) + window.snake.xx),
                y: Math.round(
                    sin * (heading.x - window.snake.xx) +
                    cos * (heading.y - window.snake.yy) + window.snake.yy)
            };

            canvasUtil.setMouseCoordinates(canvasUtil.mapToMouse(window.goalCoordinates));
        },

        // Avoid collision point by ang
        // ang radians <= Math.PI (180deg)
        avoidCollisionPoint: function(collisionPoint, ang) {
            if (ang === undefined || ang > Math.PI) {
                ang = Math.PI;
            }

            var end = {
                x: window.snake.xx + 2000 * bot.cos,
                y: window.snake.yy + 2000 * bot.sin
            };

            if (window.visualDebugging) {
                canvasUtil.drawLine({
                    x: window.snake.xx,
                    y: window.snake.yy
                },
                    end,
                    'orange', 5);
                canvasUtil.drawLine({
                    x: window.snake.xx,
                    y: window.snake.yy
                }, {
                    x: collisionPoint.xx,
                    y: collisionPoint.yy
                },
                    'red', 5);
            }

            var cos = Math.cos(ang);
            var sin = Math.sin(ang);

            if (canvasUtil.isLeft({
                x: window.snake.xx,
                y: window.snake.yy
            }, end, {
                x: collisionPoint.xx,
                y: collisionPoint.yy
            })) {
                sin = -sin;
            }

            window.goalCoordinates = {
                x: Math.round(
                    cos * (collisionPoint.xx - window.snake.xx) -
                    sin * (collisionPoint.yy - window.snake.yy) + window.snake.xx),
                y: Math.round(
                    sin * (collisionPoint.xx - window.snake.xx) +
                    cos * (collisionPoint.yy - window.snake.yy) + window.snake.yy)
            };

            canvasUtil.setMouseCoordinates(canvasUtil.mapToMouse(window.goalCoordinates));
        },

        // Sorting by  property 'distance'
        sortDistance: function(a, b) {
            return a.distance - b.distance;
        },

        // get collision angle index, expects angle +/i 0 to Math.PI
        getAngleIndex: function(angle) {
            const ARCSIZE = bot.opt.arcSize;
            var index;

            if (angle < 0) {
                angle += 2 * Math.PI;
            }

            index = Math.round(angle * (1 / ARCSIZE));

            if (index === (2 * Math.PI) / ARCSIZE) {
                return 0;
            }
            return index;
        },

        // Add to collisionAngles if distance is closer
        addCollisionAngle: function(sp) {
            var ang = canvasUtil.fastAtan2(
                Math.round(sp.yy - window.snake.yy),
                Math.round(sp.xx - window.snake.xx));
            var aIndex = bot.getAngleIndex(ang);

            var actualDistance = Math.round(Math.pow(
                Math.sqrt(sp.distance) - sp.radius, 2));

            if (bot.collisionAngles[aIndex] === undefined) {
                bot.collisionAngles[aIndex] = {
                    x: Math.round(sp.xx),
                    y: Math.round(sp.yy),
                    ang: ang,
                    snake: sp.snake,
                    distance: actualDistance
                };
            } else if (bot.collisionAngles[aIndex].distance > sp.distance) {
                bot.collisionAngles[aIndex].x = Math.round(sp.xx);
                bot.collisionAngles[aIndex].y = Math.round(sp.yy);
                bot.collisionAngles[aIndex].ang = ang;
                bot.collisionAngles[aIndex].snake = sp.snake;
                bot.collisionAngles[aIndex].distance = actualDistance;
            }
        },

        // Get closest collision point per snake.
        getCollisionPoints: function() {
            var scPoint;

            bot.collisionPoints = [];
            bot.collisionAngles = [];

            for (var snake = 0, ls = window.snakes.length; snake < ls; snake++) {
                scPoint = undefined;

                if (window.snakes[snake].id !== window.snake.id &&
                    window.snakes[snake].alive_amt === 1) {

                    scPoint = {
                        xx: window.snakes[snake].xx,
                        yy: window.snakes[snake].yy,
                        snake: snake,
                        radius: bot.getSnakeWidth(window.snakes[snake].sc) / 2
                    };
                    canvasUtil.getDistance2FromSnake(scPoint);
                    bot.addCollisionAngle(scPoint);
                    if (window.visualDebugging) {
                        canvasUtil.drawCircle(canvasUtil.circle(
                                scPoint.xx,
                                scPoint.yy,
                                scPoint.radius),
                            'red', false);
                    }

                    for (var pts = 0, lp = window.snakes[snake].pts.length; pts < lp; pts++) {
                        if (!window.snakes[snake].pts[pts].dying &&
                            canvasUtil.pointInRect({
                                x: window.snakes[snake].pts[pts].xx,
                                y: window.snakes[snake].pts[pts].yy
                            }, bot.sectorBox)
                        ) {
                            var collisionPoint = {
                                xx: window.snakes[snake].pts[pts].xx,
                                yy: window.snakes[snake].pts[pts].yy,
                                snake: snake,
                                radius: bot.getSnakeWidth(window.snakes[snake].sc) / 2
                            };

                            if (window.visualDebugging && true === false) {
                                canvasUtil.drawCircle(canvasUtil.circle(
                                        collisionPoint.xx,
                                        collisionPoint.yy,
                                        collisionPoint.radius),
                                    '#00FF00', false);
                            }

                            canvasUtil.getDistance2FromSnake(collisionPoint);
                            bot.addCollisionAngle(collisionPoint);

                            if (scPoint === undefined ||
                                scPoint.distance > collisionPoint.distance) {
                                scPoint = collisionPoint;
                            }
                        }
                    }
                }
                if (scPoint !== undefined) {
                    bot.collisionPoints.push(scPoint);
                    if (window.visualDebugging) {
                        canvasUtil.drawCircle(canvasUtil.circle(
                            scPoint.xx,
                            scPoint.yy,
                            scPoint.radius
                        ), 'red', false);
                    }
                }
            }

            // WALL
            if (canvasUtil.getDistance2(bot.MID_X, bot.MID_Y, window.snake.xx, window.snake.yy) >
                Math.pow(bot.MAP_R - 1000, 2)) {
                var midAng = canvasUtil.fastAtan2(
                    window.snake.yy - bot.MID_X, window.snake.xx - bot.MID_Y);
                scPoint = {
                    xx: bot.MID_X + bot.MAP_R * Math.cos(midAng),
                    yy: bot.MID_Y + bot.MAP_R * Math.sin(midAng),
                    snake: -1,
                    radius: bot.snakeWidth
                };
                canvasUtil.getDistance2FromSnake(scPoint);
                bot.collisionPoints.push(scPoint);
                bot.addCollisionAngle(scPoint);
                if (window.visualDebugging) {
                    canvasUtil.drawCircle(canvasUtil.circle(
                        scPoint.xx,
                        scPoint.yy,
                        scPoint.radius
                    ), 'yellow', false);
                }
            }

            bot.collisionPoints.sort(bot.sortDistance);
            if (window.visualDebugging) {
                for (var i = 0; i < bot.collisionAngles.length; i++) {
                    if (bot.collisionAngles[i] !== undefined) {
                        canvasUtil.drawLine({
                            x: window.snake.xx,
                            y: window.snake.yy
                        }, {
                            x: bot.collisionAngles[i].x,
                            y: bot.collisionAngles[i].y
                        },
                            '#99ffcc', 2);
                    }
                }
            }
        },

        // Checks to see if you are going to collide with anything in the collision detection radius
        checkCollision: function() {
            var headCircle = canvasUtil.circle(
                window.snake.xx, window.snake.yy,
                bot.speedMult * bot.opt.radiusMult / 2 * bot.snakeRadius
            );

            var fullHeadCircle = canvasUtil.circle(
                window.snake.xx, window.snake.yy,
                bot.opt.radiusMult * bot.snakeRadius
            );

            if (window.visualDebugging) {
                canvasUtil.drawCircle(fullHeadCircle, 'red');
                canvasUtil.drawCircle(headCircle, 'blue', false);
            }

            bot.getCollisionPoints();
            if (bot.collisionPoints.length === 0) return false;

            for (var i = 0; i < bot.collisionPoints.length; i++) {
                var collisionCircle = canvasUtil.circle(
                    bot.collisionPoints[i].xx,
                    bot.collisionPoints[i].yy,
                    bot.collisionPoints[i].radius
                );

                if (canvasUtil.circleIntersect(headCircle, collisionCircle)) {
                    window.setAcceleration(bot.defaultAccel);
                    bot.avoidCollisionPoint(bot.collisionPoints[i]);
                    return true;
                }

                // snake -1 is special case for non snake object.
                if (bot.collisionPoints[i].snake !== -1) {
                    var enemyHeadCircle = canvasUtil.circle(
                        window.snakes[bot.collisionPoints[i].snake].xx,
                        window.snakes[bot.collisionPoints[i].snake].yy,
                        bot.collisionPoints[i].radius
                    );

                    if (canvasUtil.circleIntersect(fullHeadCircle, enemyHeadCircle)) {
                        if (window.snakes[bot.collisionPoints[i].snake].sp > 10) {
                            window.setAcceleration(1);
                        } else {
                            window.setAcceleration(bot.defaultAccel);
                        }
                        bot.avoidHeadPoint({
                            xx: window.snakes[bot.collisionPoints[i].snake].xx,
                            yy: window.snakes[bot.collisionPoints[i].snake].yy
                        });
                        return true;
                    }
                }
            }
            window.setAcceleration(bot.defaultAccel);
            return false;
        },

        sortScore: function(a, b) {
            return b.score - a.score;
        },

        // Round angle difference up to nearest foodRoundAngle degrees.
        // Round food up to nearest foodRoundsz, square for distance^2
        scoreFood: function(f) {
            f.score = Math.pow(Math.ceil(f.sz / bot.opt.foodRoundSize) * bot.opt.foodRoundSize, 2) /
                f.distance / (Math.ceil(f.da / bot.opt.foodRoundAngle) * bot.opt.foodRoundAngle);
        },

        computeFoodGoal: function() {
            var foodClusters = [];
            var foodGetIndex = [];
            var fi = 0;
            var sw = bot.snakeWidth;

            for (var i = 0; i < window.foods.length && window.foods[i] !== null; i++) {
                var a;
                var da;
                var distance;
                var sang = window.snake.ehang;
                var f = window.foods[i];

                if (!f.eaten &&
                    !(
                        canvasUtil.circleIntersect(
                            canvasUtil.circle(f.xx, f.yy, 2),
                            bot.sidecircle_l) ||
                        canvasUtil.circleIntersect(
                            canvasUtil.circle(f.xx, f.yy, 2),
                            bot.sidecircle_r))) {

                    var cx = Math.round(Math.round(f.xx / sw) * sw);
                    var cy = Math.round(Math.round(f.yy / sw) * sw);
                    var csz = Math.round(f.sz);

                    if (foodGetIndex[cx + '|' + cy] === undefined) {
                        foodGetIndex[cx + '|' + cy] = fi;
                        a = canvasUtil.fastAtan2(cy - window.snake.yy, cx - window.snake.xx);
                        da = Math.min(
                            (2 * Math.PI) - Math.abs(a - sang), Math.abs(a - sang));
                        distance = Math.round(
                            canvasUtil.getDistance2(cx, cy, window.snake.xx, window.snake.yy));
                        foodClusters[fi] = {
                            x: cx,
                            y: cy,
                            a: a,
                            da: da,
                            sz: csz,
                            distance: distance,
                            score: 0.0
                        };
                        fi++;
                    } else {
                        foodClusters[foodGetIndex[cx + '|' + cy]].sz += csz;
                    }
                }
            }

            foodClusters.forEach(bot.scoreFood);
            foodClusters.sort(bot.sortScore);

            for (i = 0; i < foodClusters.length; i++) {
                var aIndex = bot.getAngleIndex(foodClusters[i].a);
                if (bot.collisionAngles[aIndex] === undefined ||
                    (Math.sqrt(bot.collisionAngles[aIndex].distance) -
                        bot.snakeRadius * bot.opt.radiusMult / 2 >
                        Math.sqrt(foodClusters[i].distance) &&
                        foodClusters[i].sz > bot.opt.foodSmallSize)
                ) {
                    bot.currentFood = foodClusters[i];
                    return;
                }
            }
            bot.currentFood = {
                x: bot.MID_X,
                y: bot.MID_Y
            };
        },

        foodAccel: function() {
            var aIndex = 0;

            if (bot.currentFood && bot.currentFood.sz > bot.opt.foodAccelSize) {
                aIndex = bot.getAngleIndex(bot.currentFood.a);

                if (
                    bot.collisionAngles[aIndex] && bot.collisionAngles[aIndex].distance >
                    bot.currentFood.distance + bot.snakeWidth * bot.opt.radiusMult &&
                    bot.currentFood.da < bot.opt.foodAccelAngle) {
                    return 1;
                }

                if (bot.collisionAngles[aIndex] === undefined) {
                    return 1;
                }
            }

            return bot.defaultAccel;
        },

        every: function() {
            bot.MID_X = window.grd;
            bot.MID_Y = window.grd;
            bot.MAP_R = window.grd * 0.98;

            bot.sectorBoxSide = Math.floor(Math.sqrt(window.sectors.length)) * window.sector_size;
            bot.sectorBox = canvasUtil.rect(
                window.snake.xx - (bot.sectorBoxSide / 2),
                window.snake.yy - (bot.sectorBoxSide / 2),
                bot.sectorBoxSide, bot.sectorBoxSide);
            // if (window.visualDebugging)
            // canvasUtil.drawRect(bot.sectorBox, '#c0c0c0', true, 0.1);

            bot.cos = Math.cos(window.snake.ang);
            bot.sin = Math.sin(window.snake.ang);

            bot.speedMult = window.snake.sp / 5.78;
            bot.snakeRadius = bot.getSnakeWidth() / 2;
            bot.snakeWidth = bot.getSnakeWidth();

            bot.sidecircle_r = canvasUtil.circle(
                window.snake.lnp.xx -
                ((window.snake.lnp.yy + bot.sin * bot.snakeWidth) -
                    window.snake.lnp.yy),
                window.snake.lnp.yy +
                ((window.snake.lnp.xx + bot.cos * bot.snakeWidth) -
                    window.snake.lnp.xx),
                bot.snakeWidth * bot.speedMult
            );

            bot.sidecircle_l = canvasUtil.circle(
                window.snake.lnp.xx +
                ((window.snake.lnp.yy + bot.sin * bot.snakeWidth) -
                    window.snake.lnp.yy),
                window.snake.lnp.yy -
                ((window.snake.lnp.xx + bot.cos * bot.snakeWidth) -
                    window.snake.lnp.xx),
                bot.snakeWidth * bot.speedMult
            );
        },

        // Main bot
        go: function() {
            bot.every();

            if (bot.checkCollision()) {
                bot.lookForFood = false;
                if (bot.foodTimeout) {
                    window.clearTimeout(bot.foodTimeout);
                    bot.foodTimeout = window.setTimeout(
                        bot.foodTimer, 1000 / bot.opt.targetFps * bot.opt.foodFrames);
                }
            } else {
                bot.lookForFood = true;
                if (bot.foodTimeout === undefined) {
                    bot.foodTimeout = window.setTimeout(
                        bot.foodTimer, 1000 / bot.opt.targetFps * bot.opt.foodFrames);
                }
                window.setAcceleration(bot.foodAccel());
            }
        },

        // Timer version of food check
        foodTimer: function() {
            if (window.playing && bot.lookForFood &&
                window.snake !== null && window.snake.alive_amt === 1) {
                logUtil.startTime('cfg');
                bot.computeFoodGoal();
                logUtil.endTime('cfg');
                window.goalCoordinates = bot.currentFood;
                canvasUtil.setMouseCoordinates(canvasUtil.mapToMouse(window.goalCoordinates));
            }
            bot.foodTimeout = undefined;
        }
    };
})();

var userInterface = window.userInterface = (function() {
    // Save the original slither.io functions so we can modify them, or reenable them later.
    var original_keydown = document.onkeydown;
    var original_onmouseDown = window.onmousedown;
    var original_oef = window.oef;
    var original_redraw = window.redraw;
    var original_onmousemove = window.onmousemove;

    window.oef = function() {};
    window.redraw = function() {};

    // Modify the redraw()-function to remove the zoom altering code
    // and replace b.globalCompositeOperation = "lighter"; to "hard-light".
    var original_redraw_string = original_redraw.toString();
    var new_redraw_string = original_redraw_string.replace(
        'gsc!=f&&(gsc<f?(gsc+=2E-4,gsc>=f&&(gsc=f)):(gsc-=2E-4,gsc<=f&&(gsc=f)))', '');
    new_redraw_string = new_redraw_string.replace(/b.globalCompositeOperation="lighter"/gi,
        'b.globalCompositeOperation="hard-light"');
    var new_redraw = new Function(new_redraw_string.substring(
        new_redraw_string.indexOf('{') + 1, new_redraw_string.lastIndexOf('}')));

    return {
        overlays: {},

        initOverlays: function() {
            var botOverlay = document.createElement('div');
            botOverlay.style.position = 'fixed';
            botOverlay.style.right = '5px';
            botOverlay.style.bottom = '112px';
            botOverlay.style.width = '150px';
            botOverlay.style.height = '85px';
            // botOverlay.style.background = 'rgba(0, 0, 0, 0.5)';
            botOverlay.style.color = '#C0C0C0';
            botOverlay.style.fontFamily = 'Consolas, Verdana';
            botOverlay.style.zIndex = 999;
            botOverlay.style.fontSize = '14px';
            botOverlay.style.padding = '5px';
            botOverlay.style.borderRadius = '5px';
            botOverlay.className = 'nsi';
            document.body.appendChild(botOverlay);

            var serverOverlay = document.createElement('div');
            serverOverlay.style.position = 'fixed';
            serverOverlay.style.right = '5px';
            serverOverlay.style.bottom = '5px';
            serverOverlay.style.width = '160px';
            serverOverlay.style.height = '14px';
            serverOverlay.style.color = '#C0C0C0';
            serverOverlay.style.fontFamily = 'Consolas, Verdana';
            serverOverlay.style.zIndex = 999;
            serverOverlay.style.fontSize = '14px';
            serverOverlay.className = 'nsi';
            document.body.appendChild(serverOverlay);

            var prefOverlay = document.createElement('div');
            prefOverlay.style.position = 'fixed';
            prefOverlay.style.left = '10px';
            prefOverlay.style.top = '75px';
            prefOverlay.style.width = '260px';
            prefOverlay.style.height = '210px';
            // prefOverlay.style.background = 'rgba(0, 0, 0, 0.5)';
            prefOverlay.style.color = '#C0C0C0';
            prefOverlay.style.fontFamily = 'Consolas, Verdana';
            prefOverlay.style.zIndex = 999;
            prefOverlay.style.fontSize = '14px';
            prefOverlay.style.padding = '5px';
            prefOverlay.style.borderRadius = '5px';
            prefOverlay.className = 'nsi';
            document.body.appendChild(prefOverlay);

            var statsOverlay = document.createElement('div');
            statsOverlay.style.position = 'fixed';
            statsOverlay.style.left = '10px';
            statsOverlay.style.top = '340px';
            statsOverlay.style.width = '140px';
            statsOverlay.style.height = '210px';
            // statsOverlay.style.background = 'rgba(0, 0, 0, 0.5)';
            statsOverlay.style.color = '#C0C0C0';
            statsOverlay.style.fontFamily = 'Consolas, Verdana';
            statsOverlay.style.zIndex = 998;
            statsOverlay.style.fontSize = '14px';
            statsOverlay.style.padding = '5px';
            statsOverlay.style.borderRadius = '5px';
            statsOverlay.className = 'nsi';
            document.body.appendChild(statsOverlay);

            userInterface.overlays.botOverlay = botOverlay;
            userInterface.overlays.serverOverlay = serverOverlay;
            userInterface.overlays.prefOverlay = prefOverlay;
            userInterface.overlays.statsOverlay = statsOverlay;
        },

        toggleOverlays: function() {
            Object.keys(userInterface.overlays).forEach(function(okey) {
                var oVis = userInterface.overlays[okey].style.visibility !== 'hidden' ?
                    'hidden' : 'visible';
                userInterface.overlays[okey].style.visibility = oVis;
                window.visualDebugging = oVis === 'visible';
            });
        },
        toggleLeaderboard: function() {
            window.leaderboard = !window.leaderboard;
            window.log('Leaderboard set to: ' + window.leaderboard);
            userInterface.savePreference('leaderboard', window.leaderboard);
            if (window.leaderboard) {
                // window.lbh.style.display = 'block';
                // window.lbs.style.display = 'block';
                // window.lbp.style.display = 'block';
                window.lbn.style.display = 'block';
            } else {
                // window.lbh.style.display = 'none';
                // window.lbs.style.display = 'none';
                // window.lbp.style.display = 'none';
                window.lbn.style.display = 'none';
            }
        },
        removeLogo: function() {
            if (typeof window.showlogo_iv !== 'undefined') {
                window.ncka = window.lgss = window.lga = 1;
                clearInterval(window.showlogo_iv);
                showLogo(true);
            }
        },
        // Save variable to local storage
        savePreference: function(item, value) {
            window.localStorage.setItem(item, value);
            userInterface.onPrefChange();
        },

        // Load a variable from local storage
        loadPreference: function(preference, defaultVar) {
            var savedItem = window.localStorage.getItem(preference);
            if (savedItem !== null) {
                if (savedItem === 'true') {
                    window[preference] = true;
                } else if (savedItem === 'false') {
                    window[preference] = false;
                } else {
                    window[preference] = savedItem;
                }
                window.log('Setting found for ' + preference + ': ' + window[preference]);
            } else {
                window[preference] = defaultVar;
                window.log('No setting found for ' + preference +
                    '. Used default: ' + window[preference]);
            }
            userInterface.onPrefChange();
            return window[preference];
        },

        // Saves username when you click on "Play" button
        playButtonClickListener: function() {
            userInterface.saveNick();
            userInterface.loadPreference('autoRespawn', false);
            userInterface.onPrefChange();
        },

        // Preserve nickname
        saveNick: function() {
            var nick = document.getElementById('nick').value;
            userInterface.savePreference('savedNick', nick);
        },

        // Hide top score
        hideTop: function() {
            var nsidivs = document.querySelectorAll('div.nsi');
            for (var i = 0; i < nsidivs.length; i++) {
                if (nsidivs[i].style.top === '4px' && nsidivs[i].style.width === '300px') {
                    nsidivs[i].style.visibility = 'hidden';
                    bot.isTopHidden = true;
                    window.topscore = nsidivs[i];
                }
            }
        },

        // Store FPS data
        framesPerSecond: {
            fps: 0,
            fpsTimer: function() {
                if (window.playing && window.fps && window.lrd_mtm) {
                    if (Date.now() - window.lrd_mtm > 970) {
                        userInterface.framesPerSecond.fps = window.fps;
                    }
                }
            }
        },

        onkeydown: function(e) {
            // Original slither.io onkeydown function + whatever is under it
            original_keydown(e);
            if (window.playing) {
                // Letter `T` to toggle bot
                if (e.keyCode === 84) {
                    bot.isBotEnabled = !bot.isBotEnabled;
                }
                // Letter 'U' to toggle debugging (console)
                if (e.keyCode === 85) {
                    window.logDebugging = !window.logDebugging;
                    window.log('Log debugging set to: ' + window.logDebugging);
                    userInterface.savePreference('logDebugging', window.logDebugging);
                }
                // Letter 'Y' to toggle debugging (visual)
                if (e.keyCode === 89) {
                    window.visualDebugging = !window.visualDebugging;
                    window.log('Visual debugging set to: ' + window.visualDebugging);
                    userInterface.savePreference('visualDebugging', window.visualDebugging);
                }
                // Letter 'G' to toggle leaderboard
                if (e.keyCode === 71) {
                    userInterface.toggleLeaderboard(!window.leaderboard);
                }
                // Letter 'I' to toggle autorespawn
                if (e.keyCode === 73) {
                    window.autoRespawn = !window.autoRespawn;
                    window.log('Automatic Respawning set to: ' + window.autoRespawn);
                    userInterface.savePreference('autoRespawn', window.autoRespawn);
                }
                // Letter 'H' to toggle hidden mode
                if (e.keyCode === 72) {
                    userInterface.toggleOverlays();
                }
                // Letter 'B' to prompt for a custom background url
                if (e.keyCode === 66) {
                    var url = prompt('Please enter a background url:');
                    if (url !== null) {
                        canvasUtil.setBackground(url);
                    }
                }
                // Letter 'O' to change rendermode (visual)
                if (e.keyCode === 79) {
                    userInterface.toggleMobileRendering(!window.mobileRender);
                }
                // Letter 'A' to increase collision detection radius
                if (e.keyCode === 65) {
                    bot.opt.radiusMult++;
                    window.log(
                        'radiusMult set to: ' + bot.opt.radiusMult);
                }
                // Letter 'S' to decrease collision detection radius
                if (e.keyCode === 83) {
                    if (bot.opt.radiusMult > 1) {
                        bot.opt.radiusMult--;
                        window.log(
                            'radiusMult set to: ' +
                            bot.opt.radiusMult);
                    }
                }
                // Letter 'D' to quick toggle collision radius
                if (e.keyCode === 68) {
                    if (bot.opt.radiusMult >
                        ((bot.opt.radiusAvoidSize - bot.opt.radiusApproachSize) /
                            2 + bot.opt.radiusApproachSize)) {
                        bot.opt.radiusMult = bot.opt.radiusApproachSize;
                    } else {
                        bot.opt.radiusMult = bot.opt.radiusAvoidSize;
                    }
                    window.log(
                        'radiusMult set to: ' + bot.opt.radiusMult);
                }
                // Letter 'Z' to reset zoom
                if (e.keyCode === 90) {
                    canvasUtil.resetZoom();
                }
                // Letter 'Q' to quit to main menu
                if (e.keyCode === 81) {
                    window.autoRespawn = false;
                    userInterface.quit();
                }
                // 'ESC' to quickly respawn
                if (e.keyCode === 27) {
                    bot.quickRespawn();
                }
                // Save nickname when you press "Enter"
                if (e.keyCode === 13) {
                    userInterface.saveNick();
                }
                userInterface.onPrefChange();
            }
        },

        onmousedown: function(e) {
            if (window.playing) {
                switch (e.which) {
                    // "Left click" to manually speed up the slither
                    case 1:
                        bot.defaultAccel = 1;
                        if (!bot.isBotEnabled) {
                            original_onmouseDown(e);
                        }
                        break;
                        // "Right click" to toggle bot in addition to the letter "T"
                    case 3:
                        bot.isBotEnabled = !bot.isBotEnabled;
                        break;
                }
            } else {
                original_onmouseDown(e);
            }
            userInterface.onPrefChange();
        },

        onmouseup: function() {
            bot.defaultAccel = 0;
        },

        // Manual mobile rendering
        toggleMobileRendering: function(mobileRendering) {
            window.mobileRender = mobileRendering;
            window.log('Mobile rendering set to: ' + window.mobileRender);
            userInterface.savePreference('mobileRender', window.mobileRender);
            // Set render mode
            if (window.mobileRender) {
                window.render_mode = 1;
                window.want_quality = 0;
                window.high_quality = false;
            } else {
                window.render_mode = 2;
                window.want_quality = 1;
                window.high_quality = true;
            }
        },

        // Update stats overlay.
        updateStats: function() {
            var oContent = [];
            var median;

            if (bot.scores.length === 0) return;
            median = Math.round((bot.scores[Math.floor((bot.scores.length - 1) / 2)] +
                     bot.scores[Math.ceil((bot.scores.length - 1) / 2)]) / 2);

            var stats = bot.scores.stats();

            avg = Math.round(stats.mean);
            stdev = Math.round(stats.stdev);

            oContent.push('games played: ' + bot.scores.length);
            oContent.push('avg: ' + avg + ' stdev: ' + stdev + '<br/>' +
                'med: ' + median);

            for (var i = 0; i < bot.scores.length && i < 10; i++) {
                oContent.push(i + 1 + '. ' + bot.scores[i]);
            }

            userInterface.overlays.statsOverlay.innerHTML = oContent.join('<br/>');
        },

        onPrefChange: function() {
            // Set static display options here.
            var oContent = [];
            var ht = userInterface.handleTextColor;

            oContent.push('version: ' + GM_info.script.version);
            oContent.push('[T / Right click] bot: ' + ht(bot.isBotEnabled));
            oContent.push('[O] mobile rendering: ' + ht(window.mobileRender));
            oContent.push('[A/S] radius multiplier: ' + bot.opt.radiusMult);
            oContent.push('[D] quick radius change ' +
                bot.opt.radiusApproachSize + '/' + bot.opt.radiusAvoidSize);
            oContent.push('[I] auto respawn: ' + ht(window.autoRespawn));
            oContent.push('[G] leaderboard overlay: ' + ht(window.leaderboard));
            oContent.push('[Y] visual debugging: ' + ht(window.visualDebugging));
            oContent.push('[U] log debugging: ' + ht(window.logDebugging));
            oContent.push('[H] overlays');
            oContent.push('[B] change background');
            oContent.push('[Mouse Wheel] zoom');
            oContent.push('[Z] reset zoom');
            oContent.push('[ESC] quick respawn');
            oContent.push('[Q] quit to menu');

            userInterface.overlays.prefOverlay.innerHTML = oContent.join('<br/>');
        },

        onFrameUpdate: function() {
            // Botstatus overlay
            var oContent = [];

            if (window.playing && window.snake !== null) {
                oContent.push('fps: ' + userInterface.framesPerSecond.fps);

                // Display the X and Y of the snake
                oContent.push('x: ' +
                    (Math.round(window.snake.xx) || 0) + ' y: ' +
                    (Math.round(window.snake.yy) || 0));

                if (window.goalCoordinates) {
                    oContent.push('target');
                    oContent.push('x: ' + window.goalCoordinates.x + ' y: ' +
                        window.goalCoordinates.y);
                    if (window.goalCoordinates.sz) {
                        oContent.push('sz: ' + window.goalCoordinates.sz);
                    }
                }

                if (window.bso !== undefined && userInterface.overlays.serverOverlay.innerHTML !==
                    window.bso.ip + ':' + window.bso.po) {
                    userInterface.overlays.serverOverlay.innerHTML =
                        window.bso.ip + ':' + window.bso.po;
                }

                if (window.logUtil !== undefined) {
                    var cfg = window.logUtil.functionStats('cfg');

                    if (cfg) {
                        oContent.push('cfg: μ' + Math.round(cfg.mean) + ' ∧' +
                            Math.round(cfg.min) + '  ∨' + Math.round(cfg.max));
                    }
                }
            }

            userInterface.overlays.botOverlay.innerHTML = oContent.join('<br/>');

            if (window.playing && window.visualDebugging) {
                // Only draw the goal when a bot has a goal.
                if (window.goalCoordinates && bot.isBotEnabled) {
                    var headCoord = {
                        x: window.snake.xx,
                        y: window.snake.yy
                    };
                    canvasUtil.drawLine(
                        headCoord,
                        window.goalCoordinates,
                        'green');
                    canvasUtil.drawCircle(window.goalCoordinates, 'red', true);
                }
            }
        },

        oefTimer: function() {
            var start = Date.now();
            // Original slither.io oef function + whatever is under it
            original_oef();
            // Modified slither.io redraw function
            new_redraw();

            if (window.playing && bot.isBotEnabled && window.snake !== null) {
                window.onmousemove = function() {};
                bot.isBotRunning = true;
                bot.go();
            } else if (bot.isBotEnabled && bot.isBotRunning) {
                bot.isBotRunning = false;
                if (window.lastscore && window.lastscore.childNodes[1]) {
                    bot.scores.push(parseInt(window.lastscore.childNodes[1].innerHTML));
                    bot.scores.sort(function(a, b) {
                        return b - a;
                    });
                    userInterface.updateStats();
                }

                if (window.autoRespawn) {
                    window.connect();
                }
            }

            if (!bot.isBotEnabled || !bot.isBotRunning) {
                window.onmousemove = original_onmousemove;
            }

            userInterface.onFrameUpdate();
            setTimeout(userInterface.oefTimer, (1000 / bot.opt.targetFps) - (Date.now() - start));
        },

        // Quit to menu
        quit: function() {
            if (window.playing && window.resetGame) {
                window.want_close_socket = true;
                window.dead_mtm = 0;
                if (window.play_btn) {
                    window.play_btn.setEnabled(true);
                }
                window.resetGame();
            }
        },

        // Update the relation between the screen and the canvas.
        onresize: function() {
            window.resize();
            // Canvas different size from the screen (often bigger).
            canvasUtil.canvasRatio = {
                x: window.mc.width / window.ww,
                y: window.mc.height / window.hh
            };
        },
        // Handles the text color of the bot preferences
        // enabled = green
        // disabled = red
        handleTextColor: function(enabled) {
            return '<span style=\"color:' +
                (enabled ? 'green;\">enabled' : 'red;\">disabled') + '</span>';
        }
    };
})();

// Main
(function() {
    window.play_btn.btnf.addEventListener('click', userInterface.playButtonClickListener);
    document.onkeydown = userInterface.onkeydown;
    window.onmousedown = userInterface.onmousedown;
    window.addEventListener('mouseup', userInterface.onmouseup);
    window.onresize = userInterface.onresize;

    // Hide top score
    userInterface.hideTop();

    // Overlays
    userInterface.initOverlays();

    // Load preferences
    userInterface.loadPreference('logDebugging', false);
    userInterface.loadPreference('visualDebugging', false);
    userInterface.loadPreference('autoRespawn', false);
    userInterface.loadPreference('mobileRender', false);
    userInterface.loadPreference('leaderboard', true);
    window.nick.value = userInterface.loadPreference('savedNick', 'Slither.io-bot');

    // Don't load saved options or apply custom options if
    // the user wants to use default options
    if (typeof(customBotOptions.useDefaults) !== 'undefined'
       && customBotOptions.useDefaults === true) {
        window.log('Ignoring saved / customised options per user request');
    } else {
        // Load saved options, if any
        var savedOptions = userInterface.loadPreference('options', null);
        if (savedOptions !== null) { // If there were saved options
            // Parse the options and overwrite the default bot options
            savedOptions = JSON.parse(savedOptions);
            if (Object.keys(savedOptions).length !== 0
                && savedOptions.constructor === Object) {
                Object.keys(savedOptions).forEach(function(key) {
                    window.bot.opt[key] = savedOptions[key];
                });
            }
            window.log('Found saved settings, overwriting default bot options');
        } else {
            window.log('No saved settings, using default bot options');
        }

        // Has the user customised the options?
        if (Object.keys(customBotOptions).length !== 0
            && customBotOptions.constructor === Object) {
            Object.keys(customBotOptions).forEach(function(key) {
                window.bot.opt[key] = customBotOptions[key];
            });
            window.log('Custom settings found, overwriting current bot options');
        }
    }

    // Save the bot options
    userInterface.savePreference('options', JSON.stringify(window.bot.opt));
    window.log('Saving current bot options');

    // Listener for mouse wheel scroll - used for setZoom function
    document.body.addEventListener('mousewheel', canvasUtil.setZoom);
    document.body.addEventListener('DOMMouseScroll', canvasUtil.setZoom);

    // Set render mode
    if (window.mobileRender) {
        userInterface.toggleMobileRendering(true);
    } else {
        userInterface.toggleMobileRendering(false);
    }
    // Remove laggy logo animation
    userInterface.removeLogo();
    // Unblocks all skins without the need for FB sharing.
    window.localStorage.setItem('edttsg', '1');

    // Remove social
    window.social.remove();

    // Maintain fps
    setInterval(userInterface.framesPerSecond.fpsTimer, 80);

    // Start!
    userInterface.oefTimer();
})();
