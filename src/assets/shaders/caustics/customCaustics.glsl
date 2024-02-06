const float IOR_AIR = 1.0;
const float IOR_WATER = 1.333;
const vec3 light = vec3(0.0, 1.0, 0.0);
const vec3 waterColor = vec3(0.53, 0.72, 0.85);//vec3(0.63, 0.82, 0.95);
uniform sampler2D causticTex;
uniform sampler2D water;
uniform vec3 waterCenter;
uniform float waterRadius;
uniform float biasHeight;
varying vec3 vWorldPosition;

vec4 sampleWaterTexture(vec2 uv) {
    vec4 waterInfo = texture2D(water, uv * (1.0 / (waterRadius * 2.0)) + 0.5);
    waterInfo.r -= biasHeight;
    return waterInfo;
}

vec3 getCausticsScale(vec3 pos, vec3 vNormal) {
    vec3 scale = vec3(1., 1., 1.);
    vec3 point = pos - waterCenter;
    vec3 normal = normalize(vNormal);
  /* caustics */
    vec3 lightNormalized = normalize(light);
    vec3 refractedLight = -refract(-lightNormalized, vec3(0.0, 1.0, 0.0), IOR_AIR / IOR_WATER);
    vec4 info = sampleWaterTexture(point.xz);
  //float rk = sqrt(waterRadius * waterRadius - biasHeight* biasHeight);
    if(point.y < info.r) {
        vec4 caustic = texture2D(causticTex, 0.8 * (point.xz - point.y * refractedLight.xz / refractedLight.y) * (1.0 / (waterRadius * 2.0)) + 0.5);
        scale *= 0.4 + caustic.r * 4.0 * caustic.g;
        scale *= waterColor;
    }

    return scale;
}