/**
 * Created by lukedowell. Feel free to use or edit this in any way.
 */
window.onload = function() {

    var canvas = document.getElementById('canvas'); //Our HTML5 canvas
    var ctx = canvas.getContext('2d');              //Our canvas context. Used to render on the canvas.

    var cycles = 0;     //How many times our main() has run
    var world = new GameWorld();
    var timeLastFired = undefined; //The last timeframe we fired our gun
    var timeLastSanitized = undefined; //The last time we sanitized our projectiles
    var asteroidTime = undefined; //The next time we are going to create asteroids

    var PLAYER_SPEED = 2; //How fast we want our ship to move
    var BULLET_SPEED = 5;
    var ASTEROID_SPEED = 3; //How fast our asteroid moves
    var SANITIZE_RATE = 10000; //How often we should clean projectiles in millis

    /**
     * Best shot at an enum I guess, not sure if I should use
     * something else in javascript
     */
    var Entities = {
        Ships: {
            PLAYER: -1,
            MOSQUITO: 0,
            BOMBER: 1,
            BOSS: 2
        },
        Projectile: {
            ASTEROID: 10,
            BULLET: 11
        }
    };

    /**
     * Helper object for our input. Using this allows us to
     * place our input code in our update method.
     */
    var Key = {
        pressed: {},

        LEFT: 37,
        RIGHT: 39,
        SPACE: 32,

        isDown: function(keyCode) {
            return this.pressed[keyCode];
        },

        onKeydown: function(event) {
            this.pressed[event.keyCode] = true;
        },

        onKeyup: function(event) {
            delete this.pressed[event.keyCode];
        }
    };


    /**
     * Initializes our game
     */
    function init() {
        world.gameobjects.push(new GameObject(canvas.width / 2, canvas.height - 20, Entities.Ships.PLAYER));
        window.addEventListener('keyup', function(event) { Key.onKeyup(event); }, false);
        window.addEventListener('keydown', function(event) { Key.onKeydown(event); }, false);
        asteroidTime = (Math.floor((Math.random() * 10) + 1) * 1000);
        main();
    }

    /**
     * Our main loop
     * @param timeframe
     *      Time since this function started in milliseconds
     */
    function main( timeframe ) {
        cycles = window.requestAnimationFrame(main);
        update( timeframe );
        render();
    }

    /**
     * Our update loop. All game and input logic goes here.
     * @param timeframe
     */
    function update( timeframe ) {

        //input
        if(Key.isDown(Key.LEFT)) {
            world.gameobjects[0].x -= PLAYER_SPEED;

        } else if(Key.isDown(Key.RIGHT)) {
            world.gameobjects[0].x += PLAYER_SPEED;

        }

        if(Key.isDown(Key.SPACE)) { //Not an elseif because we want to be able to move and shoot at the same time
            if(timeLastFired === undefined || (timeframe - timeLastFired) >= 500) { //TODO: Firing like galaga. Figure dat shit out.
                var player = world.gameobjects[0];
                var bullet = new Projectile([0, BULLET_SPEED], player.x+1, player.y + 2, Entities.Projectile.BULLET);
                world.projectiles.push(bullet);
                timeLastFired = timeframe;
            }
        }

        if(asteroidTime - timeframe <= 0) {
            createAsteroid();
            asteroidTime = timeframe + (Math.floor((Math.random() * 10) + 1) * 1000); //At maxmimum we will wait 10 seconds between asteroids
        }

        //Update our projectiles
        var length = world.projectiles.length;
        for(var i = 0; i < length; i++) {
            var proj = world.projectiles[i];
            if(proj != undefined) {
                proj.calculate();
            }
        }

        //Check to see if we need to clean up
        if(timeLastSanitized === undefined ||
            timeframe - timeLastSanitized >= SANITIZE_RATE) {
            world.sanitizeProjectiles();
            timeLastSanitized = timeframe;
        }
        console.log(world.projectiles.length);
    }

    /**
     * Our rendering loop. Only concerns itself with drawing the gameworld.
     */
    function render() {

        //Clear our screen
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        //Draw all of our entities.
        var lengthObject = world.gameobjects.length; //Store the length out here so we aren't going through the whole array each time
        for(var i = 0; i < lengthObject; i++) {
            var object = world.gameobjects[i];
            switch(object.type) {

                case Entities.Ships.PLAYER:
                    ctx.fillStyle = "white";
                    ctx.fillRect(object.x, object.y, 10, 10);
                    break;

                default:

            }
        }

        //Draw all of our projectiles
        var lengthProj = world.projectiles.length;
        for(var j = 0; j < lengthProj; j++) {
            var proj = world.projectiles[j];
            switch(proj.type) {

                case Entities.Projectile.BULLET:
                    ctx.fillStyle = "red";
                    ctx.fillRect(proj.x, proj.y, proj.width, proj.height);
                    break;

                case Entities.Projectile.ASTEROID:
                    ctx.fillStyle = "blue";
                    ctx.fillRect(proj.x, proj.y, proj.width, proj.height);
                    break;

                default:
            }
        }
    }

    /**
     *  Our game world. Contains game objects
     * @constructor
     */
    function GameWorld() {
        this.gameobjects = [];
        this.projectiles = []; //I want to store these separately because I don't need to do collision detection on everything
        /**
         * Deletes projectiles once they leave the screen. We will run this every 5 seconds to avoid
         * unneccesary looping. Might put this in the projectile.calculate if I can figure out how
         */
        this.sanitizeProjectiles = function() {
            var projLength = this.projectiles.length;
            for(var i = 0; i < projLength; i++) {
                var proj = this.projectiles[i];
                if(proj != undefined) { //I don't know why this happens
                    if(proj.y >= canvas.height ||
                        proj.y <= -16 ||    //We don't want to accidentally remove our asteroids before they come on screen
                        proj.x >= canvas.width ||
                        proj.x <= 0) {
                        world.projectiles.splice(i, 1);
                    }
                }
            }
            var newLength = this.projectiles.length;
            console.log("Projectiles Sanitized: " + (projLength - newLength));
        }
    }

    /**
     * Creates a game object.
     * @param x
     *      The X location of this object
     * @param y
     *      The Y location of this object
     * @param type
     *      The type of this object
     * @constructor
     */
    function GameObject(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
    }


    /**
     * A projectile. In our game, this will be an asteroid
     * or a bullet.
     *
     * @param vector
     *      The vector our projectile is moving at
     * @param x
     *      The x starting point of our projectile
     * @param y
     *      The y starting point of our projectile
     * @param type
     *      The type of entity that this projectile is
     * @constructor
     */
    function Projectile(vector, x, y, type) {
        GameObject.call(this, x, y, type);
        this.vector = vector;
        var width, height = 0;
        switch(type) {
            case Entities.Projectile.BULLET:
                width = 2;
                height = 2;
                break;

            case Entities.Projectile.ASTEROID:
                width = 15;
                height = 15;
                break;

            default:
                width = 5;
                height = 5;
        }
        this.width = width;
        this.height = height;
    }
    Projectile.prototype = Object.create(GameObject); //Set our super to GameObject. Probably bad terminology
    /**
     * Updates the position of the projectile.
     */
    Projectile.prototype.calculate = function() {
        this.x -= this.vector[0];
        this.y -= this.vector[1];
    };
    Projectile.prototype.toString = function() {
        return this.type + " -- X: " + this.x + "  Y: " + this.y + " -- Vector: " + this.vector[0] + "," + this.vector[1];
    };

    /**
     * Creates an asteroid and throws it downwards at our player. Eventually may want to adjust to account for the size of the asteroid and player to create a more centered hit as opposed to head on.
     */
    function createAsteroid() {
        var spawnX = (Math.floor((Math.random() * canvas.width) + 1));
        var asteroidXVector = (spawnX - world.gameobjects[0].x);
        asteroidXVector = asteroidXVector/((canvas.height-(canvas.height - world.gameobjects[0].y)) / ASTEROID_SPEED);
        /* Equalize speed between asteroids thrown striaght down and those thrown at an angle */
        /* Calculate the "slope" or distance of our angled asteroid with Pythagorean Theorem */
        var asteroidDistance = Math.sqrt(asteroidXVector*asteroidXVector + ASTEROID_SPEED * ASTEROID_SPEED);
        /* Create a ratio between this distance and our straight on distance (ASTEROID_SPEED) */
        var asteroidSpeedRatio = ASTEROID_SPEED/asteroidDistance;
        /* Reduce our asteroid x & y vectors by this ratio */
        asteroidXVector *= asteroidSpeedRatio;
        var asteroidYVector = ASTEROID_SPEED * asteroidSpeedRatio;
        var asteroidVector = [asteroidXVector, -asteroidYVector];
        var asteroid = new Projectile(asteroidVector, spawnX, -15, Entities.Projectile.ASTEROID);
        world.projectiles.push(asteroid);
        console.log(asteroid.toString() + " CREATED!");
    }
    init();
};
