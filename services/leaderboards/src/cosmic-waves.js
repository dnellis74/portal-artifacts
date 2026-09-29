// Generated from studies/cosmic-carnival/src/game/waves.ts by the game build.
const fixedWaves = [
    [
        [0.4, "prism", 0], [1.5, "prism", 4], [2.6, "prism", 8],
        [3.8, "prism", 2], [5.0, "prism", 10], [6.1, "prism", 6],
    ],
    [
        [0.3, "prism", 1], [1.2, "prism", 7], [2.2, "ribbon", 4],
        [3.5, "prism", 10], [4.3, "ribbon", 1], [5.6, "prism", 6], [6.7, "ribbon", 9],
    ],
    [
        [0.3, "prism", 0], [1.1, "ribbon", 5], [2.2, "jester", 9],
        [3.6, "prism", 3], [4.4, "ribbon", 11], [5.5, "jester", 6],
        [6.8, "prism", 2], [7.6, "ribbon", 8],
    ],
    [
        [0.3, "ribbon", 0], [1.0, "prism", 6], [1.9, "jester", 3],
        [2.9, "ribbon", 9], [3.8, "prism", 1], [4.6, "prism", 7],
        [5.6, "jester", 11], [6.8, "ribbon", 4], [7.8, "prism", 8],
    ],
    [
        [0.3, "jester", 0], [1.2, "ribbon", 4], [2.0, "ribbon", 8],
        [2.9, "prism", 2], [3.7, "prism", 10], [4.7, "jester", 6],
        [5.8, "ribbon", 1], [6.6, "prism", 5], [7.4, "ribbon", 9], [8.4, "jester", 3],
    ],
    [
        [0.3, "prism", 0], [0.95, "ribbon", 6], [1.7, "jester", 3],
        [2.55, "prism", 9], [3.25, "ribbon", 1], [4.0, "jester", 7],
        [4.9, "prism", 11], [5.6, "ribbon", 5], [6.4, "prism", 2],
        [7.15, "jester", 8], [8.1, "ribbon", 4], [8.9, "prism", 10],
    ],
].map((wave) => wave.map(([at, kind, lane]) => ({
    at: at,
    kind: kind,
    lane: lane,
})));
function mulberry32(seed) {
    return () => {
        let t = seed += 0x6d2b79f5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
export function waveSchedule(wave) {
    if (wave <= fixedWaves.length)
        return fixedWaves[wave - 1].map((item) => ({ ...item }));
    const random = mulberry32(0xc05c1c + wave * 7919);
    const count = Math.min(8 + wave, 22);
    const spacing = Math.max(0.52, 1.05 - wave * 0.035);
    let at = 0.25;
    const result = [];
    let previousLane = -3;
    for (let index = 0; index < count; index += 1) {
        const roll = random();
        const jesterChance = Math.min(0.33, 0.08 + wave * 0.025);
        const ribbonChance = Math.min(0.42, 0.2 + wave * 0.02);
        const kind = roll < jesterChance ? "jester" : roll < jesterChance + ribbonChance ? "ribbon" : "prism";
        let lane = Math.floor(random() * 12);
        if (lane === previousLane && random() < 0.75)
            lane = (lane + 3 + Math.floor(random() * 6)) % 12;
        result.push({ at, kind, lane });
        previousLane = lane;
        at += spacing + random() * 0.36;
    }
    return result;
}
