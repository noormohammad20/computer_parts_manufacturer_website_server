const express = require('express')
const cors = require('cors')
var jwt = require('jsonwebtoken')
const app = express()
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ar6yj.mongodb.net/?retryWrites=true&w=majority`

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 })

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized Access' })
    }
    const token = authHeader.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            res.status(403).send({ message: 'Forbidden Access' })
        }
        req.decoded = decoded
        next()
    })
}

async function run() {
    try {
        await client.connect()
        const productCollection = client.db('computer_parts_manufacturer').collection('products')
        const orderCollection = client.db('computer_parts_manufacturer').collection('orders')
        const userCollection = client.db('computer_parts_manufacturer').collection('users')

        app.get('/product', async (req, res) => {
            const query = {}
            const cursor = productCollection.find(query)
            const services = await cursor.toArray()
            res.send(services)
        })
        app.get('/product/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const service = await productCollection.findOne(query)
            res.send(service)
        })

        app.get('/order', verifyJWT, async (req, res) => {
            const email = req.query.userEmail
            const query = { email: email }
            const result = await orderCollection.find(query).toArray()
            res.send(result)
        })

        app.post('/order', async (req, res) => {
            const order = req.body
            const result = await orderCollection.insertOne(order)
            res.send(result)
        })

        app.get('/user', verifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray()
            res.send(users)
        })

        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email
            const filter = { email: email }
            const updateDoc = {
                $set: { role: 'admin' }
            }
            const result = await userCollection.updateOne(filter, updateDoc)
            res.send(result)

        })
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email
            const user = req.body
            const filter = { email: email }
            const option = { upsert: true }
            const updateDoc = {
                $set: user,
            }
            const result = await userCollection.updateOne(filter, updateDoc, option)
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET)
            res.send({ result, token })
        })
    }
    finally {

    }
}
run().catch(console.dir)


app.get('/', (req, res) => {
    res.send('Hello form computer part manufacturer!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})