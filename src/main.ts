import { bootstrap } from './ui/app'

export const appVersion = '0.1.0'

// Browser entry only — guarded so node imports stay side-effect free.
if (typeof document !== 'undefined') {
  bootstrap()
}
