import { test } from "node:test";
import assert from "node:assert/strict";
import { freeHours, unionIntervals } from "../src/services/capacityService.js";
const hour = 3600000;
test("capacity unions availability and overlapping reservations without double counting", () => {
  assert.deepEqual(
    unionIntervals([
      [0, 3],
      [2, 4],
      [8, 9],
      [9, 10],
    ]),
    [
      [0, 4],
      [8, 10],
    ],
  );
  assert.equal(
    freeHours(
      [
        [0, 8 * hour],
        [2 * hour, 6 * hour],
      ],
      [
        [hour, 3 * hour],
        [2 * hour, 4 * hour],
      ],
      0,
      8 * hour,
    ),
    5,
  );
  assert.equal(freeHours([], [], 0, 8 * hour), 0);
  assert.equal(freeHours([[0, 8 * hour]], [[0, 10 * hour]], 0, 8 * hour), 0);
  assert.equal(freeHours([[0, 8 * hour]], [], 2 * hour, 6 * hour), 4);
});
