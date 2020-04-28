import http from 'http'
import cors from 'cors'
import express from 'express'
import bodyParser from 'body-parser'
import portfinder from 'portfinder'
import stoppable from 'stoppable'

const app = express()

let attemptLeft = 3

app.use(cors())
app.use(bodyParser.json())

app.get('/name', (req, res) => {
  res.status(200).send({name: 'name'})
})

app.post('/name', (req, res) => {
  if (req.body.success) {
    res.status(200).send({success: true})
  } else {
    res.status(500).send({success: false})
  }
})

app.get('/timeout', (req, res) => {
  setTimeout(() => {
    res.status(200).send({success: true})
  }, 1000)
})

app.get('/retries', (req, res) => {
  attemptLeft = attemptLeft - 1
  if (attemptLeft === 0) {
    res.status(200).send({success: true})
    attemptLeft = 3
  } else {
    res.status(500).send({success: false})
  }
})

const server = stoppable(http.createServer(app))
portfinder.getPort(function (err, port) {
  if (err) {
    console.error(err)
    return
  }
  global.PORT = port
  server.listen(global.PORT)
})

global.stop = function () {
  server.close()
}
