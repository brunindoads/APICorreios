const usersSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    packages: {
        type: [String]
    }
})

const Users = mongoose.model("Users", usersSchema)

module.exports = Users