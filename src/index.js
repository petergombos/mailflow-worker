import 'babel-polyfill'
import Queue from 'bull'
import {
  validateEmails,
  createAccountVariations,
  validateDomain
} from 'mailflow-core'

const initQueue = Queue('init search')
const searchQueue = Queue('search')

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

const createSerchJobs = (chunks, mx, _id) =>
  Promise.all(chunks.map((possibleAcounts, index) =>
    searchQueue.add({
      possibleAcounts,
      mx,
      _id
    })
  ))

searchQueue.process(5, (job) =>
  validateEmails(job.data.possibleAcounts, job.data.mx)
)

//  IGNORE
searchQueue.on('completed', (job, result) => {
  console.log('search completed', job.data, result)
})

searchQueue.on('failed', (job, err) => {
  console.log('search failed', err.tested, err.code, err.message, err.response)
})

searchQueue.on('error', (err) => {
  console.log('search error', err)
})

initQueue.on('completed', (job, result) => {
  console.log('init completed', job.data, result)
})

initQueue.on('failed', (job, err) => {
  console.log('init failed', err)
})

initQueue.on('error', (err) => {
  console.log('init error', err)
})
