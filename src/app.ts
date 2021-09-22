import express from "express";
import path = require("path");
import cors from "cors";
import * as bodyParser from "body-parser";
import { ClawlService } from "./utils/ClawlService";
import { YoutubeService } from "./utils/YoutubeSevice";
import { MainService } from "./utils/MainService";
import { Router } from "./router";
import { connectMongo } from "./mongo";
import dotenv = require("dotenv");
import { ChannelService } from "./models/channel/service";
dotenv.config();

const main = async () => {
  const app = express();

  const chanelService: ChannelService = new ChannelService();

  const clawlService = new ClawlService();
  const youtubeService = new YoutubeService(
    process.env.API_KEY.split(","),
    clawlService
  );
  const mainService = new MainService(clawlService, youtubeService);
  const router = new Router(app, mainService);

  await connectMongo();

  app.use(express.static(path.join(__dirname)));
  app.use(cors());
  app.use(express.json());
  app.use(bodyParser.urlencoded({ extended: false }));

  router.route();

  // chanelService.createChannel({ label: "" });

  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Server is listenning at port ${port}`));
};

main();