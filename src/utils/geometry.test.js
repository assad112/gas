const test = require("node:test");
const assert = require("node:assert/strict");

const {
  parsePolygonInput,
  pointInPolygon,
  computeCentroid,
  distanceMetersToPolyline
} = require("./geometry");

test("parsePolygonInput accepts point arrays and closes the ring", () => {
  const polygon = parsePolygonInput([
    { latitude: 23.6, longitude: 58.3 },
    { latitude: 23.7, longitude: 58.3 },
    { latitude: 23.7, longitude: 58.4 }
  ]);

  assert.ok(Array.isArray(polygon));
  assert.equal(polygon.length, 4);
  assert.deepEqual(polygon[0], polygon[polygon.length - 1]);
});

test("parsePolygonInput accepts GeoJSON polygon coordinates", () => {
  const polygon = parsePolygonInput({
    type: "Polygon",
    coordinates: [
      [
        [58.3, 23.6],
        [58.4, 23.6],
        [58.4, 23.7],
        [58.3, 23.6]
      ]
    ]
  });

  assert.ok(Array.isArray(polygon));
  assert.equal(polygon.length, 4);
  assert.deepEqual(polygon[0], { latitude: 23.6, longitude: 58.3 });
});

test("pointInPolygon returns true for points inside the polygon", () => {
  const polygon = [
    { latitude: 23.6, longitude: 58.3 },
    { latitude: 23.8, longitude: 58.3 },
    { latitude: 23.8, longitude: 58.5 },
    { latitude: 23.6, longitude: 58.5 }
  ];

  assert.equal(
    pointInPolygon({ latitude: 23.7, longitude: 58.4 }, polygon),
    true
  );
  assert.equal(
    pointInPolygon({ latitude: 23.9, longitude: 58.4 }, polygon),
    false
  );
});

test("computeCentroid returns the mean center for simple polygons", () => {
  const centroid = computeCentroid([
    { latitude: 23.6, longitude: 58.3 },
    { latitude: 23.8, longitude: 58.3 },
    { latitude: 23.8, longitude: 58.5 },
    { latitude: 23.6, longitude: 58.5 }
  ]);

  assert.deepEqual(centroid, {
    latitude: 23.7,
    longitude: 58.4
  });
});

test("distanceMetersToPolyline returns near-zero distance for a point on the line", () => {
  const distance = distanceMetersToPolyline(
    { latitude: 23.7, longitude: 58.4 },
    [
      { latitude: 23.6, longitude: 58.3 },
      { latitude: 23.8, longitude: 58.5 }
    ]
  );

  assert.ok(distance !== null);
  assert.ok(distance < 10);
});
