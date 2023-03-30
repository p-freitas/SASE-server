const koa = require('koa')
const http = require('http')
const socket = require('socket.io')
require('dotenv').config();

const app = new koa()
const server = http.createServer(app.callback())
const io = socket(server)

const SERVER_HOST = process.env.NODE_SOCKET_URL
const SERVER_PORT = process.env.NODE_SOCKET_PORT

const passwords = {
  normal: [],
  prioritary: [],
  all: [],
}

let passwordList = []
const passwordListOnDisplay = []

let N = 1
let P = 1

const getNormalPassword = () => {
  const value = `N${N++}`
  passwords['normal'].push(value)

  passwords['all'].push(value)
}

const getPrioritaryPassword = () => {
  const value = `P${P++}`
  passwords['prioritary'].push(value)

  passwords['all'].push(value)
}

const getData = data => {
  data === 'normal' ? getNormalPassword() : getPrioritaryPassword()
}

const handleNextPassword = (data, firstPassword) => {
  io.sockets.emit('password.next', data)
  io.sockets.emit('password.tv.update', data)
  
  io.sockets.emit(`password.tv.${data}`, firstPassword)
  data = data.toString().replace(/[{()}]/g, '');
  passwordListOnDisplay.push(data)

  console.log(`[SOCKET] [SERVER] => NEXT PASSWORD ${firstPassword}`)
}


io.on('connection', socket => {
  console.log('[IO - CLIENT] Connection => server has a new connection')

  socket.on('password.onDisplay', data => {
    console.log('[SOCKET SERVER] New password type => ', data)

    io.sockets.emit('object.passwordsOnDisplay', passwordList)
  })

  socket.on('password.get', data => {
    console.log('[SOCKET SERVER] New password type => ', data)

    io.sockets.emit('object.passwords', passwords)
  })

  socket.on('password.send', data => {
    console.log('[SOCKET SERVER] New password type => ', data)

    getData(data)
    io.sockets.emit('object.passwords', passwords)
  })
  
  socket.on('passwords.deleteOnDisplay', data => {
    console.log('[SOCKET SERVER] Delete password => ', data)

    let filtered = passwordList.filter(elem => elem !== data);
    
    passwordList = filtered
    io.sockets.emit('object.passwordsOnDisplay', passwordList)
    io.sockets.emit('password.tv.update', passwordList)
  })

  socket.on('password.next', data => {
    passwordList.push(data)

    handleNextPassword(passwordList)
  })

  socket.on('disconnect', () => {
    console.log('[SOCKET SERVER] User Disconnect')
  })
})

server.listen(SERVER_PORT, SERVER_HOST, () => {
  console.log('[http] Server running...')
})

server.off('server.off', () => {
  console.log('[http] Server stopping...')
})