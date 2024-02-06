import {
  Color,
  Mesh,
  PerspectiveCamera,
  BufferGeometry,
  // Shader,
  Plane,
  Matrix4,
  WebGLRenderTarget,
  HalfFloatType,
  ShaderMaterial,
  UniformsUtils,
  Vector3,
  Quaternion,
  RawShaderMaterial,
  ACESFilmicToneMapping,
  Vector4,
  WebGLRenderer,
  Object3D,
} from "three";
type Options = {
  color?: number;
  textureWidth?: number;
  textureHeight?: number;
  clipBias?: number;
  shader?: never;
  multisample?: number;
};

const RefractorShader = {
  uniforms: {
    color: {
      value: null,
    },
    tDiffuse: {
      value: null,
    },
    textureMatrix: {
      value: null,
    },
  },
  vertexShader:
    /* glsl */
    `

		uniform mat4 textureMatrix;

		varying vec4 vUv;

		void main() {

			vUv = textureMatrix * vec4( position, 1.0 );
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,
  fragmentShader:
    /* glsl */
    `

		uniform vec3 color;
		uniform sampler2D tDiffuse;

		varying vec4 vUv;

		float blendOverlay( float base, float blend ) {

			return( base < 0.5 ? ( 2.0 * base * blend ) : ( 1.0 - 2.0 * ( 1.0 - base ) * ( 1.0 - blend ) ) );

		}

		vec3 blendOverlay( vec3 base, vec3 blend ) {

			return vec3( blendOverlay( base.r, blend.r ), blendOverlay( base.g, blend.g ), blendOverlay( base.b, blend.b ) );

		}

		void main() {

			vec4 base = texture2DProj( tDiffuse, vUv );
			gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );

			#include <tonemapping_fragment>
			#include <encodings_fragment>

		}`,
};

class Refractor extends Mesh {
  isRefractor = true;
  type = "Refractor";
  camera = new PerspectiveCamera();
  renderTarget: WebGLRenderTarget;
  textureMatrix: Matrix4;
  refractorPlane: Plane;
  clipBias: number;
  clipPlane = new Plane();
  clipVector = new Vector4();
  q = new Vector4();
  Normal = new Vector3();
  Position = new Vector3();
  Quaternion = new Quaternion();
  Scale = new Vector3();
  virtualCamera: PerspectiveCamera;
  refractorWorldPosition = new Vector3();
  cameraWorldPosition = new Vector3();
  rotationMatrix = new Matrix4();
  view = new Vector3();
  normal = new Vector3();
  constructor(geometry: BufferGeometry, options: Options = {}) {
    super(geometry);
    const color =
      options.color !== undefined
        ? new Color(options.color)
        : new Color(0x7f7f7f);
    const textureWidth = options.textureWidth || 512;
    const textureHeight = options.textureHeight || 512;
    this.clipBias = options.clipBias || 0;
    const shader = options.shader || RefractorShader;
    const multisample =
      options.multisample !== undefined ? options.multisample : 4; //
    this.virtualCamera = this.camera;
    this.virtualCamera.matrixAutoUpdate = false;
    this.virtualCamera.userData.refractor = true; //
    this.refractorPlane = new Plane();
    this.textureMatrix = new Matrix4(); // render target

    this.renderTarget = new WebGLRenderTarget(textureWidth, textureHeight, {
      samples: multisample,
      type: HalfFloatType,
    }); // material

    this.material = new ShaderMaterial({
      uniforms: UniformsUtils.clone(shader.uniforms),
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader,
      transparent: true, // ensures, refractors are drawn from farthest to closest
    });
    (this.material as ShaderMaterial).uniforms["color"].value = color;
    (this.material as ShaderMaterial).uniforms["tDiffuse"].value =
      this.renderTarget.texture;
    (this.material as ShaderMaterial).uniforms["textureMatrix"].value =
      this.textureMatrix; // functions

    // This will update the texture matrix that is used for projective texture mapping in the shader.
    // see: http://developer.download.nvidia.com/assets/gamedev/docs/projective_texture_mapping.pdf
  }
  dispose() {
    this.renderTarget.dispose();
    (this.material as RawShaderMaterial).dispose();
  }
  // visible() {
  //   this.refractorWorldPosition.setFromMatrixPosition(this.matrixWorld);
  //   this.cameraWorldPosition.setFromMatrixPosition(this.camera.matrixWorld);
  //   this.view.subVectors(this.refractorWorldPosition, this.cameraWorldPosition);
  //   this.rotationMatrix.extractRotation(this.matrixWorld);
  //   this.normal.set(0, 1, 0);
  //   this.normal.applyMatrix4(this.rotationMatrix);
  //   return this.view.dot(this.normal) < 0;
  // }
  render(renderer: WebGLRenderer, scene: Object3D) {
    this.visible = false;
    const currentRenderTarget = renderer.getRenderTarget();
    const currentXrEnabled = renderer.xr.enabled;
    const currentShadowAutoUpdate = renderer.shadowMap.autoUpdate;
    const currentOutputEncoding = renderer.outputEncoding;
    const currentToneMapping = renderer.toneMapping;
    renderer.xr.enabled = false; // avoid camera modification

    renderer.shadowMap.autoUpdate = false; // avoid re-computing shadows

    //renderer.outputEncoding = THREE.LinearEncoding;
    renderer.toneMapping = ACESFilmicToneMapping; //THREE.NoToneMapping;
    renderer.setRenderTarget(this.renderTarget);
    if (renderer.autoClear === false) renderer.clear();
    renderer.render(scene, this.virtualCamera);
    renderer.xr.enabled = currentXrEnabled;
    renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;
    renderer.outputEncoding = currentOutputEncoding;
    renderer.toneMapping = currentToneMapping;
    renderer.setRenderTarget(currentRenderTarget); // restore viewport

    // const viewport = camera.viewport;

    // if (viewport !== undefined) {
    //   renderer.state.viewport(viewport);
    // }

    this.visible = true;
  } //
  updateTextureMatrix(camera: PerspectiveCamera, mesh?: Mesh) {
    // this matrix does range mapping to [ 0, 1 ]
    this.textureMatrix.set(
      0.5,
      0.0,
      0.0,
      0.5,
      0.0,
      0.5,
      0.0,
      0.5,
      0.0,
      0.0,
      0.5,
      0.5,
      0.0,
      0.0,
      0.0,
      1.0
    ); // we use "Object Linear Texgen", so we need to multiply the texture matrix T
    // (matrix above) with the projection and view matrix of the virtual camera
    // and the model matrix of the refractor

    this.textureMatrix.multiply(camera.projectionMatrix);
    this.textureMatrix.multiply(camera.matrixWorldInverse);
    this.textureMatrix.multiply(mesh ? mesh.matrixWorld : this.matrixWorld);
  }
  updateVirtualCamera(camera: PerspectiveCamera) {
    this.virtualCamera.matrixWorld.copy(camera.matrixWorld);
    this.virtualCamera.matrixWorldInverse
      .copy(this.virtualCamera.matrixWorld)
      .invert();
    this.virtualCamera.projectionMatrix.copy(camera.projectionMatrix);
    this.virtualCamera.far = camera.far; // used in WebGLBackground
    // The following code creates an oblique view frustum for clipping.
    // see: Lengyel, Eric. “Oblique View Frustum Depth Projection and Clipping”.
    // Journal of Game Development, Vol. 1, No. 2 (2005), Charles River Media, pp. 5–16

    this.clipPlane.copy(this.refractorPlane);
    this.clipPlane.applyMatrix4(this.camera.matrixWorldInverse);
    this.clipVector.set(
      this.clipPlane.normal.x,
      this.clipPlane.normal.y,
      this.clipPlane.normal.z,
      this.clipPlane.constant
    ); // calculate the clip-space corner point opposite the clipping plane and
    // transform it into camera space by multiplying it by the inverse of the projection matrix

    const projectionMatrix = this.camera.projectionMatrix;
    this.q.x =
      (Math.sign(this.clipVector.x) + projectionMatrix.elements[8]) /
      projectionMatrix.elements[0];
    this.q.y =
      (Math.sign(this.clipVector.y) + projectionMatrix.elements[9]) /
      projectionMatrix.elements[5];
    this.q.z = -1.0;
    this.q.w =
      (1.0 + projectionMatrix.elements[10]) / projectionMatrix.elements[14]; // calculate the scaled plane vector

    this.clipVector.multiplyScalar(2.0 / this.clipVector.dot(this.q)); // replacing the third row of the projection matrix

    projectionMatrix.elements[2] = this.clipVector.x;
    projectionMatrix.elements[6] = this.clipVector.y;
    projectionMatrix.elements[10] = this.clipVector.z + 1.0 - this.clipBias;
    projectionMatrix.elements[14] = this.clipVector.w;
  }
  updateRefractorPlane(inverse: boolean) {
    // return inverse => {
    this.matrixWorld.decompose(this.Position, this.Quaternion, this.Scale);
    this.Normal.set(0, 1, 0).applyQuaternion(this.Quaternion).normalize(); // flip the normal because we want to cull everything above the plane

    if (!inverse) {
      this.Normal.negate();
    }
    this.refractorPlane.setFromNormalAndCoplanarPoint(
      this.Normal,
      this.Position
    );
    // }
  }
  onBeforeRendered(
    renderer: WebGLRenderer,
    scene: Object3D,
    camera: PerspectiveCamera,
    inverse: boolean
  ) {
    // ensure refractors are rendered only once per frame
    // if (false && camera.userData.refractor === true) return // avoid rendering when the refractor is viewed from behind

    // if (false && !this.visibleTest()(camera) === true) return // update

    this.updateRefractorPlane(inverse);
    this.updateTextureMatrix(camera);
    this.updateVirtualCamera(camera);
    this.render(renderer, scene);
  }
  getRenderTarget() {
    return this.renderTarget;
  }
}

export default Refractor;
