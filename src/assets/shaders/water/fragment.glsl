precision highp float;
precision highp int;

#include "../utils.glsl"

uniform float underwater;
uniform sampler2D refractMap;
uniform sampler2D reflectMap;

varying vec3 eye;
varying vec3 worldPos;
varying vec4 vCoord;

vec3 getSurfaceRayColor(vec3 origin, vec3 ray, vec3 waterColor) {
  vec3 color;

  if(ray.y < 0.0) {
    vec2 t = intersectCube(origin, ray, vec3(-1.0, -poolHeight, -1.0), vec3(1.0, 2.0, 1.0));
    //vec2 t = intersectSphere(origin, ray, vec3(0.0, 0.0,0.0), 1.0);
    color = getWallColor(origin + ray * t.y);
  } else {
    vec2 t = intersectCube(origin, ray, vec3(-1.0, -poolHeight, -1.0), vec3(1.0, 2.0, 1.0));
    //vec2 t = intersectSphere(origin, ray, vec3(0.0, 0.0,0.0), 1.0);
    vec3 hit = origin + ray * t.y;
    if(hit.y < 7.0 / 12.0) {
      color = getWallColor(hit);
    } else {
      //color = getWallColor(hit);
      color = textureCube(sky, ray).rgb;
      color += 0.01 * vec3(pow(max(0.0, dot(light, ray)), 20.0)) * vec3(10.0, 8.0, 6.0);
    }
  }

  if(ray.y < 0.0)
    color *= waterColor;

  return color;
}

void main() {
  vec3 pos = worldPos - waterCenter;
  pos.y += biasHeight;
  vec2 coord = pos.xz * (1.0 / (waterRadius * 2.0)) + 0.5;
  vec4 info = texture2D(water, coord);

  /* make water look more "peaked" */
  for(int i = 0; i < 5; i++) {
    coord += info.ba * 0.005;
    info = texture2D(water, coord);
  }

  vec3 normal = vec3(info.b, sqrt(1.0 - dot(info.ba, info.ba)), info.a);
  vec3 incomingRay = normalize(pos - eye);
  if(underwater == 1.) {
    normal = -normal;
    vec3 reflectedRay = reflect(incomingRay, normal);
    vec3 refractedRay = refract(incomingRay, normal, IOR_WATER / IOR_AIR);
    float fresnel = 0.0;
    mix(0.5, 1.0, pow(1.0 - dot(normal, -incomingRay), 3.0));

    vec3 c = vCoord.xyz / vCoord.w;
    vec2 uv = c.xy + c.z * normal.xz * 1.0;

    //vec3 reflectedColor = texture2D(reflectMap, vec2(1.0- uv.x, uv.y)).rgb;//getSurfaceRayColor(pos, reflectedRay, underwaterColor);
    vec3 refractedColor = texture2D(refractMap, uv).rgb;//getSurfaceRayColor(pos, refractedRay, vec3(1.0)) * vec3(0.8, 1.0, 1.1);
    vec3 reflectedColor = refractedColor * 0.679;
    gl_FragColor = vec4(mix(reflectedColor, refractedColor, (1.0 - fresnel)), 1.0);
    gl_FragColor.rgb *= vec3(0.71, 0.86, 0.92);
    vec3 disVec = worldPos - waterCenter;
    float disToScope = sqrt(dot(disVec, disVec));
    if(disToScope > waterRadius) {
      discard;
    }
  } else {
    vec3 reflectedRay = reflect(incomingRay, normal);
    vec3 refractedRay = refract(incomingRay, normal, IOR_AIR / IOR_WATER);
    float fresnel = 0.0;
    mix(0.25, 1.0, pow(1.0 - dot(normal, -incomingRay), 3.0));

    vec3 c = vCoord.xyz / vCoord.w;
    vec2 uv = c.xy + c.z * normal.xz * 1.0;//0.05;
    vec3 reflectedColor = texture2D(reflectMap, vec2(1.0 - uv.x, uv.y)).rgb;//getSurfaceRayColor(pos, reflectedRay, abovewaterColor);
    vec3 refractedColor = texture2D(refractMap, uv).rgb;//getSurfaceRayColor(pos, refractedRay, abovewaterColor);

    gl_FragColor = vec4(mix(refractedColor, reflectedColor, fresnel), 1.0);
    // gl_FragColor.rgb *= vec3(0.75, 0.92, 0.96);
    vec3 disVec = worldPos - waterCenter;
    float disToScope = sqrt(dot(disVec, disVec));
    if(disToScope > waterRadius) {
      discard;
    }
  }
}
