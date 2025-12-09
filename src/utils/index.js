const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const amqplib = require("amqplib");
const NodeCache = require('node-cache');
const Logger = require("./Logger");

const logger = new Logger();

const {
  APP_SECRET,
  EXCHANGE_NAME,
  CUSTOMER_SERVICE,
  MSG_QUEUE_URL,
} = require("../config");
const { log } = require("async");

// --- 1. Definisikan semua fungsi dan variabel ---

//Utility functions
const GenerateSalt = async () => {
  return await bcrypt.genSalt();
};

const GeneratePassword = async (password, salt) => {
  return await bcrypt.hash(password, salt);
};

const ValidatePassword = async (
  enteredPassword,
  savedPassword,
  salt
) => {
    // PERBAIKAN BUG: Mengganti 'this.GeneratePassword' menjadi 'GeneratePassword'
    // 'this' tidak akan berfungsi dengan benar dalam konteks 'module.exports'
  return (await GeneratePassword(enteredPassword, salt)) === savedPassword;
};

const GenerateSignature = async (payload) => {
  try {
    return await jwt.sign(payload, APP_SECRET, { expiresIn: "30d" });
  } catch (error) {
    console.log(error);
    return error;
  }
};

const ValidateSignature = async (req) => {
  try {
    const signature = req.get("Authorization");
    console.log(signature);
    const payload = await jwt.verify(signature.split(" ")[1], APP_SECRET);
    req.user = payload;
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const Currency = (value) => {
  var formattedValue = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
  }).format(value);

  return formattedValue.slice(0, -3);
};

const FormateData = (data) => {
  if (data) {
    return { data };
  } else {
    throw new Error("Data Not found!");
  }
};

const LogError = (dir, func, msg) => {
  logger.log(`\n  Location: ${dir} (${func})\n  Error: ${msg}`, "error");
};

const LogAny = (dir, func, msg, type) => {
  logger.log(`\n  Location: ${dir} (${func})\n  Message: ${msg}`, type);
}

// Buat instance cache
const myCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

//Message Broker
const CreateChannel = async () => {
  try {
    const connection = await amqplib.connect(MSG_QUEUE_URL);
    const channel = await connection.createChannel();
    await channel.assertQueue(EXCHANGE_NAME, "direct", { durable: true });
    return channel;
  } catch (err) {
    throw err;
  }
};

const PublishMessage = (channel, service, msg) => {
  channel.publish(EXCHANGE_NAME, service, Buffer.from(msg));
  console.log("Sent: ", msg);
};

const SubscribeMessage = async (channel, service) => {
  await channel.assertExchange(EXCHANGE_NAME, "direct", { durable: true });
  const q = await channel.assertQueue("", { exclusive: true });
  console.log(` Waiting for messages in queue: ${q.queue}`);

  channel.bindQueue(q.queue, EXCHANGE_NAME, CUSTOMER_SERVICE);

  channel.consume(
  q.queue,
    (msg) => {
      if (msg.content) {
        console.log("the message is:", msg.content.toString());
        service.SubscribeEvents(msg.content.toString());
      }
        console.log("[X] received");
      },
      {
        noAck: true,
      }
  );
};


// --- 2. Ekspor semuanya sekaligus di akhir ---

module.exports = {
    GenerateSalt,
    GeneratePassword,
    ValidatePassword,
    GenerateSignature,
    ValidateSignature,
    Currency,
    FormateData,
    LogError,
    LogAny,
    myCache,
    CreateChannel,
    PublishMessage,
    SubscribeMessage
};