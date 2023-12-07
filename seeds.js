const User = require('./app')

const user = new User({
    username: "bruno",
    name: "Bruno Santos",
    email: "bruno@gmail.com",
    password:"bruno",
})

User.insertMany([user])
    .then(res => console.log("Usuário default gravado com sucesso.", res))
    .catch(e => console.log(e))
