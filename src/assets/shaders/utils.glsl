const float IOR_AIR = 1.0;
const float IOR_WATER = 1.333;
const float PI = 3.1415926;

const vec3 abovewaterColor = vec3(0.25, 1.0, 1.25);
const vec3 underwaterColor = vec3(0.4, 0.9, 1.0);

const float poolHeight = 1.0;

uniform vec3 light;
uniform vec3 waterCenter;
uniform float waterRadius;
uniform float biasHeight;
uniform sampler2D tiles;
uniform sampler2D causticTex;
uniform sampler2D water;
uniform samplerCube sky;


vec2 intersectCube(vec3 origin, vec3 ray, vec3 cubeMin, vec3 cubeMax) {
  vec3 tMin = (cubeMin - origin) / ray;
  vec3 tMax = (cubeMax - origin) / ray;
  vec3 t1 = min(tMin, tMax);
  vec3 t2 = max(tMin, tMax);
  float tNear = max(max(t1.x, t1.y), t1.z);
  float tFar = min(min(t2.x, t2.y), t2.z);
  return vec2(tNear, tFar);
}

vec2 intersectSphere(vec3 origin, vec3 ray, vec3 sphereCenter, float radius) {
    vec3 oc = origin - sphereCenter;
    float a = dot(ray, ray);
    float b = 2.0 * dot(oc, ray);
    float c = dot(oc, oc) - radius * radius;
    float discriminant = b * b - 4.0 * a * c;

    if (discriminant < 0.0) {
        return vec2(-1.0, -1.0); // No intersection
    }

    float t1 = (-b - sqrt(discriminant)) / (2.0 * a);
    float t2 = (-b + sqrt(discriminant)) / (2.0 * a);
    return vec2(t1, t2); // Returns the two intersection points
}

bool intersectRaySphere(vec3 rayOrigin, vec3 rayDir, vec3 sphereCenter, float sphereRadius, out vec3 intersection) {
    vec3 toSphere = rayOrigin - sphereCenter;
    float a = dot(rayDir, rayDir);
    float b = 2.0 * dot(toSphere, rayDir);
    float c = dot(toSphere, toSphere) - sphereRadius * sphereRadius;

    float discriminant = b * b - 4.0 * a * c;
    if (discriminant < 0.0) {
        return false;
    }

    float sqrtDiscriminant = sqrt(discriminant);
    float t1 = (-b - sqrtDiscriminant) / (2.0 * a);
    float t2 = (-b + sqrtDiscriminant) / (2.0 * a);

    float t = min(t1, t2);
    if (t < 0.0) t = max(t1, t2);
    if (t < 0.0) return false;

    intersection = rayOrigin + t * rayDir;
    return true;
}

vec2 cartesianToSpherical(vec3 point) {
    float longitude = atan(point.y, point.x);
    float latitude = acos(point.z / length(point));
    return vec2(latitude, longitude);
}

vec2 transformSphericalToTextureCoords(vec2 sphericalCoords) {
    float u = sphericalCoords.y / (2.0 * PI) + 0.5;
    float v = sphericalCoords.x / PI;
    return vec2(u, v);
}





vec4 sampleWaterTexture(vec2 uv) {
  vec4 waterInfo = texture2D(water, uv * 0.5 + 0.5);
  waterInfo.r -= biasHeight;
  return waterInfo;
}


vec3 getWallColor(vec3 point) {
  float scale = 0.5;

  vec3 wallColor;
  vec3 normal;
  if (abs(point.x) > 0.999) {
    wallColor = texture2D(tiles, point.yz * 0.5 + vec2(1.0, 0.5)).rgb;
    normal = vec3(-point.x, 0.0, 0.0);
  } else if (abs(point.z) > 0.999) {
    wallColor = texture2D(tiles, point.yx * 0.5 + vec2(1.0, 0.5)).rgb;
    normal = vec3(0.0, 0.0, -point.z);
  } else {
    wallColor = texture2D(tiles, point.xz * 0.5 + 0.5).rgb;
    normal = vec3(0.0, 1.0, 0.0);
  }
  // vec3 ballCenter = vec3(0.0,0.0,0.0);
  // normal = ballCenter - point;
  // wallColor = normal * 0.5 + 0.5;
  scale /= length(point); /* pool ambient occlusion */

  /* caustics */
  vec3 refractedLight = -refract(-light, vec3(0.0, 1.0, 0.0), IOR_AIR / IOR_WATER);
  float diffuse = max(0.0, dot(refractedLight, normal));
  vec4 info = sampleWaterTexture(point.xz);
  if (point.y < info.r) {
    vec4 caustic = texture2D(causticTex, 0.75 * (point.xz - point.y * refractedLight.xz / refractedLight.y) * 0.5 + 0.5);
    scale += diffuse * caustic.r * 1.0 * caustic.g;
  } else {
    /* shadow for the rim of the pool */
    vec2 t = intersectCube(point, refractedLight, vec3(-1.0, -poolHeight, -1.0), vec3(1.0, 2.0, 1.0));
    diffuse *= 1.0 / (1.0 + exp(-200.0 / (1.0 + 10.0 * (t.y - t.x)) * (point.y + refractedLight.y * t.y - 2.0 / 12.0)));

    scale += diffuse * 0.5;
  }

  return wallColor * scale;
}

vec4 getWallColorWithNormal(vec3 point, vec3 vNormal) {
  float scale = 0.5;
  float a = 0.0;

  vec3 wallColor;
  vec3 normal = vNormal;
  if (abs(point.x) > 0.999) {
    wallColor = texture2D(tiles, point.yz * 0.5 + vec2(1.0, 0.5)).rgb;
    //normal = vec3(-point.x, 0.0, 0.0);
  } else if (abs(point.z) > 0.999) {
    wallColor = texture2D(tiles, point.yx * 0.5 + vec2(1.0, 0.5)).rgb;
    //normal = vec3(0.0, 0.0, -point.z);
  } else {
    wallColor = texture2D(tiles, point.xz * 0.5 + 0.5).rgb;
    //normal = vec3(0.0, 1.0, 0.0);
  }
  //wallColor = vec3(1,1,1);

  //scale /= length(point); /* pool ambient occlusion */

  /* caustics */
  vec3 refractedLight = -refract(-light, vec3(0.0, 1.0, 0.0), IOR_AIR / IOR_WATER);
  float diffuse = 1.0;// max(0.0, dot(refractedLight, normal));
  vec4 info = sampleWaterTexture(point.xz);
  float rk = sqrt(waterRadius * waterRadius - biasHeight* biasHeight);
  if ( point.y < info.r) {
    vec4 caustic = texture2D(causticTex, 0.7*(point.xz - point.y  * refractedLight.xz / refractedLight.y) * 0.5 + 0.5);
    scale += diffuse * caustic.r * 1.5 * caustic.g;
    a = 1.0;
  } else {
    /* shadow for the rim of the pool */
    //vec2 t = intersectCube(point, refractedLight, vec3(-1.0, -poolHeight, -1.0), vec3(1.0, 2.0, 1.0));
    //vec2 t = intersectSphere(point, refractedLight, vec3(0.0, 0.0,0.0), 1.0);
    //diffuse *= 1.0 / (1.0 + exp(-200.0 / (1.0 + 10.0 * (t.y - t.x)) * (point.y + refractedLight.y * t.y - 2.0 / 12.0)));
    scale += diffuse * 0.5;
    a= 1.0;
  }

  return vec4(wallColor * scale,a);
}
