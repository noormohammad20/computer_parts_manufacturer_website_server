const express = require('express')
const cors = require('cors')
var jwt = require('jsonwebtoken')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

const app = express()
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
        const paymentCollection = client.db('computer_parts_manufacturer').collection('payments')
        const reviewCollection = client.db('computer_parts_manufacturer').collection('reviews')
        const profileCollection = client.db('computer_parts_manufacturer').collection('myProfile')

        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email
            const requesterAccount = await userCollection.findOne({ email: requester })
            if (requesterAccount.role === 'admin') {
                next()
            }
            else {
                res.status(403).send({ message: 'Forbidden Access' })
            }
        }

        app.post('/create-payment-intent', async (req, res) => {
            const service = req.body
            const price = service.price
            const amount = price * 100
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            })
            res.send({ clientSecret: paymentIntent.client_secret })
        })

        app.get('/product', async (req, res) => {
            const query = {}
            const cursor = productCollection.find(query)
            const services = await cursor.toArray()
            res.send(services)
        })
        app.get('/dashboard/manageProduct', verifyJWT, verifyAdmin, async (req, res) => {
            const products = await productCollection.find().toArray()
            res.send(products)
        })

        app.get('/product/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const service = await productCollection.findOne(query)
            res.send(service)
        })

        app.post('/product', verifyJWT, async (req, res) => {
            const product = req.body
            const result = await productCollection.insertOne(product)
            res.send(result)
        })

        app.delete('/product/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const result = await productCollection.deleteOne(query)
            res.send(result)
        })

        app.patch('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id
            const payment = req.body
            const filter = { _id: ObjectId(id) }
            const updateDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const result = await paymentCollection.insertOne(payment)
            const updateOrder = await orderCollection.updateOne(filter, updateDoc)
            res.send(updateOrder)

        })

        app.get('/myOrder/:email', verifyJWT, async (req, res) => {
            const email = req.params.email
            const result = await orderCollection.find({ email: email }).toArray()
            res.send(result)
        })

        app.delete('/order/:email', verifyJWT, async (req, res) => {
            const email = req.params.email
            const filter = { email: email }
            const result = await orderCollection.deleteOne(filter)
            res.send(result)
        })

        app.get('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const order = await orderCollection.findOne(query)
            res.send(order)
        })

        app.post('/order', async (req, res) => {
            const order = req.body
            const result = await orderCollection.insertOne(order)
            res.send(result)
        })

        app.get('/order', verifyJWT, verifyAdmin, async (req, res) => {
            const orders = await orderCollection.find().toArray()
            res.send(orders)
        })

        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email
            const user = await userCollection.findOne({ email: email })
            const isAdmin = user.role === 'admin'
            res.send({ admin: isAdmin })
        })

        app.get('/user', verifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray()
            res.send(users)
        })

        app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
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

        app.get('/review', async (req, res) => {
            const review = await reviewCollection.find().toArray()
            res.send(review)
        })

        app.post('/review', async (req, res) => {
            const order = req.body
            const result = await reviewCollection.insertOne(order)
            res.send(result)
        })

        app.post('/myProfile', async (req, res) => {
            const myProfile = req.body
            const result = await profileCollection.insertOne(myProfile)
            res.send(result)
        })

        app.get('/myProfile/', async (req, res) => {

            const result = await profileCollection.find().toArray()
            res.send(result)
        })

        app.patch('/myProfile/:email', async (req, res) => {
            const email = req.params.email
            const updateProfile = req.body
            const filter = { email: email }
            const updatedDoc = {
                $set: {
                    education: updateProfile.education,
                    location: updateProfile.location,
                    PhoneNumber: updateProfile.phoneNumber,
                    linkedinProfile: updateProfile.linkedinProfile,
                }
            }

            const updatedProfile = await profileCollection.updateOne(filter, updatedDoc)
            res.send(updatedProfile)
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