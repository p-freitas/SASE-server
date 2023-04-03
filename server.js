const koa = require('koa')
const http = require('http')
const socket = require('socket.io')
require('dotenv').config()

const app = new koa()
const server = http.createServer(app.callback())
const io = socket(server)

const SERVER_HOST = process.env.NODE_SOCKET_URL
const SERVER_PORT = process.env.NODE_SOCKET_PORT

let passwords = {
  normal: [],
  prioritary: [],
  all: [],
}

let passwordList = []
let passwordListOnDisplay = []
let passwordListButtonNext = []

let N = 1
let P = 1
let count = 0

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

let firstPasswordButton

const handleNextPassword = (data, isNextPassword, firstPassword) => {
  if (isNextPassword) {
    firstPasswordButton = firstPassword
    io.sockets.emit('password.next', data)
    io.sockets.emit('password.tv.update', data)
    io.sockets.emit(`password.tv.service`, firstPassword)
    io.sockets.emit('object.passwordsOnDisplay', data)
  } else {
    io.sockets.emit('password.next', data)
    io.sockets.emit('password.tv.update', data, false)
    // io.sockets.emit(`password.tv.${data}`, firstPassword)
  }

  data = data.toString().replace(/[{()}]/g, '')
  passwordListOnDisplay.push(data)

  console.log(`[SOCKET] [SERVER] => NEXT PASSWORD ${data}`)
}

io.on('connection', socket => {
  console.log('[IO - CLIENT] Connection => server has a new connection')

  socket.on('password.onDisplay', data => {
    console.log('[SOCKET SERVER] New password type => ', data)

    io.sockets.emit(
      'object.passwordsOnDisplay',
      passwordList
    )
  })

  socket.on('password.getEmpty', data => {
    console.log('[SOCKET SERVER] New password type => ', data)

    if (passwords['all'].length === 0) {
      io.sockets.emit('password.empty', true)
    } else {
      io.sockets.emit('password.empty', false)
    }
  })

  socket.on('password.get', data => {
    console.log('[SOCKET SERVER] New password type => ', data)

    io.sockets.emit('object.passwords', passwords)
    io.sockets.emit('password.tv.service', firstPasswordButton)
  })

  socket.on('password.send', data => {
    console.log('[SOCKET SERVER] New password type => ', data)

    getData(data)
    io.sockets.emit('object.passwords', passwords)
  })

  socket.on('passwords.delete', data => {
    console.log('[SOCKET SERVER] Delete password => ', data)
    let filteredAll = passwords?.all?.filter(elem => elem !== data)
    let filteredNormal = passwords?.normal?.filter(elem => elem !== data)
    let filteredPrioritary = passwords?.prioritary?.filter(
      elem => elem !== data
    )

    passwords['normal'] = filteredNormal
    passwords['all'] = filteredAll
    passwords['prioritary'] = filteredPrioritary

    io.sockets.emit('object.passwords', passwords)
  })

  socket.on('passwords.deleteOnDisplay', data => {
    console.log('[SOCKET SERVER] Delete password on display => ', data)

    let filtered = passwordList.filter(elem => elem !== data)

    passwordList = filtered
    io.sockets.emit('object.passwordsOnDisplay', passwordList)
    io.sockets.emit('password.tv.update', passwordList, true)
  })

  socket.on('password.next', (data, isNextPassword) => {
    if (isNextPassword) {
      const firstPassword = passwords['all'][0]

      const isNormalPassword = firstPassword?.startsWith('N') && count < 2

      if (isNormalPassword) {
        const dataObject = {
          password: firstPassword,
          select: data,
        }
        passwordList.push(dataObject)
        handleNextPassword(
          passwordList,
          isNextPassword,
          firstPassword
        )
        passwords['all'].splice(0, 1)
        passwords['normal'].splice(0, 1)

        count++
      } else {
        const firstPasswordPrioritary = passwords['prioritary'][0]
        const isTherePrioritaryPassword = passwords['prioritary'].length > 0

        if (isTherePrioritaryPassword) {
          const dataObject = {
            password: firstPasswordPrioritary,
            select: data,
          }
          passwordList.push(dataObject)
          handleNextPassword(
            passwordList,
            isNextPassword,
            firstPasswordPrioritary
          )
          passwords['prioritary'].splice(0, 1)
          let filtered = passwords['all'].filter(
            elem => elem !== firstPasswordPrioritary
          )

          passwords['all'] = filtered
        } else {
          const dataObject = {
            password: firstPassword,
            select: data,
          }
          passwordList.push(dataObject)
          handleNextPassword(
            passwordList,
            isNextPassword,
            firstPassword
          )
          passwords['all'].splice(0, 1)
        }

        count = 0
      }
    } else {
      passwordList.push(data)

      handleNextPassword(passwordList, isNextPassword, firstPasswordButton)
    }
  })

  socket.on('passwords.reset', () => {
    passwordList.length = 0
    passwordListOnDisplay.length = 0
    passwords = {
      normal: [],
      prioritary: [],
      all: [],
    }
    firstPasswordButton = ''

    N = 1
    P = 1

    io.sockets.emit('object.passwords', passwords)
    io.sockets.emit('password.onDisplay', passwordList)
    io.sockets.emit('password.tv.update', passwordList)
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
