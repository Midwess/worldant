// Offline smoke test of the installer's fail-closed guarantees. In CI on a supported runner with
// dependencies installed and WORLDANT_SMOKE_LIVE=1, this can be extended to a real signed install;
// by default it proves the security core rejects every unsafe input without needing the network.
import { platform, arch } from "node:os"
import {
  InstallError,
  mapTarget,
  parseManifest,
  pickArtifact,
  assertDigest,
  assertSafeEntryPath,
  assertHttpsImmutable,
} from "../packages/cli/installer-core.mjs"

const checks = []
const expectCode = (label, code, fn) => {
  try {
    fn()
    checks.push({ label, ok: false, why: "did not throw" })
  } catch (e) {
    checks.push({ label, ok: e instanceof InstallError && e.code === code, why: e.code })
  }
}
const expectOk = (label, fn) => {
  try {
    fn()
    checks.push({ label, ok: true })
  } catch (e) {
    checks.push({ label, ok: false, why: e.message })
  }
}

expectOk("current platform maps to a target", () => mapTarget(platform(), arch()))
expectCode("unsupported platform fails closed", "UNSUPPORTED_PLATFORM", () => mapTarget("sunos", "sparc"))
expectCode("malformed manifest fails closed", "MALFORMED_MANIFEST", () => parseManifest(Buffer.from("nope")))
expectCode("absent target has no fallback", "TARGET_NOT_IN_MANIFEST", () =>
  pickArtifact({ version: "1.0.0", artifacts: {} }, "linux-x64"),
)
expectCode("digest mismatch fails closed", "DIGEST_MISMATCH", () => assertDigest(Buffer.from("x"), "0".repeat(64)))
expectCode("path traversal fails closed", "PATH_TRAVERSAL", () => assertSafeEntryPath("../../evil", "/opt/worldant/1.0.0"))
expectCode("http url fails closed", "INSECURE_URL", () => assertHttpsImmutable("http://cdn.worldant.dev/1.0.0/x", ["cdn.worldant.dev"]))
expectCode("disallowed origin fails closed", "DISALLOWED_ORIGIN", () => assertHttpsImmutable("https://evil.example/1.0.0/x", ["cdn.worldant.dev"]))
expectCode("mutable latest url fails closed", "MUTABLE_URL", () => assertHttpsImmutable("https://cdn.worldant.dev/latest/x", ["cdn.worldant.dev"]))

const failed = checks.filter((c) => !c.ok)
for (const c of checks) console.log(`${c.ok ? "ok  " : "FAIL"} ${c.label}${c.ok ? "" : ` (${c.why})`}`)
if (failed.length) {
  console.error(`smoke-install: ${failed.length} check(s) failed.`)
  process.exit(1)
}
console.log("smoke-install: OK (installer fails closed on every unsafe input).")
