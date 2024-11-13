import express from "express";
import dotenv from "dotenv";
import jwt, { decode } from "jsonwebtoken";
import cookieParser from "cookie-parser";

import cors from "cors";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
dotenv.config();
const app = express();
const port = process.env.PORT || 5000;
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASSWORD}@cluster0.ax6qyiu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
// verify jwt token

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  // console.log("very", token);
  if (!token) {
    return res.status(401).send("unauthorized");
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decode) => {
    if (error) {
      return res.status(401).send("unauthorized");
    }
    // console.log("deco", decode);
    req.user = decode;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    const serviceCollection = client.db("carDoctor2").collection("services");
    const bookingCollection = client.db("carDoctor2").collection("booking");
    // auth related api

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res
        .cookie("token", token, {
          // httpOnly: true,
          // sameSite: "lax",
          // secure: false,
          httpOnly: true,
          secure: false,
        })
        .send({ success: true });
    });
    // service related api
    app.get("/services", async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        projection: { title: 1, price: 1, service_id: 1, img: 1 },
      };
      const result = await serviceCollection.findOne(query, options);
      res.send(result);
    });

    // booking
    app.get("/bookings", verifyToken, async (req, res) => {
      // console.log(req.query.email);
      // console.log("tok tok", req.cookies.token);
      if (req.user.email !== req.query.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      let query = {};
      if (req.query?.email) {
        query = req.query;
      }

      const cursor = bookingCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    app.post("/bookings", async (req, res) => {
      const data = req.body;
      const result = await bookingCollection.insertOne(data);
      res.send(result);
    });
    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });
    app.patch("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const updateData = req.body;
      // console.log(updateData);
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          plot: updateData,
        },
      };
      const result = await bookingCollection.updateOne(query, updateDoc);

      res.send(result);
    });
    // const cursor = movies.find();
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
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
