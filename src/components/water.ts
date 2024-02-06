import {
  BackSide,
  FrontSide,
  Matrix4,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  RawShaderMaterial,
  Texture,
  WebGLRenderer,
} from "three";
// import { loadFile } from "../utils";
import vertexShader from "@/assets/shaders/water/vertex.glsl";
import fragmentShader from "@/assets/shaders/water/fragment.glsl";
import Refractor from "./Refractor";
import { causticsLight, waterCenter, waterRadius } from "./caustics";

class Water {
  // geometry = new PlaneGeometry(2, 2, 200, 200);
  //   loaded: Promise<void>;
  material: RawShaderMaterial | null = null;
  mesh: Mesh<PlaneGeometry, RawShaderMaterial> | null = null;
  textureMatrix = new Matrix4();
  geometry = new PlaneGeometry(2.0, 2.0, 256, 256);
  refractor = new Refractor(this.geometry, {
    textureWidth: 512,
    textureHeight: 512,
    clipBias: 0.011,
    color: 0x82bfda,
  });
  underwaterRefractor = new Refractor(this.geometry, {
    textureWidth: 512,
    textureHeight: 512,
    clipBias: 0.011,
    color: 0x82bfda,
  });

  constructor() {
    this.refractor.matrixAutoUpdate = false;
    this.underwaterRefractor.matrixAutoUpdate = false;
    this.material = new RawShaderMaterial({
      uniforms: {
        light: { value: causticsLight },
        tiles: { value: null },
        refractMap: { value: this.refractor.getRenderTarget().texture },
        reflectMap: { value: null },
        sky: { value: null },
        water: { value: null },
        causticTex: { value: null },
        underwater: { value: false },
        biasHeight: { value: 0.0 },
        waterCenter: { value: waterCenter },
        waterRadius: { value: waterRadius },
        modelMatrix: { value: null },
        textureMatrix: { value: this.textureMatrix },
      },
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
    });

    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.position.x = 0.0;
    this.mesh.scale.x = waterRadius;
    this.mesh.scale.y = waterRadius;
    this.mesh.scale.z = waterRadius;
  }

  draw(
    renderer: WebGLRenderer,
    waterTexture: Texture,
    causticsTexture: Texture,
    camera: PerspectiveCamera,
    biasHeight: number
  ) {
    if (!this.material || !this.mesh) return;
    this.material.uniforms["modelMatrix"].value = this.mesh!.matrixWorld;
    this.material.uniforms["water"].value = waterTexture;
    this.material.uniforms["causticTex"].value = causticsTexture;
    this.material.uniforms["biasHeight"].value = biasHeight;
    this.material.uniforms["textureMatrix"].value = this.textureMatrix;
    this.material.uniforms["refractMap"].value =
      this.underwaterRefractor.getRenderTarget().texture;
    this.material.side = FrontSide;
    this.material.uniforms["underwater"].value = true;
    renderer.render(this.mesh!, camera);

    this.material.side = BackSide;
    this.material.uniforms["underwater"].value = false;
    this.material.uniforms["refractMap"].value =
      this.refractor.getRenderTarget().texture;
    renderer.render(this.mesh!, camera);
  }

  updateTextureMatrix(camera: PerspectiveCamera, matrixWorld: Matrix4) {
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
    this.textureMatrix.multiply(matrixWorld);
  }
  updatePosition(biasHeight: number) {
    this.mesh!.position.x = waterCenter.x;
    this.mesh!.position.y = waterCenter.y - biasHeight;
    this.mesh!.position.z = waterCenter.z;
  }
}

export default Water;
