//into index.js file
const express = require("express");
const cors = require("cors");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;
var jwt = require("jsonwebtoken");
const Stripe = require('stripe')
const stripe = Stripe('sk_test_51NHpYAH2x9yrGo5Da7PAnrOaGj5UWHyJQdRQyQpUoD1WQ9NMRVozjAZgjr0QFqDXDkt4DwMrhzqJtTh6RL1dEQix00rCKpep21')


//env
require("dotenv").config();

//middle wares
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  // bearer token
  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ixwjzmq.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const teacherCollection = client.db("SpeakEase").collection("teacherDb");
    const classesCollection = client.db("SpeakEase").collection("classesDb");
    const cartCollection = client.db("SpeakEase").collection("cartDb");
    const usersCollection = client.db("SpeakEase").collection("userDb");
    const paymentCollection = client.db("SpeakEase").collection("paymentDb");

    app.post("/jwt", (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    //get Teacher colloection
    app.get("/teachers", async (req, res) => {
      const cursor = teacherCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    //get classes collections
    app.get("/allclasses", async (req, res) => {
      const cursor = classesCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // cart collection
    app.post("/carts",  async (req, res) => {
      const item = req.body;

      const result = await cartCollection.insertOne(item);
      res.send(result);
    });

    app.get("/carts",verifyJWT, async (req, res) => {

      const email = req.query.email

      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'forbidden access' })
      }

      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

 // delete form cart  
    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });

    //user update
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: "user already exists" });
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });


    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });


    app.patch("/users/instructor/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "instructor",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });


      //verify admin 
      app.get('/users/admin/:email', verifyJWT, async (req, res) => {
        const email = req.params.email;
  
        if (req.decoded.email !== email) {
          res.send({ admin: false })
        }
  
        const query = { email: email }
        const user = await usersCollection.findOne(query);
        const result = { admin: user?.role === 'admin' }
        res.send(result);
      })



      


    //payment stripe code 
    app.post('/create-payment-intent', verifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })

    // payment 
    app.post('/payments', verifyJWT, async (req, res) => {
      const payment = req.body;
      const insertResult = await paymentCollection.insertOne(payment);
      const query = { _id: new ObjectId(payment.payClassId) }
      const deleteResult = await cartCollection.deleteOne(query)

      res.send({ insertResult,deleteResult });
    })

    app.patch('/allclasses/:id', async(req,res)=>{

      const id = req.params.id
      const query = {_id : new ObjectId(id)}
      console.log(query);

     
      const update = { $inc: { availableSeats: -1, totalStudents: +1 } }

      const result = await classesCollection.findOneAndUpdate(query, update); 
      res.send(result)

    })

    app.get('/sortclass' , async(req,res)=>{
      const cursor =  classesCollection.find().sort({totalStudents: -1}).limit(6)
      const result = await cursor.toArray()
      res.send(result)
    
    })

    app.get('/payclass/:email', async(req,res)=>{
      const email = req.params.email
      const result = await paymentCollection
        .find({
          email: email,
        })
        .toArray();
      res.send(result);
    })






    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("speakease is running ");
});

app.listen(port, () => {
  console.log(`SpeakEase is runnig :${port}`);
});
