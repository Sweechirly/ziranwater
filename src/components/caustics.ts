import {
  OrthographicCamera,
  PlaneGeometry,
  Texture,
  WebGLRenderTarget,
  UnsignedByteType,
  Mesh,
  WebGLRenderer,
  Color,
  Vector3,
  ShaderMaterial,
} from "three";
// import { loadFile } from "../utils";
import vertexShader from "@/assets/shaders/caustics/vertex.glsl";
import fragmentShader from "@/assets/shaders/caustics/fragment.glsl";

export const causticsLight = [0.0, 1.0, 0.0];
export const waterCenter = new Vector3(-6.6, -0.3, 0.081273);
export const waterRadius = 6.6;

class Caustics {
  _camera = new OrthographicCamera(0, 1, 1, 0, 0, 2000);
  _geometry: PlaneGeometry;
  texture: WebGLRenderTarget;
  //   loaded: Promise<void>;
  _causticMesh: Mesh<PlaneGeometry, ShaderMaterial> | null = null;
  constructor(lightFrontGeometry: PlaneGeometry) {
    this._geometry = lightFrontGeometry;

    this.texture = new WebGLRenderTarget(1024, 1024, {
      type: UnsignedByteType,
    });

    // const shadersPromises = [
    //   loadFile("shaders/caustics/vertex.glsl"),
    //   loadFile("shaders/caustics/fragment.glsl"),
    // ];

    // this.loaded = Promise.all(shadersPromises).then(
    //   ([vertexShader, fragmentShader]) => {
    const material = new ShaderMaterial({
      uniforms: {
        light: { value: causticsLight },
        water: { value: null },
        biasHeight: { value: 0.0 },
        waterCenter: { value: waterCenter },
        waterRadius: { value: waterRadius },
      },
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
    });

    this._causticMesh = new Mesh(this._geometry, material);
    //   }
    // );
  }

  update(renderer: WebGLRenderer, waterTexture: Texture, biasHeight: number) {
    if (!this._causticMesh) return;
    this._causticMesh!.material.uniforms["water"].value = waterTexture;
    this._causticMesh.material.uniforms["biasHeight"].value = biasHeight;
    renderer.setRenderTarget(this.texture);
    renderer.setClearColor(new Color("black"), 0);
    renderer.clear();

    // TODO Camera is useless here, what should be done?
    renderer.render(this._causticMesh!, this._camera);
  }
}

export default Caustics;
