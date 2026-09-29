// Run from a Portal checkout with `pnpm payload run <path> [--apply]`.
// Administrative configuration only; does not publish content or change users.
import configPromise from '@payload-config'
import { getPayload } from 'payload'
const payload = await getPayload({ config: configPromise })
const result = await payload.find({ collection: 'modules', depth: 0, limit: 2, overrideAccess: true, where: { slug: { equals: 'cosmic-carnival' } } })
if (result.docs.length !== 1) throw new Error('Expected exactly one Cosmic Carnival module')
const module = result.docs[0]
const entry = 'https://portal-artifacts-production.up.railway.app/cosmic-carnival/'
if (module.moduleKind !== 'external' || module.entryRoute !== entry) throw new Error('Unexpected module configuration')
if (!process.env.COSMIC_CARNIVAL_LAUNCH_SECRET) throw new Error('Dedicated launch secret missing')
const data = {
  authMode: 'signed_launch' as const,
  externalCallbackURL: 'https://portal-artifacts-production.up.railway.app/leaderboard-api/cosmic-carnival/callback',
  launchAudience: 'cosmic-carnival',
  launchSecretEnvKey: 'COSMIC_CARNIVAL_LAUNCH_SECRET',
  launchTokenTTLSeconds: 120,
  includeProfileInLaunch: true,
  includeHandleInLaunch: true,
  includeEmailInLaunch: false,
  includeRolesInLaunch: false,
  includeWalletsInLaunch: false,
  includeCredentialsInLaunch: false,
  includeAvatarInLaunch: false,
}
console.log(JSON.stringify({ id: module.id, previousAuthMode: module.authMode, proposed: data }, null, 2))
if (process.argv.includes('--apply') || process.env.COSMIC_LEADERBOARD_APPLY === 'true') {
  await payload.update({ collection: 'modules', id: module.id, overrideAccess: true, data })
  console.log('Cosmic Carnival signed launch configured.')
}
process.exit(0)
