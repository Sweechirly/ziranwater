// @ts-nocheck three的问题
import {
  Material,
  Object3D,
  Texture,
  WebGLProgramParametersWithUniforms,
  ShaderChunk,
} from "three";
import { waterCenter, waterRadius } from "./components/caustics";

const CustomCausticsShaderChunk = `
const float IOR_AIR = 1.0;
const float IOR_WATER = 1.333;
const vec3 light = vec3(0.0, 1.0, 0.1);
const vec3 waterColor = vec3(0.53, 0.72, 0.85);//vec3(0.63, 0.82, 0.95);
uniform sampler2D causticTex;
uniform sampler2D water;
uniform vec3 waterCenter;
uniform float waterRadius;
uniform float biasHeight;
varying vec3 vWorldPosition;
varying vec3 vWorldNormal;

vec4 sampleWaterTexture(vec2 uv) {
  vec4 waterInfo = texture2D(water, uv * (1.0 / (waterRadius * 2.0)) + 0.5);
  waterInfo.r -= biasHeight;
  return waterInfo;
}



vec3 getCausticsScale(vec3 pos, vec3 vNormal) {
  vec3 scale = vec3(1., 1., 1.);
  vec3 point = pos - waterCenter;
  vec3 normal = normalize(vNormal);
  vec4 info = sampleWaterTexture(point.xz);
  vec3 waterNormal = vec3(info.b, sqrt(1.0 - dot(info.ba, info.ba)), info.a);
  /* caustics */
  vec3 lightNormalized = normalize(light);
  vec3 refractedLight = -refract(-lightNormalized, waterNormal, IOR_AIR / IOR_WATER);
  float diffuse = max(0.0, dot(refractedLight, normal)) * 0.5;
  float rk = sqrt(waterRadius * waterRadius - biasHeight* biasHeight);
  if (point.y < info.r) {
    vec4 caustic = texture2D(causticTex, 0.75 * (point.xz - point.y  * refractedLight.xz / refractedLight.y) / (waterRadius * 2.0) + 0.5);
    scale += diffuse * caustic.r * 2.0 * caustic.g;
    scale *= waterColor;
  } 

  return scale;
}
`;

const customUniforms = {
  water: { value: new Texture() },
  causticTex: { value: new Texture() },
  waterCenter: { value: waterCenter },
  waterRadius: { value: waterRadius },
  biasHeight: { value: 0 },
};

ShaderChunk["customCaustics"] = CustomCausticsShaderChunk;

const transverseGLTF = (object: Object3D, texture: Texture) => {
  const processedMat = new Set();
  const copyMatMap = {};

  function injectCustomUniforms(material: Material) {
    material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
      Object.assign(shader.uniforms, customUniforms);
      shader.vertexShader =
        "varying vec3 vWorldPosition;\n" + shader.vertexShader;

      // Assign the world position in the vertex shader
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;"
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <common>",
        `#include <common>\n#include <customCaustics>`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <dithering_fragment>",
        "#include <dithering_fragment>\ngl_FragColor.rgb *= getCausticsScale(vWorldPosition, vNormal);"
      );
    };
  }

  object.traverse((child) => {
    if (child.isMesh && child.material) {
      if (
        child.parent.name === "innerBall" ||
        child.parent.parent.name === "innerBall"
      ) {
        const cloneMatName = child.material.name + "_cp";
        if (copyMatMap[cloneMatName] === undefined) {
          const cloneMat = child.material.clone();
          (child.material as Material).chunks;
          cloneMat.name = cloneMatName;
          injectCustomUniforms(cloneMat);
          copyMatMap[cloneMatName] = cloneMat;
          child.material = cloneMat;
        } else {
          child.material = copyMatMap[cloneMatName];
        }
      }
      if (!processedMat.has(child.material)) {
        //ldrCubeRenderTarget.texture;
        // child.material.envMap = hdrPMREMRenderTarget.texture;
        processedMat.add(child.material);
        child.material.envMap = texture;
      }
    }
  });
};

export { transverseGLTF, customUniforms };
