import { create } from "zustand";

export type LiveConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

interface UiState {
  isSidebarOpen: boolean;
  isActivityPaused: boolean;
  liveConnection: LiveConnectionState;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setActivityPaused: (paused: boolean) => void;
  setLiveConnection: (state: LiveConnectionState) => void;
}

export const useUiStore = create<UiState>((set) => ({
  isSidebarOpen: false,
  isActivityPaused: false,
  liveConnection: "idle",
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setActivityPaused: (paused) => set({ isActivityPaused: paused }),
  setLiveConnection: (state) => set({ liveConnection: state }),
}));
