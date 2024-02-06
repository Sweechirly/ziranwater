import { useGLTF } from "@react-three/drei";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import WaterSimulation from "./components/waterSimulation";
import Water from "./components/water";
import {
  AmbientLight,
  DirectionalLight,
  PMREMGenerator,
  PerspectiveCamera,
} from "three";
import Caustics from "./components/caustics";
import { useMemo, useRef } from "react";
import { transverseGLTF, customUniforms } from "./utils";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader";

// const waterCenter = new Vector3(0, 0, 0);
const waterRadius = 6.6;

function lerp(leftNum: number, rightNum: number, controlK: number) {
  return leftNum * (1 - controlK) + rightNum * controlK;
}

const Scene = () => {
  const ballMesh = useGLTF("./cang_fix.glb").scene;
  const texture = useLoader(RGBELoader, "./forest_slope_1k.hdr");

  const { gl } = useThree();
  const pmremGenerator = new PMREMGenerator(gl);
  const hdrPMREMRenderTarget = pmremGenerator.fromEquirectangular(texture);
  transverseGLTF(ballMesh, hdrPMREMRenderTarget.texture);
  const directionalLight = new DirectionalLight(0xffffff, 1.0);
  const ambientLight = new AmbientLight(0xffffff, 1);
  ballMesh.add(ambientLight);
  ballMesh.add(directionalLight);

  const water = useMemo(() => new Water(), []);
  const waterSimulation = useMemo(() => new WaterSimulation(), []);
  const caustics = useMemo(() => new Caustics(water.geometry), [water]);
  // const texture = new TextureLoader().load("tiles.jpg");
  const frameCount = useRef(0);
  const updateCount = 60;

  const time = useRef(0);
  const biasHeight = useRef(1);
  const loopTime = 10.0;
  useFrame(({ gl, camera }, delta) => {
    if (frameCount.current % updateCount === 0) {
      const lastSin = Math.sin(time.current / loopTime);
      const currtSin = Math.sin(time.current / loopTime);
      let dropS = lerp(0.01, 0.001, Math.abs(biasHeight.current / waterRadius));
      dropS = biasHeight.current > -0.8 * waterRadius ? dropS : 0.0;
      if (currtSin > lastSin) {
        dropS = -dropS;
      }
      waterSimulation.addDrop(
        gl,
        Math.random() * 0.1,
        Math.random() * 0.1,
        lerp(0.03, 0.005, Math.abs(biasHeight.current / waterRadius)),
        dropS
      );
    }
    frameCount.current = frameCount.current + 1;

    biasHeight.current = Math.sin(time.current * 0.25 * 0.75) * waterRadius;
    time.current += delta;
    water.updatePosition(biasHeight.current);

    // water.mesh!.position.x = -3;
    waterSimulation.updateBiasHeight(biasHeight.current);
    waterSimulation.stepSimulation(gl);
    waterSimulation.updateNormals(gl);

    const waterTexture = waterSimulation.texture.texture;

    caustics.update(gl, waterTexture, biasHeight.current);

    const causticsTexture = caustics.texture.texture;
    customUniforms["water"].value = waterTexture;
    customUniforms["causticTex"].value = causticsTexture;
    customUniforms["biasHeight"].value = biasHeight.current;
    water.updateTextureMatrix(
      camera as PerspectiveCamera,
      water.mesh!.matrixWorld
    );
    water.updateTextureMatrix.bind(water.refractor)(
      camera as PerspectiveCamera,
      water.refractor.matrixWorld
    );
    water.refractor.matrixWorld.copy(water.mesh!.matrixWorld);
    water.underwaterRefractor.matrixWorld.copy(water.mesh!.matrixWorld);

    if (ballMesh) {
      water.underwaterRefractor.onBeforeRendered(
        gl,
        ballMesh,
        camera as PerspectiveCamera,
        true
      );
      water.refractor.onBeforeRendered(
        gl,
        ballMesh,
        camera as PerspectiveCamera,
        false
      );
    }

    gl.setRenderTarget(null);
    gl.clear();
    // if (ballMesh) {
    //   gl.render(ballMesh, camera);
    // }
    water.draw(
      gl,
      waterTexture,
      causticsTexture,
      camera as PerspectiveCamera,
      biasHeight.current
    );
  });

  return (
    <>
      <primitive object={ballMesh}></primitive>
    </>
  );
};

export default Scene;
