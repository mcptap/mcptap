// Stdio-safe logging for MCP servers.
//
// The wire-corruption pain: an MCP stdio server's stdout is the JSON-RPC channel.
// A stray `console.log("debug")` writes to stdout and corrupts the wire — the
// client sees malformed JSON and disconnects. This is one of the most-cited
// pain points for MCP authors.
//
// Drop these helpers into your server:
//
//   import { mcpLog, silenceStdoutLogging } from 'mcptap';
//
//   silenceStdoutLogging();          // routes console.* to stderr forever
//   mcpLog('starting up', { port }); // explicit stderr log
//
// `silenceStdoutLogging()` is the safest call to make at the top of an MCP server.

import { format } from 'node:util';

export function mcpLog(...args: unknown[]): void {
  process.stderr.write(format(...args) + '\n');
}

/**
 * Reroute console.log / .info / .warn / .error / .debug / .trace to stderr,
 * so accidental console.log calls cannot corrupt the JSON-RPC wire on stdout.
 *
 * Returns a restore function in case you need to undo it.
 */
export function silenceStdoutLogging(): () => void {
  const original = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
    trace: console.trace,
  };

  const toStderr =
    (level: string) =>
    (...args: unknown[]) =>
      process.stderr.write(`[${level}] ` + format(...args) + '\n');

  console.log = toStderr('log');
  console.info = toStderr('info');
  console.warn = toStderr('warn');
  console.error = toStderr('error');
  console.debug = toStderr('debug');
  console.trace = toStderr('trace');

  return () => {
    console.log = original.log;
    console.info = original.info;
    console.warn = original.warn;
    console.error = original.error;
    console.debug = original.debug;
    console.trace = original.trace;
  };
}
