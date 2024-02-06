import "./App.css";
import { Canvas } from "@react-three/fiber";
import Scene from "./Scene";
import { OrbitControls } from "@react-three/drei";
import { ACESFilmicToneMapping } from "three";

function App() {
  return (
    <>
      <Canvas
        className="w-screen h-screen"
        gl={{
          preserveDrawingBuffer: true,
          autoClear: false,
          antialias: true,
          alpha: true,
        }}
        camera={{
          fov: 75,
          near: 0.01,
          far: 120,
          position: [-10.26, 2.92, -2.86],
        }}
      >
        <ambientLight intensity={1} />
        <directionalLight color={0xfff} intensity={1}></directionalLight>
        {/* <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} /> */}
        <Scene></Scene>
        <OrbitControls></OrbitControls>
        {/* <mesh>
          <planeGeometry args={[1, 1]}></planeGeometry>
          <meshStandardMaterial color={"red"}></meshStandardMaterial>
        </mesh> */}
        {/* <Environment files={"./forest_slope_1k.hdr"} /> */}
      </Canvas>
    </>
  );
}

export default App;
