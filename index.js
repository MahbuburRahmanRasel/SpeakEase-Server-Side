//into index.js file
const express = require('express');
const cors = require('cors');
const app = express();
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 5000;
//env 
require('dotenv').config()


//middle wares 
app.use(cors())
app.use(express.json())




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.h8icusb.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const teacherCollection = client.db('SpeakEase').collection('teacherDb')
    const classesCollection = client.db('SpeakEase').collection('classesDb')
    const cartCollection = client.db('SpeakEase').collection('cartDb')




    //get Teacher colloection 
    app.get('/teachers', async(req,res)=>{
        const cursor = teacherCollection.find()
        const result = await cursor.toArray()
        res.send(result)
    })


    //get classes collections 
    app.get("/allclasses", async(req, res)=>{
        const cursor = classesCollection.find()
        const result = await cursor.toArray()
        res.send(result)
    })



// cart collection 
app.post("/carts", async(req, res)=>{
  const item = req.body
  console.log(item)
  const result = await cartCollection.insertOne(item)
  res.send(result)
})

app.get("/carts/:email", async (req, res) => {
 
  const result = await cartCollection
    .find({
      email: req.params.email,
    })
    .toArray();
  res.send(result);
});



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);





app.get('/',(req,res)=>{
    res.send('speakease is running ')
})

app.listen(port, ()=>{
    console.log(`SpeakEase is runnig :${port}`);
})