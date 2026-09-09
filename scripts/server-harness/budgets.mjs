const MIB = 1024 * 1024;

function maximum(values) {
  return values.length ? values.reduce((max, value) => Math.max(max, value), 0) : null;
}

function median(values) {
  if (!values.length) {
    return null;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function mib(bytes) {
  return `${(bytes / MIB).toFixed(2)} MiB`;
}

function validBytes(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function validTime(value) {
  return Number.isFinite(value) && value >= 0;
}

/**
 * Evaluate chronological samples from a single server process. requiredGames is
 * a positive integer count; expected game indices then run from 0 to count - 1.
 *
 * Every game's baseline is the original cold-idle RSS median. Its measured peak
 * includes game:N and cleanup:N RSS, plus lifetime high-water marks that first
 * increase inside those phases. A new idle high-water mark counts toward that
 * idle window's budget. An unchanged startup peak is never charged again.
 *
 * sampleMaxGapMs uses sample-start spacing and individual read durations, falling
 * back to timestamp when sampleStartedAt is unavailable. Unknown timing is
 * reported explicitly. This does not estimate an unsampled instantaneous peak.
 */
export function evaluateMemory(
  samples,
  { idleMiB = 100, gameMiB = 50, requiredGames } = {},
) {
  if (!Array.isArray(samples)) {
    throw new TypeError("samples must be an array");
  }
  if (!Number.isFinite(idleMiB) || idleMiB <= 0) {
    throw new TypeError("idleMiB must be a positive finite number");
  }
  if (!Number.isFinite(gameMiB) || gameMiB < 0) {
    throw new TypeError("gameMiB must be a nonnegative finite number");
  }
  if (
    requiredGames !== undefined &&
    (!Number.isSafeInteger(requiredGames) || requiredGames <= 0)
  ) {
    throw new TypeError("requiredGames must be a positive safe integer");
  }

  const violations = [];
  const limitations = [
    "RSS covers only the sampled server process, not child processes.",
    "An unchanged lifetime high-water mark cannot reveal a short game peak below an earlier process peak; sampled game peaks are lower bounds in that case.",
  ];
  const validSamples = [];
  const phaseSamples = new Map();
  const gameIndices = new Set();
  const attributedPeaks = new Map();
  const attributedIdlePeaks = new Map();
  let processLifetimePeakRssBytes = null;
  let priorLifetimePeak = null;
  let samplesWithoutLifetimePeak = 0;
  let samplesWithoutTiming = 0;
  let sampleMaxGapMs = null;
  let previousSampleStart = null;

  if (!samples.length) {
    violations.push("No memory samples were recorded.");
  }

  for (const [position, sample] of samples.entries()) {
    if (!sample || !validBytes(sample.rssBytes)) {
      violations.push(`Sample ${position} must contain a positive integer rssBytes.`);
      continue;
    }
    if (typeof sample.phase !== "string" || !sample.phase.trim()) {
      violations.push(`Sample ${position} is missing its phase.`);
      continue;
    }
    validSamples.push(sample);
    if (!phaseSamples.has(sample.phase)) {
      phaseSamples.set(sample.phase, []);
    }
    phaseSamples.get(sample.phase).push(sample);

    const match = /^(game|cleanup|idle):(\d+)$/.exec(sample.phase);
    const gameIndex = match ? Number(match[2]) : null;
    if (match) {
      if (!Number.isSafeInteger(gameIndex) || String(gameIndex) !== match[2]) {
        violations.push(`Sample ${position} contains an invalid game phase: ${sample.phase}.`);
      } else {
        gameIndices.add(gameIndex);
      }
    }

    if (sample.peakRssBytes === null || sample.peakRssBytes === undefined) {
      samplesWithoutLifetimePeak++;
    } else if (!validBytes(sample.peakRssBytes)) {
      violations.push(`Sample ${position} contains an invalid peakRssBytes.`);
    } else {
      const peak = sample.peakRssBytes;
      processLifetimePeakRssBytes = Math.max(processLifetimePeakRssBytes ?? 0, peak);
      if (
        priorLifetimePeak !== null &&
        peak > priorLifetimePeak
      ) {
        if (match && (match[1] === "game" || match[1] === "cleanup")) {
          attributedPeaks.set(gameIndex, Math.max(attributedPeaks.get(gameIndex) ?? 0, peak));
        } else if (sample.phase === "cold-idle" || match?.[1] === "idle") {
          attributedIdlePeaks.set(sample.phase, Math.max(attributedIdlePeaks.get(sample.phase) ?? 0, peak));
        }
      }
      priorLifetimePeak = Math.max(priorLifetimePeak ?? 0, peak);
    }

    const sampleStart = validTime(sample.sampleStartedAt)
      ? sample.sampleStartedAt
      : validTime(sample.timestamp)
        ? sample.timestamp
        : null;
    if (sampleStart === null) {
      samplesWithoutTiming++;
    } else {
      if (previousSampleStart !== null) {
        if (sampleStart < previousSampleStart) {
          limitations.push("Sample times moved backwards; reported sampling gaps may be incomplete.");
        } else {
          sampleMaxGapMs = Math.max(sampleMaxGapMs ?? 0, sampleStart - previousSampleStart);
        }
      }
      if (validTime(sample.timestamp) && sample.timestamp >= sampleStart) {
        sampleMaxGapMs = Math.max(sampleMaxGapMs ?? 0, sample.timestamp - sampleStart);
      }
      previousSampleStart = sampleStart;
    }
  }

  const coldIdle = phaseSamples.get("cold-idle") ?? [];
  const baselineRssBytes = median(coldIdle.map((sample) => sample.rssBytes));
  if (!coldIdle.length) {
    violations.push("Missing positive RSS samples for cold-idle.");
  }

  const observedIndices = [...gameIndices].sort((left, right) => left - right);
  if (!observedIndices.some((index) => phaseSamples.has(`game:${index}`))) {
    violations.push("No game phase was sampled.");
  }
  if (requiredGames !== undefined) {
    for (let index = 0; index < requiredGames; index++) {
      gameIndices.add(index);
    }
  } else {
    for (let position = 0; position < observedIndices.length; position++) {
      const expected = position === 0 ? 0 : observedIndices[position - 1] + 1;
      if (observedIndices[position] !== expected) {
        violations.push(`Game phases are incomplete: expected game:${expected} before game:${observedIndices[position]}.`);
      }
    }
  }

  const idlePhases = [...phaseSamples.entries()]
    .filter(([phase]) => phase === "cold-idle" || /^idle:\d+$/.test(phase))
    .map(([phase, readings]) => {
      const sampledPeakRssBytes = maximum(readings.map((sample) => sample.rssBytes));
      const attributedLifetimePeakRssBytes = attributedIdlePeaks.get(phase) ?? null;
      return {
        phase,
        sampledPeakRssBytes,
        attributedLifetimePeakRssBytes,
        peakRssBytes: Math.max(sampledPeakRssBytes, attributedLifetimePeakRssBytes ?? 0),
      };
    });
  const idlePeakRssBytes = maximum(idlePhases.map((phase) => phase.peakRssBytes));
  for (const { phase, peakRssBytes: peak } of idlePhases) {
    if (peak > idleMiB * MIB) {
      violations.push(`${phase} peak RSS ${mib(peak)} exceeds the idle budget ${mib(idleMiB * MIB)}.`);
    }
  }

  const games = [...gameIndices].sort((left, right) => left - right).map((index) => {
    const gameSamples = phaseSamples.get(`game:${index}`) ?? [];
    const cleanupSamples = phaseSamples.get(`cleanup:${index}`) ?? [];
    const idleSamples = phaseSamples.get(`idle:${index}`) ?? [];
    const gameViolations = [];
    if (!gameSamples.length) {
      gameViolations.push(`Missing positive RSS samples for game:${index}.`);
    }
    if (!idleSamples.length) {
      gameViolations.push(`Missing positive RSS samples for idle:${index}.`);
    }
    const sampledPeakRssBytes = maximum(
      [...gameSamples, ...cleanupSamples].map((sample) => sample.rssBytes),
    );
    const attributedLifetimePeakRssBytes = attributedPeaks.get(index) ?? null;
    const peakRssBytes = maximum(
      [sampledPeakRssBytes, attributedLifetimePeakRssBytes].filter((peak) => peak !== null),
    );
    const incrementBytes = baselineRssBytes === null || peakRssBytes === null
      ? null
      : Math.max(0, peakRssBytes - baselineRssBytes);
    if (incrementBytes !== null && incrementBytes > gameMiB * MIB) {
      gameViolations.push(`Game ${index} RSS increment ${mib(incrementBytes)} exceeds the game budget ${mib(gameMiB * MIB)}.`);
    }
    violations.push(...gameViolations);
    return {
      index,
      peakRssBytes,
      sampledPeakRssBytes,
      attributedLifetimePeakRssBytes,
      incrementBytes,
      sampleCount: gameSamples.length + cleanupSamples.length,
      idleSampleCount: idleSamples.length,
      passed: baselineRssBytes !== null && gameViolations.length === 0,
    };
  });

  if (samplesWithoutLifetimePeak) {
    limitations.push(`${samplesWithoutLifetimePeak} sample(s) have no OS lifetime high-water mark; short peaks between RSS readings may be missed.`);
  }
  if (samplesWithoutTiming) {
    limitations.push(`${samplesWithoutTiming} sample(s) have no valid timestamp; sampleMaxGapMs cannot describe the entire run.`);
  }

  return {
    passed: violations.length === 0,
    violations,
    baselineRssBytes,
    idlePeakRssBytes,
    idlePhases,
    processLifetimePeakRssBytes,
    observedPeakRssBytes: maximum(validSamples.map((sample) => sample.rssBytes)),
    sampleMaxGapMs,
    sampleCount: validSamples.length,
    budgets: { idleMiB, gameMiB },
    requiredGames: requiredGames ?? null,
    games,
    limitations: [...new Set(limitations)],
  };
}
