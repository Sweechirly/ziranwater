import {
  FloatType,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  RawShaderMaterial,
  ShaderMaterial,
  WebGLRenderTarget,
  WebGLRenderer,
} from "three";
// import { loadFile } from "../utils";
import vertexShader from "@/assets/shaders/simulation/vertex.glsl";
import dropFragmentShader from "@/assets/shaders/simulation/drop_fragment.glsl";
import normalFragmentShader from "@/assets/shaders/simulation/normal_fragment.glsl";
import updateFragmentShader from "@/assets/shaders/simulation/update_fragment.glsl";
import { waterRadius } from "./caustics";

class WaterSimulation {
  _camera: OrthographicCamera;
  _geometry: PlaneGeometry;
  _textureA: WebGLRenderTarget;
  _textureB: WebGLRenderTarget;
  texture: WebGLRenderTarget;
  //   loaded: Promise<void>;
  _dropMesh: Mesh<PlaneGeometry, RawShaderMaterial> | null = null;
  _normalMesh: Mesh<PlaneGeometry, RawShaderMaterial> | null = null;
  _updateMesh: Mesh<PlaneGeometry, RawShaderMaterial> | null = null;
  biasHeight = 0;

  constructor() {
    this._camera = new OrthographicCamera(0, 1, 1, 0, 0, 2000);

    this._geometry = new PlaneGeometry(2, 2);

    this._textureA = new WebGLRenderTarget(256, 256, { type: FloatType });
    this._textureB = new WebGLRenderTarget(256, 256, { type: FloatType });
    this.texture = this._textureA;

    const dropMaterial = new RawShaderMaterial({
      uniforms: {
        waterRadius: { value: waterRadius },
        center: { value: [0, 0] },
        radius: { value: 0 },
        strength: { value: 0 },
        texture: { value: null },
      },
      vertexShader: vertexShader,
      fragmentShader: dropFragmentShader,
    });

    const normalMaterial = new RawShaderMaterial({
      uniforms: {
        waterRadius: { value: waterRadius },
        delta: { value: [1 / 256, 1 / 256] }, // TODO: Remove this useless uniform and hardcode it in shaders?
        texture: { value: null },
      },
      vertexShader: vertexShader,
      fragmentShader: normalFragmentShader,
    });

    const updateMaterial = new RawShaderMaterial({
      uniforms: {
        waterRadius: { value: waterRadius },
        delta: { value: [1 / 256, 1 / 256] }, // TODO: Remove this useless uniform and hardcode it in shaders?
        texture: { value: null },
      },
      vertexShader: vertexShader,
      fragmentShader: updateFragmentShader,
    });

    this._dropMesh = new Mesh(this._geometry, dropMaterial);
    this._normalMesh = new Mesh(this._geometry, normalMaterial);
    this._updateMesh = new Mesh(this._geometry, updateMaterial);
    //   }
    // );
  }

  addDrop(
    renderer: WebGLRenderer,
    x: number,
    y: number,
    radius: number,
    strength: number
  ) {
    this._dropMesh!.material.uniforms["center"].value = [x, y];
    this._dropMesh!.material.uniforms["radius"].value = radius;
    this._dropMesh!.material.uniforms["strength"].value = strength;

    this._render(renderer, this._dropMesh!);
  }

  stepSimulation(renderer: WebGLRenderer) {
    this._render(renderer, this._updateMesh!);
  }

  updateNormals(renderer: WebGLRenderer) {
    this._render(renderer, this._normalMesh!);
  }

  updateBiasHeight(biasHeight: number) {
    this.biasHeight = biasHeight;
  }

  _render(renderer: WebGLRenderer, mesh: Mesh<PlaneGeometry, ShaderMaterial>) {
    // Swap textures
    const oldTexture = this.texture;
    const newTexture =
      this.texture === this._textureA ? this._textureB : this._textureA;

    mesh.material.uniforms["texture"].value = oldTexture.texture;
    renderer.setRenderTarget(newTexture);
    // console.log(this.biasHeight);
    const k = Math.sqrt(
      waterRadius * waterRadius - this.biasHeight * this.biasHeight
    );
    mesh.scale.x = k;
    mesh.scale.z = k;
    mesh.updateMatrix(); // Update the local matrix
    mesh.updateMatrixWorld();

    renderer.render(mesh, this._camera);

    this.texture = newTexture;
  }
}
export default WaterSimulation;
