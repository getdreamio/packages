import { registerRuntimeRemote } from "../register";
import { registerRemotes } from "@module-federation/runtime";
import type { ImportRemoteOptions } from "../types";
import { preloadRemote } from "./preload-remote";

/** ==================================================================================== */

declare global {
  interface WebpackEvent {
    type: string;
    target: Record<string, unknown>;
  }

  interface WebpackContainerScope {
    __initialized: boolean;
    __initializing: boolean;
    init(scopes: unknown): Promise<Record<string, unknown>>;
  }

  const __webpack_init_sharing__: (parameter: string) => Promise<void>;
  const __webpack_share_scopes__: { default: unknown };
  // eslint-disable-next-line @typescript-eslint/ban-types
  const __webpack_require__: {
    l: (
      url: string,
      cb: (event: WebpackEvent) => void,
      id: string,
    ) => Record<string, unknown>;
  };
}

/** ==================================================================================== */

const _initSharing = async () => {
  if (!__webpack_share_scopes__?.default) {
    await __webpack_init_sharing__("default");
  }
};

const _initContainer = async (containerScope: WebpackContainerScope) => {
  try {
    if (!containerScope.__initialized && !containerScope.__initializing) {
      containerScope.__initializing = true;
      await containerScope.init(__webpack_share_scopes__.default);
      containerScope.__initialized = true;
      // biome-ignore lint/performance/noDelete: <explanation>
      delete containerScope.__initializing;
    }
  } catch (error) {
    // If the container throws an error, it is probably because it is not a container.
    // In that case, we can just ignore it.
  }
};

/** ==================================================================================== */

/** Imports a remote for use with module federation, loads remote if not preloaded. */
export const importRemote = async <T>({
  remoteUrl,
  scope,
  module,
  remoteUrlFallback,
  bustRemoteEntryCache = false,
}: ImportRemoteOptions): Promise<T> => {
  if (!window[scope]) {
    const remoteDetails = remoteUrlFallback
      ? { value: remoteUrlFallback }
      : { value: remoteUrl };

    // Load the remote and initialize the share scope if it's empty
    await Promise.all([
      preloadRemote({
        url: remoteDetails.value,
        scope,
        bustRemoteEntryCache,
      }),
      _initSharing(),
      async () => {
        registerRuntimeRemote(scope, null, remoteDetails.value);
      },
    ]);
    if (!window[scope]) {
      const error = new Error(
        `Remote loaded successfully but ${scope} could not be found! Verify that the name is correct in the configuration!`,
      );
      // DreamMFLogClient.logException({
      //   type: "REMOTE_MODULE_LOAD_EXCEPTION",
      //   error,
      //   properties: {
      //     url: remoteUrl,
      //     remoteUrlFallback,
      //     scope,
      //     module,
      //   },
      // });
      throw error;
    }
    // Initialize the container to get shared modules and get the module factory:
    const [, moduleFactory] = await Promise.all([
      _initContainer(window[scope]),
      window[scope].get(module.startsWith("./") ? module : `./${module}`),
    ]);
    registerRemotes([
      {
        name: scope,
        entry: remoteDetails.value,
      },
    ]);
    registerRuntimeRemote(scope, module, remoteDetails.value);
    // DreamMFLogClient.logEvent({
    //   eventName: "REMOTE_MODULE_LOADED",
    //   details: remoteDetails.value,
    //   properties: {
    //     scope,
    //     module,
    //   },
    // });
    return moduleFactory();
    // biome-ignore lint/style/noUselessElse: <explanation>
  } else {
    const moduleFactory = await window[scope].get(
      module.startsWith("./") ? module : `./${module}`,
    );
    return moduleFactory();
  }
};

export default {
  importRemote,
};
