export type SerializedAutoSaveRunner = {
  requestRun: () => Promise<boolean>;
  isRunning: () => boolean;
  reset: () => void;
};

export function createSerializedAutoSaveRunner<TSnapshot>(options: {
  readSnapshot: () => TSnapshot | null;
  run: (snapshot: TSnapshot) => Promise<boolean>;
}): SerializedAutoSaveRunner {
  let activePromise: Promise<boolean> | null = null;
  let queued = false;

  function startDrain(): Promise<boolean> {
    let cyclePromise: Promise<boolean>;

    const drainPromise = (async () => {
      let lastResult = true;

      while (queued) {
        queued = false;

        const snapshot = options.readSnapshot();
        if (snapshot === null) {
          continue;
        }

        lastResult = await options.run(snapshot);
        if (!lastResult) {
          queued = false;
          break;
        }
      }

      return lastResult;
    })();

    cyclePromise = drainPromise.then(
      (result) => {
        if (activePromise !== cyclePromise) {
          return result;
        }

        if (queued) {
          return startDrain();
        }

        activePromise = null;
        return result;
      },
      (error) => {
        if (activePromise === cyclePromise) {
          activePromise = null;
        }
        throw error;
      }
    );

    activePromise = cyclePromise;
    return cyclePromise;
  }

  return {
    requestRun() {
      queued = true;

      if (activePromise) {
        return activePromise;
      }

      return startDrain();
    },
    isRunning() {
      return activePromise !== null;
    },
    reset() {
      queued = false;
    },
  };
}
