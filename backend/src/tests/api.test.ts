import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { createApp } from "../src/app.js";
import { User } from "../src/models/user.js";
import { Account } from "../src/models/account.js";
import { Transaction } from "../src/models/transaction.js";

process.env.JWT_SECRET = "test-secret";
delete process.env.AI_API_KEY;

const app = createApp();
let replSet: MongoMemoryReplSet;

async function signup(username: string, firstName = "Test", lastName = "User") {
  const response = await request(app).post("/api/v1/user/signup").send({
    firstName,
    lastName,
    username,
    password: "secret1",
  });
  return response;
}

describe("PayFlow API", () => {
  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: "wiredTiger" },
    });
    await mongoose.connect(replSet.getUri());
  }, 120000);

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  it("rejects invalid signup input", async () => {
    const response = await request(app).post("/api/v1/user/signup").send({
      firstName: "Ab",
      lastName: "Cd",
      username: "not-an-email",
      password: "123",
    });

    expect(response.status).toBe(400);
  });

  it("signs up and returns a token", async () => {
    const response = await signup("alice@example.com", "Alice", "Ali");
    expect(response.status).toBe(201);
    expect(response.body.token).toBeTruthy();
  });

  it("signs in with valid credentials", async () => {
    await signup("bob@example.com", "Bobby", "Singh");
    const response = await request(app).post("/api/v1/user/signin").send({
      username: "bob@example.com",
      password: "secret1",
    });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeTruthy();
  });

  it("blocks unauthorized balance access", async () => {
    const response = await request(app).get("/api/v1/account/balance");
    expect(response.status).toBe(401);
  });

  it("returns balance for authenticated user", async () => {
    const signupRes = await signup("carol@example.com", "Carol", "Khan");
    const token = signupRes.body.token;

    const response = await request(app)
      .get("/api/v1/account/balance")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.balance).toBe(10000);
  });

  it("transfers money, creates ledger entry, and rejects insufficient balance", async () => {
    const sender = await signup("dave@example.com", "David", "Shah");
    const receiver = await signup("erin@example.com", "Erin", "Das");

    const senderToken = sender.body.token;
    const receiverUser = await User.findOne({ username: "erin@example.com" });

    const ok = await request(app)
      .post("/api/v1/account/transfer")
      .set("Authorization", `Bearer ${senderToken}`)
      .send({
        to: String(receiverUser!._id),
        amount: 500,
        description: "Swiggy lunch",
        category: "Other",
      });

    expect(ok.status).toBe(200);
    expect(ok.body.transactionId).toBeTruthy();

    const senderAccount = await Account.findOne({
      userId: (await User.findOne({ username: "dave@example.com" }))!._id,
    });
    const receiverAccount = await Account.findOne({
      userId: receiverUser!._id,
    });

    expect(senderAccount?.balance).toBe(9500);
    expect(receiverAccount?.balance).toBe(10500);

    const txCount = await Transaction.countDocuments({
      senderId: (await User.findOne({ username: "dave@example.com" }))!._id,
    });
    expect(txCount).toBe(1);

    const history = await request(app)
      .get("/api/v1/transactions")
      .set("Authorization", `Bearer ${senderToken}`);

    expect(history.status).toBe(200);
    expect(history.body.transactions.length).toBeGreaterThan(0);

    const fail = await request(app)
      .post("/api/v1/account/transfer")
      .set("Authorization", `Bearer ${senderToken}`)
      .send({
        to: String(receiverUser!._id),
        amount: 999999,
      });

    expect(fail.status).toBe(400);
    expect(fail.body.message).toMatch(/insufficient/i);
  });

  it("returns AI not configured for assistant when key missing", async () => {
    const signupRes = await signup("frank@example.com", "Frank", "Mehta");
    const response = await request(app)
      .post("/api/v1/ai/assistant")
      .set("Authorization", `Bearer ${signupRes.body.token}`)
      .send({ question: "How much did I spend this month?" });

    expect(response.status).toBe(503);
  });
});
