const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeLatLngPoint,
  resolveTrafficProfile,
  toPublicRouteResponse
} = require("./trackingRouteService");

test("normalizeLatLngPoint reads common coordinate aliases", () => {
  assert.deepEqual(
    normalizeLatLngPoint({ lat: "23.6", lng: "58.3" }),
    {
      latitude: 23.6,
      longitude: 58.3
    }
  );
});

test("resolveTrafficProfile returns morning peak profile", () => {
  const profile = resolveTrafficProfile(new Date(2026, 3, 7, 7, 30, 0));
  assert.equal(profile.bucket, "morning_peak");
  assert.ok(profile.factor >= 1);
});

test("resolveTrafficProfile returns night profile", () => {
  const profile = resolveTrafficProfile(new Date(2026, 3, 7, 23, 30, 0));
  assert.equal(profile.bucket, "night");
});

test("toPublicRouteResponse exposes traffic-adjusted route metadata", () => {
  const response = toPublicRouteResponse({
    trackingRoute: {
      provider: "osrm",
      isFallback: false,
      points: [
        { latitude: 23.6, longitude: 58.3 },
        { latitude: 23.7, longitude: 58.4 }
      ],
      distanceMeters: 1500,
      durationSeconds: 300,
      trafficAdjustedSeconds: 360,
      etaMinutes: 6,
      trafficFactor: 1.2,
      trafficBucket: "midday",
      alternatives: [
        {
          points: [
            { latitude: 23.6, longitude: 58.3 },
            { latitude: 23.68, longitude: 58.38 }
          ],
          distanceMeters: 1700,
          durationSeconds: 340
        }
      ]
    }
  });

  assert.equal(response.provider, "osrm");
  assert.equal(response.distanceMeters, 1500);
  assert.equal(response.trafficAdjustedSeconds, 360);
  assert.equal(response.trafficBucket, "midday");
  assert.equal(response.alternatives.length, 1);
  assert.equal(response.points.length, 2);
});
