console.clear();

interface BlockReturn {
    placed?: any;
    chopped?: any;
    plane: 'x' | 'y' | 'z';
    direction: number;
    bonus?: boolean;
}

class Stage {
    private container: any;
    private camera: any;
    private scene: any;
    private renderer: any;
    private light: any;
    private softLight: any;

    constructor() {
        this.container = document.getElementById('game');

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false
        });

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor('#D0CBC7', 1);
        this.container.appendChild(this.renderer.domElement);

        this.scene = new THREE.Scene();

        let aspect = window.innerWidth / window.innerHeight;
        let d = 20;
        this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, -100, 1000);
        this.camera.position.set(2, 2, 2);
        this.camera.lookAt(new THREE.Vector3(0, 0, 0));

        this.light = new THREE.DirectionalLight(0xffffff, 0.5);
        this.light.position.set(0, 499, 0);
        this.scene.add(this.light);

        this.softLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(this.softLight);

        window.addEventListener('resize', () => this.onResize());
        this.onResize();
    }

    setCamera(y: number, speed: number = 0.3) {
        TweenLite.to(this.camera.position, speed, { y: y + 4, ease: Power1.easeInOut });
        TweenLite.to(this.camera, speed, { onUpdate: () => this.camera.lookAt(new THREE.Vector3(0, y, 0)), ease: Power1.easeInOut });
    }

    onResize() {
        let viewSize = 30;
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.camera.left = window.innerWidth / -viewSize;
        this.camera.right = window.innerWidth / viewSize;
        this.camera.top = window.innerHeight / viewSize;
        this.camera.bottom = window.innerHeight / -viewSize;
        this.camera.updateProjectionMatrix();
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    add(elem: any) {
        this.scene.add(elem);
    }

    remove(elem: any) {
        this.scene.remove(elem);
    }
}

class Block {
    private static STATES = { ACTIVE: 'active', STOPPED: 'stopped', MISSED: 'missed' };
    private static MOVE_AMOUNT = 12;

    private dimension = { width: 0, height: 0, depth: 0 };
    private position = { x: 0, y: 0, z: 0 };
    private mesh: any;
    private state: string;
    private index: number;
    private speed: number;
    private direction: number;
    private colorOffset: number;
    private color: number;
    private material: any;
    private workingPlane: string;
    private workingDimension: string;
    private targetBlock: Block;

    constructor(block: Block) {
        this.targetBlock = block;

        this.index = (this.targetBlock ? this.targetBlock.index : 0) + 1;
        this.workingPlane = this.index % 2 ? 'x' : 'z';
        this.workingDimension = this.index % 2 ? 'width' : 'depth';

        this.dimension.width = this.targetBlock ? this.targetBlock.dimension.width : 10;
        this.dimension.height = this.targetBlock ? this.targetBlock.dimension.height : 2;
        this.dimension.depth = this.targetBlock ? this.targetBlock.dimension.depth : 10;

        this.position.x = this.targetBlock ? this.targetBlock.position.x : 0;
        this.position.y = this.dimension.height * this.index;
        this.position.z = this.targetBlock ? this.targetBlock.position.z : 0;

        this.colorOffset = this.targetBlock ? this.targetBlock.colorOffset : Math.round(Math.random() * 100);

        if (!this.targetBlock) {
            this.color = 0x333344;
        } else {
            let offset = this.index + this.colorOffset;
            let r = Math.sin(0.3 * offset) * 55 + 200;
            let g = Math.sin(0.3 * offset + 2) * 55 + 200;
            let b = Math.sin(0.3 * offset + 4) * 55 + 200;
            this.color = new THREE.Color(r / 255, g / 255, b / 255);
        }

        this.state = this.index > 1 ? Block.STATES.ACTIVE : Block.STATES.STOPPED;

        this.speed = -0.1 - this.index * 0.005;
        if (this.speed < -4) this.speed = -4;
        this.direction = this.speed;

        let geometry = new THREE.BoxGeometry(this.dimension.width, this.dimension.height, this.dimension.depth);
        geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(this.dimension.width / 2, this.dimension.height / 2, this.dimension.depth / 2));
        this.material = new THREE.MeshToonMaterial({ color: this.color, flatShading: true });
        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.position.set(this.position.x, this.position.y + (this.state == Block.STATES.ACTIVE ? 0 : 0), this.position.z);

        if (this.state == Block.STATES.ACTIVE) {
            this.position[this.workingPlane] = Math.random() > 0.5 ? -Block.MOVE_AMOUNT : Block.MOVE_AMOUNT;
        }
    }

    reverseDirection() {
        this.direction = this.direction > 0 ? this.speed : Math.abs(this.speed);
    }

    place(): BlockReturn {
        this.state = Block.STATES.STOPPED;

        let overlap = this.targetBlock.dimension[this.workingDimension] - Math.abs(this.position[this.workingPlane] - this.targetBlock.position[this.workingPlane]);

        let blocksToReturn: BlockReturn = {
            plane: this.workingPlane,
            direction: this.direction
        };

        if (this.dimension[this.workingDimension] - overlap < 0.3) {
            overlap = this.dimension[this.workingDimension];
            blocksToReturn.bonus = true;
            this.position.x = this.targetBlock.position.x;
            this.position.z = this.targetBlock.position.z;
            this.dimension.width = this.targetBlock.dimension.width;
            this.dimension.depth = this.targetBlock.dimension.depth;
        }

        if (overlap > 0) {
            let choppedDimensions = { width: this.dimension.width, height: this.dimension.height, depth: this.dimension.depth };
            choppedDimensions[this.workingDimension] -= overlap;
            this.dimension[this.workingDimension] = overlap;

            let placedGeometry = new THREE.BoxGeometry(this.dimension.width, this.dimension.height, this.dimension.depth);
            placedGeometry.applyMatrix4(new THREE.Matrix4().makeTranslation(this.dimension.width / 2, this.dimension.height / 2, this.dimension.depth / 2));
            let placedMesh = new THREE.Mesh(placedGeometry, this.material);

            let choppedGeometry = new THREE.BoxGeometry(choppedDimensions.width, choppedDimensions.height, choppedDimensions.depth);
            choppedGeometry.applyMatrix4(new THREE.Matrix4().makeTranslation(choppedDimensions.width / 2, choppedDimensions.height / 2, choppedDimensions.depth / 2));
            let choppedMesh = new THREE.Mesh(choppedGeometry, this.material);

            let choppedPosition = {
                x: this.position.x,
                y: this.position.y,
                z: this.position.z
            };

            if (this.position[this.workingPlane] < this.targetBlock.position[this.workingPlane]) {
                this.position[this.workingPlane] = this.targetBlock.position[this.workingPlane];
            } else {
                choppedPosition[this.workingPlane] += overlap;
            }

            placedMesh.position.set(this.position.x, this.position.y, this.position.z);
            choppedMesh.position.set(choppedPosition.x, choppedPosition.y, choppedPosition.z);

            blocksToReturn.placed = placedMesh;
            if (!blocksToReturn.bonus) blocksToReturn.chopped = choppedMesh;
        } else {
            this.state = Block.STATES.MISSED;
        }

        this.dimension[this.workingDimension] = overlap;

        return blocksToReturn;
    }

    tick() {
        if (this.state == Block.STATES.ACTIVE) {
            let value = this.position[this.workingPlane];
            if (value > Block.MOVE_AMOUNT || value < -Block.MOVE_AMOUNT) this.reverseDirection();
            this.position[this.workingPlane] += this.direction;
            this.mesh.position[this.workingPlane] = this.position[this.workingPlane];
        }
    }
}

class Game {
    private static STATES = {
        LOADING: 'loading',
        PLAYING: 'playing',
        READY: 'ready',
        ENDED: 'ended',
        RESETTING: 'resetting'
    };
    private blocks: Block[] = [];
    private state: string = Game.STATES.LOADING;

    private newBlocks: any;
    private placedBlocks: any;
    private choppedBlocks: any;

    private mainContainer: any;
    private scoreContainer: any;
    private noticeContainer: any;

    private stage: Stage;

    constructor() {
        this.stage = new Stage();
        this.mainContainer = document.getElementById('game');
        this.scoreContainer = document.getElementById('score');
        this.noticeContainer = document.getElementById('notice');

        this.newBlocks = new BlocksPool();
        this.placedBlocks = new BlocksPool();
        this.choppedBlocks = new BlocksPool();

        this.state = Game.STATES.READY;

        document.addEventListener('keydown', e => {
            if (e.keyCode == 32) this.onAction();
        });
        document.addEventListener('click', () => this.onAction());

        this.stage.render();
        this.update();
    }

    update() {
        this.blocks.forEach(block => block.tick());
        this.stage.render();
        window.requestAnimationFrame(() => this.update());
    }

    onAction() {
        switch (this.state) {
            case Game.STATES.READY:
                this.startGame();
                break;
            case Game.STATES.PLAYING:
                this.placeBlock();
                break;
            case Game.STATES.ENDED:
                this.resetGame();
                break;
        }
    }

    startGame() {
        if (this.state != Game.STATES.READY) return;
        this.state = Game.STATES.PLAYING;
        this.addBlock();
        this.scoreContainer.innerHTML = '0';
        this.noticeContainer.innerHTML = '';
    }

    placeBlock() {
        let currentBlock = this.blocks[this.blocks.length - 1];
        let newBlocks = currentBlock.place();
        let bonus = newBlocks.bonus;
        if (newBlocks.placed) {
            this.placedBlocks.meshes.push(newBlocks.placed);
            this.stage.add(newBlocks.placed);
            if (bonus) {
                this.noticeContainer.innerHTML = 'Perfect!';
                this.noticeContainer.classList.add('visible');
                setTimeout(() => {
                    this.noticeContainer.classList.remove('visible');
                }, 1000);
            }
        }
        if (newBlocks.chopped) {
            this.choppedBlocks.meshes.push(newBlocks.chopped);
            this.stage.add(newBlocks.chopped);
            let choppedPosition = { x: newBlocks.chopped.position.x, y: newBlocks.chopped.position.y, z: newBlocks.chopped.position.z };
            let rotationParams = { x: 0, y: 0, z: 0 };
            let fallDirection = currentBlock.position.x < this.blocks[this.blocks.length - 2].position.x ? 1 : -1;
            rotationParams.x = (Math.random() * 0.4 - 0.2) * fallDirection;
            rotationParams.y = Math.random() * 0.4 - 0.2;
            rotationParams.z = (Math.random() * 0.4 - 0.2);
            TweenLite.to(newBlocks.chopped.rotation, 1, {
                x: rotationParams.x,
                y: rotationParams.y,
                z: rotationParams.z
            });
            TweenLite.to(newBlocks.chopped.position, 1, {
                y: '-=30',
                ease: Power1.easeIn,
                delay: 0.1
            });
        }
        this.addBlock();
        this.stage.setCamera(currentBlock.position.y);
        if (newBlocks.placed) {
            this.scoreContainer.innerHTML = (this.blocks.length - 1).toString();
        }
        if (currentBlock.state == Block.STATES.MISSED) {
            this.endGame();
        }
    }

    addBlock() {
        let lastBlock = this.blocks[this.blocks.length - 1];
        if (lastBlock && lastBlock.state == Block.STATES.MISSED) return;
        let newBlock = new Block(lastBlock);
        this.newBlocks.meshes.push(newBlock.mesh);
        this.stage.add(newBlock.mesh);
        this.blocks.push(newBlock);
    }

    endGame() {
        this.state = Game.STATES.ENDED;
        this.noticeContainer.innerHTML = 'Click to restart';
        this.noticeContainer.classList.add('visible');
    }

    resetGame() {
        this.state = Game.STATES.RESETTING;

        let oldBlocks = this.blocks;
        let removeSpeed = 0.2;
        let delayAmount = (removeSpeed / oldBlocks.length) + 0.1;

        oldBlocks.forEach((block, i) => {
            TweenLite.to(block.position, removeSpeed, { y: '-=30', delay: delayAmount * i, ease: Power1.easeIn, onComplete: () => this.stage.remove(block.mesh) });
        });

        this.placedBlocks.meshes.forEach((mesh, i) => {
            TweenLite.to(mesh.position, removeSpeed, { y: '-=30', delay: delayAmount * i, ease: Power1.easeIn, onComplete: () => this.stage.remove(mesh) });
        });

        this.choppedBlocks.meshes.forEach((mesh, i) => {
            TweenLite.to(mesh.position, removeSpeed, { y: '-=30', delay: delayAmount * i, ease: Power1.easeIn, onComplete: () => this.stage.remove(mesh) });
        });

        this.blocks = [];
        this.newBlocks.meshes = [];
        this.placedBlocks.meshes = [];
        this.choppedBlocks.meshes = [];

        this.stage.setCamera(0, removeSpeed * 2 + delayAmount * oldBlocks.length);

        setTimeout(() => {
            this.state = Game.STATES.READY;
            this.noticeContainer.classList.remove('visible');
        }, 600);
    }
}

class BlocksPool {
    meshes: any[] = [];
}
