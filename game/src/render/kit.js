// Models are data, not code. The asset files list every figure, weapon and street prop as boxes, cylinders,
// spheres, capsules and cones hung on named bones; this reads it and bakes each bone's parts into one mesh
// with vertex colours, so a figure of forty parts is a dozen draw calls and a pose is a few bone rotations.
//
//   @ name                       starts a model
//   > bone parent x y z          a bone, placed in its parent's space ('-' for the root)
//   b|c|s|k|n w h d  x y z  rx ry rz  #colour     a box, cylinder, sphere, capsule or cone on the last bone
import * as THREE from 'three';

const SHAPES = {
  b: (w, h, d) => new THREE.BoxGeometry(w, h, d),
  c: (w, h, d) => new THREE.CylinderGeometry(w / 2, d / 2, h, 12),
  s: (w, h, d) => new THREE.SphereGeometry(0.5, 14, 10).scale(w, h, d),
  k: (w, h) => new THREE.CapsuleGeometry(w / 2, h, 4, 10),
  n: (w, h) => new THREE.ConeGeometry(w / 2, h, 10),
};

/** A BufferGeometry from flat arrays named by attribute: uv in pairs, the rest in triples. */
export function geometry(arrays) {
  const g = new THREE.BufferGeometry();
  for (const k in arrays) g.setAttribute(k, new THREE.Float32BufferAttribute(arrays[k], k === 'uv' ? 2 : 3));
  return g;
}

export async function loadKit(urls) {
  const texts = await Promise.all(urls.map((url) => fetch(url).then((r) => r.text())));
  const models = {}, place = new THREE.Object3D(), tint = new THREE.Color();
  let model = null, bone = null;
  for (const line of texts.join('\n').split('\n')) {
    const f = line.trim().split(/\s+/);
    if (f[0] === '@') model = models[f[1]] = [];
    else if (f[0] === '>') model.push(bone = { name: f[1], parent: f[2], x: +f[3] || 0, y: +f[4] || 0, z: +f[5] || 0, position: [], normal: [], color: [], geo: null });
    else if (SHAPES[f[0]]) {
      const g = SHAPES[f[0]](+f[1], +f[2], +f[3]).toNonIndexed();
      place.position.set(+f[4], +f[5], +f[6]); place.rotation.set(+f[7], +f[8], +f[9]); place.updateMatrix();
      g.applyMatrix4(place.matrix);
      tint.set(f[10]);
      for (const v of g.attributes.position.array) bone.position.push(v);
      for (const v of g.attributes.normal.array) bone.normal.push(v);
      for (let i = 0; i < g.attributes.position.count; i++) bone.color.push(tint.r, tint.g, tint.b);
    }
  }
  for (const name in models) for (const b of models[name]) if (b.color.length) b.geo = geometry({ position: b.position, normal: b.normal, color: b.color });
  return {
    /** One copy of a model: a group per bone, parented as the kit says, sharing the baked geometry. Returns
     *  the bones by name; the first bone is also returned as `root`. */
    build(name, material, shadow = true) {
      const bones = {};
      for (const b of models[name]) {
        const o = bones[b.name] = new THREE.Group();
        o.position.set(b.x, b.y, b.z);
        if (b.geo) { const m = new THREE.Mesh(b.geo, material); m.castShadow = shadow; o.add(m); }
        if (bones[b.parent]) bones[b.parent].add(o); else bones.root = o;
      }
      return bones;
    },
  };
}
