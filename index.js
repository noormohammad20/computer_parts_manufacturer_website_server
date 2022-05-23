const express = require('express')
const cors = require('cors')
const app = express()
const jwt = require('jsonwebtoken')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ar6yj.mongodb.net/?retryWrites=true&w=majority`

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 })


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

        app.get('/order', async (req, res) => {
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