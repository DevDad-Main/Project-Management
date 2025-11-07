import { Queue, Worker, QueueEvents } from "bullmq";
import { bullmqConnection } from "../configs/bullmq.js";
import { sendEmailViaQueueSendGrid } from "../configs/sendGrid.js";

// HACK: This realisitically isn't an industry standard way of handling the queues and workers - These should be decoupled, having our workers in one dir and file and then queues in another dir and file. The only reason im keeping them coupled is due to having to use "node <path_to_worker>" in our package.json and for development and learning purposes i want to keep it simpler

// TODO: Look into railway and see if we can add extra commands when starting our server to start the workers - At the moment only the bullmq connection config is decoupled

// NOTE:: Process Jobs with a worker - replaces emailQueue.process
const emailWorker = new Worker(
  "email-queue",
  async (job) => {
    console.log("Processing email job:", job.name);

    try {
      // NOTE: We pass in the job.data as when we add /create the job we will pass in the information as an object.
      // HACK: Simple way of using nodemaiiler which we know works on local host but railway blocks those specific ports due to spam protection but then send grid only gives you a 60 day trial... -> todo: Find an alternative
      if (process.env.NODE_ENV === "production") {
        await sendEmailViaQueueSendGrid(job.data);
      } else {
        await sendEmailViaQueueNodeMailer(job.data);
      }
    } catch (err) {
      console.error("Worker failed for Job ID:", job.id);
      console.error("Error details:", err.response?.body || err);
      throw err;
    }
  },
  { connection: bullmqConnection },
);

// NOTE: Creatring our new Queue instance - Replaces new Bull()
export const emailQueue = new Queue("email-queue", {
  connection: bullmqConnection,
});

// NOTE: We listen to the events that are emitted by the queue
const emailEvents = new QueueEvents("email-queue", {
  connection: bullmqConnection,
});

emailEvents.on("completed", ({ jobId }) => {
  console.log(`Email job completed: ${jobId}`);
});

emailEvents.on("failed", ({ jobId, failedReason }) => {
  console.error(`Email job failed: ${jobId} - Reason: ${failedReason}`);
});

// NOTE: Accoring to BullMQ docs -> attach an error listener to your worker to avoid NodeJS raising an unhandled exception when an error occurs. For example:
emailQueue.on("error", (err) => {
  // log the error
  console.error(err);
});
