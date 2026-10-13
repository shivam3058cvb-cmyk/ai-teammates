import { Sandbox as E2BSandbox } from "@e2b/desktop"

// E2B desktop sandboxes are the only external execution boundary used by bots.
// The adapter keeps the rest of the app independent from a vendor-specific SDK.
export type Sandbox = {
  id: string
  process: {
    executeCommand: (
      command: string,
      cwd?: string,
      env?: unknown,
      timeout?: number
    ) => Promise<{ exitCode: number; result: string }>
  }
  fs: {
    downloadFile: (path: string) => Promise<Uint8Array>
    uploadFile: (file: Uint8Array, path: string) => Promise<void>
    listFiles: (path: string) => Promise<
      { name: string; isDir: boolean; size: number }[]
    >
  }
  computerUse: {
    getStatus: () => Promise<{ status: "active" | "inactive" }>
    start: () => Promise<void>
    screenshot: { takeCompressed: (options: unknown) => Promise<{
      screenshot?: string
    }> }
    display: { getInfo: () => Promise<{ displays?: { width: number; height: number }[] }> }
    mouse: {
      click: (x: number, y: number, button: string, double: boolean) => Promise<void>
      move: (x: number, y: number) => Promise<void>
      drag: (startX: number, startY: number, endX: number, endY: number) => Promise<void>
      scroll: (x: number, y: number, direction: string, amount: number) => Promise<void>
    }
    keyboard: {
      type: (text: string) => Promise<void>
      press: (key: string, modifiers: string[]) => Promise<void>
    }
  }
}

type E2BDesktop = E2BSandbox & {
  commands: { run: (command: string, options?: { cwd?: string; timeoutMs?: number }) => Promise<{ exitCode: number; stdout: string; stderr: string }> }
  files: { read: (path: string) => Promise<Uint8Array>; write: (path: string, data: Uint8Array) => Promise<void>; list: (path: string) => Promise<{ name: string; type?: string; size?: number }[]> }
}

const sandboxes = new Map<string, Promise<E2BDesktop>>()
export const MEMORY_FILE = "MEMORY.md"

function requireE2BApiKey() {
  if (!process.env.E2B_API_KEY) {
    throw new Error("E2B_API_KEY is required to use bot sandboxes")
  }
}

function adapt(raw: E2BDesktop): Sandbox {
  return {
    id: raw.sandboxId,
    process: { executeCommand: async (command, cwd, _env, timeout = 60) => {
      const result = await raw.commands.run(command, { cwd, timeoutMs: timeout * 1000 })
      return { exitCode: result.exitCode, result: result.stdout || result.stderr }
    } },
    fs: {
      downloadFile: async (path) => {
        const content = await raw.files.read(path)
        return typeof content === "string"
          ? new TextEncoder().encode(content)
          : content
      },
      uploadFile: (file, path) => raw.files.write(path, file),
      listFiles: async (path) => (await raw.files.list(path)).map((file) => ({ name: file.name, isDir: String(file.type) === "directory", size: file.size ?? 0 })),
    },
    computerUse: {
      getStatus: async () => ({ status: "active" }),
      start: async () => { await raw.stream.start() },
      screenshot: { takeCompressed: async () => ({ screenshot: Buffer.from(await raw.screenshot("bytes")).toString("base64") }) },
      display: { getInfo: async () => ({ displays: [await raw.getScreenSize()] }) },
      mouse: {
        click: (x, y, button, double) => double ? raw.doubleClick(x, y) : button === "right" ? raw.rightClick(x, y) : button === "middle" ? raw.middleClick(x, y) : raw.leftClick(x, y),
        move: (x, y) => raw.moveMouse(x, y),
        drag: (startX, startY, endX, endY) => raw.drag([startX, startY], [endX, endY]),
        scroll: async (_x, _y, direction, amount) => raw.scroll(direction as "up" | "down", amount),
      },
      keyboard: { type: (text) => raw.write(text), press: (key, modifiers) => raw.press([...modifiers, key]) },
    },
  }
}

export async function createBotSandbox(botId: string) {
  requireE2BApiKey()
  void botId
  const sandbox = await E2BSandbox.create({ resolution: [1280, 800] }) as unknown as E2BDesktop
  sandboxes.set(sandbox.sandboxId, Promise.resolve(sandbox))
  await sandbox.commands.run(`touch ${MEMORY_FILE}`)
  return sandbox.sandboxId
}

export async function getBotSandbox(sandboxId: string) {
  requireE2BApiKey()
  let promise = sandboxes.get(sandboxId)
  if (!promise) {
    promise = E2BSandbox.connect(sandboxId) as unknown as Promise<E2BDesktop>
    sandboxes.set(sandboxId, promise)
  }
  return adapt(await promise)
}

export async function readBotMemory(sandbox: Sandbox) {
  const { exitCode, result } = await sandbox.process.executeCommand(`touch ${MEMORY_FILE} && cat ${MEMORY_FILE}`)
  if (exitCode !== 0) throw new Error(`Reading ${MEMORY_FILE} failed: ${result}`)
  return result
}

export async function getBotDesktopUrl(sandboxId: string) {
  const sandbox = await getBotSandbox(sandboxId)
  await sandbox.computerUse.start()
  const raw = await sandboxes.get(sandboxId)
  if (!raw) throw new Error("Sandbox not found")
  await (await raw).stream.start({ requireAuth: true })
  return (await raw).stream.getUrl({ autoConnect: true })
}

export async function deleteBotSandbox(sandboxId: string) {
  const raw = await sandboxes.get(sandboxId)
  if (raw) await (await raw).kill()
  sandboxes.delete(sandboxId)
}

export async function listRunningSandboxIds() {
  return Array.from(sandboxes.keys())
}

export async function stopBotSandbox(sandboxId: string) {
  const raw = await sandboxes.get(sandboxId)
  if (raw) await (await raw).kill()
}
