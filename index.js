require("dotenv").config();
const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

const cors = require("cors");

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ghnljed.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const run = async () => {
  try {
    const db = client.db("jobbox");
    const userCollection = db.collection("user");
    const jobCollection = db.collection("job");
    const chatCollection = db.collection("chat");

    app.post("/user", async (req, res) => {
      const user = req.body;

      const result = await userCollection.insertOne(user);

      res.send(result);
    });

    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;

      const result = await userCollection.findOne({ email });

      if (result?.email) {
        return res.send({ status: true, data: result });
      }

      res.send({ status: false });
    });

    app.patch("/user/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: req.body,
      };
      const options = { upsert: true };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    app.patch("/apply", async (req, res) => {
      const userId = req.body.userId;
      const jobId = req.body.jobId;
      const email = req.body.email;
      const approvalStatus = req.body.approvalStatus;

      const filter = { _id: ObjectId(jobId) };
      const updateDoc = {
        $push: { applicants: { id: ObjectId(userId), email, approvalStatus } },
      };

      const result = await jobCollection.updateOne(filter, updateDoc);

      if (result.acknowledged) {
        return res.send({ status: true, data: result });
      }

      res.send({ status: false });
    });

    app.patch("/query", async (req, res) => {
      const userId = req.body.userId;
      const jobId = req.body.jobId;
      const email = req.body.email;
      const question = req.body.question;

      const filter = { _id: ObjectId(jobId) };
      const updateDoc = {
        $push: {
          queries: {
            id: ObjectId(userId),
            email,
            question: question,
            reply: [],
          },
        },
      };

      const result = await jobCollection.updateOne(filter, updateDoc);

      if (result?.acknowledged) {
        return res.send({ status: true, data: result });
      }

      res.send({ status: false });
    });

    app.patch("/reply", async (req, res) => {
      const userId = req.body.userId;
      //const email = req.body.email;
      const reply = req.body.reply;
      //console.log(reply);
      //console.log(userId);

      const filter = { "queries.id": ObjectId(userId) };

      const updateDoc = {
        $push: {
          "queries.$[user].reply": reply,
        },
      };
      const arrayFilter = {
        arrayFilters: [{ "user.id": ObjectId(userId) }],
      };

      const result = await jobCollection.updateOne(
        filter,
        updateDoc,
        arrayFilter
      );
      if (result.acknowledged) {
        return res.send({ status: true, data: result });
      }

      res.send({ status: false });
    });

    app.get("/applied-jobs/:email", async (req, res) => {
      const email = req.params.email;
      const query = { applicants: { $elemMatch: { email: email } } };
      const cursor = jobCollection.find(query);
      const result = await cursor.toArray();
      res.send({ status: true, data: result });
    });

    app.get("/jobs", async (req, res) => {
      const cursor = jobCollection.find({});
      const result = await cursor.toArray();
      res.send({ status: true, data: result });
    });

    app.get("/job/:id", async (req, res) => {
      const id = req.params.id;

      const result = await jobCollection.findOne({ _id: ObjectId(id) });
      res.send({ status: true, data: result });
    });

    app.post("/job", async (req, res) => {
      const job = req.body;

      const result = await jobCollection.insertOne(job);

      res.send({ status: true, data: result });
    });

    app.get("/jobsByEmployer/:email", async (req, res) => {
      const email = req.params.email;
      const query = { "employer.email": email };
      const cursor = jobCollection.find(query);
      const result = await cursor.toArray();
      res.send({ status: true, data: result });
    });

    app.patch("/updateJobStatus/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const option = { upsert: true };
      const updateDoc = { $set: { status: "closed" } };
      const result = await jobCollection.updateOne(filter, updateDoc, option);
      res.send({ status: true, data: result });
    });

    app.get("/candidate-details/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await userCollection.findOne(query);
      res.send({ status: true, data: result });
    });

    app.post("/messege", async (req, res) => {
      const messegeData = req.body;
      const result = await chatCollection.insertOne(messegeData);
      res.send({ status: true, data: result });
    });

    app.get("/messege/:from", async (req, res) => {
      const from = req.params.from;
      const to = req.query.to;
      const messegeFromTo = await chatCollection
        .find({ fromId: from, toId: to })
        .toArray();
      const messegeToFrom = await chatCollection
        .find({ fromId: to, toId: from })
        .toArray();

      const sortFunction = (a, b) => {
        return new Date(a.messegeDate) - new Date(b.messegeDate);
      };

      const unsortedMesseges = messegeFromTo.concat(messegeToFrom);
      const messeges = unsortedMesseges.sort(sortFunction);

      //console.log(messeges);
      res.send({ status: true, data: messeges });
    });

    app.patch("/updateApprovalStatus/:id", async(req, res)=>{
      const userId = req.params.id
      const {approvalStatus, jobId} = req.body
      const filter = { _id: ObjectId(jobId), "applicants.id":ObjectId(userId) };

      const updateDoc = {
        $set: { "applicants.$.approvalStatus":approvalStatus },
      };

      const result = await jobCollection.updateOne(filter, updateDoc);
      //console.log(result)
      if (result.modifiedCount>0) {
        return res.send({ status: true, data: result });
      }

      res.send({ status: false });
    })
  } catch(error) {
    app.get("/", (req, res)=>{
      res.send("Server is down for a bit.")
    })
  }
};

run();

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

module.exports = app