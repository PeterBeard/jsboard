/*
 * This file is part of jsBoard, the JavaScript Aircraft Boarding Simulator
 *
 * Licensed under the AGPLv3 - see the LICENSE file for details
 */

/** Constants used for rendering or setting up the simulation **/
const AIRCRAFT_WALL_HEIGHT = 15;
const AIRCRAFT_PADDING = 10;
const CELLSIZE = 64;

const SEAT_LAYOUT_PRESETS = {
    'a321': [
        {
            repeat: 5,
            layout: ' SSASS ',
        },
        {
            repeat: 3,
            layout: 'SSSASSS',
        },
        {
            repeat: 1,
            layout: 'SS+ASSS',
        },
        {
            repeat: 11,
            layout: 'SSSASSS',
        },
        {
            repeat: 1,
            layout: 'SSSA+++',
        },
        {
            repeat: 1,
            layout: '+++ASS+',
        },
        {
            repeat: 13,
            layout: 'SSSASSS',
        },
    ],
    'b757300': [
        {
            repeat: 6,
            layout: ' SSASS ',
        },
        {
            repeat: 1,
            layout: '+SSA+++',
        },
        {
            repeat: 14,
            layout: 'SSSASSS',
        },
        {
            repeat: 1,
            layout: '+SSASS+',
        },
        {
            repeat: 21,
            layout: 'SSSASSS',
        },
    ],
    'crj700': [
        {
            repeat: 3,
            layout: 'SSAS ',
        },
        {
            repeat: 15,
            layout: 'SSASS',
        },
    ],
}


/** We use a few datatypes to make the actual simulation code a little bit neater **/

/**
 * A division of a simulation grid that knows where it is, what's in it, and what its neighbors are
 */
class Cell {
    /**
     * @param{Number} x The x coordinate of this grid cell
     * @param{Number} y The y coordinate of this grid cell
     */
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.contents = new Set();
        this.up = null;
        this.down = null;
        this.left = null;
        this.right = null;
    }

    /**
     * Check to see whether or not this cell contains anything
     * @return {Boolean} true if there's nothing in the cell and false if it contains something
     */
    isEmpty() {
        return this.contents.size === 0;
    }

    /**
     * Render this cell and its contents to the given 2d canvas context
     * @param ctx a 2d canvas context
     */
    render(ctx) {
        ctx.fillStyle = 'rgba(220, 220, 220, 1.0)';
        ctx.fillRect(this.x, this.y, CELLSIZE, CELLSIZE);
        this.renderContents(ctx);
    }

    /**
     * Render the contents of this cell given 2d canvas context
     * @param ctx a 2d canvas context
     */
    renderContents(ctx) {
        for (const c of this.contents) {
            c.render(ctx, this.x, this.y);
        }
    }

    /**
     * Create a string representation of this grid cell
     */
    toString() {
        return `${this.x}, ${this.y}: ` + Array.from(this.contents).join();
    }
}

/**
 * Some object that can be rendered to a canvas
 */
class Renderable {
    constructor(color) {
        if (color === undefined) {
            const r = Math.floor(Math.random() * 256);
            const g = Math.floor(Math.random() * 256);
            const b = Math.floor(Math.random() * 256);
            this.color = `rgba(${r}, ${g}, ${b}, 0.6)`;
        } else {
            this.color = color;
        }
    }
    /**
     * Render this object to the given 2d rendering context at the given x, y position
     * @param ctx The 2d context to use
     * @param{Number} x The x-coordinate to render at
     * @param{Number} y The y-coordinate to render at
     */
    render(ctx, x, y) {
        ctx.fillStyle = this.color;
        ctx.fillRect(x + CELLSIZE/4, y + CELLSIZE/4, CELLSIZE/2, CELLSIZE/2);
    }
}

/**
 * A renderable object that makes some decision about what to do on each step of the simulation
 */
class Agent extends Renderable {
    constructor(startingCell, color) {
        super(color);
        this.cell = startingCell;
        if (startingCell) {
            startingCell.contents.add(this);
        }
        this.state = null;
        this.timeToTransition = 0;
    }

    /**
     * Re-initialize this agent on the given cell in the given state
     * @param{Cell} cell The cell to start on
     * @param{String} state The new state to start in
     */
    initializeAt(cell, state) {
        this.cell = cell;
        this.cell.contents.add(this);
        this.state = state;
    }

    /**
     * Move this agent from its current cell to a new one, updating the contents of both cells involved
     * @param{Cell} newCell The cell to move to
     */
    move(newCell) {
        // Move to a new cell
        this.cell.contents.delete(this);
        this.cell = newCell;
        newCell.contents.add(this);
    }

    /**
     * Perform whatever logic this agent implements during each simulation tick
     * @param{Number} deltaT The amount of time that's passed since the last simulation tick
     */
    simulate(deltaT) {
        // By default an agent does nothing
        return;
    }
}

/**
 * A special type of simulation cell that passengers can sit in
 */
class Seat extends Cell {
    constructor(x, y, row, col) {
        super(x, y);
        this.row = row;
        this.col = col;
        this.colorA = 'rgba(242, 129, 29, 1.0)';
        this.colorB = 'rgba(242, 169, 34, 1.0)';
    }
    render(ctx) {
        // Draw the base of the seat
        ctx.fillStyle = this.colorB;
        ctx.fillRect(this.x + 2, this.y + 6, CELLSIZE-12, CELLSIZE-12);
        // Draw the other parts
        ctx.fillStyle = this.colorA;
        // Armrests
        ctx.fillRect(this.x + 7, this.y+1, CELLSIZE - 18, 10);
        ctx.fillRect(this.x + 7, this.y+CELLSIZE-11, CELLSIZE - 18, 10);
        // Backrest
        ctx.fillRect(this.x + CELLSIZE - 10, this.y + 3, 9, CELLSIZE - 6);
        // Label the seat
        const fontSize = CELLSIZE / 3;
        const fontYPos = this.y + CELLSIZE  - fontSize * 1.1;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = `${fontSize}px sans-serif`;
        ctx.fillText(this.row + this.col, this.x + 6, fontYPos);
        this.renderContents(ctx);
    }
    toString() {
        return this.row + this.col;
    }
}

const State = Object.freeze({
    Seated: 'seated',
    Searching: 'searching',
    LoadingUp: 'loading_up',
    LoadingDown: 'loading_down',
});


class Passenger extends Agent {
    constructor(cell, targetSeat, luggageDistribution, color) {
        super(cell, color);
        this.targetSeat = targetSeat;
        this.luggageDistribution = luggageDistribution;
    }
    simulate(deltaT) {
        // We can model the behavior of passengers surprisingly accurately with just a little state machine
        if (this.state === State.Seated || this.state === null) {
            // If we're already in our seat or not in the simulation, don't do anything
            return;
        } else if (this.state === State.Searching) {
            // If we're looking for our seat then check to see if it's next to us,
            // if it's not then move to the next cell
            if (this.cell.up && this.cell.up.row === this.targetSeat.row && this.cell.up.col >= this.targetSeat.col) {
                this.state = State.LoadingUp;
                this.timeToTransition = this.luggageDistribution();
            } else if (this.cell.down && this.cell.down.row === this.targetSeat.row && this.cell.down.col <= this.targetSeat.col) {
                this.state = State.LoadingDown;
                this.timeToTransition = this.luggageDistribution();
            } else {
                // Move to the right
                if (this.cell.right) {
                    if (!this.cell.right.isEmpty()) {
                    } else {
                        this.move(this.cell.right);
                    }
                } else {
                    console.error('Passenger failed to find seat: ' + this.targetSeat.row + this.targetSeat.col);
                }
            }
        } else if (this.state === State.LoadingUp) {
            this.timeToTransition -= deltaT;
            if (this.timeToTransition <= 0) {
                this.move(this.cell.up);
                if (this.cell === this.targetSeat) {
                    this.state = State.Seated;
                }
            }
        } else if (this.state === State.LoadingDown) {
            this.timeToTransition -= deltaT;
            if (this.timeToTransition <= 0) {
                this.move(this.cell.down);
                if (this.cell === this.targetSeat) {
                    this.state = State.Seated;
                }
            }
        } else {
            console.error('Unhandled state: ' + this.state);
        }
    }
    toString() {
        return this.targetSeat.toString() + ' [' + this.state + ']';
    }
}

/**
 * The thing we're trying to load up with passengers - keeps track of the simulation
 * grid and gets passengers started on their simulated trip to their seats
 */
class Aircraft {
    constructor(startingCell) {
        this.grid = [];
        this.startingCell = startingCell;
        this.addCell(startingCell);
        this.seats = [];
        // We cache the bounding box of the grid to make rendering faster later
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
        // Keep track of which rows and columns are present
        this.rows = new Set();
        this.cols = new Set();
    }

    /**
     * Add a cell to the simulation grid
     * @param{Cell} newCell The cell to add to the grid
     */
    addCell(newCell) {
        this.grid.push(newCell);
        if (newCell.row) {
            this.rows.add(newCell.row);
        }
        if (newCell.col) {
            this.cols.add(newCell.col);
        }
        this.updateBoundingBox();
    }

    get rowCount() {
        return this.rows.size;
    }

    get colCount() {
        return this.cols.size;
    }

    /**
     * Add a seat to the simulation grid - we track these separately from other cells since it makes it easier to look them up and count them
     * @param{Seat} newSeat The seat to add to the grid
     */
    addSeat(newSeat) {
        this.seats.push(newSeat);
    }

    /**
     * Put a passenger on the plane so they can start looking for their seat
     * @param{Passenger} passenger A new passenger starting their adventure
     */
    board(passenger) {
        if (this.startingCell.isEmpty()) {
            passenger.initializeAt(this.startingCell, State.Searching);
        } else {
            throw 'Cannot board passenger ' + passenger + '; starting cell is full!';
        }
    }

    /**
     * Search the seat list for a seat matching the given ID (e.g. "25H" or "12F")
     * @param{String} seatId The identifier of the seat we want to find
     * @return{Seat|null} The seat if we could find it or null if we couldn't
     */
    findSeat(seatId) {
        const match = seatId.match(/([0-9]+)([A-Z]+)/);
        if (!match) {
            return null;
        }
        const targetRow = match[1];
        const targetCol = match[2];
        for (const seat of this.seats) {
            if (seat.row == targetRow && seat.col == targetCol) {
                return seat;
            }
        }
        return null;
    }

    /**
     * Re-compute the bounding box for the aircraft
     */
    updateBoundingBox() {
        let x1 = 0;
        let y1 = 0;
        let x2 = 0;
        let y2 = 0;
        for (const cell of this.grid) {
            if (cell.x < x1) {
                x1 = cell.x;
            } else if (cell.x > x2) {
                x2 = cell.x;
            }
            if (cell.y < y1) {
                y1 = cell.y;
            } else if (cell.y > y2) {
                y2 = cell.y;
            }
        }
        this.x = x1;
        this.y = y1;

        this.height = y2 - this.y + CELLSIZE;
        this.width = x2 - this.x + CELLSIZE;

        this.tailLength = this.height * 1.5;
        this.fuselageLength = this.width;
        this.noseLength = this.height * 1.5;

        this.top = this.y - (AIRCRAFT_PADDING + AIRCRAFT_WALL_HEIGHT);
        this.left = this.x - this.noseLength;
        this.bottom = this.top + this.height + 2 * AIRCRAFT_PADDING + 2 * AIRCRAFT_WALL_HEIGHT;
        this.right = this.left + this.noseLength + this.fuselageLength + this.tailLength;
    }

    /**
     * Render the aircraft to the canvas
     * @param{Aircraft} The aircraft to render
     */
    render(ctx) {
        const tailStart = this.x + this.fuselageLength;
        const tailSlope = (this.height + AIRCRAFT_PADDING) * 0.3;
        const tailBezierOffset = {
            x: 100,
            y: 20,
        };
        const tailp1 = {
            x: tailStart + this.tailLength + tailBezierOffset.x,
            y: this.y + tailSlope - AIRCRAFT_WALL_HEIGHT + tailBezierOffset.y,
        };
        const tailp2 = {
            x: tailStart + this.tailLength + tailBezierOffset.x,
            y: this.y + this.height - tailSlope + AIRCRAFT_PADDING - tailBezierOffset.y,
        };
        // Draw the tail first since it needs to be on the bottom
        ctx.fillStyle = 'rgba(180, 180, 185, 1.0)';
        ctx.strokeStyle = 'rgba(220, 220, 230, 1.0)';
        ctx.lineWidth = AIRCRAFT_WALL_HEIGHT * 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(tailStart, this.y - AIRCRAFT_PADDING);
        ctx.quadraticCurveTo(
            tailStart + 50,
            this.y - AIRCRAFT_PADDING,
            tailStart + this.tailLength,
            this.y + tailSlope - AIRCRAFT_WALL_HEIGHT
        );
        ctx.bezierCurveTo(tailp1.x, tailp1.y, tailp2.x, tailp2.y, tailStart + this.tailLength, this.y + this.height + AIRCRAFT_PADDING - tailSlope);
        ctx.quadraticCurveTo(
            tailStart + 50,
            this.y + this.height + AIRCRAFT_PADDING,
            tailStart,
            this.y + this.height + AIRCRAFT_PADDING
        );
        ctx.stroke();
        ctx.fill();
        ctx.closePath();

        // The nose also needs to be below the fuselage
        const noseBezierOffset = 19;
        const nosep1 = {
            x: this.x - this.noseLength,
            y: this.y - AIRCRAFT_PADDING + noseBezierOffset,
        };
        const nosep2 = {
            x: this.x - this.noseLength,
            y: this.y + this.height + AIRCRAFT_PADDING - noseBezierOffset,
        };
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - AIRCRAFT_PADDING);
        ctx.bezierCurveTo(nosep1.x, nosep1.y, nosep2.x, nosep2.y, this.x, this.y + this.height + AIRCRAFT_PADDING);
        ctx.stroke();
        ctx.fill();
        ctx.closePath();

        // Draw the fuselage
        ctx.fillStyle = 'rgba(220, 220, 230, 1.0)';
        ctx.fillRect(this.x, this.y - AIRCRAFT_WALL_HEIGHT - AIRCRAFT_PADDING, this.fuselageLength, AIRCRAFT_WALL_HEIGHT);
        ctx.fillRect(this.x, this.y + this.height + AIRCRAFT_PADDING, this.fuselageLength, AIRCRAFT_WALL_HEIGHT);

        ctx.fillStyle = 'rgba(180, 180, 185, 1.0)';
        ctx.fillRect(this.x, this.y - AIRCRAFT_PADDING, this.fuselageLength, this.height + 2 * AIRCRAFT_PADDING);

        // Draw the simulation grid over the body of the aircraft
        for (const cell of this.grid) {
            cell.render(ctx);
        }
    }
}

/** Most of the actual simulation setup is in these functions **/

/**
 * Take a seat layout and generate an aircraft that implements it
 * @param{Array} seatLayout A list of SeatLayout objects the describe how the grid should look
 * @return{Aircraft} An aircraft with the desired layout
 */
function generateAircraft(seatLayout) {
    const startingCell = new Cell(0, 0);
    const aircraft = new Aircraft(startingCell);
    let prevAisle = startingCell;
    let x = 0;
    let rowIndex = 1;
    for (let rowSpec of seatLayout) {
        for (let i = 0; i < rowSpec.repeat; i++) {
            x += CELLSIZE;
            let prevCell = null;
            let seatIndex = 0;
            for (let j = 0; j < rowSpec.layout.length; j++) {
                const cellType = rowSpec.layout.charAt(j);
                const y = j * CELLSIZE;
                let newCell = null;
                // Add a new cell of the type required by the row spec
                if (cellType === 'S') {
                    // Add a seat
                    const colName = String.fromCharCode(65 + seatIndex);
                    newCell = new Seat(x, y, rowIndex, colName);
                    seatIndex++;
                    aircraft.addSeat(newCell);
                } else if (cellType === 'A') {
                    // Add an aisle
                    newCell = new Cell(x, y);
                    newCell.left = prevAisle;
                    prevAisle.right = newCell;
                    prevAisle.y = newCell.y; // Adjust y-coordinates so things line up
                    prevAisle = newCell;
                } else if (cellType === '+') {
                    // Advance the seat index but don't count this space
                    seatIndex++;
                    continue;
                } else {
                    // Skip this space
                    continue;
                }
                if (prevCell) {
                    // Link neighboring cells
                    prevCell.down = newCell;
                    newCell.up = prevCell;
                }
                prevCell = newCell;
                aircraft.addCell(newCell);
            }
            rowIndex += 1;
        }
    }
    // Scale the canvas so we can see the whole aircraft at once
    const canvas = document.getElementById('simulation');
    const ctx = canvas.getContext('2d');
    const scaleFactor = Math.min(Math.min(canvas.width / aircraft.width, canvas.height / aircraft.height) * 0.95, 1.0);
    ctx.scale(scaleFactor, scaleFactor);
    const deltaX = canvas.width / 2 - aircraft.width / 2 * scaleFactor;
    const deltaY = canvas.height / 2 - aircraft.height / 2 * scaleFactor;
    ctx.translate(deltaX, deltaY);

    return aircraft;
}

/**
 * Pick a random color from a pallette of human-like skin tones
 * @return{String} An rgba color string repesenting the selected skin tone
 */
function randomRgbaSkinColor() {
    const colors = [
        'rgba(197, 140, 133, 1.0)',
        'rgba(236, 188, 180, 1.0)',
        'rgba(209, 163, 164, 1.0)',
        'rgba(161, 102, 94, 1.0)',
        'rgba(80, 51, 53, 1.0)',
        'rgba(89, 47, 42, 1.0)',
    ];
    const choice = Math.floor(Math.random() * colors.length);
    return colors[choice];
}

/**
 * Take an array and rearrange its elements in a random order (does not create a new array)
 * @param{Array} The array to shuffle
 */
function shuffleArray(array) {
    for(let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = array[i];
        array[i] = array[j];
        array[j] = tmp;
    }
}

/**
 * Get the desired seat layout from the user and generate an aircraft that matches it
 * @return{Aircraft} An aircraft with the desired seat layout
 */
function generateAircraftFromForm() {
    const presetValue = document.getElementById('layout_preset').value;
    let seatLayout = SEAT_LAYOUT_PRESETS[presetValue];
    if (presetValue === 'coords') {
        const rows = document.getElementById('rows').value * 1;
        const cols = document.getElementById('cols').value * 1;
        // Build a seat layout from the row/column counts
        seatLayout = [{
            repeat: rows,
            layout: 'S'.repeat(cols) + 'A' + 'S'.repeat(cols),
        }];
    }
    return generateAircraft(seatLayout);
}

/**
 * Generate an aircraft from the form filled out by the user and render it to the canvas
 */
function generateAndRenderAircraft() {
    const canvas = document.getElementById('simulation');
    const ctx = canvas.getContext('2d');
    const aircraft = generateAircraftFromForm();
    aircraft.render(ctx);
}

/**
 * Clear the canvas by resetting the transformation matrix and filling it with a white rectangle
 */
function clearCanvas() {
    const canvas = document.getElementById('simulation');
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

/**
 * Put a set of passengers in back-to-front order
 * @param{Array} passengers The list of passengers to arrange
 * @param{Aircraft} aircraft The aircraft to load
 */
function arrangeBackFront(passengers, aircraft) {
    return passengers;
}

/**
 * Put a set of passengers in front-to-back order
 * @param{Array} passengers The list of passengers to arrange
 * @param{Aircraft} aircraft The aircraft to load
 */
function arrangeFrontBack(passengers, aircraft) {
    return passengers.reverse();
}

/**
 * Put a set of passengers in random order
 * @param{Array} passengers The list of passengers to arrange
 * @param{Aircraft} aircraft The aircraft to load
 */
function arrangeRandom(passengers, aircraft) {
    shuffleArray(passengers);
    return passengers;
}

/**
 * Put a set of passengers in order for boarding according to Steffen (2008)
 *
 * This method orders passengers from back to front, every other row, on
 * alternate sides of the aircraft, from the outside in. There's a good diagram
 * in the original paper but here's a very simple example:
 *
 * 6  2  5  1
 * 14 10 13 9
 *
 * 16 12 15 11
 * 8  4  7  3
 * @param{Array} passengers The list of passengers to arrange
 * @param{Aircraft} aircraft The aircraft to load
 */
function arrangeSteffen(passengers, aircraft) {
    const seatMap = {};
    for (const p of passengers) {
        seatMap[p.targetSeat.toString()] = p;
    }

    // Iterate from the outside to the inside of the plane
    const sortedPassengers = new Array();
    let rightCol = 0;
    let leftCol = aircraft.colCount - 1;
    while (leftCol >= rightCol) {
        // Iterate over the rows from the back of the plane to the front
        const rightColName = String.fromCharCode(65 + rightCol);
        const leftColName = String.fromCharCode(65 + leftCol);
        for (let row = aircraft.rowCount; row > 0; row-=2) {
            let seat = row + rightColName;
            let passenger = seatMap[seat];
            if (passenger !== undefined) {
                sortedPassengers.push(seatMap[seat]);
            }
            console.log('R Boarding ' + seat);
            if (leftCol !== rightCol) {
                seat = row + leftColName;
                console.log('L Boarding ' + seat);
                passenger = seatMap[seat];
                if (passenger !== undefined) {
                    sortedPassengers.push(seatMap[seat]);
                }
            }
        }
        for (let row = aircraft.rowCount - 1; row > 0; row-=2) {
            let seat = row + rightColName;
            console.log('R Boarding ' + seat);
            let passenger = seatMap[seat];
            if (passenger !== undefined) {
                sortedPassengers.push(seatMap[seat]);
            }
            if (leftCol !== rightCol) {
                seat = row + leftColName;
                console.log('L Boarding ' + seat);
                passenger = seatMap[seat];
                if (passenger !== undefined) {
                    sortedPassengers.push(seatMap[seat]);
                }
            }
        }
        console.log('--');
        // Move in towards the center of the aircraft
        leftCol--;
        rightCol++;
    }
    sortedPassengers.reverse();
    console.log(sortedPassengers);
    return sortedPassengers;
}

/**
 * Run a passenger boarding simulation using the given status object so we can communicate with this task later
 *
 * NOTE: This is only async so that we can get the timing right; it's kind of
 * gross but this was the only way I could think of to do it
 * @param{Object} simStatus The current status of the simulation - we just check this to make sure we don't need to break out of the main loop
 * @param{Number} tickLengthms The amount of time (in milliseconds) that should pass during each simulation tick - default is 500ms
 * @return{Number} The number of (simulated) seconds it took to board all of the passengers
 */
async function simulate(simStatus, tickLengthms, luggageDistribution) {
    if (tickLengthms === undefined) {
        // Default tick rate is 1 simulation tick = 500 ms
        tickLengthms = 500;
    }
    if (luggageDistribution === undefined) {
        // By default just use 10 seconds as the average luggage loading time
        luggageDistribution = function() {
            return 10000;
        };
    }
    setStatus('Starting simulation');
    const canvas = document.getElementById('simulation');
    const ctx = canvas.getContext('2d');

    // Create the aircraft
    const aircraft = generateAircraftFromForm();
    // Generate some passengers to fill the seats
    let pendingPax = [];
    const activePax = [];
    const paxCount = aircraft.seats.length;
    for (let i = 0; i < paxCount; i++) {
        const targetSeat = aircraft.seats[i];
        const color = randomRgbaSkinColor();
        let pax = new Passenger(null, targetSeat, luggageDistribution, color);
        pendingPax.push(pax);
    }

    // See what boarding method the user wants to use and rearrange the passengers accordingly
    const method = document.querySelector('input[name="method"]:checked').value;
    if (method === 'random') {
        // Randomize the order of the passengers
        pendingPax = arrangeRandom(pendingPax, aircraft);
    } else if (method === 'btf') {
        // Arrange the passengers back to front
        pendingPax = arrangeBackFront(pendingPax, aircraft);
    } else if (method === 'ftb') {
        // Arrange the passengers front to back
        pendingPax = arrangeFrontBack(pendingPax, aircraft);
    } else if (method === 'steffen') {
        // Put the passengers in the right order for Steffen loading
        pendingPax = arrangeSteffen(pendingPax, aircraft);
    } else {
        console.error('Unknown boarding method: ' + method + '; using BTF');
    }

    // Run the simulation until all passengers are seated
    setStatus(`Boarding ${paxCount} passengers (${method} method)...`);
    const maxIterations = 10000;
    let iterCount = 0;
    const timeStep = document.getElementById('time_step').value * 1;
    while(simStatus.run && iterCount < maxIterations) {
        // Add any available passengers to the simulation if there's free
        // space at the end of the queue
        const startTime = new Date();
        if (pendingPax.length > 0 && aircraft.startingCell.isEmpty()) {
            const nextPax = pendingPax.pop();
            aircraft.board(nextPax);
            activePax.push(nextPax);
        }
        // Render the simulation and compute the next step for each passenger
        aircraft.render(ctx);
        // If everybody is seated then we're done!
        if (activePax.filter(p => p.state !== State.Seated).length === 0) {
            setStatus(`All ${paxCount} passengers seated after ${iterCount} iterations`);
            break;
        }
        for (const p of activePax) {
            p.simulate(tickLengthms);
        }
        iterCount++;
        const elapsed = Date.now() - startTime;
        const deltaT = timeStep - elapsed;
        // This is the closest we get to sleep() in JS
        await new Promise(resolve => setTimeout(resolve, deltaT));
    }
    if (!simStatus.run) {
        const msg = `Simulation aborted after ${iterCount} iterations`;
        console.log(msg);
        setStatus(msg);
    }
}

/**
 * Display a status message on the page
 * @param{String} message The message to display
 */
function setStatus(message) {
    document.getElementById('status').innerHTML = message;
}

// We use these two variables in case we need to interrupt the current simulation
const simStatus = {
    run: true,
};
let currentSim = null;

// Set up event listeners for the various form controls on the page
window.addEventListener('load', e => {
    const choice = document.getElementById('layout_preset').value;
    if (choice === 'coords') {
        document.getElementById('row_col_params').classList.remove('hidden');
    }
    generateAndRenderAircraft();
});
document.getElementById('render_button').addEventListener('click', e => {
    e.preventDefault();
    clearCanvas();
    generateAndRenderAircraft();
});
document.getElementById('simulate_button').addEventListener('click', e => {
    e.preventDefault();
    clearCanvas();
    if (currentSim) {
        console.log('Cancelling current simulation');
        simStatus.run = false;
        currentSim.then(() => {
            simStatus.run = true;
            currentSim = simulate(simStatus);
        });
    } else {
        simStatus.run = true;
        currentSim = simulate(simStatus);
    }
});
document.getElementById('layout_preset').addEventListener('change', e => {
    const choice = e.target.value;
    if (choice === 'coords') {
        document.getElementById('row_col_params').classList.remove('hidden');
    } else {
        document.getElementById('row_col_params').classList.add('hidden');
    }
});
