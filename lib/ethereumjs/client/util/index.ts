/**
 * @module util
 */
import { platform } from "os";

export * from "./parse";

export function short(buffer: Buffer): string {
  return buffer.toString("hex").slice(0, 8) + "...";
}

export function getClientVersion() {
  const { version } = process;
  return `EthereumJS/1.0.0/${platform()}/node${version.substring(1)}`;
}
