import 'babel-polyfill'
import Queue from 'bull'
import {
  validateEmails,
  createAccountVariations,
  validateDomain
} from 'mailflow-core'
import config from './config'

const initQueue = Queue('init search', config.REDIS_URL, config.redisOpts)
const searchQueue = Queue('search', config.REDIS_URL, config.redisOpts)

initQueue.process(async (job) => {
  const { _id, name, domain } = job.data
  const validation = await validateDomain(domain)
  const mx = validation.tested
  const possibleAcounts = createAccountVariations(name)
  const chunks = []
  while (possibleAcounts.length) {
    chunks.push(possibleAcounts.splice(0, 10).map(o => o + '@' + domain))
  }
  return createSerchJobs(chunks, mx, _id).then((jobs) => {
    return jobs.length
  })
})

const createSerchJobs = async (chunks, mx, _id) => {
  const jobs = []
  for (let i = 0; i < chunks.length; i++) {
    const job = await searchQueue.add({
      possibleAcounts: chunks[i],
      mx,
      _id
    })
    jobs.push(job)
  }
  return jobs
}

searchQueue.process(10, (job) =>
  validateEmails(job.data.possibleAcounts, job.data.mx)
)

//  Logging
searchQueue.on('completed', (job, result) => {
  console.log('search completed', job.data, result)
})

searchQueue.on('failed', (job, err) => {
  console.log('search failed', err)
})

searchQueue.on('error', (err) => {
  throw new Error(err)
})

initQueue.on('completed', (job, result) => {
  console.log('init completed', job.data, result)
})

initQueue.on('failed', (job, err) => {
  console.log('init failed', err)
})

initQueue.on('error', (err) => {
  throw new Error(err)
})
