import http from 'http'
import cors from 'cors'
import express from 'express'
import bodyParser from 'body-parser'

const app = express()

let attemptLeft = 3

app.use(cors())
app.use(bodyParser.json())

app.get('/name', (req, res) => {
  res.status(200).send({ name: 'name' })
})

app.post('/name', (req, res) => {
  if (req.body.success) {
    res.status(200).send({ success: true })
  } else {
    res.status(500).send({ success: false })
  }
})

app.get('/timeout', (req, res) => {
  setTimeout(() => {
    res.status(200).send({ success: true })
  }, 1000)
})

app.get('/retries', (req, res) => {
  attemptLeft = attemptLeft - 1
  if (attemptLeft === 0) {
    res.status(200).send({ success: true })
    attemptLeft = 3
  } else {
    res.status(500).send({ success: false })
  }
})

const server = http.createServer(app)
beforeAll(() => new Promise((resolve, reject) => {
  server.once('error', reject)
  server.listen(0, '127.0.0.1', () => {
    global.PORT = server.address().port
    resolve()
  })
}))

afterAll(() => new Promise(resolve => server.close(resolve)))
