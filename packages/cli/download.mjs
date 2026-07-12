import { get } from "node:https"
import { InstallError, assertHttpsImmutable } from "./installer-core.mjs"

export function fetchBuffer(url, allowlist, maxRedirects = 3) {
  return new Promise((resolvePromise, reject) => {
    const visit = (current, hops) => {
      let u
      try {
        u = assertHttpsImmutable(current, allowlist)
      } catch (e) {
        return reject(e)
      }
      const req = get(u, (res) => {
        const status = res.statusCode ?? 0
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume()
          if (hops >= maxRedirects) {
            return reject(new InstallError("TOO_MANY_REDIRECTS", `Exceeded ${maxRedirects} redirects fetching ${url}.`))
          }
          const next = new URL(res.headers.location, u).toString()
          return visit(next, hops + 1)
        }
        if (status !== 200) {
          res.resume()
          return reject(new InstallError("DOWNLOAD_FAILED", `HTTP ${status} fetching ${current}.`))
        }
        const chunks = []
        res.on("data", (c) => chunks.push(c))
        res.on("end", () => resolvePromise(Buffer.concat(chunks)))
        res.on("error", (e) => reject(new InstallError("DOWNLOAD_FAILED", e.message)))
      })
      req.on("error", (e) => reject(new InstallError("DOWNLOAD_FAILED", e.message)))
    }
    visit(url, 0)
  })
}
