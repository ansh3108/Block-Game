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
	private group: any;

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
		this.camera.position.x = 2;
		this.camera.position.y = 2;
		this.camera.position.z = 2;
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
		TweenLite.to(this.camera.lookAt, speed, { y: y, ease: Power1.easeInOut });
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

	render = function () {
		this.renderer.render(this.scene, this.camera);
	};

	add = function (elem) {
		this.scene.add(elem);
	};

	remove = function (elem) {
		this.scene.remove(elem);
	};
}
