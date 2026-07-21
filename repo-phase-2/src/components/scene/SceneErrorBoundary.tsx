"use client";

import { Component, type ReactNode } from "react";
import { useRenderErrorStore } from "@/store/renderErrorStore";

interface Props {
  children: ReactNode;
  /** Label so the banner can say which space broke ("home", "corridor"). */
  label: string;
}
interface State {
  hasError: boolean;
}

/**
 * Wrap each space's content with this inside SceneRoot's Canvas. If a
 * space throws during render, this stops it from taking down the whole
 * Canvas (Player/lighting/etc keep running) and writes to
 * renderErrorStore so the outer DOM UI can show something instead of
 * the previous failure mode: nothing, silently.
 */
export default class SceneErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error(`[SceneErrorBoundary:${this.props.label}]`, error);
    useRenderErrorStore.getState().setError(`${this.props.label}: ${error.message}`);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
