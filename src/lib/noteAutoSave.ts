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

  return {
    requestRun() {
      queued = true;

      if (activePromise) {
        return activePromise;
      }

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

      activePromise = drainPromise.finally(() => {
        if (activePromise === drainPromise) {
          activePromise = null;
        }
      });

      return activePromise;
    },
    isRunning() {
      return activePromise !== null;
    },
    reset() {
      queued = false;
    },
  };
}
