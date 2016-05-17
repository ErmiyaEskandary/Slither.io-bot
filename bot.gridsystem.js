// ==UserScript==
// @name         Slither.io-bot
// @namespace    http://slither.io/
// @version      0.9.3
// @description  Slither.io bot
// @author       Ermiya Eskandary & Théophile Cailliau
// @match        http://slither.io/
// @grant        none
// ==/UserScript==

/**
 *  Grid Node
 *  Types:
 *  0 = empty
 *  1 = snake
 *  2 = food
 */
var TYPE_EMPTY = 0;
var TYPE_SNAKE = 1;
var TYPE_FOOD = 2;

function GridNode(x, y, weight, type) {
    this.x = x;
    this.y = y;
    this.weight = weight;
    this.f = 0;
    this.g = 0;
    this.h = 0;
    this.visited = false;
    this.closed = false;
    this.parent = null;
    this.type = type || 0;
    this.items = [];
}

GridNode.prototype.toString = function() {
    return "[" + this.x + " " + this.y + "]";
};

GridNode.prototype.getCost = function(fromNeighbor) {
    // Take diagonal weight into consideration.
    if (fromNeighbor && fromNeighbor.x != this.x && fromNeighbor.y != this.y) {
        return this.weight * 1.41421;
    }
    return this.weight;
};

GridNode.prototype.isWall = function() {
    return this.weight === 0;
};
// javascript-astar 0.4.1
// http://github.com/bgrins/javascript-astar
// Freely distributable under the MIT License.
// Implements the astar search algorithm in javascript using a Binary Heap.
// Includes Binary Heap (with modifications) from Marijn Haverbeke.
// http://eloquentjavascript.net/appendix2.html
(function(definition) {
  /* global module, define */
  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = definition();
  } else if (typeof define === 'function' && define.amd) {
    define([], definition);
  } else {
    var exports = definition();
    window.astar = exports.astar;
  }
})(function() {

function pathTo(node) {
  var curr = node;
  var path = [];
  while (curr.parent) {
    path.unshift(curr);


    curr = curr.parent;
  }
  return path;
}

function getHeap() {
  return new BinaryHeap(function(node) {
    return node.f;
  });
}

var astar = {
  /**
  * Perform an A* Search on a graph given a start and end node.
  * @param {Graph} graph
  * @param {GridNode} start
  * @param {GridNode} end
  * @param {Object} [options]
  * @param {bool} [options.closest] Specifies whether to return the
             path to the closest node if the target is unreachable.
  * @param {Function} [options.heuristic] Heuristic function (see
  *          astar.heuristics).
  */
  search: function(start, end, options) {

    options = options || {};
    var heuristic = options.heuristic || astar.heuristics.manhattan;
    var closest = options.closest || false;

    var openHeap = getHeap();
    var closestNode = start; // set the start node to be the closest if required

    start.h = heuristic(start, end);
    var maxtries = 1000;
    var trynum = 0;

    openHeap.push(start);

    while (openHeap.size() > 0) {
        if( ++trynum > maxtries ) {
            return [];
        }
      // Grab the lowest f(x) to process next.  Heap keeps this sorted for us.
      var currentNode = openHeap.pop();

      // End case -- result has been found, return the traced path.
      if (currentNode.x == end.x && currentNode.y == end.y) {
        return pathTo(currentNode);
      }

      // Normal case -- move currentNode from open to closed, process each of its neighbors.
      currentNode.closed = true;

      // Find all neighbors for the current node.
      var neighbors = collisionGrid.neighbors(currentNode.x, currentNode.y);

      for (var i = 0, il = neighbors.length; i < il; ++i) {
        var neighbor = neighbors[i];

        if (neighbor.closed || neighbor.type == TYPE_SNAKE) {
          // Not a valid node to process, skip to next neighbor.
          continue;
        }

        // The g score is the shortest distance from start to current node.
        // We need to check if the path we have arrived at this neighbor is the shortest one we have seen yet.
        var gScore = currentNode.g + neighbor.weight;//getCost(currentNode);
        var beenVisited = neighbor.visited;
        if( beenVisited ) {
            //console.log('visited ('+neighbor.x+','+neighbor.y+')');
        }
        if (!beenVisited || gScore < neighbor.g) {

          // Found an optimal (so far) path to this node.  Take score for node to see how good it is.
          neighbor.visited = true;
          neighbor.parent = currentNode;
          neighbor.h = neighbor.h || heuristic(neighbor, end);
          neighbor.g = gScore;
          neighbor.f = neighbor.g + neighbor.h;

          if (closest) {
            // If the neighbour is closer than the current closestNode or if it's equally close but has
            // a cheaper path than the current closest node then it becomes the closest node
            if (neighbor.h < closestNode.h || (neighbor.h === closestNode.h && neighbor.g < closestNode.g)) {
              closestNode = neighbor;
            }
          }

          if (!beenVisited) {
            // Pushing to heap will put it in proper place based on the 'f' value.
            openHeap.push(neighbor);
          } else {
            // Already seen the node, but since it has been rescored we need to reorder it in the heap
            openHeap.rescoreElement(neighbor);
          }
        }
      }
    }

    if (closest) {
      return pathTo(closestNode);
    }

    // No result was found - empty array signifies failure to find path.
    return [];
  },
  // See list of heuristics: http://theory.stanford.edu/~amitp/GameProgramming/Heuristics.html
  heuristics: {
    manhattan: function(pos0, pos1) {
      var d1 = Math.abs(pos1.x - pos0.x);
      var d2 = Math.abs(pos1.y - pos0.y);
      return d1 + d2;
    },
    diagonal: function(pos0, pos1) {
      var D = 1;
      var D2 = 1.41421; // 1.41421 == Math.sqrt(2)
      var d1 = Math.abs(pos1.x - pos0.x);
      var d2 = Math.abs(pos1.y - pos0.y);
      return (D * (d1 + d2)) + ((D2 - (2 * D)) * Math.min(d1, d2));
    },
    chebyshev: function(pos0, pos1) {
        var d1 = Math.abs(pos1.x - pos0.x);
        var d2 = Math.abs(pos1.y - pos0.y);
        return Math.max(d1,d2);
    }
  },
  cleanNode: function(node) {
    node.f = 0;
    node.g = 0;
    node.h = 0;
    node.visited = false;
    node.closed = false;
    node.parent = null;
  }
};


function BinaryHeap(scoreFunction) {
  this.content = [];
  this.scoreFunction = scoreFunction;
}

BinaryHeap.prototype = {
  push: function(element) {
    // Add the new element to the end of the array.
    this.content.push(element);

    // Allow it to sink down.
    this.sinkDown(this.content.length - 1);
  },
  pop: function() {
    // Store the first element so we can return it later.
    var result = this.content[0];
    // Get the element at the end of the array.
    var end = this.content.pop();
    // If there are any elements left, put the end element at the
    // start, and let it bubble up.
    if (this.content.length > 0) {
      this.content[0] = end;
      this.bubbleUp(0);
    }
    return result;
  },
  remove: function(node) {
    var i = this.content.indexOf(node);

    // When it is found, the process seen in 'pop' is repeated
    // to fill up the hole.
    var end = this.content.pop();

    if (i !== this.content.length - 1) {
      this.content[i] = end;

      if (this.scoreFunction(end) < this.scoreFunction(node)) {
        this.sinkDown(i);
      } else {
        this.bubbleUp(i);
      }
    }
  },
  size: function() {
    return this.content.length;
  },
  rescoreElement: function(node) {
    this.sinkDown(this.content.indexOf(node));
  },
  sinkDown: function(n) {
    // Fetch the element that has to be sunk.
    var element = this.content[n];

    // When at 0, an element can not sink any further.
    while (n > 0) {

      // Compute the parent element's index, and fetch it.
      var parentN = ((n + 1) >> 1) - 1;
      var parent = this.content[parentN];
      // Swap the elements if the parent is greater.
      if (this.scoreFunction(element) < this.scoreFunction(parent)) {
        this.content[parentN] = element;
        this.content[n] = parent;
        // Update 'n' to continue at the new position.
        n = parentN;
      }
      // Found a parent that is less, no need to sink any further.
      else {
        break;
      }
    }
  },
  bubbleUp: function(n) {
    // Look up the target element and its score.
    var length = this.content.length;
    var element = this.content[n];
    var elemScore = this.scoreFunction(element);

    while (true) {
      // Compute the indices of the child elements.
      var child2N = (n + 1) << 1;
      var child1N = child2N - 1;
      // This is used to store the new position of the element, if any.
      var swap = null;
      var child1Score;
      // If the first child exists (is inside the array)...
      if (child1N < length) {
        // Look it up and compute its score.
        var child1 = this.content[child1N];
        child1Score = this.scoreFunction(child1);

        // If the score is less than our element's, we need to swap.
        if (child1Score < elemScore) {
          swap = child1N;
        }
      }

      // Do the same checks for the other child.
      if (child2N < length) {
        var child2 = this.content[child2N];
        var child2Score = this.scoreFunction(child2);
        if (child2Score < (swap === null ? elemScore : child1Score)) {
          swap = child2N;
        }
      }

      // If the element needs to be moved, swap it, and continue.
      if (swap !== null) {
        this.content[n] = this.content[swap];
        this.content[swap] = element;
        n = swap;
      }
      // Otherwise, we are done.
      else {
        break;
      }
    }
  }
};

return {
  astar: astar
};

});


var collisionHelper = (function() {
    return {
        unitTable: [],
        toRad: Math.PI / 180,
        toDeg: 180 / Math.PI,

        init: function() {
            collisionHelper.generateUnitTable();

        },

        /**
         *  Build the unit table grouping opposite angles and in 22.5 degree increments
         *
         */
        generateUnitTable: function() {
            var offset = 0;
            for(var a=0;a<360; a++) {
                var angle = collisionHelper.toRad * offset;
                collisionHelper.unitTable.push([Math.cos(angle), Math.sin(angle)]);
                offset++;
            }
        },

        /**
         * Performs line scans in the E,N,W,S directions and rotates by 22.5 degrees * rotateCount
         *
         */
        radarScan: function(angleIncrement,scanDist) {

            var results = [];
            var collisions = [];
            var open = [];
            var curpos = window.getPos();
            for(var dir=0; dir<collisionHelper.unitTable.length; dir+=angleIncrement) {
                var pos = collisionHelper.unitTable[dir];
                var x2 = curpos.x+pos[0]*scanDist;
                var y2 = curpos.y+pos[1]*scanDist;

                var result = collisionGrid.lineTest(curpos.x,curpos.y,x2,y2,TYPE_SNAKE);
                if( result )
                    results.push(result);

                if( result.cell ) {
                    var linePos = collisionGrid.getCellByColRow(result.col, result.row);
                    var dist = canvas.getDistance2(curpos.x, curpos.y, linePos.x, linePos.y);
                    collisions.push({dist:dist, line:result});
                }
                else
                    open.push(result);

                if( window.visualDebugging ) {

                    var canvasPosA = canvas.mapToCanvas({
                        x: curpos.x,
                        y: curpos.y,
                        radius: 1
                    });
                    var canvasPosB = canvas.mapToCanvas({
                        x: x2,
                        y: y2,
                        radius: 1
                    });

                    var color = (!result.cell||result.cell.type==TYPE_EMPTY) ? 'green' : ((result.cell.type==TYPE_FOOD) ? 'blue' : 'red');
                    if( color != 'green')
                    canvas.drawLine2(canvasPosA.x, canvasPosA.y, canvasPosB.x, canvasPosB.y, 1, color);
                }
            }

            if( collisions.length )
                collisions.sort(function(a,b) {
                    return a.dist - b.dist;
                });

            var pct = 0.0;
            if( results.length )
                pct = open.length / results.length;

            return {pct:pct, open:open, collisions:collisions, results:results};
        },

        checkLineIntersection: function(line1StartX, line1StartY, line1EndX, line1EndY, line2StartX, line2StartY, line2EndX, line2EndY) {
            // if the lines intersect, the result contains the x and y of the intersection (treating the lines as infinite) and booleans for whether line segment 1 or line segment 2 contain the point
            var denominator;
            var a;
            var b;
            var numerator1;
            var numerator2;
            var result = {
                    x: null,
                    y: null,
                    onLine1: false,
                    onLine2: false
                };
            denominator = ((line2EndY - line2StartY) * (line1EndX - line1StartX)) - ((line2EndX - line2StartX) * (line1EndY - line1StartY));
            if (denominator == 0) {
                return result;
            }
            a = line1StartY - line2StartY;
            b = line1StartX - line2StartX;
            numerator1 = ((line2EndX - line2StartX) * a) - ((line2EndY - line2StartY) * b);
            numerator2 = ((line1EndX - line1StartX) * a) - ((line1EndY - line1StartY) * b);
            a = numerator1 / denominator;
            b = numerator2 / denominator;

            // if we cast these lines infinitely in both directions, they intersect here:
            result.x = line1StartX + (a * (line1EndX - line1StartX));
            result.y = line1StartY + (a * (line1EndY - line1StartY));
            /*
            // it is worth noting that this should be the same as:
            x = line2StartX + (b * (line2EndX - line2StartX));
            y = line2StartX + (b * (line2EndY - line2StartY));
            */
            // if line1 is a segment and line2 is infinite, they intersect if:
            if (a > 0 && a < 1) {
                result.onLine1 = true;
            }
            // if line2 is a segment and line1 is infinite, they intersect if:
            if (b > 0 && b < 1) {
                result.onLine2 = true;
            }
            // if line1 and line2 are segments, they intersect if both of the above are true
            return result;
        }
    };
})();
/**
 * A 2d collision grid system for fast line to box collision
 *
 * - Flagged cells are occupied by object(s)
 * - Non-flagged cells are empty
 * - Cells are world space cut up into squares of X size
 */
var collisionGrid = (function() {
    collisionHelper.init();

    return {
        width: 0,
        height: 0,

        //clone for fast slicing
        grid: [],
        bgrid: [],
        cellSize: 20,
        halfCellSize: 10,
        startX: 0,
        startY: 0,
        gridWidth: 0,
        gridHeight: 0,
        endX: 0,
        endY: 0,
        astarGraph: 0,
        astarResult: 0,
        foodGroups: [],
        snakeAggressors: [],

        initGrid: function(w, h, cellsz) {
            sx = Math.floor(window.getX());
            sy = Math.floor(window.getY());
            sx = sx - (sx % cellsz);
            sy = sy - (sy % cellsz);

            collisionGrid.height = h * cellsz;
            collisionGrid.width = w * cellsz;
            collisionGrid.gridWidth = w;
            collisionGrid.gridHeight = h;
            collisionGrid.cellSize = cellsz;
            collisionGrid.halfCellSize = cellsz / 2;

            collisionGrid.startX = Math.floor(sx - ((w/2)*cellsz));
            collisionGrid.startY = Math.floor(sy - ((h/2)*cellsz));
            //collisionGrid.startX = collisionGrid.startX - (collisionGrid.startX % cellsz);
            //collisionGrid.startY = collisionGrid.startY - (collisionGrid.startY % cellsz);

            collisionGrid.endX = collisionGrid.startX + collisionGrid.width;
            collisionGrid.endY = collisionGrid.startY + collisionGrid.height;


            collisionGrid.booleanGrid = [];
            collisionGrid.grid = [];
            collisionGrid.foodGroups = [];
            collisionGrid.snakeAggressors = [];
            collisionGrid.addSnakes();
            collisionGrid.addFood();
        },

        setupGrid: function() {

        },

        // Slice out a portion of the grid for less calculations
        // callback = function(x, y, gridValue) {}
        sliceGrid: function(col, row, width, height, callback) {
            //constrain the values between 0 and width/height
            col = Math.min(Math.max(col, 0), collisionGrid.gridWidth);
            row = Math.min(Math.max(row, 0), collisionGrid.gridHeight);
            width = col + Math.min(collisionGrid.gridWidth, Math.max(width, 0));
            height = row + Math.min(collisionGrid.gridHeight, Math.max(height, 0));

            for(var x=col; x<width; x++) {
                for(var y=row; y<height; y++) {
                    collisionGrid.grid[x] = collisionGrid.grid[x] || [];
                    collisionGrid.grid[x][y] = collisionGrid.grid[x][y] || 0;
                    callback(x, y, collisionGrid.grid[x][y]);
                }
            }
        },

        // Find specific cell using map-space position
        getCellByXY: function(x, y) {
            //x = x;
           // y = y ;
            x = x - collisionGrid.startX;
            y = y - collisionGrid.startY;
            //x = x - (x % collisionGrid.cellSize);
           // y = y - (y % collisionGrid.cellSize);

            col = parseInt(Math.floor(x / collisionGrid.cellSize));
            row = parseInt(Math.floor(y / collisionGrid.cellSize));
            col = Math.min(Math.max(col, 0), collisionGrid.gridWidth);
            row = Math.min(Math.max(row, 0), collisionGrid.gridHeight);
            collisionGrid.grid[col] = collisionGrid.grid[col] || [];
            collisionGrid.grid[col][row] = collisionGrid.grid[col][row] || 0;
            return {col:col, row:row, cell:collisionGrid.grid[col][row]};
        },

        // Get cell's map-space position at top left corner of cell
        getCellByColRow: function(col, row) {
            var x = collisionGrid.startX + (col*collisionGrid.cellSize) + collisionGrid.halfCellSize;
            var y = collisionGrid.startY + (row*collisionGrid.cellSize) + collisionGrid.halfCellSize;
            collisionGrid.grid[col] = collisionGrid.grid[col] || [];
            collisionGrid.grid[col][row] = collisionGrid.grid[col][row] || 0;
            return {x:x, y:y, cell:collisionGrid.grid[col][row]};
        },

        // This is used to convert a width or height to the amount of cells it would occupy
        calculateMaxCellCount: function(sz) {
            return parseInt(Math.floor(sz / collisionGrid.cellSize));
        },

        // set cell size
        setCellSize: function(sz) {
            collisionGrid.cellSize = sz;
        },

        getCell: function(col,row) {
            collisionGrid.grid[col] = collisionGrid.grid[col] || [];
            collisionGrid.grid[col][row] = collisionGrid.grid[col][row] || 0;
            return collisionGrid.grid[col][row];
        },

        cellTest: function(col, row, type) {
            cell = collisionGrid.getCell(col, row);  // first point
            if( cell && cell.type == type)
                return cell;
            if( !cell && type==TYPE_EMPTY)
                return collisionGrid.markCellEmpty(col,row);
            return false;
        },

        markCell: function(col, row, weight, type) {
            collisionGrid.grid[col] = collisionGrid.grid[col] || [];
            var node = collisionGrid.grid[col][row];
            if( !node || (type==TYPE_SNAKE && node.type!=TYPE_SNAKE)) {
                node = new GridNode(col, row, weight, type);
            }
            collisionGrid.grid[col][row] = node;
            return node;
        },

        markCellWall: function(col, row, obj) {
            var node = collisionGrid.markCell(col, row, 0, TYPE_SNAKE);
            node.items.push(obj);
            return node;
        },

        markCellEmpty: function(col, row, weight) {
            weight = weight || 1000;
            var node = collisionGrid.markCell(col, row, weight, TYPE_EMPTY);
            //node.items.push(obj);
            return node;
        },

        markCellFood: function(col, row, food) {
            var node = collisionGrid.markCell(col, row, -(food.sz*food.sz), TYPE_FOOD);
            node.items.push(food);
            return node;
        },

        isWall: function(col, row) {
            return collisionGrid.grid[col] && collisionGrid.grid[col][row] && collisionGrid.grid[col][row].type == TYPE_SNAKE;
        },

        isEmpty: function(col, row) {
            return collisionGrid.grid[col] && !collisionGrid.grid[col][row];
        },

        drawCell: function(col, row, color) {

            if( !window.visualDebugging )
                return;

            color = color || 'rgba(255,255,0,0.25)';
            var pos = collisionGrid.getCellByColRow(col, row);
            var canvasPos = canvas.mapToCanvas({
                x: pos.x-collisionGrid.halfCellSize,
                y: pos.y-collisionGrid.halfCellSize
            });

            canvas.drawRect(
                canvasPos.x,
                canvasPos.y,
                collisionGrid.cellSize * canvas.getScale(),
                collisionGrid.cellSize * canvas.getScale(),
                color);
        },

        addNeighbor: function(x, y, arr) {
            collisionGrid.grid[x] = collisionGrid.grid[x] || [];

            var node = collisionGrid.grid[x][y] || collisionGrid.markCellEmpty(x,y);;
            if( node.type == TYPE_SNAKE ) {
                return;
            }
            //if( !collisionGrid.grid[x][y] )


            arr.push(collisionGrid.grid[x][y]);
        },

        neighbors: function(x, y) {
            var ret = [];
            // West
            collisionGrid.addNeighbor(x-1, y, ret);
            //East
            collisionGrid.addNeighbor(x+1, y, ret);
            //South
            collisionGrid.addNeighbor(x, y-1, ret);
            //North
            collisionGrid.addNeighbor(x, y+1, ret);

            //if (this.diagonal) {
            // Southwest
            collisionGrid.addNeighbor(x-1, y-1, ret);
            // Southeast
            collisionGrid.addNeighbor(x+1, y-1, ret);
            // Northwest
            collisionGrid.addNeighbor(x-1, y+1, ret);
            // Northeast
            collisionGrid.addNeighbor(x+1, y+1, ret);
            //}

            return ret;
        },

        generatePath: function(startX, startY, endX, endY) {
            var startCell = collisionGrid.getCellByXY(startX,startY);
            var endCell = collisionGrid.getCellByXY(endX,endY);
            var start = collisionGrid.getCell(startCell.col, startCell.row) ||
                collisionGrid.markCellEmpty(startCell.col, startCell.row);
            var end = collisionGrid.getCell(endCell.col, endCell.row) ||
                collisionGrid.markCellEmpty(endCell.col, endCell.row);

            var path = astar.search(start, end);

            return path;
        },

        addFood: function() {

            collisionGrid.foodGroups = [];
            var foodGroupIDs = {};

            var curpos = window.getPos();
            var center = collisionGrid.getCellByXY(curpos.x,curpos.y);

            var foodGridSize = 10;
            var foodCellSize = 100;
            var foodCellSizeHalf = foodCellSize / 2;
            curpos.x = parseInt(Math.floor(curpos.x));
            curpos.y = parseInt(Math.floor(curpos.y));
            curpos.x = curpos.x - (curpos.x % foodCellSize);
            curpos.y = curpos.y - (curpos.y % foodCellSize);
            var startX = Math.floor(curpos.x - ((foodGridSize/2)*foodCellSize));
            var startY = Math.floor(curpos.y - ((foodGridSize/2)*foodCellSize));
            var endX = startX + foodGridSize * foodCellSize;
            var endY = startY + foodGridSize * foodCellSize;

            var foodGroupList = [];

            for(var i=0; i<window.foods.length; i++) {

                var food = window.foods[i];
                if( food === null || food === undefined || food.eaten )
                    continue;

                if( food.xx < startX ||
                    food.xx > endX ||
                    food.yy < startY ||
                    food.yy > endY )
                    continue;

                var x = food.xx - startX;
                var y = food.yy - startY;
                var col = parseInt(Math.floor(x / foodCellSize));
                var row = parseInt(Math.floor(y / foodCellSize));
                col = Math.min(Math.max(col, 0), foodGridSize);
                row = Math.min(Math.max(row, 0), foodGridSize);

                var cell = collisionGrid.getCellByXY(food.xx, food.yy);
                var node = collisionGrid.markCellFood(cell.col, cell.row, food);
                if( node ) {
                    //var distance = astar.heuristics.diagonal({x:center.col,y:center.row},{x:cell.col, y:cell.row});//canvas.getDistance(food.xx, food.yy, curpos.x, curpos.y);
                    //distance = (distance + Math.abs(distance)) / 2;
                    var distance2 = canvas.getDistance2(food.xx, food.yy, curpos.x, curpos.y);
                    food.distance2 = distance2;
                    var id = col+','+row;
                    var groupid = foodGroupIDs[id] || 0;
                    if( !groupid )
                        groupid = collisionGrid.foodGroups.length;

                    var group = collisionGrid.foodGroups[groupid] || 0;
                    if( !group )
                        group = {sumx:0, sumy:0, nodes:[], col:0, row:0, score:0, maxfood:0, distance2:-1};

                    group.nodes.push({x:food.xx, y:food.yy, distance2:distance2, node:node})
                    group.sumx += food.xx;
                    group.sumy += food.yy;
                    group.score += parseInt(food.sz);
                    group.maxfood = food
                    group.col = col;
                    group.row = row;
                    if( !group.maxfood || food.sz > group.maxfood.sz ) {
                        group.maxfood = food.sz;
                    }
                    if( group.distance2 == -1 || distance2 > group.distance2 )
                        group.distance2 = distance2;
                    collisionGrid.foodGroups[groupid] = group;
                    foodGroupIDs[id] = groupid;
                }

            }
            /*
            if( window.visualDebugging ) {
                for( var i=0; i<collisionGrid.foodGroups.length; i++) {
                    var foodgroup = collisionGrid.foodGroups[i];
                    var foodcnt = foodgroup.nodes.length;
                    foodPos = {x: foodgroup.sumx / foodcnt, y:foodgroup.sumy / foodcnt};

                    var mapPos = {x: startX + (foodgroup.col*foodCellSize), y: startY + (foodgroup.row*foodCellSize)};
                    var canvasPos = canvas.mapToCanvas(mapPos);
                    canvas.drawRect(
                        canvasPos.x,
                        canvasPos.y,
                        foodCellSize * canvas.getScale(),
                        foodCellSize * canvas.getScale(),
                        'rgba(0,255,0,0.25)');

                    canvas.drawText(canvasPos, 'white', "("+foodgroup.col+","+foodgroup.row+")"+foodgroup.score);
                    //console.log("FoodGroup("+foodgroup.col+","+foodgroup.row+") = " + collisionGrid.foodGroups[groupid].score);
                }
            }
            */
            collisionGrid.foodGroups.sort(function(a,b) {
                //return b.score - a.score;
                return (a.score == b.score ? 0 : (a.score / a.distance) > (b.score / b.distance)  ? -1 : 1);
            });


        },

        // add all snake's collision parts to the grid
        addSnakes: function() {
            var myX = window.getX();
            var myY = window.getY();

            var lastAlive = 0;
            var deadCount = 0;
            var maxDeadCount = 2;
            for (var snakeid in window.snakes) {
                var snk = window.snakes[snakeid];
                if (snk.id == window.snake.id)
                    continue;
                var cnt = 0;

                snk.closest = 0;

                var relPos = {x:(myX-snk.xx), y:(myY-snk.yy)}
                var snakeDist = canvas.getDistance2(myX, myY, snk.xx, snk.yy);
                var rang = snk.ang * collisionHelper.toRad;
                collisionGrid.snakeAggressors.push({
                    snk:snk,
                    distance2:snakeDist,
                    relativePos:relPos,
                    heading:{x:Math.cos(rang),y:Math.sin(rang)}
                });

                if( snk.xx > collisionGrid.startX && snk.xx < collisionGrid.endX &&
                    snk.yy > collisionGrid.startY && snk.yy < collisionGrid.endY)
                    collisionGrid.snakePartBounds(snk,snk,2);

                for (var pts=snk.pts.length-1; pts>=0; pts--) {// in snk.pts) {
                    var part = snk.pts[pts];

                    if (part.dying) {
                        if( deadCount++ > maxDeadCount )
                            continue;
                    }


                    lastAlive = pts;
                    //only add parts that are within our grid bounds
                    if( part.xx < collisionGrid.startX || part.xx > collisionGrid.endX ||
                        part.yy < collisionGrid.startY || part.yy > collisionGrid.endY)
                        continue;


                    //canvas.drawText(canvas.mapToCanvas({x:part.xx, y:part.yy}), 'red', ''+pts);
                    collisionGrid.snakePartBounds(snk,part);
                }

                if( window.visualDebugging && snk.closest) {
                    canvas.drawCircle(canvas.circleMapToCanvas({x:snk.closest.xx, y:snk.closest.yy, radius:window.getSnakeWidth(snk.sc)}), 'orange', false);
                    canvas.drawCircle(canvas.circleMapToCanvas({x:snk.xx, y:snk.yy, radius:window.getSnakeWidth(snk.sc)}), 'red', false);
                }

            }


            collisionGrid.snakeAggressors.sort(function(a,b) {
                return a.distance2 - b.distance2;
            });
        },

        findClosestPart: function(snk, part) {
            var curpos = window.getPos();
            var dist2 = canvas.getDistance2(curpos.x, curpos.y, part.xx, part.yy);
            part.distance2 = dist2 - (window.getSnakeWidthSqr() + window.getSnakeWidthSqr(snk));
            if( snk.closest == 0 ) {
                snk.closest = part;
                return;
            }
            if( dist2 < snk.closest.distance2 ) {
                snk.closest = part;
            }
        },

        snakePartBounds: function(snk, part, sizemultiplier) {
            sizemultiplier = sizemultiplier || 1;

            collisionGrid.findClosestPart(snk,part);

            //calculate grid width/height of a snake part
            var cell = collisionGrid.getCellByXY(part.xx, part.yy);
            var radius = window.getSnakeWidth(snk.sc);
            radius = Math.max(radius, 20) *sizemultiplier;

            var threat1 = radius;
            var threat2 = radius * 1.5;
            var threat3 = radius * 2;
            var threat4 = radius * 3;
            var maxthreat = radius * 5;

            var t1cellcount = collisionGrid.calculateMaxCellCount(threat1);
            var t2cellcount = collisionGrid.calculateMaxCellCount(threat2);
            var t3cellcount = collisionGrid.calculateMaxCellCount(threat3);
            var t4cellcount = collisionGrid.calculateMaxCellCount(threat4);
            var maxcellcount = collisionGrid.calculateMaxCellCount(maxthreat);
            var maxcellcount2 = maxcellcount*2;
            //if( snk.sp > 7 && sizemultiplier >)
            //    radius = radius * 2;
            //var radiusSqr = radius*radius;
            //var cellcount = collisionGrid.calculateMaxCellCount(radius);
            //var cellcount2 = cellcount*3;


            //mark cell where part's center is located
            collisionGrid.markCellWall(cell.col, cell.row, {snake:snk, part:part});
            //canvas.drawCircle(canvas.mapToCanvas({x:part.xx, y:part.yy}), 'red', true);

            //mark surrounding cells using part's radius
            collisionGrid.sliceGrid(cell.col-maxcellcount, cell.row-maxcellcount, maxcellcount2, maxcellcount2,
                function(col, row, val) {
                    if( val && val.type != TYPE_SNAKE && val.type != TYPE_EMPTY ) return;//&& val.type!=TYPE_SNAKE ) return;
                    if( col >= (cell.col-t1cellcount) && col <= (cell.col+t1cellcount*2) &&
                        row >= (cell.row-t1cellcount) && row <= (cell.row+t1cellcount*2) ) {
                        var marked = collisionGrid.markCellWall(col, row, {snake:snk, part:part});
                    }
                    else if( col >= (cell.col-t2cellcount) && col <= (cell.col+t2cellcount*2) &&
                        row >= (cell.row-t2cellcount) && row <= (cell.row+t2cellcount*2) ) {
                        collisionGrid.markCellEmpty(col,row,5000)
                    }
                    else if( col >= (cell.col-t3cellcount) && col <= (cell.col+t3cellcount*2) &&
                        row >= (cell.row-t3cellcount)&& row <= (cell.row+t3cellcount*2) ) {
                        collisionGrid.markCellEmpty(col,row,3000)
                    }
                    else if( col >= (cell.col-t4cellcount) && col <= (cell.col+t4cellcount*2) &&
                        row >= (cell.row-t4cellcount)&& row <= (cell.row+t4cellcount*2) ) {
                        collisionGrid.markCellEmpty(col,row,2000)
                    }
                    else {
                        collisionGrid.markCellEmpty(col,row,1500)
                    }


                    //}
                    //else {
                    //    var marked = collisionGrid.markCellEmpty(col,row);
                    //    marked.weight = 10000;
                    //}
                }
            );
        },




        lineTestResult: 0,
        lineTypeCheck: function(col, row, type) {
            var cell = collisionGrid.cellTest(col, row, type);
            if( cell !== false )
                collisionGrid.lineTestResult = {col:col, row:row, cell:cell};
            return collisionGrid.lineTestResult;
        },
        lineTest: function(x1, y1, x2, y2, type) {
            collisionGrid.lineTestResult = 0;
            var posA = collisionGrid.getCellByXY(x1, y1);
            var posB = collisionGrid.getCellByXY(x2, y2);
            x1 = posA.col, x2 = posB.col;
            y1 = posA.row, y2 = posB.row;
            var i;               // loop counter
            var cell;
            var ystep, xstep;    // the step on y and x axis
            var error;           // the error accumulated during the increment
            var errorprev;       // *vision the previous value of the error variable
            var y = y1, x = x1;  // the line points
            var ddy, ddx;        // compulsory variables: the double values of dy and dx
            var dx = x2 - x1;
            var dy = y2 - y1;

            if( collisionGrid.lineTypeCheck(x1, y1, type) ) return collisionGrid.lineTestResult;

            // NB the last point can't be here, because of its previous point (which has to be verified)
            if (dy < 0) {
                ystep = -1;
                dy = -dy;
            }
            else
                ystep = 1;

            if (dx < 0) {
                xstep = -1;
                dx = -dx;
            }
            else
                xstep = 1;

            ddy = 2 * dy;  // work with double values for full precision
            ddx = 2 * dx;
            if (ddx >= ddy) {  // first octant (0 <= slope <= 1)
                // compulsory initialization (even for errorprev, needed when dx==dy)
                errorprev = error = dx;  // start in the middle of the square
                for (i=0 ; i < dx ; i++) {  // do not use the first point (already done)
                    x += xstep;
                    error += ddy;
                    if (error > ddx) {  // increment y if AFTER the middle ( > )
                        y += ystep;
                        error -= ddx;
                        // three cases (octant == right->right-top for directions below):
                        if (error + errorprev < ddx) {  // bottom square also
                            //POINT (y-ystep, x);
                            if( collisionGrid.lineTypeCheck(x, y-ystep,type) ) return collisionGrid.lineTestResult;
                            //if( (cell = collisionGrid.cellTest(x, y-ystep)) !== false ) return {x:x, y:y-ystep, cell:cell};
                        }
                        else if (error + errorprev > ddx) { // left square also
                            //POINT (y, x-xstep);
                            if( collisionGrid.lineTypeCheck(x-xstep, y,type) ) return collisionGrid.lineTestResult;
                            //if( (cell = collisionGrid.cellTest(x-xstep, y)) !== false ) return {x:x-xstep, y:y, cell:cell};

                        }
                        else {  // corner: bottom and left squares also
                            if( collisionGrid.lineTypeCheck(x, y-ystep,type) ) return collisionGrid.lineTestResult;
                            if( collisionGrid.lineTypeCheck(x-xstep, y,type) ) return collisionGrid.lineTestResult;

                            //if( (cell = collisionGrid.cellTest(x, y-ystep)) !== false ) return {x:x, y:y-ystep, cell:cell};
                            //if( (cell = collisionGrid.cellTest(x-xstep, y)) !== false ) return {x:x-xstep, y:y, cell:cell};
                            //POINT (y-ystep, x);
                            //POINT (y, x-xstep);
                        }
                    }
                    //POINT (y, x);
                    if( (cell = collisionGrid.cellTest(x, y,type)) !== false ) return {x:x, y:y, cell:cell};
                    errorprev = error;
                }
            }
            else {  // the same as above
                errorprev = error = dy;
                for (i=0 ; i < dy ; i++) {
                    y += ystep;
                    error += ddx;
                    if (error > ddy) {
                        x += xstep;
                        error -= ddy;
                        if (error + errorprev < ddy) {
                            //POINT (y, x-xstep);
                            if( collisionGrid.lineTypeCheck(x-xstep, y,type) ) return collisionGrid.lineTestResult;
                            //if( (cell = collisionGrid.cellTest(x-xstep, y)) !== false ) return {x:x-xstep, y:y, cell:cell};
                        }
                        else if (error + errorprev > ddy) {
                            //POINT (y-ystep, x);
                            if( collisionGrid.lineTypeCheck(x, y-ystep,type) ) return collisionGrid.lineTestResult;
                            //if( (cell = collisionGrid.cellTest(x, y-ystep)) !== false ) return {x:x, y:y-ystep, cell:cell};
                        }
                        else {
                            //POINT (y, x-xstep);
                            //POINT (y-ystep, x);
                            if( collisionGrid.lineTypeCheck(x-xstep, y,type) ) return collisionGrid.lineTestResult;
                            if( collisionGrid.lineTypeCheck(x, y-ystep,type) ) return collisionGrid.lineTestResult;
                            //if( (cell = collisionGrid.cellTest(x-xstep, y)) !== false ) return {x:x-xstep, y:y, cell:cell};
                            //if( (cell = collisionGrid.cellTest(x, y-ystep)) !== false ) return {x:x, y:y-ystep, cell:cell};
                        }
                    }
                    //POINT (y, x);
                    if( collisionGrid.lineTypeCheck(x, y, type) ) return collisionGrid.lineTestResult;
                    //if( (cell = collisionGrid.cellTest(x, y)) !== false ) return {x:x, y:y, cell:cell};
                    errorprev = error;
                }
            }

            return {col:x, row:y, cell:0};
            // assert ((y == y2) && (x == x2));  // the last point (y2,x2) has to be the same with the last point of the algorithm
        }


    }
})();
