import { useState } from "react";
import { RosService } from "../services/ros-service";
import type { RemoteResponse } from "../types";

interface UseGetRemotesByAccessKey {
  loading: boolean;
  error: Error | null;
  getRemotesByAccessKey: (accessKey: string) => Promise<RemoteResponse[]>;
  getRemotesByAccessKeyWithBasePath: (
    basePath: string,
    accessKey: string,
  ) => Promise<RemoteResponse[]>;
}

export const useGetRemotesByAccessKey = (): UseGetRemotesByAccessKey => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const rosService = RosService.getInstance();

  const getRemotesByAccessKey = async (
    accessKey: string,
  ): Promise<RemoteResponse[]> => {
    const basePath = process.env.REACT_APP_API_BASE_URL || "";
    return getRemotesByAccessKeyWithBasePath(basePath, accessKey);
  };

  const getRemotesByAccessKeyWithBasePath = async (
    basePath: string,
    accessKey: string,
  ): Promise<RemoteResponse[]> => {
    setLoading(true);
    setError(null);

    try {
      const data = await rosService.getRemotesByAccessKey(basePath, accessKey);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("An error occurred"));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    getRemotesByAccessKey,
    getRemotesByAccessKeyWithBasePath,
  };
};